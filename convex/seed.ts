import { mutation } from "./_generated/server";

// Secure password hashing (same as auth.ts)
function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt();
  const hash = await sha256(salt + password);
  return `${salt}:${hash}`;
}

export const seedCategories = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const results = [];

    const categories = [
      { name: "Fish", description: "Live aquarium fish — freshwater and saltwater species", image: "/img/category-fish.png" },
      { name: "Tanks", description: "Aquariums, tanks, and enclosures", image: "/img/category-tanks.png" },
      { name: "Accessories", description: "Filters, lights, heaters, decorations, and more", image: "/img/category-accessories.png" },
      { name: "Food", description: "Fish food, supplements, and feeding supplies", image: "/img/category-food.png" },
      { name: "Plants", description: "Live and artificial aquatic plants", image: "/img/category-plants.png" },
    ];

    for (const cat of categories) {
      const existing = await ctx.db
        .query("categories")
        .filter((q) => q.eq(q.field("name"), cat.name))
        .first();

      if (existing) {
        results.push({ name: cat.name, status: "already exists", id: existing._id });
        continue;
      }

      const id = await ctx.db.insert("categories", {
        name: cat.name,
        description: cat.description,
        image: cat.image,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      results.push({ name: cat.name, status: "created", id });
    }

    return results;
  },
});

export const seedUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const results = [];

    const users = [
      {
        email: "superadmin@celestial.com",
        firstName: "Super",
        lastName: "Admin",
        password: "SuperAdmin1",
        role: "super_admin" as const,
      },
      {
        email: "admin@celestial.com",
        firstName: "Admin",
        lastName: "Staff",
        password: "Admin1234",
        role: "admin" as const,
      },
    ];

    for (const user of users) {
      // Check if user already exists
      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", user.email))
        .first();

      if (existing) {
        results.push({ email: user.email, status: "already exists", id: existing._id });
        continue;
      }

      const passwordHash = await hashPassword(user.password);

      const id = await ctx.db.insert("users", {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        passwordHash,
        role: user.role,
        isActive: true,
        loginMethod: "email",
        createdAt: now,
        updatedAt: now,
      });

      results.push({ email: user.email, status: "created", id, role: user.role });
    }

    return results;
  },
});
