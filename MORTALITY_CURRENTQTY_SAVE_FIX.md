# Mortality Loss CurrentQty Save Fix

**Date:** November 14, 2025  
**Status:** ✅ FIXED  
**Priority:** HIGH

---

## Problem Description

When recording mortality loss through the admin products page, the system was not correctly saving the remaining stock quantity to the `currentQty` field in the new mortality loss stock record.

### Issue Details

**What was happening:**
- Admin records mortality loss (e.g., 10 units lost from 100 units)
- Product stock updates correctly: `100 - 10 = 90`
- BUT the mortality record's `currentQty` was calculated as: `copiedCurrentQty - quantity` instead of using the product's new stock value
- This caused a mismatch between the product's stock and the mortality record's `currentQty`

**Expected behavior:**
- Mortality record's `currentQty` should equal the product's remaining stock after the loss
- Formula: `currentQty = product.stock - mortality_loss_quantity`

---

## Root Cause

In `convex/services/stock.ts`, the `recordMortalityLossByProduct` mutation was calculating the new mortality record's `currentQty` incorrectly:

### Before (Incorrect):
```typescript
// STEP 2: Calculate new mortality record quantities
// Formula: new currentQty = copied currentQty - mortality loss qty (from modal input)
const newMortalityCurrentQty = copiedCurrentQty - quantity;
```

**Problem:** This used a value copied from the source stock record instead of the actual product stock after deduction.

---

## Solution Implemented

### Changes Made

#### 1. Updated `convex/services/stock.ts` - `recordMortalityLossByProduct` mutation

**File:** `convex/services/stock.ts` (Lines 1188-1193)

**Before:**
```typescript
// STEP 2: Calculate new mortality record quantities
// Formula: new currentQty = copied currentQty - mortality loss qty (from modal input)
const newMortalityCurrentQty = copiedCurrentQty - quantity;

// For mortality records: initialQty = currentQty (they are equal)
const newMortalityInitialQty = newMortalityCurrentQty;
```

**After:**
```typescript
// STEP 2: Calculate new product stock (this will be saved to product table and mortality currentQty)
const newProductStock = Math.max(0, product.stock - quantity);

// STEP 2.1: For mortality records: currentQty = product's new stock (after deducting loss)
// This ensures the mortality record reflects the actual remaining stock
const newMortalityCurrentQty = newProductStock;

// For mortality records: initialQty = currentQty (they are equal)
const newMortalityInitialQty = newMortalityCurrentQty;
```

**Key Change:** Now `currentQty` is set to `newProductStock`, which is the product's actual remaining stock after the mortality loss.

#### 2. Updated Notes Field (Lines 1254-1264)

**Before:**
```typescript
notes: notes || `🪦 MORTALITY LOSS RECORD\n` +
  `Product: ${product.name}\n` +
  `SKU: ${product.sku || 'N/A'}\n` +
  `Batch Code: ${copiedBatchCode} (copied from recent stock)\n` +
  `Tank: ${product.tankNumber || 'N/A'}\n` +
  `Copied CurrentQty from Recent Stock: ${copiedCurrentQty} units\n` +
  `Mortality Loss Quantity: ${quantity} units\n` +
  `New CurrentQty: ${newMortalityCurrentQty} units\n` +
  `New InitialQty: ${newMortalityInitialQty} units (= CurrentQty)\n` +
  `Formula: ${copiedCurrentQty} - ${quantity} = ${newMortalityCurrentQty}\n` +
  // ...
```

**After:**
```typescript
notes: notes || `🪦 MORTALITY LOSS RECORD\n` +
  `Product: ${product.name}\n` +
  `SKU: ${product.sku || 'N/A'}\n` +
  `Batch Code: ${copiedBatchCode} (copied from recent stock)\n` +
  `Tank: ${product.tankNumber || 'N/A'}\n` +
  `Previous Product Stock: ${product.stock} units\n` +
  `Mortality Loss Quantity: ${quantity} units\n` +
  `New Product Stock: ${newProductStock} units\n` +
  `New CurrentQty (= Product Stock): ${newMortalityCurrentQty} units\n` +
  `New InitialQty (= CurrentQty): ${newMortalityInitialQty} units\n` +
  `Formula: Product.stock (${product.stock}) - Loss (${quantity}) = ${newProductStock}\n` +
  // ...
```

**Key Change:** Notes now clearly show that `currentQty` equals the product's new stock.

#### 3. Updated Product Stock Patch (Line 1309)

**Before:**
```typescript
// STEP 7: Update product stock
await ctx.db.patch(productId, {
  stock: Math.max(0, product.stock - quantity),
  updatedAt: now,
});
```

**After:**
```typescript
// STEP 7: Update product stock (using pre-calculated value)
await ctx.db.patch(productId, {
  stock: newProductStock,
  updatedAt: now,
});
```

**Key Change:** Ensures consistency by using the same pre-calculated value.

#### 4. Updated Return Object (Lines 1320-1328)

**Before:**
```typescript
return {
  success: true,
  // ...
  copiedCurrentQty: copiedCurrentQty, // The copied value used in calculation
  previousMortalityCurrentQty: copiedCurrentQty, // Use copied value for display
  newMortalityCurrentQty: newMortalityCurrentQty, // Copied - loss
  productStock: Math.max(0, product.stock - quantity),
  // ...
};
```

**After:**
```typescript
return {
  success: true,
  // ...
  previousProductStock: product.stock, // Previous product stock before loss
  previousMortalityCurrentQty: previousMortalityRecord?.currentQty || product.stock, // Previous mortality tracking or product stock
  newMortalityCurrentQty: newMortalityCurrentQty, // Product's new stock
  productStock: newProductStock, // Product's new stock after loss
  // ...
};
```

**Key Change:** More accurate return values that reflect the product stock relationship.

#### 5. Updated Admin UI Alert Message

**File:** `app/admin/products/page.tsx` (Lines 328-348)

**Before:**
```typescript
alert(
  `✅ Mortality Loss Recorded Successfully\n\n` +
  // ...
  `📊 Mortality Tracking:\n` +
  `Previous Mortality CurrentQty: ${result.previousMortalityCurrentQty} units\n` +
  `New Mortality Loss: ${quantity} units\n` +
  `New Mortality CurrentQty (= InitialQty): ${result.newMortalityCurrentQty} units\n` +
  `Formula: ${result.previousMortalityCurrentQty} - ${quantity} = ${result.newMortalityCurrentQty}\n\n` +
  `📈 Product Stock Update:\n` +
  `Previous: ${product.stock} units\n` +
  `Remaining: ${result.productStock} units\n\n` +
  // ...
);
```

**After:**
```typescript
alert(
  `✅ Mortality Loss Recorded Successfully\n\n` +
  // ...
  `📊 Mortality Tracking:\n` +
  `Previous Product Stock: ${result.previousProductStock} units\n` +
  `Mortality Loss: ${quantity} units\n` +
  `New Product Stock: ${result.productStock} units\n` +
  `Formula: ${result.previousProductStock} - ${quantity} = ${result.productStock}\n\n` +
  `💾 Mortality Record Saved:\n` +
  `CurrentQty: ${result.newMortalityCurrentQty} units (= Product Stock)\n` +
  `InitialQty: ${result.newMortalityInitialQty} units (= CurrentQty)\n\n` +
  `✓ CurrentQty now matches Product Stock (${result.productStock} units)\n` +
  // ...
);
```

**Key Change:** Clearer messaging showing that `currentQty` matches product stock.

---

## How It Works Now

### Mortality Loss Flow (Example)

**Scenario:** Product has 100 units in stock, admin records 10 units as mortality loss

**Step-by-Step:**

1. **Admin Input:**
   - Select product (current stock: 100 units)
   - Enter mortality loss: 10 units

2. **Backend Calculation:**
   ```typescript
   const newProductStock = Math.max(0, product.stock - quantity);
   // newProductStock = Math.max(0, 100 - 10) = 90
   
   const newMortalityCurrentQty = newProductStock;
   // newMortalityCurrentQty = 90
   
   const newMortalityInitialQty = newMortalityCurrentQty;
   // newMortalityInitialQty = 90
   ```

3. **Database Updates:**
   - **Product Table:** `stock = 90`
   - **New Mortality Stock Record:**
     - `initialQty = 90`
     - `currentQty = 90`
     - `mortalityLossQty = 10`
     - `isMortalityLoss = true`
     - `status = "damaged"`

4. **Result:**
   - ✅ Product stock: 90 units
   - ✅ Mortality record currentQty: 90 units (matches product stock)
   - ✅ Mortality record initialQty: 90 units (equals currentQty)
   - ✅ Stock movements logged for audit trail

---

## Testing Scenarios

### Test Case 1: First Mortality Loss
- **Initial State:** Product with 100 units
- **Action:** Record 10 units mortality loss
- **Expected:**
  - Product stock: 90
  - Mortality record currentQty: 90
  - Mortality record initialQty: 90
- **Status:** ✅ PASS

### Test Case 2: Subsequent Mortality Loss
- **Initial State:** Product with 90 units (after first loss)
- **Action:** Record 5 more units mortality loss
- **Expected:**
  - Product stock: 85
  - New mortality record currentQty: 85
  - New mortality record initialQty: 85
- **Status:** ✅ PASS

### Test Case 3: Multiple Batches
- **Initial State:** Product with 2 active batches (50 + 50 = 100 units)
- **Action:** Record 20 units mortality loss
- **Expected:**
  - Product stock: 80
  - Mortality record currentQty: 80
  - Source batch updated correctly
- **Status:** ✅ PASS

---

## Benefits

### 1. **Data Accuracy**
- Mortality records now accurately reflect actual product stock
- `currentQty` in mortality records matches product table's `stock` field

### 2. **Audit Trail**
- Clear relationship between product stock and mortality records
- Easy to verify stock quantities through mortality tracking

### 3. **Reporting**
- Accurate inventory reports
- Correct stock level calculations

### 4. **Business Logic**
- Mortality records can be used for stock verification
- Easier to reconcile inventory discrepancies

---

## Database Schema (Relevant Fields)

### `products` Table
```typescript
{
  _id: Id<"products">,
  name: string,
  stock: number, // ← Updated when mortality loss recorded
  // ...
}
```

### `stockRecords` Table
```typescript
{
  _id: Id<"stockRecords">,
  productId: Id<"products">,
  batchCode: string,
  initialQty: number, // ← Now equals currentQty for mortality records
  currentQty: number, // ← Now equals product.stock after loss
  mortalityLossQty: number,
  isMortalityLoss: boolean, // ← true for mortality records
  status: "damaged", // ← Mortality records marked as damaged
  // ...
}
```

### Relationship:
- **For mortality records:** `stockRecord.currentQty === product.stock` (after loss is recorded)
- **Formula:** `stockRecord.initialQty === stockRecord.currentQty === (product.stock - mortality_loss_qty)`

---

## Related Files Modified

1. **convex/services/stock.ts**
   - Function: `recordMortalityLossByProduct`
   - Lines: 1188-1193, 1254-1264, 1307-1311, 1320-1328

2. **app/admin/products/page.tsx**
   - Function: `handleMortalityLoss`
   - Lines: 328-348 (alert message)

---

## Migration Notes

**No database migration required** - This is a logic fix that affects new mortality loss records only.

**Existing Data:**
- Old mortality records may have different `currentQty` values
- This is acceptable as the fix applies to future records
- Old records remain as historical data

---

## Summary

✅ **Fixed:** Mortality loss records now correctly save the product's remaining stock to `currentQty`  
✅ **Formula:** `currentQty = product.stock - mortality_loss_quantity`  
✅ **Consistency:** Both `initialQty` and `currentQty` are equal in mortality records  
✅ **Accuracy:** Product stock and mortality record quantities are now in sync  
✅ **Tested:** All mortality loss scenarios working as expected

---

**Issue Resolved By:** Droid (Factory AI Agent)  
**Verification:** Ready for production use
