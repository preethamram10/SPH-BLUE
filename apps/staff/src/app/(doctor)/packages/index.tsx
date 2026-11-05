import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
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

export default function DoctorPackagesScreen() {
  const router = useRouter();
  const [packages, setPackages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"catalog" | "enrolled">("catalog");

  // Enroll Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [patientName, setPatientName] = useState("");
  const [registrationId, setRegistrationId] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPackages = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<any>("/doctor/packages");
      if (data.success) {
        setPackages(data.packages || []);
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const onPullRefresh = async () => {
    setIsPullRefreshing(true);
    await fetchPackages();
    setIsPullRefreshing(false);
  };

  const handleOpenEnroll = (pkg: any) => {
    setSelectedPkg(pkg);
    setPatientName("");
    setPhone("");
    setRegistrationId("");
    setIsModalOpen(true);
  };

  const handleEnroll = async () => {
    if (!selectedPkg || !patientName || !phone) {
      Alert.alert("Required Fields", "Please enter patient name and mobile number.");
      return;
    }
    setIsSubmitting(true);
    try {
      const data = await apiFetch<any>("/doctor/packages", {
        method: "POST",
        body: JSON.stringify({
          packageId: selectedPkg.id,
          patientName,
          registrationId: registrationId || "SPH-GEN",
          phone,
        }),
      });
      if (data.success && data.member) {
        setMembers([data.member, ...members]);
        setIsModalOpen(false);
        setActiveTab("enrolled");
        Alert.alert("Enrolled Successfully", `${patientName} has been enrolled in ${selectedPkg.name}!`);
      } else {
        Alert.alert("Error", data.error || "Failed to enroll patient.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to communicate with server.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        title="Packages"
        onBack={handleBack}
      />

      <View style={styles.container}>
        {/* Tab Toggle */}
        <View style={styles.tabToggleRow}>
          <TouchableOpacity
            style={[
              styles.tabToggleBtn,
              activeTab === "catalog" && styles.tabToggleBtnActive,
            ]}
            onPress={() => setActiveTab("catalog")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="cube"
              size={14}
              color={activeTab === "catalog" ? "#0284c7" : "#64748b"}
            />
            <Text
              style={[
                styles.tabToggleText,
                activeTab === "catalog" && styles.tabToggleTextActive,
              ]}
            >
              Plans ({packages.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabToggleBtn,
              activeTab === "enrolled" && styles.tabToggleBtnActive,
            ]}
            onPress={() => setActiveTab("enrolled")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="people"
              size={14}
              color={activeTab === "enrolled" ? "#0284c7" : "#64748b"}
            />
            <Text
              style={[
                styles.tabToggleText,
                activeTab === "enrolled" && styles.tabToggleTextActive,
              ]}
            >
              Enrolled ({members.length})
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollList}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing}
              onRefresh={onPullRefresh}
              colors={[COLORS.primary]}
            />
          }
        >
          {isLoading && packages.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading treatment packages...</Text>
            </View>
          ) : activeTab === "catalog" ? (
            // Catalog Cards
            packages.map((pkg, idx) => (
              <View key={pkg.id || idx} style={styles.packageCard}>
                <View style={styles.pkgHeader}>
                  <View style={styles.pkgIconBox}>
                    <Ionicons name="sparkles" size={18} color="#0284c7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pkgTitle}>{pkg.name}</Text>
                    <Text style={styles.pkgDuration}>
                      <Ionicons name="time-outline" size={11} color="#64748b" />{" "}
                      {pkg.durationMonths} Months Holistic Care
                    </Text>
                  </View>
                  <View style={styles.priceBadge}>
                    <Text style={styles.priceText}>
                      ₹{(pkg.price || 0).toLocaleString("en-IN")}
                    </Text>
                  </View>
                </View>

                <Text style={styles.pkgDesc}>{pkg.description}</Text>

                <View style={styles.benefitsRow}>
                  <View style={styles.benefitPill}>
                    <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                    <Text style={styles.benefitText}>Unlimited Doctor Consults</Text>
                  </View>
                  <View style={styles.benefitPill}>
                    <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                    <Text style={styles.benefitText}>Medicines Included</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.enrollCtaBtn}
                  onPress={() => handleOpenEnroll(pkg)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person-add" size={15} color="#ffffff" />
                  <Text style={styles.enrollCtaText}>Enroll Patient</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            // Enrolled Members List
            members.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={44} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No Enrolled Patients</Text>
                <Text style={styles.emptySubtext}>
                  No patients are currently enrolled under active health packages.
                </Text>
              </View>
            ) : (
              members.map((m, idx) => (
                <View key={m.id || idx} style={styles.memberCard}>
                  <View style={styles.memberTop}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberInitials}>
                        {(m.patientName || "P").slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>{m.patientName}</Text>
                      <Text style={styles.memberSub}>
                        {m.registrationId || "SPH-GEN"} • {m.phone}
                      </Text>
                    </View>
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>ACTIVE</Text>
                    </View>
                  </View>

                  <View style={styles.memberMetaRow}>
                    <Text style={styles.memberPkgName}>{m.packageName}</Text>
                    <Text style={styles.memberExpiry}>
                      Valid till: {m.validTill || "1 Year"}
                    </Text>
                  </View>
                </View>
              ))
            )
          )}
        </ScrollView>
      </View>

      {/* Enrollment Modal */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Enroll in Package</Text>
                <Text style={styles.modalSub}>{selectedPkg?.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.inputLabel}>Patient Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Rahul Sharma"
                value={patientName}
                onChangeText={setPatientName}
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Mobile Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Patient Registration ID (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. SPH-KPB-0001"
                value={registrationId}
                onChangeText={setRegistrationId}
                placeholderTextColor="#94a3b8"
              />

              <TouchableOpacity
                style={[styles.confirmBtn, isSubmitting && { opacity: 0.7 }]}
                onPress={handleEnroll}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={17} color="#ffffff" />
                    <Text style={styles.confirmBtnText}>
                      Confirm Enrollment (₹
                      {(selectedPkg?.price || 0).toLocaleString("en-IN")})
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Persistent Bottom Nav */}
      <DoctorBottomNav activeTab="packages" />
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
  tabToggleRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    gap: 8,
  },
  tabToggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  tabToggleBtnActive: {
    backgroundColor: "#e0f2fe",
  },
  tabToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  tabToggleTextActive: {
    color: "#0284c7",
    fontWeight: "700",
  },
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 24,
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
    marginTop: 20,
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
  packageCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  pkgHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  pkgIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
  },
  pkgTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  pkgDuration: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  priceBadge: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#16a34a",
  },
  pkgDesc: {
    fontSize: 11.5,
    color: "#475569",
    lineHeight: 17,
    marginBottom: 10,
  },
  benefitsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  benefitPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  benefitText: {
    fontSize: 10.5,
    color: "#334155",
    fontWeight: "500",
  },
  enrollCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0284c7",
    paddingVertical: 9,
    borderRadius: 9,
  },
  enrollCtaText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#ffffff",
  },
  memberCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  memberTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
  },
  memberInitials: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0284c7",
  },
  memberName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  memberSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  activePill: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#16a34a",
  },
  memberMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  memberPkgName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0284c7",
  },
  memberExpiry: {
    fontSize: 10.5,
    color: "#64748b",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalSub: {
    fontSize: 12,
    color: "#0284c7",
    fontWeight: "600",
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalForm: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#334155",
    marginTop: 6,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0f172a",
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 14,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
});
