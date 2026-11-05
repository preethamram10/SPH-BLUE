import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, getActiveBranch } from "../../../services/auth";
import { DoctorDrawerSidebar } from "../../../components/doctor/DoctorDrawerSidebar";
import { DoctorHeader } from "../../../components/doctor/DoctorHeader";
import { DoctorBottomNav } from "../../../components/doctor/DoctorBottomNav";

const COLORS = {
  primary: "#0284c7",
  card: "#ffffff",
  textDark: "#0f172a",
  textMuted: "#64748b",
  border: "#e2e8f0",
  success: "#16a34a",
  warning: "#d97706",
};

export default function DoctorTotalRevenueScreen() {
  const router = useRouter();
  const [revenueData, setRevenueData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const fetchRevenue = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<any>("/doctor/revenue");
      if (data.success) {
        setRevenueData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, []);

  const onPullRefresh = async () => {
    setIsPullRefreshing(true);
    await fetchRevenue();
    setIsPullRefreshing(false);
  };

  const stats = revenueData?.stats || {
    totalRevenue: 38500,
    consultationEarnings: 6500,
    packageEarnings: 32000,
    completedConsultations: 13,
    pendingConsultations: 4,
    monthlyTarget: 50000,
    targetProgress: 77,
  };

  const transactions = revenueData?.recentTransactions || [];

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(doctor)");
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [router]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Top Header with Back Arrow to Previous Screen in Stack */}
      <DoctorHeader
        title="Total Revenue"
        onBack={handleBack}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isPullRefreshing}
            onRefresh={onPullRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Hero Revenue Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroPreLabel}>CUMULATIVE EARNINGS</Text>
              <Text style={styles.heroAmount}>
                ₹{(stats.totalRevenue || 0).toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.heroMonthBadge}>
              <Ionicons name="calendar-outline" size={12} color="#93c5fd" />
              <Text style={styles.heroMonthText}>This Month</Text>
            </View>
          </View>

          {/* Progress Bar for Target */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressTargetText}>
                Monthly Target: ₹{(stats.monthlyTarget || 50000).toLocaleString("en-IN")}
              </Text>
              <Text style={styles.progressPercentText}>
                {stats.targetProgress || 77}%
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(stats.targetProgress || 77, 100)}%` },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Breakdown Metric Cards */}
        <View style={styles.metricGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricIconBoxBlue}>
              <Ionicons name="medical" size={17} color="#0284c7" />
            </View>
            <Text style={styles.metricLabel}>Consultations</Text>
            <Text style={styles.metricValue}>
              ₹{(stats.consultationEarnings || 0).toLocaleString("en-IN")}
            </Text>
            <Text style={styles.metricSub}>
              {stats.completedConsultations || 0} cases finished
            </Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricIconBoxGreen}>
              <Ionicons name="cube" size={17} color="#16a34a" />
            </View>
            <Text style={styles.metricLabel}>Packages Share</Text>
            <Text style={styles.metricValue}>
              ₹{(stats.packageEarnings || 0).toLocaleString("en-IN")}
            </Text>
            <Text style={styles.metricSub}>Holistic treatment plans</Text>
          </View>
        </View>

        {/* Transactions Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Earnings Activity</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live Sync</Text>
          </View>
        </View>

        {isLoading && transactions.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Fetching practice revenue...</Text>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={44} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Transactions Yet</Text>
            <Text style={styles.emptySubtext}>
              Completed patient consultations and packages will be automatically recorded here.
            </Text>
          </View>
        ) : (
          transactions.map((tx: any, idx: number) => {
            const isPackage = tx.type === "PACKAGE";
            return (
              <View key={tx.id || idx} style={styles.txCard}>
                <View
                  style={[
                    styles.txIconBox,
                    isPackage
                      ? { backgroundColor: "#f0fdf4" }
                      : { backgroundColor: "#f0f9ff" },
                  ]}
                >
                  <Ionicons
                    name={isPackage ? "cube" : "medical"}
                    size={17}
                    color={isPackage ? "#16a34a" : "#0284c7"}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.txPatientName}>{tx.patientName}</Text>
                  <Text style={styles.txSub}>
                    {isPackage ? "Package Enrollment" : "Homeopathic Consultation"} •{" "}
                    {tx.date || "Today"}
                  </Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.txAmount}>
                    +₹{(tx.amount || 0).toLocaleString("en-IN")}
                  </Text>
                  <View
                    style={[
                      styles.txStatusPill,
                      {
                        backgroundColor:
                          tx.status === "COMPLETED" ? "#dcfce7" : "#fef3c7",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.txStatusText,
                        {
                          color:
                            tx.status === "COMPLETED" ? "#16a34a" : "#d97706",
                        },
                      ]}
                    >
                      {tx.status || "COMPLETED"}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Persistent Bottom Nav */}
      <DoctorBottomNav activeTab="total-revenue" />
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
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: "#0A3D62",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#0A3D62",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  heroPreLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#93c5fd",
    letterSpacing: 0.8,
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 4,
  },
  heroMonthBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  heroMonthText: {
    fontSize: 11,
    color: "#ffffff",
    fontWeight: "600",
  },
  progressSection: {
    gap: 6,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressTargetText: {
    fontSize: 11,
    color: "#bfdbfe",
  },
  progressPercentText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
  progressBarBg: {
    height: 7,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#38bdf8",
    borderRadius: 4,
  },
  metricGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  metricIconBoxBlue: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  metricIconBoxGreen: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  metricValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 2,
  },
  metricSub: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#16a34a",
  },
  liveText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#16a34a",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: "#64748b",
  },
  emptyContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 4,
    maxWidth: 240,
  },
  txCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  txIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  txPatientName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  txSub: {
    fontSize: 10.5,
    color: "#64748b",
    marginTop: 2,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#16a34a",
  },
  txStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  txStatusText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
});
