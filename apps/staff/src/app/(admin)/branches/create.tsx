import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

const COLORS = {
  blue: "#268ec8",
  green: "#a8ce3a",
  white: "#ffffff",
  textDark: "#1e293b",
  textMuted: "#64748b",
  textLight: "#94a3b8",
  border: "#e2e8f0",
  inputBg: "#f8fafc",
  cardBg: "#ffffff",
  errorRed: "#ef4444",
};

interface PhotoItem {
  uri: string;
  name: string;
}

export default function CreateBranchScreen() {
  const router = useRouter();

  // Form Fields
  const [branchName, setBranchName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Hyderabad");
  const [timings, setTimings] = useState("9:00 AM - 8:00 PM (Mon - Sat)");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Pick Photos from Gallery
  const handlePickPhotos = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant camera roll permissions to upload branch photos."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newPhotos: PhotoItem[] = result.assets.map((asset, index) => {
          const fileName = asset.fileName || `branch_photo_${Date.now()}_${index + 1}.jpg`;
          return {
            uri: asset.uri,
            name: fileName,
          };
        });

        setPhotos((prev) => [...prev, ...newPhotos]);
      }
    } catch (err: any) {
      Alert.alert("Photo Upload Error", err.message || "Failed to pick images");
    }
  };

  // Remove a photo
  const handleRemovePhoto = (indexToRemove: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Save / Submit Branch
  const handleSaveBranch = () => {
    if (!branchName.trim()) {
      Alert.alert("Missing Name", "Please enter the branch name.");
      return;
    }
    if (!phoneNumber.trim()) {
      Alert.alert("Missing Phone", "Please enter contact number for this branch.");
      return;
    }
    if (!address.trim()) {
      Alert.alert("Missing Address", "Please enter full street address.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        "Branch Created!",
        `"${branchName}" has been successfully registered with ${photos.length} photos.`,
        [
          {
            text: "View Branches",
            onPress: () => router.replace("/(admin)/branches" as any),
          },
        ]
      );
    }, 600);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
        {/* Top Navbar */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.blue} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Add New Branch</Text>
            <Text style={styles.headerSubtitle}>Clinic &amp; Hospital Locations</Text>
          </View>
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Form Card */}
          <View style={styles.card}>
            {/* Branch Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Branch Name <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="business-outline" size={19} color={COLORS.blue} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Spiritual Homeopathy - Kukatpally Branch"
                  placeholderTextColor={COLORS.textLight}
                  value={branchName}
                  onChangeText={setBranchName}
                />
              </View>
            </View>

            {/* Contact Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Contact Number <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={19} color={COLORS.blue} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. +91 9030176176 / 040-23456789"
                  placeholderTextColor={COLORS.textLight}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Complete Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Branch Address <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, styles.multilineWrapper]}>
                <Ionicons
                  name="location-outline"
                  size={19}
                  color={COLORS.blue}
                  style={[styles.inputIcon, { marginTop: 4 }]}
                />
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  placeholder="Full address (Street, Metro Pillar, Landmark, City & Pincode)"
                  placeholderTextColor={COLORS.textLight}
                  value={address}
                  onChangeText={setAddress}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* City & Working Hours */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>City</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="City name"
                    placeholderTextColor={COLORS.textLight}
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1.3 }]}>
                <Text style={styles.label}>Working Hours</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="9:00 AM - 8:00 PM"
                    placeholderTextColor={COLORS.textLight}
                    value={timings}
                    onChangeText={setTimings}
                  />
                </View>
              </View>
            </View>

            {/* Branch Photos Section */}
            <View style={styles.photosSection}>
              <View style={styles.photosHeader}>
                <View>
                  <Text style={styles.label}>Branch Photos</Text>
                  <Text style={styles.photosSubtext}>
                    Upload building exterior, reception desk &amp; OPD clinic photos
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.addPhotosButton}
                  onPress={handlePickPhotos}
                  activeOpacity={0.8}
                >
                  <Ionicons name="images-outline" size={16} color={COLORS.white} />
                  <Text style={styles.addPhotosButtonText}>Upload Photos</Text>
                </TouchableOpacity>
              </View>

              {/* Photos Preview Grid / Strip */}
              {photos.length === 0 ? (
                <TouchableOpacity
                  style={styles.emptyUploadBox}
                  onPress={handlePickPhotos}
                  activeOpacity={0.7}
                >
                  <Ionicons name="cloud-upload-outline" size={36} color={COLORS.blue} />
                  <Text style={styles.emptyUploadText}>Tap to select photos from gallery</Text>
                  <Text style={styles.emptyUploadSubtext}>JPG, PNG supported</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.photosList}>
                  {photos.map((item, index) => (
                    <View key={index} style={styles.photoCard}>
                      <Image source={{ uri: item.uri }} style={styles.photoThumbnail} />
                      <View style={styles.photoDetails}>
                        <Text style={styles.photoName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.photoIndex}>Photo #{index + 1}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => handleRemovePhoto(index)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close-circle" size={22} color={COLORS.errorRed} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSaveBranch}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <View style={styles.submitButtonContent}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} />
                  <Text style={styles.submitButtonText}>Create &amp; Publish Branch</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 40,
    height: 40,
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
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: 6,
  },
  required: {
    color: COLORS.errorRed,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.inputBg,
  },
  multilineWrapper: {
    height: 84,
    alignItems: "flex-start",
    paddingVertical: 8,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
  },
  multilineInput: {
    height: 68,
  },
  photosSection: {
    marginTop: 8,
    marginBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  photosHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  photosSubtext: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  addPhotosButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.blue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addPhotosButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyUploadBox: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: COLORS.blue,
    backgroundColor: "#f0f8fd",
    borderRadius: 14,
    paddingVertical: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyUploadText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.blue,
    marginTop: 8,
  },
  emptyUploadSubtext: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  photosList: {
    gap: 10,
  },
  photoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 8,
  },
  photoThumbnail: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
  },
  photoDetails: {
    flex: 1,
    marginLeft: 12,
  },
  photoName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  photoIndex: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  removePhotoButton: {
    padding: 6,
  },
  submitButton: {
    backgroundColor: COLORS.blue,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "#1a6b99",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
