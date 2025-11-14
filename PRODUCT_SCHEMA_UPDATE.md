# Product Schema Update - November 14, 2025

## Overview
Updated the products database schema and CRUD operations to add `tankNumber` field to the products table and `mortalityLoss` field (optional) to the fish table.

## Changes Made

### 1. Schema Updates (`convex/schema.ts`)

#### Products Table
Added new optional field:
- **`tankNumber`**: `v.optional(v.string())` - Tank number identifier for products

#### Fish Table
Added new optional field:
- **`mortalityLoss`**: `v.optional(v.number())` - Mortality loss tracking for fish inventory

### 2. CRUD Operations Updates (`convex/services/products.ts`)

#### `createProduct` Mutation
**Arguments Updated:**
- Added `tankNumber: v.optional(v.string())` to core product fields
- Added `mortalityLoss: v.optional(v.number())` to `fishData` object

**Handler Updated:**
- Product insertion now includes `tankNumber` field
- Fish data insertion now includes `mortalityLoss` field

#### `updateProduct` Mutation
**Arguments Updated:**
- Added `tankNumber: v.optional(v.string())` to core product fields
- Added `mortalityLoss: v.optional(v.number())` to `fishData` object

**Handler Updated:**
- `updateData` object now handles `tankNumber` updates
- Fish data patch operations now include `mortalityLoss` field (both update and insert)

## Usage Examples

### Creating a Product with Tank Number
```typescript
const productId = await createProduct({
  name: "Premium Aquarium Tank",
  price: 5000,
  categoryId: tankCategoryId,
  image: "tank.jpg",
  stock: 10,
  tankNumber: "TNK-001", // New field
  isActive: true,
  // ... other fields
});
```

### Creating a Fish Product with Mortality Loss
```typescript
const productId = await createProduct({
  name: "Goldfish",
  price: 500,
  categoryId: fishCategoryId,
  image: "goldfish.jpg",
  stock: 50,
  isActive: true,
  fishData: {
    scientificName: "Carassius auratus",
    size: 5,
    temperature: 22,
    age: 1,
    phLevel: "7.0-8.0",
    lifespan: "10-15 years",
    origin: "China",
    diet: "Omnivore",
    mortalityLoss: 5 // New optional field
  }
});
```

### Updating Tank Number
```typescript
await updateProduct({
  productId: existingProductId,
  tankNumber: "TNK-002" // Update tank number
});
```

### Updating Fish Mortality Loss
```typescript
await updateProduct({
  productId: existingFishId,
  fishData: {
    scientificName: "Carassius auratus",
    size: 6,
    temperature: 22,
    age: 2,
    phLevel: "7.0-8.0",
    lifespan: "10-15 years",
    origin: "China",
    diet: "Omnivore",
    mortalityLoss: 3 // Updated mortality loss
  }
});
```

## Database Migration

**Note:** These schema changes are backward compatible:
- `tankNumber` is optional, so existing products without this field will work fine
- `mortalityLoss` is optional, so existing fish data records will work fine
- No data migration needed for existing records

## Files Modified
1. `convex/schema.ts` - Added fields to products and fish tables
2. `convex/services/products.ts` - Updated createProduct and updateProduct mutations

## Testing Recommendations
1. Test creating new products with `tankNumber`
2. Test creating fish products with `mortalityLoss`
3. Test updating existing products with new fields
4. Test that existing products without these fields still work correctly
5. Verify that optional nature of fields works as expected

## Status
✅ Schema updated successfully
✅ createProduct mutation updated
✅ updateProduct mutation updated
✅ All changes are backward compatible
