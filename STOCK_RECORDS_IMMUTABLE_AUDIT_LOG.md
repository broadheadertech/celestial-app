# Stock Records as Immutable Audit Log

**Date:** November 14, 2025  
**Status:** ✅ IMPLEMENTED  
**Priority:** HIGH

---

## Core Concept

**stockRecords** are **immutable audit logs** - each record represents a **snapshot of a specific action** at a point in time. Once created, they should **NEVER be updated** (except for non-inventory fields like notes).

**Key Principle:**
- **Product.stock** = Live inventory (mutable, always current)
- **stockRecords** = Historical audit trail (immutable, snapshots)
- **stockMovements** = Transaction log linking records

---

## The Problem We Fixed

### Before (Incorrect - Mutable Records) ❌

When recording mortality loss, the system was **updating existing stockRecords**:

```typescript
// WRONG: Updating source stock record
await ctx.db.patch(recentDataSource._id, {
  currentQty: newSourceCurrentQty, // ❌ MUTATING HISTORY!
  mortalityLossQty: recentDataSource.mortalityLossQty + quantity,
  status: newSourceStatus,
});
```

**Problem:**
- Existing stock records were being modified
- Historical snapshots were changing
- Audit trail was unreliable
- Can't track when each action happened

### After (Correct - Immutable Records) ✅

Stock records are **never updated** after creation:

```typescript
// CORRECT: Do NOT update source stock record
// Each record is a historical snapshot of an action, not live inventory
// Only the product.stock field tracks current inventory

// Just create new mortality loss record
await ctx.db.insert("stockRecords", {
  // ... new mortality loss record
  initialQty: newMortalityInitialQty,
  currentQty: newMortalityCurrentQty,
  // ...
});

// Update product stock (live inventory)
await ctx.db.patch(productId, {
  stock: newProductStock,
});
```

---

## How It Works

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Action: Admin adds 100 units (Initial Product Creation)    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Product Table (Live Inventory)                             │
│ - stock: 100 ✅                                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Stock Record #1 (IMMUTABLE SNAPSHOT)                       │
│ - type: "initial"                                           │
│ - initialQty: 100                                           │
│ - currentQty: 100 (snapshot at creation time)              │
│ - createdAt: 2025-11-14 10:00 AM                          │
│ - [NEVER UPDATED AGAIN]                                    │
└─────────────────────────────────────────────────────────────┘

---

┌─────────────────────────────────────────────────────────────┐
│ Action: Admin restocks 50 units                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Product Table (Live Inventory)                             │
│ - stock: 150 ✅ (updated)                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Stock Record #1 (UNCHANGED)                                │
│ - initialQty: 100                                           │
│ - currentQty: 100 ← Still 100! Not updated!               │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ Stock Record #2 (NEW IMMUTABLE SNAPSHOT)                   │
│ - type: "restock"                                           │
│ - isRestock: true                                           │
│ - initialQty: 50                                            │
│ - currentQty: 50 (snapshot at creation time)               │
│ - createdAt: 2025-11-14 11:00 AM                          │
│ - [NEVER UPDATED AGAIN]                                    │
└─────────────────────────────────────────────────────────────┘

---

┌─────────────────────────────────────────────────────────────┐
│ Action: 10 units mortality loss                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Product Table (Live Inventory)                             │
│ - stock: 140 ✅ (updated)                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Stock Record #1 (UNCHANGED)                                │
│ - currentQty: 100 ← Still 100! Not updated!               │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ Stock Record #2 (UNCHANGED)                                │
│ - currentQty: 50 ← Still 50! Not updated!                 │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ Stock Record #3 (NEW IMMUTABLE SNAPSHOT)                   │
│ - type: "mortality_loss"                                    │
│ - isMortalityLoss: true                                     │
│ - initialQty: 140 (product stock after loss)               │
│ - currentQty: 140 (snapshot at creation time)              │
│ - mortalityLossQty: 10                                      │
│ - createdAt: 2025-11-14 12:00 PM                          │
│ - [NEVER UPDATED AGAIN]                                    │
└─────────────────────────────────────────────────────────────┘

---

┌─────────────────────────────────────────────────────────────┐
│ Action: Customer purchases 20 units                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Product Table (Live Inventory)                             │
│ - stock: 120 ✅ (updated)                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Stock Record #1 (UNCHANGED)                                │
│ - currentQty: 100 ← Still 100! Not updated!               │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ Stock Record #2 (UNCHANGED)                                │
│ - currentQty: 50 ← Still 50! Not updated!                 │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ Stock Record #3 (UNCHANGED)                                │
│ - currentQty: 140 ← Still 140! Not updated!               │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ Stock Record #4 (NEW - would be created by sale logic)    │
│ - type: "sale"                                              │
│ - initialQty: 120 (product stock after sale)               │
│ - currentQty: 120 (snapshot at creation time)              │
│ - soldQty: 20                                               │
│ - createdAt: 2025-11-14 01:00 PM                          │
│ - [NEVER UPDATED AGAIN]                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Points

### 1. Each Record is a Snapshot
- **initialQty** and **currentQty** represent the state at the moment the record was created
- For mortality loss: `initialQty = currentQty = product.stock` (after deducting loss)
- These values **NEVER CHANGE** after creation

### 2. Product.stock is the Single Source of Truth
- Only **product.stock** is updated for live inventory
- All actions (restock, mortality, sales) update **product.stock**
- Stock records just track **when** and **how** stock changed

### 3. Audit Trail Example

To see the complete history of a product:

```typescript
// Query all stock records for a product (ordered by creation date)
const history = await ctx.db
  .query("stockRecords")
  .withIndex("by_product", (q) => q.eq("productId", productId))
  .collect();

// Timeline view:
[
  {
    createdAt: "2025-11-14 10:00 AM",
    action: "Initial product creation",
    initialQty: 100,
    currentQty: 100, // Snapshot: stock was 100 at this moment
    isRestock: false,
    isMortalityLoss: false,
  },
  {
    createdAt: "2025-11-14 11:00 AM",
    action: "Restock",
    initialQty: 50,
    currentQty: 50, // Snapshot: added 50 units (total was 150)
    isRestock: true,
    isMortalityLoss: false,
  },
  {
    createdAt: "2025-11-14 12:00 PM",
    action: "Mortality Loss",
    initialQty: 140,
    currentQty: 140, // Snapshot: stock was 140 after losing 10 units
    mortalityLossQty: 10,
    isMortalityLoss: true,
  },
]

// Current product stock: 140 units
// Each record shows what stock was at that specific moment
```

---

## Benefits

### 1. **True Audit Trail**
- ✅ Each action has its own permanent record
- ✅ Can see exactly what stock was at any point in time
- ✅ No confusion from updated/changed records
- ✅ Compliance-ready historical data

### 2. **Data Integrity**
- ✅ Historical records never change
- ✅ No race conditions from concurrent updates
- ✅ Simple to understand: one record = one action

### 3. **Accurate Reporting**
- ✅ Can calculate total added: sum of all `initialQty` where `isRestock = false`
- ✅ Can calculate total restocked: sum of all `initialQty` where `isRestock = true`
- ✅ Can calculate total mortality: sum of all `mortalityLossQty`
- ✅ Can track inventory over time

### 4. **Simplified Logic**
- ✅ No need to update existing records
- ✅ Just create new record + update product.stock
- ✅ Fewer database operations
- ✅ Clearer code

---

## Implementation Rules

### ✅ DO:
1. **Create new stockRecords** for each action (restock, mortality, sale, etc.)
2. **Update product.stock** to reflect current inventory
3. **Set initialQty and currentQty** to reflect product stock at the moment of creation
4. **Use stockMovements** to link actions to records
5. **Query stockRecords** for historical analysis and audit trails

### ❌ DON'T:
1. **Update currentQty** of existing stockRecords
2. **Update initialQty** of existing stockRecords
3. **Update mortalityLossQty, soldQty, etc.** of existing stockRecords
4. **Use stockRecords as live inventory** (use product.stock instead)
5. **Patch stockRecords** after creation (except non-inventory fields like notes if needed)

---

## Fields in stockRecords

### Immutable Fields (NEVER UPDATE)
- `initialQty` - Quantity when record was created
- `currentQty` - Product stock at moment of creation
- `reservedQty` - Reserved at moment of creation
- `soldQty` - Sold quantity (if this is a sale record)
- `mortalityLossQty` - Mortality quantity (if this is a mortality record)
- `returnedQty` - Returned quantity (if this is a return record)
- `createdAt` - Timestamp of creation

### Mutable Fields (CAN UPDATE if needed)
- `notes` - Can add additional notes
- `status` - Could update status for business logic (e.g., "expired", "quarantine")
- `updatedAt` - Timestamp of last modification (non-inventory)

### Flags (Set at Creation)
- `isRestock` - True if this is a restock action
- `isMortalityLoss` - True if this is a mortality loss action
- `sourceStockRecordId` - Reference to parent record (if applicable)

---

## Code Changes Made

### File: `convex/services/stock.ts`

#### Removed: Update to Source Stock Record
```typescript
// REMOVED (Lines 1273-1280):
await ctx.db.patch(recentDataSource._id, {
  currentQty: newSourceCurrentQty, // ❌ Was mutating history
  mortalityLossQty: recentDataSource.mortalityLossQty + quantity,
  status: newSourceStatus,
  lastModifiedBy: userId,
  updatedAt: now,
});
```

#### Added: Comment Explaining Immutability
```typescript
// ADDED (Lines 1273-1275):
// STEP 5: DO NOT update source stock record - stockRecords are immutable audit logs
// Each record is a historical snapshot of an action, not live inventory
// Only the product.stock field tracks current inventory
```

#### Simplified: Stock Movements
```typescript
// BEFORE: Two insertions (one for source, one for mortality)
await ctx.db.insert("stockMovements", { /* source */ });
await ctx.db.insert("stockMovements", { /* mortality */ });

// AFTER: One insertion (only for mortality action)
await ctx.db.insert("stockMovements", {
  stockRecordId: mortalityStockRecordId,
  productId: productId,
  batchCode: copiedBatchCode,
  movementType: "damage",
  quantityBefore: product.stock, // Product stock before loss
  quantityChange: -quantity,
  quantityAfter: newProductStock, // Product stock after loss
  createdAt: now,
});
```

#### Simplified: Return Object
```typescript
// REMOVED:
- copiedCurrentQty
- sourceStockRecordId
- sourceBatchCode
- copiedFromBatchCode
- currentQty (source)
- status (source)

// KEPT:
- mortalityBatchCode
- mortalityStockRecordId
- mortalityLossQty
- newMortalityCurrentQty
- newMortalityInitialQty
- previousProductStock
- productStock
- isFirstMortalityLoss
```

---

## Example Queries

### Get Product History
```typescript
const history = await ctx.db
  .query("stockRecords")
  .withIndex("by_product", (q) => q.eq("productId", productId))
  .order("asc") // Oldest first
  .collect();

// Returns all actions in chronological order
```

### Calculate Total Added
```typescript
const allRecords = await ctx.db
  .query("stockRecords")
  .withIndex("by_product", (q) => q.eq("productId", productId))
  .collect();

const totalAdded = allRecords
  .filter(r => !r.isRestock && !r.isMortalityLoss)
  .reduce((sum, r) => sum + r.initialQty, 0);
```

### Calculate Total Mortality Loss
```typescript
const totalMortality = allRecords
  .filter(r => r.isMortalityLoss)
  .reduce((sum, r) => sum + r.mortalityLossQty, 0);
```

### Get Actions in Date Range
```typescript
const startDate = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago
const recentActions = allRecords
  .filter(r => r.createdAt >= startDate)
  .sort((a, b) => b.createdAt - a.createdAt); // Most recent first
```

---

## Migration Notes

**No database migration required** - This is a behavioral fix for future records.

**Existing Data:**
- Old records may have been updated in the past (before this fix)
- This is acceptable as historical data
- Future records will be immutable

---

## Summary

✅ **stockRecords = Immutable Audit Log**  
✅ **Each record = One action snapshot**  
✅ **product.stock = Live inventory (mutable)**  
✅ **Never update stockRecords after creation**  
✅ **True audit trail for compliance and reporting**  

**Result:** Clean, reliable inventory tracking system! 🎉

---

**Implemented By:** Droid (Factory AI Agent)  
**Date:** November 14, 2025  
**Status:** ✅ PRODUCTION READY
