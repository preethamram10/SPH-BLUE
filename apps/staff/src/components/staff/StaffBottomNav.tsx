import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export type StaffTabType = "attendance" | "payroll" | "leaves";

interface StaffBottomNavProps {
  activeTab: StaffTabType;
  onTabChange: (tab: StaffTabType) => void;
}

export const StaffBottomNav: React.FC<StaffBottomNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bottomTabBar,
        {
          paddingBottom: Math.max(insets.bottom, Platform.OS === "ios" ? 14 : 8),
        },
      ]}
    >
      {/* 1. Attendance / Dashboard */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onTabChange("attendance")}
        activeOpacity={0.7}
      >
        <Ionicons
          name={activeTab === "attendance" ? "finger-print" : "finger-print-outline"}
          size={22}
          color={activeTab === "attendance" ? "#0284c7" : "#64748b"}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === "attendance" ? styles.tabLabelActive : styles.tabLabelInactive,
          ]}
        >
          Attendance
        </Text>
      </TouchableOpacity>

      {/* 2. Payroll */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onTabChange("payroll")}
        activeOpacity={0.7}
      >
        <Ionicons
          name={activeTab === "payroll" ? "wallet" : "wallet-outline"}
          size={22}
          color={activeTab === "payroll" ? "#0284c7" : "#64748b"}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === "payroll" ? styles.tabLabelActive : styles.tabLabelInactive,
          ]}
        >
          Payroll
        </Text>
      </TouchableOpacity>

      {/* 3. Leaves */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onTabChange("leaves")}
        activeOpacity={0.7}
      >
        <Ionicons
          name={activeTab === "leaves" ? "calendar" : "calendar-outline"}
          size={22}
          color={activeTab === "leaves" ? "#0284c7" : "#64748b"}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === "leaves" ? styles.tabLabelActive : styles.tabLabelInactive,
          ]}
        >
          Leaves
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
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: "#0284c7",
    fontWeight: "700",
  },
  tabLabelInactive: {
    color: "#64748b",
    fontWeight: "500",
  },
});

