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

export default function MobileDeleteProfilesScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [found, setFound] = useState<any>(null);

  const handleSearch = () => {
    if (!phone.trim()) return;
    if (phone.length >= 8) {
      setFound({
        name: "K. Ramesh Kumar",
        phone: "+91 " + phone.replace(/\D/g, ""),
        branch: "KPHB Branch",
        visits: "6 clinic visits on record",
      });
    } else {
      Alert.alert("Not Found", "No profile found for this mobile number.");
      setFound(null);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to permanently delete profile for ${found.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert("Success", "Profile deleted successfully.");
            setFound(null);
            setPhone("");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Delete Profiles</Text>
          <Text style={styles.headerSub}>Search &amp; Remove by Mobile</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={20} color="#d97706" />
          <Text style={styles.warningText}>
            Removing a profile purges all associated appointment histories and contact logs.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>ENTER MOBILE NUMBER</Text>
          <View style={styles.searchRow}>
            <TextInput
              placeholder="e.g. 9848012345"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={styles.input}
              placeholderTextColor="#94a3b8"
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
              <Text style={styles.searchBtnText}>Search</Text>
            </TouchableOpacity>
          </View>
        </View>

        {found && (
          <View style={styles.foundCard}>
            <Text style={styles.foundTag}>PROFILE FOUND</Text>
            <Text style={styles.foundName}>{found.name}</Text>
            <Text style={styles.foundPhone}>📞 {found.phone}</Text>
            <Text style={styles.foundBranch}>Branch: {found.branch}</Text>
            <Text style={styles.foundVisits}>{found.visits}</Text>

            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={16} color="#ffffff" />
              <Text style={styles.deleteBtnText}>Permanently Delete Profile</Text>
            </TouchableOpacity>
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
  headerSub: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 14 },
  warningBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  warningText: { flex: 1, fontSize: 11.5, color: "#92400e", lineHeight: 16, fontWeight: "600" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    gap: 10,
  },
  cardTitle: { fontSize: 10.5, fontWeight: "800", color: "#8da2b5", letterSpacing: 0.6 },
  searchRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  searchBtn: {
    backgroundColor: "#0284c7",
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnText: { fontSize: 12, fontWeight: "800", color: "#ffffff" },
  foundCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 16,
    gap: 6,
  },
  foundTag: { fontSize: 9.5, fontWeight: "900", color: "#dc2626", letterSpacing: 0.8 },
  foundName: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  foundPhone: { fontSize: 12, color: "#0284c7", fontWeight: "700" },
  foundBranch: { fontSize: 11.5, color: "#64748b", fontWeight: "600" },
  foundVisits: { fontSize: 11.5, color: "#0f172a", fontWeight: "700" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#dc2626",
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  deleteBtnText: { fontSize: 12.5, fontWeight: "800", color: "#ffffff" },
});

