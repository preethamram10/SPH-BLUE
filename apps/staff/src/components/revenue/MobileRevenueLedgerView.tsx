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
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../config/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const REVENUE_COLORS = {
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
  slate300: "#cbd5e1",
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
  paymentMethod: "cash" | "upi" | "card" | "split" | "counter_upi";
  displayPaymentMethod?: string;
  splitDetails?: { cash?: number; upi?: number; card?: number; counterUpi?: number };
  timestamp: string;
  dateTime: string;
  status: "PAID" | "PENDING" | "COMPLETED";
}

export type DatePreset = "THIS_MONTH" | "PREV_MONTH" | "THIS_YEAR" | "PREV_YEAR" | "TODAY" | "CUSTOM" | "ALL";

interface MobileRevenueLedgerViewProps {
  role: "ADMIN" | "HR" | "DOCTOR";
  doctorFilterName?: string;
  onBack?: () => void;
  headerTitle?: string;
  bottomNav?: React.ReactNode;
}

// Helper to normalize branch names for reliable comparisons and deduplication
const normalizeBranchKey = (name: string): string => {
  let c = (name || "")
    .toLowerCase()
    .replace(/spiritual|homeopathy|clinic|branch/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
  if (c === "kpb") c = "kphb";
  return c;
};

export function MobileRevenueLedgerView({
  role,
  doctorFilterName,
  onBack,
  headerTitle = "Total Revenue",
  bottomNav,
}: MobileRevenueLedgerViewProps) {
  const router = useRouter();

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [allRegisteredBranches, setAllRegisteredBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters (Clean & Compact)
  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("THIS_MONTH");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedDoctor, setSelectedDoctor] = useState(doctorFilterName || "all");
  const [selectedMethod, setSelectedMethod] = useState("all");
  const [selectedSplitType, setSelectedSplitType] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [selectedAmountRange, setSelectedAmountRange] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState<number>(20);

  // Fetch registered clinic branches from official API
  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/branches`);
      if (res.ok) {
        const json = await res.json();
        const branchArray = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        const names = branchArray.map((b: any) => b.name).filter(Boolean);
        if (names.length > 0) {
          setAllRegisteredBranches(names);
        }
      }
    } catch (e) {
      console.warn("Error fetching registered branches:", e);
    }
  }, []);

  // Fetch full live database transactions
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
      console.warn("Error fetching transactions on mobile revenue view:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
    fetchTransactions();
  }, [fetchBranches, fetchTransactions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBranches();
    fetchTransactions();
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setDatePreset("THIS_MONTH");
    setSelectedBranch("all");
    setSelectedDoctor(doctorFilterName || "all");
    setSelectedMethod("all");
    setSelectedSplitType("all");
    setSelectedSource("all");
    setSelectedAmountRange("all");
    setCustomFrom("");
    setCustomTo("");
    setCurrentPage(1);
  };

  // Active filter count (excluding default search/this_month)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedBranch !== "all") count++;
    if (selectedDoctor !== "all" && !doctorFilterName) count++;
    if (selectedMethod !== "all") count++;
    if (selectedSplitType !== "all") count++;
    if (selectedSource !== "all") count++;
    if (selectedAmountRange !== "all") count++;
    if (datePreset === "CUSTOM") count++;
    return count;
  }, [selectedBranch, selectedDoctor, doctorFilterName, selectedMethod, selectedSplitType, selectedSource, selectedAmountRange, datePreset]);

  // Comprehensive branch list from registered branches + transactions (strictly deduplicated by normalized key)
  const combinedBranchList = useMemo(() => {
    const map = new Map<string, string>();

    // 1. Registered branches from backend API (highest priority for official names)
    allRegisteredBranches.forEach((b) => {
      const k = normalizeBranchKey(b);
      if (k) map.set(k, b);
    });

    // 2. Transaction branch names
    transactions.forEach((t) => {
      if (t.branchName && t.branchName !== "Clinic Branch") {
        const k = normalizeBranchKey(t.branchName);
        if (k && !map.has(k)) {
          map.set(k, t.branchName);
        }
      }
    });

    // 3. Fallbacks only if list is empty
    if (map.size === 0) {
      ["Kphb Branch", "Chandanagar Branch", "Dilshuknagar Branch", "Nallagandla Branch"].forEach((b) => {
        map.set(normalizeBranchKey(b), b);
      });
    }

    return Array.from(map.values());
  }, [allRegisteredBranches, transactions]);

  // Doctor List
  const doctorList = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.doctorName) set.add(t.doctorName);
    });
    return Array.from(set);
  }, [transactions]);

  // Amount Range Check
  const checkAmountRange = (amt: number, rangeStr: string): boolean => {
    if (rangeStr === "all") return true;
    switch (rangeStr) {
      case "500-1000":
        return amt >= 500 && amt <= 1000;
      case "1000-2000":
        return amt >= 1000 && amt <= 2000;
      case "2000-3000":
        return amt >= 2000 && amt <= 3000;
      case "3000-5000":
        return amt >= 3000 && amt <= 5000;
      case "5000+":
        return amt > 5000;
      default:
        return true;
    }
  };

  // Filter Engine
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const thisMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevMonthPrefix = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;
    const prevYearPrefix = String(currentYear - 1);

    return transactions.filter((tx) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = tx.patientName?.toLowerCase().includes(q);
        const matchesPhone = tx.phone?.includes(q);
        const matchesId = tx.patientId?.toLowerCase().includes(q);
        const matchesDoc = tx.doctorName?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesId && !matchesDoc) return false;
      }

      // 2. Branch Filter (Matches normalized branch key)
      if (selectedBranch !== "all") {
        const targetKey = normalizeBranchKey(selectedBranch);
        const txKey = normalizeBranchKey(tx.branchName || "");
        if (targetKey !== txKey) return false;
      }

      // 3. Doctor Filter
      const activeDoctorFilter = doctorFilterName || (selectedDoctor !== "all" ? selectedDoctor : null);
      if (activeDoctorFilter && activeDoctorFilter !== "all") {
        if (!tx.doctorName?.toLowerCase().includes(activeDoctorFilter.toLowerCase())) return false;
      }

      // 4. Payment Method Filter (Separate Counter UPI from Online UPI)
      if (selectedMethod !== "all") {
        const disp = (tx.displayPaymentMethod || "").toLowerCase();
        if (selectedMethod === "counter_upi") {
          const isCounter = tx.paymentMethod === "counter_upi" || disp.includes("counter");
          if (!isCounter) return false;
        } else if (selectedMethod === "upi" || selectedMethod === "online_upi") {
          const isOnline = (tx.paymentMethod === "upi" || disp.includes("online") || disp.includes("qr")) && !disp.includes("counter");
          if (!isOnline) return false;
        } else if (selectedMethod === "cash") {
          const isCash = tx.paymentMethod === "cash" || disp.includes("cash");
          if (!isCash) return false;
        } else if (selectedMethod === "card") {
          const isCard = tx.paymentMethod === "card" || disp.includes("card");
          if (!isCard) return false;
        } else if (selectedMethod === "split") {
          if (tx.paymentMethod !== "split" && !disp.includes("split")) return false;
        }
      }

      // 5. Revenue Split Filter
      if (selectedSplitType !== "all") {
        const sLower = (tx.revenueSplit || "").toLowerCase();
        if (selectedSplitType === "Consultation" && !sLower.includes("consultation")) return false;
        if (selectedSplitType === "Consultation & Medicine" && !sLower.includes("medicine")) return false;
        if (selectedSplitType === "Package" && !sLower.includes("package")) return false;
        if (selectedSplitType === "Diet Plan" && !sLower.includes("diet")) return false;
      }

      // 6. Source Filter
      if (selectedSource !== "all") {
        if ((tx.source || "Walk-in").toLowerCase() !== selectedSource.toLowerCase()) return false;
      }

      // 7. Amount Range Filter
      if (!checkAmountRange(Number(tx.totalAmount) || 0, selectedAmountRange)) {
        return false;
      }

      // 8. Date Presets Filter
      const cleanDate = (tx.timestamp || "").replace(/\//g, "-").trim();
      const parts = cleanDate.split("-");
      let txDate = cleanDate;
      if (parts.length === 3 && parts[2].length === 4) {
        txDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      } else if (parts.length === 3 && parts[0].length === 4) {
        txDate = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      }

      if (datePreset === "TODAY") {
        return txDate === todayStr;
      } else if (datePreset === "THIS_MONTH") {
        return txDate.startsWith(thisMonthPrefix);
      } else if (datePreset === "PREV_MONTH") {
        return txDate.startsWith(prevMonthPrefix);
      } else if (datePreset === "THIS_YEAR") {
        return txDate.startsWith(String(currentYear));
      } else if (datePreset === "PREV_YEAR") {
        return txDate.startsWith(prevYearPrefix);
      } else if (datePreset === "CUSTOM") {
        if (customFrom && txDate < customFrom) return false;
        if (customTo && txDate > customTo) return false;
        return true;
      }

      return true;
    });
  }, [
    transactions,
    searchQuery,
    selectedBranch,
    selectedDoctor,
    doctorFilterName,
    selectedMethod,
    selectedSplitType,
    selectedSource,
    selectedAmountRange,
    datePreset,
    customFrom,
    customTo,
  ]);

  // Aggregate Metrics (Grand Total & Mode Summary)
  const metrics = useMemo(() => {
    let grandTotal = 0;
    let cashTotal = 0;
    let counterUpiTotal = 0;
    let onlineUpiTotal = 0;
    let cardTotal = 0;

    let splitConsultation = 0;
    let splitConsultationMed = 0;
    let splitCarePackage = 0;
    let splitDietPlan = 0;

    filteredTransactions.forEach((tx) => {
      const amt = Number(tx.totalAmount) || 0;
      grandTotal += amt;

      const disp = (tx.displayPaymentMethod || "").toLowerCase();
      if (tx.paymentMethod === "cash" || disp.includes("cash")) {
        cashTotal += amt;
      } else if (tx.paymentMethod === "counter_upi" || disp.includes("counter")) {
        counterUpiTotal += amt;
      } else if (tx.paymentMethod === "upi" || disp.includes("online") || disp.includes("qr")) {
        onlineUpiTotal += amt;
      } else if (tx.paymentMethod === "card" || disp.includes("card")) {
        cardTotal += amt;
      } else if (tx.paymentMethod === "split" && tx.splitDetails) {
        cashTotal += Number(tx.splitDetails.cash) || 0;
        onlineUpiTotal += Number(tx.splitDetails.upi) || 0;
        counterUpiTotal += Number(tx.splitDetails.counterUpi) || 0;
        cardTotal += Number(tx.splitDetails.card) || 0;
      } else {
        counterUpiTotal += amt;
      }

      const sLower = (tx.revenueSplit || "").toLowerCase();
      if (sLower.includes("package") || (tx.packageFee && tx.packageFee > 0)) {
        splitCarePackage += amt;
      } else if (tx.consultationFee > 0 || tx.medicineFee > 0 || (tx.dietFee && tx.dietFee > 0)) {
        if (tx.dietFee && tx.dietFee > 0) splitDietPlan += tx.dietFee;
        if (tx.medicineFee > 0) splitConsultationMed += tx.medicineFee;
        if (tx.consultationFee > 0) splitConsultation += tx.consultationFee;
      } else {
        if (sLower.includes("diet")) splitDietPlan += amt;
        else if (sLower.includes("medicine")) splitConsultationMed += amt;
        else splitConsultation += amt;
      }
    });

    return {
      grandTotal,
      cashTotal,
      counterUpiTotal,
      onlineUpiTotal,
      cardTotal,
      splitConsultation,
      splitConsultationMed,
      splitCarePackage,
      splitDietPlan,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Branch Breakdown across ALL clinics (strictly deduplicated by normalized key)
  const branchBreakdown = useMemo(() => {
    const map: Record<string, { name: string; amount: number; count: number }> = {};

    // Seed every branch in combinedBranchList using normalized key
    combinedBranchList.forEach((b) => {
      const k = normalizeBranchKey(b);
      map[k] = { name: b, amount: 0, count: 0 };
    });

    filteredTransactions.forEach((tx) => {
      const k = normalizeBranchKey(tx.branchName || "Main Branch");
      if (!map[k]) {
        map[k] = { name: tx.branchName || "Main Branch", amount: 0, count: 0 };
      }
      map[k].amount += Number(tx.totalAmount) || 0;
      map[k].count += 1;
    });

    return Object.values(map)
      .map((data) => ({
        name: data.name,
        amount: data.amount,
        count: data.count,
        share: metrics.grandTotal > 0 ? ((data.amount / metrics.grandTotal) * 100).toFixed(1) + "%" : "0%",
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [combinedBranchList, filteredTransactions, metrics.grandTotal]);

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / rowsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedTransactions = useMemo(() => {
    const start = (safeCurrentPage - 1) * rowsPerPage;
    return filteredTransactions.slice(start, start + rowsPerPage);
  }, [filteredTransactions, safeCurrentPage, rowsPerPage]);

  const handleBackAction = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(role === "DOCTOR" ? "/(doctor)" : role === "HR" ? "/(hr)" : "/(admin)");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackAction} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={REVENUE_COLORS.slate800} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>Live</Text>
            </View>
          </View>
          <Text style={styles.headerSub}>
            Real-Time Clinic Collections & Ledger
          </Text>
        </View>

        <TouchableOpacity onPress={fetchTransactions} style={styles.iconActionBtn} disabled={loading}>
          <Ionicons name="refresh" size={17} color={loading ? REVENUE_COLORS.slate400 : REVENUE_COLORS.blue} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[REVENUE_COLORS.blue]} />}
      >
        {/* 1. HERO TOTAL REVENUE CARD (CLEAN & PROMINENT) */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroPreLabel}>TOTAL REVENUE COLLECTED</Text>
              <Text style={styles.heroAmount}>₹{metrics.grandTotal.toLocaleString("en-IN")}</Text>
            </View>
            <View style={styles.heroCountPill}>
              <Ionicons name="receipt-outline" size={12} color="#0284c7" />
              <Text style={styles.heroCountText}>{metrics.count} bills</Text>
            </View>
          </View>

          {/* Mini Inline Mode Summary (Compact Strip - Separate Counter UPI and Online UPI) */}
          <View style={styles.heroStrip}>
            <View style={styles.heroStripCol}>
              <Text style={styles.heroStripLabel}>COUNTER UPI</Text>
              <Text style={styles.heroStripVal}>₹{metrics.counterUpiTotal.toLocaleString("en-IN")}</Text>
            </View>
            <View style={styles.heroStripDivider} />
            <View style={styles.heroStripCol}>
              <Text style={styles.heroStripLabel}>ONLINE UPI</Text>
              <Text style={styles.heroStripVal}>₹{metrics.onlineUpiTotal.toLocaleString("en-IN")}</Text>
            </View>
            <View style={styles.heroStripDivider} />
            <View style={styles.heroStripCol}>
              <Text style={styles.heroStripLabel}>CASH</Text>
              <Text style={styles.heroStripVal}>₹{metrics.cashTotal.toLocaleString("en-IN")}</Text>
            </View>
            <View style={styles.heroStripDivider} />
            <View style={styles.heroStripCol}>
              <Text style={styles.heroStripLabel}>CARD</Text>
              <Text style={styles.heroStripVal}>₹{metrics.cardTotal.toLocaleString("en-IN")}</Text>
            </View>
          </View>
        </View>

        {/* 2. SEARCH & FILTER ACTION BAR (DIRECTLY BELOW TOTAL REVENUE) */}
        <View style={styles.searchFilterRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={REVENUE_COLORS.slate400} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search patient, phone, reg id..."
              placeholderTextColor={REVENUE_COLORS.slate400}
              value={searchQuery}
              onChangeText={(t) => {
                setSearchQuery(t);
                setCurrentPage(1);
              }}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color={REVENUE_COLORS.slate400} />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={[
              styles.filterToggleBtn,
              (showFiltersModal || activeFiltersCount > 0) && styles.filterToggleBtnActive,
            ]}
            onPress={() => setShowFiltersModal(!showFiltersModal)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="funnel"
              size={14}
              color={showFiltersModal || activeFiltersCount > 0 ? "#ffffff" : REVENUE_COLORS.blue}
            />
            <Text
              style={[
                styles.filterToggleBtnText,
                (showFiltersModal || activeFiltersCount > 0) && { color: "#ffffff" },
              ]}
            >
              Filter{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
            </Text>
          </TouchableOpacity>
        </View>

        {/* DATE PRESETS SCROLL (COMPACT CHIPS) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
          <View style={styles.presetsRow}>
            {(
              [
                { id: "THIS_MONTH", label: "This Month" },
                { id: "TODAY", label: "Today" },
                { id: "PREV_MONTH", label: "Last Month" },
                { id: "THIS_YEAR", label: "This Year" },
                { id: "ALL", label: "All History" },
                { id: "CUSTOM", label: "Custom Dates" },
              ] as const
            ).map((p) => {
              const active = datePreset === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.presetChip, active && styles.presetChipActive]}
                  onPress={() => {
                    setDatePreset(p.id);
                    setCurrentPage(1);
                  }}
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

        {/* CUSTOM DATE RANGE (IF SELECTED) */}
        {datePreset === "CUSTOM" && (
          <View style={styles.customDateBox}>
            <Text style={styles.customDateTitle}>Select Dates (YYYY-MM-DD):</Text>
            <View style={styles.customInputsRow}>
              <TextInput
                style={styles.customInput}
                placeholder="From: 2026-11-01"
                placeholderTextColor={REVENUE_COLORS.slate400}
                value={customFrom}
                onChangeText={(v) => {
                  setCustomFrom(v);
                  setCurrentPage(1);
                }}
              />
              <Text style={{ color: REVENUE_COLORS.slate400, fontWeight: "700" }}>to</Text>
              <TextInput
                style={styles.customInput}
                placeholder="To: 2026-11-30"
                placeholderTextColor={REVENUE_COLORS.slate400}
                value={customTo}
                onChangeText={(v) => {
                  setCustomTo(v);
                  setCurrentPage(1);
                }}
              />
            </View>
          </View>
        )}

        {/* 3. ADVANCED EXPANDABLE FILTERS PANEL */}
        {showFiltersModal && (
          <View style={styles.filtersPanel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Active Filters</Text>
              <TouchableOpacity onPress={handleResetFilters} style={styles.resetAction}>
                <Ionicons name="refresh" size={13} color={REVENUE_COLORS.blue} />
                <Text style={styles.resetActionText}>Reset All</Text>
              </TouchableOpacity>
            </View>

            {/* Branch Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>CLINIC BRANCH</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipsRow}>
                  <TouchableOpacity
                    style={[styles.filterChip, selectedBranch === "all" && styles.filterChipActive]}
                    onPress={() => {
                      setSelectedBranch("all");
                      setCurrentPage(1);
                    }}
                  >
                    <Text style={[styles.filterChipText, selectedBranch === "all" && styles.filterChipTextActive]}>
                      All Branches
                    </Text>
                  </TouchableOpacity>
                  {combinedBranchList.map((b) => {
                    const isSel = selectedBranch !== "all" && normalizeBranchKey(selectedBranch) === normalizeBranchKey(b);
                    return (
                      <TouchableOpacity
                        key={b}
                        style={[styles.filterChip, isSel && styles.filterChipActive]}
                        onPress={() => {
                          setSelectedBranch(b);
                          setCurrentPage(1);
                        }}
                      >
                        <Text style={[styles.filterChipText, isSel && styles.filterChipTextActive]}>{b}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Doctor Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>ATTENDING DOCTOR</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipsRow}>
                  <TouchableOpacity
                    style={[styles.filterChip, selectedDoctor === "all" && styles.filterChipActive]}
                    onPress={() => {
                      setSelectedDoctor("all");
                      setCurrentPage(1);
                    }}
                  >
                    <Text style={[styles.filterChipText, selectedDoctor === "all" && styles.filterChipTextActive]}>
                      All Doctors
                    </Text>
                  </TouchableOpacity>
                  {doctorList.map((doc) => {
                    const isSel = selectedDoctor.toLowerCase() === doc.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={doc}
                        style={[styles.filterChip, isSel && styles.filterChipActive]}
                        onPress={() => {
                          setSelectedDoctor(doc);
                          setCurrentPage(1);
                        }}
                      >
                        <Text style={[styles.filterChipText, isSel && styles.filterChipTextActive]}>{doc}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Payment Mode */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>PAYMENT METHOD</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipsRow}>
                  {[
                    { id: "all", label: "All Modes" },
                    { id: "counter_upi", label: "Counter UPI" },
                    { id: "upi", label: "UPI / QR Code" },
                    { id: "cash", label: "Cash" },
                    { id: "card", label: "Card" },
                    { id: "split", label: "Split" },
                  ].map((m) => {
                    const isSel = selectedMethod === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.filterChip, isSel && styles.filterChipActive]}
                        onPress={() => {
                          setSelectedMethod(m.id);
                          setCurrentPage(1);
                        }}
                      >
                        <Text style={[styles.filterChipText, isSel && styles.filterChipTextActive]}>{m.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Revenue Split */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>REVENUE CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipsRow}>
                  {[
                    { id: "all", label: "All Categories" },
                    { id: "Consultation", label: "Consultation" },
                    { id: "Consultation & Medicine", label: "Consult + Med" },
                    { id: "Package", label: "Care Package" },
                    { id: "Diet Plan", label: "Diet Plan" },
                  ].map((s) => {
                    const isSel = selectedSplitType === s.id;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.filterChip, isSel && styles.filterChipActive]}
                        onPress={() => {
                          setSelectedSplitType(s.id);
                          setCurrentPage(1);
                        }}
                      >
                        <Text style={[styles.filterChipText, isSel && styles.filterChipTextActive]}>{s.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>
        )}

        {/* 4. ALL CLINIC BRANCHES BREAKDOWN (FULL LISTING) */}
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionHeading}>ALL CLINIC BRANCH COLLECTIONS</Text>
          <Text style={styles.sectionSubCount}>{combinedBranchList.length} branches registered</Text>
        </View>

        <View style={styles.branchGrid}>
          {branchBreakdown.map((b, idx) => {
            const isSelected = selectedBranch !== "all" && normalizeBranchKey(selectedBranch) === normalizeBranchKey(b.name);
            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.branchCard,
                  isSelected && styles.branchCardSelected,
                ]}
                onPress={() => {
                  if (isSelected) {
                    setSelectedBranch("all");
                  } else {
                    setSelectedBranch(b.name);
                  }
                  setCurrentPage(1);
                }}
                activeOpacity={0.8}
              >
              <View style={styles.branchCardTop}>
                <View style={{ flex: 1, marginRight: 4 }}>
                  <Text style={styles.branchCardName} numberOfLines={1}>
                    {b.name}
                  </Text>
                  <Text style={styles.branchCardSub}>{b.count} collections</Text>
                </View>
                <View style={styles.branchShareBadge}>
                  <Text style={styles.branchShareText}>{b.share}</Text>
                </View>
              </View>
              <Text style={styles.branchCardAmt}>₹{b.amount.toLocaleString("en-IN")}</Text>
            </TouchableOpacity>
          );
        })}
        </View>

        {/* 5. TRANSACTION LEDGER TABLE (PAGE-WISE) */}
        <View style={styles.ledgerHeaderRow}>
          <Text style={styles.sectionHeading}>
            TRANSACTIONS ({filteredTransactions.length})
          </Text>
          <Text style={styles.pageInfoText}>
            Page {safeCurrentPage} of {totalPages}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={REVENUE_COLORS.blue} />
            <Text style={styles.loadingText}>Fetching real-time ledger from database...</Text>
          </View>
        ) : paginatedTransactions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="receipt-outline" size={38} color={REVENUE_COLORS.slate400} />
            <Text style={styles.emptyTitle}>No revenue records found</Text>
            <Text style={styles.emptySub}>Try adjusting your filters or search above.</Text>
          </View>
        ) : (
          <View style={styles.ledgerList}>
            {paginatedTransactions.map((tx) => {
              const disp = (tx.displayPaymentMethod || "").toLowerCase();
              const isCounter = tx.paymentMethod === "counter_upi" || disp.includes("counter");
              const isOnlineUpi = (tx.paymentMethod === "upi" || disp.includes("online") || disp.includes("qr")) && !isCounter;
              const isCash = tx.paymentMethod === "cash" || disp.includes("cash");
              const isCard = tx.paymentMethod === "card" || disp.includes("card");
              return (
                <View key={tx.id} style={styles.txCard}>
                  <View style={styles.txCardLeft}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
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

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <Text style={styles.txDateText}>{tx.dateTime || tx.timestamp}</Text>
                      {tx.revenueSplit ? (
                        <View style={styles.splitBadge}>
                          <Text style={styles.splitBadgeText}>{tx.revenueSplit}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.txCardRight}>
                    <Text style={styles.txAmount}>₹{(tx.totalAmount || 0).toLocaleString("en-IN")}</Text>
                    <View
                      style={[
                        styles.txMethodBadge,
                        isCounter
                          ? styles.txMethodCounter
                          : isOnlineUpi
                          ? styles.txMethodUpi
                          : isCash
                          ? styles.txMethodCash
                          : styles.txMethodOther,
                      ]}
                    >
                      <Text
                        style={[
                          styles.txMethodText,
                          isCounter
                            ? styles.txMethodTextCounter
                            : isOnlineUpi
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

            {/* PAGE CONTROLS */}
            <View style={styles.paginationBar}>
              <TouchableOpacity
                style={[styles.pageBtn, safeCurrentPage === 1 && styles.pageBtnDisabled]}
                onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={safeCurrentPage === 1 ? REVENUE_COLORS.slate400 : REVENUE_COLORS.blue}
                />
                <Text style={[styles.pageBtnText, safeCurrentPage === 1 && styles.pageBtnTextDisabled]}>
                  Previous
                </Text>
              </TouchableOpacity>

              <Text style={styles.pageNumberDisplay}>
                {safeCurrentPage} / {totalPages}
              </Text>

              <TouchableOpacity
                style={[styles.pageBtn, safeCurrentPage >= totalPages && styles.pageBtnDisabled]}
                onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                activeOpacity={0.7}
              >
                <Text style={[styles.pageBtnText, safeCurrentPage >= totalPages && styles.pageBtnTextDisabled]}>
                  Next
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={safeCurrentPage >= totalPages ? REVENUE_COLORS.slate400 : REVENUE_COLORS.blue}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
      {bottomNav}
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
  headerTitle: { fontSize: 16, fontWeight: "900", color: "#0f172a" },
  headerSub: { fontSize: 11, color: "#64748b", marginTop: 1 },
  iconActionBtn: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 999,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#16a34a",
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#16a34a",
  },
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContent: { padding: 14, paddingBottom: 36 },

  /* Hero Revenue Card (Clean White Aesthetic with subtle slate border) */
  heroCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  heroPreLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.8,
  },
  heroAmount: {
    fontSize: 30,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: 2,
  },
  heroCountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  heroCountText: {
    fontSize: 11,
    color: "#0f172a",
    fontWeight: "700",
  },
  heroStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  heroStripCol: {
    flex: 1,
    alignItems: "center",
  },
  heroStripLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748b",
  },
  heroStripVal: {
    fontSize: 11.5,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: 1,
  },
  heroStripDivider: {
    width: 1,
    height: 18,
    backgroundColor: "#e2e8f0",
  },

  /* Search & Filter Bar */
  searchFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 10,
    height: 40,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#0f172a",
  },
  filterToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  filterToggleBtnActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  filterToggleBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#0284c7",
  },

  /* Date Presets */
  presetsScroll: { marginBottom: 12 },
  presetsRow: { flexDirection: "row", gap: 6 },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  presetChipActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  presetChipTextActive: {
    color: "#ffffff",
  },
  customDateBox: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bae6fd",
    padding: 10,
    marginBottom: 12,
  },
  customDateTitle: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#0369a1",
    marginBottom: 6,
  },
  customInputsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  customInput: {
    flex: 1,
    height: 34,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 11,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },

  /* Expandable Filters Panel */
  filtersPanel: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 6,
  },
  panelTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  resetAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  resetActionText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#0284c7",
  },
  filterSection: {},
  filterSectionLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#64748b",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterChipActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  filterChipText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#475569",
  },
  filterChipTextActive: {
    color: "#ffffff",
  },

  /* Section Headings */
  sectionHeadingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "900",
    color: "#475569",
    letterSpacing: 0.6,
  },
  sectionSubCount: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
  },

  /* Branch Grid */
  branchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  branchCard: {
    width: (SCREEN_WIDTH - 36) / 2,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 10,
  },
  branchCardSelected: {
    borderColor: "#0284c7",
    backgroundColor: "#f0f9ff",
  },
  branchCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  branchCardName: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  branchCardSub: {
    fontSize: 9.5,
    color: "#64748b",
    marginTop: 1,
  },
  branchShareBadge: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  branchShareText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#0284c7",
  },
  branchCardAmt: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0f172a",
  },

  /* Ledger */
  ledgerHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  pageInfoText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  loadingBox: {
    padding: 30,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 11.5,
    color: "#64748b",
  },
  emptyBox: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1e293b",
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 3,
  },
  ledgerList: {
    gap: 8,
  },
  txCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 11,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  txCardLeft: {
    flex: 1,
    marginRight: 8,
  },
  txPatientName: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  txIdBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  txIdText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#475569",
  },
  txMetaText: {
    fontSize: 10.5,
    color: "#64748b",
    marginTop: 1,
  },
  txDateText: {
    fontSize: 10,
    color: "#94a3b8",
  },
  splitBadge: {
    backgroundColor: "#f3e8ff",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  splitBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#7c3aed",
  },
  txCardRight: {
    alignItems: "flex-end",
  },
  txAmount: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0f172a",
  },
  txMethodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  txMethodCounter: { backgroundColor: "#e0e7ff" },
  txMethodTextCounter: { color: "#4338ca" },
  txMethodUpi: { backgroundColor: "#dcfce7" },
  txMethodCash: { backgroundColor: "#fef3c7" },
  txMethodOther: { backgroundColor: "#e0f2fe" },
  txMethodText: { fontSize: 9.5, fontWeight: "800" },
  txMethodTextUpi: { color: "#16a34a" },
  txMethodTextCash: { color: "#d97706" },
  txMethodTextOther: { color: "#0284c7" },

  /* Pagination Bar */
  paginationBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 10,
    marginTop: 6,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284c7",
  },
  pageBtnTextDisabled: {
    color: "#94a3b8",
  },
  pageNumberDisplay: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#334155",
  },
});
