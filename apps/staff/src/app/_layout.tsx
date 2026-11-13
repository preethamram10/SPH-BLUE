import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NetworkProvider } from "../context/NetworkContext";
import { initSessionLifecycleTracker } from "../services/appSession";

export default function RootLayout() {
  useEffect(() => {
    initSessionLifecycleTracker();
  }, []);

  return (
    <SafeAreaProvider>
      <NetworkProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
            animationDuration: 280,
            gestureEnabled: true,
            gestureDirection: "horizontal",
          }}
        />
      </NetworkProvider>
    </SafeAreaProvider>
  );
}
