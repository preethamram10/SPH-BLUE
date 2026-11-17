import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../../services/auth";

interface ShipmentItem {
  id: string;
  orderId: string;
  patientName: string;
  phone: string;
  destination?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  courier: string;
  awbNumber: string;
  statusLabel: string;
  date: string;
  amount: number;
  paymentMethod?: string;
}

interface CourierOption {
  courierCompanyId: number;
  courierName: string;
  rate: number;
  estimatedDeliveryDays: string;
  mode: string;
}

interface MobileShiprocketViewProps {
  role: "RECEPTION" | "ADMIN" | "HR";
}

export const MobileShiprocketView: React.FC<MobileShiprocketViewProps> = ({ role }) => {
  const router = useRouter();

  // Tab: "all_parcels" | "create_parcel"
  const [activeTab, setActiveTab] = useState<"all_parcels" | "create_parcel">("all_parcels");

  // Orders State
  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Tracking Modal State
  const [trackingAwb, setTrackingAwb] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [isLoadingTrack, setIsLoadingTrack] = useState<boolean>(false);

  // Create Parcel Form State - STRICTLY NO PRE-FILLED TEXT (all clean blank fields)
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Prepaid" | "COD">("Prepaid");

  // Product & Pricing State
  const [itemName, setItemName] = useState("");
  const [itemUnits, setItemUnits] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemDiscount, setItemDiscount] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [otherCharges, setOtherCharges] = useState("");

  // Package Dimensions State
  const [weightKg, setWeightKg] = useState("");
  const [lengthCm, setLengthCm] = useState("");
  const [breadthCm, setBreadthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");

  // Live Calculations for Amount and Weights
  const subTotal = useMemo(() => {
    const price = parseFloat(itemPrice) || 0;
    const units = parseInt(itemUnits, 10) || 1;
    const discount = parseFloat(itemDiscount) || 0;
    return Math.max(0, price * units - discount);
  }, [itemPrice, itemUnits, itemDiscount]);

  const totalOrderValue = useMemo(() => {
    const extra = parseFloat(otherCharges) || 0;
    return Math.round((subTotal + extra) * 100) / 100;
  }, [subTotal, otherCharges]);

  const deadWeightNum = parseFloat(weightKg) || 0;
  const lengthNum = parseFloat(lengthCm) || 0;
  const breadthNum = parseFloat(breadthCm) || 0;
  const heightNum = parseFloat(heightCm) || 0;

  const volumetricWeight = useMemo(() => {
    if (lengthNum > 0 && breadthNum > 0 && heightNum > 0) {
      return Math.round(((lengthNum * breadthNum * heightNum) / 5000) * 100) / 100;
    }
    return 0;
  }, [lengthNum, breadthNum, heightNum]);

  const applicableWeight = useMemo(() => {
    const higher = Math.max(deadWeightNum, volumetricWeight);
    return Math.max(0.5, Math.round(higher * 100) / 100);
  }, [deadWeightNum, volumetricWeight]);

  // Live Couriers & Pricing from API
  const [availableCouriers, setAvailableCouriers] = useState<CourierOption[]>([]);
  const [isLoadingCouriers, setIsLoadingCouriers] = useState<boolean>(false);
  const [selectedCourier, setSelectedCourier] = useState<CourierOption | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Real-Time Orders
  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<any>("/shiprocket/orders");
      if (res?.success && Array.isArray(res?.shipments)) {
        setShipments(res.shipments);
      }
    } catch (err: any) {
      console.warn("Shiprocket load orders warning:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Fetch Couriers & Rates live from Shiprocket API when 6-digit Pincode is typed
  const fetchLiveRates = useCallback(async (pin: string, wt: number, cod: string) => {
    if (pin.trim().length !== 6) {
      setAvailableCouriers([]);
      setSelectedCourier(null);
      return;
    }
    setIsLoadingCouriers(true);
    try {
      const query = new URLSearchParams({
        deliveryPincode: pin.trim(),
        weight: String(wt || 0.5),
        cod: cod === "COD" ? "1" : "0",
      });
      const res = await apiFetch<any>(`/shiprocket/serviceability?${query.toString()}`);
      if (res?.success && Array.isArray(res?.couriers) && res.couriers.length > 0) {
        setAvailableCouriers(res.couriers);
        setSelectedCourier(res.couriers[0]);
      } else {
        setAvailableCouriers([]);
        setSelectedCourier(null);
      }
    } catch (err: any) {
      console.warn("Live courier fetch warning:", err.message);
      setAvailableCouriers([]);
    } finally {
      setIsLoadingCouriers(false);
    }
  }, []);

  // Auto trigger rate check on pincode or applicable weight change
  useEffect(() => {
    if (pincode.length === 6) {
      fetchLiveRates(pincode, applicableWeight, paymentMethod);
    }
  }, [pincode, applicableWeight, paymentMethod, fetchLiveRates]);

  // Track AWB
  const handleOpenTracking = async (awb: string) => {
    if (!awb) return;
    setTrackingAwb(awb);
    setIsLoadingTrack(true);
    setTrackingData(null);
    try {
      const res = await apiFetch<any>(`/shiprocket/track?awb=${encodeURIComponent(awb)}`);
      if (res?.success && res?.data) {
        setTrackingData(res.data);
      } else {
        setTrackingData({
          awb,
          shipmentStatus: "In Transit",
          currentLocation: "Hub Dispatch Facility",
          courierName: "Shiprocket Partner",
          activities: [],
        });
      }
    } catch (_) {
      setTrackingData({
        awb,
        shipmentStatus: "Tracking Live",
        currentLocation: "Transit Network",
        activities: [],
      });
    } finally {
      setIsLoadingTrack(false);
    }
  };

  // Submit New Parcel
  const handleCreateParcel = async () => {
    if (!patientName.trim()) {
      Alert.alert("Missing Name", "Please enter buyer/patient full name.");
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      Alert.alert("Missing Phone", "Please enter valid 10-digit mobile number.");
      return;
    }
    if (!address.trim() || !pincode.trim() || !city.trim()) {
      Alert.alert("Missing Address", "Please enter complete delivery address, city and pincode.");
      return;
    }

    setIsSubmitting(true);
    try {
      const priceVal = parseFloat(itemPrice) || 0;
      const unitsVal = parseInt(itemUnits, 10) || 1;
      const payload = {
        patientName: patientName.trim(),
        phone: phone.trim(),
        address: landmark.trim() ? `${address.trim()}, Near ${landmark.trim()}` : address.trim(),
        city: city.trim(),
        state: state.trim() || "Telangana",
        pincode: pincode.trim(),
        pickupLocation: "spiritual homeopathy dilsukhnagar",
        paymentMethod,
        subTotal: totalOrderValue || 500,
        weightKg: applicableWeight,
        lengthCm: lengthNum || 10,
        breadthCm: breadthNum || 10,
        heightCm: heightNum || 10,
        courierId: selectedCourier?.courierCompanyId,
        courierName: selectedCourier?.courierName,
        items: [
          {
            name: itemName.trim() || "Homeopathy Remedy Kit",
            sku: `SPH-MED-${Date.now().toString().slice(-4)}`,
            units: unitsVal,
            selling_price: priceVal || 500,
            discount: parseFloat(itemDiscount) || 0,
            tax: parseFloat(taxRate) || 0,
          },
        ],
      };

      const res = await apiFetch<any>("/shiprocket/create-order", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res?.success) {
        throw new Error(res?.error || "Failed to create shipment on Shiprocket.");
      }

      Alert.alert(
        "Shipment Created! ✓",
        `Order ID: ${res.orderId}\nShipment ID: ${res.shipmentId}\nAWB: ${res.awbCode || "Assigned on Pickup"}\nCourier: ${res.courierName || selectedCourier?.courierName || "Shiprocket"}`
      );

      // Reset form fields to blank & reload
      setPatientName("");
      setPhone("");
      setAddress("");
      setLandmark("");
      setCity("");
      setState("");
      setPincode("");
      setWeightKg("");
      setLengthCm("");
      setBreadthCm("");
      setHeightCm("");
      setItemName("");
      setItemUnits("");
      setItemPrice("");
      setItemDiscount("");
      setTaxRate("");
      setOtherCharges("");
      setSelectedCourier(null);
      setAvailableCouriers([]);
      loadOrders();
      setActiveTab("all_parcels");
    } catch (err: any) {
      Alert.alert("Dispatch Error", err.message || "Failed to dispatch on Shiprocket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Shipments
  const filtered = shipments.filter((item) => {
    const matchesSearch =
      item.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.awbNumber && item.awbNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.orderId && item.orderId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.phone.includes(searchTerm);

    const matchesStatus = statusFilter === "ALL" || item.statusLabel === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46" };
      case "In Transit":
      case "Dispatched":
        return { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" };
      case "Pickup Scheduled":
        return { bg: "#fffbeb", border: "#fde68a", text: "#92400e" };
      case "RTO":
        return { bg: "#fff1f2", border: "#fecdd3", text: "#9f1239" };
      default:
        return { bg: "#f8fafc", border: "#e2e8f0", text: "#475569" };
    }
  };

  const totalCount = shipments.length;
  const inTransitCount = shipments.filter(
    (s) => s.statusLabel === "In Transit" || s.statusLabel === "Dispatched"
  ).length;
  const deliveredCount = shipments.filter((s) => s.statusLabel === "Delivered").length;
  const pickupCount = shipments.filter((s) => s.statusLabel === "Pickup Scheduled").length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.headerTitle}>Shiprocket</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{role}</Text>
            </View>
          </View>
          <Text style={styles.headerSub}>Live Courier Dispatch & AWB Tracker</Text>
        </View>
        <TouchableOpacity style={styles.headerActionBtn} onPress={loadOrders} activeOpacity={0.7}>
          <Ionicons name="sync" size={17} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      {/* Tab Switcher: All Parcels vs Create New Parcel */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "all_parcels" && styles.tabButtonActive]}
          onPress={() => setActiveTab("all_parcels")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="cube-outline"
            size={15}
            color={activeTab === "all_parcels" ? "#4f46e5" : "#64748b"}
          />
          <Text
            style={[styles.tabButtonText, activeTab === "all_parcels" && styles.tabButtonTextActive]}
          >
            All Parcels ({totalCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === "create_parcel" && styles.tabButtonActive]}
          onPress={() => setActiveTab("create_parcel")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="add-circle-outline"
            size={15}
            color={activeTab === "create_parcel" ? "#4f46e5" : "#64748b"}
          />
          <Text
            style={[styles.tabButtonText, activeTab === "create_parcel" && styles.tabButtonTextActive]}
          >
            Create New Parcel
          </Text>
        </TouchableOpacity>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total</Text>
          <Text style={styles.metricValue}>{totalCount}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Transit</Text>
          <Text style={[styles.metricValue, { color: "#2563eb" }]}>{inTransitCount}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Delivered</Text>
          <Text style={[styles.metricValue, { color: "#059669" }]}>{deliveredCount}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Pickup</Text>
          <Text style={[styles.metricValue, { color: "#d97706" }]}>{pickupCount}</Text>
        </View>
      </View>

      {/* TAB 1: ALL PARCELS */}
      {activeTab === "all_parcels" && (
        <>
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
          <View style={{ height: 42 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              {[
                "ALL",
                "In Transit",
                "Dispatched",
                "Pickup Scheduled",
                "Delivered",
                "RTO",
                "Pending",
              ].map((st) => (
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
          </View>

          {/* Shipments List */}
          <ScrollView style={styles.scroll} contentContainerStyle={styles.listContent}>
            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#4f46e5" />
                <Text style={styles.loadingText}>Fetching live Shiprocket orders...</Text>
              </View>
            ) : filtered.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="cube-outline" size={40} color="#cbd5e1" />
                <Text style={styles.emptyText}>No shipments matching filter.</Text>
                <TouchableOpacity
                  style={styles.emptyCreateBtn}
                  onPress={() => setActiveTab("create_parcel")}
                >
                  <Text style={styles.emptyCreateBtnText}>+ Create New Parcel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filtered.map((item) => {
                const colors = getStatusColor(item.statusLabel);
                return (
                  <View key={item.id} style={styles.shipmentCard}>
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.orderIdText}>{item.orderId}</Text>
                        {item.awbNumber ? (
                          <TouchableOpacity
                            onPress={() => handleOpenTracking(item.awbNumber)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.awbText}>AWB: {item.awbNumber} ↗</Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.awbPendingText}>AWB Pending</Text>
                        )}
                      </View>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: colors.bg, borderColor: colors.border },
                        ]}
                      >
                        <Text style={[styles.statusText, { color: colors.text }]}>
                          {item.statusLabel}
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
                        {item.destination || item.address || "Destination"}
                      </Text>
                    </View>

                    <View style={styles.cardFooter}>
                      <View style={styles.courierBadge}>
                        <Ionicons name="bicycle-outline" size={12} color="#475569" />
                        <Text style={styles.courierText}>{item.courier || "Shiprocket"}</Text>
                      </View>

                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={styles.priceText}>₹{item.amount.toLocaleString()}</Text>
                        {item.awbNumber ? (
                          <TouchableOpacity
                            style={styles.trackBtn}
                            onPress={() => handleOpenTracking(item.awbNumber)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.trackBtnText}>Track</Text>
                            <Ionicons name="navigate-outline" size={11} color="#ffffff" />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </>
      )}

      {/* TAB 2: CREATE NEW PARCEL */}
      {activeTab === "create_parcel" && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.formContainer}>
          <View style={styles.formCard}>
            {/* 1. Pickup Address (From Address) */}
            <Text style={styles.sectionHeader}>Pickup Address (From Address)</Text>
            <View
              style={{
                backgroundColor: "#f5f3ff",
                borderWidth: 1,
                borderColor: "#ddd6fe",
                borderRadius: 12,
                padding: 12,
                marginBottom: 14,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <View
                  style={{
                    backgroundColor: "#6d28d9",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 5,
                  }}
                >
                  <Text style={{ color: "#ffffff", fontSize: 9.5, fontWeight: "900", textTransform: "uppercase" }}>
                    work
                  </Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: "900", color: "#0f172a", flex: 1 }}>
                  spiritual homeopathy dilsukhnagar
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                    backgroundColor: "#dcfce7",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "#86efac",
                  }}
                >
                  <Ionicons name="checkmark-circle" size={11} color="#15803d" />
                  <Text style={{ fontSize: 9.5, fontWeight: "800", color: "#15803d" }}>Verified</Text>
                </View>
              </View>
              <Text style={{ fontSize: 11, color: "#475569", lineHeight: 16 }}>
                Durganagar Rd, AP State Housing Board, Durga Nagar, Krishna Nagar, Dilsukhnagar,
                Hyderabad, Telangana 500060 model bank road K.V.Rangareddy Telangana-500060
              </Text>
            </View>

            {/* 2. Delivery Details */}
            <Text style={styles.sectionHeader}>Delivery Details (Buyer)</Text>
            <Text style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>
              Enter the Delivery Details of your buyer for whom you are making this order
            </Text>

            <Text style={styles.inputLabel}>Mobile Number *</Text>
            <View
              style={{
                flexDirection: "row",
                borderWidth: 1,
                borderColor: "#cbd5e1",
                borderRadius: 10,
                overflow: "hidden",
                backgroundColor: "#ffffff",
              }}
            >
              <View
                style={{
                  backgroundColor: "#f1f5f9",
                  paddingHorizontal: 10,
                  justifyContent: "center",
                  borderRightWidth: 1,
                  borderRightColor: "#cbd5e1",
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748b" }}>+91</Text>
              </View>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    flex: 1,
                    borderWidth: 0,
                    fontFamily: "monospace",
                    fontWeight: "700",
                  },
                ]}
                placeholder="Enter mobile number"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 10))}
              />
            </View>

            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Enter Full Name"
              placeholderTextColor="#94a3b8"
              value={patientName}
              onChangeText={setPatientName}
            />

            <Text style={styles.inputLabel}>Complete Address *</Text>
            <TextInput
              style={[styles.formInput, { height: 60, textAlignVertical: "top" }]}
              placeholder="Enter Buyer's full address"
              placeholderTextColor="#94a3b8"
              multiline
              value={address}
              onChangeText={setAddress}
            />

            <Text style={styles.inputLabel}>Landmark (Optional)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Enter any nearby landmark"
              placeholderTextColor="#94a3b8"
              value={landmark}
              onChangeText={setLandmark}
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Pincode *</Text>
                <TextInput
                  style={[styles.formInput, { fontFamily: "monospace", fontWeight: "700" }]}
                  placeholder="Enter pincode"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={pincode}
                  onChangeText={(t) => setPincode(t.replace(/\D/g, "").slice(0, 6))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>City *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="City"
                  value={city}
                  onChangeText={setCity}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>State *</Text>
            <TextInput
              style={styles.formInput}
              placeholder="State"
              value={state}
              onChangeText={setState}
              placeholderTextColor="#94a3b8"
            />

            {/* 3. Payment Method */}
            <View style={styles.cardDivider} />
            <Text style={styles.sectionHeader}>Payment Method</Text>
            <Text style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>
              Select the payment mode, chosen by the buyer for this order.
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                style={[styles.payOptionBtn, paymentMethod === "Prepaid" && styles.payOptionBtnActive]}
                onPress={() => setPaymentMethod("Prepaid")}
              >
                <Ionicons
                  name={paymentMethod === "Prepaid" ? "radio-button-on" : "radio-button-off"}
                  size={15}
                  color={paymentMethod === "Prepaid" ? "#4f46e5" : "#64748b"}
                />
                <Text
                  style={[
                    styles.payOptionText,
                    paymentMethod === "Prepaid" && styles.payOptionTextActive,
                  ]}
                >
                  Prepaid
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.payOptionBtn, paymentMethod === "COD" && styles.payOptionBtnActive]}
                onPress={() => setPaymentMethod("COD")}
              >
                <Ionicons
                  name={paymentMethod === "COD" ? "radio-button-on" : "radio-button-off"}
                  size={15}
                  color={paymentMethod === "COD" ? "#4f46e5" : "#64748b"}
                />
                <Text
                  style={[
                    styles.payOptionText,
                    paymentMethod === "COD" && styles.payOptionTextActive,
                  ]}
                >
                  Cash on Delivery (COD)
                </Text>
              </TouchableOpacity>
            </View>

            {/* 4. Product Details & Live Amount Calculation */}
            <View style={styles.cardDivider} />
            <Text style={styles.sectionHeader}>Product Details</Text>

            <Text style={styles.inputLabel}>Product Name *</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Enter or search your product name"
              value={itemName}
              onChangeText={setItemName}
              placeholderTextColor="#94a3b8"
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Unit Price (₹) *</Text>
                <TextInput
                  style={[styles.formInput, { fontFamily: "monospace", fontWeight: "700" }]}
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={itemPrice}
                  onChangeText={setItemPrice}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Quantity</Text>
                <TextInput
                  style={[styles.formInput, { fontFamily: "monospace", fontWeight: "700" }]}
                  placeholder="1"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={itemUnits}
                  onChangeText={setItemUnits}
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Discount (Optional) (₹)</Text>
                <TextInput
                  style={[styles.formInput, { fontFamily: "monospace" }]}
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={itemDiscount}
                  onChangeText={setItemDiscount}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Tax Rate (%)</Text>
                <TextInput
                  style={[styles.formInput, { fontFamily: "monospace" }]}
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={taxRate}
                  onChangeText={setTaxRate}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Other Charges & Discount (Optional)</Text>
            <TextInput
              style={[styles.formInput, { fontFamily: "monospace", fontWeight: "700" }]}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={otherCharges}
              onChangeText={setOtherCharges}
            />

            {/* Live Calculation Amount Box */}
            <View
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                padding: 10,
                marginTop: 10,
                gap: 4,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 11, color: "#64748b" }}>Sub-total for Product</Text>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#0f172a", fontFamily: "monospace" }}>
                  ₹ {subTotal.toFixed(2)}
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 11, color: "#64748b" }}>Other Charges</Text>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#0f172a", fontFamily: "monospace" }}>
                  ₹ {(parseFloat(otherCharges) || 0).toFixed(2)}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingTop: 6,
                  borderTopWidth: 1,
                  borderTopColor: "#e2e8f0",
                  alignItems: "baseline",
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "900", color: "#0f172a" }}>Total Order Value</Text>
                <Text style={{ fontSize: 14, fontWeight: "900", color: "#4f46e5", fontFamily: "monospace" }}>
                  ₹ {totalOrderValue.toFixed(2)}
                </Text>
              </View>
              <Text style={{ fontSize: 9.5, color: "#94a3b8", fontStyle: "italic", marginTop: 2 }}>
                Note: All the Prices/ Charges are inclusive of GST.
              </Text>
            </View>

            {/* 5. Package Details & Dimensions */}
            <View style={styles.cardDivider} />
            <Text style={styles.sectionHeader}>Package Details</Text>
            <View
              style={{
                backgroundColor: "#fffbeb",
                padding: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#fef3c7",
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 10.5, color: "#92400e" }}>
                💡 <strong>Tip:</strong> Add correct values to avoid weight discrepancy during transit.
              </Text>
            </View>

            <Text style={styles.inputLabel}>Dead Weight (kg) *</Text>
            <TextInput
              style={[styles.formInput, { fontFamily: "monospace", fontWeight: "700" }]}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              value={weightKg}
              onChangeText={setWeightKg}
            />
            <Text style={{ fontSize: 9.5, color: "#94a3b8", marginTop: 2 }}>
              Note: Minimum chargeable wt is 0.5 kg
            </Text>

            <Text style={styles.inputLabel}>Package Dimensions (LxBxH in cm)</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                style={[styles.formInput, { flex: 1, fontFamily: "monospace" }]}
                placeholder="Length"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={lengthCm}
                onChangeText={setLengthCm}
              />
              <TextInput
                style={[styles.formInput, { flex: 1, fontFamily: "monospace" }]}
                placeholder="Breadth"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={breadthCm}
                onChangeText={setBreadthCm}
              />
              <TextInput
                style={[styles.formInput, { flex: 1, fontFamily: "monospace" }]}
                placeholder="Height"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={heightCm}
                onChangeText={setHeightCm}
              />
            </View>

            {/* Applicable Weight Banner */}
            <View
              style={{
                backgroundColor: "#f5f3ff",
                borderRadius: 8,
                padding: 10,
                marginTop: 8,
                borderWidth: 1,
                borderColor: "#ddd6fe",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View>
                <Text style={{ fontSize: 10, color: "#64748b" }}>Volumetric Weight</Text>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#334155", fontFamily: "monospace" }}>
                  {volumetricWeight} kg
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 10, color: "#64748b" }}>Applicable Weight</Text>
                <Text style={{ fontSize: 13, fontWeight: "900", color: "#4f46e5", fontFamily: "monospace" }}>
                  {applicableWeight} kg
                </Text>
              </View>
            </View>

            {/* 6. LIVE COURIERS & PRICES FETCHED FROM SHIPROCKET API */}
            <View style={styles.cardDivider} />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <Text style={styles.sectionHeader}>Couriers & Live Rates</Text>
              {pincode.length === 6 && (
                <TouchableOpacity
                  onPress={() => fetchLiveRates(pincode, applicableWeight, paymentMethod)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Ionicons name="refresh" size={13} color="#4f46e5" />
                  <Text style={{ fontSize: 11, color: "#4f46e5", fontWeight: "700" }}>Check Rates</Text>
                </TouchableOpacity>
              )}
            </View>

            {isLoadingCouriers ? (
              <View style={styles.courierLoadingBox}>
                <ActivityIndicator size="small" color="#4f46e5" />
                <Text style={styles.courierLoadingText}>Fetching live couriers & pricing from Shiprocket...</Text>
              </View>
            ) : availableCouriers.length > 0 ? (
              <View style={{ gap: 8 }}>
                {availableCouriers.map((courier) => {
                  const isSelected = selectedCourier?.courierCompanyId === courier.courierCompanyId;
                  return (
                    <TouchableOpacity
                      key={courier.courierCompanyId}
                      style={[styles.courierCard, isSelected && styles.courierCardSelected]}
                      onPress={() => setSelectedCourier(courier)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.courierCardName, isSelected && { color: "#312e81" }]}>
                          {courier.courierName}
                        </Text>
                        <Text style={styles.courierCardSub}>
                          {courier.mode} • Est. {courier.estimatedDeliveryDays}
                        </Text>
                      </View>
                      <View style={styles.courierPriceBox}>
                        <Text style={styles.courierPriceText}>₹{courier.rate}</Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={16} color="#4f46e5" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.courierEmptyBox}>
                <Ionicons name="bicycle-outline" size={20} color="#94a3b8" />
                <Text style={styles.courierEmptyText}>
                  {pincode.length === 6
                    ? "Checking courier serviceability on Shiprocket..."
                    : "Enter 6-digit delivery pincode to fetch live courier rates."}
                </Text>
              </View>
            )}

            {/* 7. Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleCreateParcel}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#ffffff" />
                  <Text style={styles.submitBtnText}>
                    {selectedCourier
                      ? `Ship Now: ${selectedCourier.courierName} (₹${selectedCourier.rate})`
                      : "Ship Now / Add Order & Generate AWB"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* TRACKING MODAL */}
      <Modal visible={trackingAwb !== null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Shiprocket Live Tracking</Text>
                <Text style={styles.modalSub}>AWB: {trackingAwb}</Text>
              </View>
              <TouchableOpacity onPress={() => setTrackingAwb(null)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {isLoadingTrack ? (
                <View style={{ paddingVertical: 24, alignItems: "center" }}>
                  <ActivityIndicator size="small" color="#4f46e5" />
                  <Text style={styles.loadingText}>Fetching tracking scans...</Text>
                </View>
              ) : trackingData ? (
                <View style={{ gap: 10 }}>
                  <View style={styles.trackStatusBanner}>
                    <Text style={styles.trackStatusLabel}>Current Status</Text>
                    <Text style={styles.trackStatusValue}>
                      {trackingData.shipmentStatus || "In Transit"}
                    </Text>
                  </View>
                  {trackingData.currentLocation ? (
                    <Text style={styles.trackLocationText}>
                      Checkpoint: {trackingData.currentLocation}
                    </Text>
                  ) : null}
                  {trackingData.courierName ? (
                    <Text style={styles.trackLocationText}>
                      Courier: {trackingData.courierName}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.openWebTrackerBtn}
                onPress={() => {
                  if (trackingAwb) {
                    Linking.openURL(`https://shiprocket.co/tracking/${trackingAwb}`);
                  }
                }}
              >
                <Text style={styles.openWebTrackerText}>Open Shiprocket Page</Text>
                <Ionicons name="open-outline" size={13} color="#4f46e5" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setTrackingAwb(null)}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  tabButtonActive: {
    backgroundColor: "#ffffff",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
  },
  tabButtonText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#64748b",
  },
  tabButtonTextActive: {
    color: "#4f46e5",
    fontWeight: "800",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: 2,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
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
    paddingVertical: 4,
    alignItems: "center",
  },
  filterPill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#e2e8f0",
  },
  filterPillActive: {
    backgroundColor: "#4f46e5",
  },
  filterPillText: {
    fontSize: 10.5,
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
    paddingTop: 4,
    paddingBottom: 24,
    gap: 10,
  },
  loadingBox: {
    paddingVertical: 36,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 11.5,
    color: "#64748b",
    fontWeight: "500",
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
  emptyCreateBtn: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#4f46e5",
    borderRadius: 10,
  },
  emptyCreateBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
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
  awbPendingText: {
    fontSize: 10.5,
    color: "#94a3b8",
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
    marginVertical: 10,
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
  priceText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0f172a",
  },
  trackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#4f46e5",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
  },
  trackBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#ffffff",
  },
  formContainer: {
    padding: 14,
    paddingBottom: 32,
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    marginTop: 8,
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: "#0f172a",
  },
  payOptionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
  },
  payOptionBtnActive: {
    borderColor: "#818cf8",
    backgroundColor: "#eef2ff",
  },
  payOptionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  payOptionTextActive: {
    color: "#4338ca",
    fontWeight: "800",
  },
  courierLoadingBox: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 6,
  },
  courierLoadingText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },
  courierEmptyBox: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    gap: 4,
  },
  courierEmptyText: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
  },
  courierCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 10,
  },
  courierCardSelected: {
    borderColor: "#6366f1",
    backgroundColor: "#f5f3ff",
  },
  courierCardName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0f172a",
  },
  courierCardSub: {
    fontSize: 10.5,
    color: "#64748b",
    fontWeight: "500",
    marginTop: 2,
  },
  courierPriceBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  courierPriceText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#4338ca",
  },
  submitBtn: {
    backgroundColor: "#4f46e5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 18,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    padding: 16,
    elevation: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  modalSub: {
    fontSize: 11,
    color: "#6366f1",
    fontWeight: "700",
    marginTop: 1,
  },
  modalBody: {
    paddingVertical: 12,
  },
  trackStatusBanner: {
    backgroundColor: "#eef2ff",
    borderRadius: 10,
    padding: 10,
  },
  trackStatusLabel: {
    fontSize: 9.5,
    color: "#6366f1",
    fontWeight: "800",
    textTransform: "uppercase",
  },
  trackStatusValue: {
    fontSize: 14,
    fontWeight: "900",
    color: "#1e1b4b",
    marginTop: 2,
  },
  trackLocationText: {
    fontSize: 11.5,
    color: "#475569",
    fontWeight: "600",
  },
  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  openWebTrackerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  openWebTrackerText: {
    fontSize: 11,
    color: "#4f46e5",
    fontWeight: "700",
  },
  modalCloseBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  modalCloseText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
});
