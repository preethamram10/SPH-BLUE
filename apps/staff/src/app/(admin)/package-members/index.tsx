import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../../config/api";

const normalizeBranchKey = (name: string): string => {
  let c = (name || "")
    .toLowerCase()
    .replace(/spiritual|homeopathy|clinic|branch/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
  if (c === "kpb") c = "kphb";
  return c;
};

export default function MobilePackageMembersScreen() {
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("All");

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/package-members`);
      const data = await res.json();
      if (data.success && Array.isArray(data.members)) {
        setMembers(data.members);
      }
    } catch (e) {
      console.warn("Failed fetching mobile package members:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/branches`);
      if (res.ok) {
        const json = await res.json();
        const list = json.data || json.branches || [];
        if (Array.isArray(list)) {
          const names = list.map((b: any) => b.name?.trim()).filter(Boolean);
          if (names.length > 0) setAvailableBranches(names);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchMembers();
    fetchBranches();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMembers();
    fetchBranches();
  }, []);

  const handleDial = (phone: string) => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, "");
    Linking.openURL(`tel:${clean}`);
  };

  const branchOptions = useMemo(() => {
    const map = new Map<string, string>();
    availableBranches.forEach((b) => {
      const k = normalizeBranchKey(b);
      if (k) map.set(k, b);
    });
    members.forEach((m) => {
      if (m.branch) {
        const k = normalizeBranchKey(m.branch);
        if (k && !map.has(k)) map.set(k, m.branch);
      }
    });
    if (map.size === 0) {
      ["Kphb Branch", "Chandanagar Branch", "Dilshuknagar Branch", "Nallagandla Branch"].forEach((b) => {
        map.set(normalizeBranchKey(b), b);
      });
    }
    return ["All", ...Array.from(map.values())];
  }, [availableBranches, members]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return members.filter((m) => {
      const matchesSearch =
        !q ||
        (m.patientName || "").toLowerCase().includes(q) ||
        (m.phone || "").includes(q) ||
        (m.registrationId || "").toLowerCase().includes(q) ||
        (m.packageName || "").toLowerCase().includes(q) ||
        (m.branch || "").toLowerCase().includes(q);

      const matchesBranch =
        branchFilter === "All" ||
        normalizeBranchKey(m.branch || "") === normalizeBranchKey(branchFilter);

      return matchesSearch && matchesBranch;
    });
  }, [members, search, branchFilter]);

  const totalMembers = members.length;
  const totalRevenue = members.reduce((acc, m) => acc + (Number(m.paidAmount) || 0), 0);
  const totalPending = members.reduce((acc, m) => acc + (Number(m.pendingAmount) || 0), 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Package Members</Text>
          <Text style={styles.headerSub}>Live Chronic Care Patient Subscriptions</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchMembers}>
          <Ionicons name="refresh" size={18} color="#0284c7" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0284c7"]} />}
      >
        {/* Modern Clean White Hero Card (matches Total Revenue / PayLater UI) */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroSub}>TOTAL ACTIVE SUBSCRIBERS</Text>
              <Text style={styles.heroTotal}>{totalMembers}</Text>
            </View>
            <View style={styles.heroIconBox}>
              <Ionicons name="ribbon" size={24} color="#0284c7" />
            </View>
          </View>

          {/* Inline Summary Strip */}
          <View style={styles.heroSummaryRow}>
            <View style={styles.heroSummaryItem}>
              <Text style={styles.heroSummaryLabel}>COLLECTED</Text>
              <Text style={[styles.heroSummaryValue, { color: "#16a34a" }]}>
                ₹{totalRevenue.toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.heroSummaryDivider} />
            <View style={styles.heroSummaryItem}>
              <Text style={styles.heroSummaryLabel}>PENDING DUE</Text>
              <Text style={[styles.heroSummaryValue, { color: "#d97706" }]}>
                ₹{totalPending.toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.heroSummaryDivider} />
            <View style={styles.heroSummaryItem}>
              <Text style={styles.heroSummaryLabel}>TOTAL VALUE</Text>
              <Text style={[styles.heroSummaryValue, { color: "#0284c7" }]}>
                ₹{(totalRevenue + totalPending).toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search member name, phone, reg ID..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Branch Filter Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.branchFilterRow}>
          {branchOptions.map((b) => {
            const isSel = b === "All" ? branchFilter === "All" : normalizeBranchKey(branchFilter) === normalizeBranchKey(b);
            return (
              <TouchableOpacity
                key={b}
                style={[
                  styles.branchChip,
                  isSel && styles.branchChipActive,
                ]}
                onPress={() => setBranchFilter(b)}
              >
                <Text
                  style={[
                    styles.branchChipText,
                    isSel && styles.branchChipTextActive,
                  ]}
                >
                  {b}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Cards List */}
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 30 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="ribbon-outline" size={42} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No package members found</Text>
            <Text style={styles.emptySub}>
              Patients registered under chronic treatment plans will appear here in real time.
            </Text>
          </View>
        ) : (
          filtered.map((m) => {
            const hasDue = Number(m.pendingAmount) > 0;
            return (
              <View key={m.id} style={styles.memberCard}>
                <View style={styles.memberCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{m.patientName}</Text>
                    <Text style={styles.regText}>
                      ID: {m.registrationId || "SPH-GEN"} • {m.branch}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.dialBtn}
                    onPress={() => handleDial(m.phone)}
                  >
                    <Ionicons name="call" size={12} color="#0284c7" />
                    <Text style={styles.dialBtnText}>{m.phone}</Text>
                  </TouchableOpacity>
                </View>

                {/* Plan Info Box */}
                <View style={styles.planBox}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="shield-checkmark" size={15} color="#0284c7" />
                    <Text style={styles.planTitle}>{m.packageName || "Annual Treatment Plan"}</Text>
                  </View>
                  <Text style={styles.validityText}>
                    Duration: {m.durationMonths || 12} Months
                    {m.endDate ? ` • Valid till ${m.endDate}` : ""}
                  </Text>
                </View>

                {/* Financial Ledger Details */}
                <View style={styles.ledgerRow}>
                  <View style={styles.ledgerItem}>
                    <Text style={styles.ledgerLabel}>TOTAL</Text>
                    <Text style={styles.ledgerVal}>₹{Number(m.totalAmount || 0).toLocaleString("en-IN")}</Text>
                  </View>
                  <View style={styles.ledgerDivider} />
                  <View style={styles.ledgerItem}>
                    <Text style={styles.ledgerLabel}>PAID</Text>
                    <Text style={[styles.ledgerVal, { color: "#16a34a" }]}>
                      ₹{Number(m.paidAmount || 0).toLocaleString("en-IN")}
                    </Text>
                  </View>
                  <View style={styles.ledgerDivider} />
                  <View style={styles.ledgerItem}>
                    <Text style={styles.ledgerLabel}>PENDING</Text>
                    <Text style={[styles.ledgerVal, hasDue ? { color: "#d97706" } : { color: "#16a34a" }]}>
                      ₹{Number(m.pendingAmount || 0).toLocaleString("en-IN")}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
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
  headerSub: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  refreshBtn: { padding: 8, backgroundColor: "#f0f9ff", borderRadius: 8 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  heroCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  heroSub: { fontSize: 10.5, fontWeight: "800", color: "#64748b", letterSpacing: 0.8 },
  heroTotal: { fontSize: 26, fontWeight: "900", color: "#0f172a", marginTop: 2 },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
  },
  heroSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  heroSummaryItem: { flex: 1, alignItems: "center" },
  heroSummaryLabel: { fontSize: 9.5, fontWeight: "800", color: "#64748b" },
  heroSummaryValue: { fontSize: 13.5, fontWeight: "900", marginTop: 2 },
  heroSummaryDivider: { width: 1, height: 22, backgroundColor: "#e2e8f0" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchInput: { flex: 1, fontSize: 12.5, fontWeight: "700", color: "#0f172a" },
  branchFilterRow: { flexDirection: "row", gap: 6 },
  branchChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  branchChipActive: { backgroundColor: "#0284c7", borderColor: "#0284c7" },
  branchChipText: { fontSize: 10.5, fontWeight: "700", color: "#64748b" },
  branchChipTextActive: { color: "#ffffff", fontWeight: "800" },
  memberCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  memberCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  memberName: { fontSize: 14.5, fontWeight: "800", color: "#0f172a" },
  regText: { fontSize: 11, color: "#64748b", fontWeight: "600", marginTop: 2 },
  dialBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dialBtnText: { color: "#0284c7", fontSize: 11, fontWeight: "800" },
  planBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  planTitle: { fontSize: 12.5, fontWeight: "800", color: "#0f172a" },
  validityText: { fontSize: 11, color: "#64748b", marginTop: 2, fontWeight: "500" },
  ledgerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  ledgerItem: { flex: 1, alignItems: "center" },
  ledgerLabel: { fontSize: 9.5, fontWeight: "800", color: "#94a3b8" },
  ledgerVal: { fontSize: 12.5, fontWeight: "800", color: "#0f172a", marginTop: 2 },
  ledgerDivider: { width: 1, height: 20, backgroundColor: "#e2e8f0" },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 20,
  },
  emptyTitle: { fontSize: 14, fontWeight: "800", color: "#1e293b", marginTop: 12 },
  emptySub: { fontSize: 12, color: "#64748b", textAlign: "center", marginTop: 4 },
});
