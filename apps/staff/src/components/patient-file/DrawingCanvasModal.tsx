import React, { useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface Point {
  x: number;
  y: number;
}

interface PathStroke {
  points: Point[];
  color: string;
  width: number;
}

interface DrawingCanvasModalProps {
  visible: boolean;
  patientName?: string;
  registrationId?: string;
  onClose: () => void;
  onSaveDrawing: (svgDataUri: string) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const DrawingCanvasModal: React.FC<DrawingCanvasModalProps> = ({
  visible,
  patientName = "Patient",
  registrationId = "SPH-REG",
  onClose,
  onSaveDrawing,
}) => {
  const [paths, setPaths] = useState<PathStroke[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>("#1e3a8a");
  const [selectedWidth, setSelectedWidth] = useState<number>(3.5);
  const [canvasDim, setCanvasDim] = useState({
    width: SCREEN_WIDTH - 24,
    height: Math.round(SCREEN_HEIGHT * 0.72),
  });

  const pathsRef = useRef<PathStroke[]>(paths);
  pathsRef.current = paths;

  const currentPointsRef = useRef<Point[]>(currentPoints);
  currentPointsRef.current = currentPoints;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const p = { x: locationX, y: locationY };
          currentPointsRef.current = [p];
          setCurrentPoints([p]);
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const newPts = [...currentPointsRef.current, { x: locationX, y: locationY }];
          currentPointsRef.current = newPts;
          setCurrentPoints(newPts);
        },
        onPanResponderRelease: () => {
          if (currentPointsRef.current.length > 0) {
            const newStroke: PathStroke = {
              points: currentPointsRef.current,
              color: selectedColor,
              width: selectedWidth,
            };
            setPaths((prev) => [...prev, newStroke]);
            currentPointsRef.current = [];
            setCurrentPoints([]);
          }
        },
      }),
    [selectedColor, selectedWidth]
  );

  const handleUndo = () => {
    if (paths.length > 0) {
      setPaths(paths.slice(0, paths.length - 1));
    }
  };

  const handleClear = () => {
    if (paths.length === 0) return;
    Alert.alert("Clear Canvas", "Are you sure you want to erase all drawings?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Erase All",
        style: "destructive",
        onPress: () => {
          setPaths([]);
          setCurrentPoints([]);
        },
      },
    ]);
  };

  const handleSave = () => {
    if (paths.length === 0) {
      Alert.alert("Empty Canvas", "Please write or draw something on the prescription pad before saving.");
      return;
    }

    // Build standard high-resolution SVG string
    let svgPaths = "";
    for (const stroke of paths) {
      if (stroke.points.length === 0) continue;
      const pts = stroke.points;
      let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
      for (let i = 1; i < pts.length; i++) {
        d += ` L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
      }
      svgPaths += `<path d="${d}" stroke="${stroke.color}" stroke-width="${stroke.width}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
    }

    const w = canvasDim.width || SCREEN_WIDTH - 24;
    const h = canvasDim.height || Math.round(SCREEN_HEIGHT * 0.72);

    // Pure solid white background - NO blue background, NO banner, NO lines
    const fullSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
        <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff" />
        ${svgPaths}
      </svg>
    `.trim();

    // Data URI representation
    const svgDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(fullSvg)}`;
    onSaveDrawing(svgDataUri);
    setPaths([]);
    setCurrentPoints([]);
    onClose();
  };

  if (!visible) return null;

  // Helper to render stroke segments
  const renderStrokes = (strokeList: PathStroke[]) => {
    const segments: React.ReactNode[] = [];
    strokeList.forEach((stroke, sIdx) => {
      const pts = stroke.points;
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const length = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        segments.push(
          <View
            key={`s-${sIdx}-${i}`}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: p1.x,
              top: p1.y - stroke.width / 2,
              width: Math.max(length, stroke.width),
              height: stroke.width,
              backgroundColor: stroke.color,
              borderRadius: stroke.width / 2,
              transformOrigin: "0% 50%",
              transform: [{ rotate: `${angle}rad` }],
            }}
          />
        );
      }
    });
    return segments;
  };

  const currentStrokeList: PathStroke[] = currentPoints.length > 0
    ? [{ points: currentPoints, color: selectedColor, width: selectedWidth }]
    : [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.fullModalContainer} edges={["top", "bottom"]}>
        {/* HEADER */}
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>Prescription Canvas Pad (Full Screen)</Text>
            <Text style={styles.modalSubtitle}>
              {patientName} • {registrationId}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.actionBtn, paths.length === 0 && styles.actionBtnDisabled]}
              onPress={handleUndo}
              disabled={paths.length === 0}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-undo-outline" size={17} color="#0f172a" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, paths.length === 0 && styles.actionBtnDisabled]}
              onPress={handleClear}
              disabled={paths.length === 0}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={17} color="#ef4444" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* FULL DRAWING CANVAS SHEET (SOLID PURE WHITE, NO BLUE BG, NO LINES) */}
        <View
          style={styles.canvasSheet}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width > 0 && height > 0) {
              setCanvasDim({ width: Math.round(width), height: Math.round(height) });
            }
          }}
          {...panResponder.panHandlers}
        >
          {renderStrokes(paths)}
          {renderStrokes(currentStrokeList)}
        </View>

        {/* COLOR & STROKE CONTROLS */}
        <View style={styles.toolsBar}>
          {/* Color Swatches */}
          <View style={styles.colorsGroup}>
            {[
              { color: "#1e3a8a", label: "Navy" },
              { color: "#0f172a", label: "Black" },
              { color: "#dc2626", label: "Red" },
              { color: "#059669", label: "Green" },
            ].map((c) => {
              const isSelected = selectedColor === c.color;
              return (
                <TouchableOpacity
                  key={c.color}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c.color },
                    isSelected && styles.colorDotSelected,
                  ]}
                  onPress={() => setSelectedColor(c.color)}
                  activeOpacity={0.7}
                />
              );
            })}
          </View>

          {/* Pen Thickness Chips */}
          <View style={styles.strokeWidthGroup}>
            {[
              { width: 2.5, label: "Fine" },
              { width: 4.0, label: "Medium" },
              { width: 6.0, label: "Bold" },
            ].map((w) => {
              const isSelected = selectedWidth === w.width;
              return (
                <TouchableOpacity
                  key={w.label}
                  style={[
                    styles.strokeWidthChip,
                    isSelected && styles.strokeWidthChipActive,
                  ]}
                  onPress={() => setSelectedWidth(w.width)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.strokeWidthChipText,
                      isSelected && styles.strokeWidthChipTextActive,
                    ]}
                  >
                    {w.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* FOOTER SAVE CTA */}
        <View style={styles.footerRow}>
          <TouchableOpacity
            style={styles.cancelFooterBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelFooterText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.savePrescriptionBtn}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={17} color="#ffffff" />
            <Text style={styles.savePrescriptionText}>Save Prescription & Add to File</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullModalContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 16,
    justifyContent: "space-between",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  modalSubtitle: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnDisabled: {
    opacity: 0.35,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  canvasSheet: {
    flex: 1,
    backgroundColor: "#ffffff", // Pure solid white, NO blue background
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    marginVertical: 10,
    position: "relative",
    overflow: "hidden",
  },
  toolsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  colorsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorDotSelected: {
    borderColor: "#0f172a",
    transform: [{ scale: 1.25 }],
  },
  strokeWidthGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  strokeWidthChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  strokeWidthChipActive: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  strokeWidthChipText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#475569",
  },
  strokeWidthChipTextActive: {
    color: "#ffffff",
    fontWeight: "800",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  cancelFooterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelFooterText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#64748b",
  },
  savePrescriptionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#059669",
    paddingVertical: 11,
    borderRadius: 9,
  },
  savePrescriptionText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
});
