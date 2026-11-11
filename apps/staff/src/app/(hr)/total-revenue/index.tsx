import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../../config/api";

const COLORS = {
  blue: "#0284c7",
  blueLight: "#e0f2fe",
  blueDark: "#0369a1",
  green: "#16a34a",
  greenLight: "#dcfce7",
  amber: "#d97706",
  amberLight: "#fef3c7",
  purple: "#7c3aed",
  purpleLight: "#f3e8ff",
  slate50: "#f8fafc",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate600: "#475569",
  slate700: "#334155",
  slate800: "#1e293b",
  slate900: "#0f172a",
  white: "#ffffff",
};

export interface TransactionRecord {
  id: string;
  patientId: string;
  patientName: string;
  phone: string;
  branchName: string;
  doctorName: string;
  revenueSplit: string;
  source: string;
  consultationFee: number;
  medicineFee: number;
  packageFee: number;
  dietFee?: number;
  totalAmount: number;
  paymentMethod: "cash" | "upi" | "card" | "split";
  displayPaymentMethod?: string;
  splitDetails?: { cash?: number; upi?: number; card?: number; counterUpi?: number };
  timestamp: string;
  dateTime: string;
  status: "PAID" | "PENDING" | "COMPLETED";
}

type DatePreset = "TODAY" | "THIS_MONTH" | "LAST_MONTH" | "THIS_YEAR" | "ALL" | "CUSTOM";

export default function HRTotalRevenueScreen() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("THIS_MONTH");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustomRange, setShowCustomRange] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/revenue/transactions`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setTransactions(data);
        }
      }
    } catch (e) {
      console.warn("Error fetching HR transactions on mobile:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const branchList = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.branchName) set.add(t.branchName);
    });
    return Array.from(set);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const thisMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthPrefix = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;

    return transactions.filter((tx) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = tx.patientName?.toLowerCase().includes(q);
        const matchesPhone = tx.phone?.includes(q);
        const matchesId = tx.patientId?.toLowerCase().includes(q);
        const matchesDoc = tx.doctorName?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesId && !matchesDoc) return false;
      }

      if (selectedBranch !== "all") {
        if (tx.branchName?.toLowerCase() !== selectedBranch.toLowerCase()) return false;
      }

      if (selectedMethod !== "all") {
        if (selectedMethod === "upi") {
          const isUpi = tx.paymentMethod === "upi" || tx.displayPaymentMethod?.toLowerCase().includes("upi");
          if (!isUpi) return false;
        } else if (selectedMethod === "cash") {
          const isCash = tx.paymentMethod === "cash" || tx.displayPaymentMethod?.toLowerCase().includes("cash");
          if (!isCash) return false;
        } else if (selectedMethod === "card") {
          const isCard = tx.paymentMethod === "card" || tx.displayPaymentMethod?.toLowerCase().includes("card");
          if (!isCard) return false;
        } else if (selectedMethod === "split") {
          if (tx.paymentMethod !== "split") return false;
        }
      }

      const txDate = tx.timestamp || "";
      if (datePreset === "TODAY") {
        return txDate.startsWith(todayStr);
      } else if (datePreset === "THIS_MONTH") {
        return txDate.startsWith(thisMonthPrefix);
      } else if (datePreset === "LAST_MONTH") {
        return txDate.startsWith(lastMonthPrefix);
      } else if (datePreset === "THIS_YEAR") {
        return txDate.startsWith(String(currentYear));
      } else if (datePreset === "CUSTOM") {
        if (customFrom && txDate < customFrom) return false;
        if (customTo && txDate > customTo) return false;
        return true;
      }
      return true;
    });
  }, [transactions, searchQuery, selectedBranch, selectedMethod, datePreset, customFrom, customTo]);

  const metrics = useMemo(() => {
    let gross = 0;
    let upi = 0;
    let cash = 0;
    let card = 0;

    filteredTransactions.forEach((tx) => {
      const amt = Number(tx.totalAmount) || 0;
      gross += amt;

      if (tx.paymentMethod === "upi" || tx.displayPaymentMethod?.toLowerCase().includes("upi")) {
        upi += amt;
      } else if (tx.paymentMethod === "cash" || tx.displayPaymentMethod?.toLowerCase().includes("cash")) {
        cash += amt;
      } else if (tx.paymentMethod === "card") {
        card += amt;
      } else if (tx.paymentMethod === "split" && tx.splitDetails) {
        cash += Number(tx.splitDetails.cash) || 0;
        upi += (Number(tx.splitDetails.upi) || 0) + (Number(tx.splitDetails.counterUpi) || 0);
        card += Number(tx.splitDetails.card) || 0;
      } else {
        upi += amt;
      }
    });

    return {
      gross,
      upi,
      cash,
      card,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  const branchBreakdown = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {};
    filteredTransactions.forEach((tx) => {
      const b = tx.branchName || "Main Branch";
      if (!map[b]) map[b] = { amount: 0, count: 0 };
      map[b].amount += Number(tx.totalAmount) || 0;
      map[b].count += 1;
    });

    return Object.entries(map).map(([name, data]) => ({
      name,
      amount: data.amount,
      count: data.count,
      share: metrics.gross > 0 ? ((data.amount / metrics.gross) * 100).toFixed(1) + "%" : "0%",
    })).sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, metrics.gross]);

  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage]);

  const handlePresetSelect = (preset: DatePreset) => {
    setDatePreset(preset);
    setCurrentPage(1);
    if (preset === "CUSTOM") {
      setShowCustomRange(true);
    } else {
      setShowCustomRange(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.slate800} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.headerTitle}>Total Clinic Revenue</Text>
            <View style={styles.hrBadge}>
              <Text style={styles.hrBadgeText}>HR</Text>
            </View>
          </View>
          <Text style={styles.headerSub}>Clinic Collections, Methods &amp; Page-Wise Breakdown</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.7}>
          <Ionicons name="refresh" size={20} color={COLORS.blue} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.blue, COLORS.green]}
            tintColor={COLORS.blue}
          />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={18} color={COLORS.slate400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patient, phone, doctor or ID..."
            placeholderTextColor={COLORS.slate400}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setCurrentPage(1);
            }}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={COLORS.slate400} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Date Presets Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
          <View style={styles.presetsRow}>
            {[
              { id: "THIS_MONTH", label: "This Month" },
              { id: "TODAY", label: "Today" },
              { id: "LAST_MONTH", label: "Last Month" },
              { id: "THIS_YEAR", label: "This Year" },
              { id: "ALL", label: "All History" },
              { id: "CUSTOM", label: "Custom Range" },
            ].map((p) => {
              const active = datePreset === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.presetChip, active && styles.presetChipActive]}
                  onPress={() => handlePresetSelect(p.id as DatePreset)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {showCustomRange && (
          <View style={styles.customDateBox}>
            <Text style={styles.customDateTitle}>Filter by Date Range (YYYY-MM-DD):</Text>
            <View style={styles.customInputsRow}>
              <TextInput
                style={styles.customInput}
                placeholder="From: 2026-11-01"
                placeholderTextColor={COLORS.slate400}
                value={customFrom}
                onChangeText={(v) => {
                  setCustomFrom(v);
                  setCurrentPage(1);
                }}
              />
              <Text style={{ color: COLORS.slate400, fontWeight: "700" }}>to</Text>
              <TextInput
                style={styles.customInput}
                placeholder="To: 2026-11-30"
                placeholderTextColor={COLORS.slate400}
                value={customTo}
                onChangeText={(v) => {
                  setCustomTo(v);
                  setCurrentPage(1);
                }}
              />
            </View>
          </View>
        )}

        {/* Secondary Filter Row: Branch */}
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <TouchableOpacity
                style={[styles.smallFilterChip, selectedBranch === "all" && styles.smallFilterChipActive]}
                onPress={() => {
                  setSelectedBranch("all");
                  setCurrentPage(1);
                }}
              >
                <Text style={[styles.smallFilterText, selectedBranch === "all" && styles.smallFilterTextActive]}>
                  All Clinics
                </Text>
              </TouchableOpacity>
              {branchList.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[styles.smallFilterChip, selectedBranch.toLowerCase() === b.toLowerCase() && styles.smallFilterChipActive]}
                  onPress={() => {
                    setSelectedBranch(b);
                    setCurrentPage(1);
                  }}
                >
                  <Text style={[styles.smallFilterText, selectedBranch.toLowerCase() === b.toLowerCase() && styles.smallFilterTextActive]}>
                    {b}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Payment Method Badges */}
        <View style={styles.methodRow}>
          {[
            { id: "all", label: "All Modes" },
            { id: "upi", label: "UPI / Online" },
            { id: "cash", label: "Cash" },
            { id: "card", label: "Card" },
            { id: "split", label: "Split" },
          ].map((m) => {
            const active = selectedMethod === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.methodBadge, active && styles.methodBadgeActive]}
                onPress={() => {
                  setSelectedMethod(m.id);
                  setCurrentPage(1);
                }}
              >
                <Text style={[styles.methodBadgeText, active && styles.methodBadgeTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Gross Revenue Hero Card */}
        <View style={styles.grossHeroCard}>
          <View style={styles.grossHeroTop}>
            <View>
              <Text style={styles.grossHeroSub}>TOTAL REVENUE COLLECTED</Text>
              <Text style={styles.grossHeroValue}>₹{metrics.gross.toLocaleString("en-IN")}</Text>
            </View>
            <View style={styles.grossBadge}>
              <Text style={styles.grossBadgeText}>{metrics.count} txns</Text>
            </View>
          </View>
          <View style={styles.grossHeroDivider} />
          <View style={styles.heroMiniRow}>
            <View style={styles.heroMiniCol}>
              <Text style={styles.heroMiniLabel}>UPI / Online</Text>
              <Text style={[styles.heroMiniVal, { color: COLORS.green }]}>
                ₹{metrics.upi.toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.heroMiniCol}>
              <Text style={styles.heroMiniLabel}>Cash In Hand</Text>
              <Text style={[styles.heroMiniVal, { color: COLORS.amber }]}>
                ₹{metrics.cash.toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.heroMiniCol}>
              <Text style={styles.heroMiniLabel}>Card Swipes</Text>
              <Text style={[styles.heroMiniVal, { color: COLORS.blue }]}>
                ₹{metrics.card.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        </View>

        {/* Branch-Wise Share Summary */}
        <Text style={styles.sectionTitle}>BRANCH REVENUE BREAKDOWN</Text>
        <View style={styles.branchGrid}>
          {branchBreakdown.map((b, idx) => (
            <View key={idx} style={styles.branchCard}>
              <View style={styles.branchCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.branchCardName} numberOfLines={1}>
                    {b.name}
                  </Text>
                  <Text style={styles.branchCardSub}>{b.count} consultations &amp; bills</Text>
                </View>
                <View style={styles.branchShareBadge}>
                  <Text style={styles.branchShareText}>{b.share}</Text>
                </View>
              </View>
              <Text style={styles.branchCardAmt}>₹{b.amount.toLocaleString("en-IN")}</Text>
            </View>
          ))}
        </View>

        {/* Transaction Ledger & Pagination */}
        <View style={styles.ledgerHeaderRow}>
          <Text style={styles.sectionTitle}>
            TRANSACTION LEDGER ({filteredTransactions.length})
          </Text>
          <Text style={styles.pageInfoText}>
            Page {currentPage} of {totalPages}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.blue} />
            <Text style={styles.loadingText}>Loading revenue transactions...</Text>
          </View>
        ) : paginatedTransactions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="receipt-outline" size={38} color={COLORS.slate400} />
            <Text style={styles.emptyTitle}>No transactions found</Text>
            <Text style={styles.emptySub}>Try adjusting date ranges or filters.</Text>
          </View>
        ) : (
          <View style={styles.ledgerList}>
            {paginatedTransactions.map((tx) => {
              const isUpi = tx.paymentMethod === "upi" || tx.displayPaymentMethod?.toLowerCase().includes("upi");
              const isCash = tx.paymentMethod === "cash" || tx.displayPaymentMethod?.toLowerCase().includes("cash");
              return (
                <View key={tx.id} style={styles.txCard}>
                  <View style={styles.txCardLeft}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={styles.txPatientName}>{tx.patientName || "Patient"}</Text>
                      {tx.patientId ? (
                        <View style={styles.txIdBadge}>
                          <Text style={styles.txIdText}>{tx.patientId}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.txMetaText}>
                      {tx.branchName} • {tx.doctorName || "Doctor"}
                    </Text>
                    <Text style={styles.txDateText}>{tx.dateTime || tx.timestamp}</Text>
                  </View>

                  <View style={styles.txCardRight}>
                    <Text style={styles.txAmount}>₹{(tx.totalAmount || 0).toLocaleString("en-IN")}</Text>
                    <View
                      style={[
                        styles.txMethodBadge,
                        isUpi
                          ? styles.txMethodUpi
                          : isCash
                            ? styles.txMethodCash
                            : styles.txMethodOther,
                      ]}
                    >
                      <Text
                        style={[
                          styles.txMethodText,
                          isUpi
                            ? styles.txMethodTextUpi
                            : isCash
                              ? styles.txMethodTextCash
                              : styles.txMethodTextOther,
                        ]}
                      >
                        {tx.displayPaymentMethod || tx.paymentMethod?.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Page-wise Pagination Controls */}
            <View style={styles.paginationBar}>
              <TouchableOpacity
                style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={16} color={currentPage === 1 ? COLORS.slate400 : COLORS.blue} />
                <Text style={[styles.pageBtnText, currentPage === 1 && styles.pageBtnTextDisabled]}>
                  Previous
                </Text>
              </TouchableOpacity>

              <Text style={styles.pageNumberDisplay}>
                {currentPage} / {totalPages}
              </Text>

              <TouchableOpacity
                style={[styles.pageBtn, currentPage >= totalPages && styles.pageBtnDisabled]}
                onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                activeOpacity={0.7}
              >
                <Text style={[styles.pageBtnText, currentPage >= totalPages && styles.pageBtnTextDisabled]}>
                  Next
                </Text>
                <Ionicons name="chevron-forward" size={16} color={currentPage >= totalPages ? COLORS.slate400 : COLORS.blue} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: { padding: 6, marginRight: 8 },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  headerSub: { fontSize: 11, color: "#64748b", marginTop: 1 },
  hrBadge: { backgroundColor: "#f3e8ff", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  hrBadgeText: { fontSize: 9, fontWeight: "900", color: "#7c3aed" },
  refreshBtn: { padding: 6 },
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 40 },

  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 13, color: "#0f172a", padding: 0 },

  presetsScroll: { marginBottom: 10 },
  presetsRow: { flexDirection: "row", gap: 6 },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  presetChipActive: {
    backgroundColor: COLORS.blue,
    borderColor: COLORS.blue,
  },
  presetChipText: { fontSize: 12, fontWeight: "600", color: COLORS.slate700 },
  presetChipTextActive: { color: "#ffffff", fontWeight: "700" },

  customDateBox: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 10,
    marginBottom: 10,
  },
  customDateTitle: { fontSize: 11, fontWeight: "700", color: COLORS.slate700, marginBottom: 6 },
  customInputsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },

  filterRow: { marginBottom: 8 },
  smallFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  smallFilterChipActive: { backgroundColor: "#e0f2fe", borderColor: COLORS.blue },
  smallFilterText: { fontSize: 11, fontWeight: "600", color: COLORS.slate600 },
  smallFilterTextActive: { color: COLORS.blue, fontWeight: "700" },

  methodRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: "#f1f5f9",
  },
  methodBadgeActive: { backgroundColor: "#0f172a" },
  methodBadgeText: { fontSize: 10, fontWeight: "700", color: COLORS.slate600 },
  methodBadgeTextActive: { color: "#ffffff" },

  // Gross Hero Card
  grossHeroCard: {
    backgroundColor: "#0284c7",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  grossHeroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  grossHeroSub: { fontSize: 10, fontWeight: "800", color: "#bae6fd", letterSpacing: 0.8 },
  grossHeroValue: { fontSize: 26, fontWeight: "900", color: "#ffffff", marginTop: 4 },
  grossBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  grossBadgeText: { fontSize: 11, fontWeight: "800", color: "#ffffff" },
  grossHeroDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.2)", marginVertical: 12 },
  heroMiniRow: { flexDirection: "row", justifyContent: "space-between" },
  heroMiniCol: { flex: 1 },
  heroMiniLabel: { fontSize: 10, fontWeight: "700", color: "#bae6fd" },
  heroMiniVal: { fontSize: 13, fontWeight: "800", color: "#ffffff", marginTop: 2 },

  sectionTitle: { fontSize: 11, fontWeight: "800", color: COLORS.slate500, letterSpacing: 0.6, marginBottom: 8 },

  branchGrid: { gap: 8, marginBottom: 16 },
  branchCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
  },
  branchCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  branchCardName: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  branchCardSub: { fontSize: 11, color: "#64748b", marginTop: 2 },
  branchShareBadge: { backgroundColor: "#e0f2fe", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  branchShareText: { fontSize: 10, fontWeight: "800", color: COLORS.blue },
  branchCardAmt: { fontSize: 15, fontWeight: "800", color: COLORS.green, marginTop: 6 },

  ledgerHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  pageInfoText: { fontSize: 11, fontWeight: "700", color: COLORS.slate500 },
  ledgerList: { gap: 8 },
  txCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  txCardLeft: { flex: 1, paddingRight: 8 },
  txPatientName: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  txIdBadge: { backgroundColor: "#f1f5f9", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  txIdText: { fontSize: 9, fontWeight: "800", color: "#64748b" },
  txMetaText: { fontSize: 11, color: "#64748b", marginTop: 2 },
  txDateText: { fontSize: 10, color: "#94a3b8", marginTop: 2 },
  txCardRight: { alignItems: "flex-end" },
  txAmount: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  txMethodBadge: { marginTop: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  txMethodUpi: { backgroundColor: "#dcfce7" },
  txMethodCash: { backgroundColor: "#fef3c7" },
  txMethodOther: { backgroundColor: "#f1f5f9" },
  txMethodText: { fontSize: 9, fontWeight: "800" },
  txMethodTextUpi: { color: "#16a34a" },
  txMethodTextCash: { color: "#d97706" },
  txMethodTextOther: { color: "#475569" },

  paginationBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 10,
    marginTop: 8,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#f0f9ff",
  },
  pageBtnDisabled: { backgroundColor: "#f8fafc" },
  pageBtnText: { fontSize: 12, fontWeight: "700", color: COLORS.blue },
  pageBtnTextDisabled: { color: COLORS.slate400 },
  pageNumberDisplay: { fontSize: 12, fontWeight: "700", color: COLORS.slate700 },

  loadingBox: { padding: 30, alignItems: "center", gap: 10 },
  loadingText: { fontSize: 12, color: COLORS.slate500, fontWeight: "600" },
  emptyBox: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 28,
    alignItems: "center",
  },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a", marginTop: 8 },
  emptySub: { fontSize: 11, color: "#64748b", marginTop: 2 },
});

