# Mortality CurrentQty Fix - Show Remaining Stock

## Date: November 14, 2025

## Issue

**Problem:** When recording mortality loss, the `currentQty` field was showing negative values (e.g., -1, -5, -10) representing cumulative losses.

**Expected:** The `currentQty` should show the **actual remaining stock quantity** after the mortality loss, just like the source stock record.

---

## Root Cause

The previous implementation initialized `previousMortalityCurrentQty` to `0`:

```typescript
// BEFORE (INCORRECT)
let previousMortalityCurrentQty = 0;  // ❌ Started at 0

// For first mortality of 1 unit:
currentQty = 0 - 1 = -1  // ❌ Negative value
```

---

## Solution

Initialize `previousMortalityCurrentQty` with the **source stock's current quantity**:

```typescript
// AFTER (CORRECT)
let previousMortalityCurrentQty = sourceStockRecord.currentQty;  // ✅ Start with actual stock

// For first mortality of 1 unit (source has 100):
currentQty = 100 - 1 = 99  // ✅ Shows remaining stock
```

---

## Code Changes

### Before (Incorrect)
```typescript
let previousMortalityCurrentQty = 0;  // ❌ Wrong initialization
let mortalityBatchCode = sourceStockRecord.batchCode;

if (previousMortalityRecord) {
  mortalityBatchCode = previousMortalityRecord.batchCode;
  previousMortalityCurrentQty = previousMortalityRecord.currentQty;
}

const mortalityRecordCurrentQty = previousMortalityCurrentQty - quantity;
// First loss: 0 - 1 = -1 ❌
```

### After (Correct)
```typescript
let previousMortalityCurrentQty = sourceStockRecord.currentQty;  // ✅ Start with source
let mortalityBatchCode = sourceStockRecord.batchCode;

if (previousMortalityRecord) {
  mortalityBatchCode = previousMortalityRecord.batchCode;
  previousMortalityCurrentQty = previousMortalityRecord.currentQty;
}

const mortalityRecordCurrentQty = previousMortalityCurrentQty - quantity;
// First loss: 100 - 1 = 99 ✅
```

---

## Example Timeline

### Scenario: Product with 100 Units

**Initial State:**
```
Source Stock Record:
- initialQty: 100
- currentQty: 100
- mortalityLossQty: 0
```

**First Mortality Loss: 1 unit**

✅ **Correct Behavior (After Fix):**
```
Mortality Record #1:
- batchCode: BATCH-20251114-ABC1
- initialQty: 99
- currentQty: 99  ✅ Shows remaining stock
- mortalityLossQty: 1

Source Stock Updated:
- currentQty: 99
- mortalityLossQty: 1
```

❌ **Previous Behavior (Before Fix):**
```
Mortality Record #1:
- initialQty: -1  ❌ Negative
- currentQty: -1  ❌ Negative
- mortalityLossQty: 1
```

---

**Second Mortality Loss: 5 units**

✅ **Correct Behavior:**
```
Mortality Record #2:
- batchCode: BATCH-20251114-ABC1
- initialQty: 94
- currentQty: 94  ✅ Shows remaining stock (99 - 5)
- mortalityLossQty: 5

Source Stock Updated:
- currentQty: 94
- mortalityLossQty: 6  (1 + 5)
```

---

**Third Mortality Loss: 3 units**

✅ **Correct Behavior:**
```
Mortality Record #3:
- batchCode: BATCH-20251114-ABC1
- initialQty: 91
- currentQty: 91  ✅ Shows remaining stock (94 - 3)
- mortalityLossQty: 3

Source Stock Updated:
- currentQty: 91
- mortalityLossQty: 9  (1 + 5 + 3)
```

---

## Logic Flow

### First Mortality Loss
```typescript
Source Stock: currentQty = 100

previousMortalityCurrentQty = 100  // From source
mortalityLossQty = 1
newCurrentQty = 100 - 1 = 99  ✅

Mortality Record Created:
  initialQty: 99
  currentQty: 99
```

### Second Mortality Loss
```typescript
Source Stock: currentQty = 99
Previous Mortality: currentQty = 99

previousMortalityCurrentQty = 99  // From previous mortality
mortalityLossQty = 5
newCurrentQty = 99 - 5 = 94  ✅

Mortality Record Created:
  initialQty: 94
  currentQty: 94
```

---

## Benefits

### 1. Accurate Stock Representation
```
✅ currentQty = 99 (actual remaining stock)
❌ currentQty = -1 (confusing negative value)
```

### 2. Consistency with Source Stock
```
Source Stock:          currentQty = 99
Mortality Record:      currentQty = 99
                       ✅ Both show same remaining quantity
```

### 3. Easy to Understand
```
User sees: "99 units remaining"
Not: "-1 units" (What does negative mean?)
```

### 4. Accurate Queries
```typescript
// Get remaining stock from mortality record
const remainingStock = mortalityRecord.currentQty;  // 99 ✅
// Not: const remainingStock = Math.abs(mortalityRecord.currentQty);  // Complex
```

---

## Database Records Comparison

### Before Fix (Incorrect)
```typescript
{
  _id: "mortality_1",
  productId: "prod_123",
  batchCode: "BATCH-20251114-ABC1",
  
  initialQty: -1,     ❌ Negative
  currentQty: -1,     ❌ Negative
  mortalityLossQty: 1,
  
  isMortalityLoss: true,
}
```

### After Fix (Correct)
```typescript
{
  _id: "mortality_1",
  productId: "prod_123",
  batchCode: "BATCH-20251114-ABC1",
  
  initialQty: 99,     ✅ Actual remaining stock
  currentQty: 99,     ✅ Actual remaining stock
  mortalityLossQty: 1,
  
  isMortalityLoss: true,
}
```

---

## Success Message (Updated)

```
✅ Mortality Loss Recorded Successfully

Product: Betta Fish - Blue
Tank: T-001
SKU: FISH-001

📦 Batch Information:
Batch Code: BATCH-20251114-ABC1
(First mortality loss - using source batch)

📊 Mortality Tracking:
Previous Mortality CurrentQty: 100 units  ✅
New Mortality Loss: 1 units
New Mortality CurrentQty (= InitialQty): 99 units  ✅
Formula: 100 - 1 = 99

📈 Product Stock Update:
Previous: 100 units
Remaining: 99 units

✓ First mortality record created
✓ InitialQty = CurrentQty = 99 units  ✅
```

---

## Verification Queries

### Check Remaining Stock
```typescript
const mortalityRecord = await ctx.db
  .query("stockRecords")
  .filter((q) => q.eq(q.field("isMortalityLoss"), true))
  .first();

console.log(`Remaining stock: ${mortalityRecord.currentQty} units`);
// Output: Remaining stock: 99 units ✅
// Not: Remaining stock: -1 units ❌
```

### Compare with Source
```typescript
const sourceStock = await ctx.db
  .query("stockRecords")
  .withIndex("by_product_and_status", (q) => 
    q.eq("productId", productId).eq("status", "active")
  )
  .first();

const latestMortality = mortalityRecords[0];

console.log(`Source: ${sourceStock.currentQty}`);
console.log(`Mortality: ${latestMortality.currentQty}`);
console.log(`Match: ${sourceStock.currentQty === latestMortality.currentQty}`);
// Output:
// Source: 99
// Mortality: 99
// Match: true ✅
```

---

## Notes Field Example

```
🪦 MORTALITY LOSS RECORD
Product: Betta Fish - Blue
SKU: FISH-001
Batch Code: BATCH-20251114-ABC1
Tank: T-001
Previous Mortality CurrentQty: 100 units  ✅ Shows actual stock
New Mortality Loss: 1 units
New CurrentQty (initialQty): 99 units  ✅ Shows remaining
Formula: 100 - 1 = 99
First mortality loss for this product
```

---

## Testing Checklist

### Verify Positive Values
- [ ] First mortality: currentQty shows remaining stock (not negative)
- [ ] Second mortality: currentQty decreases correctly
- [ ] Third mortality: currentQty continues to track remaining stock

### Verify Consistency
- [ ] Mortality currentQty matches source currentQty
- [ ] Both records show same remaining quantity
- [ ] No negative values in mortality records

### Verify Formula
- [ ] First loss: sourceQty - loss = currentQty
- [ ] Second loss: previousMortalityQty - loss = currentQty
- [ ] Chain continues correctly

### Verify UI
- [ ] Success message shows positive quantities
- [ ] User understands remaining stock
- [ ] No confusion about negative values

---

## Files Modified

1. **convex/services/stock.ts** (Line 1186)
   - Changed: `let previousMortalityCurrentQty = 0;`
   - To: `let previousMortalityCurrentQty = sourceStockRecord.currentQty;`
   - Added comment explaining the change

---

## Impact

**Severity:** High - Fixes incorrect data representation  
**User Visible:** Yes - Changes displayed values  
**Breaking Change:** No - Existing logic works, just shows correct values  
**Data Migration:** Not required - New records will be correct  

---

**Status:** ✅ Fixed  
**Version:** 2.2  
**Priority:** Critical - Core functionality correction  
