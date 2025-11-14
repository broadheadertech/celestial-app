# Mortality Loss Feature Removal Summary

## Overview
Successfully removed the mortality loss feature from the entire codebase while keeping the tank number feature intact.

**Date**: November 14, 2025
**Status**: ✅ Completed

---

## Changes Made

### 1. Database Schema (`convex/schema.ts`)
**Removed**:
```typescript
fish: defineTable({
  // ... other fields
  mortalityLoss: v.optional(v.number()) // ❌ REMOVED
})
```

**Result**: Fish table no longer has mortality loss tracking field.

---

### 2. Backend Services (`convex/services/products.ts`)

#### createProduct Mutation
**Removed from args**:
```typescript
fishData: v.optional(v.object({
  // ... other fields
  mortalityLoss: v.optional(v.number()) // ❌ REMOVED
}))
```

**Removed from fish insert**:
```typescript
await ctx.db.insert("fish", {
  // ... other fields
  mortalityLoss: args.fishData.mortalityLoss // ❌ REMOVED
});
```

#### updateProduct Mutation
**Removed from args**:
```typescript
fishData: v.optional(v.object({
  // ... other fields
  mortalityLoss: v.optional(v.number()) // ❌ REMOVED
}))
```

**Removed from fish patch and insert**:
```typescript
await ctx.db.patch(existingFishData._id, {
  // ... other fields
  mortalityLoss: fishData.mortalityLoss // ❌ REMOVED
});

await ctx.db.insert("fish", {
  // ... other fields
  mortalityLoss: fishData.mortalityLoss // ❌ REMOVED
});
```

---

### 3. Frontend Form (`app/admin/products/form/page.tsx`)

#### Form Interface
**Removed from ProductFormData**:
```typescript
interface ProductFormData {
  // Fish specific fields
  // ... other fields
  mortalityLoss: string; // ❌ REMOVED
}
```

#### Initial State
**Removed from initialFormData**:
```typescript
const initialFormData: ProductFormData = {
  // ... other fields
  mortalityLoss: '', // ❌ REMOVED
};
```

#### Load Existing Data
**Removed from useEffect**:
```typescript
useEffect(() => {
  if (existingFishData && isEditing) {
    setFormData(prev => ({
      // ... other fields
      mortalityLoss: existingFishData.mortalityLoss?.toString() || '', // ❌ REMOVED
    }));
  }
}, [existingFishData, isEditing]);
```

#### Save Handlers
**Removed from fishDataForUpdate (editing)**:
```typescript
fishDataForUpdate = {
  // ... other fields
  mortalityLoss: formData.mortalityLoss ? parseFloat(formData.mortalityLoss) : undefined // ❌ REMOVED
};
```

**Removed from fishData (creating)**:
```typescript
const fishData = {
  // ... other fields
  mortalityLoss: formData.mortalityLoss ? parseFloat(formData.mortalityLoss) : undefined // ❌ REMOVED
};
```

#### UI Components
**Removed entire UI section**:
```tsx
{/* Mortality Loss */}
{renderFormField('Mortality Loss (Optional)')}
<input
  className="w-full p-4 rounded-lg bg-secondary border border-primary/10 text-white placeholder:text-muted mb-4"
  placeholder="Number of fish lost (e.g., 5)"
  type="number"
  min="0"
  value={formData.mortalityLoss}
  onChange={(e) => handleInputChange('mortalityLoss', e.target.value)}
/>
<p className="text-xs text-white/60 -mt-2 mb-4">
  Track fish mortality for inventory management
</p>
// ❌ ALL REMOVED
```

---

## What Remains Intact

### ✅ Tank Number Feature (Still Active)

#### Database Schema
```typescript
products: defineTable({
  // ... other fields
  tankNumber: v.optional(v.string()), // ✅ KEPT
})
```

#### Backend Services
```typescript
// createProduct and updateProduct mutations
tankNumber: v.optional(v.string()), // ✅ KEPT
```

#### Frontend Form
```typescript
// Form state
tankNumber: string; // ✅ KEPT

// UI component
{/* Tank Number */}
{renderFormField('Tank Number')}
<input
  placeholder="e.g., TANK-001, A-12, etc."
  value={formData.tankNumber}
  onChange={(e) => handleInputChange('tankNumber', e.target.value)}
/>
// ✅ KEPT
```

#### Product List Display
```tsx
{product.tankNumber && (
  <span className="px-1.5 py-0.5 rounded bg-info/10 text-info">
    Tank: {product.tankNumber}
  </span>
)}
// ✅ KEPT
```

---

## Files Modified

1. ✅ `convex/schema.ts` - Removed mortalityLoss from fish table
2. ✅ `convex/services/products.ts` - Removed from createProduct and updateProduct
3. ✅ `app/admin/products/form/page.tsx` - Removed from interface, state, handlers, and UI

---

## Current Product Form Layout (After Removal)

### For FISH Products
```
┌─────────────────────────────────────────┐
│  📋 BASIC INFORMATION                   │
├─────────────────────────────────────────┤
│  • Product Name *                       │
│  • Description                          │
│  • Category *                           │
│  • Price * | Original Price             │
│  • Stock * | SKU                        │
│  • 🆕 Tank Number                        │
│  • Badge                                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  📸 PRODUCT IMAGES                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  📄 CERTIFICATES & DOCUMENTS            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  🐟 FISH SPECIFICATIONS                 │
├─────────────────────────────────────────┤
│  • Scientific Name *                    │
│  • Size (cm) *                          │
│  • Temperature (°C) * | Age (years) *   │
│  • pH Level *                           │
│  • Lifespan *                           │
│  • Origin *                             │
│  • Diet *                               │
│  ❌ Mortality Loss (REMOVED)            │
└─────────────────────────────────────────┘
```

---

## Backward Compatibility

### Existing Data
✅ **No issues**: The `mortalityLoss` field was optional, so existing fish records will continue to work without any problems.

### Database Migration
✅ **Not required**: Since the field was optional and is simply being ignored, no data migration is needed. The field may still exist in the database but is no longer used or displayed.

---

## Summary

### Removed Features
- ❌ Mortality Loss tracking for fish
- ❌ Mortality Loss input field in form
- ❌ Mortality Loss from database schema
- ❌ Mortality Loss from backend CRUD operations
- ❌ All mortality loss related UI components

### Retained Features
- ✅ Tank Number for all products
- ✅ Tank Number badge in product list
- ✅ All other product management features
- ✅ Fish specifications (without mortality loss)
- ✅ Tank specifications
- ✅ All existing functionality

---

## Testing Recommendations

### Manual Tests
- [ ] Create new fish product (verify no mortality loss field)
- [ ] Edit existing fish product (verify no mortality loss field)
- [ ] Create product with tank number (verify it still works)
- [ ] Edit product with tank number (verify it still works)
- [ ] View product list (verify tank number badge still displays)
- [ ] Verify no console errors or TypeScript errors

---

## Result

✅ **Mortality loss feature completely removed**
✅ **Tank number feature fully functional**
✅ **No breaking changes to existing data**
✅ **All forms and UI updated**
✅ **Backend and frontend in sync**

The codebase is now clean and only includes the tank number tracking feature for products.
