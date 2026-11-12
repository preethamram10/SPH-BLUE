import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getActiveDoctor, getUserRole, saveActiveDoctor } from "../../../services/auth";
import { API_BASE_URL } from "../../../config/api";
import { MobileRevenueLedgerView } from "../../../components/revenue/MobileRevenueLedgerView";
import { DoctorBottomNav } from "../../../components/doctor/DoctorBottomNav";

export default function DoctorTotalRevenueScreen() {
  const router = useRouter();
  const [isHeadDoctor, setIsHeadDoctor] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkDoc() {
      try {
        const doc = await getActiveDoctor();
        const role = await getUserRole();
        const name = (doc?.name || doc?.doctorName || "").toLowerCase();
        const specialty = (doc?.specialty || "").toLowerCase();

        let isHead =
          doc?.isHeadDoctor === true ||
          doc?.doctorCategory === "HEAD" ||
          doc?.category === "HEAD" ||
          role === "HEAD_DOCTOR" ||
          role === "ADMIN" ||
          specialty.includes("head") ||
          specialty.includes("chief") ||
          name.includes("prashanth") ||
          name.includes("head") ||
          name.includes("vaidya") ||
          name.includes("chief");

        // If not immediately flagged, check live employee registry
        if (!isHead && doc && (doc.phone || doc.name)) {
          try {
            const cleanPhone = (doc.phone || "").replace(/\D/g, "").slice(-10);
            const res = await fetch(`${API_BASE_URL}/admin/employees?category=DOCTOR`);
            if (res.ok) {
              const data = await res.json();
              const list = Array.isArray(data) ? data : (data.employees || []);
              const match = list.find((e: any) => {
                const ep = (e.phone || "").replace(/\D/g, "").slice(-10);
                return (cleanPhone && ep === cleanPhone) || (e.name && e.name.toLowerCase() === name);
              });
              if (match && match.doctorCategory === "HEAD") {
                isHead = true;
                await saveActiveDoctor({ ...doc, isHeadDoctor: true, doctorCategory: "HEAD" });
              }
            }
          } catch {}
        }

        setIsHeadDoctor(isHead);
      } catch (e) {
        console.warn("Could not check doctor role:", e);
        setIsHeadDoctor(true);
      } finally {
        setChecking(false);
      }
    }
    checkDoc();
  }, []);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(doctor)");
    }
  };

  if (checking) {
    return <View style={{ flex: 1, backgroundColor: "#f8fafc" }} />;
  }

  // Employee doctors cannot see Total Revenue
  if (!isHeadDoctor) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
        <View style={styles.restrictedContainer}>
          <View style={styles.restrictedIconBox}>
            <Ionicons name="lock-closed" size={32} color="#d97706" />
          </View>
          <Text style={styles.restrictedTitle}>Restricted Access</Text>
          <Text style={styles.restrictedSub}>
            Total Revenue analytics is restricted to Head Doctors, Clinic Administration & HR only.
          </Text>
          <TouchableOpacity style={styles.returnBtn} onPress={handleBack}>
            <Text style={styles.returnBtnText}>Return to Dashboard</Text>
          </TouchableOpacity>
        </View>
        <DoctorBottomNav activeTab="dashboard" />
      </View>
    );
  }

  return (
    <MobileRevenueLedgerView
      role="DOCTOR"
      headerTitle="Doctor Total Revenue Analytics"
      onBack={handleBack}
      bottomNav={<DoctorBottomNav activeTab="total-revenue" />}
    />
  );
}

const styles = StyleSheet.create({
  restrictedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  restrictedIconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  restrictedTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
  },
  restrictedSub: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 18,
  },
  returnBtn: {
    backgroundColor: "#0284c7",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  returnBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
});
