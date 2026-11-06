import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { removeAuthToken } from "../../services/auth";

export type ReceptionTabType = "dashboard" | "book-appt" | "patient-list" | "med-req" | "logout";

interface ReceptionBottomNavProps {
  activeTab?: ReceptionTabType;
}

export const ReceptionBottomNav: React.FC<ReceptionBottomNavProps> = ({ activeTab = "dashboard" }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out of Reception?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await removeAuthToken();
          router.replace("/login" as any);
        },
      },
    ]);
  };

  const handlePress = (tab: ReceptionTabType, route: string) => {
    if (tab === "logout") {
      handleLogout();
      return;
    }
    if (activeTab === tab) return;
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
      {/* Dashboard Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => handlePress("dashboard", "/(reception)")}
        activeOpacity={0.7}
      >
        <Ionicons
          name={activeTab === "dashboard" ? "grid" : "grid-outline"}
          size={20}
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

      {/* Book Appt Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => handlePress("book-appt", "/(reception)/appointments/book")}
        activeOpacity={0.7}
      >
        <Ionicons
          name={activeTab === "book-appt" ? "calendar" : "calendar-outline"}
          size={20}
          color={activeTab === "book-appt" ? "#0284c7" : "#64748b"}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === "book-appt" ? styles.tabLabelActive : styles.tabLabelInactive,
          ]}
        >
          Book Appt
        </Text>
      </TouchableOpacity>

      {/* Patient List Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => handlePress("patient-list", "/(reception)/all-patients")}
        activeOpacity={0.7}
      >
        <Ionicons
          name={activeTab === "patient-list" ? "people" : "people-outline"}
          size={20}
          color={activeTab === "patient-list" ? "#0284c7" : "#64748b"}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === "patient-list" ? styles.tabLabelActive : styles.tabLabelInactive,
          ]}
        >
          Patient List
        </Text>
      </TouchableOpacity>

      {/* Med Req / Follow-up Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => handlePress("med-req", "/(reception)/follow-ups")}
        activeOpacity={0.7}
      >
        <Ionicons
          name={activeTab === "med-req" ? "medkit" : "medkit-outline"}
          size={20}
          color={activeTab === "med-req" ? "#0284c7" : "#64748b"}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === "med-req" ? styles.tabLabelActive : styles.tabLabelInactive,
          ]}
        >
          Med Req
        </Text>
      </TouchableOpacity>

      {/* Logout Tab */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => handlePress("logout", "")}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={[styles.tabLabel, styles.tabLabelLogout]}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomTabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  tabLabelActive: {
    color: "#0284c7",
  },
  tabLabelInactive: {
    color: "#64748b",
  },
  tabLabelLogout: {
    color: "#ef4444",
  },
});

