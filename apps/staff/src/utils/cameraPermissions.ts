import { Alert, Linking, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";

/**
 * Checks and requests camera permissions.
 * If permission was previously denied or permanently disabled by the user ("Don't ask again"),
 * displays a friendly dialog with a direct button to Open Device Settings.
 */
export async function ensureCameraPermission(): Promise<boolean> {
  try {
    const current = await ImagePicker.getCameraPermissionsAsync();
    if (current.granted) {
      return true;
    }

    const requested = await ImagePicker.requestCameraPermissionsAsync();
    if (requested.granted) {
      return true;
    }

    Alert.alert(
      "Camera Permission Needed",
      "Camera access is required to take prescription and verification photos. Please enable Camera permission in your phone's Settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => {
            if (Platform.OS === "android" || Platform.OS === "ios") {
              Linking.openSettings().catch(() => {});
            }
          },
        },
      ]
    );
    return false;
  } catch (err) {
    console.warn("Error checking camera permission:", err);
    return false;
  }
}

/**
 * Checks and requests photo library permissions.
 * If permanently disabled, offers a direct button to Open Device Settings.
 */
export async function ensureMediaLibraryPermission(): Promise<boolean> {
  try {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (current.granted) {
      return true;
    }

    const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (requested.granted) {
      return true;
    }

    Alert.alert(
      "Gallery Permission Needed",
      "Photo library access is needed to select prescription files. Please enable Photo/Storage permission in your phone's Settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => {
            if (Platform.OS === "android" || Platform.OS === "ios") {
              Linking.openSettings().catch(() => {});
            }
          },
        },
      ]
    );
    return false;
  } catch (err) {
    console.warn("Error checking gallery permission:", err);
    return false;
  }
}

/**
 * Safely launches the camera without throwing unhandled "User rejected permissions" crashes.
 */
export async function safeLaunchCamera(
  options: ImagePicker.ImagePickerOptions = {}
): Promise<ImagePicker.ImagePickerResult | null> {
  const hasPermission = await ensureCameraPermission();
  if (!hasPermission) {
    return null;
  }

  try {
    const defaultOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.65,
      base64: true,
      ...options,
    };
    return await ImagePicker.launchCameraAsync(defaultOptions);
  } catch (err: any) {
    console.warn("Camera launch error:", err);
    const msg = String(err?.message || "").toLowerCase();
    if (msg.includes("permission") || msg.includes("rejected")) {
      Alert.alert(
        "Camera Permission Disabled",
        "Camera access was denied by your phone. You can enable it in Settings or select from your gallery.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => Linking.openSettings().catch(() => {}),
          },
        ]
      );
    } else {
      Alert.alert("Camera Error", "Unable to open camera. Please try selecting from the gallery.");
    }
    return null;
  }
}

/**
 * Safely launches the image library.
 */
export async function safeLaunchImageLibrary(
  options: ImagePicker.ImagePickerOptions = {}
): Promise<ImagePicker.ImagePickerResult | null> {
  const hasPermission = await ensureMediaLibraryPermission();
  if (!hasPermission) {
    return null;
  }

  try {
    const defaultOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.65,
      base64: true,
      ...options,
    };
    return await ImagePicker.launchImageLibraryAsync(defaultOptions);
  } catch (err: any) {
    console.warn("Image library error:", err);
    Alert.alert("Gallery Error", "Unable to open photo gallery.");
    return null;
  }
}
