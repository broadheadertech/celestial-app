# Restock Accumulation Update

## Date: November 14, 2025

## Summary
Updated the restock functionality to accumulate quantities from previous batches instead of starting fresh with each restock.

## Changes Made

### 1. Updated `restockProduct` Mutation (`convex/services/stock.ts`)

**New Formula:**
```
new batch currentQty = new batch initialQty + previous batch currentQty
```

**Implementation Details:**
- Queries for the most recent active stock record before creating new batch
- Accumulates the `currentQty` from previous batch into new batch
- Maintains separate `initialQty` (new restock amount) and `currentQty` (accumulated total)

**Example:**
- Previous batch has 50 units remaining (`currentQty: 50`)
- User restocks 100 units
- New batch record:
  - `initialQty: 100` (new restock amount)
  - `currentQty: 150` (accumulated: 100 + 50)

**Code Changes:**
```typescript
// Get the most recent active stock record to accumulate currentQty
const previousStockRecords = await ctx.db
  .query("stockRecords")
  .withIndex("by_product_and_status", (q) => 
    q.eq("productId", productId).eq("status", "active")
  )
  .collect();

// Sort by creation date (most recent first) and get the latest
const previousBatch = previousStockRecords.sort((a, b) => b.createdAt - a.createdAt)[0];
const previousCurrentQty = previousBatch?.currentQty || 0;

// Formula: new batch currentQty = new batch initialQty + previous batch currentQty
const newCurrentQty = quantity + previousCurrentQty;
```

**Enhanced Return Value:**
```typescript
return {
  success: true,
  stockRecordId,
  batchCode,
  quantityAdded: quantity,           // New units added
  previousBatchQty: previousCurrentQty, // Previous remaining
  accumulatedQty: newCurrentQty,     // Total accumulated
  message: `Successfully restocked ${quantity} units (Total: ${newCurrentQty} units including ${previousCurrentQty} from previous batch)`,
  newTotalStock: product.stock + quantity,
};
```

**Enhanced Notes:**
```
📦 RESTOCK - Added ${quantity} units to inventory
Product: ${product.name}
SKU: ${product.sku || 'N/A'}
Original Batch: ${product.batchCode || 'N/A'}
New Batch: ${batchCode}
Previous Batch Remaining: ${previousCurrentQty}
Accumulated Total: ${newCurrentQty}
```

**Updated Stock Movement Log:**
- `quantityBefore`: Set to `previousCurrentQty` (was 0)
- `quantityAfter`: Set to `newCurrentQty` (was quantity)
- Accurately reflects the accumulation in stock movements

### 2. Fixed `createProduct` Mutation (`convex/services/products.ts`)

**Issue:** Using deprecated `damagedQty` field
**Fix:** Changed to `mortalityLossQty`

```typescript
// Before:
damagedQty: 0,

// After:
mortalityLossQty: 0,
```

## Benefits

### 1. Accurate Quantity Tracking
- New batch shows complete available inventory
- No need to sum multiple batch records to see total
- Previous batch quantity is preserved in new batch

### 2. Clear Audit Trail
- `initialQty` shows how much was added in this restock
- `currentQty` shows total available after accumulation
- Stock movements track the accumulation properly

### 3. Business Logic
- Matches real-world inventory consolidation
- Easier to understand available stock at a glance
- Simplifies stock deduction logic (always use latest batch)

## Impact on Existing Features

### Stock Records Display
- Each restock batch will show accumulated quantities
- History queries will show the accumulation pattern
- Original batch quantities preserved in `initialQty`

### Stock Movements
- Movement logs now show accumulation properly
- `quantityBefore` reflects previous batch remaining quantity
- `quantityAfter` shows accumulated total

### Mortality Loss Tracking
- Uses latest active batch's `currentQty`
- Accumulation ensures accurate available quantity
- Deductions work correctly from accumulated total

### Product Stock
- Product's total `stock` field remains sum of all batches
- Each batch's `currentQty` is now accumulated from previous

## Testing Recommendations

### Test Scenario 1: First Restock
1. Create product with initial stock of 100 units
2. Restock with 50 units
3. **Expected Result:**
   - Previous batch: 100 units
   - New batch: `initialQty: 50`, `currentQty: 150`
   - Product total stock: 150

### Test Scenario 2: Multiple Restocks
1. Start with 100 units
2. Sell 30 units (previous batch: 70 remaining)
3. Restock 80 units
4. **Expected Result:**
   - Previous batch: 70 units remaining
   - New batch: `initialQty: 80`, `currentQty: 150`
   - Product total stock: 150

### Test Scenario 3: Mortality Loss Impact
1. Batch has 150 accumulated units
2. Record 20 units mortality loss
3. **Expected Result:**
   - Batch `currentQty`: 130 units
   - Next restock adds to 130 (not 150)

### Test Scenario 4: First Product Creation
1. Create new product with 100 units
2. **Expected Result:**
   - No previous batch (previousCurrentQty: 0)
   - New batch: `initialQty: 100`, `currentQty: 100`

## Files Modified

1. **convex/services/stock.ts**
   - Updated `restockProduct` mutation (lines 515-593)
   - Added previous batch query logic
   - Implemented accumulation formula
   - Enhanced return value and notes

2. **convex/services/products.ts**
   - Fixed `createProduct` mutation (line 446)
   - Changed `damagedQty` to `mortalityLossQty`

## Database Schema Compatibility

- No schema changes required
- Uses existing `initialQty` and `currentQty` fields
- Maintains backward compatibility with existing stock records
- Previous batches remain unchanged

## Notes

- The formula only affects NEW restock operations
- Existing stock records are not modified
- First restock after this update will start accumulation
- Previous batch quantity is 0 if no active batch exists

## Future Considerations

1. **Batch Consolidation Option**: Consider adding a flag to optionally consolidate old batches into new ones
2. **Historical Reporting**: Ensure reports account for accumulated quantities
3. **Stock Reconciliation**: Periodic checks to ensure product.stock matches sum of all batch currentQty values
4. **Batch Expiry**: Consider how expiry dates interact with accumulated batches

---

**Status:** ✅ Completed and Ready for Testing
**Version:** 1.0
**Author:** AI Assistant (Droid)
