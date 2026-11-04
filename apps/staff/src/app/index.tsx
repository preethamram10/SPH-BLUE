import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { getAuthToken } from "../services/auth";
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

        // Verify token with backend
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          router.replace("/(auth)/login");
          return;
        }

        const data = await res.json();
        const role = data.user?.role?.toUpperCase();

        switch (role) {
          case "DOCTOR":
            router.replace("/(doctor)");
            break;
          case "RECEPTION":
            router.replace("/(reception)");
            break;
          case "TELECALLER":
            router.replace("/(telecaller)");
            break;
          case "HR":
            router.replace("/(hr)");
            break;
          case "ADMIN":
            router.replace("/(admin)");
            break;
          default:
            router.replace("/(auth)/login");
        }
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
