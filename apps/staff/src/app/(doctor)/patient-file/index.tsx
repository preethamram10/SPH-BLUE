import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { DoctorHeader } from "../../../components/doctor/DoctorHeader";
import { DoctorBottomNav } from "../../../components/doctor/DoctorBottomNav";

export default function DoctorPatientFileScreen() {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(doctor)");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <DoctorHeader title="Patient File" onBack={handleBack} />
      <View style={styles.container}>
        <View style={styles.placeholderCard}>
          <Text style={styles.title}>Patient File Module</Text>
          <Text style={styles.subtitle}>
            Ready to configure fields and clinical details.
          </Text>
        </View>
      </View>
      <DoctorBottomNav activeTab="patient-list" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    width: "100%",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
});

