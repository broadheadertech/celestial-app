# Quick Reference: Tank Number & Mortality Loss Fields

## Visual Guide to New Fields

---

## 🏷️ TANK NUMBER FIELD

### Location in Form
```
📋 BASIC INFORMATION SECTION
├── Product Name *
├── Description
├── Category *
├── Price (₱) *
├── Original Price (₱)
├── Stock Quantity * | SKU
└── 🆕 Tank Number ← NEW FIELD (for all products)
    └── Badge (optional)
    └── General Lifespan
```

### Form UI
```
┌─────────────────────────────────────────┐
│  Tank Number                            │
│  ┌───────────────────────────────────┐  │
│  │ e.g., TANK-001, A-12, etc.        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Display in Product List
```
┌──────────────────────────────────────────────┐
│  [Image]  Goldfish                           │
│           Fish Category                      │
│           ID: ABC123  [Tank: TANK-A12] ← NEW │
│                                              │
│           ₱500.00                            │
│           [Active] [50 in stock]            │
└──────────────────────────────────────────────┘
```

### Use Cases
- ✅ **Fish**: Track which display tank
- ✅ **Tanks**: Warehouse location
- ✅ **Accessories**: Storage area
- ✅ **General**: Any physical location identifier

---

## 🐟 MORTALITY LOSS FIELD

### Location in Form (Fish Products Only)
```
🐟 FISH SPECIFICATIONS SECTION
├── Scientific Name *
├── Size (cm) *
├── Temperature (°C) * | Age (years) *
├── pH Level *
├── Lifespan *
├── Origin *
├── Diet *
└── 🆕 Mortality Loss (Optional) ← NEW FIELD (fish only)
```

### Form UI
```
┌─────────────────────────────────────────┐
│  Mortality Loss (Optional)              │
│  ┌───────────────────────────────────┐  │
│  │ Number of fish lost (e.g., 5)     │  │
│  └───────────────────────────────────┘  │
│  Track fish mortality for inventory     │
│  management                              │
└─────────────────────────────────────────┘
```

### Visibility Rules
- ✅ **Shows**: When category contains "fish" or "aquatic"
- ❌ **Hidden**: For tank and non-fish products

---

## 📊 COMPLETE FORM LAYOUT

### For FISH Products
```
┌─────────────────────────────────────────┐
│  📋 BASIC INFORMATION                   │
├─────────────────────────────────────────┤
│  • Product Name *                       │
│  • Description                          │
│  • Category * (Fish - LOCKED on edit)   │
│  • Price * | Original Price             │
│  • Stock * | SKU                        │
│  • 🆕 Tank Number                        │
│  • Badge                                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  📸 PRODUCT IMAGES                      │
├─────────────────────────────────────────┤
│  [Upload Product Images]                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  📄 CERTIFICATES & DOCUMENTS            │
├─────────────────────────────────────────┤
│  [Upload Certificates]                  │
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
│  • 🆕 Mortality Loss (Optional)          │
└─────────────────────────────────────────┘
```

### For TANK Products
```
┌─────────────────────────────────────────┐
│  📋 BASIC INFORMATION                   │
├─────────────────────────────────────────┤
│  • Product Name *                       │
│  • Description                          │
│  • Category * (Tank - LOCKED on edit)   │
│  • Price * | Original Price             │
│  • Stock * | SKU                        │
│  • 🆕 Tank Number                        │
│  • Badge                                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  📸 PRODUCT IMAGES                      │
├─────────────────────────────────────────┤
│  [Upload Product Images]                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  📄 CERTIFICATES & DOCUMENTS            │
├─────────────────────────────────────────┤
│  [Upload Certificates]                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  🏺 TANK SPECIFICATIONS                 │
├─────────────────────────────────────────┤
│  • Tank Type *                          │
│  • Material *                           │
│  • Capacity (Liters) *                  │
│  • Dimensions * (L x W x H)             │
│  • Glass Thickness (mm) *               │
│  • Lighting (Watts) | Filtration (L/hr) │
└─────────────────────────────────────────┘

Note: NO mortality loss field for tanks!
```

### For OTHER Products (Accessories, etc.)
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
│  • Product Lifespan                     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  📸 PRODUCT IMAGES                      │
├─────────────────────────────────────────┤
│  [Upload Product Images]                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  📄 CERTIFICATES & DOCUMENTS            │
├─────────────────────────────────────────┤
│  [Upload Certificates]                  │
└─────────────────────────────────────────┘

Note: NO category-specific fields!
```

---

## 🔄 DATA FLOW SUMMARY

### Tank Number Flow
```
Admin Form
    ↓
Tank Number Input (text)
    ↓
formData.tankNumber (string)
    ↓
baseProductData.tankNumber
    ↓
Backend Mutation (createProduct/updateProduct)
    ↓
products.tankNumber (database)
    ↓
Product List Query
    ↓
Display as Badge (if exists)
```

### Mortality Loss Flow
```
Admin Form (Fish Category Only)
    ↓
Mortality Loss Input (number)
    ↓
formData.mortalityLoss (string)
    ↓
parseFloat() conversion
    ↓
fishData.mortalityLoss
    ↓
Backend Mutation (createProduct/updateProduct)
    ↓
fish.mortalityLoss (database)
    ↓
Load on Edit (getFishByProductId)
    ↓
Display in Form (toString())
```

---

## 💡 TIPS FOR USERS

### Tank Number Best Practices
1. **Be Consistent**: Use same format (e.g., TANK-001, TANK-002)
2. **Be Descriptive**: Include location info (e.g., STORE-A-TANK-5)
3. **Keep Simple**: Easy to read and remember
4. **Plan Ahead**: Think about expansion (use 001-999, not 1-99)

### Mortality Loss Best Practices
1. **Update Regularly**: Track as deaths occur
2. **Be Accurate**: Exact numbers for inventory accuracy
3. **Zero is Valid**: 0 means "tracked, no deaths" vs empty = "not tracked"
4. **Consider Automation**: Future: May auto-adjust stock

---

## 📝 EXAMPLE ENTRIES

### Tank Number Examples
```
✅ GOOD:
- TANK-001
- DISPLAY-A-12
- WAREHOUSE-B-SHELF-15
- VIP-SECTION-3
- STORE-FRONT-TANK-5

❌ AVOID:
- Tank 1 (inconsistent formatting)
- t1 (unclear)
- The big tank in the corner (too long)
```

### Mortality Loss Examples
```
✅ GOOD:
- 0 (tracked, zero deaths)
- 5 (5 fish died)
- 12 (12 fish died)

❌ INVALID:
- -5 (negative not allowed)
- "five" (must be number)
- 999999 (unrealistic, check input)
```

---

## 🎯 QUICK CHECKLIST

### Adding Tank Number
- [ ] Open product form (create or edit)
- [ ] Scroll to "Basic Information" section
- [ ] Find "Tank Number" field (after SKU)
- [ ] Enter tank identifier (optional)
- [ ] Save product
- [ ] Check product list for tank badge

### Adding Mortality Loss
- [ ] Open FISH product form (create or edit)
- [ ] Scroll to "Fish Specifications" section
- [ ] Find "Mortality Loss" field (after Diet)
- [ ] Enter number of fish lost (optional)
- [ ] Save product
- [ ] Data stored in fish table

---

## ⚙️ TECHNICAL DETAILS

### Database Tables Affected
```
products table:
  ├── tankNumber: string (optional)
  
fish table:
  ├── mortalityLoss: number (optional)
```

### Backend Mutations Updated
```
✅ createProduct (products.ts)
✅ updateProduct (products.ts)
```

### Frontend Components Updated
```
✅ app/admin/products/form/page.tsx
✅ app/admin/products/page.tsx
```

---

## 🚀 READY TO USE!

Both features are now live and ready for production use:
- ✅ Tank Number: Universal tracking for all products
- ✅ Mortality Loss: Fish-specific inventory management

Start using them today to improve your inventory tracking! 🎉
