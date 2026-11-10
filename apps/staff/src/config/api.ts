/**
 * Central API Configuration for Staff Mobile App
 * 
 * Local Testing: Replace with your machine's LAN IP (e.g., http://192.168.1.10:3000/api)
 * Production: Change to your domain (e.g., https://api.spiritualhomeo.com/api)
 * 
 * You can also override this by creating apps/staff/.env with:
 * EXPO_PUBLIC_API_URL=http://<YOUR_IP>:3000/api
 */
const configuredUrl =
  process.env.EXPO_PUBLIC_API_URL || "http://192.168.0.115:3000/api";

export const API_BASE_URL = configuredUrl.replace(/\/+$/, "");

