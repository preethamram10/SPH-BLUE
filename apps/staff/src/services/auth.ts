import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../config/api";

const TOKEN_KEY = "spiritualhomeo_staff_token";
const ACTIVE_BRANCH_KEY = "spiritualhomeo_active_branch";
const ASSIGNED_BRANCH_KEY = "spiritualhomeo_user_assigned_branch";

/**
 * Save active clinic branch details (for branch-specific reception sessions)
 */
export async function saveActiveBranch(branch: any): Promise<void> {
  await SecureStore.setItemAsync(ACTIVE_BRANCH_KEY, JSON.stringify(branch));
  await SecureStore.setItemAsync(ASSIGNED_BRANCH_KEY, JSON.stringify(branch));
}

export async function getActiveBranch(): Promise<any | null> {
  const raw = await SecureStore.getItemAsync(ACTIVE_BRANCH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function getAssignedBranch(): Promise<any | null> {
  const raw = await SecureStore.getItemAsync(ASSIGNED_BRANCH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function removeActiveBranch(): Promise<void> {
  await SecureStore.deleteItemAsync(ACTIVE_BRANCH_KEY);
}

/**
 * Persist the authentication token securely on device keychain/keystore.
 */
export async function saveAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

/**
 * Retrieve the saved authentication token.
 */
export async function getAuthToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

/**
 * Remove the authentication token on logout.
 */
export async function removeAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/**
 * Helper to execute authenticated API calls with Bearer token header.
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

