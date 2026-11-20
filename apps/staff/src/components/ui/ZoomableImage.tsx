import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
  ImageStyle,
} from "react-native";
import { Image as ExpoImage, ImageProps as ExpoImageProps } from "expo-image";

export interface ZoomableImageRef {
  zoomIn: (step?: number) => void;
  zoomOut: (step?: number) => void;
  reset: () => void;
  setZoom: (targetScale: number) => void;
  getScale: () => number;
}

export interface ZoomableImageProps {
  source: string | { uri: string };
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  minScale?: number;
  maxScale?: number;
  rotation?: number; // 0, 90, 180, 270
  scale?: number; // optional controlled scale
  onScaleChange?: (scale: number) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  contentFit?: ExpoImageProps["contentFit"];
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: () => void;
}

export const ZoomableImage = forwardRef<ZoomableImageRef, ZoomableImageProps>(
  (
    {
      source,
      style,
      imageStyle,
      minScale = 0.85,
      maxScale = 4.5,
      rotation = 0,
      scale: controlledScale,
      onScaleChange,
      onSwipeLeft,
      onSwipeRight,
      contentFit = "contain",
      onLoadStart,
      onLoadEnd,
      onError,
    },
    ref
  ) => {
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    // Animated values for buttery smooth 60fps native-driven transforms
    const scaleAnim = useRef(new Animated.Value(controlledScale || 1)).current;
    const translateXAnim = useRef(new Animated.Value(0)).current;
    const translateYAnim = useRef(new Animated.Value(0)).current;

    // Synchronous tracking refs
    const currentScaleRef = useRef(controlledScale || 1);
    const currentTxRef = useRef(0);
    const currentTyRef = useRef(0);

    // Gesture tracking variables
    const initialDistanceRef = useRef(0);
    const initialScaleRef = useRef(1);
    const initialTxRef = useRef(0);
    const initialTyRef = useRef(0);
    const isPinchingRef = useRef(false);
    const lastTapTimeRef = useRef(0);
    const touchStartTimeRef = useRef(0);

    // Keep callback refs fresh
    const onSwipeLeftRef = useRef(onSwipeLeft);
    onSwipeLeftRef.current = onSwipeLeft;
    const onSwipeRightRef = useRef(onSwipeRight);
    onSwipeRightRef.current = onSwipeRight;
    const onScaleChangeRef = useRef(onScaleChange);
    onScaleChangeRef.current = onScaleChange;

    const animateTo = (targetScale: number, targetTx: number, targetTy: number) => {
      const clampedScale = Math.min(Math.max(targetScale, minScale), maxScale);
      currentScaleRef.current = clampedScale;
      currentTxRef.current = targetTx;
      currentTyRef.current = targetTy;

      if (onScaleChangeRef.current) {
        onScaleChangeRef.current(clampedScale);
      }

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: clampedScale,
          useNativeDriver: true,
          friction: 7,
          tension: 45,
        }),
        Animated.spring(translateXAnim, {
          toValue: targetTx,
          useNativeDriver: true,
          friction: 7,
          tension: 45,
        }),
        Animated.spring(translateYAnim, {
          toValue: targetTy,
          useNativeDriver: true,
          friction: 7,
          tension: 45,
        }),
      ]).start();
    };

    // Expose ref methods
    useImperativeHandle(ref, () => ({
      zoomIn: (step = 0.3) => {
        const next = Math.min(maxScale, currentScaleRef.current + step);
        animateTo(next, currentTxRef.current, currentTyRef.current);
      },
      zoomOut: (step = 0.3) => {
        const next = Math.max(1, currentScaleRef.current - step);
        if (next <= 1.05) {
          animateTo(1, 0, 0);
        } else {
          animateTo(next, currentTxRef.current, currentTyRef.current);
        }
      },
      reset: () => {
        animateTo(1, 0, 0);
      },
      setZoom: (targetScale: number) => {
        animateTo(targetScale, 0, 0);
      },
      getScale: () => currentScaleRef.current,
    }));

    // React to external controlled scale changes (e.g. from buttons)
    useEffect(() => {
      if (typeof controlledScale === "number") {
        if (Math.abs(controlledScale - currentScaleRef.current) > 0.05) {
          if (controlledScale <= 1.02) {
            animateTo(1, 0, 0);
          } else {
            animateTo(controlledScale, currentTxRef.current, currentTyRef.current);
          }
        }
      }
    }, [controlledScale]);

    // Reset position and scale when source or rotation changes
    useEffect(() => {
      animateTo(1, 0, 0);
    }, [source, rotation]);

    const handleLayout = (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setContainerSize({ width, height });
    };

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          // Always respond to two fingers (pinch)
          if (evt.nativeEvent.touches.length >= 2) return true;
          // If already zoomed in, respond to drag
          if (currentScaleRef.current > 1.05) return true;
          // When at 1x, respond if horizontal swipe gesture
          return Math.abs(gestureState.dx) > 10;
        },
        onMoveShouldSetPanResponderCapture: () => false,

        onPanResponderGrant: (evt) => {
          const touches = evt.nativeEvent.touches;
          touchStartTimeRef.current = Date.now();

          if (touches.length >= 2) {
            isPinchingRef.current = true;
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            initialDistanceRef.current = Math.hypot(dx, dy);
            initialScaleRef.current = currentScaleRef.current;
          } else {
            isPinchingRef.current = false;
            initialTxRef.current = currentTxRef.current;
            initialTyRef.current = currentTyRef.current;
          }
        },

        onPanResponderMove: (evt, gestureState) => {
          const touches = evt.nativeEvent.touches;

          if (touches.length >= 2) {
            // Two-finger PINCH ZOOM by hand
            isPinchingRef.current = true;
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            const currentDist = Math.hypot(dx, dy);

            if (initialDistanceRef.current > 0) {
              const factor = currentDist / initialDistanceRef.current;
              let targetScale = initialScaleRef.current * factor;
              targetScale = Math.min(Math.max(targetScale, minScale), maxScale);

              scaleAnim.setValue(targetScale);
              currentScaleRef.current = targetScale;
              if (onScaleChangeRef.current) {
                onScaleChangeRef.current(targetScale);
              }
            }
          } else if (touches.length === 1 && !isPinchingRef.current) {
            // One-finger PAN / DRAG by hand
            if (currentScaleRef.current > 1.05) {
              const scale = currentScaleRef.current;
              const w = containerSize.width || 360;
              const h = containerSize.height || 500;

              // Max pan boundary limits
              const maxTx = Math.max(10, (w * (scale - 1)) / 1.7);
              const maxTy = Math.max(10, (h * (scale - 1)) / 1.7);

              const nextTx = initialTxRef.current + gestureState.dx;
              const nextTy = initialTyRef.current + gestureState.dy;

              const clampedTx = Math.min(Math.max(nextTx, -maxTx), maxTx);
              const clampedTy = Math.min(Math.max(nextTy, -maxTy), maxTy);

              translateXAnim.setValue(clampedTx);
              translateYAnim.setValue(clampedTy);
              currentTxRef.current = clampedTx;
              currentTyRef.current = clampedTy;
            }
          }
        },

        onPanResponderRelease: (evt, gestureState) => {
          isPinchingRef.current = false;
          const now = Date.now();
          const timeSinceStart = now - touchStartTimeRef.current;

          // Double tap detection (< 320ms between two consecutive taps)
          if (
            now - lastTapTimeRef.current < 320 &&
            Math.abs(gestureState.dx) < 14 &&
            Math.abs(gestureState.dy) < 14
          ) {
            // Double tap toggle:
            if (currentScaleRef.current > 1.2) {
              animateTo(1, 0, 0);
            } else {
              animateTo(2.5, 0, 0);
            }
            lastTapTimeRef.current = 0;
            return;
          }
          lastTapTimeRef.current = now;

          // If pinched below 1x, bounce back to 1x
          if (currentScaleRef.current < 1) {
            animateTo(1, 0, 0);
            return;
          }

          // If at 1x, check for swipe left/right to navigate images
          if (currentScaleRef.current <= 1.05 && timeSinceStart < 500) {
            if (gestureState.dx < -45 && onSwipeLeftRef.current) {
              onSwipeLeftRef.current();
            } else if (gestureState.dx > 45 && onSwipeRightRef.current) {
              onSwipeRightRef.current();
            }
          }
        },

        onPanResponderTerminate: () => {
          isPinchingRef.current = false;
          if (currentScaleRef.current < 1) {
            animateTo(1, 0, 0);
          }
        },
      })
    ).current;

    const resolvedSource = typeof source === "string" ? { uri: source } : source;

    return (
      <View
        style={[styles.container, style]}
        onLayout={handleLayout}
        {...panResponder.panHandlers}
      >
        <Animated.View
          style={[
            styles.animatedWrapper,
            {
              transform: [
                { translateX: translateXAnim },
                { translateY: translateYAnim },
                { scale: scaleAnim },
                { rotate: `${rotation}deg` },
              ],
            },
          ]}
        >
          <ExpoImage
            source={resolvedSource}
            style={[styles.image, imageStyle]}
            contentFit={contentFit}
            onLoadStart={onLoadStart}
            onLoadEnd={onLoadEnd}
            onError={onError}
          />
        </Animated.View>
      </View>
    );
  }
);

ZoomableImage.displayName = "ZoomableImage";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  animatedWrapper: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
