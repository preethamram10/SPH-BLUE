import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";

interface AnalogClockPickerProps {
  value: string; // e.g. "10:30 AM"
  onChange: (time: string) => void;
  doctorName?: string;
}

export default function AnalogClockPicker({
  value,
  onChange,
  doctorName,
}: AnalogClockPickerProps) {
  // Parse incoming value or default to 10:00 AM
  const parseTime = (val: string) => {
    if (!val) return { hour: 10, minute: 0, period: "AM" as const };
    const match = val.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return { hour: 10, minute: 0, period: "AM" as const };
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const p = match[3].toUpperCase() === "PM" ? ("PM" as const) : ("AM" as const);
    if (h < 1 || h > 12) h = 10;
    return { hour: h, minute: isNaN(m) ? 0 : m, period: p };
  };

  const initial = parseTime(value);
  const [hour, setHour] = useState<number>(initial.hour);
  const [minute, setMinute] = useState<number>(initial.minute);
  const [period, setPeriod] = useState<"AM" | "PM">(initial.period);
  const [pickerMode, setPickerMode] = useState<"hour" | "minute">("hour");

  useEffect(() => {
    if (value) {
      const parsed = parseTime(value);
      setHour(parsed.hour);
      setMinute(parsed.minute);
      setPeriod(parsed.period);
    }
  }, [value]);

  const emitTime = (h: number, m: number, p: "AM" | "PM") => {
    const formatted = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${p}`;
    onChange(formatted);
  };

  const handleSelectHour = (h: number) => {
    setHour(h);
    emitTime(h, minute, period);
    // Auto-transition to minute selection
    setPickerMode("minute");
  };

  const handleSelectMinute = (m: number) => {
    setMinute(m);
    emitTime(hour, m, period);
  };

  const handleTogglePeriod = (p: "AM" | "PM") => {
    setPeriod(p);
    emitTime(hour, minute, p);
  };

  // Dial Geometry (240px wide dial, center at 120, radius 86)
  const center = 120;
  const radius = 86;

  const hoursList = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutesList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const currentAngle =
    pickerMode === "hour"
      ? (hour % 12) * 30
      : (minute / 60) * 360;

  const currentTimeFormatted = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;

  return (
    <View style={styles.card}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Feather name="clock" size={14} color="#0284c7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Online Consultation Time (Clock)</Text>
            <Text style={styles.headerSub}>Tap dial numbers to set hour and minutes</Text>
          </View>
        </View>

        <View style={styles.selectedBadge}>
          <Text style={styles.selectedBadgeLabel}>Time:</Text>
          <Text style={styles.selectedBadgeValue}>{currentTimeFormatted}</Text>
        </View>
      </View>

      {/* Digital Control Bar: [ HH ] : [ MM ] + [ AM | PM ] */}
      <View style={styles.digitalBar}>
        <View style={styles.timeSegmentsRow}>
          {/* Hour Selector Tab */}
          <TouchableOpacity
            onPress={() => setPickerMode("hour")}
            style={[styles.timeBox, pickerMode === "hour" && styles.timeBoxActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.timeBoxText, pickerMode === "hour" && styles.timeBoxTextActive]}>
              {String(hour).padStart(2, "0")}
            </Text>
            <Text style={[styles.timeBoxLabel, pickerMode === "hour" && styles.timeBoxLabelActive]}>
              HR
            </Text>
          </TouchableOpacity>

          <Text style={styles.timeColon}>:</Text>

          {/* Minute Selector Tab */}
          <TouchableOpacity
            onPress={() => setPickerMode("minute")}
            style={[styles.timeBox, pickerMode === "minute" && styles.timeBoxActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.timeBoxText, pickerMode === "minute" && styles.timeBoxTextActive]}>
              {String(minute).padStart(2, "0")}
            </Text>
            <Text style={[styles.timeBoxLabel, pickerMode === "minute" && styles.timeBoxLabelActive]}>
              MIN
            </Text>
          </TouchableOpacity>
        </View>

        {/* AM / PM Switcher */}
        <View style={styles.amPmContainer}>
          <TouchableOpacity
            onPress={() => handleTogglePeriod("AM")}
            style={[styles.amPmBtn, period === "AM" && styles.amPmBtnActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.amPmText, period === "AM" && styles.amPmTextActive]}>
              AM
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleTogglePeriod("PM")}
            style={[styles.amPmBtn, period === "PM" && styles.amPmBtnActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.amPmText, period === "PM" && styles.amPmTextActive]}>
              PM
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mode Switcher Pill */}
      <View style={styles.modeIndicatorRow}>
        <TouchableOpacity
          onPress={() => setPickerMode(pickerMode === "hour" ? "minute" : "hour")}
          style={styles.modePill}
          activeOpacity={0.7}
        >
          <Text style={styles.modePillText}>
            {pickerMode === "hour"
              ? "🕒 Setting Hour (1-12) → Tap for Minutes"
              : "⏱ Setting Minutes (:00-:55) → Tap for Hour"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Clock Dial (240x240) */}
      <View style={styles.clockContainer}>
        <View style={styles.dial}>
          {/* Inner Decorative Circle */}
          <View style={styles.dialInnerGuide} />

          {/* Center Pivot Pin */}
          <View style={styles.centerPin} />

          {/* Rotating Hand */}
          <View
            pointerEvents="none"
            style={[
              styles.handContainer,
              {
                height: pickerMode === "hour" ? 120 : 160,
                top: pickerMode === "hour" ? 60 : 40,
                left: 118.5,
                transform: [{ rotate: `${currentAngle}deg` }],
              },
            ]}
          >
            <View
              style={[
                styles.pointerHand,
                { height: pickerMode === "hour" ? 60 : 80 },
              ]}
            />
            <View style={styles.knobShadow} />
            <View style={{ height: pickerMode === "hour" ? 60 : 80 }} />
          </View>

          {/* Dial Numbers: Hours or Minutes */}
          {pickerMode === "hour"
            ? hoursList.map((num) => {
                const angle = (num * 30 - 90) * (Math.PI / 180);
                const x = center + radius * Math.cos(angle);
                const y = center + radius * Math.sin(angle);
                const isSelected = hour === num;

                return (
                  <TouchableOpacity
                    key={`h-${num}`}
                    onPress={() => handleSelectHour(num)}
                    style={[
                      styles.numButton,
                      { left: x - 18, top: y - 18 },
                      isSelected && styles.numButtonSelected,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.numText, isSelected && styles.numTextSelected]}>
                      {num}
                    </Text>
                  </TouchableOpacity>
                );
              })
            : minutesList.map((m) => {
                const angle = (m * 6 - 90) * (Math.PI / 180);
                const x = center + radius * Math.cos(angle);
                const y = center + radius * Math.sin(angle);
                const isSelected = minute === m;

                return (
                  <TouchableOpacity
                    key={`m-${m}`}
                    onPress={() => handleSelectMinute(m)}
                    style={[
                      styles.numButton,
                      { left: x - 18, top: y - 18 },
                      isSelected && styles.numButtonSelected,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.numTextSmall, isSelected && styles.numTextSelected]}>
                      {String(m).padStart(2, "0")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
        </View>

        <Text style={styles.dialHint}>
          {pickerMode === "hour"
            ? "Tap any hour on the dial (1 to 12)"
            : "Tap any minute on the dial (:00 to :55)"}
        </Text>
      </View>

      {/* Online Confirmation Banner */}
      <View style={styles.confirmBanner}>
        <Feather name="check-circle" size={15} color="#16a34a" />
        <Text style={styles.confirmBannerText}>
          Online Consultation:{" "}
          <Text style={{ fontWeight: "800", color: "#15803d" }}>
            {currentTimeFormatted}
          </Text>{" "}
          with{" "}
          <Text style={{ fontWeight: "800", color: "#15803d" }}>
            {doctorName || "Selected Doctor"}
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e0f2fe",
    borderRadius: 20,
    padding: 16,
    marginVertical: 12,
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 12,
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "500",
    marginTop: 1,
  },
  selectedBadge: {
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignItems: "flex-end",
  },
  selectedBadgeLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748b",
  },
  selectedBadgeValue: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0284c7",
  },
  digitalBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  timeSegmentsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeBox: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 54,
  },
  timeBoxActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  timeBoxText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1e293b",
  },
  timeBoxTextActive: {
    color: "#ffffff",
  },
  timeBoxLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: "#94a3b8",
    marginTop: 1,
  },
  timeBoxLabelActive: {
    color: "#e0f2fe",
  },
  timeColon: {
    fontSize: 20,
    fontWeight: "900",
    color: "#94a3b8",
    marginHorizontal: 2,
  },
  amPmContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  amPmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
  },
  amPmBtnActive: {
    backgroundColor: "#0284c7",
  },
  amPmText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748b",
  },
  amPmTextActive: {
    color: "#ffffff",
  },
  modeIndicatorRow: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  modePill: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  modePillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0284c7",
  },
  clockContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  dial: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#ffffff",
    borderWidth: 4,
    borderColor: "#e2e8f0",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  dialInnerGuide: {
    position: "absolute",
    width: 216,
    height: 216,
    borderRadius: 108,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    borderStyle: "dashed",
    top: 8,
    left: 8,
  },
  centerPin: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#0284c7",
    borderWidth: 2,
    borderColor: "#ffffff",
    top: 113,
    left: 113,
    zIndex: 30,
  },
  handContainer: {
    position: "absolute",
    width: 3,
    alignItems: "center",
    zIndex: 10,
  },
  pointerHand: {
    width: 3,
    backgroundColor: "#0284c7",
    borderRadius: 2,
  },
  knobShadow: {
    position: "absolute",
    top: -8,
    left: -8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(2, 132, 199, 0.25)",
  },
  numButton: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 25,
  },
  numButtonSelected: {
    backgroundColor: "#0284c7",
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  numText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
  },
  numTextSmall: {
    fontSize: 11,
    fontWeight: "800",
    color: "#334155",
  },
  numTextSelected: {
    color: "#ffffff",
    fontWeight: "900",
  },
  dialHint: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
    marginTop: 8,
  },
  confirmBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 12,
    padding: 10,
    marginTop: 6,
  },
  confirmBannerText: {
    fontSize: 11,
    color: "#166534",
    fontWeight: "600",
    flex: 1,
  },
});
