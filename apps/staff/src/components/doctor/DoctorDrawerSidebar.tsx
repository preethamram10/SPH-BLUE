import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Alert,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { clearAllAuthData } from "../../services/auth";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// Minimized compact drawer width
const DRAWER_WIDTH = Math.min(Math.round(SCREEN_WIDTH * 0.58), 210);

interface DoctorDrawerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeRoute: "dashboard" | "patient-list" | "packages" | "total-revenue";
  doctorName?: string;
  branchName?: string;
}

export const DoctorDrawerSidebar: React.FC<DoctorDrawerSidebarProps> = ({
  isOpen,
  onClose,
  activeRoute,
  doctorName = "Dr. Prashanth K Vaidya",
}) => {
  const router = useRouter();
  const isHeadDoctor =
    doctorName.toLowerCase().includes("prashanth") ||
    doctorName.toLowerCase().includes("head");
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  const handleNavigate = (route: string) => {
    onClose();
    setTimeout(() => {
      router.push(route as any);
    }, 120);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to log out of Doctor Portal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          onClose();
          await clearAllAuthData();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <Modal
      transparent
      visible={isOpen}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlayContainer}>
        {/* Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.45],
              }),
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        {/* Minimized Sliding Sidebar */}
        <Animated.View
          style={[
            styles.drawer,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Header Section (Icons, Cabin Active & Branch Removed) */}
          <View style={styles.profileSection}>
            <View style={styles.profileTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.doctorName} numberOfLines={1}>
                  {doctorName}
                </Text>
                <Text style={styles.doctorRole}>Consultant Doctor</Text>
              </View>

              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Clean Navigation Menu Items */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.menuContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionHeader}>MENU</Text>

            <TouchableOpacity
              style={[
                styles.menuItem,
                activeRoute === "dashboard" && styles.menuItemActive,
              ]}
              onPress={() => handleNavigate("/(doctor)")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.menuText,
                  activeRoute === "dashboard" && styles.menuTextActive,
                ]}
              >
                Dashboard
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.menuItem,
                activeRoute === "patient-list" && styles.menuItemActive,
              ]}
              onPress={() => handleNavigate("/(doctor)/patient-list")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.menuText,
                  activeRoute === "patient-list" && styles.menuTextActive,
                ]}
              >
                All Patients
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.menuItem,
                activeRoute === "packages" && styles.menuItemActive,
              ]}
              onPress={() => handleNavigate("/(doctor)/packages")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.menuText,
                  activeRoute === "packages" && styles.menuTextActive,
                ]}
              >
                Packages
              </Text>
            </TouchableOpacity>

            {isHeadDoctor && (
              <TouchableOpacity
                style={[
                  styles.menuItem,
                  activeRoute === "total-revenue" && styles.menuItemActive,
                ]}
                onPress={() => handleNavigate("/(admin)/total-revenue")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.menuText,
                    activeRoute === "total-revenue" && styles.menuTextActive,
                  ]}
                >
                  Total Revenue
                </Text>
                <View style={{ backgroundColor: "#e0f2fe", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: "auto" }}>
                  <Text style={{ fontSize: 9, fontWeight: "900", color: "#0284c7" }}>HEAD</Text>
                </View>
              </TouchableOpacity>
            )}

            {isHeadDoctor && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleNavigate("/(admin)/fee-requests")}
                activeOpacity={0.7}
              >
                <Text style={styles.menuText}>Fee Requests</Text>
                <View style={{ backgroundColor: "#e0f2fe", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: "auto" }}>
                  <Text style={{ fontSize: 9, fontWeight: "900", color: "#0284c7" }}>HEAD</Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.menuItem, { marginTop: 14, backgroundColor: "#fef2f2", borderLeftColor: "#ef4444", borderLeftWidth: 3 }]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={17} color="#ef4444" style={{ marginRight: 8 }} />
              <Text style={[styles.menuText, { color: "#ef4444", fontWeight: "800" }]}>
                Sign Out / Log Out
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Footer Area */}
          <View style={styles.footerContainer}>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000000",
  },
  drawer: {
    width: DRAWER_WIDTH,
    height: "100%",
    backgroundColor: "#ffffff",
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    paddingTop: Platform.OS === "ios" ? 48 : 28,
    paddingBottom: 20,
    display: "flex",
    flexDirection: "column",
    shadowColor: "#000",
    shadowOffset: { width: 3, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 16,
  },
  profileSection: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  profileTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  doctorName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0f172a",
  },
  doctorRole: {
    fontSize: 10.5,
    color: "#64748b",
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginHorizontal: 12,
    marginBottom: 8,
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
  sectionHeader: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 0.6,
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  menuItem: {
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 3,
  },
  menuItemActive: {
    backgroundColor: "#f0f9ff",
    borderLeftWidth: 3,
    borderLeftColor: "#0284c7",
  },
  menuText: {
    fontSize: 12.5,
    fontWeight: "500",
    color: "#334155",
  },
  menuTextActive: {
    color: "#0284c7",
    fontWeight: "700",
  },
  footerContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  logoutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ef4444",
  },
});
