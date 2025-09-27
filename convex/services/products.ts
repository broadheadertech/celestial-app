import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// Get all products
export const getProducts = query({
  args: {
    categoryId: v.optional(v.id("categories")),
    isActive: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { categoryId, isActive = true, limit }) => {
    let products;
    
    if (categoryId) {
      products = await ctx.db
        .query("products")
        .withIndex("by_category", (q) => q.eq("categoryId", categoryId))
        .collect();
    } else {
      products = await ctx.db
        .query("products")
        .withIndex("by_active", (q) => q.eq("isActive", isActive))
        .collect();
    }
    
    if (limit) {
      return products.slice(0, limit);
    }
    
    return products;
  },
});

// Get product by ID
export const getProduct = query({
  args: {
    productId: v.union(v.id("products"), v.string()),
  },
  handler: async (ctx, { productId }) => {
    // Handle both Convex ID and string formats
    const productIdValue = typeof productId === 'string' ? productId as any : productId;

    const product = await ctx.db.get(productIdValue);
    
    if (!product) {
      throw new Error("Product not found");
    }
    
    return product;
  },
});
// Get tank data by product ID
export const getTankByProductId = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, { productId }) => {
    console.log("getTankByProductId called with productId:", productId);
    
    const tankData = await ctx.db
      .query("tank")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .first();
      
    console.log("Tank data found:", tankData ? "Yes" : "No");
    if (tankData) {
      console.log("Tank type:", tankData.tankType);
    }
    
    return tankData;
  },
});


// Get fish data by product ID
export const getFishByProductId = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, { productId }) => {
    console.log("getFishByProductId called with productId:", productId);
    
    const fishData = await ctx.db
      .query("fish")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .first();
      
    console.log("Fish data found:", fishData ? "Yes" : "No");
    if (fishData) {
      console.log("Fish scientific name:", fishData.scientificName);
    }
    
    return fishData;
  },
});

// Get featured products (products with badges)
export const getFeaturedProducts = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 10 }) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .filter((q) => q.neq(q.field("badge"), undefined))
      .take(limit);

    return products;
  },
});

// Get top rated products based on reservation count (most reserved products)
export const getTopRatedProducts = query({
  args: {
    limit: v.optional(v.number()),
    minRating: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 10, minRating = 4.0 }) => {
    // Get all active products
    const products = await ctx.db
      .query("products")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Get all reservations to count by product
    const allReservations = await ctx.db.query("reservations").collect();

    // Count reservations per product (handle both new multi-item and legacy single-item format)
    const reservationCounts = new Map<string, number>();

    for (const reservation of allReservations) {
      // Skip cancelled reservations
      if (reservation.status === "cancelled") continue;

      // Handle new multi-item format
      if (reservation.items && reservation.items.length > 0) {
        for (const item of reservation.items) {
          const productId = item.productId;
          const currentCount = reservationCounts.get(productId) || 0;
          reservationCounts.set(productId, currentCount + item.quantity);
        }
      }
      // Handle legacy single-item format
      else if (reservation.productId) {
        const productId = reservation.productId;
        const currentCount = reservationCounts.get(productId) || 0;
        reservationCounts.set(productId, currentCount + (reservation.quantity || 1));
      }
    }

    // Sort products by reservation count (most reserved first)
    const topRatedProducts = products
      .map(product => ({
        ...product,
        reservationCount: reservationCounts.get(product._id) || 0
      }))
      .sort((a, b) => {
        // Sort by reservation count (descending), then by rating (descending), then by reviews
        if (b.reservationCount !== a.reservationCount) {
          return b.reservationCount - a.reservationCount;
        }
        if (b.rating !== a.rating) {
          return (b.rating || 0) - (a.rating || 0);
        }
        return (b.reviews || 0) - (a.reviews || 0);
      })
      .slice(0, limit);

    return topRatedProducts;
  },
});

// Create product (admin only)
export const createProduct = mutation({
  args: {
    // Core product fields - MUST match schema exactly
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    originalPrice: v.optional(v.number()),
    categoryId: v.id("categories"),
    image: v.string(),
    images: v.optional(v.array(v.string())),
    certificate: v.optional(v.string()), // Made optional to match schema
    sku: v.optional(v.string()), // Optional in schema
    stock: v.number(),
    rating: v.optional(v.number()),
    reviews: v.optional(v.number()),
    badge: v.optional(v.string()),
    productStatus: v.optional(v.string()),
    lifespan: v.optional(v.string()),
    isActive: v.boolean(),
    
    // Category-specific data (optional)
    fishData: v.optional(v.object({
      scientificName: v.string(),
      weight: v.optional(v.number()),
      size: v.number(),
      temperature: v.number(),
      age: v.number(),
      phLevel: v.string(),
      lifespan: v.string(),
      origin: v.string(),
      diet: v.string()
    })),
    
    tankData: v.optional(v.object({
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
    }))
  },
  
  handler: async (ctx, args) => {
    // Enhanced validation
    if (!args.name?.trim()) {
      throw new Error("Product name is required and cannot be empty");
    }
    
    if (args.price <= 0) {
      throw new Error("Price must be greater than 0");
    }
    
    if (args.originalPrice && args.originalPrice <= args.price) {
      throw new Error("Original price must be greater than current price");
    }
    
    if (args.stock < 0) {
      throw new Error("Stock cannot be negative");
    }
    
    // Check for duplicate SKU only if SKU is provided
    if (args.sku) {
      const existingProduct = await ctx.db
        .query("products")
        .filter((q) => q.eq(q.field("sku"), args.sku))
        .first();
      
      if (existingProduct) {
        throw new Error("A product with this SKU already exists");
      }
    }
    
    // Get and validate category
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Invalid category ID");
    }
    
    if (!category.isActive) {
      throw new Error("Cannot create product in inactive category");
    }

    // Validate category-specific data
    const categoryName = category.name.toLowerCase();
    const isFishCategory = categoryName.includes('fish') || categoryName.includes('aquatic');
    const isTankCategory = categoryName.includes('tank') || categoryName.includes('aquarium');
    
    // Enhanced category-specific validation
    if (isFishCategory && args.fishData) {
      // Validate fish-specific data
      if (!args.fishData.scientificName?.trim()) {
        throw new Error("Scientific name is required for fish products");
      }
      if (args.fishData.weight !== undefined && args.fishData.weight <= 0) {
        throw new Error("Fish weight must be greater than 0");
      }
      if (args.fishData.size <= 0) {
        throw new Error("Fish size must be greater than 0");
      }
      if (args.fishData.temperature < 0 || args.fishData.temperature > 50) {
        throw new Error("Temperature must be between 0-50°C");
      }
      if (args.fishData.age < 0) {
        throw new Error("Fish age cannot be negative");
      }
      if (!args.fishData.phLevel?.trim()) {
        throw new Error("pH Level is required for fish products");
      }
    } else if (isFishCategory && !args.fishData) {
      throw new Error("Fish-specific data is required for fish category products");
    }
    
    if (isTankCategory && args.tankData) {
      // Validate tank-specific data
      if (!args.tankData.tankType?.trim()) {
        throw new Error("Tank type is required for tank products");
      }
      if (!args.tankData.material?.trim()) {
        throw new Error("Material is required for tank products");
      }
      if (args.tankData.capacity <= 0) {
        throw new Error("Tank capacity must be greater than 0");
      }
      if (args.tankData.weight !== undefined && args.tankData.weight <= 0) {
        throw new Error("Tank weight must be greater than 0");
      }
      if (args.tankData.thickness <= 0) {
        throw new Error("Tank thickness must be greater than 0");
      }
      
      // Validate dimensions
      const { length, width, height } = args.tankData.dimensions;
      if (length <= 0 || width <= 0 || height <= 0) {
        throw new Error("All tank dimensions must be greater than 0");
      }
      
      // Validate lighting and filtration (assuming they're power ratings)
      if (args.tankData.lighting < 0) {
        throw new Error("Lighting value cannot be negative");
      }
      if (args.tankData.filtation < 0) {
        throw new Error("Filtration value cannot be negative");
      }
    } else if (isTankCategory && !args.tankData) {
      throw new Error("Tank-specific data is required for tank category products");
    }

    const now = Date.now();
    
    try {
      // Create the main product
      const productId = await ctx.db.insert("products", {
        name: args.name.trim(),
        description: args.description?.trim(),
        price: args.price,
        originalPrice: args.originalPrice,
        categoryId: args.categoryId,
        image: args.image,
        images: args.images || [],
        certificate: args.certificate,
        sku: args.sku,
        stock: args.stock,
        rating: args.rating,
        reviews: args.reviews,
        badge: args.badge,
        productStatus: args.productStatus,
        isActive: args.isActive,
        createdAt: now,
        updatedAt: now,
      });

      // Insert category-specific data
      if (isFishCategory && args.fishData) {
        await ctx.db.insert("fish", {
          productId,
          scientificName: args.fishData.scientificName.trim(),
          weight: args.fishData.weight,
          size: args.fishData.size,
          temperature: args.fishData.temperature,
          age: args.fishData.age,
          phLevel: args.fishData.phLevel.trim(),
          lifespan: args.fishData.lifespan.trim(),
          origin: args.fishData.origin.trim(),
          diet: args.fishData.diet.trim()
        });
      }
      
      if (isTankCategory && args.tankData) {
        await ctx.db.insert("tank", {
          productId,
          tankType: args.tankData.tankType.trim(),
          material: args.tankData.material.trim(),
          capacity: args.tankData.capacity,
          dimensions: args.tankData.dimensions,
          weight: args.tankData.weight,
          thickness: args.tankData.thickness,
          lighting: args.tankData.lighting,
          filtation: args.tankData.filtation,
        });
      }
      
      return {
        productId,
        message: "Product created successfully",
        categoryType: isFishCategory ? "fish" : isTankCategory ? "tank" : "general"
      };
      
    } catch (error) {
      // If product creation fails after main product is inserted, 
      // the database transaction should handle cleanup
      console.error("Error creating product:", error);
      throw new Error(`Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Update product
export const updateProduct = mutation({
  args: {
    productId: v.id("products"),
    
    // Core product fields - all optional for updates
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    originalPrice: v.optional(v.number()),
    categoryId: v.optional(v.id("categories")),
    image: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    certificate: v.optional(v.string()),
    sku: v.optional(v.string()),
    stock: v.optional(v.number()),
    rating: v.optional(v.number()),
    reviews: v.optional(v.number()),
    badge: v.optional(v.string()),
    productStatus: v.optional(v.string()),
    lifespan: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    
    // Category-specific data (optional)
    fishData: v.optional(v.object({
      scientificName: v.string(),
      weight: v.optional(v.number()),
      size: v.number(),
      temperature: v.number(),
      age: v.number(),
      phLevel: v.string(),
      lifespan: v.string(),
      origin: v.string(),
      diet: v.string()
    })),
    
    tankData: v.optional(v.object({
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
    }))
  },
  
  handler: async (ctx, args) => {
    const { productId, fishData, tankData, ...updates } = args;
    
    // Fetch the existing product
    const product = await ctx.db.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }
    
    // Enhanced validation for core fields
    if (updates.name !== undefined && !updates.name.trim()) {
      throw new Error("Product name cannot be empty");
    }
    
    if (updates.price !== undefined) {
      if (updates.price <= 0) {
        throw new Error("Price must be greater than 0");
      }
    }
    
    // Validate price relationship
    const finalPrice = updates.price ?? product.price;
    const finalOriginalPrice = updates.originalPrice ?? product.originalPrice;
    if (finalOriginalPrice && finalPrice > finalOriginalPrice) {
      throw new Error("Current price cannot be greater than original price");
    }
    
    if (updates.stock !== undefined && updates.stock < 0) {
      throw new Error("Stock cannot be negative");
    }
    
    // Check for duplicate SKU if updating
    if (updates.sku !== undefined && updates.sku !== product.sku) {
      const existingProduct = await ctx.db
        .query("products")
        .filter((q) => q.eq(q.field("sku"), updates.sku))
        .first();
      
      if (existingProduct) {
        throw new Error("A product with this SKU already exists");
      }
    }
    
    // Handle category change or validate current category
    let category;
    if (updates.categoryId) {
      // Changing category
      category = await ctx.db.get(updates.categoryId);
      if (!category) {
        throw new Error("Invalid category ID");
      }
      if (!category.isActive) {
        throw new Error("Cannot move product to inactive category");
      }
    } else {
      // Use existing category
      category = await ctx.db.get(product.categoryId);
      if (!category) {
        throw new Error("Product's current category not found");
      }
    }
    
    // Determine category type
    const categoryName = category.name.toLowerCase();
    const isFishCategory = categoryName.includes('fish') || categoryName.includes('aquatic');
    const isTankCategory = categoryName.includes('tank') || categoryName.includes('aquarium');
    
    // Validate category-specific data
    if (fishData) {
      if (!isFishCategory) {
        throw new Error("Cannot add fish data to non-fish category product");
      }
      
      // Validate fish-specific data
      if (!fishData.scientificName?.trim()) {
        throw new Error("Scientific name is required for fish products");
      }
      if (fishData.weight !== undefined && fishData.weight <= 0) {
        throw new Error("Fish weight must be greater than 0");
      }
      if (fishData.size <= 0) {
        throw new Error("Fish size must be greater than 0");
      }
      if (fishData.temperature < 0 || fishData.temperature > 50) {
        throw new Error("Temperature must be between 0-50°C");
      }
      if (fishData.age < 0) {
        throw new Error("Fish age cannot be negative");
      }
      if (!fishData.phLevel?.trim()) {
        throw new Error("pH Level is required for fish products");
      }
    }
    
    if (tankData) {
      if (!isTankCategory) {
        throw new Error("Cannot add tank data to non-tank category product");
      }
      
      // Validate tank-specific data
      if (!tankData.tankType?.trim()) {
        throw new Error("Tank type is required for tank products");
      }
      if (!tankData.material?.trim()) {
        throw new Error("Material is required for tank products");
      }
      if (tankData.capacity <= 0) {
        throw new Error("Tank capacity must be greater than 0");
      }
      if (tankData.weight !== undefined && tankData.weight <= 0) {
        throw new Error("Tank weight must be greater than 0");
      }
      if (tankData.thickness <= 0) {
        throw new Error("Tank thickness must be greater than 0");
      }
      
      // Validate dimensions
      const { length, width, height } = tankData.dimensions;
      if (length <= 0 || width <= 0 || height <= 0) {
        throw new Error("All tank dimensions must be greater than 0");
      }
      
      // Validate lighting and filtration
      if (tankData.lighting < 0) {
        throw new Error("Lighting value cannot be negative");
      }
      if (tankData.filtation < 0) {
        throw new Error("Filtration value cannot be negative");
      }
    }
    
    // If category is changing, check if old category-specific data needs to be cleaned
    if (updates.categoryId && updates.categoryId !== product.categoryId) {
      const oldCategory = await ctx.db.get(product.categoryId);
      if (oldCategory) {
        const oldCategoryName = oldCategory.name.toLowerCase();
        const wasInFishCategory = oldCategoryName.includes('fish') || oldCategoryName.includes('aquatic');
        const wasInTankCategory = oldCategoryName.includes('tank') || oldCategoryName.includes('aquarium');
        
        // Clean up old category data if category type is changing
        if (wasInFishCategory && !isFishCategory) {
          // Remove fish data when moving out of fish category
          const fishRecord = await ctx.db
            .query("fish")
            .filter((q) => q.eq(q.field("productId"), productId))
            .first();
          if (fishRecord) {
            await ctx.db.delete(fishRecord._id);
          }
        }
        
        if (wasInTankCategory && !isTankCategory) {
          // Remove tank data when moving out of tank category
          const tankRecord = await ctx.db
            .query("tank")
            .filter((q) => q.eq(q.field("productId"), productId))
            .first();
          if (tankRecord) {
            await ctx.db.delete(tankRecord._id);
          }
        }
      }
    }
    
    try {
      // Prepare update data
      const updateData: any = {
        updatedAt: Date.now(),
      };
      
      // Add trimmed string fields
      if (updates.name !== undefined) {
        updateData.name = updates.name.trim();
      }
      if (updates.description !== undefined) {
        updateData.description = updates.description?.trim();
      }
      if (updates.certificate !== undefined) {
        updateData.certificate = updates.certificate?.trim();
      }
      if (updates.badge !== undefined) {
        updateData.badge = updates.badge?.trim();
      }
      if (updates.productStatus !== undefined) {
        updateData.productStatus = updates.productStatus?.trim();
      }
      
      // Add other fields directly
      if (updates.price !== undefined) updateData.price = updates.price;
      if (updates.originalPrice !== undefined) updateData.originalPrice = updates.originalPrice;
      if (updates.categoryId !== undefined) updateData.categoryId = updates.categoryId;
      if (updates.image !== undefined) updateData.image = updates.image;
      if (updates.images !== undefined) updateData.images = updates.images;
      if (updates.sku !== undefined) updateData.sku = updates.sku;
      if (updates.stock !== undefined) updateData.stock = updates.stock;
      if (updates.rating !== undefined) updateData.rating = updates.rating;
      if (updates.reviews !== undefined) updateData.reviews = updates.reviews;
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
      
      // Update the main product
      await ctx.db.patch(productId, updateData);
      
      // Handle fish-specific data
      if (isFishCategory && fishData) {
        // Check if fish record exists
        const existingFishData = await ctx.db
          .query("fish")
          .filter((q) => q.eq(q.field("productId"), productId))
          .first();
        
        if (existingFishData) {
          // Update existing fish data
          await ctx.db.patch(existingFishData._id, {
            scientificName: fishData.scientificName.trim(),
            weight: fishData.weight,
            size: fishData.size,
            temperature: fishData.temperature,
            age: fishData.age,
            phLevel: fishData.phLevel.trim(),
            lifespan: fishData.lifespan.trim(),
            origin: fishData.origin.trim(),
            diet: fishData.diet.trim()
          });
        } else {
          // Create new fish data
          await ctx.db.insert("fish", {
            productId,
            scientificName: fishData.scientificName.trim(),
            weight: fishData.weight,
            size: fishData.size,
            temperature: fishData.temperature,
            age: fishData.age,
            phLevel: fishData.phLevel.trim(),
            lifespan: fishData.lifespan.trim(),
            origin: fishData.origin.trim(),
            diet: fishData.diet.trim()
          });
        }
      }
      
      // Handle tank-specific data
      if (isTankCategory && tankData) {
        // Check if tank record exists
        const existingTankData = await ctx.db
          .query("tank")
          .filter((q) => q.eq(q.field("productId"), productId))
          .first();
        
        if (existingTankData) {
          // Update existing tank data
          await ctx.db.patch(existingTankData._id, {
            tankType: tankData.tankType.trim(),
            material: tankData.material.trim(),
            capacity: tankData.capacity,
            dimensions: tankData.dimensions,
            weight: tankData.weight,
            thickness: tankData.thickness,
            lighting: tankData.lighting,
            filtation: tankData.filtation,
          });
        } else {
          // Create new tank data
          await ctx.db.insert("tank", {
            productId,
            tankType: tankData.tankType.trim(),
            material: tankData.material.trim(),
            capacity: tankData.capacity,
            dimensions: tankData.dimensions,
            weight: tankData.weight,
            thickness: tankData.thickness,
            lighting: tankData.lighting,
            filtation: tankData.filtation,
          });
        }
      }
      
      // Fetch and return the updated product with all related data
      const updatedProduct = await ctx.db.get(productId);
      
      // Optionally fetch related data
      let relatedData = {};
      if (isFishCategory) {
        const fishInfo = await ctx.db
          .query("fish")
          .filter((q) => q.eq(q.field("productId"), productId))
          .first();
        if (fishInfo) {
          relatedData = { fishData: fishInfo };
        }
      } else if (isTankCategory) {
        const tankInfo = await ctx.db
          .query("tank")
          .filter((q) => q.eq(q.field("productId"), productId))
          .first();
        if (tankInfo) {
          relatedData = { tankData: tankInfo };
        }
      }
      
      return {
        ...updatedProduct,
        ...relatedData,
        message: "Product updated successfully",
        categoryType: isFishCategory ? "fish" : isTankCategory ? "tank" : "general"
      };
      
    } catch (error) {
      console.error("Error updating product:", error);
      throw new Error(`Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});