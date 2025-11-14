# Mortality Chain Tracking Update

## Date: November 14, 2025

## Summary
Updated mortality loss recording to chain consecutive mortality events together, using the most recent mortality record's batch code and tracking cumulative mortality quantities.

---

## Changes Made

### Key Concept: Mortality Record Chaining

**Previous Behavior:**
- Each mortality loss used the source stock's batch code
- `initialQty` = source stock's current quantity before loss
- `currentQty` = source stock current - mortality loss

**New Behavior:**
- First mortality loss uses source stock's batch code
- Subsequent mortality losses use the previous mortality record's batch code
- `initialQty` = previous mortality record's `currentQty`
- `currentQty` = previous mortality `currentQty` - new mortality loss
- Creates a chain of mortality records

---

## Implementation Details

### 1. Find Most Recent Mortality Record

```typescript
// Find the most recent mortality loss record for this product
const allStockRecords = await ctx.db
  .query("stockRecords")
  .withIndex("by_product", (q) => q.eq("productId", productId))
  .collect();

// Filter and sort to get most recent mortality record
const mortalityRecords = allStockRecords
  .filter(record => record.isMortalityLoss === true)
  .sort((a, b) => b.createdAt - a.createdAt);

const previousMortalityRecord = mortalityRecords[0];
```

### 2. Determine Batch Code and Initial Quantity

```typescript
let previousMortalityCurrentQty = 0;
let mortalityBatchCode = sourceStockRecord.batchCode; // Default to source

if (previousMortalityRecord) {
  // Use previous mortality record's batch code and currentQty
  mortalityBatchCode = previousMortalityRecord.batchCode;
  previousMortalityCurrentQty = previousMortalityRecord.currentQty;
}

// Formula: currentQty = previous mortality currentQty - new mortality loss
const mortalityRecordCurrentQty = previousMortalityCurrentQty - quantity;
```

### 3. Create Chained Mortality Record

```typescript
const mortalityStockRecordId = await ctx.db.insert("stockRecords", {
  productId: productId,
  batchCode: mortalityBatchCode, // Previous mortality batch or source
  category: stockCategory,
  
  initialQty: previousMortalityCurrentQty, // Previous mortality currentQty
  currentQty: mortalityRecordCurrentQty,   // Previous - new loss
  mortalityLossQty: quantity,              // This loss amount
  
  isMortalityLoss: true,
  sourceStockRecordId: sourceStockRecord._id,
  // ... other fields
});
```

---

## Example Scenarios

### Scenario 1: First Mortality Loss

**Initial State:**
```
Source Stock Record: BATCH-20251114-ABC1
- initialQty: 100
- currentQty: 100
- mortalityLossQty: 0
- isMortalityLoss: false
```

**Record First Mortality: 10 units**

**Mortality Record Created:**
```
Mortality Record #1: BATCH-20251114-ABC1
- batchCode: BATCH-20251114-ABC1 (from source)
- initialQty: 0  (no previous mortality)
- currentQty: -10  (0 - 10)
- mortalityLossQty: 10
- isMortalityLoss: true
```

**Source Stock Updated:**
```
Source Stock Record: BATCH-20251114-ABC1
- initialQty: 100
- currentQty: 90  (reduced by 10)
- mortalityLossQty: 10
```

---

### Scenario 2: Second Mortality Loss

**Current State:**
```
Mortality Record #1: BATCH-20251114-ABC1
- initialQty: 0
- currentQty: -10
- mortalityLossQty: 10
```

**Record Second Mortality: 5 units**

**Mortality Record Created:**
```
Mortality Record #2: BATCH-20251114-ABC1
- batchCode: BATCH-20251114-ABC1 (from previous mortality)
- initialQty: -10  (previous mortality currentQty)
- currentQty: -15  (-10 - 5)
- mortalityLossQty: 5
- isMortalityLoss: true
```

**Source Stock Updated:**
```
Source Stock Record: BATCH-20251114-ABC1
- initialQty: 100
- currentQty: 85  (reduced by 5 more)
- mortalityLossQty: 15  (cumulative)
```

---

### Scenario 3: Third Mortality Loss

**Current State:**
```
Mortality Record #2: BATCH-20251114-ABC1
- initialQty: -10
- currentQty: -15
- mortalityLossQty: 5
```

**Record Third Mortality: 8 units**

**Mortality Record Created:**
```
Mortality Record #3: BATCH-20251114-ABC1
- batchCode: BATCH-20251114-ABC1 (from previous mortality)
- initialQty: -15  (previous mortality currentQty)
- currentQty: -23  (-15 - 8)
- mortalityLossQty: 8
- isMortalityLoss: true
```

**Source Stock Updated:**
```
Source Stock Record: BATCH-20251114-ABC1
- initialQty: 100
- currentQty: 77  (reduced by 8 more)
- mortalityLossQty: 23  (cumulative: 10 + 5 + 8)
```

---

## Understanding the Negative CurrentQty

### Why Negative Values?

Mortality records use negative `currentQty` values to represent cumulative losses:

```
Mortality Chain:
Record #1: currentQty = -10  (lost 10)
Record #2: currentQty = -15  (lost 10 + 5)
Record #3: currentQty = -23  (lost 10 + 5 + 8)
```

**Benefits:**
1. **Cumulative Tracking**: `currentQty` shows total mortality accumulation
2. **Chain Integrity**: Each record builds on the previous
3. **Easy Calculation**: Total mortality = abs(latest currentQty)
4. **Audit Trail**: Clear progression of losses

---

## Stock Movement Logging

### For Mortality Records

```typescript
await ctx.db.insert("stockMovements", {
  stockRecordId: mortalityStockRecordId,
  productId: productId,
  batchCode: mortalityBatchCode,
  movementType: "damage",
  quantityBefore: previousMortalityCurrentQty, // Previous mortality currentQty
  quantityChange: -quantity,
  quantityAfter: mortalityRecordCurrentQty,    // Previous - new loss
  createdAt: now,
});
```

**Movement Timeline:**
```
Movement #1: before=0,   change=-10, after=-10
Movement #2: before=-10, change=-5,  after=-15
Movement #3: before=-15, change=-8,  after=-23
```

---

## Enhanced Notes Field

```typescript
notes: `🪦 MORTALITY LOSS RECORD
Product: ${product.name}
SKU: ${product.sku || 'N/A'}
Batch Code: ${mortalityBatchCode}
Tank: ${product.tankNumber || 'N/A'}
Previous Mortality CurrentQty: ${previousMortalityCurrentQty} units
New Mortality Loss: ${quantity} units
Remaining After Loss: ${mortalityRecordCurrentQty} units
${previousMortalityRecord ? 'Continuing from previous mortality record' : 'First mortality loss for this product'}`
```

---

## Return Value Structure

```typescript
{
  success: true,
  mortalityBatchCode,              // Previous mortality batch or source
  mortalityStockRecordId,          // New mortality record ID
  sourceStockRecordId,             // Source stock ID
  sourceBatchCode,                 // Source batch code
  previousMortalityRecordId,       // Previous mortality record ID (if exists)
  quantityBeforeLoss,              // Previous mortality currentQty
  mortalityLossQty,                // This loss amount
  quantityAfterLoss,               // Previous - loss
  currentQty,                      // Source stock remaining
  status,                          // Source stock status
  productStock,                    // Product total stock
  isFirstMortalityLoss,            // Boolean flag
}
```

---

## UI Success Message

### First Mortality Loss
```
✅ Mortality Loss Recorded Successfully

Product: Betta Fish - Blue
Tank: T-001
SKU: FISH-001

📦 Batch Information:
Batch Code: BATCH-20251114-ABC1
(First mortality loss - using source batch)

📊 Mortality Tracking:
Previous Mortality Record Qty: 0 units
New Mortality Loss: 10 units
Mortality Record After Loss: -10 units

📈 Product Stock Update:
Previous: 100 units
Remaining: 90 units

✓ First mortality record created
✓ Linked to source batch
✓ Stock movements logged for audit trail
```

### Subsequent Mortality Loss
```
✅ Mortality Loss Recorded Successfully

Product: Betta Fish - Blue
Tank: T-001
SKU: FISH-001

📦 Batch Information:
Batch Code: BATCH-20251114-ABC1
(Using previous mortality batch)

📊 Mortality Tracking:
Previous Mortality Record Qty: -10 units
New Mortality Loss: 5 units
Mortality Record After Loss: -15 units

📈 Product Stock Update:
Previous: 90 units
Remaining: 85 units

✓ Continued mortality record created
✓ Linked to previous mortality batch
✓ Stock movements logged for audit trail
```

---

## Benefits

### 1. Complete Mortality History
- Each mortality event is linked to the previous
- Full chain of mortality records
- Easy to trace all losses for a product

### 2. Accurate Batch Tracking
- All mortality records share same batch code
- Links mortality events to originating batch
- Identifies problematic batches

### 3. Cumulative Loss Tracking
```typescript
// Get total cumulative mortality
const latestMortality = mortalityRecords[0];
const totalMortality = Math.abs(latestMortality.currentQty);
```

### 4. Individual Event Tracking
```typescript
// Each record shows individual loss
for (const record of mortalityRecords) {
  console.log(`Loss event: ${record.mortalityLossQty} units`);
}
```

---

## Query Examples

### Get Mortality Chain for Product

```typescript
const mortalityChain = await ctx.db
  .query("stockRecords")
  .withIndex("by_product", (q) => q.eq("productId", productId))
  .filter((q) => q.eq(q.field("isMortalityLoss"), true))
  .collect();

// Sort by creation date
const chronological = mortalityChain.sort((a, b) => a.createdAt - b.createdAt);

// Display chain
chronological.forEach((record, index) => {
  console.log(`Event ${index + 1}:`);
  console.log(`  Date: ${new Date(record.createdAt).toLocaleString()}`);
  console.log(`  Loss: ${record.mortalityLossQty} units`);
  console.log(`  Cumulative: ${record.currentQty} units`);
});
```

### Calculate Total Mortality

```typescript
// Latest mortality record holds cumulative total
const latestMortality = mortalityChain
  .sort((a, b) => b.createdAt - a.createdAt)[0];

const totalMortality = Math.abs(latestMortality?.currentQty || 0);
console.log(`Total mortality: ${totalMortality} units`);
```

### Mortality Rate Calculation

```typescript
const sourceStock = await ctx.db
  .query("stockRecords")
  .withIndex("by_product_and_status", (q) => 
    q.eq("productId", productId).eq("status", "active")
  )
  .first();

const totalMortality = Math.abs(latestMortality?.currentQty || 0);
const mortalityRate = (totalMortality / sourceStock.initialQty) * 100;

console.log(`Mortality rate: ${mortalityRate.toFixed(2)}%`);
```

---

## Data Integrity

### Verification Checks

```typescript
// Check mortality chain integrity
const verifyMortalityChain = (records) => {
  const sorted = records.sort((a, b) => a.createdAt - b.createdAt);
  
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    
    // Current initialQty should equal previous currentQty
    if (curr.initialQty !== prev.currentQty) {
      console.error(`Chain broken at index ${i}`);
      return false;
    }
    
    // Batch codes should match
    if (curr.batchCode !== prev.batchCode) {
      console.error(`Batch code mismatch at index ${i}`);
      return false;
    }
  }
  
  return true;
};
```

---

## Testing Checklist

### Verify Chain Logic
- [ ] First mortality uses source batch code
- [ ] Second mortality uses first mortality batch code
- [ ] Third mortality uses second mortality batch code
- [ ] Batch codes remain consistent across chain

### Verify Quantity Calculations
- [ ] First: `initialQty = 0`, `currentQty = -loss`
- [ ] Second: `initialQty = previous.currentQty`, `currentQty = previous - loss`
- [ ] Cumulative total = abs(latest.currentQty)
- [ ] Source stock reduced by each loss

### Verify Stock Movements
- [ ] `quantityBefore` = previous mortality currentQty
- [ ] `quantityChange` = negative loss amount
- [ ] `quantityAfter` = previous - loss
- [ ] Movement timeline is accurate

### Verify UI Feedback
- [ ] First loss shows "using source batch"
- [ ] Subsequent losses show "using previous mortality batch"
- [ ] Quantities displayed correctly
- [ ] User understands chaining concept

---

## Files Modified

1. **convex/services/stock.ts** (Lines 1152-1318)
   - Added mortality record chain lookup
   - Updated batch code selection logic
   - Changed quantity calculation formula
   - Enhanced notes and movement logging
   - Updated return value structure

2. **app/admin/products/page.tsx** (Lines 326-347)
   - Updated success message for chaining
   - Added first/continued mortality indicators
   - Enhanced batch information display
   - Improved user understanding

---

## Migration Notes

### Existing Data
- Old mortality records remain unchanged
- New mortality events start chaining from existing records
- No data migration required

### Backward Compatibility
- If no previous mortality record exists, uses source batch (first loss)
- All existing queries still work
- No breaking changes

---

## Related Documentation

- See `MORTALITY_LOSS_BATCH_UPDATE.md` for previous batch tracking changes
- See `RESTOCK_ACCUMULATION_UPDATE.md` for restock changes
- See `STOCK_MANAGEMENT_SYSTEM.md` for overall system

---

**Status:** ✅ Completed
**Version:** 2.0
**Impact:** High - Changes mortality tracking logic significantly
**Testing Required:** Yes - Verify chain integrity and calculations
