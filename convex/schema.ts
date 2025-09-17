import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    passwordHash: v.optional(v.string()), // Optional for Facebook users
    role: v.union(v.literal("client"), v.literal("admin"), v.literal("super_admin")),
    isActive: v.optional(v.boolean()),
    // Facebook integration fields
    facebookId: v.optional(v.string()),
    profilePicture: v.optional(v.string()),
    loginMethod: v.optional(v.union(v.literal("email"), v.literal("facebook"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_facebook_id", ["facebookId"]),

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
    scientificName: v.string(),
    weight: v.optional(v.number()),
    size: v.number(),
    temperature: v.number(),
    age: v.number(),
    phLevel: v.string(),
    lifespan:v.string (),
    origin: v.string(),
    diet: v.string()
  })
    .index("by_product", ["productId"]),

  orders: defineTable({
    userId: v.id("users"),
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
      price: v.number(),
    })),
    totalAmount: v.number(),
    shippingAddress: v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zipCode: v.string(),
      country: v.string(),
    }),
    paymentMethod: v.string(),
    notes: v.optional(v.string()),
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
      reservedPrice: v.number(), // Price at time of reservation
    }))),
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
      v.literal("completed"), // Replaces 'active' - comes after confirmed
      v.literal("expired"),
      v.literal("cancelled")
    ),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_guest", ["guestId"])
    .index("by_status", ["status"])
    .index("by_expiry", ["expiryDate"])
    .index("by_reservation_code", ["reservationCode"])
    .index("by_product", ["productId"]), // Legacy index for single-item reservations

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
});