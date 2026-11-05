import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator, AppState, AppStateStatus } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config/api";

interface NetworkContextType {
  isOnline: boolean;
  isChecking: boolean;
  wasOffline: boolean;
  checkConnection: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextType>({
  isOnline: true,
  isChecking: false,
  wasOffline: false,
  checkConnection: async () => true,
});

export const useNetwork = () => useContext(NetworkContext);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [showReconnectedBanner, setShowReconnectedBanner] = useState<boolean>(false);

  // Animation values for smooth slide-down banner
  const bannerAnim = useRef(new Animated.Value(-80)).current;
  const isOnlineRef = useRef(true);

  // Fast network probe function
  const probeNetwork = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      // Probe our fast /api/health endpoint or fallback domain
      const probeUrl = `${API_BASE_URL}/health?_t=${Date.now()}`;
      const res = await fetch(probeUrl, {
        method: "GET",
        signal: controller.signal,
        headers: { "Cache-Control": "no-cache" },
      });
      clearTimeout(timeoutId);

      return res.ok || res.status < 500;
    } catch {
      // If our server isn't reachable, try a secondary public fallback to distinguish internet loss vs server down
      try {
        const fallbackCtrl = new AbortController();
        const fbTimeout = setTimeout(() => fallbackCtrl.abort(), 3500);
        const fbRes = await fetch("https://clients3.google.com/generate_204", {
          method: "HEAD",
          signal: fallbackCtrl.signal,
        });
        clearTimeout(fbTimeout);
        return fbRes.status === 204 || fbRes.ok;
      } catch {
        return false;
      }
    }
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    const online = await probeNetwork();
    setIsChecking(false);

    if (online) {
      if (!isOnlineRef.current) {
        // Just came back online!
        setWasOffline(true);
        setShowReconnectedBanner(true);
        setTimeout(() => setShowReconnectedBanner(false), 2500);
      }
      isOnlineRef.current = true;
      setIsOnline(true);
    } else {
      isOnlineRef.current = false;
      setIsOnline(false);
    }

    return online;
  }, [probeNetwork]);

  // Initial check on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // AppState listener for instant Wi-Fi <-> Mobile Data handover
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        // When user switches network in quick settings or returns to app, probe immediately
        checkConnection();
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, [checkConnection]);

  // Periodic heartbeat probe every 6 seconds to detect sudden disconnects
  useEffect(() => {
    const timer = setInterval(() => {
      probeNetwork().then((online) => {
        if (online !== isOnlineRef.current) {
          if (online && !isOnlineRef.current) {
            setShowReconnectedBanner(true);
            setTimeout(() => setShowReconnectedBanner(false), 2500);
          }
          isOnlineRef.current = online;
          setIsOnline(online);
        }
      });
    }, 6000);

    return () => clearInterval(timer);
  }, [probeNetwork]);

  // Animate banner when offline or reconnected
  useEffect(() => {
    if (!isOnline || showReconnectedBanner) {
      Animated.spring(bannerAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    } else {
      Animated.timing(bannerAnim, {
        toValue: -80,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isOnline, showReconnectedBanner, bannerAnim]);

  return (
    <NetworkContext.Provider value={{ isOnline, isChecking, wasOffline, checkConnection }}>
      <View style={{ flex: 1 }}>
        {children}

        {/* TOP NETWORK STATUS BANNER */}
        <Animated.View
          style={[
            styles.bannerContainer,
            { transform: [{ translateY: bannerAnim }] },
            !isOnline ? styles.offlineBanner : styles.onlineBanner,
          ]}
        >
          <View style={styles.bannerContent}>
            <View style={styles.bannerLeft}>
              <Ionicons
                name={!isOnline ? "cloud-offline-outline" : "checkmark-circle-outline"}
                size={18}
                color="#ffffff"
              />
              <View>
                <Text style={styles.bannerTitle}>
                  {!isOnline ? "No Internet Connection" : "Back Online"}
                </Text>
                <Text style={styles.bannerSubtitle}>
                  {!isOnline
                    ? "Check Wi-Fi or Mobile Data connection"
                    : "Network handover connected"}
                </Text>
              </View>
            </View>

            {!isOnline && (
              <TouchableOpacity
                onPress={() => checkConnection()}
                style={styles.retryBtn}
                activeOpacity={0.8}
                disabled={isChecking}
              >
                {isChecking ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="reload" size={12} color="#ffffff" />
                    <Text style={styles.retryBtnText}>Retry</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </NetworkContext.Provider>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    paddingTop: 44, // Safe area top inset
    paddingBottom: 10,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 8,
  },
  offlineBanner: {
    backgroundColor: "#e11d48", // Rose Red
  },
  onlineBanner: {
    backgroundColor: "#16a34a", // Emerald Green
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  bannerTitle: {
    color: "#ffffff",
    fontSize: 12.5,
    fontWeight: "800",
  },
  bannerSubtitle: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  retryBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
});

