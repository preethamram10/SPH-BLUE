import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { normalizeDateStr } from "../../utils/dateUtils";

export interface PatientCardProps {
  item: any;
  branchName: string;
  onHistoryRx: (patient: any) => void;
  onCall?: (phone: string) => void;
  onWhatsApp?: (phone: string, name: string) => void;
}

export const PatientCard = memo(function PatientCard({
  item,
  branchName,
  onHistoryRx,
}: PatientCardProps) {
  const name = item.name || item.patientName || "Unknown";
  const regId = item.regId || item.registrationId || "ID: N/A";
  const phone = item.phone || item.phoneNumber || "";
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  const displayPhone = cleanPhone
    ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`
    : "No Mobile";
  const totalVisits = item.totalVisits || item.appointmentCount || 0;
  const lastVisit = item.lastVisitDate || item.lastVisit || "";
  const doctor = item.doctorName || item.lastDoctorName || "";
  const branch = item.branch || branchName;
  const diseases = item.diseases || item.primarySymptoms || "";
  const source = item.source || item.marketingSource || "Walk-in";
  const subject = item.subject || diseases || "";
  const status = (item.status || "").toUpperCase();
  const isInDuration =
    item.visitBadge === "In-Dur" ||
    item.isDuration === true ||
    item.isInDuration === true;

  // Pre-calculate last visit label
  let lastVisitLabel = "";
  if (lastVisit) {
    try {
      const clean = normalizeDateStr(lastVisit);
      const parts = clean.split("-");
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const dateObj = new Date(y, m, d);
        if (!isNaN(dateObj.getTime())) {
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          if (dateObj.toDateString() === today.toDateString()) {
            lastVisitLabel = "Today";
          } else if (dateObj.toDateString() === yesterday.toDateString()) {
            lastVisitLabel = "Yesterday";
          } else {
            lastVisitLabel = dateObj.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
          }
        } else {
          lastVisitLabel = lastVisit;
        }
      } else {
        lastVisitLabel = lastVisit;
      }
    } catch {
      lastVisitLabel = lastVisit;
    }
  }

  return (
    <View style={styles.card}>
      {/* Top Row: Name + Status badge */}
      <View style={styles.cardTopRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.nameBadgeRow}>
            <Text style={styles.patientName} numberOfLines={1}>
              {name}
            </Text>
            {isInDuration && (
              <View style={styles.inDurBadge}>
                <Ionicons name="pulse" size={9} color="#b45309" />
                <Text style={styles.inDurBadgeText}>IN-DUR</Text>
              </View>
            )}
          </View>
          <View style={styles.idSourceRow}>
            <Text style={styles.regIdText}>ID: {regId}</Text>
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceBadgeText}>{source}</Text>
            </View>
          </View>
          {subject ? (
            <Text style={styles.subjectText} numberOfLines={1}>
              Subject: {subject}
            </Text>
          ) : null}
        </View>

        {/* Visits badge */}
        {totalVisits > 0 && (
          <View style={styles.visitsBadge}>
            <Ionicons name="repeat" size={11} color="#0284c7" />
            <Text style={styles.visitsText}>
              {totalVisits} {totalVisits === 1 ? "Visit" : "Visits"}
            </Text>
          </View>
        )}
      </View>

      {/* Branch & Date */}
      <View style={styles.infoRow}>
        <Ionicons name="location-outline" size={12} color="#64748b" />
        <Text style={styles.infoText}>{branch}</Text>
        {lastVisitLabel ? (
          <>
            <Ionicons
              name="calendar-outline"
              size={12}
              color="#64748b"
              style={{ marginLeft: 8 }}
            />
            <Text style={styles.infoText}>{lastVisitLabel}</Text>
          </>
        ) : null}
      </View>

      {/* Doctor */}
      {doctor ? (
        <View style={styles.infoRow}>
          <Ionicons name="fitness-outline" size={12} color="#64748b" />
          <Text style={styles.infoText}>
            {doctor.startsWith("Dr.") ? doctor : `Dr. ${doctor}`}
          </Text>
        </View>
      ) : null}

      {/* Phone + Action Buttons */}
      <View style={styles.cardBottomRow}>
        <View style={styles.phoneRow}>
          <Ionicons name="call-outline" size={13} color="#0284c7" />
          <Text style={styles.phoneText}>{displayPhone}</Text>
        </View>
        <View style={styles.actionBtns}>
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => onHistoryRx(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.historyBtnText}>History & Rx</Text>
            <Ionicons name="chevron-forward" size={12} color="#0284c7" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  nameBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  patientName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  inDurBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  inDurBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#b45309",
  },
  idSourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
    flexWrap: "wrap",
  },
  regIdText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  sourceBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  sourceBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#475569",
  },
  subjectText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  visitsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  visitsText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#0284c7",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  infoText: {
    fontSize: 11.5,
    color: "#64748b",
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
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
    fontWeight: "700",
    color: "#0f172a",
  },
  actionBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  historyBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284c7",
  },
});
