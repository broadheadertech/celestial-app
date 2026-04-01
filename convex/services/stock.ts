import { v } from "convex/values";
import { mutation, query, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// ==================== HELPER FUNCTIONS (callable from other mutations) ====================

/**
 * Reserve stock in stockRecords for a product (call from within a mutation handler).
 * Updates reservedQty and logs a stockMovement.
 * Silently skips if no active stock record exists (product may not have been batch-tracked yet).
 */
export async function reserveStockHelper(
  ctx: MutationCtx,
  args: { productId: Id<"products">; quantity: number }
) {
  const { productId, quantity } = args;
  if (quantity <= 0) return null;

  // Find the most recent active stock record for this product
  const stockRecord = await ctx.db
    .query("stockRecords")
    .withIndex("by_product_and_status", (q) =>
      q.eq("productId", productId).eq("status", "active")
    )
    .first();

  if (!stockRecord) {
    // No stock record exists — product hasn't been batch-tracked yet. Skip silently.
    return null;
  }

  const now = Date.now();
  const newReservedQty = stockRecord.reservedQty + quantity;

  await ctx.db.patch(stockRecord._id, {
    reservedQty: newReservedQty,
    updatedAt: now,
  });

  await ctx.db.insert("stockMovements", {
    stockRecordId: stockRecord._id,
    productId,
    batchCode: stockRecord.batchCode,
    movementType: "reservation",
    quantityBefore: stockRecord.reservedQty,
    quantityChange: quantity,
    quantityAfter: newReservedQty,
    createdAt: now,
  });

  return { stockRecordId: stockRecord._id, batchCode: stockRecord.batchCode };
}

/**
 * Release reserved stock in stockRecords (call from within a mutation handler).
 * Finds the active stock record for the product and decreases reservedQty.
 * Silently skips if no matching record exists.
 */
export async function releaseReservedStockHelper(
  ctx: MutationCtx,
  args: { productId: Id<"products">; quantity: number }
) {
  const { productId, quantity } = args;
  if (quantity <= 0) return;

  // Find stock records for this product that have reserved qty
  const stockRecords = await ctx.db
    .query("stockRecords")
    .withIndex("by_product", (q) => q.eq("productId", productId))
    .collect();

  // Find one with reservedQty > 0 (prefer active, then any)
  const record = stockRecords.find(r => r.reservedQty > 0 && r.status === "active")
    || stockRecords.find(r => r.reservedQty > 0);

  if (!record) return; // Nothing reserved in stockRecords, skip

  const now = Date.now();
  const releaseAmount = Math.min(quantity, record.reservedQty);
  const newReservedQty = record.reservedQty - releaseAmount;

  await ctx.db.patch(record._id, {
    reservedQty: newReservedQty,
    updatedAt: now,
  });

  await ctx.db.insert("stockMovements", {
    stockRecordId: record._id,
    productId,
    batchCode: record.batchCode,
    movementType: "adjustment",
    quantityBefore: record.reservedQty,
    quantityChange: -releaseAmount,
    quantityAfter: newReservedQty,
    createdAt: now,
  });
}

/**
 * Record a sale in stockRecords for a product (call from within a mutation handler).
 * Decreases currentQty, increases soldQty, logs a "sale" movement.
 * Silently skips if no active stock record exists.
 */
export async function recordSaleHelper(
  ctx: MutationCtx,
  args: { productId: Id<"products">; quantity: number }
) {
  const { productId, quantity } = args;
  if (quantity <= 0) return;

  const stockRecord = await ctx.db
    .query("stockRecords")
    .withIndex("by_product_and_status", (q) =>
      q.eq("productId", productId).eq("status", "active")
    )
    .first();

  if (!stockRecord) return;

  const now = Date.now();
  const newCurrentQty = Math.max(0, stockRecord.currentQty - quantity);
  const newSoldQty = stockRecord.soldQty + quantity;
  // If this was reserved stock being sold, also decrease reservedQty
  const reservedDecrease = Math.min(stockRecord.reservedQty, quantity);
  const newReservedQty = stockRecord.reservedQty - reservedDecrease;
  const newStatus = newCurrentQty === 0 ? "depleted" as const : stockRecord.status;

  await ctx.db.patch(stockRecord._id, {
    currentQty: newCurrentQty,
    soldQty: newSoldQty,
    reservedQty: newReservedQty,
    status: newStatus,
    updatedAt: now,
  });

  await ctx.db.insert("stockMovements", {
    stockRecordId: stockRecord._id,
    productId,
    batchCode: stockRecord.batchCode,
    movementType: "sale",
    quantityBefore: stockRecord.currentQty,
    quantityChange: -quantity,
    quantityAfter: newCurrentQty,
    createdAt: now,
  });
}

/**
 * Restore stock in stockRecords when an order/reservation is cancelled.
 * Increases currentQty back, logs a "return" movement.
 * Silently skips if no matching stock record exists.
 */
export async function restoreStockHelper(
  ctx: MutationCtx,
  args: { productId: Id<"products">; quantity: number }
) {
  const { productId, quantity } = args;
  if (quantity <= 0) return;

  // Find the most recent stock record for this product (prefer active, then depleted)
  const stockRecords = await ctx.db
    .query("stockRecords")
    .withIndex("by_product", (q) => q.eq("productId", productId))
    .collect();

  const record = stockRecords.find(r => r.status === "active" && !r.isMortalityLoss)
    || stockRecords.find(r => r.status === "depleted" && !r.isMortalityLoss);

  if (!record) return;

  const now = Date.now();
  const newCurrentQty = record.currentQty + quantity;
  const newStatus = newCurrentQty > 0 && record.status === "depleted" ? "active" as const : record.status;

  await ctx.db.patch(record._id, {
    currentQty: newCurrentQty,
    status: newStatus,
    updatedAt: now,
  });

  await ctx.db.insert("stockMovements", {
    stockRecordId: record._id,
    productId,
    batchCode: record.batchCode,
    movementType: "return",
    quantityBefore: record.currentQty,
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

    // Get the most recent active stock record to accumulate currentQty
    const previousStockRecords = await ctx.db
      .query("stockRecords")
      .withIndex("by_product_and_status", (q) => 
        q.eq("productId", productId).eq("status", "active")
      )
      .collect();

    // Sort by creation date (most recent first) and get the latest
    const previousBatch = previousStockRecords.sort((a, b) => b.createdAt - a.createdAt)[0];
    const previousCurrentQty = previousBatch?.currentQty || 0;

    // Formula: new batch currentQty = new batch initialQty + previous batch currentQty
    const newCurrentQty = quantity + previousCurrentQty;

    // Create NEW stock record for this restock
    const stockRecordId = await ctx.db.insert("stockRecords", {
      productId: productId,
      batchCode: batchCode,
      category: stockCategory,

      // Initial quantities - currentQty includes previous batch's remaining stock
      initialQty: quantity,
      currentQty: newCurrentQty, // Accumulated quantity
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
      notes: notes || `📦 RESTOCK - Added ${quantity} units to inventory\nProduct: ${product.name}\nSKU: ${product.sku || 'N/A'}\nOriginal Batch: ${product.batchCode || 'N/A'}\nNew Batch: ${batchCode}\nPrevious Batch Remaining: ${previousCurrentQty}\nAccumulated Total: ${newCurrentQty}`,
      lastModifiedBy: userId,
      isRestock: true, // Mark as restock entry

      createdAt: now,
      updatedAt: now,
    });

    // Log initial stock movement for this restock
    await ctx.db.insert("stockMovements", {
      stockRecordId: stockRecordId,
      productId: productId,
      batchCode: batchCode,
      movementType: "restock",
      quantityBefore: previousCurrentQty,
      quantityChange: quantity,
      quantityAfter: newCurrentQty, // Shows accumulated total
      createdAt: now,
    });

    // Update product total stock
    await ctx.db.patch(productId, {
      stock: product.stock + quantity,
      updatedAt: now,
    });

    return {
      success: true,
      stockRecordId,
      batchCode,
      quantityAdded: quantity,
      previousBatchQty: previousCurrentQty,
      accumulatedQty: newCurrentQty,
      message: `Successfully restocked ${quantity} units (Total: ${newCurrentQty} units including ${previousCurrentQty} from previous batch)`,
      newTotalStock: product.stock + quantity,
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

// Record mortality loss by product ID - Creates a separate mortality loss record
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

    // Get product
    const product = await ctx.db.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Get category to determine stock category
    const category = await ctx.db.get(product.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    // Find ALL stock records for this product
    const allStockRecords = await ctx.db
      .query("stockRecords")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();
    
    // Filter to get mortality records and non-mortality records
    const mortalityRecords = allStockRecords
      .filter(record => record.isMortalityLoss === true)
      .sort((a, b) => b.createdAt - a.createdAt);
    
    const nonMortalityRecords = allStockRecords
      .filter(record => !record.isMortalityLoss && record.status === "active")
      .sort((a, b) => b.createdAt - a.createdAt);
    
    const previousMortalityRecord = mortalityRecords[0];
    
    // Get the most recent NON-MORTALITY stock record to copy from
    const recentDataSource = nonMortalityRecords[0];
    
    if (!recentDataSource) {
      throw new Error("No active stock record found for this product");
    }

    // Check available quantity from product stock
    if (product.stock < quantity) {
      throw new Error(`Insufficient stock. Available: ${product.stock}, Requested: ${quantity}`);
    }

    const now = Date.now();
    
    // STEP 1: Copy batchCode and currentQty from most recent NON-MORTALITY record
    const copiedBatchCode = recentDataSource.batchCode;
    const copiedCurrentQty = recentDataSource.currentQty;
    
    // STEP 2: Calculate new product stock (this will be saved to product table and mortality currentQty)
    const newProductStock = Math.max(0, product.stock - quantity);
    
    // STEP 2.1: For mortality records: currentQty = product's new stock (after deducting loss)
    // This ensures the mortality record reflects the actual remaining stock
    const newMortalityCurrentQty = newProductStock;
    
    // For mortality records: initialQty = currentQty (they are equal)
    const newMortalityInitialQty = newMortalityCurrentQty;
    
    // Track the previous mortality currentQty for logging purposes
    const previousMortalityCurrentQty = previousMortalityRecord 
      ? previousMortalityRecord.currentQty 
      : copiedCurrentQty;
    
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

    // STEP 4: Create NEW mortality loss record
    const mortalityStockRecordId = await ctx.db.insert("stockRecords", {
      productId: productId,
      batchCode: copiedBatchCode, // Copied from recent data source
      category: stockCategory,

      // initialQty = currentQty for mortality records
      initialQty: newMortalityInitialQty,
      currentQty: newMortalityCurrentQty, // Previous mortality currentQty - new loss
      reservedQty: 0,
      soldQty: 0,
      mortalityLossQty: quantity, // Track the loss amount
      returnedQty: 0,

      // Location
      tankNumber: product.tankNumber,

      // Dates
      receivedDate: now,
      manufactureDate: undefined,
      expiryDate: undefined,

      // Status
      status: "damaged", // Mark as damaged status
      qualityGrade: recentDataSource.qualityGrade,

      // Audit
      notes: notes || `🪦 MORTALITY LOSS RECORD\n` +
        `Product: ${product.name}\n` +
        `SKU: ${product.sku || 'N/A'}\n` +
        `Batch Code: ${copiedBatchCode} (copied from recent stock)\n` +
        `Tank: ${product.tankNumber || 'N/A'}\n` +
        `Previous Product Stock: ${product.stock} units\n` +
        `Mortality Loss Quantity: ${quantity} units\n` +
        `New Product Stock: ${newProductStock} units\n` +
        `New CurrentQty (= Product Stock): ${newMortalityCurrentQty} units\n` +
        `New InitialQty (= CurrentQty): ${newMortalityInitialQty} units\n` +
        `Formula: Product.stock (${product.stock}) - Loss (${quantity}) = ${newProductStock}\n` +
        `${previousMortalityRecord ? 'Continuing mortality tracking' : 'First mortality loss - copied from recent stock record'}`,
      lastModifiedBy: userId,
      isMortalityLoss: true, // Flag as mortality loss record
      sourceStockRecordId: recentDataSource._id, // Reference to source stock

      createdAt: now,
      updatedAt: now,
    });

    // STEP 5: DO NOT update source stock record - stockRecords are immutable audit logs
    // Each record is a historical snapshot of an action, not live inventory
    // Only the product.stock field tracks current inventory

    // STEP 6: Log stock movement for the mortality loss record only
    // This movement represents the mortality loss action itself
    await ctx.db.insert("stockMovements", {
      stockRecordId: mortalityStockRecordId,
      productId: productId,
      batchCode: copiedBatchCode,
      movementType: "damage",
      quantityBefore: product.stock, // Product stock before loss
      quantityChange: -quantity,
      quantityAfter: newProductStock, // Product stock after loss
      createdAt: now,
    });

    // STEP 7: Update product stock
    await ctx.db.patch(productId, {
      stock: Math.max(0, product.stock - quantity),
      updatedAt: now,
    });

    return {
      success: true,
      mortalityBatchCode: copiedBatchCode, // Batch code used for mortality record
      mortalityStockRecordId, // ID of the new mortality record created
      previousMortalityRecordId: previousMortalityRecord?._id,
      mortalityLossQty: quantity,
      newMortalityCurrentQty: newMortalityCurrentQty, // Product stock in mortality record
      newMortalityInitialQty: newMortalityInitialQty, // Same as currentQty
      previousProductStock: product.stock, // Product stock before loss
      productStock: newProductStock, // Product stock after loss
      isFirstMortalityLoss: !previousMortalityRecord,
    };
  },
});
