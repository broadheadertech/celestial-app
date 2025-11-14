# Movement Type Update - Added "restock"

## Date: November 14, 2025

## Summary
Added "restock" as a distinct movement type for stock movements to differentiate between initial stock purchases and subsequent restocking operations.

---

## Changes Made

### 1. Schema Update (`convex/schema.ts`)

**Added "restock" to stockMovements movementType union:**

```typescript
movementType: v.union(
  v.literal("purchase"), // New stock received (initial)
  v.literal("restock"), // Restock existing product
  v.literal("sale"), // Stock sold
  v.literal("reservation"), // Stock reserved
  v.literal("return"), // Customer return
  v.literal("damage"), // Marked as damaged
  v.literal("adjustment"), // Manual adjustment
  v.literal("transfer"), // Transfer between locations
  v.literal("expiry") // Expired stock removal
),
```

**Key Points:**
- `"purchase"` - Used for initial stock creation when product is first created
- `"restock"` - Used for adding inventory to existing products
- Clear distinction between initial purchase and subsequent restocks

---

### 2. Stock Service Update (`convex/services/stock.ts`)

#### Updated `getStockMovements` Query
Added "restock" to the movement type filter options:

```typescript
movementType: v.optional(v.union(
  v.literal("purchase"),
  v.literal("sale"),
  v.literal("reservation"),
  v.literal("return"),
  v.literal("damage"),
  v.literal("restock"), // NEW
  v.literal("adjustment"),
  v.literal("transfer"),
  v.literal("expiry")
)),
```

#### Updated `restockProduct` Mutation
Changed movement type from "purchase" to "restock":

```typescript
// Before:
await ctx.db.insert("stockMovements", {
  stockRecordId: stockRecordId,
  productId: productId,
  batchCode: batchCode,
  movementType: "purchase", // ❌ Old
  quantityBefore: previousCurrentQty,
  quantityChange: quantity,
  quantityAfter: newCurrentQty,
  createdAt: now,
});

// After:
await ctx.db.insert("stockMovements", {
  stockRecordId: stockRecordId,
  productId: productId,
  batchCode: batchCode,
  movementType: "restock", // ✅ New
  quantityBefore: previousCurrentQty,
  quantityChange: quantity,
  quantityAfter: newCurrentQty,
  createdAt: now,
});
```

---

### 3. Files NOT Changed

The following files correctly use "purchase" for initial stock creation and were NOT modified:

#### `convex/services/products.ts` - Line 472
```typescript
// Log initial stock movement for NEW product
await ctx.db.insert("stockMovements", {
  stockRecordId: stockRecordId,
  productId: productId,
  batchCode: batchCode,
  movementType: "purchase", // ✅ Correct - initial product creation
  quantityBefore: 0,
  quantityChange: args.stock,
  quantityAfter: args.stock,
  createdAt: now,
});
```

#### `convex/services/admin.ts` - Line 396
```typescript
// Log initial stock movement for NEW product
await ctx.db.insert("stockMovements", {
  stockRecordId: stockRecordId,
  productId: productId,
  batchCode: batchCode,
  movementType: "purchase", // ✅ Correct - initial product creation
  quantityBefore: 0,
  quantityChange: args.stock,
  quantityAfter: args.stock,
  createdAt: now,
});
```

---

## Movement Type Usage Guidelines

### When to Use Each Type:

| Movement Type | When to Use | Example |
|---------------|-------------|---------|
| **purchase** | Initial product creation only | Creating a new product with initial stock |
| **restock** | Adding inventory to existing product | Restocking a product that's running low |
| **sale** | Stock sold to customer | Processing an order/reservation |
| **reservation** | Stock reserved for customer | Customer reserves fish |
| **return** | Customer returns product | Defective item returned |
| **damage** | Mortality loss or damaged goods | Fish mortality, broken tanks |
| **adjustment** | Manual stock corrections | Inventory reconciliation |
| **transfer** | Moving stock between locations | Tank to tank transfer |
| **expiry** | Removing expired stock | Fish reached end of lifespan |

---

## Benefits of This Change

### 1. **Clear Audit Trail**
```
Product Timeline:
1. Created with 100 units → movementType: "purchase"
2. Restocked 50 units → movementType: "restock"
3. Sold 30 units → movementType: "sale"
4. Restocked 80 units → movementType: "restock"
```

### 2. **Better Reporting**
- Distinguish between initial purchases and restocks
- Track restock frequency and patterns
- Analyze purchasing vs restocking behavior

### 3. **Accurate Analytics**
- Total initial purchases vs total restocks
- Restock frequency per product
- Average restock quantity
- Time between restocks

### 4. **Clearer Intent**
- Code is more self-documenting
- Movement logs are easier to understand
- Business logic is more explicit

---

## Example Query Usage

### Filter by Movement Type

```typescript
// Get all restock movements
const restockMovements = await ctx.db
  .query("stockMovements")
  .withIndex("by_movement_type", (q) => q.eq("movementType", "restock"))
  .collect();

// Get all initial purchases
const initialPurchases = await ctx.db
  .query("stockMovements")
  .withIndex("by_movement_type", (q) => q.eq("movementType", "purchase"))
  .collect();
```

### Analytics Queries

```typescript
// Count restocks per product
const productRestocks = restockMovements.reduce((acc, movement) => {
  acc[movement.productId] = (acc[movement.productId] || 0) + 1;
  return acc;
}, {});

// Calculate total restocked quantity
const totalRestockedQty = restockMovements.reduce((sum, movement) => {
  return sum + movement.quantityChange;
}, 0);
```

---

## Testing Checklist

### Verify Movement Types

- [ ] **Initial Product Creation**: Creates "purchase" movement
- [ ] **Product Restock**: Creates "restock" movement
- [ ] **Stock Sale**: Creates "sale" movement
- [ ] **Mortality Loss**: Creates "damage" movement
- [ ] **Stock Adjustment**: Creates "adjustment" movement

### Verify Filtering

- [ ] Filter by "purchase" returns only initial creations
- [ ] Filter by "restock" returns only restock operations
- [ ] Filter by product ID shows all movement types
- [ ] Movement history displays correct types

### Verify Reporting

- [ ] Stock history distinguishes purchase vs restock
- [ ] Analytics correctly categorize movements
- [ ] Admin dashboard shows accurate stats
- [ ] Inventory reports use correct movement types

---

## Migration Notes

### Existing Data
- Existing "purchase" movements remain unchanged
- Old restock operations marked as "purchase" can be manually updated if needed
- New restocks will automatically use "restock" type

### Backward Compatibility
- All existing queries still work
- Schema change is additive (adds new option)
- No breaking changes to existing functionality

### Manual Migration (Optional)
If you want to update old restock operations:

```typescript
// Find restock records (where isRestock = true)
const restockRecords = await ctx.db
  .query("stockRecords")
  .filter((q) => q.eq(q.field("isRestock"), true))
  .collect();

// Update their stock movements to "restock"
for (const record of restockRecords) {
  const movements = await ctx.db
    .query("stockMovements")
    .withIndex("by_stock_record", (q) => q.eq("stockRecordId", record._id))
    .filter((q) => q.eq(q.field("movementType"), "purchase"))
    .collect();
  
  for (const movement of movements) {
    await ctx.db.patch(movement._id, {
      movementType: "restock",
    });
  }
}
```

---

## Files Modified

1. **convex/schema.ts**
   - Added "restock" to movementType union (Line 310)
   - Updated comment for "purchase" type

2. **convex/services/stock.ts**
   - Added "restock" to getStockMovements query (Line 369)
   - Changed restockProduct movement type to "restock" (Line 572)

---

## Related Documentation

- See `RESTOCK_ACCUMULATION_UPDATE.md` for restock formula changes
- See `RESTOCK_TEST_SCENARIOS.md` for testing guidelines
- See `STOCK_MANAGEMENT_SYSTEM.md` for complete stock system overview

---

**Status:** ✅ Completed
**Version:** 1.0
**Impact:** Low - Additive change, backward compatible
