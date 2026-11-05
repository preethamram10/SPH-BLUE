import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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

interface Task {
  id: string;
  title: string;
  category: string;
  isDone: boolean;
  doneAt?: string;
}

export default function ReceptionBranchCleaningScreen() {
  const router = useRouter();
  const [activeBranch, setActiveBranch] = useState<any>(null);

  useEffect(() => {
    getActiveBranch().then((b) => {
      if (b) setActiveBranch(b);
    });
  }, []);

  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      category: "Morning Routine",
      title: "Clinic Floor Mopping & Sanitization",
      isDone: true,
      doneAt: "08:45 AM",
    },
    {
      id: "2",
      category: "Morning Routine",
      title: "Reception Front Desk & Terminal Disinfection",
      isDone: true,
      doneAt: "08:50 AM",
    },
    {
      id: "3",
      category: "OPD & Rooms",
      title: "Doctor Consultation Rooms 1 & 2 Prepared",
      isDone: true,
      doneAt: "09:00 AM",
    },
    {
      id: "4",
      category: "Sanitization & Hygiene",
      title: "Drinking Water Dispenser & Cups Refilled",
      isDone: true,
      doneAt: "09:05 AM",
    },
    {
      id: "5",
      category: "Sanitization & Hygiene",
      title: "Restrooms Cleaned, Handwash & Towels Restocked",
      isDone: false,
    },
    {
      id: "6",
      category: "Sanitization & Hygiene",
      title: "Patient Waiting Room Chairs Sanitized",
      isDone: false,
    },
    {
      id: "7",
      category: "Evening Closing",
      title: "Medical Waste Disposal & Trash Clearance",
      isDone: false,
    },
  ]);

  const toggleTask = (id: string) => {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              isDone: !t.isDone,
              doneAt: !t.isDone ? now : undefined,
            }
          : t
      )
    );
  };

  const doneCount = tasks.filter((t) => t.isDone).length;
  const progressPercent = Math.round((doneCount / tasks.length) * 100);

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
          <Text style={styles.headerTitle}>Branch Cleaning</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {activeBranch?.name ? `${activeBranch.name} • Hygiene` : "Hygiene & Housekeeping Checklist"}
          </Text>
        </View>
      </View>

      {/* Progress Box */}
      <View style={styles.progressCard}>
        <View style={styles.progressTop}>
          <Text style={styles.progressLabel}>Today&apos;s Hygiene Score</Text>
          <Text style={styles.progressPercent}>{progressPercent}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.taskCountText}>
          {doneCount} of {tasks.length} Inspection Tasks Verified
        </Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {tasks.map((task) => (
          <TouchableOpacity
            key={task.id}
            style={[styles.taskCard, task.isDone && styles.taskCardDone]}
            onPress={() => toggleTask(task.id)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.checkbox,
                task.isDone ? styles.checkboxChecked : styles.checkboxUnchecked,
              ]}
            >
              {task.isDone && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
            </View>

            <View style={styles.taskTextContainer}>
              <View style={styles.taskHeaderRow}>
                <Text
                  style={[
                    styles.taskTitle,
                    task.isDone && styles.taskTitleDone,
                  ]}
                >
                  {task.title}
                </Text>
              </View>
              <Text style={styles.categoryBadge}>{task.category}</Text>
            </View>

            {task.doneAt && (
              <View style={styles.doneBadge}>
                <Text style={styles.doneBadgeText}>{task.doneAt}</Text>
              </View>
            )}
          </TouchableOpacity>
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
  progressCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.textDark,
    textTransform: "uppercase",
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.blue,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: COLORS.green,
    borderRadius: 4,
  },
  taskCountText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  taskCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  taskCardDone: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: COLORS.green,
  },
  checkboxUnchecked: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: "#cbd5e1",
  },
  taskTextContainer: {
    flex: 1,
  },
  taskHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  taskTitleDone: {
    textDecorationLine: "line-through",
    color: COLORS.textMuted,
  },
  categoryBadge: {
    fontSize: 10,
    color: COLORS.blue,
    fontWeight: "700",
  },
  doneBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  doneBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#166534",
  },
});

