# Stock & Restock System Documentation

## Overview

The stock management system uses a **1-to-Many relationship** between products and stock records, where each restock action creates a **new independent stock record** with its own batch code.

## Architecture

```
Products Table (1)
    ↓
StockRecords Table (Many)
    ├─ Original Stock (isRestock: false)
    └─ Restock Entries (isRestock: true)
```

## Database Schema

### Products Table
- `_id`: Product ID
- `sku`: Product SKU (shared across all stock records)
- `stock`: **Total current stock** (sum of all active stock records)
- `batchCode`: Original batch code from product creation
- `categoryId`: Category reference
- `tankNumber`: Storage location

### StockRecords Table
Each row represents a distinct batch of inventory:

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ID | Unique stock record ID |
| `productId` | ID | Links to products table |
| `batchCode` | string | **Unique batch code** (new for each restock) |
| `category` | enum | fish/tank/accessory |
| `isRestock` | boolean | **TRUE for restocks, FALSE for original** |
| `initialQty` | number | Quantity added in this batch |
| `currentQty` | number | Current available quantity |
| `soldQty` | number | Quantity sold from this batch |
| `damagedQty` | number | Quantity damaged from this batch |
| `receivedDate` | number | When this batch was received |
| `status` | enum | active/depleted/expired/etc |
| `notes` | string | Detailed restock information |

## How It Works

### Initial Product Creation
When a product is created:
```javascript
// Product created with stock: 50
Product: {
  _id: "prod_123",
  sku: "FISH-001",
  stock: 50,
  batchCode: "BATCH-20251114-A3F9"
}

// Initial stock record created
StockRecord: {
  _id: "stock_1",
  productId: "prod_123",
  batchCode: "BATCH-20251114-A3F9",  // Same as product
  isRestock: false,  // ← ORIGINAL
  initialQty: 50,
  currentQty: 50
}
```

### First Restock Action
Admin restocks 30 units:
```javascript
// NEW stock record created (doesn't update existing)
StockRecord: {
  _id: "stock_2",
  productId: "prod_123",
  batchCode: "BATCH-20251114-B7E2",  // ← NEW BATCH CODE
  isRestock: true,  // ← RESTOCK FLAG
  initialQty: 30,  // Quantity added
  currentQty: 30,
  notes: "📦 RESTOCK - Added 30 units
          Product: Betta Fish
          SKU: FISH-001
          Original Batch: BATCH-20251114-A3F9
          New Batch: BATCH-20251114-B7E2"
}

// Product total updated
Product.stock = 50 + 30 = 80
```

### Second Restock Action
Admin restocks 20 more units:
```javascript
// ANOTHER NEW stock record created
StockRecord: {
  _id: "stock_3",
  productId: "prod_123",
  batchCode: "BATCH-20251115-C9D1",  // ← ANOTHER NEW BATCH CODE
  isRestock: true,  // ← RESTOCK FLAG
  initialQty: 20,
  currentQty: 20
}

// Product total updated again
Product.stock = 80 + 20 = 100
```

## Visual Representation

### Product View
```
Product: Betta Fish (SKU: FISH-001)
Total Stock: 100 units
├─ Batch 1: BATCH-20251114-A3F9 [🆕 ORIGINAL]
│  └─ Quantity: 50 (Initial: 50, Sold: 0)
├─ Batch 2: BATCH-20251114-B7E2 [📦 RESTOCK]
│  └─ Quantity: 30 (Initial: 30, Sold: 0)
└─ Batch 3: BATCH-20251115-C9D1 [📦 RESTOCK]
   └─ Quantity: 20 (Initial: 20, Sold: 0)
```

### Stock History View
```
╔═══════════════════════════════════════════════════════════╗
║ Product: Betta Fish (FISH-001)                           ║
║ Total Stock: 100 units                                   ║
╠═══════════════════════════════════════════════════════════╣
║ SUMMARY                                                   ║
║ • Original Stock: 50 units (1 batch)                     ║
║ • Restocked: 50 units (2 batches)                        ║
║ • Total Sold: 0 units                                    ║
╠═══════════════════════════════════════════════════════════╣
║ BATCH HISTORY (Oldest → Newest)                          ║
║                                                           ║
║ [1] 🆕 ORIGINAL - BATCH-20251114-A3F9                    ║
║     Added: 50 units | Current: 50 | Sold: 0             ║
║     Received: Nov 14, 2025                               ║
║                                                           ║
║ [2] 📦 RESTOCK - BATCH-20251114-B7E2                     ║
║     Added: 30 units | Current: 30 | Sold: 0             ║
║     Difference: +30 from previous batch                  ║
║     Received: Nov 14, 2025                               ║
║                                                           ║
║ [3] 📦 RESTOCK - BATCH-20251115-C9D1                     ║
║     Added: 20 units | Current: 20 | Sold: 0             ║
║     Difference: -10 from previous batch                  ║
║     Received: Nov 15, 2025                               ║
╚═══════════════════════════════════════════════════════════╝
```

## Key Benefits

### 1. Clear Visual Distinction
- **🆕 ORIGINAL** - Initial product stock
- **📦 RESTOCK** - Restocked inventory
- Each batch has a unique batch code
- Easy to identify at a glance

### 2. Complete Historical Tracking
```sql
-- Original stock
SELECT * FROM stockRecords WHERE isRestock = false

-- All restocks
SELECT * FROM stockRecords WHERE isRestock = true

-- Stock history for product
SELECT * FROM stockRecords WHERE productId = 'prod_123' ORDER BY createdAt
```

### 3. Quantity Comparison
Each restock shows:
- **Quantity Added**: How much was restocked
- **Remaining Qty**: How much is left
- **Used Qty**: How much was sold/damaged
- **Difference**: Comparison with previous batch

### 4. Independent Lifecycle
Each stock record tracks its own:
- Expiry date (for fish)
- Quality grade
- Sales history
- Damage tracking
- Reserve status

## API Functions

### Query Functions

#### `getStockHistoryByProduct(productId)`
Returns detailed history with separation between original and restocks:
```typescript
{
  product: { name, sku, currentStock, batchCode },
  summary: {
    totalOriginalQty: 50,
    totalRestockedQty: 50,
    totalCurrentQty: 100,
    originalRecords: 1,
    restockRecords: 2
  },
  originalStock: [...],
  restocks: [...],
  allRecords: [...]
}
```

#### `getStockComparison(productId)`
Returns batch comparison with quantity differences:
```typescript
{
  productInfo: { name, sku, totalStock },
  batches: [
    {
      batchNumber: 1,
      type: "🆕 ORIGINAL",
      batchCode: "BATCH-20251114-A3F9",
      quantityAdded: 50,
      quantityDifference: 0
    },
    {
      batchNumber: 2,
      type: "📦 RESTOCK",
      batchCode: "BATCH-20251114-B7E2",
      quantityAdded: 30,
      quantityDifference: -20  // 30 less than previous
    }
  ]
}
```

### Mutation Functions

#### `restockProduct(productId, quantity, notes?)`
Creates new stock record for restock:
```typescript
await restockProduct({
  productId: "prod_123",
  quantity: 30,
  notes: "Admin restock - Added 30 units"
});

// Returns:
{
  success: true,
  stockRecordId: "stock_2",
  batchCode: "BATCH-20251114-B7E2",
  quantity: 30,
  message: "Successfully restocked 30 units",
  newTotalStock: 80
}
```

## Common Queries

### Get Total Original vs Restocked
```typescript
const history = await getStockHistoryByProduct(productId);
console.log(`Original: ${history.summary.totalOriginalQty}`);
console.log(`Restocked: ${history.summary.totalRestockedQty}`);
```

### Get All Restock Records
```typescript
const records = await getStockRecordsByProduct(productId);
const restocks = records.filter(r => r.isRestock);
```

### Compare Batch Quantities
```typescript
const comparison = await getStockComparison(productId);
comparison.batches.forEach(batch => {
  console.log(`${batch.type}: ${batch.quantityAdded} units`);
  if (batch.quantityDifference !== 0) {
    console.log(`  Difference: ${batch.quantityDifference}`);
  }
});
```

## Best Practices

1. **Always use `restockProduct()` for restocking** - Don't manually create stock records
2. **Track expiry dates** - Especially for fish products
3. **Use quality grades** - Differentiate premium/standard/budget batches
4. **Add meaningful notes** - Document why the restock happened
5. **Monitor batch differences** - Use `getStockComparison()` to track patterns

## Example Usage in UI

```typescript
// In admin products page
const handleRestock = async () => {
  const result = await restockProduct({
    productId: product._id,
    quantity: 30,
    notes: "Supplier delivery - Premium quality"
  });
  
  alert(`
    Successfully restocked!
    Batch Code: ${result.batchCode}
    Total Stock: ${result.newTotalStock} units
  `);
};

// In inventory page
const history = await getStockHistoryByProduct(productId);

// Display summary
<div>
  <h3>Stock Summary</h3>
  <p>Original: {history.summary.totalOriginalQty}</p>
  <p>Restocked: {history.summary.totalRestockedQty}</p>
  <p>Current: {history.summary.totalCurrentQty}</p>
</div>

// Display batches
{history.allRecords.map(record => (
  <div key={record._id}>
    <span>{record.type}</span>
    <span>Batch: {record.batchCode}</span>
    <span>Added: {record.quantityAdded}</span>
    <span>Remaining: {record.remainingQty}</span>
  </div>
))}
```

## Migration Notes

If you had existing stock records before this system:
- Old records have `isRestock: undefined` (treated as false)
- They are considered "ORIGINAL" stock
- New restocks will have `isRestock: true`
- The system is backward compatible

## Conclusion

This system provides:
- ✅ Clear distinction between original and restocked inventory
- ✅ Complete historical tracking with batch codes
- ✅ Easy comparison of quantities between batches
- ✅ Independent lifecycle management for each batch
- ✅ Scalable architecture for complex inventory needs
