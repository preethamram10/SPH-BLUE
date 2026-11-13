import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { getAuthToken, getUserRole, clearAllAuthData } from "../services/auth";
import { getActiveRoute } from "../services/appSession";
import { API_BASE_URL } from "../config/api";

export default function RootIndex() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const token = await getAuthToken();
        if (!token) {
          router.replace("/(auth)/login");
          return;
        }

        // 1. Check offline-first persistent role stored on device
        const savedRole = await getUserRole();
        let targetRoute = "";

        const routeForRole = (r?: string | null) => {
          switch ((r || "").toUpperCase()) {
            case "RECEPTION":
              return "/(reception)";
            case "DOCTOR":
              return "/(doctor)";
            case "TELECALLER":
              return "/(telecaller)";
            case "HR":
              return "/(hr)";
            case "ADMIN":
              return "/(admin)";
            case "STAFF":
              return "/(staff)";
            default:
              return "";
          }
        };

        if (savedRole) {
          targetRoute = routeForRole(savedRole);
        } else {
          // Infer from token string if savedRole wasn't written yet
          const lower = token.toLowerCase();
          if (lower.includes("reception")) targetRoute = "/(reception)";
          else if (lower.includes("admin")) targetRoute = "/(admin)";
          else if (lower.includes("telecaller")) targetRoute = "/(telecaller)";
          else if (lower.includes("hr")) targetRoute = "/(hr)";
          else if (lower.includes("staff")) targetRoute = "/(staff)";
          else if (lower.includes("doctor")) targetRoute = "/(doctor)";
        }

        // Check if resuming from Recent Apps within session window (e.g. Patient History, Book Appointment, etc.)
        const recentSession = await getActiveRoute();
        if (recentSession && recentSession.pathname) {
          router.replace({
            pathname: recentSession.pathname as any,
            params: recentSession.params || {},
          });
          return;
        }

        // 2. If we have a target route from persistent session, navigate immediately
        if (targetRoute) {
          router.replace(targetRoute as any);
          return;
        }

        // 3. Fallback: Query backend session endpoint with short timeout
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 4000);

        try {
          const res = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: ctrl.signal,
          });
          clearTimeout(timeout);

          if (res.ok) {
            const data = await res.json();
            const verifiedRole = data.user?.role?.toUpperCase();
            const verifiedRoute = routeForRole(verifiedRole);
            if (verifiedRoute) {
              router.replace(verifiedRoute as any);
              return;
            }
          }
        } catch {
          // Network failed or timed out — if token exists, fallback to reception rather than logging out
          router.replace("/(reception)" as any);
          return;
        }

        // Only redirect to login if token is explicitly invalid
        await clearAllAuthData();
        router.replace("/(auth)/login");
      } catch (err) {
        router.replace("/(auth)/login");
      } finally {
        setChecking(false);
      }
    }

    checkSession();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#268ec8" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
});
