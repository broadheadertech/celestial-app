# Mortality Loss: InitialQty Equals CurrentQty

## Date: November 14, 2025

## Summary
Updated mortality loss records so that `initialQty` always equals `currentQty` for consistency and clarity.

---

## Key Change

### Formula

**For Mortality Loss Records:**
```typescript
currentQty = previousMortalityCurrentQty - mortalityLossQty
initialQty = currentQty  // Always equal
```

### Example Timeline

```
Initial State:
  Previous Mortality: currentQty = 0

Loss #1 (10 units):
  currentQty = 0 - 10 = -10
  initialQty = -10
  ✓ initialQty === currentQty

Loss #2 (5 units):
  currentQty = -10 - 5 = -15
  initialQty = -15
  ✓ initialQty === currentQty

Loss #3 (8 units):
  currentQty = -15 - 8 = -23
  initialQty = -23
  ✓ initialQty === currentQty
```

---

## Implementation

### Code Changes

```typescript
// Calculate currentQty
const mortalityRecordCurrentQty = previousMortalityCurrentQty - quantity;

// Set initialQty equal to currentQty
const mortalityRecordInitialQty = mortalityRecordCurrentQty;

// Create record
await ctx.db.insert("stockRecords", {
  // ...
  initialQty: mortalityRecordInitialQty,  // Same as currentQty
  currentQty: mortalityRecordCurrentQty,
  mortalityLossQty: quantity,
  // ...
});
```

---

## Benefits

### 1. Consistency
- Both fields always have the same value
- No confusion about which field to use
- Clear relationship between fields

### 2. Simplicity
- `initialQty = currentQty` is easy to understand
- No need to track separate "before" values
- Cumulative total is clear from either field

### 3. Query Simplicity
```typescript
// Both queries return the same result
const total1 = Math.abs(record.currentQty);
const total2 = Math.abs(record.initialQty);
// total1 === total2 ✓
```

---

## Database Records

### Mortality Loss Record Structure

```typescript
{
  _id: "stock_mortality_xyz",
  productId: "prod_abc",
  batchCode: "BATCH-20251114-ABC1",
  category: "fish",
  
  // Both equal - representing cumulative mortality
  initialQty: -23,
  currentQty: -23,
  
  // This specific loss amount
  mortalityLossQty: 8,
  
  isMortalityLoss: true,
  sourceStockRecordId: "stock_source_xyz",
  // ... other fields
}
```

---

## Success Message

```
✅ Mortality Loss Recorded Successfully

Product: Betta Fish - Blue
Tank: T-001
SKU: FISH-001

📦 Batch Information:
Batch Code: BATCH-20251114-ABC1
(Using previous mortality batch)

📊 Mortality Tracking:
Previous Mortality CurrentQty: -15 units
New Mortality Loss: 8 units
New Mortality CurrentQty (= InitialQty): -23 units
Formula: -15 - 8 = -23

📈 Product Stock Update:
Previous: 85 units
Remaining: 77 units

✓ Continued mortality record created
✓ InitialQty = CurrentQty = -23 units
✓ Stock movements logged for audit trail
```

---

## Notes Field

```
🪦 MORTALITY LOSS RECORD
Product: Betta Fish - Blue
SKU: FISH-001
Batch Code: BATCH-20251114-ABC1
Tank: T-001
Previous Mortality CurrentQty: -15 units
New Mortality Loss: 8 units
New CurrentQty (initialQty): -23 units
Formula: -15 - 8 = -23
Continuing from previous mortality record
```

---

## Return Value

```typescript
{
  success: true,
  mortalityBatchCode: "BATCH-20251114-ABC1",
  mortalityStockRecordId: "...",
  previousMortalityCurrentQty: -15,
  mortalityLossQty: 8,
  newMortalityCurrentQty: -23,    // Same as initialQty
  newMortalityInitialQty: -23,    // Same as currentQty
  // ... other fields
}
```

---

## Files Modified

1. **convex/services/stock.ts**
   - Added `mortalityRecordInitialQty = mortalityRecordCurrentQty`
   - Updated stock record creation to use new initialQty
   - Enhanced notes with formula
   - Updated return value

2. **app/admin/products/page.tsx**
   - Updated success message to show both values are equal
   - Added formula display
   - Clarified that InitialQty = CurrentQty

---

## Verification

### Check Equality
```typescript
const mortalityRecord = await ctx.db.get(mortalityRecordId);

console.assert(
  mortalityRecord.initialQty === mortalityRecord.currentQty,
  "InitialQty must equal CurrentQty for mortality records"
);
```

### Get Total Mortality
```typescript
// Either field works - they're equal
const totalMortality = Math.abs(mortalityRecord.currentQty);
// OR
const totalMortality = Math.abs(mortalityRecord.initialQty);
```

---

**Status:** ✅ Completed  
**Version:** 2.1  
**Impact:** Low - Clarifies existing logic  
