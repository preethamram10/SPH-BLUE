import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface DoctorHeaderProps {
  title: string;
  subtitle?: string;
  onOpenDrawer?: () => void;
  onBack?: () => void;
  onLogout?: () => void;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    color?: string;
    badgeCount?: number;
  };
}

export const DoctorHeader: React.FC<DoctorHeaderProps> = ({
  title,
  subtitle,
  onOpenDrawer,
  onBack,
  onLogout,
  rightAction,
}) => {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.leftRow}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.navButton}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
        ) : onOpenDrawer ? (
          <TouchableOpacity
            onPress={onOpenDrawer}
            style={styles.navButton}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="menu" size={22} color="#0f172a" />
          </TouchableOpacity>
        ) : null}

        <View style={styles.titleColumn}>
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitleText} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {rightAction ? (
          <TouchableOpacity
            onPress={rightAction.onPress}
            style={styles.actionButton}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={rightAction.icon}
              size={20}
              color={rightAction.color || "#0f172a"}
            />
            {typeof rightAction.badgeCount === "number" && rightAction.badgeCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>
                  {rightAction.badgeCount > 9 ? "9+" : rightAction.badgeCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : null}

        {onLogout ? (
          <TouchableOpacity
            onPress={onLogout}
            style={[styles.actionButton, { backgroundColor: "#fee2e2" }]}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        ) : null}

        {!rightAction && !onLogout && onBack ? (
          <View style={{ width: 36 }} />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  titleColumn: {
    flex: 1,
  },
  titleText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitleText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badgeContainer: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: "#ef4444",
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#ffffff",
  },
});
