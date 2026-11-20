import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ZoomableImage, ZoomableImageRef } from "./ZoomableImage";

export interface PhotoPreviewModalProps {
  visible: boolean;
  photoUrl?: string | null;
  photos?: string[];
  initialIndex?: number;
  title?: string;
  subtitle?: string;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  visible,
  photoUrl,
  photos = [],
  initialIndex = 0,
  title = "Photo Inspection",
  subtitle = "Pinch with fingers to zoom • Drag to pan",
  onClose,
}) => {
  // If single photoUrl provided, make it array
  const imageList = photos.length > 0 ? photos : photoUrl ? [photoUrl] : [];

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [rotation, setRotation] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const zoomRef = useRef<ZoomableImageRef>(null);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, imageList.length - 1)));
      setRotation(0);
      setZoomScale(1);
      setIsLoading(true);
      setHasError(false);
    }
  }, [visible, initialIndex, imageList.length]);

  if (!visible || imageList.length === 0) return null;

  const currentPhoto = imageList[currentIndex] || imageList[0];

  const handleNext = () => {
    if (currentIndex < imageList.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setRotation(0);
      setZoomScale(1);
      setIsLoading(true);
      setHasError(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setRotation(0);
      setZoomScale(1);
      setIsLoading(true);
      setHasError(false);
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleZoomIn = () => {
    zoomRef.current?.zoomIn(0.35);
  };

  const handleZoomOut = () => {
    zoomRef.current?.zoomOut(0.35);
  };

  const handleReset = () => {
    setRotation(0);
    setZoomScale(1);
    zoomRef.current?.reset();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        {/* TOP TOOLBAR */}
        <View style={styles.topBar}>
          {/* Left: Title & Subtitle & optional counter */}
          <View style={styles.headerInfo}>
            <View style={styles.titleRow}>
              <Ionicons name="sparkles" size={16} color="#38bdf8" />
              <Text style={styles.headerTitle} numberOfLines={1}>
                {title}
              </Text>
              {imageList.length > 1 && (
                <View style={styles.counterBadge}>
                  <Text style={styles.counterText}>
                    {currentIndex + 1}/{imageList.length}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>

          {/* Right: Controls (Rotate, Zoom Out -, Zoom In +, Reset, Close) */}
          <View style={styles.toolsRow}>
            {/* Rotate Button */}
            <TouchableOpacity
              style={styles.toolBtn}
              onPress={handleRotate}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="refresh-outline" size={17} color="#ffffff" />
              <Text style={styles.toolBtnLabel}>90°</Text>
            </TouchableOpacity>

            {/* Zoom Out Button (-) */}
            <TouchableOpacity
              style={[styles.toolBtn, zoomScale <= 1.05 && styles.toolBtnDisabled]}
              onPress={handleZoomOut}
              disabled={zoomScale <= 1.05}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="remove-circle-outline" size={18} color="#ffffff" />
            </TouchableOpacity>

            {/* Zoom In Button (+) */}
            <TouchableOpacity
              style={[styles.toolBtn, zoomScale >= 4.2 && styles.toolBtnDisabled]}
              onPress={handleZoomIn}
              disabled={zoomScale >= 4.2}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
            </TouchableOpacity>

            {/* Reset Button (visible if zoomed or rotated) */}
            {(zoomScale > 1.05 || rotation !== 0) && (
              <TouchableOpacity
                style={styles.toolBtn}
                onPress={handleReset}
                activeOpacity={0.7}
              >
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
            )}

            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* MAIN VIEWPORT WITH ZOOMABLE IMAGE */}
        <View style={styles.viewport}>
          {/* Loading Indicator */}
          {isLoading && !hasError && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#38bdf8" />
              <Text style={styles.loadingText}>Loading inspection photo...</Text>
            </View>
          )}

          {/* Error Message */}
          {hasError ? (
            <View style={styles.errorOverlay}>
              <Ionicons name="alert-circle-outline" size={44} color="#f87171" />
              <Text style={styles.errorText}>Unable to load photo</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => {
                  setHasError(false);
                  setIsLoading(true);
                }}
              >
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ZoomableImage
              ref={zoomRef}
              source={currentPhoto}
              rotation={rotation}
              onScaleChange={setZoomScale}
              onSwipeLeft={handleNext}
              onSwipeRight={handlePrev}
              onLoadStart={() => setIsLoading(true)}
              onLoadEnd={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              style={styles.zoomableContainer}
              imageStyle={styles.imageStyle}
            />
          )}

          {/* Left Arrow Button (<) for multi-photos */}
          {imageList.length > 1 && (
            <TouchableOpacity
              style={[
                styles.navArrow,
                styles.navArrowLeft,
                currentIndex === 0 && styles.navArrowDisabled,
              ]}
              onPress={handlePrev}
              disabled={currentIndex === 0}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name="chevron-back"
                size={26}
                color={currentIndex === 0 ? "rgba(255, 255, 255, 0.25)" : "#ffffff"}
              />
            </TouchableOpacity>
          )}

          {/* Right Arrow Button (>) for multi-photos */}
          {imageList.length > 1 && (
            <TouchableOpacity
              style={[
                styles.navArrow,
                styles.navArrowRight,
                currentIndex === imageList.length - 1 && styles.navArrowDisabled,
              ]}
              onPress={handleNext}
              disabled={currentIndex === imageList.length - 1}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name="chevron-forward"
                size={26}
                color={
                  currentIndex === imageList.length - 1
                    ? "rgba(255, 255, 255, 0.25)"
                    : "#ffffff"
                }
              />
            </TouchableOpacity>
          )}
        </View>

        {/* BOTTOM HINT PILL */}
        <View style={styles.bottomHintRow}>
          <Ionicons name="hand-left-outline" size={13} color="#38bdf8" />
          <Text style={styles.bottomHintText}>
            Pinch with 2 fingers or double tap to zoom • Drag to pan
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 15, 29, 0.97)",
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 46,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
  },
  headerInfo: {
    flex: 1,
    marginRight: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    maxWidth: SCREEN_WIDTH * 0.45,
  },
  counterBadge: {
    backgroundColor: "rgba(56, 189, 248, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.35)",
  },
  counterText: {
    color: "#38bdf8",
    fontSize: 10,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "#94a3b8",
    fontSize: 10.5,
    marginTop: 2,
  },
  toolsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    paddingHorizontal: 8,
    paddingVertical: 5.5,
    borderRadius: 8,
  },
  toolBtnLabel: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
  toolBtnDisabled: {
    opacity: 0.35,
  },
  resetText: {
    color: "#38bdf8",
    fontSize: 11,
    fontWeight: "700",
  },
  closeBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 3,
  },
  viewport: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  zoomableContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  imageStyle: {
    borderRadius: 8,
  },
  loadingOverlay: {
    position: "absolute",
    zIndex: 20,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: 12,
  },
  errorOverlay: {
    position: "absolute",
    zIndex: 20,
    alignItems: "center",
    gap: 10,
  },
  errorText: {
    color: "#f87171",
    fontSize: 13,
    fontWeight: "700",
  },
  retryBtn: {
    backgroundColor: "rgba(248, 113, 113, 0.2)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.4)",
  },
  retryBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  navArrow: {
    position: "absolute",
    zIndex: 15,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  navArrowLeft: {
    left: 12,
  },
  navArrowRight: {
    right: 12,
  },
  navArrowDisabled: {
    opacity: 0.2,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
  bottomHintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
  },
  bottomHintText: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "600",
  },
});
