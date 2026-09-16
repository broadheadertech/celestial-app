/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as lib_authz from "../lib/authz.js";
import type * as lib_password from "../lib/password.js";
import type * as lib_productName from "../lib/productName.js";
import type * as lib_purchaseMode from "../lib/purchaseMode.js";
import type * as lib_reservationUser from "../lib/reservationUser.js";
import type * as lib_slug from "../lib/slug.js";
import type * as lib_throttle from "../lib/throttle.js";
import type * as lib_video from "../lib/video.js";
import type * as migrations_fix_login_method from "../migrations/fix_login_method.js";
import type * as seed from "../seed.js";
import type * as services_admin from "../services/admin.js";
import type * as services_aiInsights from "../services/aiInsights.js";
import type * as services_analytics from "../services/analytics.js";
import type * as services_audit from "../services/audit.js";
import type * as services_auth from "../services/auth.js";
import type * as services_business from "../services/business.js";
import type * as services_cart from "../services/cart.js";
import type * as services_cashAdjustments from "../services/cashAdjustments.js";
import type * as services_categories from "../services/categories.js";
import type * as services_contact from "../services/contact.js";
import type * as services_email from "../services/email.js";
import type * as services_finance from "../services/finance.js";
import type * as services_journal from "../services/journal.js";
import type * as services_maintenance from "../services/maintenance.js";
import type * as services_notifications from "../services/notifications.js";
import type * as services_orders from "../services/orders.js";
import type * as services_payments from "../services/payments.js";
import type * as services_products from "../services/products.js";
import type * as services_reservationPayments from "../services/reservationPayments.js";
import type * as services_reservations from "../services/reservations.js";
import type * as services_session from "../services/session.js";
import type * as services_settings from "../services/settings.js";
import type * as services_stock from "../services/stock.js";
import type * as services_testimonials from "../services/testimonials.js";
import type * as services_tracking from "../services/tracking.js";
import type * as services_users from "../services/users.js";
import type * as services_viewings from "../services/viewings.js";
import type * as services_wishlist from "../services/wishlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  files: typeof files;
  http: typeof http;
  "lib/authz": typeof lib_authz;
  "lib/password": typeof lib_password;
  "lib/productName": typeof lib_productName;
  "lib/purchaseMode": typeof lib_purchaseMode;
  "lib/reservationUser": typeof lib_reservationUser;
  "lib/slug": typeof lib_slug;
  "lib/throttle": typeof lib_throttle;
  "lib/video": typeof lib_video;
  "migrations/fix_login_method": typeof migrations_fix_login_method;
  seed: typeof seed;
  "services/admin": typeof services_admin;
  "services/aiInsights": typeof services_aiInsights;
  "services/analytics": typeof services_analytics;
  "services/audit": typeof services_audit;
  "services/auth": typeof services_auth;
  "services/business": typeof services_business;
  "services/cart": typeof services_cart;
  "services/cashAdjustments": typeof services_cashAdjustments;
  "services/categories": typeof services_categories;
  "services/contact": typeof services_contact;
  "services/email": typeof services_email;
  "services/finance": typeof services_finance;
  "services/journal": typeof services_journal;
  "services/maintenance": typeof services_maintenance;
  "services/notifications": typeof services_notifications;
  "services/orders": typeof services_orders;
  "services/payments": typeof services_payments;
  "services/products": typeof services_products;
  "services/reservationPayments": typeof services_reservationPayments;
  "services/reservations": typeof services_reservations;
  "services/session": typeof services_session;
  "services/settings": typeof services_settings;
  "services/stock": typeof services_stock;
  "services/testimonials": typeof services_testimonials;
  "services/tracking": typeof services_tracking;
  "services/users": typeof services_users;
  "services/viewings": typeof services_viewings;
  "services/wishlist": typeof services_wishlist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
