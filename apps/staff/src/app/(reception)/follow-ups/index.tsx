import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  BackHandler,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, getActiveBranch } from "../../../services/auth";
import { ReceptionBottomNav } from "../../../components/reception/ReceptionBottomNav";

interface FollowUpItem {
  id: string;
  appointmentId: string;
  patientName: string;
  mrn: string;
  phone: string;
  doctorName: string;
  branch: string;
  condition: string;
  dueDate: string;
  followUpInterval: string;
  consultationFee: number;
  prescriptionImages?: string[];
  status: "DUE_TODAY" | "OVERDUE" | "UPCOMING" | "CALLED";
}

export default function ReceptionFollowUpsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeBranch, setActiveBranch] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);

  // Date Filter State
  const todayStr = (() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  })();

  const [selectedDate, setSelectedDate] = useState<string>("ALL");

  // Generate Quick Date Options (ALL, Today, Next 5 Days)
  const quickDates = React.useMemo(() => {
    const dates: Array<{ label: string; date: string }> = [
      { label: "All", date: "ALL" },
      { label: "Today", date: todayStr },
    ];

    const now = new Date();
    for (let i = 1; i <= 6; i++) {
      const nextD = new Date(now.getTime() + i * 86400000);
      const ds = `${String(nextD.getDate()).padStart(2, "0")}-${String(nextD.getMonth() + 1).padStart(2, "0")}-${nextD.getFullYear()}`;
      const dayName = nextD.toLocaleDateString("en-US", { weekday: "short" });
      dates.push({ label: `${dayName} (${nextD.getDate()})`, date: ds });
    }
    return dates;
  }, [todayStr]);

  // Load Branch Info
  useEffect(() => {
    getActiveBranch().then((b) => {
      if (b) setActiveBranch(b);
    });
  }, []);

  // Fetch Follow-ups from Backend
  const loadFollowUps = async () => {
    setIsLoading(true);
    try {
      const url =
        selectedDate && selectedDate !== "ALL"
          ? `/reception/follow-ups?date=${encodeURIComponent(selectedDate)}`
          : `/reception/follow-ups`;
      const res = await apiFetch<any>(url);
      if (res.success && Array.isArray(res.followUps)) {
        setFollowUps(res.followUps);
      } else {
        // Fallback default sample if database empty
        setFollowUps([]);
      }
    } catch (err) {
      console.error("Failed to fetch follow-ups:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFollowUps();
  }, [selectedDate]);

  const handleCall = (phone: string) => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, "").slice(-10);
    Linking.openURL(`tel:${clean}`);
  };

  const handleWhatsApp = (phone: string, patientName: string, doctorName: string, dueDate: string) => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, "").slice(-10);
    const text = encodeURIComponent(
      `Hello ${patientName},\nThis is Spiritual Homeopathy Clinic. Your follow-up consultation with ${doctorName} is scheduled on ${dueDate}.\nPlease let us know if you would like to confirm your appointment.`
    );
    Linking.openURL(`whatsapp://send?phone=+91${clean}&text=${text}`);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(reception)" as any);
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

  const filtered = followUps.filter((f) => {
    const q = search.toLowerCase();
    return (
      f.patientName.toLowerCase().includes(q) ||
      f.mrn.toLowerCase().includes(q) ||
      f.phone.includes(search)
    );
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* 1. Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle}>Patient Follow-ups</Text>
          <Text style={styles.headerSub}>
            {(activeBranch?.name || "KPHB Branch").replace(/Spiritual Homeopathy/gi, "").trim()} • Med Req
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadFollowUps} activeOpacity={0.7}>
          <Ionicons name="refresh" size={17} color="#0284c7" />
        </TouchableOpacity>
      </View>

      {/* 2. Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={17} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by patient name, phone, or Reg ID..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={17} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* 3. Horizontal Date Selector Bar */}
      <View style={styles.dateSelectorContainer}>
        <View style={styles.dateSelectorHeader}>
          <Text style={styles.dateSelectorTitle}>Filter by Scheduled Date:</Text>
          {selectedDate !== "ALL" && (
            <Text style={styles.activeDateBadgeText}>Selected: {selectedDate}</Text>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateChipsRow}>
          {quickDates.map((item) => {
            const isSelected = selectedDate === item.date;
            return (
              <TouchableOpacity
                key={item.date}
                style={[styles.dateChip, isSelected && styles.dateChipActive]}
                onPress={() => setSelectedDate(item.date)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dateChipText, isSelected && styles.dateChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 4. Follow-up List */}
      <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
        {isLoading ? (
          <View style={styles.emptyStateContainer}>
            <ActivityIndicator size="large" color="#0284c7" />
            <Text style={styles.emptySubText}>Loading scheduled follow-ups...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="calendar-outline" size={44} color="#cbd5e1" />
            <Text style={styles.emptyTitleText}>No Follow-ups Found</Text>
            <Text style={styles.emptySubText}>
              {selectedDate === "ALL"
                ? "No patients are currently scheduled for follow-up."
                : `No patients scheduled for follow-up on ${selectedDate}.`}
            </Text>
            {selectedDate !== "ALL" && (
              <TouchableOpacity
                style={styles.showAllBtn}
                onPress={() => setSelectedDate("ALL")}
                activeOpacity={0.7}
              >
                <Text style={styles.showAllBtnText}>Show All Follow-ups</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filtered.map((item, index) => {
              const cleanPhone = item.phone.replace(/\D/g, "").slice(-10);
              const isToday = item.dueDate === todayStr;

              return (
                <View key={item.id || index} style={styles.followUpCard}>
                  {/* Top Row: Name, MRN, Due Date Pill */}
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.patientName}>{item.patientName}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <View style={styles.mrnBadge}>
                          <Text style={styles.mrnBadgeText}>{item.mrn}</Text>
                        </View>
                        <Text style={styles.phoneText}>{cleanPhone || "No Mobile"}</Text>
                      </View>
                    </View>

                    <View style={[styles.statusBadge, isToday ? styles.statusToday : styles.statusUpcoming]}>
                      <Ionicons
                        name={isToday ? "time" : "calendar-outline"}
                        size={11}
                        color={isToday ? "#b45309" : "#0369a1"}
                      />
                      <Text style={[styles.statusText, isToday ? styles.statusTextToday : styles.statusTextUpcoming]}>
                        {isToday ? "Due Today" : item.dueDate}
                      </Text>
                    </View>
                  </View>

                  {/* Middle Row: Doctor & Interval Chip */}
                  <View style={styles.cardInfoRow}>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Doctor</Text>
                      <Text style={styles.infoValue} numberOfLines={1}>
                        {item.doctorName.startsWith("Dr.") ? item.doctorName : `Dr. ${item.doctorName}`}
                      </Text>
                    </View>

                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Interval</Text>
                      <View style={styles.intervalChipSmall}>
                        <Text style={styles.intervalChipSmallText}>{item.followUpInterval}</Text>
                      </View>
                    </View>

                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Branch</Text>
                      <Text style={styles.infoValue} numberOfLines={1}>
                        {item.branch}
                      </Text>
                    </View>
                  </View>

                  {/* Actions Row: Call, WhatsApp, Open Patient File */}
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={styles.patientFileLinkBtn}
                      onPress={() =>
                        router.push({
                          pathname: "/(reception)/patient-file" as any,
                          params: {
                            id: item.appointmentId || item.id,
                            name: item.patientName,
                            phone: item.phone,
                            registrationId: item.mrn,
                            branch: item.branch,
                          },
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <Ionicons name="document-text-outline" size={13} color="#0284c7" />
                      <Text style={styles.patientFileLinkText}>Patient File</Text>
                    </TouchableOpacity>

                    <View style={styles.contactActionsRow}>
                      <TouchableOpacity
                        style={styles.callIconBtn}
                        onPress={() => handleCall(item.phone)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="call" size={14} color="#ffffff" />
                        <Text style={styles.callBtnText}>Call</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.whatsAppIconBtn}
                        onPress={() =>
                          handleWhatsApp(item.phone, item.patientName, item.doctorName, item.dueDate)
                        }
                        activeOpacity={0.7}
                      >
                        <Ionicons name="logo-whatsapp" size={15} color="#ffffff" />
                        <Text style={styles.whatsAppBtnText}>WhatsApp</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* 5. Fixed Bottom Navigation Bar */}
      <ReceptionBottomNav activeTab="med-req" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#ffffff",
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  headerSub: {
    fontSize: 11,
    color: "#64748b",
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: "#0f172a",
    padding: 0,
  },
  dateSelectorContainer: {
    marginTop: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  dateSelectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  dateSelectorTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#334155",
  },
  activeDateBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#0284c7",
  },
  dateChipsRow: {
    paddingHorizontal: 12,
    gap: 6,
  },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dateChipActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  dateChipTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  listContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  listContent: {
    padding: 10,
    paddingBottom: 30,
  },
  emptyStateContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitleText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
    marginTop: 10,
  },
  emptySubText: {
    fontSize: 11.5,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 4,
  },
  showAllBtn: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  showAllBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0284c7",
  },
  followUpCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    width: "100%",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  patientName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  mrnBadge: {
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  mrnBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#0284c7",
  },
  phoneText: {
    fontSize: 11,
    color: "#64748b",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusToday: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  statusUpcoming: {
    backgroundColor: "#e0f2fe",
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  statusTextToday: {
    color: "#b45309",
  },
  statusTextUpcoming: {
    color: "#0369a1",
  },
  cardInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 9.5,
    color: "#94a3b8",
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 11,
    color: "#334155",
    fontWeight: "700",
    marginTop: 1,
  },
  intervalChipSmall: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 1,
  },
  intervalChipSmallText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#1d4ed8",
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  patientFileLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bae6fd",
    backgroundColor: "#f0f9ff",
  },
  patientFileLinkText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284c7",
  },
  contactActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  callIconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0284c7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  callBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
  whatsAppIconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#16a34a",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  whatsAppBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
});
