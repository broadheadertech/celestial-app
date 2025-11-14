# Mortality Loss Batch Code & Quantity Update

## Date: November 14, 2025

## Summary
Updated mortality loss recording to use the latest active batch code from the source stock and properly track quantity changes before and after the mortality loss event.

---

## Changes Made

### 1. Use Latest Active Batch Code

**Previous Behavior:**
- Generated a new unique batch code for each mortality loss (e.g., `LOSS-YYYYMMDD-XXXX`)
- Mortality records had their own separate batch codes

**New Behavior:**
- Uses the source stock record's batch code (the latest active batch)
- Mortality records are linked directly to the batch they came from
- Easy to track which batch had mortality losses

**Code Change:**
```typescript
// Before:
const generateMortalityBatchCode = () => {
  const date = new Date(now);
  // ... generate unique code
  return `LOSS-${year}${month}${day}-${random}`;
};
const mortalityBatchCode = generateMortalityBatchCode();

// After:
// Use the latest (source) batch code for mortality loss record
// This links the mortality loss to the actual batch it came from
const mortalityBatchCode = sourceStockRecord.batchCode;
```

---

### 2. Updated Quantity Tracking for Mortality Records

**Previous Behavior:**
- `initialQty`: Set to negative quantity (-quantity)
- `currentQty`: Always 0 (mortality losses not available)

**New Behavior:**
- `initialQty`: Set to source stock's `currentQty` before deduction
- `currentQty`: Set to remaining quantity after mortality loss
- `mortalityLossQty`: Tracks the actual loss amount

**Formula:**
```typescript
// Calculate quantities for mortality record
const sourceCurrentQtyBeforeDeduction = sourceStockRecord.currentQty;
const newCurrentQty = sourceStockRecord.currentQty - quantity;
const mortalityRecordCurrentQty = sourceCurrentQtyBeforeDeduction - quantity;

// Mortality record:
initialQty: sourceCurrentQtyBeforeDeduction,  // Qty before loss
currentQty: mortalityRecordCurrentQty,        // Qty after loss
mortalityLossQty: quantity                    // Loss amount
```

**Example:**
```
Source stock has 100 units
Record mortality loss of 15 units

Mortality Record Created:
- batchCode: "BATCH-20251114-ABC1" (source batch)
- initialQty: 100 (quantity before loss)
- currentQty: 85 (quantity after loss: 100 - 15)
- mortalityLossQty: 15 (loss amount)
```

---

### 3. Enhanced Stock Movement Logging

**Updated for Mortality Loss Record:**

```typescript
// Log stock movement for mortality loss record
await ctx.db.insert("stockMovements", {
  stockRecordId: mortalityStockRecordId,
  productId: productId,
  batchCode: mortalityBatchCode,
  movementType: "damage",
  quantityBefore: sourceCurrentQtyBeforeDeduction,  // Was: 0
  quantityChange: -quantity,
  quantityAfter: mortalityRecordCurrentQty,         // Was: 0
  createdAt: now,
});
```

**Benefits:**
- Movement log shows actual quantity changes
- Clear audit trail from before to after loss
- Accurate historical tracking

---

### 4. Improved Notes and Documentation

**Enhanced Notes Field:**
```typescript
notes: notes || `🪦 MORTALITY LOSS RECORD
Product: ${product.name}
SKU: ${product.sku || 'N/A'}
Batch Code: ${mortalityBatchCode}
Tank: ${product.tankNumber || 'N/A'}
Quantity Before Loss: ${sourceCurrentQtyBeforeDeduction} units
Mortality Loss: ${quantity} units
Remaining After Loss: ${mortalityRecordCurrentQty} units`
```

**Key Information Included:**
- Product identification (name, SKU)
- Batch code (source batch)
- Tank location
- Quantity timeline (before, loss, after)

---

### 5. Enhanced Return Data

**New Return Structure:**
```typescript
return {
  success: true,
  mortalityBatchCode,              // Source batch code
  mortalityStockRecordId,
  sourceStockRecordId: sourceStockRecord._id,
  sourceBatchCode: sourceStockRecord.batchCode,
  quantityBeforeLoss: sourceCurrentQtyBeforeDeduction,
  mortalityLossQty: quantity,
  quantityAfterLoss: mortalityRecordCurrentQty,
  currentQty: newCurrentQty,       // Source stock remaining
  status: newStatus,
  productStock: Math.max(0, product.stock - quantity),
};
```

---

### 6. Updated Success Message (UI)

**Enhanced User Feedback:**
```
✅ Mortality Loss Recorded Successfully

Product: Betta Fish - Blue
Tank: T-001
SKU: FISH-001

📦 Batch Information:
Batch Code: BATCH-20251114-ABC1
(Using latest active batch)

📊 Quantity Details:
Before Loss: 100 units
Mortality Loss: 15 units
After Loss: 85 units

📈 Product Stock Update:
Previous: 100 units
Remaining: 85 units

✓ Mortality record linked to source batch
✓ Stock movements logged for audit trail
```

---

## Benefits of These Changes

### 1. **Accurate Batch Tracking**
- Mortality losses are directly linked to their source batch
- Easy to identify which batch had issues
- Better quality control and supplier evaluation

### 2. **Clear Quantity Timeline**
- `initialQty` shows starting point (before loss)
- `currentQty` shows ending point (after loss)
- `mortalityLossQty` shows the loss amount
- Complete picture of the mortality event

### 3. **Improved Reporting**
```sql
-- Find batches with high mortality
SELECT batchCode, mortalityLossQty, 
       (mortalityLossQty / initialQty * 100) as mortality_rate
FROM stockRecords
WHERE isMortalityLoss = true
ORDER BY mortality_rate DESC
```

### 4. **Better Audit Trail**
- Stock movements show actual quantity changes
- Clear before/after values in movement log
- Easy to verify calculations

### 5. **Business Intelligence**
- Identify problematic batches
- Track mortality rates by batch
- Evaluate supplier quality
- Improve procurement decisions

---

## Example Scenarios

### Scenario 1: First Mortality Loss

**Initial State:**
```
Stock Record: BATCH-20251114-ABC1
- initialQty: 100
- currentQty: 100
- mortalityLossQty: 0
```

**Record 15 Units Mortality Loss:**

**Mortality Record Created:**
```
Stock Record (Mortality): BATCH-20251114-ABC1 (same code!)
- initialQty: 100          (qty before loss)
- currentQty: 85           (qty after loss)
- mortalityLossQty: 15     (loss amount)
- isMortalityLoss: true
- sourceStockRecordId: [original record ID]
```

**Source Record Updated:**
```
Stock Record: BATCH-20251114-ABC1
- initialQty: 100          (unchanged)
- currentQty: 85           (reduced)
- mortalityLossQty: 15     (increased)
```

---

### Scenario 2: Multiple Mortality Events

**Batch Timeline:**
```
Day 1: Initial stock
  BATCH-20251114-ABC1
  initialQty: 100, currentQty: 100

Day 3: First mortality (10 units)
  Mortality Record:
  batchCode: BATCH-20251114-ABC1
  initialQty: 100, currentQty: 90, mortalityLossQty: 10
  
Day 7: Second mortality (5 units)
  Mortality Record:
  batchCode: BATCH-20251114-ABC1
  initialQty: 90, currentQty: 85, mortalityLossQty: 5

Day 10: Restock (50 units)
  New Batch: BATCH-20251120-XYZ2
  initialQty: 50, currentQty: 135 (accumulated)
```

---

### Scenario 3: Tracking Mortality Rate

**Query Mortality Rate by Batch:**
```typescript
// Get all mortality records for a batch
const mortalityRecords = await ctx.db
  .query("stockRecords")
  .withIndex("by_batch_code", (q) => q.eq("batchCode", "BATCH-20251114-ABC1"))
  .filter((q) => q.eq(q.field("isMortalityLoss"), true))
  .collect();

// Calculate total mortality rate
const totalMortality = mortalityRecords.reduce((sum, r) => sum + r.mortalityLossQty, 0);
const originalQty = mortalityRecords[0]?.initialQty || 0;
const mortalityRate = (totalMortality / originalQty) * 100;

console.log(`Batch mortality rate: ${mortalityRate.toFixed(2)}%`);
```

---

## Database Records Structure

### Source Stock Record
```typescript
{
  _id: "stock_abc123",
  productId: "prod_xyz",
  batchCode: "BATCH-20251114-ABC1",
  category: "fish",
  
  initialQty: 100,           // Original quantity
  currentQty: 85,            // After mortality
  mortalityLossQty: 15,      // Total losses
  
  status: "active",
  isMortalityLoss: false,    // This is the source
  // ... other fields
}
```

### Mortality Loss Record
```typescript
{
  _id: "stock_def456",
  productId: "prod_xyz",
  batchCode: "BATCH-20251114-ABC1",  // Same as source!
  category: "fish",
  
  initialQty: 100,           // Qty before this loss
  currentQty: 85,            // Qty after this loss
  mortalityLossQty: 15,      // This loss amount
  
  status: "damaged",
  isMortalityLoss: true,     // Mortality flag
  sourceStockRecordId: "stock_abc123",  // Link to source
  // ... other fields
}
```

### Stock Movement (Mortality)
```typescript
{
  _id: "movement_ghi789",
  stockRecordId: "stock_def456",     // Mortality record
  productId: "prod_xyz",
  batchCode: "BATCH-20251114-ABC1",
  movementType: "damage",
  
  quantityBefore: 100,       // Before loss
  quantityChange: -15,       // Loss amount (negative)
  quantityAfter: 85,         // After loss
  
  createdAt: 1731600000000
}
```

---

## Testing Checklist

### Verify Batch Code Usage
- [ ] Mortality record uses source batch code
- [ ] Multiple mortality events use same batch code
- [ ] Batch code matches source stock record

### Verify Quantity Tracking
- [ ] `initialQty` = quantity before loss
- [ ] `currentQty` = quantity after loss
- [ ] `mortalityLossQty` = loss amount
- [ ] Formula: `currentQty = initialQty - mortalityLossQty`

### Verify Stock Movements
- [ ] `quantityBefore` = source current qty
- [ ] `quantityChange` = negative loss amount
- [ ] `quantityAfter` = remaining quantity
- [ ] Movement log is accurate

### Verify UI Feedback
- [ ] Success message shows batch code
- [ ] Before/after quantities displayed
- [ ] Loss amount clearly stated
- [ ] User understands what happened

### Verify Reports
- [ ] Mortality rate calculation correct
- [ ] Batch performance tracking accurate
- [ ] Historical data queries work
- [ ] Audit trail is complete

---

## Files Modified

1. **convex/services/stock.ts** (Lines 1170-1295)
   - Removed unique mortality batch code generation
   - Use source batch code instead
   - Updated `initialQty` and `currentQty` calculation
   - Enhanced notes with detailed information
   - Updated stock movement logging
   - Enhanced return data structure

2. **app/admin/products/page.tsx** (Lines 328-344)
   - Updated success message with new data structure
   - Added batch information display
   - Added quantity timeline (before, loss, after)
   - Improved user feedback

---

## Migration Notes

### Existing Data
- Old mortality records with unique batch codes remain unchanged
- New mortality events will use source batch codes
- No data migration required

### Backward Compatibility
- All existing queries still work
- Old mortality records remain valid
- No breaking changes to API

---

## Related Documentation

- See `RESTOCK_ACCUMULATION_UPDATE.md` for restock changes
- See `MOVEMENT_TYPE_RESTOCK_UPDATE.md` for movement type updates
- See `STOCK_MANAGEMENT_SYSTEM.md` for overall system

---

**Status:** ✅ Completed
**Version:** 1.0
**Impact:** Medium - Changes mortality tracking logic
**Testing Required:** Yes - Verify batch tracking and quantity calculations
