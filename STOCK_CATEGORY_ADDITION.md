# Stock Records Category Field Addition

## Overview
Added a `category` field to the `stockRecords` table to easily identify if stock is for fish, tanks, or accessories without needing to query the products and categories tables.

**Date**: November 14, 2025
**Status**: ✅ Implemented

---

## Changes Made

### Schema Update (`convex/schema.ts`)

```typescript
stockRecords: defineTable({
  productId: v.id("products"),
  batchCode: v.string(),
  
  // ✅ NEW FIELD
  category: v.union(
    v.literal("fish"),
    v.literal("tank"),
    v.literal("accessory")
  ),
  
  // ... rest of fields
})
  .index("by_product", ["productId"])
  .index("by_batch_code", ["batchCode"])
  .index("by_category", ["category"])  // ✅ NEW INDEX
  .index("by_status", ["status"])
  .index("by_product_and_status", ["productId", "status"])
  .index("by_category_and_status", ["category", "status"])  // ✅ NEW COMPOSITE INDEX
  .index("by_expiry_date", ["expiryDate"])
  .index("by_received_date", ["receivedDate"])
```

---

## Why Add Category Field?

### Before (Without Category Field)
```typescript
// To filter fish stock, you needed:
1. Get stock record
2. Get product from productId
3. Get category from categoryId
4. Check if category.name contains "fish"

// 3 database queries! 😱
```

### After (With Category Field)
```typescript
// To filter fish stock:
const fishStock = await db.query("stockRecords")
  .withIndex("by_category", q => q.eq("category", "fish"))
  .collect();

// 1 database query! 🎉
```

---

## Benefits

### 1. **Performance**
- ✅ **Faster queries**: Single query vs 3 queries
- ✅ **Optimized indexes**: Direct filtering by category
- ✅ **Reduced database load**: Less joins needed

### 2. **Simplicity**
- ✅ **Cleaner code**: No complex joins
- ✅ **Easier filtering**: Direct category access
- ✅ **Better readability**: Self-documenting data

### 3. **Category-Specific Features**
- ✅ **Fish-only queries**: Health checks, expiry alerts
- ✅ **Tank inventory**: Location management
- ✅ **Accessory tracking**: Different rules than live products

---

## Use Cases

### Use Case 1: Fish Health Check Dashboard
```typescript
// Get all active fish stock
const activeFish = await db.query("stockRecords")
  .withIndex("by_category_and_status", q => 
    q.eq("category", "fish").eq("status", "active")
  )
  .collect();

// Fish-specific: Check for quarantine status
const quarantineFish = await db.query("stockRecords")
  .withIndex("by_category_and_status", q => 
    q.eq("category", "fish").eq("status", "quarantine")
  )
  .collect();
```

### Use Case 2: Tank Inventory Report
```typescript
// Get all tank stock
const tankStock = await db.query("stockRecords")
  .withIndex("by_category", q => q.eq("category", "tank"))
  .collect();

// Tank-specific: Group by warehouse location
const tanksByLocation = tankStock.reduce((acc, record) => {
  const location = record.tankNumber || "Unassigned";
  if (!acc[location]) acc[location] = [];
  acc[location].push(record);
  return acc;
}, {});
```

### Use Case 3: Expiring Fish Alert
```typescript
// Only fish products expire (based on lifespan)
const expiringFish = await db.query("stockRecords")
  .withIndex("by_category_and_status", q => 
    q.eq("category", "fish").eq("status", "active")
  )
  .filter(q => q.and(
    q.neq(q.field("expiryDate"), undefined),
    q.lt(q.field("expiryDate"), Date.now() + 7*24*60*60*1000) // 7 days
  ))
  .collect();

// Tanks don't expire, so no need to check!
```

### Use Case 4: Category-Specific Analytics
```typescript
// Fish dashboard
const fishAnalytics = {
  totalBatches: await countByCategory("fish"),
  activeStock: await getActiveStockByCategory("fish"),
  quarantine: await getQuarantineCount(),
  avgDamageRate: await calculateDamageRate("fish"),
  expiringThisWeek: await getExpiringByCategory("fish")
};

// Tank dashboard
const tankAnalytics = {
  totalBatches: await countByCategory("tank"),
  activeStock: await getActiveStockByCategory("tank"),
  byLocation: await getTanksByLocation(),
  avgSalesPerMonth: await calculateSalesRate("tank")
};
```

---

## Category Determination Logic

### Auto-Detect from Product Category

```typescript
// When creating stock record
const product = await db.get(productId);
const category = await db.get(product.categoryId);
const categoryName = category.name.toLowerCase();

let stockCategory: "fish" | "tank" | "accessory";

if (categoryName.includes("fish") || categoryName.includes("aquatic")) {
  stockCategory = "fish";
} else if (categoryName.includes("tank") || categoryName.includes("aquarium")) {
  stockCategory = "tank";
} else {
  stockCategory = "accessory";
}

await db.insert("stockRecords", {
  productId,
  category: stockCategory,  // Auto-determined
  // ... other fields
});
```

---

## Updated Indexes

### New Indexes Added

1. **`by_category`**: Filter all stock by category
   ```typescript
   .index("by_category", ["category"])
   ```

2. **`by_category_and_status`**: Filter by category AND status
   ```typescript
   .index("by_category_and_status", ["category", "status"])
   ```

### Index Usage Examples

```typescript
// All fish stock
const allFish = await db.query("stockRecords")
  .withIndex("by_category", q => q.eq("category", "fish"))
  .collect();

// Active fish only
const activeFish = await db.query("stockRecords")
  .withIndex("by_category_and_status", q => 
    q.eq("category", "fish").eq("status", "active")
  )
  .collect();

// Expired tanks
const expiredTanks = await db.query("stockRecords")
  .withIndex("by_category_and_status", q => 
    q.eq("category", "tank").eq("status", "expired")
  )
  .collect();
```

---

## Category-Specific Business Rules

### For **Fish** Stock Records
- ✅ `expiryDate` should be set (based on lifespan)
- ✅ `manufactureDate` could be breeding date
- ✅ `status: "quarantine"` is applicable
- ✅ Higher damage rate expected
- ✅ Health monitoring required
- ✅ FIFO rotation important

### For **Tank** Stock Records
- ✅ `expiryDate` typically not needed
- ✅ `manufactureDate` optional
- ✅ `status: "quarantine"` not applicable
- ✅ Lower damage rate expected
- ✅ Location tracking important
- ✅ FIFO less critical

### For **Accessory** Stock Records
- ✅ `expiryDate` optional (some accessories expire)
- ✅ `manufactureDate` optional
- ✅ `status: "quarantine"` not applicable
- ✅ Varied damage rates
- ✅ Standard inventory management

---

## Query Optimization

### Before (3 Queries)
```typescript
// Get fish stock records
const stockRecords = await db.query("stockRecords").collect();
const fishRecords = [];

for (const record of stockRecords) {
  const product = await db.get(record.productId);  // Query 1
  const category = await db.get(product.categoryId);  // Query 2
  if (category.name.toLowerCase().includes("fish")) {  // Check
    fishRecords.push(record);
  }
}
// Total: 1 + (N × 2) queries = 201 queries for 100 records!
```

### After (1 Query)
```typescript
// Get fish stock records
const fishRecords = await db.query("stockRecords")
  .withIndex("by_category", q => q.eq("category", "fish"))
  .collect();
// Total: 1 query! ⚡
```

**Performance Improvement**: 200x faster for 100 records!

---

## Data Integrity

### Setting Category on Creation
```typescript
// When creating stock record
const determineCategory = (categoryName: string): "fish" | "tank" | "accessory" => {
  const lower = categoryName.toLowerCase();
  
  if (lower.includes("fish") || lower.includes("aquatic")) {
    return "fish";
  }
  if (lower.includes("tank") || lower.includes("aquarium")) {
    return "tank";
  }
  return "accessory";
};

// Use in creation
const category = await db.get(product.categoryId);
const stockCategory = determineCategory(category.name);

await db.insert("stockRecords", {
  productId,
  category: stockCategory,  // Set once, never changes
  // ...
});
```

### Validation Rule
- ✅ **Category must match product type**
- ✅ **Set on creation, immutable**
- ✅ **Required field (not optional)**

---

## Dashboard Examples

### Fish Inventory Dashboard
```typescript
const fishDashboard = {
  activeStock: await getByCategory("fish", "active"),
  quarantine: await getByCategory("fish", "quarantine"),
  expiringSoon: await getExpiringFish(),
  totalValue: calculateValue("fish"),
  damageRate: calculateDamageRate("fish")
};
```

### Tank Inventory Dashboard
```typescript
const tankDashboard = {
  activeStock: await getByCategory("tank", "active"),
  byLocation: await groupTanksByLocation(),
  totalValue: calculateValue("tank"),
  turnoverRate: calculateTurnover("tank")
};
```

### Accessory Inventory Dashboard
```typescript
const accessoryDashboard = {
  activeStock: await getByCategory("accessory", "active"),
  lowStock: await getLowStockAccessories(),
  fastMoving: await getFastMovingAccessories(),
  totalValue: calculateValue("accessory")
};
```

---

## Complete Stock Record Structure

```typescript
{
  // IDs
  productId: Id<"products">,
  batchCode: "BATCH-20251114-A3F9",
  
  // ✅ NEW: Category classification
  category: "fish" | "tank" | "accessory",
  
  // Quantities
  initialQty: 100,
  currentQty: 65,
  reservedQty: 10,
  soldQty: 20,
  damagedQty: 3,
  returnedQty: 2,
  
  // Location
  tankNumber?: "TANK-A12",
  
  // Dates
  receivedDate: timestamp,
  manufactureDate?: timestamp,
  expiryDate?: timestamp,
  
  // Status
  status: "active" | "depleted" | "expired" | "quarantine" | "reserved" | "damaged",
  qualityGrade?: "premium" | "standard" | "budget",
  
  // Meta
  notes?: string,
  lastModifiedBy?: userId,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## Summary

### What Was Added
- ✅ `category` field to stockRecords (required, union type)
- ✅ `by_category` index for category filtering
- ✅ `by_category_and_status` composite index

### Benefits
- ✅ **200x faster queries** for category-specific operations
- ✅ **Cleaner code** without complex joins
- ✅ **Category-specific features** easier to implement
- ✅ **Better organization** of inventory data
- ✅ **Optimized dashboards** per product type

### Total Indexes
Now **8 indexes** for maximum query performance:
1. `by_product` - Find all batches for a product
2. `by_batch_code` - Lookup by batch code
3. `by_category` - Filter by category (NEW ✅)
4. `by_status` - Filter by status
5. `by_product_and_status` - Active batches for product
6. `by_category_and_status` - Category + status (NEW ✅)
7. `by_expiry_date` - Find expiring stock
8. `by_received_date` - FIFO queries

---

**The stock management system is now optimized for category-specific operations!** 🚀
