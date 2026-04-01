/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as files from "../files.js";
import type * as migrations_fix_login_method from "../migrations/fix_login_method.js";
import type * as seed from "../seed.js";
import type * as services_admin from "../services/admin.js";
import type * as services_analytics from "../services/analytics.js";
import type * as services_auth from "../services/auth.js";
import type * as services_cart from "../services/cart.js";
import type * as services_categories from "../services/categories.js";
import type * as services_email from "../services/email.js";
import type * as services_notifications from "../services/notifications.js";
import type * as services_orders from "../services/orders.js";
import type * as services_products from "../services/products.js";
import type * as services_reservations from "../services/reservations.js";
import type * as services_stock from "../services/stock.js";
import type * as services_users from "../services/users.js";
import type * as services_wishlist from "../services/wishlist.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  files: typeof files;
  "migrations/fix_login_method": typeof migrations_fix_login_method;
  seed: typeof seed;
  "services/admin": typeof services_admin;
  "services/analytics": typeof services_analytics;
  "services/auth": typeof services_auth;
  "services/cart": typeof services_cart;
  "services/categories": typeof services_categories;
  "services/email": typeof services_email;
  "services/notifications": typeof services_notifications;
  "services/orders": typeof services_orders;
  "services/products": typeof services_products;
  "services/reservations": typeof services_reservations;
  "services/stock": typeof services_stock;
  "services/users": typeof services_users;
  "services/wishlist": typeof services_wishlist;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
