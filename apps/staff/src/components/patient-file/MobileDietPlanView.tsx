import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Share,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  DIET_CONDITIONS,
  DietCondition,
  calculateBMI,
  generate30DayDietPlan,
  generate30DayDietSchedule,
  DayDietPlan,
  PatientMetrics,
} from "./dietPlanData";

interface MobileDietPlanViewProps {
  patientData: {
    patientName?: string;
    age?: number;
    gender?: string;
    phone?: string;
    branch?: string;
    registrationId?: string;
    doctorName?: string;
    dietPlan?: string;
    dietPlanFee?: number;
    dietFee?: number;
  };
  initialDietPlan?: string;
  initialDietFee?: number;
  onSavePlan: (planText: string, dietFee: number, sendToReception?: boolean) => Promise<void>;
  isSaving?: boolean;
}

export function MobileDietPlanView({
  patientData,
  initialDietPlan = "",
  initialDietFee = 0,
  onSavePlan,
  isSaving = false,
}: MobileDietPlanViewProps) {
  const [metrics, setMetrics] = useState<PatientMetrics>({
    age: patientData.age || 0,
    gender: patientData.gender || "",
    heightCm: 0,
    weightKg: 0,
  });

  const [showBMIModal, setShowBMIModal] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);

  const [dietFee, setDietFee] = useState<number>(initialDietFee || 0);
  const [planText, setPlanText] = useState<string>(initialDietPlan || "");
  const [activeCategory, setActiveCategory] = useState<"all" | "digestive" | "deficiency" | "metabolic">("all");
  const [viewMode, setViewMode] = useState<"table" | "raw">("table");
  const [dayFilter, setDayFilter] = useState<"all" | "1-15" | "16-30">("all");

  const bmiInfo = useMemo(() => {
    return calculateBMI(metrics.heightCm, metrics.weightKg);
  }, [metrics.heightCm, metrics.weightKg]);

  const daySchedule = useMemo<DayDietPlan[]>(() => {
    return generate30DayDietSchedule(
      selectedConditions,
      metrics.age,
      bmiInfo.category
    );
  }, [selectedConditions, metrics.age, bmiInfo.category]);

  const displayedDays = useMemo(() => {
    if (dayFilter === "1-15") return daySchedule.filter((d) => d.day <= 15);
    if (dayFilter === "16-30") return daySchedule.filter((d) => d.day > 15);
    return daySchedule;
  }, [daySchedule, dayFilter]);

  const toggleCondition = (id: string) => {
    setSelectedConditions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleGeneratePlan = () => {
    const generated = generate30DayDietPlan(
      {
        name: patientData.patientName,
        age: metrics.age,
        gender: metrics.gender,
        branch: patientData.branch,
        registrationId: patientData.registrationId,
      },
      metrics,
      selectedConditions,
      dietFee
    );
    setPlanText(generated);
    setViewMode("table");
    Alert.alert("Plan Generated", "30-Day Diet Plan has been compiled based on the selected conditions and BMI.");
  };

  const handleShare = async () => {
    if (!planText) return;
    try {
      await Share.share({
        message: planText,
        title: `Spiritual Homeopathy - Diet Plan for ${patientData.patientName || "Patient"}`,
      });
    } catch (e: any) {
      Alert.alert("Error sharing", e.message);
    }
  };

  const filteredConditions = useMemo(() => {
    if (activeCategory === "all") return DIET_CONDITIONS;
    return DIET_CONDITIONS.filter((c) => c.category === activeCategory);
  }, [activeCategory]);

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          <View style={styles.iconCircle}>
            <Text style={{ fontSize: 18 }}>🥗</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>30-Day Diet & Regimen</Text>
            <Text style={styles.subtitle}>Nutritional & Clinical Protocol</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.bmiInfoBtn}
          onPress={() => setShowBMIModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="information-circle-outline" size={16} color="#0284c7" />
          <Text style={styles.bmiInfoBtnText}>BMI Info</Text>
        </TouchableOpacity>
      </View>

      {/* 1. PHYSICAL METRICS & BMI */}
      <View style={styles.card}>
        <Text style={styles.sectionHeading}>1. PHYSICAL METRICS & BMI</Text>

        <View style={styles.inputRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Age (Yrs)</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={String(metrics.age || "")}
              onChangeText={(t) => setMetrics({ ...metrics, age: parseInt(t) || 0 })}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderToggle}>
              <TouchableOpacity
                style={[styles.genderBtn, metrics.gender === "Female" && styles.genderBtnActive]}
                onPress={() => setMetrics({ ...metrics, gender: "Female" })}
              >
                <Text style={[styles.genderBtnText, metrics.gender === "Female" && styles.genderBtnTextActive]}>
                  F
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderBtn, metrics.gender === "Male" && styles.genderBtnActive]}
                onPress={() => setMetrics({ ...metrics, gender: "Male" })}
              >
                <Text style={[styles.genderBtnText, metrics.gender === "Male" && styles.genderBtnTextActive]}>
                  M
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={String(metrics.heightCm || "")}
              onChangeText={(t) => setMetrics({ ...metrics, heightCm: parseFloat(t) || 0 })}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={String(metrics.weightKg || "")}
              onChangeText={(t) => setMetrics({ ...metrics, weightKg: parseFloat(t) || 0 })}
            />
          </View>
        </View>

        {/* BMI RESULT CARD */}
        <View style={styles.bmiResultCard}>
          <View>
            <Text style={styles.bmiMiniLabel}>CALCULATED BMI</Text>
            <Text style={styles.bmiScore}>
              {bmiInfo.bmi > 0 ? `${bmiInfo.bmi} kg/m²` : "—"}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <View style={[styles.bmiBadge, { backgroundColor: `${bmiInfo.color}20` }]}>
              <Text style={[styles.bmiBadgeText, { color: bmiInfo.color }]}>
                {bmiInfo.category}
              </Text>
            </View>
            <Text style={styles.bmiIdealText}>Target: {bmiInfo.idealWeightRange}</Text>
          </View>
        </View>
      </View>

      {/* 2. CONDITIONS & DEFICIENCIES */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Text style={styles.sectionHeading}>
            2. CONDITIONS & DEFICIENCIES ({selectedConditions.length})
          </Text>
        </View>

        {/* Category Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          <View style={styles.catTabsRow}>
            {(["all", "digestive", "deficiency", "metabolic"] as const).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.catTab, activeCategory === cat && styles.catTabActive]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.catTabText, activeCategory === cat && styles.catTabTextActive]}>
                  {cat === "all" ? "All" : cat === "digestive" ? "Digestive" : cat === "deficiency" ? "Deficiencies" : "Metabolic"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Condition Chips Wrap */}
        <View style={styles.chipsContainer}>
          {filteredConditions.map((cond) => {
            const isSelected = selectedConditions.includes(cond.id);
            return (
              <TouchableOpacity
                key={cond.id}
                style={[styles.condChip, isSelected && styles.condChipActive]}
                onPress={() => toggleCondition(cond.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isSelected ? "checkbox" : "square-outline"}
                  size={15}
                  color={isSelected ? "#0284c7" : "#94a3b8"}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.condChipText, isSelected && styles.condChipTextActive]}>
                  {cond.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 3. DIET FEE & GENERATE ACTION */}
      <View style={styles.card}>
        <Text style={styles.sectionHeading}>3. DIET PLAN FEE & GENERATION</Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
          <Text style={styles.feeLabel}>Fee (₹):</Text>
          <TextInput
            style={styles.feeInput}
            keyboardType="numeric"
            value={String(dietFee)}
            onChangeText={(t) => setDietFee(Math.max(0, parseInt(t) || 0))}
          />

          <View style={{ flexDirection: "row", gap: 5, flex: 1, justifyContent: "flex-end" }}>
            {[0, 300, 500, 1000].map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[styles.feePresetBtn, dietFee === amt && styles.feePresetBtnActive]}
                onPress={() => setDietFee(amt)}
              >
                <Text style={[styles.feePresetText, dietFee === amt && styles.feePresetTextActive]}>
                  {amt === 0 ? "Free" : `₹${amt}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.generateBtn}
          onPress={handleGeneratePlan}
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles" size={17} color="#fde047" />
          <Text style={styles.generateBtnText}>Generate 30-Day Diet Plan</Text>
        </TouchableOpacity>
      </View>

      {/* 30-MINUTE PROTOCOL NOTICE */}
      <View style={styles.ruleNotice}>
        <Ionicons name="warning-outline" size={16} color="#b45309" style={{ marginTop: 2 }} />
        <Text style={styles.ruleNoticeText}>
          <Text style={{ fontWeight: "800", color: "#78350f" }}>30-Minute Digestion Rule: </Text>
          Strictly do not drink water 30 min before or 30 min after major meals to preserve gastric
          enzymes. Sips of lukewarm water permitted between meals.
        </Text>
      </View>

      {/* 4. PLAN TEXT & EDITING */}
      {planText ? (
        <View style={styles.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
            <Text style={styles.sectionHeading}>4. 30-DAY PLAN REGIMEN</Text>

            <View style={{ flexDirection: "row", gap: 6 }}>
              <TouchableOpacity
                style={styles.toolBtn}
                onPress={() => setIsFullScreen(true)}
              >
                <Ionicons name="expand-outline" size={14} color="#0f172a" />
                <Text style={styles.toolBtnText}>Full</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.toolBtn} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={14} color="#0f172a" />
                <Text style={styles.toolBtnText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Mode Switcher: 30-Day Table vs Raw Text */}
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
            <TouchableOpacity
              style={[
                styles.filterTab,
                viewMode === "table" && { backgroundColor: "#0284c7", borderColor: "#0284c7" },
              ]}
              onPress={() => setViewMode("table")}
            >
              <Text style={[styles.filterTabText, viewMode === "table" && { color: "#fff" }]}>
                📅 Day-Wise Table
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterTab,
                viewMode === "raw" && { backgroundColor: "#0284c7", borderColor: "#0284c7" },
              ]}
              onPress={() => setViewMode("raw")}
            >
              <Text style={[styles.filterTabText, viewMode === "raw" && { color: "#fff" }]}>
                📝 Raw Text
              </Text>
            </TouchableOpacity>
          </View>

          {viewMode === "table" ? (
            <View>
              {/* Day filter selector */}
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
                {(["all", "1-15", "16-30"] as const).map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.subTab,
                      dayFilter === filter && { backgroundColor: "#0f172a", borderColor: "#0f172a" },
                    ]}
                    onPress={() => setDayFilter(filter)}
                  >
                    <Text style={[styles.subTabText, dayFilter === filter && { color: "#fff" }]}>
                      {filter === "all" ? "All 30 Days" : filter === "1-15" ? "Days 1–15" : "Days 16–30"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ScrollView style={{ maxHeight: 380 }} nestedScrollEnabled>
                {displayedDays.map((d) => (
                  <View key={d.day} style={styles.dayCard}>
                    <View style={styles.dayBadgeRow}>
                      <Text style={styles.dayBadgeText}>DAY {d.day}</Text>
                    </View>
                    <View style={styles.mealRow}>
                      <Text style={styles.mealLabel}>🌅 Breakfast (08:30 AM):</Text>
                      <Text style={styles.mealVal}>{d.breakfast}</Text>
                    </View>
                    <View style={styles.mealRow}>
                      <Text style={styles.mealLabel}>☀️ Lunch (01:15 PM):</Text>
                      <Text style={styles.mealVal}>{d.lunch}</Text>
                    </View>
                    <View style={styles.mealRow}>
                      <Text style={styles.mealLabel}>🍵 Snacks (05:00 PM):</Text>
                      <Text style={styles.mealVal}>{d.snacks}</Text>
                    </View>
                    <View style={[styles.mealRow, { borderBottomWidth: 0 }]}>
                      <Text style={styles.mealLabel}>🌙 Dinner (07:45 PM):</Text>
                      <Text style={styles.mealVal}>{d.dinner}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : (
            <TextInput
              style={styles.planEditor}
              multiline
              value={planText}
              onChangeText={setPlanText}
              placeholder="Diet plan text..."
            />
          )}

          {/* ACTION BUTTONS */}
          <View style={{ gap: 8, marginTop: 12 }}>
            <TouchableOpacity
              style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
              disabled={isSaving}
              onPress={() => onSavePlan(planText, dietFee, false)}
            >
              <Ionicons name="save-outline" size={17} color="#0f172a" />
              <Text style={styles.saveBtnText}>Save Diet Plan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.receptionBtn, isSaving && { opacity: 0.6 }]}
              disabled={isSaving}
              onPress={() => onSavePlan(planText, dietFee, true)}
            >
              <Ionicons name="send" size={17} color="#fff" />
              <Text style={styles.receptionBtnText}>
                Save & Send to Reception (₹{dietFee})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* FULL SCREEN MODAL */}
      <Modal visible={isFullScreen} animationType="slide" onRequestClose={() => setIsFullScreen(false)}>
        <View style={{ flex: 1, backgroundColor: "#f8fafc", paddingTop: Platform.OS === "ios" ? 44 : 20 }}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>30-Day Diet Plan - Full Screen</Text>
              <Text style={styles.modalSubtitle}>{patientData.patientName || "Patient"}</Text>
            </View>
            <TouchableOpacity onPress={() => setIsFullScreen(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: 14 }}>
            <TextInput
              style={[styles.planEditor, { minHeight: 480, fontSize: 13 }]}
              multiline
              value={planText}
              onChangeText={setPlanText}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalSaveBtn}
              onPress={async () => {
                await onSavePlan(planText, dietFee, false);
                setIsFullScreen(false);
              }}
            >
              <Text style={styles.modalSaveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* BMI INFO MODAL */}
      <Modal visible={showBMIModal} transparent animationType="fade" onRequestClose={() => setShowBMIModal(false)}>
        <View style={styles.backdrop}>
          <View style={styles.infoModalBox}>
            <View style={styles.infoModalHeader}>
              <Text style={styles.infoModalTitle}>Body Mass Index (BMI) Standards</Text>
              <TouchableOpacity onPress={() => setShowBMIModal(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <View style={[styles.infoRow, { backgroundColor: "#eff6ff" }]}>
                <Text style={[styles.infoRowTitle, { color: "#1e40af" }]}>Underweight (&lt; 18.5)</Text>
                <Text style={styles.infoRowDesc}>Requires nutrient-dense healthy calories, protein, and tissue builders.</Text>
              </View>

              <View style={[styles.infoRow, { backgroundColor: "#ecfdf5" }]}>
                <Text style={[styles.infoRowTitle, { color: "#065f46" }]}>Normal Weight (18.5 – 24.9)</Text>
                <Text style={styles.infoRowDesc}>Optimal metabolic balance. Focus on micronutrient repletion & cellular wellness.</Text>
              </View>

              <View style={[styles.infoRow, { backgroundColor: "#fffbeb" }]}>
                <Text style={[styles.infoRowTitle, { color: "#92400e" }]}>Overweight (25.0 – 29.9)</Text>
                <Text style={styles.infoRowDesc}>Caloric regulation, insulin stabilization, evening light meal before 8 PM.</Text>
              </View>

              <View style={[styles.infoRow, { backgroundColor: "#fff1f2" }]}>
                <Text style={[styles.infoRowTitle, { color: "#9f1239" }]}>Obesity Class I & II (30.0 – 39.9)</Text>
                <Text style={styles.infoRowDesc}>Anti-inflammatory, low-glycemic foods, eliminate refined carbs, 14-hr intermittent fast.</Text>
              </View>

              <View style={[styles.infoRow, { backgroundColor: "#fef2f2" }]}>
                <Text style={[styles.infoRowTitle, { color: "#7f1d1d" }]}>Severe Obesity (≥ 40.0)</Text>
                <Text style={styles.infoRowDesc}>Strict medical supervision, total refined sugar elimination, liver detox protocol.</Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.infoCloseBtn} onPress={() => setShowBMIModal(false)}>
              <Text style={styles.infoCloseBtnText}>Close Standards</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 11,
    color: "#64748b",
  },
  bmiInfoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  bmiInfoBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284c7",
  },
  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: "#334155",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 3,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
    backgroundColor: "#f8fafc",
    textAlign: "center",
  },
  genderToggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    overflow: "hidden",
    height: 33,
  },
  genderBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  genderBtnActive: {
    backgroundColor: "#0284c7",
  },
  genderBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  genderBtnTextActive: {
    color: "#fff",
  },
  bmiResultCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  bmiMiniLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94a3b8",
  },
  bmiScore: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: 1,
  },
  bmiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bmiBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  bmiIdealText: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
  },
  catTabsRow: {
    flexDirection: "row",
    gap: 6,
  },
  catTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
  },
  catTabActive: {
    backgroundColor: "#0284c7",
  },
  catTabText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  catTabTextActive: {
    color: "#fff",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  condChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  condChipActive: {
    borderColor: "#0284c7",
    backgroundColor: "#f0f9ff",
  },
  condChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  condChipTextActive: {
    color: "#0369a1",
    fontWeight: "700",
  },
  feeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  feeInput: {
    width: 65,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "800",
    color: "#0f172a",
    backgroundColor: "#fff",
    textAlign: "right",
  },
  feePresetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  feePresetBtnActive: {
    backgroundColor: "#0284c7",
    borderColor: "#0284c7",
  },
  feePresetText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  feePresetTextActive: {
    color: "#fff",
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0284c7",
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  generateBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
  },
  ruleNotice: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 12,
    padding: 10,
  },
  ruleNoticeText: {
    flex: 1,
    fontSize: 11,
    color: "#92400e",
    lineHeight: 16,
  },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  toolBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#334155",
  },
  planEditor: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 10,
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "#0f172a",
    backgroundColor: "#f8fafc",
    minHeight: 180,
    textAlignVertical: "top",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  receptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#16a34a",
    paddingVertical: 12,
    borderRadius: 10,
  },
  receptionBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  modalSubtitle: {
    fontSize: 11,
    color: "#64748b",
  },
  closeBtn: {
    padding: 6,
  },
  modalFooter: {
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  modalSaveBtn: {
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalSaveBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  infoModalBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    maxWidth: 420,
  },
  infoModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  infoModalTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  infoRow: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  infoRowTitle: {
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 2,
  },
  infoRowDesc: {
    fontSize: 10,
    color: "#475569",
    lineHeight: 14,
  },
  infoCloseBtn: {
    backgroundColor: "#0284c7",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  infoCloseBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  subTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  subTabText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  dayCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  dayBadgeRow: {
    marginBottom: 6,
    alignSelf: "flex-start",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dayBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0369a1",
  },
  mealRow: {
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  mealLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 1,
  },
  mealVal: {
    fontSize: 11,
    color: "#334155",
    lineHeight: 15,
  },
});