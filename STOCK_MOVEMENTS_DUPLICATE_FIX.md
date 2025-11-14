# Stock Movements Duplicate Fix - Mortality Loss

**Date:** November 14, 2025  
**Status:** ✅ FIXED  
**Priority:** HIGH

---

## Problem Description

When recording mortality loss, the system was creating **duplicate entries** in the `stockMovements` table:
1. One movement for the source stock record (the batch being reduced)
2. One movement for the new mortality loss record

This resulted in redundant data and made audit trails confusing.

### Issue Details

**What was happening:**
- Admin records mortality loss (e.g., 10 units lost)
- System creates TWO stockMovements records:
  - Movement #1: Source batch reduced by 10 units
  - Movement #2: Mortality record shows the same 10 units lost
- **Problem:** Duplication of the same transaction in audit logs

**Expected behavior:**
- Only ONE stockMovements record should be created
- The mortality loss stock record itself serves as the audit trail
- The movement should track the **source batch** being reduced

---

## Root Cause

In `convex/services/stock.ts`, the `recordMortalityLossByProduct` mutation was creating two stock movements:

### Before (Duplicate):
```typescript
// STEP 6: Log stock movements
// Log movement for source record
await ctx.db.insert("stockMovements", {
  stockRecordId: recentDataSource._id,
  productId: productId,
  batchCode: recentDataSource.batchCode,
  movementType: "damage",
  quantityBefore: recentDataSource.currentQty,
  quantityChange: -quantity,
  quantityAfter: newSourceCurrentQty,
  createdAt: now,
});

// Log movement for mortality loss record ← DUPLICATE!
await ctx.db.insert("stockMovements", {
  stockRecordId: mortalityStockRecordId,
  productId: productId,
  batchCode: copiedBatchCode,
  movementType: "damage",
  quantityBefore: copiedCurrentQty,
  quantityChange: -quantity,
  quantityAfter: newMortalityCurrentQty,
  createdAt: now,
});
```

**Problem:** Two insertions tracking the same mortality loss event.

---

## Solution Implemented

### Changes Made

#### Updated `convex/services/stock.ts` - `recordMortalityLossByProduct` mutation

**File:** `convex/services/stock.ts` (Lines 1282-1294)

**Before:**
```typescript
// STEP 6: Log stock movements
// Log movement for source record
await ctx.db.insert("stockMovements", {
  stockRecordId: recentDataSource._id,
  productId: productId,
  batchCode: recentDataSource.batchCode,
  movementType: "damage",
  quantityBefore: recentDataSource.currentQty,
  quantityChange: -quantity,
  quantityAfter: newSourceCurrentQty,
  createdAt: now,
});

// Log movement for mortality loss record
await ctx.db.insert("stockMovements", {
  stockRecordId: mortalityStockRecordId,
  productId: productId,
  batchCode: copiedBatchCode,
  movementType: "damage",
  quantityBefore: copiedCurrentQty,
  quantityChange: -quantity,
  quantityAfter: newMortalityCurrentQty,
  createdAt: now,
});
```

**After:**
```typescript
// STEP 6: Log stock movement
// Only log movement for source record (the batch being reduced)
// The mortality loss record itself serves as the audit trail
await ctx.db.insert("stockMovements", {
  stockRecordId: recentDataSource._id,
  productId: productId,
  batchCode: recentDataSource.batchCode,
  movementType: "damage",
  quantityBefore: recentDataSource.currentQty,
  quantityChange: -quantity,
  quantityAfter: newSourceCurrentQty,
  createdAt: now,
});
```

**Key Changes:**
1. ✅ Removed the second `ctx.db.insert("stockMovements", ...)` call
2. ✅ Added clear comment explaining why only one movement is logged
3. ✅ The mortality loss stock record (`stockRecords` table) itself serves as the audit trail

---

## How It Works Now

### Mortality Loss Flow (Example)

**Scenario:** Product has 100 units in stock, admin records 10 units as mortality loss

**Before Fix:**
```
stockMovements Table:
┌────────────────────────────────────────────────────────────┐
│ Movement #1 (Source Batch)                                 │
│ - stockRecordId: recentDataSource._id                      │
│ - movementType: "damage"                                   │
│ - quantityBefore: 100                                      │
│ - quantityChange: -10                                      │
│ - quantityAfter: 90                                        │
├────────────────────────────────────────────────────────────┤
│ Movement #2 (Mortality Record) ← DUPLICATE!                │
│ - stockRecordId: mortalityStockRecordId                    │
│ - movementType: "damage"                                   │
│ - quantityBefore: 100 (copied)                             │
│ - quantityChange: -10                                      │
│ - quantityAfter: 90                                        │
└────────────────────────────────────────────────────────────┘
```

**After Fix:**
```
stockMovements Table:
┌────────────────────────────────────────────────────────────┐
│ Movement #1 (Source Batch) ✅                              │
│ - stockRecordId: recentDataSource._id                      │
│ - movementType: "damage"                                   │
│ - quantityBefore: 100                                      │
│ - quantityChange: -10                                      │
│ - quantityAfter: 90                                        │
└────────────────────────────────────────────────────────────┘

stockRecords Table (Mortality Record serves as audit):
┌────────────────────────────────────────────────────────────┐
│ Mortality Loss Record ✅                                   │
│ - _id: mortalityStockRecordId                              │
│ - isMortalityLoss: true                                    │
│ - mortalityLossQty: 10                                     │
│ - currentQty: 90                                           │
│ - status: "damaged"                                        │
│ - notes: "🪦 MORTALITY LOSS RECORD..."                     │
└────────────────────────────────────────────────────────────┘
```

---

## Audit Trail Verification

### ✅ Audit Trail is Complete

Even with only one `stockMovements` entry, the complete audit trail is maintained through:

#### 1. **stockMovements Table** (Single Entry)
- Tracks the **source batch reduction**
- Shows before/after quantities
- Movement type: "damage"
- Links to source stock record

#### 2. **stockRecords Table** (Mortality Record)
- Dedicated mortality loss record
- `isMortalityLoss: true` flag
- `mortalityLossQty` field tracks loss amount
- `currentQty` shows remaining stock
- Detailed notes with full context
- References source stock via `sourceStockRecordId`

#### 3. **Product Table**
- Updated `stock` field reflects total inventory
- Timestamp shows when update occurred

### Audit Trail Benefits:
- ✅ **No Duplication:** Single stockMovements entry per event
- ✅ **Clear Hierarchy:** Source batch → Movement → Mortality record
- ✅ **Full Context:** Mortality record has detailed notes
- ✅ **Traceable:** Can track from product → stock record → movements
- ✅ **Accurate Reporting:** No double-counting in reports

---

## Database Schema (Relevant Tables)

### `stockMovements` Table
```typescript
{
  _id: Id<"stockMovements">,
  stockRecordId: Id<"stockRecords">, // ← Links to SOURCE batch
  productId: Id<"products">,
  batchCode: string,
  movementType: "damage",
  quantityBefore: number, // Source batch qty before loss
  quantityChange: number, // -quantity (negative)
  quantityAfter: number,  // Source batch qty after loss
  createdAt: number,
}
```

### `stockRecords` Table (Mortality Record)
```typescript
{
  _id: Id<"stockRecords">,
  productId: Id<"products">,
  batchCode: string, // Copied from source
  
  // Mortality tracking fields
  initialQty: number, // = currentQty
  currentQty: number, // = product.stock after loss
  mortalityLossQty: number, // Quantity lost
  
  // Flags
  isMortalityLoss: boolean, // true
  sourceStockRecordId: Id<"stockRecords">, // Reference to source
  status: "damaged",
  
  // Audit
  notes: string, // Detailed mortality loss information
  createdAt: number,
  updatedAt: number,
}
```

### Relationship:
```
Product
  ↓
Source Stock Record (batch being reduced)
  ↓
Stock Movement (tracks the reduction)
  ↓
Mortality Stock Record (audit trail with details)
```

---

## Testing Scenarios

### Test Case 1: Single Mortality Loss
- **Initial State:** Product with 100 units in one batch
- **Action:** Record 10 units mortality loss
- **Expected:**
  - 1 stockMovements entry (source batch: 100 → 90)
  - 1 mortality stock record (currentQty: 90, mortalityLossQty: 10)
  - Product stock: 90
- **Status:** ✅ PASS (No duplicates)

### Test Case 2: Multiple Mortality Losses
- **Initial State:** Product with 90 units (after first loss)
- **Action:** Record 5 more units mortality loss
- **Expected:**
  - 1 NEW stockMovements entry (source batch: 90 → 85)
  - 1 NEW mortality stock record (currentQty: 85, mortalityLossQty: 5)
  - Product stock: 85
  - Total: 2 stockMovements (one per event)
- **Status:** ✅ PASS (No duplicates per event)

### Test Case 3: Query Stock Movements
- **Query:** Get all movements for a product
- **Expected:** 
  - No duplicate entries for same timestamp
  - Each movement corresponds to a real batch change
  - Mortality losses tracked once via source batch movement
- **Status:** ✅ PASS (Clean audit trail)

---

## Benefits

### 1. **Data Accuracy**
- ✅ No duplicate entries in stockMovements table
- ✅ Clean audit trail without redundancy
- ✅ Accurate movement counts

### 2. **Performance**
- ✅ Fewer database inserts per mortality loss
- ✅ Reduced storage for stockMovements table
- ✅ Faster queries (less data to scan)

### 3. **Reporting**
- ✅ Accurate inventory movement reports
- ✅ No double-counting in analytics
- ✅ Clearer audit logs for compliance

### 4. **Maintainability**
- ✅ Simpler logic to understand
- ✅ Clear separation of concerns:
  - stockMovements = batch-level changes
  - stockRecords = detailed mortality tracking

---

## Migration Notes

**No data migration required** - This is a logic fix for future records only.

**Existing Data:**
- Old duplicate stockMovements entries will remain in the database
- This is acceptable as historical data
- Future mortality losses will create single movements only

**Optional Cleanup (if needed):**
If you want to clean up old duplicates, you can identify them by:
```typescript
// Pseudo-query to find duplicate mortality movements
// Look for stockMovements where:
// - movementType = "damage"
// - stockRecordId references a record with isMortalityLoss = true
// - Same timestamp, productId, and quantity as another movement
```

---

## Related Files Modified

1. **convex/services/stock.ts**
   - Function: `recordMortalityLossByProduct`
   - Lines: 1282-1294
   - Removed second stockMovements insertion

---

## Summary

✅ **Fixed:** Removed duplicate stockMovements creation for mortality losses  
✅ **Single Entry:** Only source batch movement is logged  
✅ **Audit Trail:** Maintained via mortality stock record with detailed notes  
✅ **Performance:** Reduced database inserts by 50% per mortality loss  
✅ **Accuracy:** No more double-counting in reports and analytics  

---

**Issue Resolved By:** Droid (Factory AI Agent)  
**Related Fix:** MORTALITY_CURRENTQTY_SAVE_FIX.md  
**Verification:** Ready for production use
