# Initial Movement Type for New Products

## Date: November 14, 2025

## Summary
Added "initial" as a new movement type for stock movements when creating new products, distinguishing initial product creation from subsequent purchases.

---

## Changes Made

### 1. Schema Update (`convex/schema.ts`)

**Added "initial" to movementType union:**

```typescript
movementType: v.union(
  v.literal("initial"),   // NEW - Initial product creation
  v.literal("purchase"),  // New stock received
  v.literal("restock"),   // Restock existing product
  v.literal("sale"),      // Stock sold
  v.literal("reservation"), // Stock reserved
  v.literal("return"),    // Customer return
  v.literal("damage"),    // Marked as damaged
  v.literal("adjustment"), // Manual adjustment
  v.literal("transfer"),  // Transfer between locations
  v.literal("expiry")     // Expired stock removal
),
```

---

### 2. Products Service Update (`convex/services/products.ts`)

**Changed movement type from "purchase" to "initial":**

```typescript
// Log initial stock movement
await ctx.db.insert("stockMovements", {
  stockRecordId: stockRecordId,
  productId: productId,
  batchCode: batchCode,
  movementType: "initial",  // Changed from "purchase"
  quantityBefore: 0,
  quantityChange: args.stock,
  quantityAfter: args.stock,
  createdAt: now,
});
```

---

### 3. Admin Service Update (`convex/services/admin.ts`)

**Changed movement type from "purchase" to "initial":**

```typescript
// Log initial stock movement
await ctx.db.insert("stockMovements", {
  stockRecordId: stockRecordId,
  productId: productId,
  batchCode: batchCode,
  movementType: "initial",  // Changed from "purchase"
  quantityBefore: 0,
  quantityChange: args.stock,
  quantityAfter: args.stock,
  createdAt: now,
});
```

---

### 4. Stock Service Query Update (`convex/services/stock.ts`)

**Added "initial" to query filter options:**

```typescript
export const getStockMovements = query({
  args: {
    productId: v.optional(v.id("products")),
    batchCode: v.optional(v.string()),
    movementType: v.optional(v.union(
      v.literal("initial"),     // NEW
      v.literal("purchase"),
      v.literal("sale"),
      // ... other types
    )),
    limit: v.optional(v.number()),
  },
  // ...
});
```

---

## Movement Type Clarification

| Movement Type | When Used | Example |
|--------------|-----------|---------|
| **initial** | Creating a new product with initial stock | Create "Betta Fish - Blue" with 100 units |
| **purchase** | Receiving new stock (external purchase) | Purchase 50 units from supplier |
| **restock** | Restocking existing product inventory | Admin restocks 80 units |
| **sale** | Stock sold to customer | Order completed, 10 units sold |
| **reservation** | Stock reserved for customer | Reserve 5 units for pickup |
| **return** | Customer returns product | Customer returns 2 units |
| **damage** | Mortality loss or damaged goods | Record 3 units mortality loss |
| **adjustment** | Manual stock correction | Inventory reconciliation |
| **transfer** | Moving stock between locations | Transfer 20 units to another tank |
| **expiry** | Expired stock removal | Remove 5 expired units |

---

## Benefits

### 1. Clear Distinction
```
✅ "initial" = First-time product creation
✅ "purchase" = Subsequent external purchases
✅ "restock" = Admin manual restock
```

### 2. Better Reporting
```typescript
// Get all initial product creations
const initialCreations = await ctx.db
  .query("stockMovements")
  .withIndex("by_movement_type", (q) => q.eq("movementType", "initial"))
  .collect();

// Get all subsequent purchases
const purchases = await ctx.db
  .query("stockMovements")
  .withIndex("by_movement_type", (q) => q.eq("movementType", "purchase"))
  .collect();
```

### 3. Accurate Analytics
- Track how many products were created
- Distinguish initial inventory from restocks
- Calculate initial investment vs additional purchases

### 4. Audit Trail Clarity
```
Movement History:
1. initial    → Product created with 100 units
2. sale       → 30 units sold
3. restock    → 50 units restocked
4. purchase   → 80 units purchased from supplier
5. damage     → 5 units mortality loss
```

---

## Example Scenarios

### Scenario 1: Create New Product

**Action:** Admin creates "Betta Fish - Blue" with 100 units

**Stock Movement Created:**
```typescript
{
  movementType: "initial",     ✅ First creation
  quantityBefore: 0,
  quantityChange: 100,
  quantityAfter: 100,
  batchCode: "BATCH-20251114-ABC1"
}
```

---

### Scenario 2: Purchase from Supplier

**Action:** Purchase 50 more units from external supplier

**Stock Movement Created:**
```typescript
{
  movementType: "purchase",    ✅ External purchase
  quantityBefore: 70,
  quantityChange: 50,
  quantityAfter: 120,
  batchCode: "BATCH-20251120-XYZ2"
}
```

---

### Scenario 3: Admin Restock

**Action:** Admin manually restocks 80 units

**Stock Movement Created:**
```typescript
{
  movementType: "restock",     ✅ Manual restock
  quantityBefore: 50,
  quantityChange: 80,
  quantityAfter: 130,
  batchCode: "BATCH-20251125-DEF3"
}
```

---

## Query Examples

### Get Initial Product Creations
```typescript
const initialCreations = await ctx.db
  .query("stockMovements")
  .withIndex("by_movement_type", (q) => q.eq("movementType", "initial"))
  .collect();

console.log(`Total products created: ${initialCreations.length}`);
```

### Calculate Initial Investment
```typescript
const initialMovements = await ctx.db
  .query("stockMovements")
  .filter((q) => q.eq(q.field("movementType"), "initial"))
  .collect();

let totalInitialUnits = 0;
for (const movement of initialMovements) {
  totalInitialUnits += movement.quantityChange;
}

console.log(`Total initial inventory: ${totalInitialUnits} units`);
```

### Product Creation Timeline
```typescript
const productMovements = await ctx.db
  .query("stockMovements")
  .withIndex("by_product", (q) => q.eq("productId", productId))
  .collect();

const initialMovement = productMovements.find(m => m.movementType === "initial");
const restocks = productMovements.filter(m => m.movementType === "restock");
const purchases = productMovements.filter(m => m.movementType === "purchase");

console.log(`Created: ${new Date(initialMovement.createdAt).toLocaleDateString()}`);
console.log(`Initial Stock: ${initialMovement.quantityChange} units`);
console.log(`Restocks: ${restocks.length}`);
console.log(`Purchases: ${purchases.length}`);
```

---

## Migration Notes

### Existing Data
- Old stock movements with "purchase" for initial creations remain unchanged
- New product creations will use "initial" movement type
- No data migration required

### Backward Compatibility
- All existing queries still work
- "purchase" remains valid for external purchases
- Additive change - no breaking changes

---

## Files Modified

1. **convex/schema.ts** (Line 309)
   - Added `v.literal("initial")` to movementType union
   - Updated comment for "purchase"

2. **convex/services/products.ts** (Line 472)
   - Changed `movementType: "purchase"` to `movementType: "initial"`

3. **convex/services/admin.ts** (Line 396)
   - Changed `movementType: "purchase"` to `movementType: "initial"`

4. **convex/services/stock.ts** (Line 364)
   - Added `v.literal("initial")` to query filter options

---

## Testing Checklist

### Verify Initial Movement Type
- [ ] Create new product → movement type is "initial"
- [ ] Initial movement shows `quantityBefore: 0`
- [ ] Initial movement shows correct `quantityChange`
- [ ] Batch code is generated correctly

### Verify Other Movement Types
- [ ] Restock product → movement type is "restock"
- [ ] Record mortality → movement type is "damage"
- [ ] Process sale → movement type is "sale"
- [ ] No existing functionality broken

### Verify Queries
- [ ] Filter by "initial" returns only product creations
- [ ] Filter by "purchase" returns external purchases
- [ ] Filter by "restock" returns manual restocks
- [ ] All movement types work correctly

---

**Status:** ✅ Completed  
**Version:** 1.0  
**Impact:** Low - Additive change, improves clarity  
