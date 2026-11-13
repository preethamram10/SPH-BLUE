import * as SecureStore from "expo-secure-store";
import { AppState, AppStateStatus } from "react-native";

export interface ActiveSessionRoute {
  pathname: string;
  params?: Record<string, string>;
  timestamp: number;
}

const KEYS = {
  ACTIVE_ROUTE: "sph_session_active_route",
  IS_BACKGROUNDED: "sph_session_is_backgrounded",
  LAST_HEARTBEAT: "sph_session_last_heartbeat",
  DRAFT_PREFIX: "sph_session_draft_",
  FILTER_PREFIX: "sph_session_filter_",
};

// 30 minute threshold: If app is opened from Recent Apps within 30 mins, restore previous screen & draft
const RECENT_APP_TIMEOUT_MS = 30 * 60 * 1000;

// Fast in-memory cache for zero-latency UI access
const memoryCache: Record<string, any> = {};

/**
 * Save active route & params so when OS kills the app in Recent Apps,
 * resuming returns directly to this screen (e.g., Patient History).
 */
export async function saveActiveRoute(
  pathname: string,
  params?: Record<string, string>
): Promise<void> {
  try {
    const session: ActiveSessionRoute = {
      pathname,
      params,
      timestamp: Date.now(),
    };
    memoryCache[KEYS.ACTIVE_ROUTE] = session;
    await SecureStore.setItemAsync(KEYS.ACTIVE_ROUTE, JSON.stringify(session));
    await recordHeartbeat();
  } catch (err) {
    console.warn("saveActiveRoute failed:", err);
  }
}

/**
 * Retrieve active route if within recent apps session window
 */
export async function getActiveRoute(): Promise<ActiveSessionRoute | null> {
  try {
    let session = memoryCache[KEYS.ACTIVE_ROUTE] as ActiveSessionRoute | undefined;
    if (!session) {
      const raw = await SecureStore.getItemAsync(KEYS.ACTIVE_ROUTE);
      if (raw) {
        session = JSON.parse(raw);
        memoryCache[KEYS.ACTIVE_ROUTE] = session;
      }
    }

    if (!session || !session.pathname) return null;

    // Check if within 30 mins
    const age = Date.now() - (session.timestamp || 0);
    if (age > RECENT_APP_TIMEOUT_MS) {
      await clearActiveRoute();
      return null;
    }

    return session;
  } catch (err) {
    console.warn("getActiveRoute error:", err);
    return null;
  }
}

/**
 * Clear active route (e.g. when user deliberately clicks back or finishes an action)
 */
export async function clearActiveRoute(): Promise<void> {
  try {
    delete memoryCache[KEYS.ACTIVE_ROUTE];
    await SecureStore.deleteItemAsync(KEYS.ACTIVE_ROUTE);
  } catch {}
}

/**
 * Save form draft (e.g. Book Appointment, Old Rx, Patient File)
 */
export async function saveDraft(formKey: string, data: any): Promise<void> {
  try {
    const key = `${KEYS.DRAFT_PREFIX}${formKey}`;
    const payload = {
      data,
      timestamp: Date.now(),
    };
    memoryCache[key] = payload;
    await SecureStore.setItemAsync(key, JSON.stringify(payload));
  } catch (err) {
    console.warn(`saveDraft for ${formKey} failed:`, err);
  }
}

/**
 * Retrieve draft data if within recent app session window
 */
export async function getDraft<T>(formKey: string): Promise<T | null> {
  try {
    const key = `${KEYS.DRAFT_PREFIX}${formKey}`;
    let payload = memoryCache[key];
    if (!payload) {
      const raw = await SecureStore.getItemAsync(key);
      if (raw) {
        payload = JSON.parse(raw);
        memoryCache[key] = payload;
      }
    }

    if (!payload || !payload.data) return null;

    const age = Date.now() - (payload.timestamp || 0);
    if (age > RECENT_APP_TIMEOUT_MS) {
      await clearDraft(formKey);
      return null;
    }

    return payload.data as T;
  } catch (err) {
    console.warn(`getDraft for ${formKey} failed:`, err);
    return null;
  }
}

/**
 * Clear a specific draft (called when form is submitted or deliberately cancelled)
 */
export async function clearDraft(formKey: string): Promise<void> {
  try {
    const key = `${KEYS.DRAFT_PREFIX}${formKey}`;
    delete memoryCache[key];
    await SecureStore.deleteItemAsync(key);
  } catch {}
}

/**
 * Save filter state for lists (Total Revenue, All Patients, Follow-ups)
 */
export async function saveFilters(listKey: string, filters: any): Promise<void> {
  try {
    const key = `${KEYS.FILTER_PREFIX}${listKey}`;
    memoryCache[key] = filters;
    await SecureStore.setItemAsync(key, JSON.stringify(filters));
  } catch (err) {
    console.warn(`saveFilters for ${listKey} failed:`, err);
  }
}

/**
 * Get saved filters
 */
export async function getFilters<T>(listKey: string): Promise<T | null> {
  try {
    const key = `${KEYS.FILTER_PREFIX}${listKey}`;
    if (memoryCache[key]) return memoryCache[key] as T;

    const raw = await SecureStore.getItemAsync(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryCache[key] = parsed;
      return parsed as T;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Clear all session data (called on explicit user logout or clean exit)
 */
export async function clearAllSessionData(): Promise<void> {
  try {
    for (const k of Object.keys(memoryCache)) {
      delete memoryCache[k];
    }
    await clearActiveRoute();
    await SecureStore.deleteItemAsync(KEYS.IS_BACKGROUNDED);
    await SecureStore.deleteItemAsync(KEYS.LAST_HEARTBEAT);
  } catch {}
}

/**
 * Record timestamp heartbeat
 */
export async function recordHeartbeat(): Promise<void> {
  try {
    const now = String(Date.now());
    await SecureStore.setItemAsync(KEYS.LAST_HEARTBEAT, now);
  } catch {}
}

/**
 * Initialize global AppState listener to track backgrounding & resuming
 */
export function initSessionLifecycleTracker() {
  let currentState: string = AppState.currentState || "active";

  AppState.addEventListener("change", async (nextState: AppStateStatus) => {
    if ((currentState === "inactive" || currentState === "background") && nextState === "active") {
      // App came back to foreground from Recent Apps
      await SecureStore.setItemAsync(KEYS.IS_BACKGROUNDED, "false");
      await recordHeartbeat();
    } else if (nextState === "inactive" || nextState === "background") {
      // App is being minimized to Recent Apps
      await SecureStore.setItemAsync(KEYS.IS_BACKGROUNDED, "true");
      await recordHeartbeat();
    }
    currentState = nextState;
  });
}
