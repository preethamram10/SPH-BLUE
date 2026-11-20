import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

export default function TelecallerAppointmentsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace({
      pathname: "/(telecaller)",
      params: { tab: "book_appointment" },
    } as any);
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" }}>
      <ActivityIndicator size="large" color="#0284c7" />
    </View>
  );
}
