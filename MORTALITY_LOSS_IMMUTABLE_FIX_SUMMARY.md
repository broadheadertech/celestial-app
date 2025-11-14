# Mortality Loss - Immutable Stock Records Fix

**Date:** November 14, 2025  
**Status:** ✅ FIXED  
**Priority:** HIGH

---

## What Was Changed

Fixed the `recordMortalityLossByProduct` mutation to follow the **immutable audit log pattern** for `stockRecords`.

### Core Principle

**stockRecords are immutable audit logs** - each record is a snapshot of an action at a point in time. They should **NEVER be updated** after creation (except for non-inventory fields like notes/status).

---

## The Fix

### Before ❌ (Mutable Records)

```typescript
// WRONG: Updating existing source stock record
await ctx.db.patch(recentDataSource._id, {
  currentQty: newSourceCurrentQty, // ❌ Mutating historical snapshot!
  mortalityLossQty: recentDataSource.mortalityLossQty + quantity,
  status: newSourceStatus,
});
```

**Problem:**
- Existing stock records were being modified
- Historical snapshots were changing
- Audit trail was unreliable

### After ✅ (Immutable Records)

```typescript
// CORRECT: Do NOT update source stock record
// Each record is a historical snapshot of an action, not live inventory
// Only the product.stock field tracks current inventory

// Just create new mortality loss record
await ctx.db.insert("stockRecords", {
  // ... new mortality loss record
  initialQty: newMortalityInitialQty,
  currentQty: newMortalityCurrentQty, // Product stock at this moment
  mortalityLossQty: quantity,
  isMortalityLoss: true,
  // ...
});

// Update product stock (live inventory)
await ctx.db.patch(productId, {
  stock: newProductStock, // Only product.stock is updated
});
```

---

## How It Works Now

### Example Timeline

```
Time: 10:00 AM - Initial Product Creation
┌──────────────────────────────────────┐
│ Product.stock = 100                  │
│                                      │
│ Stock Record #1 (SNAPSHOT)           │
│ - initialQty: 100                    │
│ - currentQty: 100                    │
│ - createdAt: 10:00 AM                │
│ [NEVER UPDATED]                      │
└──────────────────────────────────────┘

Time: 11:00 AM - Restock 50 units
┌──────────────────────────────────────┐
│ Product.stock = 150 ✅ (updated)     │
│                                      │
│ Stock Record #1 (UNCHANGED)          │
│ - currentQty: 100 ← Still 100!      │
│                                      │
│ Stock Record #2 (NEW SNAPSHOT)       │
│ - initialQty: 50                     │
│ - currentQty: 50                     │
│ - isRestock: true                    │
│ - createdAt: 11:00 AM                │
│ [NEVER UPDATED]                      │
└──────────────────────────────────────┘

Time: 12:00 PM - Mortality Loss 10 units
┌──────────────────────────────────────┐
│ Product.stock = 140 ✅ (updated)     │
│                                      │
│ Stock Record #1 (UNCHANGED)          │
│ - currentQty: 100 ← Still 100!      │
│                                      │
│ Stock Record #2 (UNCHANGED)          │
│ - currentQty: 50 ← Still 50!        │
│                                      │
│ Stock Record #3 (NEW SNAPSHOT)       │
│ - initialQty: 140                    │
│ - currentQty: 140                    │
│ - mortalityLossQty: 10               │
│ - isMortalityLoss: true              │
│ - createdAt: 12:00 PM                │
│ [NEVER UPDATED]                      │
└──────────────────────────────────────┘
```

**Key Points:**
- ✅ Each record shows stock **at the moment it was created**
- ✅ Old records **never change**
- ✅ Only **product.stock** is updated (live inventory)
- ✅ Perfect audit trail for compliance

---

## Code Changes

### File: `convex/services/stock.ts`

#### 1. Removed Source Stock Update (Lines 1273-1275)
```typescript
// REMOVED:
await ctx.db.patch(recentDataSource._id, {
  currentQty: newSourceCurrentQty,
  mortalityLossQty: recentDataSource.mortalityLossQty + quantity,
  status: newSourceStatus,
  lastModifiedBy: userId,
  updatedAt: now,
});

// REPLACED WITH COMMENT:
// STEP 5: DO NOT update source stock record - stockRecords are immutable audit logs
// Each record is a historical snapshot of an action, not live inventory
// Only the product.stock field tracks current inventory
```

#### 2. Removed Unused Variables (Lines 1203-1211)
```typescript
// REMOVED:
const newSourceCurrentQty = recentDataSource.currentQty - quantity;
let newSourceStatus = recentDataSource.status;
if (newSourceCurrentQty === 0) {
  newSourceStatus = "depleted";
}
```

#### 3. Simplified Stock Movements (Lines 1277-1288)
```typescript
// BEFORE: Two insertions
await ctx.db.insert("stockMovements", { /* source */ });
await ctx.db.insert("stockMovements", { /* mortality */ });

// AFTER: One insertion for mortality action only
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

#### 4. Simplified Return Object (Lines 1287-1298)
```typescript
// REMOVED fields:
- sourceStockRecordId
- sourceBatchCode
- copiedFromBatchCode
- copiedCurrentQty
- previousMortalityCurrentQty
- currentQty (source)
- status (source)

// KEPT essential fields:
return {
  success: true,
  mortalityBatchCode,
  mortalityStockRecordId,
  mortalityLossQty: quantity,
  newMortalityCurrentQty,
  newMortalityInitialQty,
  previousProductStock: product.stock,
  productStock: newProductStock,
  isFirstMortalityLoss: !previousMortalityRecord,
};
```

---

## Benefits

### 1. **True Audit Trail**
- ✅ Each action has its own permanent record
- ✅ Historical records never change
- ✅ Can reconstruct inventory history at any point in time
- ✅ Compliance-ready

### 2. **Data Integrity**
- ✅ No race conditions from concurrent updates to same record
- ✅ Simple to understand: one record = one action
- ✅ Historical data is reliable

### 3. **Accurate Reporting**
- ✅ Calculate total added: sum `initialQty` where `!isRestock && !isMortalityLoss`
- ✅ Calculate total restocked: sum `initialQty` where `isRestock`
- ✅ Calculate total mortality: sum `mortalityLossQty` where `isMortalityLoss`
- ✅ Track inventory changes over time

### 4. **Simplified Logic**
- ✅ No complex update logic for existing records
- ✅ Just create new record + update product.stock
- ✅ Fewer database operations
- ✅ Clearer code

---

## What Remains the Same

### Still Works Correctly:
- ✅ Mortality loss records are created with current product stock
- ✅ Product.stock is updated correctly
- ✅ Stock movements are logged
- ✅ Admin alert shows correct information
- ✅ Audit trail is complete

### Admin Alert Example:
```
✅ Mortality Loss Recorded Successfully

Product: Betta Fish - Crowntail Blue
Tank: Tank-A7
SKU: BETTA-CT-BL-001

📦 Batch Information:
Batch Code: BATCH-20251114-X7F2

📊 Mortality Tracking:
Previous Product Stock: 100 units
Mortality Loss: 10 units
New Product Stock: 90 units
Formula: 100 - 10 = 90

💾 Mortality Record Saved:
CurrentQty: 90 units (= Product Stock)
InitialQty: 90 units (= CurrentQty)

✓ Mortality record created
✓ CurrentQty now matches Product Stock (90 units)
✓ Stock movements logged for audit trail
```

---

## Important Notes

### ⚠️ Other Mutations Need Review

The following mutations also update `stockRecords` and may need to be reviewed for immutability:

1. **`reserveStock`** - Updates `reservedQty`
2. **`releaseReservedStock`** - Updates `reservedQty`
3. **`processSale`** - Updates `currentQty`, `reservedQty`, `soldQty`, `status`
4. **`markStockDamaged`** - Updates `currentQty`, `mortalityLossQty`, `status`
5. **`processReturn`** - Updates `currentQty`, `returnedQty`, `soldQty`, `status`
6. **`adjustStock`** - Updates `currentQty`, `status`

**Recommendation:** Consider refactoring these to also follow the immutable audit log pattern if business requirements allow.

### Acceptable Updates (Non-Inventory Fields)
- ✅ `status` - Business logic updates (e.g., "expired", "quarantine")
- ✅ `notes` - Adding additional notes
- ✅ `updatedAt` - Timestamp of last modification

### Never Update (Inventory Fields)
- ❌ `initialQty`
- ❌ `currentQty`
- ❌ `reservedQty`
- ❌ `soldQty`
- ❌ `mortalityLossQty`
- ❌ `returnedQty`

---

## Testing

### Test Case 1: First Mortality Loss
- **Initial:** Product with 100 units, no mortality records
- **Action:** Record 10 units mortality loss
- **Expected:**
  - Product stock: 90
  - New mortality record: `currentQty = 90`
  - No existing records updated
- **Status:** ✅ PASS

### Test Case 2: Second Mortality Loss
- **Initial:** Product with 90 units, 1 existing mortality record
- **Action:** Record 5 units mortality loss
- **Expected:**
  - Product stock: 85
  - Previous mortality record: `currentQty = 90` (UNCHANGED)
  - New mortality record: `currentQty = 85`
- **Status:** ✅ PASS

### Test Case 3: Audit Trail Query
- **Query:** Get all stock records for a product
- **Expected:** Each record shows stock at the moment it was created
- **Result:** Historical timeline is preserved
- **Status:** ✅ PASS

---

## Migration Notes

**No database migration required** - This is a behavioral fix for future records.

**Existing Data:**
- Old records may have been updated in the past
- This is acceptable as historical data
- Future records will be immutable

---

## Documentation

See **STOCK_RECORDS_IMMUTABLE_AUDIT_LOG.md** for complete documentation on:
- The immutable audit log pattern
- How stock records work as snapshots
- Examples and use cases
- Query patterns for reporting

---

## Summary

✅ **Fixed:** Mortality loss no longer updates existing stock records  
✅ **Pattern:** stockRecords are immutable audit logs  
✅ **Result:** True historical audit trail for inventory actions  
✅ **Benefit:** Data integrity, compliance, accurate reporting  

**Status:** Production ready! 🎉

---

**Implemented By:** Droid (Factory AI Agent)  
**Date:** November 14, 2025  
**Related Docs:**  
- STOCK_RECORDS_IMMUTABLE_AUDIT_LOG.md (Full documentation)
- MORTALITY_CURRENTQTY_SAVE_FIX.md (Previous fix)
- STOCK_MOVEMENTS_DUPLICATE_FIX.md (Duplicate fix)
