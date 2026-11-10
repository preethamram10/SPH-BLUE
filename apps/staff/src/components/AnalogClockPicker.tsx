import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

interface AnalogClockPickerProps {
  value: string;
  onChange: (time: string) => void;
  doctorName?: string;
}

export default function AnalogClockPicker({
  value,
  onChange,
  doctorName,
}: AnalogClockPickerProps) {
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
  };

  const handleSelectMinute = (m: number) => {
    setMinute(m);
    emitTime(hour, m, period);
  };

  const handleStepMinute = (delta: number) => {
    let nextM = minute + delta;
    if (nextM >= 60) nextM = 0;
    if (nextM < 0) nextM = 55;
    setMinute(nextM);
    emitTime(hour, nextM, period);
  };

  const handleTogglePeriod = (p: "AM" | "PM") => {
    setPeriod(p);
    emitTime(hour, minute, p);
  };

  const handleQuickPreset = (presetStr: string) => {
    const parsed = parseTime(presetStr);
    setHour(parsed.hour);
    setMinute(parsed.minute);
    setPeriod(parsed.period);
    onChange(presetStr);
  };

  const hourAngle = (hour % 12) * 30 + (minute / 60) * 30;
  const minuteAngle = minute * 6;

  const clockNumbers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const radius = 78;
  const center = 105;

  const quickPresets = [
    "09:00 AM",
    "10:30 AM",
    "11:45 AM",
    "02:00 PM",
    "03:30 PM",
    "05:00 PM",
    "06:30 PM",
    "08:00 PM",
  ];

  const currentTimeFormatted = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Feather name="clock" size={14} color="#0284c7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Online Consultation Time (Clock)</Text>
            <Text style={styles.headerSub}>Doctor is available at any time. Pick preferred time.</Text>
          </View>
        </View>

        <View style={styles.selectedBadge}>
          <Text style={styles.selectedBadgeLabel}>Time:</Text>
          <Text style={styles.selectedBadgeValue}>{currentTimeFormatted}</Text>
        </View>
      </View>

      {/* Clock Face & Digital Controls */}
      <View style={styles.clockContainer}>
        {/* Analog Clock Dial */}
        <View style={styles.dial}>
          {/* Hour Hand Container rotated around center */}
          <View
            style={[
              styles.handContainer,
              { height: 100, top: 55, left: 103, transform: [{ rotate: `${hourAngle}deg` }] },
            ]}
          >
            <View style={styles.hourHand} />
            <View style={{ height: 50 }} />
          </View>

          {/* Minute Hand Container rotated around center */}
          <View
            style={[
              styles.handContainer,
              { height: 140, top: 35, left: 103.5, transform: [{ rotate: `${minuteAngle}deg` }] },
            ]}
          >
            <View style={styles.minuteHand} />
            <View style={{ height: 70 }} />
          </View>

          {/* Center Pivot Pin */}
          <View style={styles.centerPin} />

          {/* 12 Hour Markers */}
          {clockNumbers.map((num) => {
            const angle = (num * 30 - 90) * (Math.PI / 180);
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            const isSelected = hour === num;

            return (
              <TouchableOpacity
                key={num}
                onPress={() => handleSelectHour(num)}
                style={[
                  styles.numButton,
                  { left: x - 13, top: y - 13 },
                  isSelected && styles.numButtonSelected,
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.numText, isSelected && styles.numTextSelected]}>
                  {num}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.dialHint}>Tap any number on the dial to select hour</Text>
      </View>

      {/* Time Display & AM/PM Selector */}
      <View style={styles.controlRow}>
        <View>
          <Text style={styles.controlLabel}>Consultation Time</Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
            <Text style={styles.timeBigText}>
              {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
            </Text>
            <Text style={styles.timePeriodText}>{period}</Text>
          </View>
        </View>

        {/* AM / PM Toggle */}
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

      {/* Minute Selector */}
      <View>
        <Text style={styles.subLabel}>Minutes</Text>
        <View style={styles.minuteRow}>
          {[0, 15, 30, 45].map((m) => {
            const isSelected = minute === m;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => handleSelectMinute(m)}
                style={[styles.minuteChip, isSelected && styles.minuteChipSelected]}
                activeOpacity={0.7}
              >
                <Text style={[styles.minuteText, isSelected && styles.minuteTextSelected]}>
                  :{String(m).padStart(2, "0")}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            onPress={() => handleStepMinute(-5)}
            style={styles.stepBtn}
            activeOpacity={0.7}
          >
            <Feather name="minus" size={13} color="#475569" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleStepMinute(5)}
            style={styles.stepBtn}
            activeOpacity={0.7}
          >
            <Feather name="plus" size={13} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Presets */}
      <View>
        <Text style={styles.subLabel}>Popular Times</Text>
        <View style={styles.presetsGrid}>
          {quickPresets.map((preset) => {
            const isSelected = value === preset;
            return (
              <TouchableOpacity
                key={preset}
                onPress={() => handleQuickPreset(preset)}
                style={[styles.presetChip, isSelected && styles.presetChipSelected]}
                activeOpacity={0.7}
              >
                <Text style={[styles.presetText, isSelected && styles.presetTextSelected]}>
                  {preset}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Online Info Banner */}
      <View style={styles.infoBanner}>
        <MaterialCommunityIcons name="check-circle" size={16} color="#15803d" />
        <Text style={styles.infoBannerText}>
          Online Consultation: <Text style={{ fontWeight: "800" }}>{currentTimeFormatted}</Text> with{" "}
          <Text style={{ fontWeight: "800" }}>{doctorName || "Selected Doctor"}</Text>. Regular in-clinic slots are unaffected.
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
    borderRadius: 18,
    padding: 14,
    gap: 14,
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  headerSub: {
    fontSize: 10,
    fontWeight: "500",
    color: "#64748b",
  },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0f9ff",
    borderColor: "#bae6fd",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  selectedBadgeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
  },
  selectedBadgeValue: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0284c7",
  },
  clockContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  dial: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "#ffffff",
    borderWidth: 3,
    borderColor: "#e2e8f0",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 3,
  },
  centerPin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#0284c7",
    borderWidth: 2,
    borderColor: "#ffffff",
    position: "absolute",
    left: 96,
    top: 96,
    zIndex: 30,
  },
  handContainer: {
    width: 4,
    position: "absolute",
    alignItems: "center",
    justifyContent: "flex-start",
    zIndex: 10,
  },
  hourHand: {
    width: 4,
    height: 50,
    backgroundColor: "#1e293b",
    borderRadius: 2,
  },
  minuteHand: {
    width: 2.5,
    height: 70,
    backgroundColor: "#0284c7",
    borderRadius: 1.5,
  },
  numButton: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  numButtonSelected: {
    backgroundColor: "#0284c7",
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 3,
  },
  numText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
  },
  numTextSelected: {
    color: "#ffffff",
    fontWeight: "900",
  },
  dialHint: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94a3b8",
    marginTop: 8,
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  controlLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  timeBigText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a",
  },
  timePeriodText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0284c7",
  },
  amPmContainer: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    padding: 3,
    borderRadius: 10,
  },
  amPmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  amPmBtnActive: {
    backgroundColor: "#0284c7",
  },
  amPmText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
  },
  amPmTextActive: {
    color: "#ffffff",
  },
  subLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  minuteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  minuteChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  minuteChipSelected: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  minuteText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  minuteTextSelected: {
    color: "#ffffff",
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  presetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  presetChip: {
    width: "23.5%",
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  presetChipSelected: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  presetText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#334155",
  },
  presetTextSelected: {
    color: "#ffffff",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 8,
    borderRadius: 10,
  },
  infoBannerText: {
    fontSize: 10.5,
    color: "#166534",
    flex: 1,
    lineHeight: 14,
  },
});
