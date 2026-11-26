import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface AppointmentCardProps {
  appt: any;
  index: number;
  variant: "UPCOMING" | "ACTIVE" | "COLLECT_FEE" | "COMPLETED";
  isFirst?: boolean;
  isLast?: boolean;
  branchName?: string;
  onOpenPatientFile: (appt: any) => void;
  onOpenPatientHistory?: (appt: any) => void;
  onStartConsultation?: (appt: any) => void;
  onOpenPaymentModal?: (appt: any) => void;
  onOpenInvoice?: (appt: any) => void;
  onShareInvoice?: (appt: any) => void;
  onCallPatient: (phone: string | undefined) => void;
  onWhatsAppPatient: (phone: string | undefined, name: string | undefined) => void;
  onOpenRescheduleModal: (appt: any) => void;
  onDeleteAppointment: (appt: any) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
}

export const AppointmentCard = memo(function AppointmentCard({
  appt,
  index,
  variant,
  isFirst = false,
  isLast = false,
  branchName = "KPHB",
  onOpenPatientFile,
  onOpenPatientHistory,
  onStartConsultation,
  onOpenPaymentModal,
  onOpenInvoice,
  onShareInvoice,
  onCallPatient,
  onWhatsAppPatient,
  onOpenRescheduleModal,
  onDeleteAppointment,
  onMoveUp,
  onMoveDown,
}: AppointmentCardProps) {
  const phoneNum = appt.phoneNumber || appt.phone || "";
  const cleanPhone = phoneNum.replace(/\D/g, "").slice(-10);
  const displayPhone = cleanPhone || "No Mobile";

  // Visit Badge Render (Single source of truth from backend visitBadge)
  const renderVisitBadge = () => {
    // 1. Direct visitBadge from backend is the single source of truth
    if (appt.visitBadge === "In-Dur") {
      return (
        <View style={[styles.badgeBase, styles.badgeDuration]}>
          <Text style={styles.badgeDurationText}>In-Dur</Text>
        </View>
      );
    }
    if (appt.visitBadge === "New") {
      return (
        <View style={[styles.badgeBase, styles.badgeNew]}>
          <Text style={styles.badgeNewText}>New</Text>
        </View>
      );
    }
    if (appt.visitBadge === "Revisit") {
      return (
        <View style={[styles.badgeBase, styles.badgeRevisit]}>
          <Text style={styles.badgeRevisitText}>Revisit</Text>
        </View>
      );
    }

    // 2. Secondary fallback flags
    if (appt.isDuration || appt.visitType === "IN_DURATION") {
      return (
        <View style={[styles.badgeBase, styles.badgeDuration]}>
          <Text style={styles.badgeDurationText}>In-Dur</Text>
        </View>
      );
    }
    if (appt.isNewPatient || appt.visitType === "NEW") {
      return (
        <View style={[styles.badgeBase, styles.badgeNew]}>
          <Text style={styles.badgeNewText}>New</Text>
        </View>
      );
    }
    if (appt.visitType === "REVISIT" || appt.isReback) {
      return (
        <View style={[styles.badgeBase, styles.badgeRevisit]}>
          <Text style={styles.badgeRevisitText}>Revisit</Text>
        </View>
      );
    }

    // 3. Final heuristic:
    const isNew = !appt.isReback && !appt.visitCount && !appt.totalVisits;
    if (isNew) {
      return (
        <View style={[styles.badgeBase, styles.badgeNew]}>
          <Text style={styles.badgeNewText}>New</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badgeBase, styles.badgeRevisit]}>
        <Text style={styles.badgeRevisitText}>Revisit</Text>
      </View>
    );
  };

  const cleanBranch = (appt.branch || branchName).replace(/Spiritual Homeopathy/gi, "").trim() || "KPHB";
  const doctorDisplayName = appt.doctorName?.startsWith("Dr.")
    ? appt.doctorName
    : `Dr. ${appt.doctorName || "Doctor"}`;
  const rawSlotCandidates = [appt.selectedTimeSlot, appt.timeSlot, appt.slot].filter(Boolean).map((v: any) => String(v).trim());
  const validSlot = rawSlotCandidates.find((raw: string) => !/^\d+\s*(day|days|month|months|week|weeks|min|mins|hr|hrs)$/i.test(raw)) || rawSlotCandidates[0] || "";
  const slotDisplay = validSlot
    ? (/\d{1,2}:\d{2}\s*(AM|PM)?\s*[-–]\s*\d{1,2}:\d{2}/i.test(validSlot) ? validSlot.split(/\s*[-–]\s*/)[0].trim() : validSlot)
    : "Slot N/A";
  const patientIdDisplay = appt.registrationId || appt.patientId || "ID: N/A";

  const handleCardPress = () => {
    if (variant === "COMPLETED") {
      if (onOpenInvoice) onOpenInvoice(appt);
      else if (onOpenPaymentModal) onOpenPaymentModal(appt);
    } else {
      onOpenPatientFile(appt);
    }
  };

  return (
    <View style={styles.card}>
      {/* Top Row: Queue, Patient Name, Badges & Action Button */}
      <View style={styles.topRow}>
        <View
          style={[
            styles.queueBox,
            variant === "COLLECT_FEE" && styles.queueBoxOrange,
            variant === "COMPLETED" && styles.queueBoxGreen,
          ]}
        >
          <Text
            style={[
              styles.queueBoxLabel,
              variant === "COLLECT_FEE" && { color: "#c2410c" },
              variant === "COMPLETED" && { color: "#15803d" },
            ]}
          >
            Q
          </Text>
          <Text
            style={[
              styles.queueBoxNum,
              variant === "COLLECT_FEE" && { color: "#ea580c" },
              variant === "COMPLETED" && { color: "#16a34a" },
            ]}
          >
            {index + 1}
          </Text>
        </View>

        <TouchableOpacity style={styles.patientInfoCol} onPress={handleCardPress} activeOpacity={0.7}>
          <View style={styles.nameBadgeRow}>
            <Text style={styles.patientName} numberOfLines={1}>
              {appt.patientName}
            </Text>
            {renderVisitBadge()}
            {appt.consultationMode?.toLowerCase() === "online" && (
              <View style={styles.onlineBadge}>
                <Ionicons name="videocam" size={10} color="#0284c7" />
                <Text style={styles.onlineBadgeText}>Online</Text>
              </View>
            )}
          </View>

          <View style={styles.phoneIdRow}>
            <Text style={styles.phoneText}>{displayPhone}</Text>
            <View style={styles.idBadge}>
              <Text style={styles.idBadgeText}>{patientIdDisplay}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Action Button Variant */}
        {variant === "UPCOMING" && onStartConsultation && (
          <TouchableOpacity
            style={styles.startConsultBtn}
            onPress={() => onStartConsultation(appt)}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={10} color="#ffffff" style={{ marginRight: 3 }} />
            <Text style={styles.startConsultBtnText}>START CONSULT</Text>
          </TouchableOpacity>
        )}

        {variant === "ACTIVE" && (
          <View style={styles.activeConsultPill}>
            <View style={styles.pulseDot} />
            <Text style={styles.activeConsultText}>IN CONSULT</Text>
          </View>
        )}

        {variant === "COLLECT_FEE" && onOpenPaymentModal && (
          <TouchableOpacity
            style={styles.collectFeeBtn}
            onPress={() => onOpenPaymentModal(appt)}
            activeOpacity={0.8}
          >
            <Ionicons name="card-outline" size={12} color="#ffffff" style={{ marginRight: 3 }} />
            <Text style={styles.collectFeeBtnText}>COLLECT FEE</Text>
          </TouchableOpacity>
        )}

        {variant === "COMPLETED" && (
          <TouchableOpacity
            style={styles.completedPill}
            onPress={() => (onOpenInvoice ? onOpenInvoice(appt) : onOpenPaymentModal?.(appt))}
            activeOpacity={0.8}
            accessibilityLabel="View Invoice"
          >
            <Ionicons name="receipt-outline" size={12} color="#16a34a" style={{ marginRight: 3 }} />
            <Text style={styles.completedPillText}>INVOICE</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Middle Row: Doctor • Slot • Branch */}
      <View style={styles.midInfoRow}>
        <View style={styles.infoPill}>
          <Ionicons name="fitness-outline" size={12} color="#64748b" />
          <Text style={styles.infoText} numberOfLines={1}>
            {doctorDisplayName}
          </Text>
        </View>

        <View style={styles.infoPill}>
          <Ionicons name="time-outline" size={12} color="#64748b" />
          <Text style={styles.infoText}>{slotDisplay}</Text>
        </View>

        <View style={styles.infoPill}>
          <Ionicons name="location-outline" size={12} color="#64748b" />
          <Text style={styles.infoText} numberOfLines={1}>
            {cleanBranch}
          </Text>
        </View>
      </View>

      {/* Bottom Actions Row */}
      <View style={styles.actionRow}>
        {/* Reorder Queue Arrows (Only for Upcoming queue) */}
        {variant === "UPCOMING" && onMoveUp && onMoveDown ? (
          <View style={styles.arrowGroup}>
            <TouchableOpacity
              style={[styles.arrowBtn, isFirst && styles.arrowBtnDisabled]}
              onPress={() => onMoveUp(index)}
              disabled={isFirst}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-up" size={13} color={isFirst ? "#93c5fd" : "#ffffff"} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.arrowBtn, isLast && styles.arrowBtnDisabled]}
              onPress={() => onMoveDown(index)}
              disabled={isLast}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-down" size={13} color={isLast ? "#93c5fd" : "#ffffff"} />
            </TouchableOpacity>
          </View>
        ) : (
          <View />
        )}

        {/* Action Icon Buttons */}
        <View style={styles.iconGroup}>
          {/* Patient File Button - ONLY for UPCOMING, ACTIVE, COLLECT_FEE (Hidden for COMPLETED per user request) */}
          {variant !== "COMPLETED" && (
            <TouchableOpacity
              style={styles.outlineIconBtn}
              onPress={() => onOpenPatientFile(appt)}
              activeOpacity={0.7}
              accessibilityLabel="Patient File"
            >
              <Ionicons name="document-text-outline" size={14} color="#0284c7" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.outlineIconBtn}
            onPress={() => onCallPatient(cleanPhone)}
            activeOpacity={0.7}
            accessibilityLabel="Call"
          >
            <Ionicons name="call-outline" size={14} color="#16a34a" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineIconBtn}
            onPress={() => onWhatsAppPatient(cleanPhone, appt.patientName)}
            activeOpacity={0.7}
            accessibilityLabel="WhatsApp"
          >
            <Ionicons name="logo-whatsapp" size={14} color="#25d366" />
          </TouchableOpacity>

          {/* Completed Variant: Show Invoice Open and Invoice Share; NO Reschedule and NO Delete */}
          {variant === "COMPLETED" ? (
            <>
              <TouchableOpacity
                style={[styles.outlineIconBtn, styles.invoiceBtn]}
                onPress={() => (onOpenInvoice ? onOpenInvoice(appt) : onOpenPaymentModal?.(appt))}
                activeOpacity={0.7}
                accessibilityLabel="Open Invoice"
              >
                <Ionicons name="receipt-outline" size={14} color="#0284c7" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.outlineIconBtn, styles.shareBtn]}
                onPress={() => (onShareInvoice ? onShareInvoice(appt) : onWhatsAppPatient(cleanPhone, appt.patientName))}
                activeOpacity={0.7}
                accessibilityLabel="Share Invoice"
              >
                <Ionicons name="share-social-outline" size={14} color="#16a34a" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.outlineIconBtn}
                onPress={() => onOpenRescheduleModal(appt)}
                activeOpacity={0.7}
                accessibilityLabel="Reschedule"
              >
                <Ionicons name="calendar-outline" size={14} color="#d97706" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.outlineIconBtn, styles.deleteIconBtn]}
                onPress={() => onDeleteAppointment(appt)}
                activeOpacity={0.7}
                accessibilityLabel="Delete"
              >
                <Ionicons name="trash-outline" size={14} color="#ef4444" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e8edf2",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 8,
    width: "100%",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  queueBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    alignItems: "center",
    justifyContent: "center",
  },
  queueBoxOrange: {
    backgroundColor: "#fff7ed",
    borderColor: "#fdba74",
  },
  queueBoxGreen: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  queueBoxLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#0369a1",
    lineHeight: 10,
  },
  queueBoxNum: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0284c7",
    lineHeight: 14,
  },
  patientInfoCol: {
    flex: 1,
    marginLeft: 8,
    justifyContent: "center",
  },
  nameBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  patientName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
    maxWidth: 160,
  },
  badgeBase: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 1,
  },
  badgeNew: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  badgeNewText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#059669",
  },
  badgeDuration: {
    backgroundColor: "#faf5ff",
    borderColor: "#e9d5ff",
  },
  badgeDurationText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#7e22ce",
  },
  badgeRevisit: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  badgeRevisitText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#1d4ed8",
  },
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  onlineBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#0284c7",
  },
  phoneIdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  phoneText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
    fontFamily: "monospace",
  },
  idBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 4.5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  idBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#64748b",
  },
  startConsultBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284c7",
    paddingHorizontal: 8,
    paddingVertical: 5.5,
    borderRadius: 7,
    elevation: 1,
  },
  startConsultBtnText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
  },
  activeConsultPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ea580c",
  },
  activeConsultText: {
    color: "#c2410c",
    fontSize: 10,
    fontWeight: "800",
  },
  collectFeeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ea580c",
    paddingHorizontal: 8,
    paddingVertical: 5.5,
    borderRadius: 7,
    elevation: 1,
  },
  collectFeeBtnText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
  },
  completedPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  completedPillText: {
    color: "#15803d",
    fontSize: 10,
    fontWeight: "800",
  },
  midInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3.5,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
    flexShrink: 1,
  },
  infoText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#475569",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 7,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#f8fafc",
  },
  arrowGroup: {
    flexDirection: "row",
    gap: 4,
  },
  arrowBtn: {
    backgroundColor: "#0284c7",
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowBtnDisabled: {
    backgroundColor: "#bfdbfe",
  },
  iconGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginLeft: "auto",
  },
  outlineIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteIconBtn: {
    borderColor: "#fee2e2",
    backgroundColor: "#fff5f5",
  },
  invoiceBtn: {
    borderColor: "#bae6fd",
    backgroundColor: "#f0f9ff",
  },
  shareBtn: {
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
  },
});
