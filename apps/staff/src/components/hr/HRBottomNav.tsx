import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export type HRTabType = "dashboard" | "leave-approvals" | "total-revenue";

interface HRBottomNavProps {
  activeTab?: HRTabType;
}

export const HRBottomNav: React.FC<HRBottomNavProps> = ({ activeTab = "dashboard" }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handlePress = (tab: HRTabType, route: string) => {
    if (activeTab === tab) return;
    if (tab === "dashboard") {
      router.replace("/(hr)" as any);
      return;
    }
    router.push(route as any);
  };

  return (
    <View
      style={[
        styles.bottomTabBar,
        {
          paddingBottom: Math.max(insets.bottom, Platform.OS === "ios" ? 14 : 8),
        },
      ]}
    >
      {/* 1. Dashboard */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => handlePress("dashboard", "/(hr)")}
        activeOpacity={0.7}
      >
        <Ionicons
          name={activeTab === "dashboard" ? "grid" : "grid-outline"}
          size={21}
          color={activeTab === "dashboard" ? "#0284c7" : "#64748b"}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === "dashboard" ? styles.tabLabelActive : styles.tabLabelInactive,
          ]}
        >
          Dashboard
        </Text>
      </TouchableOpacity>

      {/* 2. Leave Approvals */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => handlePress("leave-approvals", "/(hr)/leave-requests")}
        activeOpacity={0.7}
      >
        <Ionicons
          name={activeTab === "leave-approvals" ? "document-text" : "document-text-outline"}
          size={21}
          color={activeTab === "leave-approvals" ? "#0284c7" : "#64748b"}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === "leave-approvals" ? styles.tabLabelActive : styles.tabLabelInactive,
          ]}
        >
          Leave Approvals
        </Text>
      </TouchableOpacity>

      {/* 3. Total Revenue */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => handlePress("total-revenue", "/(hr)/total-revenue")}
        activeOpacity={0.7}
      >
        <Ionicons
          name={activeTab === "total-revenue" ? "wallet" : "wallet-outline"}
          size={21}
          color={activeTab === "total-revenue" ? "#0284c7" : "#64748b"}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === "total-revenue" ? styles.tabLabelActive : styles.tabLabelInactive,
          ]}
        >
          Total Revenue
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomTabBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  tabLabelActive: {
    color: "#0284c7",
    fontWeight: "800",
  },
  tabLabelInactive: {
    color: "#64748b",
  },
});
