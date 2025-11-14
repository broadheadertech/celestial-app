# Stock Management System - Comprehensive Inventory Tracking

## Overview
A robust dual-table system for tracking inventory with detailed batch-level management and complete audit trails.

**Date**: November 14, 2025
**Status**: ✅ Schema Implemented

---

## 📊 System Architecture

### Two-Table Design

```
┌─────────────┐         ┌─────────────────┐
│  Products   │ 1:N    │  StockRecords   │
│             ├────────►│                 │
│  batchCode  │         │  batchCode      │
└─────────────┘         └────────┬────────┘
                                  │ 1:N
                        ┌─────────▼────────┐
                        │ StockMovements   │
                        │                  │
                        │  Audit Trail     │
                        └──────────────────┘
```

---

## 📦 Table 1: stockRecords

### Purpose
Track detailed inventory information for each batch of products received.

### Schema

```typescript
stockRecords: {
  // Core References
  productId: Id<"products">,
  batchCode: string,
  
  // Quantity Tracking (Advanced)
  initialQty: number,      // Original quantity received
  currentQty: number,      // Available now
  reservedQty: number,     // Reserved for customers
  soldQty: number,         // Already sold
  damagedQty: number,      // Defective/damaged
  returnedQty: number,     // Customer returns
  
  // Pricing
  costPrice?: number,      // What you paid
  sellingPrice: number,    // What you sell for
  
  // Source Information
  supplier?: string,
  purchaseOrderNumber?: string,
  invoiceNumber?: string,
  
  // Location
  warehouseLocation?: string,
  tankNumber?: string,
  
  // Dates
  receivedDate: number,
  manufactureDate?: number,
  expiryDate?: number,
  
  // Status
  status: "active" | "depleted" | "expired" | "quarantine" | "reserved" | "damaged",
  qualityGrade?: "premium" | "standard" | "budget",
  
  // Audit
  notes?: string,
  lastModifiedBy?: Id<"users">,
  createdAt: number,
  updatedAt: number,
}
```

### Indexes
```typescript
.index("by_product", ["productId"])
.index("by_batch_code", ["batchCode"])
.index("by_status", ["status"])
.index("by_product_and_status", ["productId", "status"])
.index("by_expiry_date", ["expiryDate"])
.index("by_received_date", ["receivedDate"])
```

---

## 📈 Table 2: stockMovements

### Purpose
Complete audit trail of all stock quantity changes over time.

### Schema

```typescript
stockMovements: {
  // References
  stockRecordId: Id<"stockRecords">,
  productId: Id<"products">,
  batchCode: string,
  
  // Movement Type
  movementType: 
    | "purchase"      // New stock received
    | "sale"          // Stock sold
    | "reservation"   // Stock reserved
    | "return"        // Customer return
    | "damage"        // Marked as damaged
    | "adjustment"    // Manual correction
    | "transfer"      // Location transfer
    | "expiry",       // Expired removal
  
  // Quantity Changes
  quantityBefore: number,
  quantityChange: number,  // +/- value
  quantityAfter: number,
  
  // Reference Links
  referenceType?: string,  // "order", "reservation", "manual"
  referenceId?: string,    // ID of related record
  
  // User Tracking
  performedBy?: Id<"users">,
  reason?: string,
  notes?: string,
  
  // Audit
  createdAt: number,
}
```

### Indexes
```typescript
.index("by_stock_record", ["stockRecordId"])
.index("by_product", ["productId"])
.index("by_batch_code", ["batchCode"])
.index("by_movement_type", ["movementType"])
.index("by_created", ["createdAt"])
```

---

## 🎯 Key Features & Benefits

### 1. **Batch-Level Tracking**
```
Product: Goldfish
  ├─ Batch: BATCH-20251114-A3F9 (100 fish, Supplier A)
  ├─ Batch: BATCH-20251115-K2M5 (50 fish, Supplier B)
  └─ Batch: BATCH-20251120-P9W1 (75 fish, Supplier A)
```

**Benefits**:
- Track quality per supplier
- FIFO/LIFO inventory rotation
- Identify problematic batches
- Expiry date management

---

### 2. **Advanced Quantity Tracking**

Instead of just "stock", you track:

```
Stock Record: BATCH-20251114-A3F9
├─ Initial Qty: 100      (Received)
├─ Current Qty: 65       (Available to sell)
├─ Reserved Qty: 10      (Customer reservations)
├─ Sold Qty: 20          (Already sold)
├─ Damaged Qty: 3        (Defective)
└─ Returned Qty: 2       (Customer returns)

Formula: initialQty = currentQty + reservedQty + soldQty + damagedQty - returnedQty
```

**Benefits**:
- Accurate availability calculation
- Track losses and damages
- Handle customer returns properly
- Prevent overselling

---

### 3. **Cost & Profit Tracking**

```typescript
{
  costPrice: 50,      // Bought for ₱50
  sellingPrice: 120,  // Selling for ₱120
  profit: 70,         // ₱70 per unit
  margin: 58.3%       // Profit margin
}
```

**Benefits**:
- Calculate profit margins per batch
- Compare supplier pricing
- Identify most profitable batches
- Track inventory valuation

---

### 4. **Source Tracking**

```typescript
{
  supplier: "Aquatic Farms Inc",
  purchaseOrderNumber: "PO-2025-001",
  invoiceNumber: "INV-12345",
  receivedDate: 1731542400000
}
```

**Benefits**:
- Supplier quality analysis
- Easy reordering
- Financial reconciliation
- Dispute resolution

---

### 5. **Location Management**

```typescript
{
  warehouseLocation: "Warehouse A, Section 3",
  tankNumber: "TANK-A12"
}
```

**Benefits**:
- Find stock quickly
- Organize inventory
- Multi-location support
- Tank-specific tracking for fish

---

### 6. **Expiry Management**

```typescript
{
  receivedDate: 1731542400000,      // Nov 14, 2025
  manufactureDate: 1731456000000,   // Nov 13, 2025 (breeding date)
  expiryDate: 1794614400000,        // Nov 14, 2027 (2 years)
  status: "active"
}
```

**Benefits**:
- FIFO rotation (sell oldest first)
- Expiry alerts
- Automatic status updates
- Reduce waste

---

### 7. **Quality Grading**

```typescript
{
  qualityGrade: "premium" | "standard" | "budget"
}
```

**Benefits**:
- Price differentiation
- Customer segmentation
- Quality-based inventory
- Marketing strategies

---

### 8. **Complete Audit Trail** (stockMovements)

Every change is logged:

```
Stock Record: BATCH-20251114-A3F9
Movement History:
├─ Nov 14, 10:00 AM - Purchase: +100 (Received from supplier)
├─ Nov 15, 2:30 PM  - Reservation: -10 (Reserved for Order #123)
├─ Nov 15, 4:00 PM  - Sale: -5 (Sold to Walk-in customer)
├─ Nov 16, 9:00 AM  - Damage: -3 (Found 3 dead fish)
├─ Nov 17, 11:30 AM - Return: +2 (Customer returned 2)
└─ Nov 18, 3:00 PM  - Sale: -15 (Sold to Order #124)
```

**Benefits**:
- Full traceability
- Accountability
- Fraud prevention
- Historical analysis

---

## 💡 Use Cases

### Use Case 1: Receiving New Stock

```typescript
// Create stock record
{
  productId: "goldfish_product_id",
  batchCode: "BATCH-20251114-A3F9",
  initialQty: 100,
  currentQty: 100,
  reservedQty: 0,
  soldQty: 0,
  damagedQty: 0,
  returnedQty: 0,
  costPrice: 50,
  sellingPrice: 120,
  supplier: "Aquatic Farms Inc",
  purchaseOrderNumber: "PO-2025-001",
  receivedDate: Date.now(),
  status: "active"
}

// Log movement
{
  movementType: "purchase",
  quantityBefore: 0,
  quantityChange: +100,
  quantityAfter: 100,
  performedBy: admin_user_id,
  notes: "New shipment received"
}
```

---

### Use Case 2: Customer Reservation

```typescript
// Update stock record
{
  currentQty: 90,        // Was 100, now 90
  reservedQty: 10,       // Was 0, now 10
}

// Log movement
{
  movementType: "reservation",
  quantityBefore: 100,
  quantityChange: -10,
  quantityAfter: 90,
  referenceType: "reservation",
  referenceId: "reservation_123",
  performedBy: customer_id
}
```

---

### Use Case 3: Sale Completion

```typescript
// Update stock record
{
  reservedQty: 0,        // Was 10, now 0 (unreserved)
  soldQty: 10,           // Was 0, now 10
}

// Log movement
{
  movementType: "sale",
  quantityBefore: 90,
  quantityChange: 0,     // No change to available (was reserved)
  quantityAfter: 90,
  referenceType: "order",
  referenceId: "order_456",
  performedBy: customer_id
}
```

---

### Use Case 4: Damaged Stock

```typescript
// Update stock record
{
  currentQty: 87,        // Was 90, now 87
  damagedQty: 3,         // Was 0, now 3
}

// Log movement
{
  movementType: "damage",
  quantityBefore: 90,
  quantityChange: -3,
  quantityAfter: 87,
  reason: "Found 3 dead fish during routine check",
  performedBy: admin_user_id
}
```

---

### Use Case 5: Customer Return

```typescript
// Update stock record
{
  currentQty: 89,        // Was 87, now 89
  returnedQty: 2,        // Was 0, now 2
}

// Log movement
{
  movementType: "return",
  quantityBefore: 87,
  quantityChange: +2,
  quantityAfter: 89,
  referenceType: "order",
  referenceId: "order_456",
  reason: "Customer returned 2 fish - not satisfied with health",
  performedBy: admin_user_id
}
```

---

### Use Case 6: Expiry Check (Automated)

```typescript
// Check for expired batches daily
const expiredBatches = await db.query("stockRecords")
  .withIndex("by_expiry_date")
  .filter(q => 
    q.and(
      q.lt(q.field("expiryDate"), Date.now()),
      q.eq(q.field("status"), "active")
    )
  )
  .collect();

// Update status
for (const batch of expiredBatches) {
  await db.patch(batch._id, { 
    status: "expired",
    updatedAt: Date.now()
  });
  
  // Log movement
  await db.insert("stockMovements", {
    movementType: "expiry",
    quantityBefore: batch.currentQty,
    quantityChange: -batch.currentQty,
    quantityAfter: 0,
    notes: "Automatically marked as expired"
  });
}
```

---

## 📊 Analytics & Reports

### 1. Stock Valuation Report
```typescript
// Calculate total inventory value
const stockRecords = await db.query("stockRecords")
  .withIndex("by_status", q => q.eq("status", "active"))
  .collect();

const totalValue = stockRecords.reduce((sum, record) => {
  return sum + (record.currentQty * record.costPrice);
}, 0);

const potentialRevenue = stockRecords.reduce((sum, record) => {
  return sum + (record.currentQty * record.sellingPrice);
}, 0);

const potentialProfit = potentialRevenue - totalValue;
```

---

### 2. Supplier Performance
```typescript
// Compare suppliers
const supplierStats = await Promise.all(
  suppliers.map(async (supplier) => {
    const batches = await db.query("stockRecords")
      .filter(q => q.eq(q.field("supplier"), supplier))
      .collect();
    
    const totalReceived = batches.reduce((sum, b) => sum + b.initialQty, 0);
    const totalDamaged = batches.reduce((sum, b) => sum + b.damagedQty, 0);
    const damageRate = (totalDamaged / totalReceived) * 100;
    
    return {
      supplier,
      totalReceived,
      totalDamaged,
      damageRate,
      batches: batches.length
    };
  })
);
```

---

### 3. Slow-Moving Stock
```typescript
// Find batches not selling
const slowMoving = await db.query("stockRecords")
  .withIndex("by_received_date")
  .filter(q => q.and(
    q.eq(q.field("status"), "active"),
    q.lt(q.field("receivedDate"), Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days old
  ))
  .collect();
```

---

### 4. Profit Analysis
```typescript
// Calculate profit per batch
const profitableList = stockRecords.map(record => ({
  batchCode: record.batchCode,
  unitProfit: record.sellingPrice - record.costPrice,
  totalProfit: (record.sellingPrice - record.costPrice) * record.soldQty,
  marginPercent: ((record.sellingPrice - record.costPrice) / record.costPrice) * 100
})).sort((a, b) => b.totalProfit - a.totalProfit);
```

---

## 🔧 Integration with Existing System

### Auto-Create Stock Record on Product Creation

```typescript
// In createProduct mutation
const batchCode = generateBatchCode();
const productId = await db.insert("products", {
  // ... product data
  batchCode: batchCode
});

// Create initial stock record
await db.insert("stockRecords", {
  productId: productId,
  batchCode: batchCode,
  initialQty: stock,
  currentQty: stock,
  reservedQty: 0,
  soldQty: 0,
  damagedQty: 0,
  returnedQty: 0,
  sellingPrice: price,
  receivedDate: Date.now(),
  status: "active",
  createdAt: Date.now(),
  updatedAt: Date.now()
});

// Log initial movement
await db.insert("stockMovements", {
  stockRecordId: stockRecord._id,
  productId: productId,
  batchCode: batchCode,
  movementType: "purchase",
  quantityBefore: 0,
  quantityChange: stock,
  quantityAfter: stock,
  performedBy: userId,
  notes: "Initial stock from product creation",
  createdAt: Date.now()
});
```

---

### Update Stock on Reservation

```typescript
// Find active stock record with available quantity
const stockRecord = await db.query("stockRecords")
  .withIndex("by_product_and_status", q => 
    q.eq("productId", productId).eq("status", "active")
  )
  .filter(q => q.gt(q.field("currentQty"), 0))
  .first();

// Reserve quantity
await db.patch(stockRecord._id, {
  currentQty: stockRecord.currentQty - quantity,
  reservedQty: stockRecord.reservedQty + quantity,
  updatedAt: Date.now()
});

// Log movement
await db.insert("stockMovements", {
  stockRecordId: stockRecord._id,
  movementType: "reservation",
  quantityBefore: stockRecord.currentQty,
  quantityChange: -quantity,
  quantityAfter: stockRecord.currentQty - quantity,
  referenceType: "reservation",
  referenceId: reservationId,
  performedBy: userId,
  createdAt: Date.now()
});
```

---

## 🎨 Frontend Components (Recommended)

### 1. Stock Records List View
- Display all batches for a product
- Show available, reserved, sold quantities
- Color-coded status indicators
- Quick actions (edit, view history)

### 2. Stock Movement Timeline
- Visual timeline of all movements
- Filter by movement type
- Export to CSV for auditing

### 3. Low Stock Alerts Dashboard
- Products below threshold
- Expiring soon warnings
- Reorder recommendations

### 4. Stock Adjustment Form
- Manual quantity adjustments
- Reason selection
- Notes field
- Admin approval workflow

---

## ✅ Advantages of This System

| Feature | Traditional Stock | This System |
|---------|------------------|-------------|
| **Batch Tracking** | ❌ No | ✅ Yes, per batch |
| **Cost Tracking** | ❌ Average only | ✅ Per batch |
| **Audit Trail** | ❌ Limited | ✅ Complete history |
| **Damage Tracking** | ❌ Manual notes | ✅ Automated |
| **Returns** | ❌ Complicated | ✅ Easy |
| **Expiry Management** | ❌ Manual | ✅ Automated |
| **Location Tracking** | ❌ No | ✅ Yes |
| **Supplier Analysis** | ❌ Difficult | ✅ Easy |
| **Profit Analysis** | ❌ Estimates | ✅ Accurate |
| **FIFO/LIFO** | ❌ Hard | ✅ Simple queries |

---

## 📝 Next Steps

1. **✅ Schema Created** - Tables defined in database
2. **⏳ Create Service Functions** - CRUD operations for stock records
3. **⏳ Integration** - Connect with product creation/sales
4. **⏳ Frontend UI** - Admin interface for stock management
5. **⏳ Automation** - Auto-create records, expiry checks
6. **⏳ Reports** - Analytics dashboards

---

## Summary

This stock management system provides:

✅ **Batch-level tracking** for quality control
✅ **Advanced quantity management** (available, reserved, sold, damaged, returned)
✅ **Cost & profit tracking** per batch
✅ **Complete audit trail** of all changes
✅ **Expiry management** for perishable items
✅ **Location tracking** for multi-warehouse
✅ **Supplier analysis** capabilities
✅ **Automated workflows** and alerts

**This is an enterprise-grade inventory system suitable for scaling your aquatics business!** 🎉
