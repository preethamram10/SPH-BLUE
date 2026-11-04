import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  blue: "#268ec8",
  green: "#a8ce3a",
  white: "#ffffff",
  textDark: "#1e293b",
  textMuted: "#64748b",
  border: "#e2e8f0",
  cardBg: "#ffffff",
  bg: "#f8fafc",
};

interface Branch {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  timings: string;
  photoUrl: string;
  doctorsCount: number;
}

export default function BranchListScreen() {
  const router = useRouter();

  const [branches] = useState<Branch[]>([
    {
      id: "1",
      name: "Spiritual Homeopathy - Kukatpally Branch",
      phone: "+91 90301 76176",
      address: "Plot 102, Metro Pillar A784, KPHB Main Road, Hyderabad - 500072",
      city: "Hyderabad",
      timings: "9:00 AM - 8:30 PM",
      photoUrl: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400&q=80",
      doctorsCount: 4,
    },
    {
      id: "2",
      name: "Spiritual Homeopathy - Banjara Hills Branch",
      phone: "+91 81252 60176",
      address: "Road No. 12, Near MLA Colony, Banjara Hills, Hyderabad - 500034",
      city: "Hyderabad",
      timings: "9:30 AM - 8:00 PM",
      photoUrl: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&q=80",
      doctorsCount: 3,
    },
    {
      id: "3",
      name: "Spiritual Homeopathy - Dilsukhnagar Branch",
      phone: "+91 98480 12345",
      address: "Opp. Konark Theatre, Main Road, Dilsukhnagar, Hyderabad - 500060",
      city: "Hyderabad",
      timings: "10:00 AM - 7:30 PM",
      photoUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&q=80",
      doctorsCount: 2,
    },
  ]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* Top Navbar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.blue} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Clinic Branches</Text>
          <Text style={styles.headerSubtitle}>{branches.length} Registered Locations</Text>
        </View>

        {/* Add Branch Button in Header */}
        <TouchableOpacity
          style={styles.headerAddBtn}
          onPress={() => router.push("/(admin)/branches/create" as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color={COLORS.white} />
          <Text style={styles.headerAddBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Branch Cards */}
        {branches.map((branch) => (
          <View key={branch.id} style={styles.branchCard}>
            {/* Branch Image */}
            <Image
              source={{ uri: branch.photoUrl }}
              style={styles.branchImage}
              resizeMode="cover"
            />

            <View style={styles.cardContent}>
              <View style={styles.cardTopRow}>
                <Text style={styles.branchName}>{branch.name}</Text>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
              </View>

              {/* Phone */}
              <View style={styles.infoRow}>
                <Ionicons name="call" size={15} color={COLORS.blue} style={styles.infoIcon} />
                <Text style={styles.infoText}>{branch.phone}</Text>
              </View>

              {/* Address */}
              <View style={styles.infoRow}>
                <Ionicons name="location" size={15} color={COLORS.blue} style={styles.infoIcon} />
                <Text style={styles.infoText} numberOfLines={2}>
                  {branch.address}
                </Text>
              </View>

              {/* Timings */}
              <View style={styles.infoRow}>
                <Ionicons name="time" size={15} color={COLORS.green} style={styles.infoIcon} />
                <Text style={styles.timingsText}>{branch.timings}</Text>
              </View>

              {/* Footer Row */}
              <View style={styles.cardFooter}>
                <View style={styles.doctorBadge}>
                  <Ionicons name="medkit" size={13} color={COLORS.blue} />
                  <Text style={styles.doctorBadgeText}>{branch.doctorsCount} Doctors Available</Text>
                </View>
                <Text style={styles.viewDetailsText}>Manage Staff →</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Floating Add Branch Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/(admin)/branches/create" as any)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color={COLORS.white} />
        <Text style={styles.fabText}>Add Branch</Text>
      </TouchableOpacity>
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
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 40,
    height: 40,
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
  headerAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.blue,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  headerAddBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  branchCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  branchImage: {
    width: "100%",
    height: 140,
    backgroundColor: "#e2e8f0",
  },
  cardContent: {
    padding: 16,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  branchName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textDark,
    marginRight: 10,
  },
  activeBadge: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  infoIcon: {
    marginRight: 8,
    width: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  timingsText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  doctorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f0f6fc",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  doctorBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.blue,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.blue,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.blue,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: COLORS.blue,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "800",
  },
});
