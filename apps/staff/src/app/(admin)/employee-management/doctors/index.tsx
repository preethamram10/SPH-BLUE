import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  themeBlue: "#0284c7",
  themeBlueLight: "#e0f2fe",
  green: "#16a34a",
  white: "#ffffff",
  textDark: "#0f172a",
  textMuted: "#64748b",
  textLight: "#94a3b8",
  border: "#cbd5e1",
  cardBorder: "#e2e8f0",
  bg: "#f8fafc",
  cardBg: "#ffffff",
};

interface Doctor {
  id: string;
  name: string;
  qualification: string;
  specialty: string;
  branch: string;
  phone: string;
  timing: string;
  status: "ACTIVE" | "ON_LEAVE";
}

export default function AdminDoctorsManagementScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // New Doctor Form
  const [name, setName] = useState("");
  const [qualification, setQualification] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [branch, setBranch] = useState("KPHB Branch");
  const [phone, setPhone] = useState("");
  const [timing, setTiming] = useState("10:00 AM - 02:00 PM");

  const [doctors, setDoctors] = useState<Doctor[]>([
    {
      id: "1",
      name: "Dr. Ramesh Gupta",
      qualification: "MD (Hom)",
      specialty: "Chief Consultant Homeopath",
      branch: "KPHB Branch",
      phone: "+91 98480 11223",
      timing: "10:00 AM - 02:00 PM",
      status: "ACTIVE",
    },
    {
      id: "2",
      name: "Dr. Sneha Reddy",
      qualification: "BHMS",
      specialty: "Classical Homeopath",
      branch: "KPHB Branch",
      phone: "+91 97001 44556",
      timing: "02:00 PM - 07:00 PM",
      status: "ACTIVE",
    },
    {
      id: "3",
      name: "Dr. K. Srinivas",
      qualification: "MD (Hom)",
      specialty: "Senior Physician",
      branch: "Dilsukhnagar Branch",
      phone: "+91 94401 77889",
      timing: "11:00 AM - 04:00 PM",
      status: "ACTIVE",
    },
    {
      id: "4",
      name: "Dr. Meenakshi Sundaram",
      qualification: "BHMS",
      specialty: "Chronic & Pediatric Specialist",
      branch: "Gachibowli Branch",
      phone: "+91 81255 33221",
      timing: "04:00 PM - 08:00 PM",
      status: "ACTIVE",
    },
  ]);

  const handleAddDoctor = () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("Required", "Please provide Doctor Name and Phone number.");
      return;
    }

    const newDoc: Doctor = {
      id: String(Date.now()),
      name: name.startsWith("Dr.") ? name : `Dr. ${name}`,
      qualification: qualification || "BHMS",
      specialty: specialty || "Homeopathy Consultant",
      branch,
      phone,
      timing,
      status: "ACTIVE",
    };

    setDoctors([newDoc, ...doctors]);
    setShowAddModal(false);
    setName("");
    setQualification("");
    setSpecialty("");
    setPhone("");
  };

  const filtered = doctors.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.specialty.toLowerCase().includes(search.toLowerCase()) ||
      d.branch.toLowerCase().includes(search.toLowerCase()) ||
      d.phone.includes(search)
  );

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
            <Text style={styles.headerSub}>{doctors.length} Doctors Registered</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
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
          placeholder="Search doctor by name, branch or phone..."
          placeholderTextColor={COLORS.textLight}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Doctors List */}
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {filtered.map((doc) => (
          <View key={doc.id} style={styles.docCard}>
            <View style={styles.cardTop}>
              <View style={styles.avatar}>
                <Ionicons name="medkit" size={18} color={COLORS.themeBlue} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.docName}>{doc.name}</Text>
                <Text style={styles.docQual}>
                  {doc.qualification} • {doc.specialty}
                </Text>
                <Text style={styles.docBranch}>📍 {doc.branch}</Text>
              </View>

              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{doc.status}</Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.cardBottom}>
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.infoText}>{doc.phone}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={14} color={COLORS.themeBlue} />
                <Text style={styles.infoText}>{doc.timing}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add Doctor Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Consulting Doctor</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close-circle" size={22} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.label}>Doctor Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Dr. Rajesh Kumar"
                placeholderTextColor={COLORS.textLight}
                value={name}
                onChangeText={setName}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Qualification</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="MD (Hom) / BHMS"
                    placeholderTextColor={COLORS.textLight}
                    value={qualification}
                    onChangeText={setQualification}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Phone Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+91 98765 43210"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>
              </View>

              <Text style={styles.label}>Assigned Branch</Text>
              <TextInput
                style={styles.input}
                placeholder="KPHB Branch"
                placeholderTextColor={COLORS.textLight}
                value={branch}
                onChangeText={setBranch}
              />

              <Text style={styles.label}>Specialization</Text>
              <TextInput
                style={styles.input}
                placeholder="Classical Homeopathy / Chronic Disorders"
                placeholderTextColor={COLORS.textLight}
                value={specialty}
                onChangeText={setSpecialty}
              />

              <Text style={styles.label}>Consultation Hours</Text>
              <TextInput
                style={styles.input}
                placeholder="10:00 AM - 02:00 PM"
                placeholderTextColor={COLORS.textLight}
                value={timing}
                onChangeText={setTiming}
              />

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAddDoctor}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>Save Doctor Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    paddingVertical: 10,
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
  },
  addButton: {
    backgroundColor: COLORS.themeBlue,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textDark,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
    gap: 12,
  },
  docCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.themeBlueLight,
    justifyContent: "center",
    alignItems: "center",
  },
  docName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  docQual: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  docBranch: {
    fontSize: 10.5,
    color: COLORS.themeBlue,
    fontWeight: "600",
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.green,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 10,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
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
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  modalForm: {
    gap: 12,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    fontSize: 11.5,
    fontWeight: "600",
    color: COLORS.textDark,
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
  submitBtn: {
    backgroundColor: COLORS.themeBlue,
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
  },
});

