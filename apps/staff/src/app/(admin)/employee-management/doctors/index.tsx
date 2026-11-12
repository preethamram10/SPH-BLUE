import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../../../../services/auth";

const COLORS = {
  themeBlue: "#0284c7",
  themeBlueDark: "#0369a1",
  themeBlueLight: "#e0f2fe",
  purple: "#8b5cf6",
  purpleLight: "#f3e8ff",
  green: "#16a34a",
  greenLight: "#dcfce7",
  amber: "#d97706",
  amberLight: "#fef3c7",
  red: "#dc2626",
  redLight: "#fee2e2",
  white: "#ffffff",
  textDark: "#0f172a",
  textMuted: "#64748b",
  textLight: "#94a3b8",
  border: "#cbd5e1",
  cardBorder: "#e2e8f0",
  bg: "#f8fafc",
  cardBg: "#ffffff",
};

export interface Doctor {
  id: string;
  name: string;
  category: "DOCTOR";
  doctorCategory?: "HEAD" | "EMPLOYEE";
  qualification?: string;
  specialty?: string;
  branchName?: string;
  phone: string;
  email?: string;
  shiftHours?: string;
  dailyHours?: string;
  salary?: number;
  status?: string;
}

const DEFAULT_BRANCHES = [
  "Kphb Branch",
  "Chandanagar Branch",
  "Dilshuknagar Branch",
  "Nallagandla Branch",
  "All Branches",
];

export default function AdminDoctorsManagementScreen() {
  const router = useRouter();

  // Data State
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [branches, setBranches] = useState<string[]>(DEFAULT_BRANCHES);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<"ALL" | "HEAD" | "EMPLOYEE">("ALL");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("ALL");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formDoctorCategory, setFormDoctorCategory] = useState<"HEAD" | "EMPLOYEE">("EMPLOYEE");
  const [formPhone, setFormPhone] = useState("");
  const [formBranch, setFormBranch] = useState("Kphb Branch");
  const [formQualification, setFormQualification] = useState("");
  const [formSpecialty, setFormSpecialty] = useState("");
  const [formShiftHours, setFormShiftHours] = useState("10:00 AM - 08:00 PM");
  const [formSalary, setFormSalary] = useState("95000");
  const [formStatus, setFormStatus] = useState<"Active" | "On Leave">("Active");

  // Fetch doctors from backend
  const fetchDoctors = useCallback(async () => {
    try {
      const res = await apiFetch<any>("/admin/employees?category=DOCTOR");
      const list = res.employees || [];
      setDoctors(list);
    } catch (err: any) {
      console.warn("Failed to fetch doctors:", err);
      Alert.alert("Network Notice", "Unable to load live doctor records: " + (err.message || "Please retry."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    try {
      const res = await apiFetch<any>("/branches");
      const list = res.data || res.branches || [];
      if (Array.isArray(list) && list.length > 0) {
        const names = list.map((b: any) => b.name);
        if (!names.includes("All Branches")) names.push("All Branches");
        setBranches(names);
      }
    } catch {
      // Keep default branch list
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
    fetchBranches();
  }, [fetchDoctors, fetchBranches]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDoctors();
  };

  // Open modal for adding
  const handleOpenAdd = () => {
    setEditingDoctor(null);
    setFormName("");
    setFormDoctorCategory("EMPLOYEE");
    setFormPhone("");
    setFormBranch(branches[0] || "Kphb Branch");
    setFormQualification("");
    setFormSpecialty("");
    setFormShiftHours("10:00 AM - 08:00 PM");
    setFormSalary("95000");
    setFormStatus("Active");
    setShowModal(true);
  };

  // Open modal for editing
  const handleOpenEdit = (doc: Doctor) => {
    setEditingDoctor(doc);
    setFormName(doc.name);
    setFormDoctorCategory(doc.doctorCategory === "HEAD" ? "HEAD" : "EMPLOYEE");
    setFormPhone(doc.phone.replace("+91", "").trim());
    setFormBranch(doc.branchName || branches[0] || "Kphb Branch");
    setFormQualification(doc.qualification || "");
    setFormSpecialty(doc.specialty || "");
    setFormShiftHours(doc.shiftHours && doc.shiftHours !== "-" ? doc.shiftHours : "10:00 AM - 08:00 PM");
    setFormSalary(doc.salary ? String(doc.salary) : "0");
    setFormStatus(doc.status === "On Leave" ? "On Leave" : "Active");
    setShowModal(true);
  };

  // Save or update doctor
  const handleSaveDoctor = async () => {
    if (!formName.trim() || !formPhone.trim()) {
      Alert.alert("Missing Fields", "Please enter Doctor Name and Mobile Number.");
      return;
    }

    try {
      setSubmitting(true);
      const isHead = formDoctorCategory === "HEAD";
      const payload: any = {
        id: editingDoctor ? editingDoctor.id : undefined,
        name: formName.trim().startsWith("Dr.") ? formName.trim() : `Dr. ${formName.trim()}`,
        category: "DOCTOR",
        doctorCategory: formDoctorCategory,
        phone: formPhone.trim().startsWith("+91") ? formPhone.trim() : `+91 ${formPhone.trim()}`,
        branchName: formBranch.trim() || "Kphb Branch",
        qualification: formQualification.trim() || (isHead ? "Chief Consultant" : "BHMS / MD (Hom)"),
        specialty: formSpecialty.trim() || (isHead ? "Chief Homeopath & Case Supervisor" : "Classical Homeopathy"),
        salary: isHead ? 0 : (Number(formSalary) || 0),
        shiftType: "SINGLE_STRICT",
        shiftHours: isHead ? "-" : (formShiftHours.trim() || "10:00 AM - 08:00 PM"),
        dailyHours: isHead ? "-" : "10 hrs/day",
        status: formStatus,
      };

      const res = await apiFetch<any>("/admin/employees", {
        method: editingDoctor ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      if (res.success || res.employee) {
        Alert.alert(
          "Success",
          editingDoctor
            ? `${payload.name}'s profile was updated.`
            : `${payload.name} has been added successfully.`
        );
        setShowModal(false);
        fetchDoctors();
      } else {
        throw new Error(res.error || "Failed to save doctor");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save doctor profile.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete doctor
  const handleDeleteDoctor = (doc: Doctor) => {
    Alert.alert(
      "Confirm Removal",
      `Are you sure you want to remove ${doc.name} from the clinic personnel directory?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Doctor",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch<any>(`/admin/employees?id=${doc.id}`, { method: "DELETE" });
              setDoctors((prev) => prev.filter((d) => d.id !== doc.id));
              Alert.alert("Removed", `${doc.name} has been removed.`);
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete doctor.");
            }
          },
        },
      ]
    );
  };

  // Direct phone call
  const handleCallDoctor = (phone: string) => {
    const cleaned = phone.replace(/[^0-9+]/g, "");
    if (cleaned) {
      Linking.openURL(`tel:${cleaned}`).catch(() => {
        Alert.alert("Phone Call", `Cannot dial ${phone} on this device.`);
      });
    }
  };

  // Filtered Doctors list
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      // Role filter
      if (selectedRoleFilter === "HEAD" && doc.doctorCategory !== "HEAD") return false;
      if (selectedRoleFilter === "EMPLOYEE" && doc.doctorCategory === "HEAD") return false;

      // Branch filter
      if (selectedBranchFilter !== "ALL") {
        const b = (doc.branchName || "").toLowerCase();
        const target = selectedBranchFilter.toLowerCase();
        if (!b.includes(target) && b !== "all branches") return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const nameMatch = (doc.name || "").toLowerCase().includes(q);
        const branchMatch = (doc.branchName || "").toLowerCase().includes(q);
        const specMatch = (doc.specialty || "").toLowerCase().includes(q);
        const qualMatch = (doc.qualification || "").toLowerCase().includes(q);
        const phoneMatch = (doc.phone || "").replace(/[^0-9]/g, "").includes(q.replace(/[^0-9]/g, ""));
        return nameMatch || branchMatch || specMatch || qualMatch || phoneMatch;
      }

      return true;
    });
  }, [doctors, selectedRoleFilter, selectedBranchFilter, search]);

  const headCount = useMemo(() => doctors.filter((d) => d.doctorCategory === "HEAD").length, [doctors]);
  const empCount = useMemo(() => doctors.filter((d) => d.doctorCategory !== "HEAD").length, [doctors]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.textDark} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Doctors Management</Text>
            <Text style={styles.headerSub}>
              {loading ? "Loading doctors..." : `${doctors.length} Doctors Registered`}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleOpenAdd}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color={COLORS.white} />
          <Text style={styles.addButtonText}>Add Doctor</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={COLORS.textLight} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by doctor name, specialty, branch, or phone..."
          placeholderTextColor={COLORS.textLight}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Role Filter Tabs */}
      <View style={styles.filterTabsContainer}>
        <TouchableOpacity
          style={[styles.filterTab, selectedRoleFilter === "ALL" && styles.filterTabActive]}
          onPress={() => setSelectedRoleFilter("ALL")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.filterTabText,
              selectedRoleFilter === "ALL" && styles.filterTabTextActive,
            ]}
          >
            All ({doctors.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, selectedRoleFilter === "HEAD" && styles.filterTabActive]}
          onPress={() => setSelectedRoleFilter("HEAD")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.filterTabText,
              selectedRoleFilter === "HEAD" && styles.filterTabTextActive,
            ]}
          >
            Head Doctors ({headCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, selectedRoleFilter === "EMPLOYEE" && styles.filterTabActive]}
          onPress={() => setSelectedRoleFilter("EMPLOYEE")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.filterTabText,
              selectedRoleFilter === "EMPLOYEE" && styles.filterTabTextActive,
            ]}
          >
            Consultants ({empCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Doctors List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.themeBlue} />
          <Text style={styles.loadingText}>Loading doctors directory...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.themeBlue]}
              tintColor={COLORS.themeBlue}
            />
          }
        >
          {filteredDoctors.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="medkit-outline" size={36} color={COLORS.textLight} />
              </View>
              <Text style={styles.emptyTitle}>No doctors found</Text>
              <Text style={styles.emptySubtitle}>
                {search.trim()
                  ? `No doctor records matched "${search}".`
                  : "No doctors have been registered in this category yet."}
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={handleOpenAdd}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={16} color={COLORS.white} />
                <Text style={styles.emptyAddBtnText}>Add First Doctor</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredDoctors.map((doc) => {
              const isHead = doc.doctorCategory === "HEAD";
              const isOnLeave = doc.status === "On Leave";

              return (
                <View key={doc.id} style={styles.docCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                      <Ionicons
                        name={isHead ? "shield-checkmark" : "medkit"}
                        size={18}
                        color={isHead ? "#0f172a" : COLORS.themeBlue}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.nameRow}>
                        <Text style={styles.docName}>{doc.name}</Text>
                      </View>
                      <View style={styles.badgeRow}>
                        <View
                          style={[
                            styles.roleBadge,
                            isHead ? styles.roleBadgeHead : styles.roleBadgeEmp,
                          ]}
                        >
                          <Text
                            style={[
                              styles.roleBadgeText,
                              isHead ? styles.roleBadgeTextHead : styles.roleBadgeTextEmp,
                            ]}
                          >
                            {isHead ? "Head Doctor" : "Consulting Doctor"}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.statusBadge,
                            isOnLeave ? styles.statusBadgeLeave : styles.statusBadgeActive,
                          ]}
                        >
                          <View
                            style={[
                              styles.statusDot,
                              isOnLeave ? styles.statusDotLeave : styles.statusDotActive,
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              isOnLeave ? styles.statusTextLeave : styles.statusTextActive,
                            ]}
                          >
                            {isOnLeave ? "On Leave" : "Active"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Body Details */}
                  <View style={styles.cardDetails}>
                    {/* Qualification & Specialty */}
                    {(doc.qualification || doc.specialty) && (
                      <View style={styles.detailItem}>
                        <Ionicons name="school-outline" size={13} color={COLORS.themeBlue} />
                        <Text style={styles.detailTextBold}>
                          {[doc.qualification, doc.specialty].filter(Boolean).join(" • ")}
                        </Text>
                      </View>
                    )}

                    {/* Assigned Branch */}
                    <View style={styles.detailItem}>
                      <Ionicons name="location-outline" size={13} color={COLORS.amber} />
                      <Text style={styles.detailText}>
                        Branch:{" "}
                        <Text style={{ fontWeight: "700", color: COLORS.textDark }}>
                          {doc.branchName || "All Branches"}
                        </Text>
                      </Text>
                    </View>

                    {/* Shift & Timings */}
                    <View style={styles.detailItem}>
                      <Ionicons name="time-outline" size={13} color={COLORS.purple} />
                      <Text style={styles.detailText}>
                        Timings:{" "}
                        <Text style={{ fontWeight: "600", color: COLORS.textDark }}>
                          {doc.shiftHours && doc.shiftHours !== "-" ? doc.shiftHours : "Flexible / Consultations"}
                        </Text>
                      </Text>
                    </View>

                    {/* Salary (For Employee Doctor) */}
                    {!isHead && doc.salary !== undefined && doc.salary > 0 && (
                      <View style={styles.detailItem}>
                        <Ionicons name="briefcase-outline" size={13} color={COLORS.green} />
                        <Text style={styles.detailText}>
                          Base Salary:{" "}
                          <Text style={{ fontWeight: "700", color: COLORS.green }}>
                            ₹{doc.salary.toLocaleString("en-IN")}/mo
                          </Text>
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Divider */}
                  <View style={styles.cardDivider} />

                  {/* Footer Action Row */}
                  <View style={styles.cardFooter}>
                    <TouchableOpacity
                      style={styles.phoneChip}
                      onPress={() => handleCallDoctor(doc.phone)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="call" size={12} color={COLORS.themeBlue} />
                      <Text style={styles.phoneChipText}>{doc.phone}</Text>
                    </TouchableOpacity>

                    <View style={styles.actionBtns}>
                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => handleOpenEdit(doc)}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="pencil-outline" size={14} color={COLORS.themeBlue} />
                        <Text style={styles.editBtnText}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteDoctor(doc)}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="trash-outline" size={14} color={COLORS.red} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Add / Edit Doctor Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%", alignItems: "center" }}
          >
            <ScrollView
              style={{ maxHeight: "90%", width: "100%" }}
              contentContainerStyle={{ alignItems: "center", paddingVertical: 10 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalSheet}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>
                      {editingDoctor ? "Edit Doctor Profile" : "Add Consulting Doctor"}
                    </Text>
                    <Text style={styles.modalSub}>
                      {editingDoctor
                        ? "Update qualifications, branch assignment or schedule"
                        : "Register new clinic doctor profile in the database"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowModal(false)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={20} color={COLORS.textDark} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalForm}>
                  {/* Doctor Role Selector */}
                  <View>
                    <Text style={styles.label}>Doctor Category *</Text>
                    <View style={styles.categoryToggleRow}>
                      <TouchableOpacity
                        style={[
                          styles.categoryToggleBtn,
                          formDoctorCategory === "HEAD" && styles.categoryToggleBtnActiveHead,
                        ]}
                        onPress={() => setFormDoctorCategory("HEAD")}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="shield-checkmark"
                          size={15}
                          color={formDoctorCategory === "HEAD" ? COLORS.white : COLORS.textDark}
                        />
                        <Text
                          style={[
                            styles.categoryToggleText,
                            formDoctorCategory === "HEAD" && styles.categoryToggleTextActive,
                          ]}
                        >
                          Head Doctor
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.categoryToggleBtn,
                          formDoctorCategory === "EMPLOYEE" && styles.categoryToggleBtnActiveEmp,
                        ]}
                        onPress={() => setFormDoctorCategory("EMPLOYEE")}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="medkit"
                          size={15}
                          color={formDoctorCategory === "EMPLOYEE" ? COLORS.white : COLORS.textDark}
                        />
                        <Text
                          style={[
                            styles.categoryToggleText,
                            formDoctorCategory === "EMPLOYEE" && styles.categoryToggleTextActive,
                          ]}
                        >
                          Employee Doctor
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Doctor Name */}
                  <View>
                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Dr. Ramesh Kumar"
                      placeholderTextColor={COLORS.textLight}
                      value={formName}
                      onChangeText={setFormName}
                    />
                  </View>

                  {/* Mobile Number & Branch */}
                  <View style={styles.formRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Mobile Number *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="9876543210"
                        placeholderTextColor={COLORS.textLight}
                        keyboardType="phone-pad"
                        value={formPhone}
                        onChangeText={setFormPhone}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Status</Text>
                      <View style={styles.statusToggleRow}>
                        <TouchableOpacity
                          style={[
                            styles.statusChoiceBtn,
                            formStatus === "Active" && styles.statusChoiceActive,
                          ]}
                          onPress={() => setFormStatus("Active")}
                        >
                          <Text
                            style={[
                              styles.statusChoiceText,
                              formStatus === "Active" && styles.statusChoiceTextActive,
                            ]}
                          >
                            Active
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.statusChoiceBtn,
                            formStatus === "On Leave" && styles.statusChoiceLeave,
                          ]}
                          onPress={() => setFormStatus("On Leave")}
                        >
                          <Text
                            style={[
                              styles.statusChoiceText,
                              formStatus === "On Leave" && styles.statusChoiceTextLeave,
                            ]}
                          >
                            On Leave
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Assigned Branch */}
                  <View>
                    <Text style={styles.label}>Assigned Clinic Branch *</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.branchChipsScroll}
                    >
                      {branches.map((b) => (
                        <TouchableOpacity
                          key={b}
                          style={[
                            styles.branchChip,
                            formBranch === b && styles.branchChipSelected,
                          ]}
                          onPress={() => setFormBranch(b)}
                          activeOpacity={0.75}
                        >
                          <Ionicons
                            name="location-sharp"
                            size={12}
                            color={formBranch === b ? COLORS.white : COLORS.themeBlue}
                          />
                          <Text
                            style={[
                              styles.branchChipText,
                              formBranch === b && styles.branchChipTextSelected,
                            ]}
                          >
                            {b}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Qualification & Specialization */}
                  <View style={styles.formRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Qualification</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="MD (Hom) / BHMS"
                        placeholderTextColor={COLORS.textLight}
                        value={formQualification}
                        onChangeText={setFormQualification}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Specialization</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Classical Homeopath"
                        placeholderTextColor={COLORS.textLight}
                        value={formSpecialty}
                        onChangeText={setFormSpecialty}
                      />
                    </View>
                  </View>

                  {/* Timings & Base Salary (Employee Doctor only) */}
                  {formDoctorCategory === "EMPLOYEE" && (
                    <View style={styles.formRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Shift Hours</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="10:00 AM - 08:00 PM"
                          placeholderTextColor={COLORS.textLight}
                          value={formShiftHours}
                          onChangeText={setFormShiftHours}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Monthly Salary (₹)</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="95000"
                          placeholderTextColor={COLORS.textLight}
                          keyboardType="numeric"
                          value={formSalary}
                          onChangeText={setFormSalary}
                        />
                      </View>
                    </View>
                  )}

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                    onPress={handleSaveDoctor}
                    disabled={submitting}
                    activeOpacity={0.85}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={styles.submitBtnText}>
                        {editingDoctor ? "Update Doctor Profile" : "Save Doctor to Clinic"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  headerSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  addButton: {
    backgroundColor: COLORS.themeBlue,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    shadowColor: COLORS.themeBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textDark,
  },
  filterTabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 10,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
  },
  filterTabActive: {
    backgroundColor: COLORS.themeBlue,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  filterTabTextActive: {
    color: COLORS.white,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
    gap: 12,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
    maxWidth: 240,
    marginBottom: 16,
  },
  emptyAddBtn: {
    backgroundColor: COLORS.themeBlue,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  emptyAddBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
  },
  docCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.themeBlueLight,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  docName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeHead: {
    backgroundColor: "#0f172a",
  },
  roleBadgeEmp: {
    backgroundColor: COLORS.themeBlueLight,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  roleBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
  roleBadgeTextHead: {
    color: COLORS.white,
  },
  roleBadgeTextEmp: {
    color: COLORS.themeBlue,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeActive: {
    backgroundColor: COLORS.greenLight,
  },
  statusBadgeLeave: {
    backgroundColor: COLORS.amberLight,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: COLORS.green,
  },
  statusDotLeave: {
    backgroundColor: COLORS.amber,
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
  statusTextActive: {
    color: COLORS.green,
  },
  statusTextLeave: {
    color: COLORS.amber,
  },
  cardDetails: {
    marginTop: 10,
    gap: 4,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  detailTextBold: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  phoneChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  phoneChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  actionBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.themeBlueLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.themeBlue,
  },
  deleteBtn: {
    backgroundColor: COLORS.redLight,
    padding: 5,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  modalSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    maxWidth: 280,
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
    gap: 12,
  },
  categoryToggleRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  categoryToggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: "#f8fafc",
  },
  categoryToggleBtnActiveHead: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  categoryToggleBtnActiveEmp: {
    backgroundColor: COLORS.themeBlue,
    borderColor: COLORS.themeBlue,
  },
  categoryToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  categoryToggleTextActive: {
    color: COLORS.white,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: 4,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 12,
    color: COLORS.textDark,
    backgroundColor: COLORS.white,
  },
  statusToggleRow: {
    flexDirection: "row",
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    overflow: "hidden",
  },
  statusChoiceBtn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  statusChoiceActive: {
    backgroundColor: COLORS.greenLight,
  },
  statusChoiceLeave: {
    backgroundColor: COLORS.amberLight,
  },
  statusChoiceText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  statusChoiceTextActive: {
    color: COLORS.green,
    fontWeight: "700",
  },
  statusChoiceTextLeave: {
    color: COLORS.amber,
    fontWeight: "700",
  },
  branchChipsScroll: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 2,
  },
  branchChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#f8fafc",
  },
  branchChipSelected: {
    backgroundColor: COLORS.themeBlue,
    borderColor: COLORS.themeBlue,
  },
  branchChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  branchChipTextSelected: {
    color: COLORS.white,
    fontWeight: "700",
  },
  submitBtn: {
    backgroundColor: COLORS.themeBlue,
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
    shadowColor: COLORS.themeBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
  },
});
