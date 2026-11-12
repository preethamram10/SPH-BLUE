import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getActiveDoctor, getUserRole, saveActiveDoctor } from "../../services/auth";
import { API_BASE_URL } from "../../config/api";

export type DoctorTabType = "dashboard" | "patient-list" | "packages" | "total-revenue";

interface DoctorBottomNavProps {
  activeTab: DoctorTabType;
}

export const DoctorBottomNav: React.FC<DoctorBottomNavProps> = ({ activeTab }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isHeadDoctor, setIsHeadDoctor] = useState(false);

  useEffect(() => {
    async function checkDoc() {
      try {
        const doc = await getActiveDoctor();
        const role = await getUserRole();
        const name = (doc?.name || doc?.doctorName || "").toLowerCase();
        const specialty = (doc?.specialty || "").toLowerCase();

        let isHead =
          doc?.isHeadDoctor === true ||
          doc?.doctorCategory === "HEAD" ||
          doc?.category === "HEAD" ||
          role === "HEAD_DOCTOR" ||
          role === "ADMIN" ||
          specialty.includes("head") ||
          specialty.includes("chief") ||
          name.includes("prashanth") ||
          name.includes("head") ||
          name.includes("vaidya") ||
          name.includes("chief");

        // If not immediately flagged, check live employee registry
        if (!isHead && doc && (doc.phone || doc.name)) {
          try {
            const cleanPhone = (doc.phone || "").replace(/\D/g, "").slice(-10);
            const res = await fetch(`${API_BASE_URL}/admin/employees?category=DOCTOR`);
            if (res.ok) {
              const data = await res.json();
              const list = Array.isArray(data) ? data : (data.employees || []);
              const match = list.find((e: any) => {
                const ep = (e.phone || "").replace(/\D/g, "").slice(-10);
                return (cleanPhone && ep === cleanPhone) || (e.name && e.name.toLowerCase() === name);
              });
              if (match && match.doctorCategory === "HEAD") {
                isHead = true;
                await saveActiveDoctor({ ...doc, isHeadDoctor: true, doctorCategory: "HEAD" });
              }
            }
          } catch {}
        }

        setIsHeadDoctor(isHead);
      } catch (e) {
        console.warn("Could not check doctor role in bottom nav:", e);
      }
    }
    checkDoc();
  }, []);

  const handlePress = (tab: DoctorTabType, route: string) => {
    if (activeTab === tab) return;
    router.push(route as any);
  };

  const tabs: Array<{
    id: DoctorTabType;
    label: string;
    route: string;
    iconActive: keyof typeof Ionicons.glyphMap;
    iconInactive: keyof typeof Ionicons.glyphMap;
  }> = [
    {
      id: "dashboard",
      label: "Dashboard",
      route: "/(doctor)",
      iconActive: "grid",
      iconInactive: "grid-outline",
    },
    {
      id: "patient-list",
      label: "All Patients",
      route: "/(doctor)/patient-list",
      iconActive: "people",
      iconInactive: "people-outline",
    },
    {
      id: "packages",
      label: "Package Members",
      route: "/(doctor)/packages",
      iconActive: "layers",
      iconInactive: "layers-outline",
    },
    ...(isHeadDoctor
      ? [
          {
            id: "total-revenue" as DoctorTabType,
            label: "Total Revenue",
            route: "/(doctor)/total-revenue",
            iconActive: "stats-chart" as keyof typeof Ionicons.glyphMap,
            iconInactive: "stats-chart-outline" as keyof typeof Ionicons.glyphMap,
          },
        ]
      : []),
  ];

  return (
    <View
      style={[
        styles.navBarContainer,
        {
          paddingBottom: Math.max(insets.bottom, Platform.OS === "ios" ? 14 : 8),
        },
      ]}
    >
      <View style={styles.tabsRow}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabButton}
              onPress={() => handlePress(tab.id, tab.route)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconPill,
                  isActive && styles.iconPillActive,
                ]}
              >
                <Ionicons
                  name={isActive ? tab.iconActive : tab.iconInactive}
                  size={19}
                  color={isActive ? "#0284c7" : "#64748b"}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navBarContainer: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e8edf2",
    paddingTop: 6,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 12,
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 3,
  },
  iconPill: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  iconPillActive: {
    backgroundColor: "#e0f2fe",
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 1,
    textAlign: "center",
  },
  tabLabelActive: {
    color: "#0284c7",
    fontWeight: "800",
  },
  tabLabelInactive: {
    color: "#64748b",
    fontWeight: "500",
  },
});
