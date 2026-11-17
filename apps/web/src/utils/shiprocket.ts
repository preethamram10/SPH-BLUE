/**
 * Shiprocket Logistics & Courier Integration Service
 * Real-time API v2 integration for Spiritual Homeopathy Clinics
 */

const SHIPROCKET_BASE_URL = "https://apiv2.shiprocket.in/v1/external";

let cachedToken: string | null = null;
let tokenExpiryTime: number = 0; // Milliseconds timestamp

export interface ShiprocketItem {
  name: string;
  sku: string;
  units: number;
  selling_price: number;
  discount?: number;
  tax?: number;
}

export interface CreateShipmentPayload {
  orderId?: string;
  orderDate?: string;
  pickupLocation: string;
  patientName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  items: ShiprocketItem[];
  paymentMethod: "Prepaid" | "COD";
  subTotal: number;
  weightKg: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  comment?: string;
}

export interface NormalizedShipment {
  id: string;
  orderId: string;
  shipmentId: string;
  patientName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  pickupLocation: string;
  courier: string;
  awbNumber: string;
  status: string;
  statusCode: number;
  statusLabel: "Delivered" | "In Transit" | "Pickup Scheduled" | "Dispatched" | "RTO" | "Cancelled" | "Pending";
  date: string;
  amount: number;
  paymentMethod: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  trackingUrl?: string;
}

/**
 * Obtain authenticated Bearer Token for Shiprocket API v2
 */
export async function getShiprocketAuthToken(): Promise<string> {
  const directToken = process.env.SHIPROCKET_API_TOKEN?.trim();
  if (directToken && directToken.length > 20) {
    return directToken;
  }

  // Return cached token if still valid (cached for 9 days, Shiprocket tokens last 10 days)
  const now = Date.now();
  if (cachedToken && tokenExpiryTime > now) {
    return cachedToken;
  }

  const email = process.env.SHIPROCKET_EMAIL?.trim();
  const password = process.env.SHIPROCKET_PASSWORD?.trim();

  if (!email || !password) {
    throw new Error(
      "Shiprocket credentials missing. Please set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD in environment."
    );
  }

  const res = await fetch(`${SHIPROCKET_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok || !data.token) {
    console.error("Shiprocket Login Response Error:", data);
    throw new Error(data.message || data.error || "Failed to authenticate with Shiprocket API.");
  }

  cachedToken = data.token;
  // Cache for 9 days (9 * 24 * 60 * 60 * 1000 ms)
  tokenExpiryTime = now + 9 * 24 * 60 * 60 * 1000;
  return cachedToken as string;
}

/**
 * Map Shiprocket status string to clean UI status labels
 */
export function normalizeShiprocketStatus(
  status: string,
  statusCode?: number
): NormalizedShipment["statusLabel"] {
  const s = (status || "").toUpperCase();
  if (s.includes("DELIVERED") || statusCode === 7) return "Delivered";
  if (s.includes("RTO") || s.includes("RETURN") || statusCode === 13) return "RTO";
  if (s.includes("TRANSIT") || s.includes("OUT FOR DELIVERY") || statusCode === 6 || statusCode === 17)
    return "In Transit";
  if (s.includes("DISPATCH") || s.includes("PICKED UP") || statusCode === 18) return "Dispatched";
  if (s.includes("PICKUP") || s.includes("READY TO SHIP") || statusCode === 3 || statusCode === 4)
    return "Pickup Scheduled";
  if (s.includes("CANCELL") || statusCode === 8) return "Cancelled";
  return "Pending";
}

/**
 * Fetch All Orders from Shiprocket
 */
export async function getShiprocketOrders(params?: {
  page?: number;
  perPage?: number;
  filterBy?: string;
  search?: string;
}): Promise<{ shipments: NormalizedShipment[]; total: number; raw?: any }> {
  try {
    const token = await getShiprocketAuthToken();
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.perPage) query.set("per_page", String(params.perPage || 30));
    if (params?.search) query.set("search", params.search);

    const url = `${SHIPROCKET_BASE_URL}/orders?${query.toString()}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn("Shiprocket getOrders failed:", data);
      return { shipments: [], total: 0, raw: data };
    }

    const orderList: any[] = Array.isArray(data?.data) ? data.data : [];
    const shipments: NormalizedShipment[] = orderList.map((order: any) => {
      const shipment = order.shipments?.[0] || {};
      const statusStr = shipment.status || order.status || "NEW";
      const statusCode = shipment.status_code || order.status_code;

      return {
        id: String(order.id),
        orderId: String(order.channel_order_id || order.id),
        shipmentId: String(shipment.id || ""),
        patientName: order.customer_name || `${order.billing_name || ""}`.trim(),
        phone: order.customer_phone || order.billing_phone || "",
        email: order.customer_email || order.billing_email || "",
        address: [order.billing_address, order.billing_address_2].filter(Boolean).join(", "),
        city: order.billing_city || "",
        state: order.billing_state || "",
        pincode: order.billing_pincode || "",
        pickupLocation: order.pickup_location || "Clinic Primary",
        courier: shipment.courier_name || "Assigned Courier",
        awbNumber: shipment.awb || order.awb_code || "",
        status: statusStr,
        statusCode: statusCode || 0,
        statusLabel: normalizeShiprocketStatus(statusStr, statusCode),
        date: order.created_at ? new Date(order.created_at).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }) : "N/A",
        amount: parseFloat(order.total) || 0,
        paymentMethod: order.payment_method || "Prepaid",
        items: (order.products || []).map((p: any) => ({
          name: p.name || "Homeopathy Medicine",
          quantity: parseInt(p.quantity, 10) || 1,
          price: parseFloat(p.price) || 0,
        })),
        trackingUrl: shipment.awb ? `https://shiprocket.co/tracking/${shipment.awb}` : undefined,
      };
    });

    return {
      shipments,
      total: data.meta?.pagination?.total || shipments.length,
      raw: data,
    };
  } catch (err: any) {
    console.error("Error fetching Shiprocket orders:", err.message);
    return { shipments: [], total: 0, raw: { error: err.message } };
  }
}

/**
 * Create a New Adhoc Shipment in Shiprocket
 */
export async function createShiprocketShipment(payload: CreateShipmentPayload) {
  const token = await getShiprocketAuthToken();

  const orderId = payload.orderId || `SPH-${Date.now().toString().slice(-6)}`;
  const now = new Date();
  const orderDate =
    payload.orderDate ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

  const formattedItems = payload.items.map((it, idx) => ({
    name: it.name || "Homeopathy Remedy Kit",
    sku: it.sku || `MED-SKU-${idx + 1}`,
    units: it.units || 1,
    selling_price: it.selling_price || 100,
    discount: it.discount || 0,
    tax: it.tax || 0,
  }));

  const subTotal =
    payload.subTotal ||
    formattedItems.reduce((sum, item) => sum + item.units * item.selling_price, 0);

  const bodyData = {
    order_id: orderId,
    order_date: orderDate,
    pickup_location: payload.pickupLocation || "Primary",
    billing_customer_name: payload.patientName,
    billing_last_name: "",
    billing_address: payload.address,
    billing_address_2: "",
    billing_city: payload.city,
    billing_pincode: payload.pincode,
    billing_state: payload.state,
    billing_country: "India",
    billing_email: payload.email || "patient@spiritualhomeo.com",
    billing_phone: payload.phone,
    shipping_is_billing: true,
    order_items: formattedItems,
    payment_method: payload.paymentMethod === "COD" ? "COD" : "Prepaid",
    sub_total: subTotal,
    length: payload.lengthCm || 10,
    breadth: payload.breadthCm || 10,
    height: payload.heightCm || 10,
    weight: payload.weightKg || 0.5,
    comment: payload.comment || "Homeopathy Medicines - Fragile Glass Bottles",
  };

  const res = await fetch(`${SHIPROCKET_BASE_URL}/orders/create/adhoc`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bodyData),
  });

  const data = await res.json();
  if (!res.ok || (data.status_code && data.status_code !== 200 && !data.order_id)) {
    console.error("Create Shiprocket order failed:", data);
    throw new Error(data.message || data.error || JSON.stringify(data) || "Shiprocket order creation failed");
  }

  return {
    success: true,
    orderId: data.order_id,
    shipmentId: data.shipment_id,
    awbCode: data.awb_code || "",
    courierName: data.courier_name || "",
    status: data.status || "NEW",
    raw: data,
  };
}

/**
 * Track an AWB in Shiprocket
 */
export async function trackShiprocketShipment(awb: string) {
  const token = await getShiprocketAuthToken();
  const res = await fetch(`${SHIPROCKET_BASE_URL}/courier/track/awb/${encodeURIComponent(awb)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch tracking data.");
  }

  const trackData = data?.tracking_data || {};
  return {
    awb,
    trackStatus: trackData.track_status || 0,
    shipmentStatus: trackData.shipment_status || "",
    courierName: trackData.courier_name || "",
    origin: trackData.origin || "",
    destination: trackData.destination || "",
    currentLocation: trackData.current_location || "",
    expectedDelivery: trackData.expected_date || "",
    activities: Array.isArray(trackData.shipment_track_activities)
      ? trackData.shipment_track_activities
      : [],
    raw: data,
  };
}

/**
 * Fetch Configured Pickup Locations in Shiprocket
 */
export async function getShiprocketPickupLocations() {
  try {
    const token = await getShiprocketAuthToken();
    const res = await fetch(`${SHIPROCKET_BASE_URL}/settings/company/pickup`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    if (res.ok && data?.data?.shipping_address) {
      return data.data.shipping_address.map((loc: any) => ({
        pickupLocation: loc.pickup_location,
        name: loc.name,
        address: loc.address,
        city: loc.city,
        state: loc.state,
        pincode: loc.pin_code,
        phone: loc.phone,
      }));
    }
    return [
      {
        pickupLocation: "Primary",
        name: "Spiritual Homeopathy Primary Clinic",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "500060",
      },
    ];
  } catch (_) {
    return [
      {
        pickupLocation: "Primary",
        name: "Spiritual Homeopathy Primary Clinic",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "500060",
      },
    ];
  }
}
