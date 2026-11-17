import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface ShipmentItem {
  id: string;
  orderId: string;
  patientName: string;
  phone: string;
  destination: string;
  branch: string;
  courier: string;
  awbNumber: string;
  status: "In Transit" | "Delivered" | "Pickup Scheduled" | "RTO" | "Pending";
  date: string;
  amount: number;
}

const SAMPLE_SHIPMENTS: ShipmentItem[] = [
  {
    id: "SHP-1001",
    orderId: "ORD-94812",
    patientName: "Suresh Kumar",
    phone: "9876543210",
    destination: "Madhapur, Hyderabad - 500081",
    branch: "Dilsukhnagar",
    courier: "Delhivery Air",
    awbNumber: "DEL-849201948",
    status: "In Transit",
    date: "17 Nov 2026",
    amount: 1450,
  },
  {
    id: "SHP-1002",
    orderId: "ORD-94805",
    patientName: "Ananya Reddy",
    phone: "9123456789",
    destination: "Gachibowli, Hyderabad - 500032",
    branch: "KPHB",
    courier: "Bluedart Express",
    awbNumber: "BD-992014882",
    status: "Delivered",
    date: "16 Nov 2026",
    amount: 2200,
  },
  {
    id: "SHP-1003",
    orderId: "ORD-94788",
    patientName: "Ramesh Varma",
    phone: "9988776655",
    destination: "Banjara Hills, Hyderabad - 500034",
    branch: "Chandanagar",
    courier: "DTDC Priority",
    awbNumber: "DTDC-30194821",
    status: "Pickup Scheduled",
    date: "17 Nov 2026",
    amount: 950,
  },
  {
    id: "SHP-1004",
    orderId: "ORD-94751",
    patientName: "Pooja Sharma",
    phone: "9848022338",
    destination: "Secunderabad - 500003",
    branch: "Dilsukhnagar",
    courier: "Ekart Logistics",
    awbNumber: "EKT-77291048",
    status: "In Transit",
    date: "15 Nov 2026",
    amount: 3100,
  },
];

interface MobileShiprocketViewProps {
  role: "RECEPTION" | "ADMIN" | "HR";
}

export const MobileShiprocketView: React.FC<MobileShiprocketViewProps> = ({ role }) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [shipments] = useState<ShipmentItem[]>(SAMPLE_SHIPMENTS);

  const filtered = shipments.filter((item) => {
    const matchesSearch =
      item.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.awbNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phone.includes(searchTerm);

    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: ShipmentItem["status"]) => {
    switch (status) {
      case "Delivered":
        return { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46" };
      case "In Transit":
        return { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" };
      case "Pickup Scheduled":
        return { bg: "#fffbeb", border: "#fde68a", text: "#92400e" };
      case "RTO":
        return { bg: "#fff1f2", border: "#fecdd3", text: "#9f1239" };
      default:
        return { bg: "#f8fafc", border: "#e2e8f0", text: "#475569" };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.headerTitle}>Shiprocket Logistics</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{role}</Text>
            </View>
          </View>
          <Text style={styles.headerSub}>Medicine Courier & Dispatch Tracking</Text>
        </View>
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => Alert.alert("Sync", "Shiprocket live status sync complete.")}
          activeOpacity={0.7}
        >
          <Ionicons name="sync" size={17} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total</Text>
          <Text style={styles.metricValue}>128</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>In Transit</Text>
          <Text style={[styles.metricValue, { color: "#2563eb" }]}>34</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Delivered</Text>
          <Text style={[styles.metricValue, { color: "#059669" }]}>89</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Pickup</Text>
          <Text style={[styles.metricValue, { color: "#d97706" }]}>5</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color="#94a3b8" />
        <TextInput
          placeholder="Search Patient, Phone, AWB #, Order..."
          placeholderTextColor="#94a3b8"
          style={styles.searchInput}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm("")}>
            <Ionicons name="close-circle" size={16} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {["ALL", "In Transit", "Pickup Scheduled", "Delivered", "RTO"].map((st) => (
          <TouchableOpacity
            key={st}
            style={[styles.filterPill, statusFilter === st && styles.filterPillActive]}
            onPress={() => setStatusFilter(st)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterPillText,
                statusFilter === st && styles.filterPillTextActive,
              ]}
            >
              {st}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Shipments List */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.listContent}>
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={40} color="#cbd5e1" />
            <Text style={styles.emptyText}>No shipments matching filter.</Text>
          </View>
        ) : (
          filtered.map((item) => {
            const colors = getStatusColor(item.status);
            return (
              <View key={item.id} style={styles.shipmentCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.orderIdText}>{item.orderId}</Text>
                    <Text style={styles.awbText}>AWB: {item.awbNumber}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: colors.bg, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: colors.text }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={13} color="#64748b" />
                  <Text style={styles.infoLabel}>{item.patientName}</Text>
                  <Text style={styles.infoDot}>•</Text>
                  <Ionicons name="call-outline" size={13} color="#64748b" />
                  <Text style={styles.infoSub}>{item.phone}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={13} color="#64748b" />
                  <Text style={styles.addressText} numberOfLines={1}>
                    {item.destination}
                  </Text>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.courierBadge}>
                    <Ionicons name="bicycle-outline" size={12} color="#475569" />
                    <Text style={styles.courierText}>{item.courier}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.trackBtn}
                    onPress={() =>
                      Alert.alert(
                        "Live Tracking",
                        `AWB: ${item.awbNumber}\nCourier: ${item.courier}\nStatus: ${item.status}\nDestination: ${item.destination}`
                      )
                    }
                    activeOpacity={0.7}
                  >
                    <Text style={styles.trackBtnText}>Track Order</Text>
                    <Ionicons name="open-outline" size={12} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    gap: 12,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  headerSub: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748b",
    marginTop: 1,
  },
  roleBadge: {
    backgroundColor: "#ede9fe",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  roleBadgeText: {
    color: "#6d28d9",
    fontSize: 9.5,
    fontWeight: "800",
  },
  headerActionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#eef2ff",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: 2,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: "#0f172a",
    padding: 0,
  },
  filterScroll: {
    paddingHorizontal: 14,
    gap: 6,
    paddingVertical: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#e2e8f0",
  },
  filterPillActive: {
    backgroundColor: "#4f46e5",
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  filterPillTextActive: {
    color: "#ffffff",
  },
  scroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
    gap: 10,
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    paddingVertical: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 10,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    marginTop: 8,
  },
  shipmentCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderIdText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  awbText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6366f1",
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#1e293b",
  },
  infoDot: {
    color: "#cbd5e1",
    fontSize: 10,
  },
  infoSub: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748b",
  },
  addressText: {
    fontSize: 11,
    color: "#64748b",
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f8fafc",
  },
  courierBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  courierText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#475569",
  },
  trackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#4f46e5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  trackBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
});
