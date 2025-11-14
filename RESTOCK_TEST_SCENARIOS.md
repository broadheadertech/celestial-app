# Restock Accumulation - Test Scenarios

## Overview
This document provides step-by-step test scenarios to verify the new restock accumulation functionality.

---

## Test Scenario 1: First Restock (No Previous Batch)

### Setup
- Create a new product with 100 units initial stock
- Product: "Betta Fish - Blue"
- SKU: "FISH-001"

### Steps
1. Go to Admin Dashboard → Inventory
2. Select "Betta Fish - Blue"
3. Click "Restock" button
4. Enter quantity: 50 units
5. Add notes: "First restock test"
6. Click "Confirm Restock"

### Expected Results
✅ Success message: "Successfully restocked 50 units (Total: 100 units including 0 from previous batch)"

**Stock Record Details:**
- Batch Code: `BATCH-YYYYMMDD-XXXX` (new batch)
- `initialQty`: 50
- `currentQty`: 50 (50 + 0)
- `status`: "active"

**Stock Movement Log:**
- `movementType`: "purchase"
- `quantityBefore`: 0
- `quantityChange`: 50
- `quantityAfter`: 50

**Product Stock:**
- Previous: 100
- New: 150 (100 + 50)

---

## Test Scenario 2: Restock With Remaining Stock

### Setup
- Use the product from Scenario 1 (now has 150 units)
- Sell 30 units to reduce current batch to 120 units

### Steps
1. Sell 30 units (manually or through order)
2. Verify current batch has 120 units remaining
3. Click "Restock" button
4. Enter quantity: 80 units
5. Add notes: "Second restock - accumulation test"
6. Click "Confirm Restock"

### Expected Results
✅ Success message: "Successfully restocked 80 units (Total: 200 units including 120 from previous batch)"

**New Stock Record:**
- Batch Code: `BATCH-YYYYMMDD-YYYY` (different from first)
- `initialQty`: 80
- `currentQty`: 200 (80 + 120)
- `status`: "active"

**Stock Movement Log:**
- `movementType`: "purchase"
- `quantityBefore`: 120
- `quantityChange`: 80
- `quantityAfter`: 200

**Product Stock:**
- Previous: 120
- New: 200 (120 + 80)

**Notes Section Should Show:**
```
📦 RESTOCK - Added 80 units to inventory
Product: Betta Fish - Blue
SKU: FISH-001
Original Batch: BATCH-20251114-ABCD
New Batch: BATCH-20251114-YYYY
Previous Batch Remaining: 120
Accumulated Total: 200
```

---

## Test Scenario 3: Restock After Mortality Loss

### Setup
- Use product from Scenario 2 (200 units accumulated)
- Record 30 units mortality loss

### Steps
1. Select product "Betta Fish - Blue"
2. Click "Record Mortality Loss"
3. Enter quantity: 30 units
4. Add notes: "Tank temperature issue"
5. Confirm mortality loss
6. Verify current batch now has 170 units (200 - 30)
7. Click "Restock" button
8. Enter quantity: 100 units
9. Click "Confirm Restock"

### Expected Results
✅ Success message: "Successfully restocked 100 units (Total: 270 units including 170 from previous batch)"

**New Stock Record:**
- `initialQty`: 100
- `currentQty`: 270 (100 + 170)
- `mortalityLossQty`: 0 (new batch has no losses yet)

**Previous Batch:**
- `currentQty`: 170 (200 - 30 mortality)
- `mortalityLossQty`: 30

**Product Stock:**
- Previous: 170
- New: 270 (170 + 100)

---

## Test Scenario 4: Multiple Active Batches

### Setup
- Product has multiple active batches from previous tests

### Steps
1. Check stock history for the product
2. Verify multiple batches exist
3. Note the most recent batch's `currentQty`
4. Perform new restock with 50 units

### Expected Results
✅ New batch accumulates from **most recent** active batch only

**Verification:**
- Only the latest batch's `currentQty` is used
- Older batches remain unchanged
- Sum of all batches' `currentQty` should equal product total stock

---

## Test Scenario 5: Restock Brand New Product

### Setup
- Create new product: "Guppy Fish - Red"
- Initial stock: 200 units
- This will be the first restock for this product

### Steps
1. Create product with 200 units
2. Verify initial stock record created with:
   - `initialQty`: 200
   - `currentQty`: 200
3. Immediately restock with 50 units

### Expected Results
✅ Success message: "Successfully restocked 50 units (Total: 250 units including 200 from previous batch)"

**New Batch:**
- `initialQty`: 50
- `currentQty`: 250 (50 + 200)

**Product Stock:**
- Total: 250

---

## Test Scenario 6: Restock When All Stock Depleted

### Setup
- Product has 100 units
- Sell all 100 units (batch status changes to "depleted")

### Steps
1. Sell all remaining stock (100 units)
2. Verify batch status is "depleted"
3. Verify product stock is 0
4. Click "Restock" button
5. Enter quantity: 150 units

### Expected Results
✅ Success message: "Successfully restocked 150 units (Total: 150 units including 0 from previous batch)"

**New Batch:**
- `initialQty`: 150
- `currentQty`: 150 (150 + 0, since previous batch is depleted)
- `status`: "active"

**Previous Batch:**
- `status`: "depleted"
- `currentQty`: 0

**Product Stock:**
- Previous: 0
- New: 150

---

## Test Scenario 7: Check Stock History

### Steps
1. Navigate to product detail page
2. Click "View Stock History" or similar
3. Review all batch records

### Expected Results
✅ Stock history should show:

**Batch Timeline:**
```
1. BATCH-20251114-AAAA (Original)
   - Type: ORIGINAL
   - initialQty: 100
   - currentQty: 0 (depleted)
   - soldQty: 100

2. BATCH-20251114-BBBB (Restock 1)
   - Type: RESTOCK
   - initialQty: 50
   - currentQty: 50
   - Accumulated from: 0

3. BATCH-20251114-CCCC (Restock 2)
   - Type: RESTOCK
   - initialQty: 80
   - currentQty: 200
   - Accumulated from: 120

4. BATCH-20251114-DDDD (Current)
   - Type: RESTOCK
   - initialQty: 100
   - currentQty: 270
   - Accumulated from: 170
```

**Summary:**
- Total Original Qty: 100
- Total Restocked Qty: 230 (50 + 80 + 100)
- Current Available: 270
- Total Sold: 130

---

## Verification Checklist

After completing all scenarios, verify:

### Database Integrity
- [ ] Product `stock` field matches sum of all active batches
- [ ] Each batch has correct `initialQty` (amount added in that restock)
- [ ] Each batch has accumulated `currentQty`
- [ ] Stock movements log accumulation properly

### Business Logic
- [ ] New restocks add to previous batch remaining quantity
- [ ] Mortality loss reduces `currentQty` correctly
- [ ] Next restock uses reduced `currentQty`
- [ ] Depleted batches don't contribute to accumulation

### User Interface
- [ ] Success messages show accumulation details
- [ ] Stock history displays correctly
- [ ] Batch codes are unique
- [ ] Notes include accumulation information

### Edge Cases
- [ ] First product creation works (no previous batch)
- [ ] Restock after complete depletion works
- [ ] Multiple restocks accumulate correctly
- [ ] Mortality loss between restocks handled properly

---

## Common Issues to Watch For

### Issue 1: Incorrect Accumulation
**Symptom:** New batch `currentQty` doesn't include previous batch
**Check:** 
- Verify previous batch query returns correct batch
- Confirm previous batch has `status: "active"`
- Check sorting logic (most recent first)

### Issue 2: Wrong Product Stock Total
**Symptom:** Product total stock doesn't match sum of batches
**Check:**
- Verify product stock update adds only new quantity
- Confirm stock deductions (sales, mortality) update product stock
- Check for orphaned stock records

### Issue 3: Stock Movement Log Issues
**Symptom:** Movement log shows incorrect before/after quantities
**Check:**
- `quantityBefore` should equal previous batch `currentQty`
- `quantityChange` should equal new restock amount
- `quantityAfter` should equal accumulated total

---

## Expected Performance

### Query Performance
- Previous batch query should be fast (indexed by product + status)
- Sorting in memory is acceptable (typically < 10 batches per product)

### Data Consistency
- All updates happen in single transaction
- Stock movements always match stock record changes
- Product stock always reflects sum of active batches

---

## Rollback Plan

If issues are found:

1. **Immediate Action:**
   - Revert `stock.ts` changes
   - Revert `products.ts` changes
   - Redeploy previous version

2. **Data Cleanup:**
   - Identify affected stock records
   - Recalculate `currentQty` based on movements
   - Update product stock to match sum of batches

3. **Testing:**
   - Run all scenarios again
   - Verify data integrity
   - Check with stakeholders before re-enabling

---

**Status:** Ready for Testing
**Priority:** High
**Estimated Test Time:** 30-45 minutes for all scenarios
