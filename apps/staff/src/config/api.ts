/**
 * Central API Configuration for Staff Mobile App
 * 
 * Production VPS Default: http://129.121.170.129/api
 * Local Development: Override via apps/staff/.env with EXPO_PUBLIC_API_URL
 */
const configuredUrl =
  process.env.EXPO_PUBLIC_API_URL || "http://129.121.170.129/api";

export const API_BASE_URL = configuredUrl.replace(/\/+$/, "");

export const FALLBACK_API_BASE_URL = "http://129.121.170.129/api";
