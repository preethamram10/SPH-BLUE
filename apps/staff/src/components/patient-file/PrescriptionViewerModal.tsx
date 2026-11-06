import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

interface PrescriptionViewerModalProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
  onDeleteImage?: (index: number) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const PrescriptionViewerModal: React.FC<PrescriptionViewerModalProps> = ({
  visible,
  images,
  initialIndex = 0,
  onClose,
  onDeleteImage,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [zoomScale, setZoomScale] = useState(1);

  // Sync index on open
  useEffect(() => {
    if (visible) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, images.length - 1)));
      setRotation(0);
      setZoomScale(1);
    }
  }, [visible, initialIndex, images.length]);

  if (!visible || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setRotation(0);
      setZoomScale(1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setRotation(0);
      setZoomScale(1);
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(3, Math.round((prev + 0.25) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(0.75, Math.round((prev - 0.25) * 100) / 100));
  };

  const handleReset = () => {
    setRotation(0);
    setZoomScale(1);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Prescription",
      "Are you sure you want to remove this prescription image?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (onDeleteImage) {
              onDeleteImage(currentIndex);
            }
            if (images.length <= 1) {
              onClose();
            } else if (currentIndex >= images.length - 1) {
              setCurrentIndex(images.length - 2);
            }
          },
        },
      ]
    );
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
          {/* Left: Counter Pill */}
          <View style={styles.counterPill}>
            <Ionicons name="images-outline" size={14} color="#ffffff" />
            <Text style={styles.counterText}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>

          {/* Right: Controls (Rotate, Zoom Out, Zoom In, Delete, Close) */}
          <View style={styles.toolsRow}>
            {/* Rotate Button */}
            <TouchableOpacity
              style={styles.toolBtn}
              onPress={handleRotate}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="refresh-outline" size={18} color="#ffffff" />
              <Text style={styles.toolBtnLabel}>90°</Text>
            </TouchableOpacity>

            {/* Zoom Out Button */}
            <TouchableOpacity
              style={[styles.toolBtn, zoomScale <= 0.75 && styles.toolBtnDisabled]}
              onPress={handleZoomOut}
              disabled={zoomScale <= 0.75}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="remove-circle-outline" size={18} color="#ffffff" />
            </TouchableOpacity>

            {/* Zoom In Button */}
            <TouchableOpacity
              style={[styles.toolBtn, zoomScale >= 3 && styles.toolBtnDisabled]}
              onPress={handleZoomIn}
              disabled={zoomScale >= 3}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
            </TouchableOpacity>

            {/* Reset Zoom/Rotate (visible if modified) */}
            {(zoomScale !== 1 || rotation !== 0) && (
              <TouchableOpacity
                style={styles.toolBtn}
                onPress={handleReset}
                activeOpacity={0.7}
              >
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
            )}

            {/* Delete Button */}
            {onDeleteImage && (
              <TouchableOpacity
                style={[styles.toolBtn, styles.deleteBtn]}
                onPress={handleDelete}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={17} color="#ef4444" />
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

        {/* MAIN VIEWPORT WITH IMAGE */}
        <View style={styles.imageViewport}>
          {/* Left Arrow Button */}
          {currentIndex > 0 && (
            <TouchableOpacity
              style={[styles.navArrow, styles.navArrowLeft]}
              onPress={handlePrev}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={26} color="#ffffff" />
            </TouchableOpacity>
          )}

          {/* Center Image with Zoom & Rotate Transform */}
          <View style={styles.imageContainer}>
            <ExpoImage
              source={currentImage}
              style={[
                styles.mainImage,
                {
                  transform: [
                    { scale: zoomScale },
                    { rotate: `${rotation}deg` },
                  ],
                },
              ]}
              contentFit="contain"
            />
          </View>

          {/* Right Arrow Button */}
          {currentIndex < images.length - 1 && (
            <TouchableOpacity
              style={[styles.navArrow, styles.navArrowRight]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-forward" size={26} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>

        {/* BOTTOM THUMBNAIL STRIP */}
        <View style={styles.bottomBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbsScrollContent}
          >
            {images.map((uri, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.thumbWrapper,
                    isSelected && styles.thumbWrapperActive,
                  ]}
                  onPress={() => {
                    setCurrentIndex(idx);
                    setRotation(0);
                    setZoomScale(1);
                  }}
                  activeOpacity={0.7}
                >
                  <ExpoImage source={uri} style={styles.thumbImage} contentFit="cover" />
                  {isSelected && (
                    <View style={styles.activeIndicatorDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 15, 29, 0.96)",
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 45,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.12)",
  },
  counterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  counterText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  toolsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    paddingHorizontal: 9,
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
  deleteBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.18)",
  },
  closeBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  imageViewport: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    width: SCREEN_WIDTH - 24,
    height: SCREEN_HEIGHT * 0.65,
    justifyContent: "center",
    alignItems: "center",
  },
  mainImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 8,
  },
  navArrow: {
    position: "absolute",
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
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
  bottomBar: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  thumbsScrollContent: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 6,
  },
  thumbWrapper: {
    width: 54,
    height: 54,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
    position: "relative",
  },
  thumbWrapperActive: {
    borderColor: "#0284c7",
    transform: [{ scale: 1.08 }],
  },
  thumbImage: {
    width: "100%",
    height: "100%",
    borderRadius: 6,
  },
  activeIndicatorDot: {
    position: "absolute",
    bottom: 2,
    alignSelf: "center",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#0284c7",
  },
});

