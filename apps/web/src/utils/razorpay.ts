export const RAZORPAY_CONFIG = {
  keyId: process.env.RAZORPAY_KEY_ID || "rzp_live_ThkaAZmhaOaMtn",
  keySecret: process.env.RAZORPAY_KEY_SECRET || "tgnDwtrT6dKVvbxFpWPrlnXe",
  vpa: "sseomni9k9v0j291124pos@mairtel",
  merchantName: "SPIRITUAL HOMEO PRIVATE LIMITED",
};

export function getRazorpayAuthHeader(): string {
  const creds = `${RAZORPAY_CONFIG.keyId}:${RAZORPAY_CONFIG.keySecret}`;
  const base64 = Buffer.from(creds).toString("base64");
  return `Basic ${base64}`;
}

