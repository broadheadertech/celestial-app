import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// Get all categories
export const getCategories = query({
  args: {
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { isActive = true }) => {
    const categories = await ctx.db
      .query("categories")
      .filter((q) => q.eq(q.field("isActive"), isActive))
      .collect();
    
    return categories;
  },
});

// Get category by ID
export const getCategory = query({
  args: {
    categoryId: v.id("categories"),
  },
  handler: async (ctx, { categoryId }) => {
    const category = await ctx.db.get(categoryId);
    
    if (!category) {
      throw new Error("Category not found");
    }
    
    return category;
  },
});

// Create category (admin only)
export const createCategory = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.name.trim()) {
      throw new Error("Category name is required");
    }
    
    // Check if category already exists
    const existingCategory = await ctx.db
      .query("categories")
      .filter((q) => q.eq(q.field("name"), args.name.trim()))
      .first();
    
    if (existingCategory) {
      throw new Error("Category with this name already exists");
    }
    
    const now = Date.now();
    
    const categoryId = await ctx.db.insert("categories", {
      name: args.name.trim(),
      description: args.description,
      image: args.image,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    
    return categoryId;
  },
});

// Update category
export const updateCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { categoryId, ...updates }) => {
    const category = await ctx.db.get(categoryId);
    
    if (!category) {
      throw new Error("Category not found");
    }
    
    if (updates.name !== undefined && !updates.name.trim()) {
      throw new Error("Category name cannot be empty");
    }
    
    const updateData: any = {
      ...updates,
      updatedAt: Date.now(),
    };
    
    if (updates.name) {
      updateData.name = updates.name.trim();
    }
    
    await ctx.db.patch(categoryId, updateData);
    
    return await ctx.db.get(categoryId);
  },
});