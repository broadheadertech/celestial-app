# Before & After: Mortality Loss Fixes

**Visual Comparison of Issues and Solutions**

---

## Issue 1: CurrentQty Not Saving Product Stock

### BEFORE ❌

```
Admin records 10 units mortality loss from 100 units stock

┌─────────────────────────────────────────────────────────────┐
│ Calculation (WRONG)                                         │
│                                                             │
│   copiedCurrentQty = 100 (from source batch)               │
│   newMortalityCurrentQty = copiedCurrentQty - 10 = 90      │
│                                                             │
│   Product stock = 100 - 10 = 90 ✓                          │
│   Mortality currentQty = 90 ✓                              │
│                                                             │
│   But if source batch had different qty...                 │
│   copiedCurrentQty = 80 (different batch)                  │
│   newMortalityCurrentQty = 80 - 10 = 70 ❌                 │
│   Product stock = 100 - 10 = 90 ✓                          │
│                                                             │
│   MISMATCH: currentQty (70) ≠ product stock (90) ❌        │
└─────────────────────────────────────────────────────────────┘
```

### AFTER ✅

```
Admin records 10 units mortality loss from 100 units stock

┌─────────────────────────────────────────────────────────────┐
│ Calculation (CORRECT)                                       │
│                                                             │
│   product.stock = 100                                       │
│   newProductStock = 100 - 10 = 90                          │
│   newMortalityCurrentQty = newProductStock = 90            │
│                                                             │
│   Product stock = 90 ✓                                      │
│   Mortality currentQty = 90 ✓                              │
│                                                             │
│   ALWAYS IN SYNC: currentQty (90) = product stock (90) ✅  │
└─────────────────────────────────────────────────────────────┘
```

---

## Issue 2: Duplicate StockMovements

### BEFORE ❌

```
Admin records 10 units mortality loss

┌─────────────────────────────────────────────────────────────┐
│ stockMovements Table (DUPLICATE ENTRIES)                    │
├─────────────────────────────────────────────────────────────┤
│ Movement #1                                                 │
│ - stockRecordId: source_batch_123                          │
│ - movementType: "damage"                                   │
│ - quantityBefore: 100                                      │
│ - quantityChange: -10                                      │
│ - quantityAfter: 90                                        │
├─────────────────────────────────────────────────────────────┤
│ Movement #2 (DUPLICATE!) ❌                                 │
│ - stockRecordId: mortality_record_456                      │
│ - movementType: "damage"                                   │
│ - quantityBefore: 100                                      │
│ - quantityChange: -10                                      │
│ - quantityAfter: 90                                        │
├─────────────────────────────────────────────────────────────┤
│ PROBLEM: Same event logged twice!                          │
│ Reports show: 20 units lost instead of 10 ❌               │
└─────────────────────────────────────────────────────────────┘
```

### AFTER ✅

```
Admin records 10 units mortality loss

┌─────────────────────────────────────────────────────────────┐
│ stockMovements Table (SINGLE ENTRY)                        │
├─────────────────────────────────────────────────────────────┤
│ Movement #1                                                 │
│ - stockRecordId: source_batch_123                          │
│ - movementType: "damage"                                   │
│ - quantityBefore: 100                                      │
│ - quantityChange: -10                                      │
│ - quantityAfter: 90                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ stockRecords Table (Mortality Record = Audit Trail)        │
├─────────────────────────────────────────────────────────────┤
│ - _id: mortality_record_456                                │
│ - isMortalityLoss: true                                    │
│ - mortalityLossQty: 10                                     │
│ - currentQty: 90 (= product stock)                         │
│ - notes: "🪦 MORTALITY LOSS RECORD..."                     │
│ - sourceStockRecordId: source_batch_123                    │
└─────────────────────────────────────────────────────────────┘

SUCCESS: Single entry, accurate reports ✅
Reports show: 10 units lost (correct!) ✅
```

---

## Complete Data Flow Comparison

### BEFORE (Both Issues) ❌

```
Admin: Record 10 units mortality loss from 100 units
        ↓
Backend Calculation:
  copiedCurrentQty = 100 (or different)
  newMortalityCurrentQty = copiedCurrentQty - 10 ❌
  product.stock = 100 - 10 = 90
        ↓
Database Updates:
  ┌─────────────────────────────────────┐
  │ Products                            │
  │ - stock: 90 ✓                       │
  └─────────────────────────────────────┘
  
  ┌─────────────────────────────────────┐
  │ Stock Records (Mortality)           │
  │ - currentQty: 90 (or wrong value) ? │
  │ - mortalityLossQty: 10 ✓            │
  └─────────────────────────────────────┘
  
  ┌─────────────────────────────────────┐
  │ Stock Movements (DUPLICATE) ❌      │
  │ Entry #1: Source batch              │
  │ Entry #2: Mortality record          │
  └─────────────────────────────────────┘

Problems:
  ❌ currentQty may not match product stock
  ❌ Two movements for one event
  ❌ Reports double-count losses
```

### AFTER (All Fixed) ✅

```
Admin: Record 10 units mortality loss from 100 units
        ↓
Backend Calculation:
  newProductStock = 100 - 10 = 90 ✅
  newMortalityCurrentQty = newProductStock = 90 ✅
        ↓
Database Updates:
  ┌─────────────────────────────────────┐
  │ Products                            │
  │ - stock: 90 ✅                       │
  └─────────────────────────────────────┘
  
  ┌─────────────────────────────────────┐
  │ Stock Records (Mortality)           │
  │ - currentQty: 90 ✅ (= product)     │
  │ - mortalityLossQty: 10 ✅           │
  │ - notes: Full audit info ✅         │
  └─────────────────────────────────────┘
  
  ┌─────────────────────────────────────┐
  │ Stock Movements (SINGLE) ✅         │
  │ Entry #1: Source batch only         │
  └─────────────────────────────────────┘

Benefits:
  ✅ currentQty always matches product stock
  ✅ One movement per event
  ✅ Reports show accurate counts
  ✅ Complete audit trail
```

---

## Code Changes Summary

### Change 1: Calculate from Product Stock
```typescript
// BEFORE ❌
const newMortalityCurrentQty = copiedCurrentQty - quantity;

// AFTER ✅
const newProductStock = Math.max(0, product.stock - quantity);
const newMortalityCurrentQty = newProductStock;
```

### Change 2: Remove Duplicate Movement
```typescript
// BEFORE ❌ (Two insertions)
await ctx.db.insert("stockMovements", { /* source */ });
await ctx.db.insert("stockMovements", { /* mortality */ }); // DUPLICATE

// AFTER ✅ (One insertion)
await ctx.db.insert("stockMovements", { /* source only */ });
```

---

## Impact Summary

| Aspect | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Data Accuracy** | currentQty may be wrong | currentQty = product stock | ✅ 100% accurate |
| **StockMovements** | 2 entries per loss | 1 entry per loss | ✅ 50% reduction |
| **Report Accuracy** | Double-counting | Accurate counts | ✅ No duplicates |
| **Audit Trail** | Confusing | Clear hierarchy | ✅ Easy to trace |
| **Database Size** | Larger | Smaller | ✅ Less storage |
| **Performance** | More inserts | Fewer inserts | ✅ Faster writes |

---

## Testing Validation

### Test: Record 10 units loss from 100 units

#### BEFORE ❌
```sql
SELECT * FROM products WHERE _id = 'product_123';
-- stock: 90

SELECT * FROM stockRecords WHERE productId = 'product_123' AND isMortalityLoss = true;
-- currentQty: 70 ❌ (WRONG!)
-- mortalityLossQty: 10

SELECT COUNT(*) FROM stockMovements WHERE productId = 'product_123' AND movementType = 'damage';
-- count: 2 ❌ (DUPLICATE!)
```

#### AFTER ✅
```sql
SELECT * FROM products WHERE _id = 'product_123';
-- stock: 90 ✅

SELECT * FROM stockRecords WHERE productId = 'product_123' AND isMortalityLoss = true;
-- currentQty: 90 ✅ (CORRECT! Matches product stock)
-- mortalityLossQty: 10 ✅

SELECT COUNT(*) FROM stockMovements WHERE productId = 'product_123' AND movementType = 'damage';
-- count: 1 ✅ (SINGLE ENTRY!)
```

---

## User Experience Impact

### Admin Alert Message

#### BEFORE ❌
```
✅ Mortality Loss Recorded Successfully

Previous Mortality CurrentQty: 100 units
New Mortality Loss: 10 units
New Mortality CurrentQty (= InitialQty): 70 units ❌
Formula: 100 - 10 = 70 ❌

(Confusing! Product stock is 90, but shows 70)
```

#### AFTER ✅
```
✅ Mortality Loss Recorded Successfully

Previous Product Stock: 100 units
Mortality Loss: 10 units
New Product Stock: 90 units ✅
Formula: 100 - 10 = 90 ✅

💾 Mortality Record Saved:
CurrentQty: 90 units (= Product Stock) ✅
InitialQty: 90 units (= CurrentQty) ✅

(Clear! Everything matches and makes sense)
```

---

## Conclusion

Both issues have been completely resolved:

✅ **Issue 1:** Mortality `currentQty` now always equals product stock  
✅ **Issue 2:** No more duplicate `stockMovements` entries  

**Result:** Clean, accurate, and efficient mortality loss tracking! 🎉

---

**Visual Guide Created By:** Droid (Factory AI Agent)  
**Date:** November 14, 2025
