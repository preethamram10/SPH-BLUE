import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export type TelecallerTabType = "followups" | "log_call" | "book_appointment";

interface TelecallerBottomNavProps {
  activeTab: TelecallerTabType;
  onTabChange: (tab: TelecallerTabType) => void;
}

export const TelecallerBottomNav: React.FC<TelecallerBottomNavProps> = ({
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
      {/* 1. Follow-Ups */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onTabChange("followups")}
        activeOpacity={0.7}
      >
        <Ionicons
          name={activeTab === "followups" ? "call" : "call-outline"}
          size={22}
          color={activeTab === "followups" ? "#0284c7" : "#64748b"}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === "followups" ? styles.tabLabelActive : styles.tabLabelInactive,
          ]}
        >
          Follow-Ups
        </Text>
      </TouchableOpacity>

      {/* 2. Log Updates */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onTabChange("log_call")}
        activeOpacity={0.7}
      >
        <Ionicons
          name={activeTab === "log_call" ? "create" : "create-outline"}
          size={22}
          color={activeTab === "log_call" ? "#0284c7" : "#64748b"}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === "log_call" ? styles.tabLabelActive : styles.tabLabelInactive,
          ]}
        >
          Log Updates
        </Text>
      </TouchableOpacity>

      {/* 3. Book Appointment */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onTabChange("book_appointment")}
        activeOpacity={0.7}
      >
        <Ionicons
          name={activeTab === "book_appointment" ? "calendar" : "calendar-outline"}
          size={22}
          color={activeTab === "book_appointment" ? "#0284c7" : "#64748b"}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === "book_appointment" ? styles.tabLabelActive : styles.tabLabelInactive,
          ]}
        >
          Book Appt
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

