import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  BackHandler,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getActiveBranch } from "../../../services/auth";

const COLORS = {
  blue: "#268ec8",
  green: "#a8ce3a",
  white: "#ffffff",
  textDark: "#1e293b",
  textMuted: "#64748b",
  border: "#e2e8f0",
  bg: "#f8fafc",
  cardBg: "#ffffff",
};

export default function ReceptionAllPatientsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeBranch, setActiveBranch] = useState<any>(null);

  useEffect(() => {
    getActiveBranch().then((b) => {
      if (b) setActiveBranch(b);
    });
  }, []);

  const [patients] = useState([
    {
      id: "1",
      mrn: "SPH-2026-0842",
      name: "Venkatesh Rao",
      age: 46,
      gender: "Male",
      phone: "+91 98480 23456",
      city: "Hyderabad",
      lastVisit: "Today",
      totalVisits: 4,
    },
    {
      id: "2",
      mrn: "SPH-2026-0914",
      name: "Ananya Sharma",
      age: 29,
      gender: "Female",
      phone: "+91 97001 88442",
      city: "Hyderabad",
      lastVisit: "02 Nov 2026",
      totalVisits: 2,
    },
    {
      id: "3",
      mrn: "SPH-2026-1022",
      name: "Mohammed Farooq",
      age: 38,
      gender: "Male",
      phone: "+91 81255 44901",
      city: "Hyderabad",
      lastVisit: "28 Oct 2026",
      totalVisits: 1,
    },
    {
      id: "4",
      mrn: "SPH-2026-0789",
      name: "Srilatha Devi",
      age: 52,
      gender: "Female",
      phone: "+91 94401 55678",
      city: "Hyderabad",
      lastVisit: "Today",
      totalVisits: 6,
    },
  ]);

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

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.mrn.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search)
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.blue} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>All Patients</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {activeBranch?.name ? `${activeBranch.name} • Patient Directory` : "Medical Records Directory"}
          </Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, MRN or mobile..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {filtered.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.mrnText}>{item.mrn}</Text>
              <Text style={styles.visitsText}>{item.totalVisits} Visits</Text>
            </View>

            <Text style={styles.nameText}>{item.name}</Text>
            <Text style={styles.subText}>
              {item.age} yrs • {item.gender} • {item.city}
            </Text>

            <View style={styles.cardFooter}>
              <View style={styles.phoneRow}>
                <Ionicons name="call-outline" size={13} color={COLORS.blue} />
                <Text style={styles.phoneText}>{item.phone}</Text>
              </View>
              <Text style={styles.lastVisitText}>Last: {item.lastVisit}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#f0f6fc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textDark,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    elevation: 1,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  mrnText: {
    fontSize: 13,
    fontFamily: "monospace",
    fontWeight: "700",
    color: COLORS.blue,
  },
  visitsText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.green,
  },
  nameText: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  subText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  phoneText: {
    fontSize: 12,
    color: COLORS.textDark,
    fontWeight: "600",
  },
  lastVisitText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
});

