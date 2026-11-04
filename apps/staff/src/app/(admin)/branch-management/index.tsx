import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../../config/api";

const COLORS = {
  blue: "#268ec8",
  green: "#a8ce3a",
  white: "#ffffff",
  textDark: "#1e293b",
  textMuted: "#64748b",
  textLight: "#94a3b8",
  border: "#e2e8f0",
  cardBg: "#ffffff",
  bg: "#f8fafc",
};

interface Branch {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  timings: string;
  photoUrl: string;
  doctorsCount: number;
}

export default function BranchListScreen() {
  const router = useRouter();

  // No hardcoded data in code - purely fetched from backend API
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isHeaderRefreshing, setIsHeaderRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Fetch branches from Web / Server API
  const fetchBranches = useCallback(async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
      setIsHeaderRefreshing(true);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/branches`, {
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setBranches(json.data);
          const now = new Date();
          setLastUpdated(
            now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
          );
        }
      }
    } catch (err) {
      console.log("Branches API connection error:", err);
    } finally {
      setLoading(false);
      if (isManual) {
        setTimeout(() => {
          setRefreshing(false);
          setIsHeaderRefreshing(false);
        }, 400);
      }
    }
  }, []);

  // Initial fetch and automatic background sync every 6 seconds
  useEffect(() => {
    fetchBranches();
    const interval = setInterval(() => {
      fetchBranches();
    }, 6000);
    return () => clearInterval(interval);
  }, [fetchBranches]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* Top Navbar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.blue} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Clinic Branches</Text>
          <View style={styles.syncRow}>
            <View style={styles.syncDot} />
            <Text style={styles.headerSubtitle}>
              {branches.length} Locations {lastUpdated ? `• ${lastUpdated}` : "• Live Sync"}
            </Text>
          </View>
        </View>

        {/* Refresh Button in Header */}
        <TouchableOpacity
          style={styles.headerRefreshBtn}
          onPress={() => fetchBranches(true)}
          activeOpacity={0.7}
          disabled={isHeaderRefreshing}
        >
          {isHeaderRefreshing ? (
            <ActivityIndicator size="small" color={COLORS.blue} />
          ) : (
            <Ionicons name="refresh" size={20} color={COLORS.blue} />
          )}
        </TouchableOpacity>

        {/* Add Branch Button in Header */}
        <TouchableOpacity
          style={styles.headerAddBtn}
          onPress={() => router.push("/(admin)/branch-management/create" as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color={COLORS.white} />
          <Text style={styles.headerAddBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchBranches(true)}
            colors={[COLORS.blue, COLORS.green]}
            tintColor={COLORS.blue}
            title="Pull to refresh branches..."
            titleColor={COLORS.textMuted}
          />
        }
      >
        {/* Loading State */}
        {loading && branches.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={COLORS.blue} />
            <Text style={styles.loadingText}>Fetching branches from database...</Text>
          </View>
        ) : branches.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={54} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>No Branches Registered Yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the &quot;Add&quot; button above or floating button below to create your clinic branch.
            </Text>
          </View>
        ) : (
          /* Branch Cards */
          branches.map((branch) => (
            <View key={branch.id} style={styles.branchCard}>
              {/* Branch Image */}
              <Image
                source={{
                  uri:
                    branch.photoUrl ||
                    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&q=80",
                }}
                style={styles.branchImage}
                resizeMode="cover"
              />

              <View style={styles.cardContent}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.branchName}>{branch.name}</Text>
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>ACTIVE</Text>
                  </View>
                </View>

                {/* Phone */}
                <View style={styles.infoRow}>
                  <Ionicons name="call" size={15} color={COLORS.blue} style={styles.infoIcon} />
                  <Text style={styles.infoText}>{branch.phone}</Text>
                </View>

                {/* Address */}
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={15} color={COLORS.blue} style={styles.infoIcon} />
                  <Text style={styles.infoText} numberOfLines={2}>
                    {branch.address}
                  </Text>
                </View>

                {/* Timings */}
                <View style={styles.infoRow}>
                  <Ionicons name="time" size={15} color={COLORS.green} style={styles.infoIcon} />
                  <Text style={styles.timingsText}>{branch.timings}</Text>
                </View>

                {/* Footer Row */}
                <View style={styles.cardFooter}>
                  <View style={styles.doctorBadge}>
                    <Ionicons name="medkit" size={13} color={COLORS.blue} />
                    <Text style={styles.doctorBadgeText}>{branch.doctorsCount} Doctors Available</Text>
                  </View>
                  <Text style={styles.viewDetailsText}>Manage Staff →</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Floating Add Branch Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/(admin)/branch-management/create" as any)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color={COLORS.white} />
        <Text style={styles.fabText}>Add Branch</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
    gap: 8,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#f0f6fc",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  syncRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 4,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981",
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  headerRefreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f0f6fc",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  headerAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.blue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  headerAddBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 90,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textDark,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  branchCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  branchImage: {
    width: "100%",
    height: 140,
    backgroundColor: "#e2e8f0",
  },
  cardContent: {
    padding: 16,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  branchName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textDark,
    marginRight: 10,
  },
  activeBadge: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  infoIcon: {
    marginRight: 8,
    width: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  timingsText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  doctorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f0f6fc",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  doctorBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.blue,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.blue,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.blue,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: COLORS.blue,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "800",
  },
});
