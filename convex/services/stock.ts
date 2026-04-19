import { v } from "convex/values";
import { mutation, query, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { createRestockExpenseHelper } from "./finance";

// ==================== HELPER FUNCTIONS (callable from other mutations) ====================

/**
 * Get active batches for a product, sorted FIFO (oldest first).
 * Excludes mortality records and depleted batches.
 */
async function getActiveBatchesFIFO(ctx: MutationCtx, productId: Id<"products">) {
  const batches = await ctx.db
    .query("stockRecords")
    .withIndex("by_product_and_status", (q) =>
      q.eq("productId", productId).eq("status", "active")
    )
    .collect();

  // FIFO: oldest first, exclude mortality records
  return batches
    .filter(b => !b.isMortalityLoss)
    .sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Reserve stock using FIFO — reserves from oldest batch first, spanning
 * multiple batches if needed. Logs a stockMovement per batch affected.
 */
export async function reserveStockHelper(
  ctx: MutationCtx,
  args: { productId: Id<"products">; quantity: number }
) {
  const { productId, quantity } = args;
  if (quantity <= 0) return null;

  const batches = await getActiveBatchesFIFO(ctx, productId);
  if (batches.length === 0) return null;

  const now = Date.now();
  let remaining = quantity;
  const affected: { stockRecordId: Id<"stockRecords">; batchCode: string; qty: number }[] = [];

  for (const batch of batches) {
    if (remaining <= 0) break;
    const available = batch.currentQty - batch.reservedQty;
    if (available <= 0) continue;

    const takeFromBatch = Math.min(remaining, available);
    const newReservedQty = batch.reservedQty + takeFromBatch;

    await ctx.db.patch(batch._id, {
      reservedQty: newReservedQty,
      updatedAt: now,
    });

    await ctx.db.insert("stockMovements", {
      stockRecordId: batch._id,
      productId,
      batchCode: batch.batchCode,
      movementType: "reservation",
      quantityBefore: batch.reservedQty,
      quantityChange: takeFromBatch,
      quantityAfter: newReservedQty,
      createdAt: now,
    });

    affected.push({ stockRecordId: batch._id, batchCode: batch.batchCode, qty: takeFromBatch });
    remaining -= takeFromBatch;
  }

  return affected.length > 0 ? affected : null;
}

/**
 * Release reserved stock — releases from batches with reservedQty > 0,
 * newest first (LIFO on reserved), spanning multiple batches if needed.
 */
export async function releaseReservedStockHelper(
  ctx: MutationCtx,
  args: { productId: Id<"products">; quantity: number }
) {
  const { productId, quantity } = args;
  if (quantity <= 0) return;

  const batches = await ctx.db
    .query("stockRecords")
    .withIndex("by_product", (q) => q.eq("productId", productId))
    .collect();

  // Release from batches with reserved qty, newest first
  const reservedBatches = batches
    .filter(b => b.reservedQty > 0 && !b.isMortalityLoss)
    .sort((a, b) => b.createdAt - a.createdAt);

  if (reservedBatches.length === 0) return;

  const now = Date.now();
  let remaining = quantity;

  for (const batch of reservedBatches) {
    if (remaining <= 0) break;
    const releaseAmount = Math.min(remaining, batch.reservedQty);
    const newReservedQty = batch.reservedQty - releaseAmount;

    await ctx.db.patch(batch._id, {
      reservedQty: newReservedQty,
      updatedAt: now,
    });

    await ctx.db.insert("stockMovements", {
      stockRecordId: batch._id,
      productId,
      batchCode: batch.batchCode,
      movementType: "adjustment",
      quantityBefore: batch.reservedQty,
      quantityChange: -releaseAmount,
      quantityAfter: newReservedQty,
      createdAt: now,
    });

    remaining -= releaseAmount;
  }
}

/**
 * Record a sale using FIFO — deducts from oldest batch first, spanning
 * multiple batches if needed. Increments soldQty per batch.
 */
export async function recordSaleHelper(
  ctx: MutationCtx,
  args: { productId: Id<"products">; quantity: number }
) {
  const { productId, quantity } = args;
  if (quantity <= 0) return;

  const batches = await getActiveBatchesFIFO(ctx, productId);
  if (batches.length === 0) return;

  const now = Date.now();
  let remaining = quantity;

  for (const batch of batches) {
    if (remaining <= 0) break;
    if (batch.currentQty <= 0) continue;

    const takeFromBatch = Math.min(remaining, batch.currentQty);
    const newCurrentQty = batch.currentQty - takeFromBatch;
    const newSoldQty = batch.soldQty + takeFromBatch;
    // Decrease reservedQty if applicable
    const reservedDecrease = Math.min(batch.reservedQty, takeFromBatch);
    const newReservedQty = batch.reservedQty - reservedDecrease;
    const newStatus = newCurrentQty === 0 ? "depleted" as const : batch.status;

    await ctx.db.patch(batch._id, {
      currentQty: newCurrentQty,
      soldQty: newSoldQty,
      reservedQty: newReservedQty,
      status: newStatus,
      updatedAt: now,
    });

    await ctx.db.insert("stockMovements", {
      stockRecordId: batch._id,
      productId,
      batchCode: batch.batchCode,
      movementType: "sale",
      quantityBefore: batch.currentQty,
      quantityChange: -takeFromBatch,
      quantityAfter: newCurrentQty,
      createdAt: now,
    });

    remaining -= takeFromBatch;
  }
}

/**
 * Restore stock when an order/reservation is cancelled — adds back to the
 * newest batch (so cancellations flow to the most recent inventory).
 * Reactivates depleted batches if needed.
 */
export async function restoreStockHelper(
  ctx: MutationCtx,
  args: { productId: Id<"products">; quantity: number }
) {
  const { productId, quantity } = args;
  if (quantity <= 0) return;

  const batches = await ctx.db
    .query("stockRecords")
    .withIndex("by_product", (q) => q.eq("productId", productId))
    .collect();

  // Prefer newest active batch; if none, reactivate newest depleted batch
  const activeBatches = batches.filter(b => b.status === "active" && !b.isMortalityLoss);
  const depletedBatches = batches.filter(b => b.status === "depleted" && !b.isMortalityLoss);

  const batch = activeBatches.sort((a, b) => b.createdAt - a.createdAt)[0]
    || depletedBatches.sort((a, b) => b.createdAt - a.createdAt)[0];

  if (!batch) return;

  const now = Date.now();
  const newCurrentQty = batch.currentQty + quantity;
  const newStatus = batch.status === "depleted" ? "active" as const : batch.status;

  await ctx.db.patch(batch._id, {
    currentQty: newCurrentQty,
    status: newStatus,
    updatedAt: now,
  });

  await ctx.db.insert("stockMovements", {
    stockRecordId: batch._id,
    productId,
    batchCode: batch.batchCode,
    movementType: "return",
    quantityBefore: batch.currentQty,
    quantityChange: quantity,
    quantityAfter: newCurrentQty,
    createdAt: now,
  });
}

// ==================== STOCK RECORDS QUERIES ====================

// Get all stock records with optional filters
export const getStockRecords = query({
  args: {
    category: v.optional(v.union(v.literal("fish"), v.literal("tank"), v.literal("accessory"))),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("depleted"),
      v.literal("expired"),
      v.literal("quarantine"),
      v.literal("reserved"),
      v.literal("damaged")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { category, status, limit }) => {
    let stockRecords;

    if (category && status) {
      stockRecords = await ctx.db
        .query("stockRecords")
        .withIndex("by_category_and_status", (q) => 
          q.eq("category", category).eq("status", status)
        )
        .collect();
    } else if (category) {
      stockRecords = await ctx.db
        .query("stockRecords")
        .withIndex("by_category", (q) => q.eq("category", category))
        .collect();
    } else if (status) {
      stockRecords = await ctx.db
        .query("stockRecords")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    } else {
      stockRecords = await ctx.db.query("stockRecords").collect();
    }

    // Enrich with product details
    const enrichedRecords = await Promise.all(
      stockRecords.map(async (record) => {
        const product = await ctx.db.get(record.productId);
        return {
          ...record,
          productName: product?.name,
          productImage: product?.image,
          productPrice: product?.price,
        };
      })
    );

    if (limit) {
      return enrichedRecords.slice(0, limit);
    }

    return enrichedRecords;
  },
});

// Get stock record by ID
export const getStockRecord = query({
  args: {
    stockRecordId: v.id("stockRecords"),
  },
  handler: async (ctx, { stockRecordId }) => {
    const stockRecord = await ctx.db.get(stockRecordId);
    
    if (!stockRecord) {
      throw new Error("Stock record not found");
    }

    // Get product details
    const product = await ctx.db.get(stockRecord.productId);

    // Get stock movements for this record
    const movements = await ctx.db
      .query("stockMovements")
      .withIndex("by_stock_record", (q) => q.eq("stockRecordId", stockRecordId))
      .order("desc")
      .take(10);

    return {
      ...stockRecord,
      product,
      recentMovements: movements,
    };
  },
});

// Get stock records by product ID
export const getStockRecordsByProduct = query({
  args: {
    productId: v.id("products"),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("depleted"),
      v.literal("expired"),
      v.literal("quarantine"),
      v.literal("reserved"),
      v.literal("damaged")
    )),
  },
  handler: async (ctx, { productId, status }) => {
    let stockRecords;

    if (status) {
      stockRecords = await ctx.db
        .query("stockRecords")
        .withIndex("by_product_and_status", (q) => 
          q.eq("productId", productId).eq("status", status)
        )
        .collect();
    } else {
      stockRecords = await ctx.db
        .query("stockRecords")
        .withIndex("by_product", (q) => q.eq("productId", productId))
        .collect();
    }

    return stockRecords;
  },
});

// Get stock records history with clear distinction between original and restocks
export const getStockHistoryByProduct = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, { productId }) => {
    // Get product details
    const product = await ctx.db.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Get all stock records for this product
    const allStockRecords = await ctx.db
      .query("stockRecords")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();

    // Sort by creation date (oldest first)
    const sortedRecords = allStockRecords.sort((a, b) => a.createdAt - b.createdAt);

    // Separate original stock from restocks
    const originalStock = sortedRecords.filter(record => !record.isRestock);
    const restocks = sortedRecords.filter(record => record.isRestock);

    // Calculate totals
    const totalOriginalQty = originalStock.reduce((sum, record) => sum + record.initialQty, 0);
    const totalRestockedQty = restocks.reduce((sum, record) => sum + record.initialQty, 0);
    const totalCurrentQty = sortedRecords.reduce((sum, record) => sum + record.currentQty, 0);
    const totalSoldQty = sortedRecords.reduce((sum, record) => sum + record.soldQty, 0);

    return {
      product: {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        currentStock: product.stock,
        categoryId: product.categoryId,
        tankNumber: product.tankNumber,
        batchCode: product.batchCode, // Original batch code
      },
      summary: {
        totalOriginalQty,
        totalRestockedQty,
        totalCurrentQty,
        totalSoldQty,
        totalRecords: sortedRecords.length,
        originalRecords: originalStock.length,
        restockRecords: restocks.length,
      },
      originalStock: originalStock.map(record => ({
        ...record,
        type: 'ORIGINAL' as const,
        quantityAdded: record.initialQty,
        remainingQty: record.currentQty,
        usedQty: record.soldQty + record.mortalityLossQty,
      })),
      restocks: restocks.map(record => ({
        ...record,
        type: 'RESTOCK' as const,
        quantityAdded: record.initialQty,
        remainingQty: record.currentQty,
        usedQty: record.soldQty + record.mortalityLossQty,
      })),
      allRecords: sortedRecords.map(record => ({
        ...record,
        type: record.isRestock ? 'RESTOCK' as const : 'ORIGINAL' as const,
        quantityAdded: record.initialQty,
        remainingQty: record.currentQty,
        usedQty: record.soldQty + record.mortalityLossQty,
      })),
    };
  },
});

// Get stock comparison - shows difference between batches
export const getStockComparison = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, { productId }) => {
    const history = await ctx.db
      .query("stockRecords")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();

    const product = await ctx.db.get(productId);
    
    // Sort by creation date
    const sorted = history.sort((a, b) => a.createdAt - b.createdAt);

    return {
      productInfo: {
        name: product?.name,
        sku: product?.sku,
        totalStock: product?.stock,
      },
      batches: sorted.map((record, index) => ({
        batchNumber: index + 1,
        batchCode: record.batchCode,
        type: record.isRestock ? '📦 RESTOCK' : '🆕 ORIGINAL',
        isRestock: record.isRestock || false,
        quantityAdded: record.initialQty,
        currentQty: record.currentQty,
        soldQty: record.soldQty,
        mortalityLossQty: record.mortalityLossQty,
        status: record.status,
        receivedDate: record.receivedDate,
        notes: record.notes,
        // Show difference from previous batch
        quantityDifference: index > 0 ? record.initialQty - sorted[index - 1].initialQty : 0,
      })),
    };
  },
});

// Get stock record by batch code
export const getStockRecordByBatchCode = query({
  args: {
    batchCode: v.string(),
  },
  handler: async (ctx, { batchCode }) => {
    const stockRecord = await ctx.db
      .query("stockRecords")
      .withIndex("by_batch_code", (q) => q.eq("batchCode", batchCode))
      .first();

    if (!stockRecord) {
      throw new Error("Stock record not found for batch code: " + batchCode);
    }

    const product = await ctx.db.get(stockRecord.productId);

    return {
      ...stockRecord,
      product,
    };
  },
});

// Get low stock alerts (currentQty <= threshold)
export const getLowStockAlerts = query({
  args: {
    threshold: v.optional(v.number()), // Default threshold: 10
    category: v.optional(v.union(v.literal("fish"), v.literal("tank"), v.literal("accessory"))),
  },
  handler: async (ctx, { threshold = 10, category }) => {
    let stockRecords;

    if (category) {
      stockRecords = await ctx.db
        .query("stockRecords")
        .withIndex("by_category_and_status", (q) => 
          q.eq("category", category).eq("status", "active")
        )
        .collect();
    } else {
      stockRecords = await ctx.db
        .query("stockRecords")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .collect();
    }

    // Filter by threshold
    const lowStockRecords = stockRecords.filter(
      (record) => record.currentQty <= threshold && record.currentQty > 0
    );

    // Enrich with product details
    const enrichedRecords = await Promise.all(
      lowStockRecords.map(async (record) => {
        const product = await ctx.db.get(record.productId);
        return {
          ...record,
          productName: product?.name,
          productImage: product?.image,
          productSku: product?.sku,
        };
      })
    );

    return enrichedRecords.sort((a, b) => a.currentQty - b.currentQty);
  },
});

// Get expiring stock (expiryDate within next N days)
export const getExpiringStock = query({
  args: {
    daysAhead: v.optional(v.number()), // Default: 30 days
  },
  handler: async (ctx, { daysAhead = 30 }) => {
    const now = Date.now();
    const futureDate = now + (daysAhead * 24 * 60 * 60 * 1000);

    const allStockRecords = await ctx.db
      .query("stockRecords")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Filter records with expiry date in the future range
    const expiringRecords = allStockRecords.filter(
      (record) => 
        record.expiryDate && 
        record.expiryDate > now && 
        record.expiryDate <= futureDate
    );

    // Enrich with product details
    const enrichedRecords = await Promise.all(
      expiringRecords.map(async (record) => {
        const product = await ctx.db.get(record.productId);
        const daysUntilExpiry = Math.floor((record.expiryDate! - now) / (24 * 60 * 60 * 1000));
        
        return {
          ...record,
          productName: product?.name,
          productImage: product?.image,
          daysUntilExpiry,
        };
      })
    );

    return enrichedRecords.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  },
});

// ==================== STOCK MOVEMENTS QUERIES ====================

// Get all stock movements with filters
export const getStockMovements = query({
  args: {
    productId: v.optional(v.id("products")),
    batchCode: v.optional(v.string()),
    movementType: v.optional(v.union(
      v.literal("initial"),
      v.literal("purchase"),
      v.literal("sale"),
      v.literal("reservation"),
      v.literal("return"),
      v.literal("damage"),
      v.literal("restock"),
      v.literal("adjustment"),
      v.literal("transfer"),
      v.literal("expiry")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { productId, batchCode, movementType, limit = 50 }) => {
    let movements;

    if (productId) {
      movements = await ctx.db
        .query("stockMovements")
        .withIndex("by_product", (q) => q.eq("productId", productId))
        .order("desc")
        .take(limit);
    } else if (batchCode) {
      movements = await ctx.db
        .query("stockMovements")
        .withIndex("by_batch_code", (q) => q.eq("batchCode", batchCode))
        .order("desc")
        .take(limit);
    } else if (movementType) {
      movements = await ctx.db
        .query("stockMovements")
        .withIndex("by_movement_type", (q) => q.eq("movementType", movementType))
        .order("desc")
        .take(limit);
    } else {
      movements = await ctx.db
        .query("stockMovements")
        .order("desc")
        .take(limit);
    }

    // Enrich with product and stock record details
    const enrichedMovements = await Promise.all(
      movements.map(async (movement) => {
        const product = await ctx.db.get(movement.productId);
        const stockRecord = await ctx.db.get(movement.stockRecordId);
        
        return {
          ...movement,
          productName: product?.name,
          productSku: product?.sku,
          stockRecordStatus: stockRecord?.status,
        };
      })
    );

    return enrichedMovements;
  },
});

// Get stock movements by stock record ID
export const getStockMovementsByRecord = query({
  args: {
    stockRecordId: v.id("stockRecords"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { stockRecordId, limit = 50 }) => {
    const movements = await ctx.db
      .query("stockMovements")
      .withIndex("by_stock_record", (q) => q.eq("stockRecordId", stockRecordId))
      .order("desc")
      .take(limit);

    return movements;
  },
});

// ==================== STOCK MUTATIONS ====================

// Restock Product - Creates a new stock record for restock action (1-to-many relationship)
export const restockProduct = mutation({
  args: {
    productId: v.id("products"),
    quantity: v.number(),
    notes: v.optional(v.string()),
    qualityGrade: v.optional(v.union(v.literal("premium"), v.literal("standard"), v.literal("budget"))),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { productId, quantity, notes, qualityGrade, userId }) => {
    if (quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    // Get product details
    const product = await ctx.db.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Get category to determine stock category
    const category = await ctx.db.get(product.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    const now = Date.now();

    // Generate new batch code for this restock
    const generateBatchCode = () => {
      const date = new Date(now);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      return `BATCH-${year}${month}${day}-${random}`;
    };

    const batchCode = generateBatchCode();

    // Determine stock category
    const determineStockCategory = (categoryName: string): "fish" | "tank" | "accessory" => {
      const lower = categoryName.toLowerCase();
      if (lower.includes("fish") || lower.includes("aquatic")) {
        return "fish";
      }
      if (lower.includes("tank") || lower.includes("aquarium")) {
        return "tank";
      }
      return "accessory";
    };

    const stockCategory = determineStockCategory(category.name);
    const isFishCategory = stockCategory === "fish";

    // Calculate expiry date for fish
    let expiryDate: number | undefined;
    if (isFishCategory && product.lifespan) {
      const lifespanMatch = product.lifespan.match(/(\d+)\s*(year|month|day)/i);
      if (lifespanMatch) {
        const value = parseInt(lifespanMatch[1]);
        const unit = lifespanMatch[2].toLowerCase();

        let lifespanMs = 0;
        if (unit.startsWith('year')) {
          lifespanMs = value * 365 * 24 * 60 * 60 * 1000;
        } else if (unit.startsWith('month')) {
          lifespanMs = value * 30 * 24 * 60 * 60 * 1000;
        } else if (unit.startsWith('day')) {
          lifespanMs = value * 24 * 60 * 60 * 1000;
        }
        expiryDate = now + lifespanMs;
      }
    }

    // FIFO batch tracking: new batch is independent, currentQty = initialQty
    // No accumulation with previous batches. Each batch tracks its own remaining stock.
    const newTotalStock = product.stock + quantity;

    // Create NEW independent stock record for this restock
    const stockRecordId = await ctx.db.insert("stockRecords", {
      productId: productId,
      batchCode: batchCode,
      category: stockCategory,

      // Independent batch quantities
      initialQty: quantity,
      currentQty: quantity, // Independent — this batch's own remaining stock
      reservedQty: 0,
      soldQty: 0,
      mortalityLossQty: 0,
      returnedQty: 0,

      // Location
      tankNumber: product.tankNumber,

      // Dates
      receivedDate: now,
      manufactureDate: isFishCategory ? now : undefined,
      expiryDate: expiryDate,

      // Status
      status: "active",
      qualityGrade: qualityGrade || (product.badge ? "premium" : "standard"),

      // Audit
      notes: notes || `Restock batch: +${quantity} units received. Product: ${product.name}.`,
      lastModifiedBy: userId,
      isRestock: true,

      createdAt: now,
      updatedAt: now,
    });

    // Log stock movement for this restock
    await ctx.db.insert("stockMovements", {
      stockRecordId: stockRecordId,
      productId: productId,
      batchCode: batchCode,
      movementType: "restock",
      quantityBefore: product.stock,
      quantityChange: quantity,
      quantityAfter: newTotalStock,
      createdAt: now,
    });

    // Update product total stock
    await ctx.db.patch(productId, {
      stock: newTotalStock,
      updatedAt: now,
    });

    // Auto-create restocking expense (costPrice × quantity)
    await createRestockExpenseHelper(ctx, {
      productId,
      stockRecordId,
      quantity,
      batchCode,
      userId,
    });

    return {
      success: true,
      stockRecordId,
      batchCode,
      quantityAdded: quantity,
      batchQty: quantity,
      message: `Successfully restocked ${quantity} units. New batch created: ${batchCode}`,
      newTotalStock,
    };
  },
});

// Update stock record status
export const updateStockStatus = mutation({
  args: {
    stockRecordId: v.id("stockRecords"),
    status: v.union(
      v.literal("active"),
      v.literal("depleted"),
      v.literal("expired"),
      v.literal("quarantine"),
      v.literal("reserved"),
      v.literal("damaged")
    ),
    notes: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { stockRecordId, status, notes, userId }) => {
    const stockRecord = await ctx.db.get(stockRecordId);
    
    if (!stockRecord) {
      throw new Error("Stock record not found");
    }

    await ctx.db.patch(stockRecordId, {
      status,
      notes: notes || stockRecord.notes,
      lastModifiedBy: userId,
      updatedAt: Date.now(),
    });

    return { success: true, message: `Stock status updated to ${status}` };
  },
});

// Reserve stock (for reservations)
export const reserveStock = mutation({
  args: {
    productId: v.id("products"),
    quantity: v.number(),
    batchCode: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { productId, quantity, batchCode, userId }) => {
    if (quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    // Find active stock record for this product
    let stockRecord;
    
    if (batchCode) {
      stockRecord = await ctx.db
        .query("stockRecords")
        .withIndex("by_batch_code", (q) => q.eq("batchCode", batchCode))
        .first();
    } else {
      // Get the first active stock record for the product
      stockRecord = await ctx.db
        .query("stockRecords")
        .withIndex("by_product_and_status", (q) => 
          q.eq("productId", productId).eq("status", "active")
        )
        .first();
    }

    if (!stockRecord) {
      throw new Error("No active stock record found for this product");
    }

    // Check if enough quantity is available
    const availableQty = stockRecord.currentQty - stockRecord.reservedQty;
    if (availableQty < quantity) {
      throw new Error(`Insufficient stock. Available: ${availableQty}, Requested: ${quantity}`);
    }

    const now = Date.now();
    const newReservedQty = stockRecord.reservedQty + quantity;
    
    // Update stock record
    await ctx.db.patch(stockRecord._id, {
      reservedQty: newReservedQty,
      lastModifiedBy: userId,
      updatedAt: now,
    });

    // Log stock movement
    await ctx.db.insert("stockMovements", {
      stockRecordId: stockRecord._id,
      productId: productId,
      batchCode: stockRecord.batchCode,
      movementType: "reservation",
      quantityBefore: stockRecord.reservedQty,
      quantityChange: quantity,
      quantityAfter: newReservedQty,
      createdAt: now,
    });

    return {
      success: true,
      stockRecordId: stockRecord._id,
      batchCode: stockRecord.batchCode,
      reservedQty: newReservedQty,
      availableQty: stockRecord.currentQty - newReservedQty,
    };
  },
});

// Release reserved stock (cancel reservation)
export const releaseReservedStock = mutation({
  args: {
    stockRecordId: v.id("stockRecords"),
    quantity: v.number(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { stockRecordId, quantity, userId }) => {
    if (quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    const stockRecord = await ctx.db.get(stockRecordId);
    
    if (!stockRecord) {
      throw new Error("Stock record not found");
    }

    if (stockRecord.reservedQty < quantity) {
      throw new Error(`Cannot release more than reserved. Reserved: ${stockRecord.reservedQty}, Requested: ${quantity}`);
    }

    const now = Date.now();
    const newReservedQty = stockRecord.reservedQty - quantity;
    
    // Update stock record
    await ctx.db.patch(stockRecordId, {
      reservedQty: newReservedQty,
      lastModifiedBy: userId,
      updatedAt: now,
    });

    // Log stock movement (negative change to indicate release)
    await ctx.db.insert("stockMovements", {
      stockRecordId: stockRecordId,
      productId: stockRecord.productId,
      batchCode: stockRecord.batchCode,
      movementType: "adjustment",
      quantityBefore: stockRecord.reservedQty,
      quantityChange: -quantity,
      quantityAfter: newReservedQty,
      createdAt: now,
    });

    return {
      success: true,
      reservedQty: newReservedQty,
      availableQty: stockRecord.currentQty - newReservedQty,
    };
  },
});

// Process sale (convert reserved to sold or direct sale)
export const processSale = mutation({
  args: {
    stockRecordId: v.id("stockRecords"),
    quantity: v.number(),
    fromReserved: v.boolean(), // If true, convert from reserved; if false, direct sale
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { stockRecordId, quantity, fromReserved, userId }) => {
    if (quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    const stockRecord = await ctx.db.get(stockRecordId);
    
    if (!stockRecord) {
      throw new Error("Stock record not found");
    }

    const now = Date.now();
    let newCurrentQty = stockRecord.currentQty;
    let newReservedQty = stockRecord.reservedQty;
    let newSoldQty = stockRecord.soldQty + quantity;

    if (fromReserved) {
      // Converting reserved stock to sold
      if (stockRecord.reservedQty < quantity) {
        throw new Error(`Insufficient reserved quantity. Reserved: ${stockRecord.reservedQty}, Requested: ${quantity}`);
      }
      newReservedQty = stockRecord.reservedQty - quantity;
      newCurrentQty = stockRecord.currentQty - quantity;
    } else {
      // Direct sale from available stock
      const availableQty = stockRecord.currentQty - stockRecord.reservedQty;
      if (availableQty < quantity) {
        throw new Error(`Insufficient available quantity. Available: ${availableQty}, Requested: ${quantity}`);
      }
      newCurrentQty = stockRecord.currentQty - quantity;
    }

    // Determine new status
    let newStatus = stockRecord.status;
    if (newCurrentQty === 0) {
      newStatus = "depleted";
    }

    // Update stock record
    await ctx.db.patch(stockRecordId, {
      currentQty: newCurrentQty,
      reservedQty: newReservedQty,
      soldQty: newSoldQty,
      status: newStatus,
      lastModifiedBy: userId,
      updatedAt: now,
    });

    // Log stock movement
    await ctx.db.insert("stockMovements", {
      stockRecordId: stockRecordId,
      productId: stockRecord.productId,
      batchCode: stockRecord.batchCode,
      movementType: "sale",
      quantityBefore: stockRecord.currentQty,
      quantityChange: -quantity,
      quantityAfter: newCurrentQty,
      createdAt: now,
    });

    // Update product stock
    const product = await ctx.db.get(stockRecord.productId);
    if (product) {
      await ctx.db.patch(stockRecord.productId, {
        stock: Math.max(0, product.stock - quantity),
        updatedAt: now,
      });
    }

    return {
      success: true,
      currentQty: newCurrentQty,
      reservedQty: newReservedQty,
      soldQty: newSoldQty,
      status: newStatus,
    };
  },
});

// Mark stock as damaged
export const markStockDamaged = mutation({
  args: {
    stockRecordId: v.id("stockRecords"),
    quantity: v.number(),
    notes: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { stockRecordId, quantity, notes, userId }) => {
    if (quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    const stockRecord = await ctx.db.get(stockRecordId);
    
    if (!stockRecord) {
      throw new Error("Stock record not found");
    }

    const availableQty = stockRecord.currentQty - stockRecord.reservedQty;
    if (availableQty < quantity) {
      throw new Error(`Insufficient available quantity. Available: ${availableQty}, Requested: ${quantity}`);
    }

    const now = Date.now();
    const newCurrentQty = stockRecord.currentQty - quantity;
    const newMortalityLossQty = stockRecord.mortalityLossQty + quantity;
    
    // Determine new status
    let newStatus = stockRecord.status;
    if (newCurrentQty === 0) {
      newStatus = "depleted";
    }

    // Update stock record
    await ctx.db.patch(stockRecordId, {
      currentQty: newCurrentQty,
      mortalityLossQty: newMortalityLossQty,
      status: newStatus,
      notes: notes || stockRecord.notes,
      lastModifiedBy: userId,
      updatedAt: now,
    });

    // Log stock movement
    await ctx.db.insert("stockMovements", {
      stockRecordId: stockRecordId,
      productId: stockRecord.productId,
      batchCode: stockRecord.batchCode,
      movementType: "damage",
      quantityBefore: stockRecord.currentQty,
      quantityChange: -quantity,
      quantityAfter: newCurrentQty,
      createdAt: now,
    });

    // Update product stock
    const product = await ctx.db.get(stockRecord.productId);
    if (product) {
      await ctx.db.patch(stockRecord.productId, {
        stock: Math.max(0, product.stock - quantity),
        updatedAt: now,
      });
    }

    return {
      success: true,
      currentQty: newCurrentQty,
      mortalityLossQty: newMortalityLossQty,
      status: newStatus,
    };
  },
});

// Process return (customer return)
export const processReturn = mutation({
  args: {
    stockRecordId: v.id("stockRecords"),
    quantity: v.number(),
    restockable: v.boolean(), // If true, add back to current stock
    notes: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { stockRecordId, quantity, restockable, notes, userId }) => {
    if (quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    const stockRecord = await ctx.db.get(stockRecordId);
    
    if (!stockRecord) {
      throw new Error("Stock record not found");
    }

    const now = Date.now();
    let newCurrentQty = stockRecord.currentQty;
    const newReturnedQty = stockRecord.returnedQty + quantity;
    let newSoldQty = Math.max(0, stockRecord.soldQty - quantity);

    if (restockable) {
      // Add back to current stock
      newCurrentQty = stockRecord.currentQty + quantity;
    }

    // Update status if restocked
    let newStatus = stockRecord.status;
    if (restockable && stockRecord.status === "depleted" && newCurrentQty > 0) {
      newStatus = "active";
    }

    // Update stock record
    await ctx.db.patch(stockRecordId, {
      currentQty: newCurrentQty,
      returnedQty: newReturnedQty,
      soldQty: newSoldQty,
      status: newStatus,
      notes: notes || stockRecord.notes,
      lastModifiedBy: userId,
      updatedAt: now,
    });

    // Log stock movement
    await ctx.db.insert("stockMovements", {
      stockRecordId: stockRecordId,
      productId: stockRecord.productId,
      batchCode: stockRecord.batchCode,
      movementType: "return",
      quantityBefore: stockRecord.currentQty,
      quantityChange: restockable ? quantity : 0,
      quantityAfter: newCurrentQty,
      createdAt: now,
    });

    // Update product stock if restockable
    if (restockable) {
      const product = await ctx.db.get(stockRecord.productId);
      if (product) {
        await ctx.db.patch(stockRecord.productId, {
          stock: product.stock + quantity,
          updatedAt: now,
        });
      }
    }

    return {
      success: true,
      currentQty: newCurrentQty,
      returnedQty: newReturnedQty,
      soldQty: newSoldQty,
      status: newStatus,
      restocked: restockable,
    };
  },
});

// Manual stock adjustment
export const adjustStock = mutation({
  args: {
    stockRecordId: v.id("stockRecords"),
    quantityChange: v.number(), // Positive for increase, negative for decrease
    reason: v.string(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { stockRecordId, quantityChange, reason, userId }) => {
    if (quantityChange === 0) {
      throw new Error("Quantity change must be non-zero");
    }

    const stockRecord = await ctx.db.get(stockRecordId);
    
    if (!stockRecord) {
      throw new Error("Stock record not found");
    }

    const newCurrentQty = stockRecord.currentQty + quantityChange;
    
    if (newCurrentQty < 0) {
      throw new Error("Adjustment would result in negative stock");
    }

    const now = Date.now();
    
    // Determine new status
    let newStatus = stockRecord.status;
    if (newCurrentQty === 0 && stockRecord.status === "active") {
      newStatus = "depleted";
    } else if (newCurrentQty > 0 && stockRecord.status === "depleted") {
      newStatus = "active";
    }

    // Update stock record
    await ctx.db.patch(stockRecordId, {
      currentQty: newCurrentQty,
      status: newStatus,
      notes: `${stockRecord.notes || ''}\n[Adjustment] ${reason}`.trim(),
      lastModifiedBy: userId,
      updatedAt: now,
    });

    // Log stock movement
    await ctx.db.insert("stockMovements", {
      stockRecordId: stockRecordId,
      productId: stockRecord.productId,
      batchCode: stockRecord.batchCode,
      movementType: "adjustment",
      quantityBefore: stockRecord.currentQty,
      quantityChange: quantityChange,
      quantityAfter: newCurrentQty,
      createdAt: now,
    });

    // Update product stock
    const product = await ctx.db.get(stockRecord.productId);
    if (product) {
      await ctx.db.patch(stockRecord.productId, {
        stock: Math.max(0, product.stock + quantityChange),
        updatedAt: now,
      });
    }

    return {
      success: true,
      currentQty: newCurrentQty,
      status: newStatus,
      quantityChange,
    };
  },
});

// ==================== ANALYTICS ====================

// Get stock summary statistics
export const getStockSummary = query({
  args: {},
  handler: async (ctx) => {
    const allStockRecords = await ctx.db.query("stockRecords").collect();

    const summary = {
      totalRecords: allStockRecords.length,
      totalValue: 0,
      activeRecords: 0,
      depletedRecords: 0,
      expiredRecords: 0,
      quarantineRecords: 0,
      totalCurrentQty: 0,
      totalReservedQty: 0,
      totalSoldQty: 0,
      totalDamagedQty: 0,
      totalReturnedQty: 0,
      byCategory: {
        fish: { records: 0, currentQty: 0, value: 0 },
        tank: { records: 0, currentQty: 0, value: 0 },
        accessory: { records: 0, currentQty: 0, value: 0 },
      },
    };

    for (const record of allStockRecords) {
      const product = await ctx.db.get(record.productId);
      const recordValue = product ? product.price * record.currentQty : 0;

      summary.totalCurrentQty += record.currentQty;
      summary.totalReservedQty += record.reservedQty;
      summary.totalSoldQty += record.soldQty;
      summary.totalDamagedQty += record.mortalityLossQty;
      summary.totalReturnedQty += record.returnedQty;
      summary.totalValue += recordValue;

      // Count by status
      if (record.status === "active") summary.activeRecords++;
      else if (record.status === "depleted") summary.depletedRecords++;
      else if (record.status === "expired") summary.expiredRecords++;
      else if (record.status === "quarantine") summary.quarantineRecords++;

      // Count by category
      const categoryStats = summary.byCategory[record.category];
      categoryStats.records++;
      categoryStats.currentQty += record.currentQty;
      categoryStats.value += recordValue;
    }

    return summary;
  },
});

// Record mortality loss — FIFO deducts from oldest batch(es),
// creates ONE mortality record per event for reporting/traceability.
export const recordMortalityLossByProduct = mutation({
  args: {
    productId: v.id("products"),
    quantity: v.number(),
    notes: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { productId, quantity, notes, userId }) => {
    if (quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    const product = await ctx.db.get(productId);
    if (!product) throw new Error("Product not found");
    if (product.stock < quantity) {
      throw new Error(`Insufficient stock. Available: ${product.stock}, Requested: ${quantity}`);
    }

    const category = await ctx.db.get(product.categoryId);
    if (!category) throw new Error("Category not found");

    // Get active batches FIFO (oldest first)
    const batches = await ctx.db
      .query("stockRecords")
      .withIndex("by_product_and_status", (q) =>
        q.eq("productId", productId).eq("status", "active")
      )
      .collect();

    const activeBatches = batches
      .filter(b => !b.isMortalityLoss && b.currentQty > 0)
      .sort((a, b) => a.createdAt - b.createdAt);

    if (activeBatches.length === 0) {
      throw new Error("No active stock batches found for this product");
    }

    const now = Date.now();
    let remaining = quantity;
    const affectedBatches: { batchCode: string; qty: number }[] = [];

    // FIFO deduction — remove from oldest batches first
    for (const batch of activeBatches) {
      if (remaining <= 0) break;
      const takeFromBatch = Math.min(remaining, batch.currentQty);
      const newCurrentQty = batch.currentQty - takeFromBatch;
      const newMortalityQty = batch.mortalityLossQty + takeFromBatch;
      const newStatus = newCurrentQty === 0 ? "depleted" as const : batch.status;

      await ctx.db.patch(batch._id, {
        currentQty: newCurrentQty,
        mortalityLossQty: newMortalityQty,
        status: newStatus,
        updatedAt: now,
      });

      // Log per-batch movement
      await ctx.db.insert("stockMovements", {
        stockRecordId: batch._id,
        productId: productId,
        batchCode: batch.batchCode,
        movementType: "damage",
        quantityBefore: batch.currentQty,
        quantityChange: -takeFromBatch,
        quantityAfter: newCurrentQty,
        createdAt: now,
      });

      affectedBatches.push({ batchCode: batch.batchCode, qty: takeFromBatch });
      remaining -= takeFromBatch;
    }

    const newProductStock = Math.max(0, product.stock - quantity);

    // Determine stock category for the mortality record
    const determineStockCategory = (categoryName: string): "fish" | "tank" | "accessory" => {
      const lower = categoryName.toLowerCase();
      if (lower.includes("fish") || lower.includes("aquatic")) return "fish";
      if (lower.includes("tank") || lower.includes("aquarium")) return "tank";
      return "accessory";
    };
    const stockCategory = determineStockCategory(category.name);

    // Create ONE mortality reporting record (marked isMortalityLoss, status: damaged)
    // This is separate from the batches above — it exists purely for mortality history/reporting
    const affectedBatchCodes = affectedBatches.map(b => `${b.batchCode} (-${b.qty})`).join(", ");
    const firstBatch = activeBatches[0];

    const mortalityRecordId = await ctx.db.insert("stockRecords", {
      productId: productId,
      batchCode: affectedBatches.map(b => b.batchCode).join("+"),
      category: stockCategory,
      initialQty: quantity,
      currentQty: 0,
      reservedQty: 0,
      soldQty: 0,
      mortalityLossQty: quantity,
      returnedQty: 0,
      tankNumber: product.tankNumber,
      receivedDate: now,
      status: "damaged",
      qualityGrade: firstBatch.qualityGrade,
      notes: notes || `Mortality loss: ${quantity} units. Deducted FIFO from: ${affectedBatchCodes}`,
      lastModifiedBy: userId,
      isMortalityLoss: true,
      sourceStockRecordId: firstBatch._id,
      createdAt: now,
      updatedAt: now,
    });

    // Update product total stock
    await ctx.db.patch(productId, {
      stock: newProductStock,
      updatedAt: now,
    });

    return {
      success: true,
      mortalityStockRecordId: mortalityRecordId,
      mortalityLossQty: quantity,
      affectedBatches,
      previousProductStock: product.stock,
      productStock: newProductStock,
    };
  },
});

// Migration: normalize existing batches to independent currentQty
// Run once via: npx convex run services/stock:migrateToIndependentBatches
export const migrateToIndependentBatches = mutation({
  args: {},
  handler: async (ctx) => {
    const allProducts = await ctx.db.query("products").collect();
    const results: { product: string; before: number; after: number; batches: number }[] = [];

    for (const product of allProducts) {
      const batches = await ctx.db
        .query("stockRecords")
        .withIndex("by_product", (q) => q.eq("productId", product._id))
        .collect();

      const nonMortalityBatches = batches
        .filter(b => !b.isMortalityLoss)
        .sort((a, b) => a.createdAt - b.createdAt); // FIFO order

      if (nonMortalityBatches.length === 0) continue;

      // Distribute product.stock FIFO: fill oldest batches up to their initialQty first
      let remaining = product.stock;
      let totalAfter = 0;

      for (const batch of nonMortalityBatches) {
        // Amount already sold/mortality from this batch
        const consumed = batch.soldQty + batch.mortalityLossQty;
        // Max this batch can hold = initialQty - consumed
        const batchCapacity = Math.max(0, batch.initialQty - consumed);
        const allocate = Math.min(remaining, batchCapacity);
        const newStatus = allocate === 0 && batch.status === "active" ? "depleted" as const : batch.status;

        await ctx.db.patch(batch._id, {
          currentQty: allocate,
          status: newStatus,
          updatedAt: Date.now(),
        });

        totalAfter += allocate;
        remaining -= allocate;
      }

      // If stock exceeds all batch capacities, put excess in newest batch
      if (remaining > 0) {
        const newest = nonMortalityBatches[nonMortalityBatches.length - 1];
        await ctx.db.patch(newest._id, {
          currentQty: (newest.currentQty ?? 0) + remaining,
          status: "active",
          updatedAt: Date.now(),
        });
        totalAfter += remaining;
      }

      results.push({
        product: product.name,
        before: product.stock,
        after: totalAfter,
        batches: nonMortalityBatches.length,
      });
    }

    return {
      success: true,
      productsProcessed: results.length,
      results,
      message: `Normalized ${results.length} products to independent batch tracking`,
    };
  },
});
