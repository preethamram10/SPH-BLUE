import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../config/api";
import { getBranchPhone } from "../utils/branchPhone";

const TOKEN_KEY = "spiritualhomeo_staff_token";
const ACTIVE_BRANCH_KEY = "spiritualhomeo_active_branch";
const ASSIGNED_BRANCH_KEY = "spiritualhomeo_user_assigned_branch";
const ACTIVE_DOCTOR_KEY = "spiritualhomeo_active_doctor";
const ACTIVE_STAFF_KEY = "spiritualhomeo_active_staff";
const USER_ROLE_KEY = "spiritualhomeo_user_role";

/**
 * Persist user role across app reloads and restarts
 */
export async function saveUserRole(role: string): Promise<void> {
  await SecureStore.setItemAsync(USER_ROLE_KEY, role.toUpperCase());
}

export async function getUserRole(): Promise<string | null> {
  return await SecureStore.getItemAsync(USER_ROLE_KEY);
}

export async function removeUserRole(): Promise<void> {
  await SecureStore.deleteItemAsync(USER_ROLE_KEY);
}

/**
 * Wipe all authentication & session data on explicit user logout
 */
export async function clearAllAuthData(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {}
  try {
    await SecureStore.deleteItemAsync(USER_ROLE_KEY);
  } catch {}
  try {
    await SecureStore.deleteItemAsync(ACTIVE_BRANCH_KEY);
  } catch {}
  try {
    await SecureStore.deleteItemAsync(ASSIGNED_BRANCH_KEY);
  } catch {}
  try {
    await SecureStore.deleteItemAsync(ACTIVE_DOCTOR_KEY);
  } catch {}
  try {
    await SecureStore.deleteItemAsync(ACTIVE_STAFF_KEY);
  } catch {}
}

/**
 * Save active staff details
 */
export async function saveActiveStaff(staff: any): Promise<void> {
  await SecureStore.setItemAsync(ACTIVE_STAFF_KEY, JSON.stringify(staff));
}

export async function getActiveStaff(): Promise<any | null> {
  const raw = await SecureStore.getItemAsync(ACTIVE_STAFF_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function removeActiveStaff(): Promise<void> {
  await SecureStore.deleteItemAsync(ACTIVE_STAFF_KEY);
}

/**
 * Save active doctor details (for doctor sessions)
 */
export async function saveActiveDoctor(doctor: any): Promise<void> {
  await SecureStore.setItemAsync(ACTIVE_DOCTOR_KEY, JSON.stringify(doctor));
}

export async function getActiveDoctor(): Promise<any | null> {
  const raw = await SecureStore.getItemAsync(ACTIVE_DOCTOR_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function removeActiveDoctor(): Promise<void> {
  await SecureStore.deleteItemAsync(ACTIVE_DOCTOR_KEY);
}

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
    const branch = JSON.parse(raw);
    if (branch && branch.name) {
      branch.phone = getBranchPhone(branch.name, branch.phone);
    }
    return branch;
  } catch {
    return null;
  }
}

export async function getAssignedBranch(): Promise<any | null> {
  const raw = await SecureStore.getItemAsync(ASSIGNED_BRANCH_KEY);
  if (!raw) return null;
  try {
    const branch = JSON.parse(raw);
    if (branch && branch.name) {
      branch.phone = getBranchPhone(branch.name, branch.phone);
    }
    return branch;
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

  // 15-second timeout safeguard for network resilience on mobile
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Network request timed out. Please check clinic connection and try again.");
    }
    throw err;
  }
}

