import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    passwordHash: v.optional(v.string()), // Optional for Facebook users
    role: v.union(v.literal("client"), v.literal("admin"), v.literal("super_admin")),
    isActive: v.optional(v.boolean()),
    isBanned: v.optional(v.boolean()),
    isSalesAssociate: v.optional(v.boolean()), // Tag staff as sales associate for incentive tracking
    commissionRate: v.optional(v.number()), // % rate (e.g. 5 = 5%). Applied to commissionBasis.
    commissionBasis: v.optional(v.union(v.literal("revenue"), v.literal("profit"))), // What the rate applies to
    // Facebook integration fields
    facebookId: v.optional(v.string()),
    profilePicture: v.optional(v.string()),
    loginMethod: v.optional(v.union(v.literal("email"), v.literal("facebook"))),
    // Password reset fields
    resetToken: v.optional(v.string()),
    resetTokenExpiry: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_facebook_id", ["facebookId"])
    .index("by_reset_token", ["resetToken"]),

  categories: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  products: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    costPrice: v.optional(v.number()), // Base/declared cost; used as fallback for P&L when no batch actualCostPrice exists
    movingAverageCost: v.optional(v.number()), // Weighted running average of batch actualCostPrice. P&L COGS prefers this over costPrice.
    originalPrice: v.optional(v.number()),
    categoryId: v.id("categories"),
    image: v.string(),
    images: v.optional(v.array(v.string())),
    certificate: v.optional(v.string()),
    sku: v.optional(v.union(v.string(), v.number())),
    stock: v.number(),
    rating: v.optional(v.number()),
    reviews: v.optional(v.number()),
    badge: v.optional(v.string()),
    productStatus: v.optional(v.string()),
    lifespan: v.optional(v.string()),
    tankNumber: v.optional(v.string()),
    batchCode: v.optional(v.string()),
    // Premium specimen grade (S = best, then AAA / AA / A). Optional — only set on collector fish.
    grade: v.optional(v.union(
      v.literal("S"),
      v.literal("AAA"),
      v.literal("AA"),
      v.literal("A"),
    )),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["categoryId"])
    .index("by_active", ["isActive"]),

  //Tank additional data
  tank: defineTable({
    productId: v.id("products"),
    tankType: v.string(),
    material: v.string(),
    capacity: v.number(),
    dimensions: v.object({
      length: v.number(),
      width: v.number(),
      height: v.number(),
    }),
    weight: v.optional(v.number()),
    thickness: v.number(),
    lighting: v.number(),
    filtation: v.number(),
  })
    .index("by_product", ["productId"]),

  //Fish Additional data
  fish:  defineTable({
    productId: v.id("products"),
    scientificName: v.optional(v.string()),
    weight: v.optional(v.number()),
    size: v.number(),
    temperature: v.optional(v.number()),
    age: v.number(),
    phLevel: v.string(),
    lifespan: v.optional(v.string()),
    origin: v.optional(v.string()),
    diet: v.string()
  })
    .index("by_product", ["productId"]),

  orders: defineTable({
    userId: v.optional(v.id("users")), // Optional for walk-in orders
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("processing"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
    items: v.array(v.object({
      productId: v.id("products"),
      quantity: v.number(),
      price: v.number(), // Final unit price (post line-item discount)
      originalPrice: v.optional(v.number()), // Unit list price before discount
      discount: v.optional(v.number()), // Per-unit discount amount (₱)
    })),
    subtotal: v.optional(v.number()), // Sum of (price × qty) before order-level discount
    orderDiscount: v.optional(v.number()), // Order-wide discount amount (₱)
    totalAmount: v.number(), // Final total after all discounts
    shippingAddress: v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zipCode: v.string(),
      country: v.string(),
    }),
    paymentMethod: v.string(),
    customerName: v.optional(v.string()), // For walk-in customers without an account
    notes: v.optional(v.string()),
    // Payment tracking
    paymentStatus: v.optional(v.union(
      v.literal("unpaid"),
      v.literal("partial"),
      v.literal("paid"),
      v.literal("refunded"),
    )),
    amountPaid: v.optional(v.number()),
    // Sales associate tracking (for incentive programs)
    salesAssociateId: v.optional(v.id("users")),
    salesAssociateName: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // Updated cart to support both users and guests
  cart: defineTable({
    userId: v.optional(v.id("users")), // Optional for guest users
    guestId: v.optional(v.string()), // For guest users
    productId: v.id("products"),
    quantity: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_guest", ["guestId"])
    .index("by_user_product", ["userId", "productId"])
    .index("by_guest_product", ["guestId", "productId"]),

  wishlist: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_product", ["userId", "productId"]),

  // Updated reservations to support both users and guests with multiple items
  reservations: defineTable({
    reservationCode: v.optional(v.string()), // Unique code for the reservation (e.g., "RES-001234") - Optional for backward compatibility
    userId: v.optional(v.union(v.id("users"), v.string())), // Optional for guest users, string for Facebook users
    guestId: v.optional(v.string()), // For guest users
    guestInfo: v.optional(v.object({ // Guest contact information
      name: v.string(),
      email: v.string(),
      phone: v.string(),
      completeAddress: v.optional(v.string()),
      pickupSchedule: v.optional(v.object({
        date: v.string(), // ISO date string
        time: v.string(), // Time string (e.g., "14:30")
      })),
      notes: v.optional(v.string()), // Instructions/notes for pickup
    })),
    // New multi-item structure - Optional for backward compatibility
    items: v.optional(v.array(v.object({
      productId: v.id("products"),
      quantity: v.number(),
      reservedPrice: v.number(), // Final unit price (post line-item discount)
      originalPrice: v.optional(v.number()), // Unit list price before discount
      discount: v.optional(v.number()), // Per-unit discount amount (₱)
    }))),
    subtotal: v.optional(v.number()), // Sum of (price × qty) before order-level discount
    orderDiscount: v.optional(v.number()), // Order-wide discount amount (₱)
    totalAmount: v.optional(v.number()), // Total amount for all items - Optional for backward compatibility
    totalQuantity: v.optional(v.number()), // Total quantity of all items - Optional for backward compatibility

    // Legacy single-item fields - Keep for backward compatibility
    productId: v.optional(v.id("products")), // Legacy single product ID
    quantity: v.optional(v.number()), // Legacy single quantity

    reservationDate: v.number(),
    expiryDate: v.number(),
    status: v.union(
      v.literal("pending"), // New status for guest reservations
      v.literal("confirmed"),
      v.literal("ready_for_pickup"), // New status - reservation is ready for customer pickup
      v.literal("completed"), // Replaces 'active' - comes after ready_for_pickup
      v.literal("expired"),
      v.literal("cancelled")
    ),
    notes: v.optional(v.string()),
    // Payment tracking
    paymentStatus: v.optional(v.union(
      v.literal("unpaid"),
      v.literal("partial"),
      v.literal("paid"),
      v.literal("refunded"),
    )),
    amountPaid: v.optional(v.number()),
    // Sales associate tracking
    salesAssociateId: v.optional(v.id("users")),
    salesAssociateName: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_guest", ["guestId"])
    .index("by_status", ["status"])
    .index("by_expiry", ["expiryDate"])
    .index("by_reservation_code", ["reservationCode"])
    .index("by_product", ["productId"]), // Legacy index for single-item reservations

  // Reservation payments ledger — one row per payment event against a reservation
  // (downpayment, walk-in partial payment, balance settlement at pickup, or refund).
  // This is the single source of truth for "how much has actually been collected and when".
  // amountPaid/paymentStatus on the reservation are caches recomputed from this ledger.
  // Only method === "cash" rows move Cash on Hand, and each moves it at its own `date`.
  reservationPayments: defineTable({
    reservationId: v.id("reservations"),
    amount: v.number(),            // peso amount taken in THIS payment (positive; refunds are negative)
    method: v.union(
      v.literal("cash"),
      v.literal("gcash"),
      v.literal("card"),
      v.literal("bank_transfer"),
      v.literal("other"),
    ),
    // Why/what this entry represents — for the payment-flow timeline.
    kind: v.optional(v.union(
      v.literal("downpayment"), // first deposit, usually taken in POS at reservation time
      v.literal("partial"),     // a top-up payment made any time after
      v.literal("full"),        // settles the entire balance in one go
      v.literal("refund"),      // money returned to the customer (negative amount)
      v.literal("legacy"),      // backfilled from a pre-ledger amountPaid (method unknown)
    )),
    note: v.optional(v.string()),
    date: v.number(),              // when the money actually changed hands (drives COH timing)
    recordedBy: v.optional(v.id("users")),
    recordedByName: v.optional(v.string()), // snapshot of who took the payment
    createdAt: v.number(),
  })
    .index("by_reservation", ["reservationId"])
    .index("by_date", ["date"]),

  notifications: defineTable({
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("reservation"),
      v.literal("order"),
      v.literal("user"),
      v.literal("product"),
      v.literal("payment"),
      v.literal("alert"),
      v.literal("warning"),
      v.literal("success"),
      v.literal("system")
    ),
    isRead: v.boolean(),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    // Reference IDs for context
    relatedId: v.optional(v.string()), // Can be orderId, reservationId, userId, etc.
    relatedType: v.optional(v.string()), // Type of the related entity
    // Metadata for additional context
    metadata: v.optional(v.object({
      customerName: v.optional(v.string()),
      customerEmail: v.optional(v.string()),
      productName: v.optional(v.string()),
      amount: v.optional(v.number()),
      status: v.optional(v.string()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_read", ["isRead"])
    .index("by_type", ["type"])
    .index("by_priority", ["priority"])
    .index("by_created", ["createdAt"]),

  // Stock Records - Detailed inventory tracking per batch
  stockRecords: defineTable({
    productId: v.id("products"),
    batchCode: v.string(), // Reference to product batch
    
    // Product category type
    category: v.union(
      v.literal("fish"),
      v.literal("tank"),
      v.literal("accessory")
    ),
    
    // Quantity tracking
    initialQty: v.number(), // Original quantity when stock received
    currentQty: v.number(), // Current available quantity
    reservedQty: v.number(), // Quantity reserved but not yet sold
    soldQty: v.number(), // Quantity already sold
    mortalityLossQty: v.number(), // Quantity lost due to mortality/damage
    returnedQty: v.number(), // Quantity returned by customers
    internalUseQty: v.optional(v.number()), // Quantity consumed for in-shop use (not sold)

    // Per-batch acquisition cost. When this batch is received, this is the cost paid.
    // Drives P&L COGS via product.movingAverageCost; falls back to product.costPrice if unset.
    actualCostPrice: v.optional(v.number()),

    // Restock declaration (set on restock batches): which wallet funded this batch and from whom.
    // "coh" deducts from Cash on Hand; "investment" is declaration-only. Powers the Stock Flow report.
    fundingSource: v.optional(v.union(v.literal("coh"), v.literal("investment"))),
    supplier: v.optional(v.string()),
    
    // Location tracking
    tankNumber: v.optional(v.string()), // Tank number if applicable
    
    // Dates
    receivedDate: v.number(), // Date stock was received
    manufactureDate: v.optional(v.number()), // Manufacturing/breeding date
    expiryDate: v.optional(v.number()), // Expiry date (for fish: expected lifespan end)
    
    // Status and quality
    status: v.union(
      v.literal("active"), // Currently available
      v.literal("depleted"), // Fully sold/used
      v.literal("expired"), // Past expiry date
      v.literal("quarantine"), // Under quarantine (for fish)
      v.literal("reserved"), // Fully reserved
      v.literal("damaged") // Marked as damaged
    ),
    qualityGrade: v.optional(v.union(
      v.literal("premium"),
      v.literal("standard"),
      v.literal("budget")
    )),
    
    // Additional tracking
    notes: v.optional(v.string()), // General notes
    lastModifiedBy: v.optional(v.id("users")), // User who last modified
    isRestock: v.optional(v.boolean()), // Flag to identify restock entries
    isMortalityLoss: v.optional(v.boolean()), // Flag to identify mortality loss records
    sourceStockRecordId: v.optional(v.id("stockRecords")), // Reference to parent stock if this is a mortality loss record
    
    // Audit trail
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_batch_code", ["batchCode"])
    .index("by_category", ["category"])
    .index("by_status", ["status"])
    .index("by_product_and_status", ["productId", "status"])
    .index("by_category_and_status", ["category", "status"])
    .index("by_expiry_date", ["expiryDate"])
    .index("by_received_date", ["receivedDate"]),

  // Stock Movements - Track all stock changes
  stockMovements: defineTable({
    stockRecordId: v.id("stockRecords"),
    productId: v.id("products"),
    batchCode: v.string(),
    
    // Movement details
    movementType: v.union(
      v.literal("initial"), // Initial product creation
      v.literal("purchase"), // New stock received
      v.literal("restock"), // Restock existing product
      v.literal("sale"), // Stock sold
      v.literal("reservation"), // Stock reserved
      v.literal("return"), // Customer return
      v.literal("damage"), // Marked as damaged
      v.literal("adjustment"), // Manual adjustment
      v.literal("transfer"), // Transfer between locations
      v.literal("expiry"), // Expired stock removal
      v.literal("internal_use") // Consumed for in-shop use (not sold)
    ),
    
    // Quantity changes
    quantityBefore: v.number(),
    quantityChange: v.number(), // Positive for increase, negative for decrease
    quantityAfter: v.number(),
    
    // Audit
    createdAt: v.number(),
  })
    .index("by_stock_record", ["stockRecordId"])
    .index("by_product", ["productId"])
    .index("by_batch_code", ["batchCode"])
    .index("by_movement_type", ["movementType"])
    .index("by_created", ["createdAt"]),

  // Expenses — both restocking (auto) and operational (manual)
  expenses: defineTable({
    type: v.union(v.literal("restocking"), v.literal("operational")),
    category: v.optional(v.union(
      v.literal("travel"),
      v.literal("food"),
      v.literal("supplies"),
      v.literal("utilities"),
      v.literal("rent"),
      v.literal("salary"),
      v.literal("maintenance"),
      v.literal("marketing"),
      v.literal("commissions"),     // Sales-associate commission payouts (a real operating expense)
      v.literal("mortality"),       // Inventory write-off for dead/damaged stock (no cash leaves)
      v.literal("other"),
    )),
    amount: v.number(),
    description: v.string(),
    paymentMethod: v.string(), // cash, gcash, bank_transfer, card, internal
    date: v.number(), // when the expense was paid

    // Restocking link (if type = restocking)
    stockRecordId: v.optional(v.id("stockRecords")),
    productId: v.optional(v.id("products")),
    quantity: v.optional(v.number()),

    // Internal-use sub-classification (only set when paymentMethod = "internal")
    internalUseCategory: v.optional(v.union(
      v.literal("treatment"),       // medication, water treatment, sterilizer
      v.literal("display"),         // store decor, demo tank stocking
      v.literal("feed"),            // food consumed in-house
      v.literal("loss_prevention"), // quarantine, prophylactic use
      v.literal("other"),
    )),

    // Funding source — only meaningful for type = "restocking" declarations. "coh" deducts from
    // Cash on Hand (cash left the till to buy stock); "investment" is declaration-only (no balance moves).
    fundingSource: v.optional(v.union(v.literal("coh"), v.literal("investment"))),

    // Supplier name — where the stock was bought from (mainly for restocking declarations).
    supplier: v.optional(v.string()),

    receiptImage: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_date", ["date"])
    .index("by_category", ["category"])
    .index("by_stock_record", ["stockRecordId"])
    .index("by_product", ["productId"]),

  // Financial settings (key-value store for opening balance, etc.)
  financialSettings: defineTable({
    key: v.string(), // "opening_cash_balance"
    value: v.number(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_key", ["key"]),

  // Cash adjustments — manual injections/withdrawals to/from cash-on-hand
  // (owner capital injection, float top-up, drawer count correction, owner draw, etc.).
  // amount is signed: positive adds to COH, negative subtracts.
  cashAdjustments: defineTable({
    type: v.union(
      v.literal("injection"),    // Add cash (owner capital, float top-up, found cash)
      v.literal("withdrawal"),   // Remove cash (owner draw, bank deposit out)
      v.literal("correction"),   // Plus or minus, used to reconcile cash counts
    ),
    amount: v.number(),          // Signed (+ adds to COH, − subtracts)
    reason: v.string(),          // Short label e.g. "Owner capital injection"
    notes: v.optional(v.string()),
    date: v.number(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_type", ["type"]),

  // Public contact form submissions from the website's /contact page.
  contactMessages: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    subject: v.string(),
    message: v.string(),
    status: v.union(
      v.literal("new"),
      v.literal("responded"),
      v.literal("archived"),
    ),
    userId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_user", ["userId"]),

  // Gallery viewings — appointment bookings from the website's /visit page.
  viewings: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    date: v.string(), // YYYY-MM-DD
    time: v.string(), // HH:MM (24h)
    partySize: v.number(),
    interest: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal("requested"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    userId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_status", ["status"])
    .index("by_user", ["userId"]),

  // Admin audit trail — an append-only log of every meaningful admin action,
  // categorized so it can be filtered/grouped in the settings activity log.
  auditLogs: defineTable({
    actorId: v.optional(v.id("users")),   // who did it (may be absent for system tasks)
    actorName: v.optional(v.string()),    // snapshot of the actor's name at action time
    actorRole: v.optional(v.string()),    // snapshot of the actor's role at action time
    action: v.string(),                   // machine key, e.g. "expense.create", "stock.restock"
    category: v.union(
      v.literal("finance"),
      v.literal("inventory"),
      v.literal("sales"),
      v.literal("users"),
      v.literal("settings"),
      v.literal("system"),
    ),
    summary: v.string(),                  // human-readable one-line description
    entityTable: v.optional(v.string()),  // affected table (e.g. "expenses")
    entityId: v.optional(v.string()),     // affected document id
    amount: v.optional(v.number()),       // peso amount when relevant (finance/sales)
    metadata: v.optional(v.any()),        // extra context / before-after snapshots
    createdAt: v.number(),
  })
    .index("by_created", ["createdAt"])
    .index("by_category", ["category"])
    .index("by_actor", ["actorId"]),

  // Application-wide settings (singleton; always use first row)
  appSettings: defineTable({
    siteName: v.string(),
    siteDescription: v.optional(v.string()),
    timezone: v.string(),
    currency: v.string(),
    maintenanceMode: v.boolean(),
    notifyLowStock: v.boolean(),
    notifyNewOrders: v.boolean(),
    notifyNewUsers: v.boolean(),
    lowStockThreshold: v.number(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  }),
});