import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { saveAuthToken, saveActiveBranch, saveActiveDoctor, saveUserRole, getAuthToken, getUserRole } from "../../services/auth";
import { API_BASE_URL } from "../../config/api";

type TabType = "doctor" | "reception" | "admin_hr" | "telecaller";

const COLORS = {
  blue: "#268ec8",
  green: "#a8ce3a",
  white: "#ffffff",
  textDark: "#1e293b",
  textMuted: "#64748b",
  textLight: "#94a3b8",
  border: "#e2e8f0",
  tabContainerBg: "#f1f5f9",
  cardBg: "#ffffff",
  pageBg: "#f8fafc",
  timerRed: "#e11d48",
};

export default function StaffLoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>("doctor");

  // Form Fields
  const [mobileNumber, setMobileNumber] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Keyboard state for smooth resizing on mobile
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // OTP State
  const [step, setStep] = useState<"INPUT" | "OTP">("INPUT");
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const [validatedData, setValidatedData] = useState<any>(null);

  // Check persistent session on mount: if already logged in, redirect directly to dashboard
  useEffect(() => {
    async function checkExistingSession() {
      try {
        const token = await getAuthToken();
        const role = await getUserRole();
        if (token && role) {
          switch (role.toUpperCase()) {
            case "RECEPTION":
              router.replace("/(reception)" as any);
              break;
            case "DOCTOR":
              router.replace("/(doctor)" as any);
              break;
            case "TELECALLER":
              router.replace("/(telecaller)" as any);
              break;
            case "ADMIN":
              router.replace("/(admin)" as any);
              break;
            case "HR":
              router.replace("/(hr)" as any);
              break;
          }
        }
      } catch {}
    }
    checkExistingSession();
  }, []);

  // Countdown timer for OTP
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (step === "OTP" && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Send OTP handler
  const handleSendOtp = async () => {
    const cleanNumber = mobileNumber.trim();
    if (!cleanNumber || cleanNumber.length < 10) {
      Alert.alert(
        "Invalid Mobile Number",
        "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    setLoading(true);

    try {
      const roleToSend = activeTab === "doctor" ? "DOCTOR" : activeTab === "reception" ? "RECEPTION" : "TELECALLER";
      const res = await fetch(`${API_BASE_URL}/auth/validate-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanNumber, role: roleToSend }),
      });

      const data = await res.json();
      if (!res.ok || !data.authorized) {
        Alert.alert(
          "Not Authorized",
          data.error ||
            "Please check your mobile number or contact clinic admin."
        );
        return;
      }

      setValidatedData(data);

      if (data.branch) {
        await saveActiveBranch(data.branch);
      }
      if (data.doctor) {
        await saveActiveDoctor(data.doctor);
      }
      setStep("OTP");
      setTimer(30);
      setOtp("1234");
    } catch (err: any) {
      console.error("[Login] validate-phone error:", err);
      Alert.alert(
        "Connection Notice",
        `Unable to reach server (${API_BASE_URL}). ${err?.message || "Please check internet connection."}`
      );
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP and Sign In
  const handleVerifyOtp = async () => {
    if (!otp || otp.trim().length < 4) {
      Alert.alert("Missing OTP", "Please enter the verification code.");
      return;
    }

    const expectedRole = activeTab === "doctor" ? "DOCTOR" : activeTab === "reception" ? "RECEPTION" : "TELECALLER";
    if (validatedData?.role && validatedData.role !== expectedRole) {
      Alert.alert("Role Mismatch", `You are not authorized to log in as ${expectedRole}.`);
      return;
    }

    setLoading(true);
    try {
      await saveAuthToken(`token_${activeTab}_${mobileNumber}`);

      if (activeTab === "doctor") {
        await saveUserRole("DOCTOR");
        router.replace("/(doctor)" as any);
      } else if (activeTab === "reception") {
        await saveUserRole("RECEPTION");
        router.replace("/(reception)" as any);
      } else if (activeTab === "telecaller") {
        await saveUserRole("TELECALLER");
        router.replace("/(telecaller)" as any);
      } else {
        await saveUserRole("ADMIN");
        router.replace("/(admin)" as any);
      }
    } finally {
      setLoading(false);
    }
  };

  // Username / Password login for Admin / HR
  const handleAdminHrLogin = async () => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      Alert.alert("Missing Details", "Please enter username and password.");
      return;
    }

    setLoading(true);
    try {
      // 1. Admin Login
      if (cleanUser === "admin" && cleanPass === "admin@123") {
        await saveAuthToken("admin_session_token");
        await saveUserRole("ADMIN");
        router.replace("/(admin)" as any);
        return;
      }

      // 2. HR Login
      if (cleanUser === "hr" && cleanPass === "hr@123") {
        await saveAuthToken("hr_session_token");
        await saveUserRole("HR");
        router.replace("/(hr)" as any);
        return;
      }

      Alert.alert(
        "Invalid Credentials",
        "For Admin use: admin / admin@123\nFor HR use: hr / hr@123"
      );
    } finally {
      setLoading(false);
    }
  };

  // Switch tabs
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setStep("INPUT");
    setOtp("");
    setValidatedData(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top > 0 ? (isKeyboardVisible ? 12 : 24) : 16, 16),
            paddingBottom: isKeyboardVisible ? 140 : Math.max(insets.bottom, 24),
            justifyContent: isKeyboardVisible ? "flex-start" : "center",
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Top Branding */}
        <View
          style={[
            styles.brandingContainer,
            isKeyboardVisible && styles.brandingContainerCompact,
          ]}
        >
          <Image
            source={require("../../../assets/images/logo.png")}
            style={[styles.logo, isKeyboardVisible && styles.logoCompact]}
            resizeMode="contain"
          />
          {!isKeyboardVisible ? (
            <>
              <Text style={styles.mainTitle}>Spiritual Homeopathy</Text>
              <Text style={styles.subtitle}>
                Doctor, Staff, HR, Reception &amp; Admin Portal
              </Text>
            </>
          ) : (
            <Text style={styles.mainTitleCompact}>Spiritual Homeopathy</Text>
          )}
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Segmented 4 Tabs */}
          <View style={styles.tabBar}>
            {/* Tab 1: Doctor */}
            <TouchableOpacity
              style={[
                styles.tabItem,
                activeTab === "doctor" && styles.tabItemActive,
              ]}
              onPress={() => handleTabChange("doctor")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="medkit-outline"
                size={14}
                color={
                  activeTab === "doctor" ? COLORS.blue : COLORS.textMuted
                }
                style={styles.tabIcon}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "doctor" && styles.tabTextActive,
                ]}
                numberOfLines={1}
              >
                Doctor
              </Text>
            </TouchableOpacity>

            {/* Tab 2: Reception */}
            <TouchableOpacity
              style={[
                styles.tabItem,
                activeTab === "reception" && styles.tabItemActive,
              ]}
              onPress={() => handleTabChange("reception")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="business-outline"
                size={14}
                color={activeTab === "reception" ? COLORS.blue : COLORS.textMuted}
                style={styles.tabIcon}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "reception" && styles.tabTextActive,
                ]}
                numberOfLines={1}
              >
                Reception
              </Text>
            </TouchableOpacity>

            {/* Tab 3: Admin / HR */}
            <TouchableOpacity
              style={[
                styles.tabItem,
                activeTab === "admin_hr" && styles.tabItemActive,
              ]}
              onPress={() => handleTabChange("admin_hr")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="mail-outline"
                size={14}
                color={
                  activeTab === "admin_hr" ? COLORS.blue : COLORS.textMuted
                }
                style={styles.tabIcon}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "admin_hr" && styles.tabTextActive,
                ]}
                numberOfLines={1}
              >
                Admin/HR
              </Text>
            </TouchableOpacity>

            {/* Tab 4: Telecaller */}
            <TouchableOpacity
              style={[
                styles.tabItem,
                activeTab === "telecaller" && styles.tabItemActive,
              ]}
              onPress={() => handleTabChange("telecaller")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="headset-outline"
                size={14}
                color={
                  activeTab === "telecaller" ? COLORS.blue : COLORS.textMuted
                }
                style={styles.tabIcon}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "telecaller" && styles.tabTextActive,
                ]}
                numberOfLines={1}
              >
                Telecaller
              </Text>
            </TouchableOpacity>
          </View>

          {/* Dynamic Tab Heading */}
          <Text style={styles.formHeading}>
            {activeTab === "doctor" && "Doctor Clinical Sign In"}
            {activeTab === "reception" && "Branch Receptionist Login"}
            {activeTab === "admin_hr" && "Admin & HR Management Sign In"}
            {activeTab === "telecaller" && "Telecaller & Calling Desk Login"}
          </Text>

          {/* Form Body */}
          {activeTab === "admin_hr" ? (
            /* Admin & HR: Username / ID & Password */
            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-circle-outline"
                  size={20}
                  color={COLORS.blue}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Username ('admin' or 'hr')"
                  placeholderTextColor={COLORS.textLight}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>

              <View style={[styles.inputWrapper, { marginTop: 12 }]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={19}
                  color={COLORS.blue}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder="Password ('admin@123' or 'hr@123')"
                  placeholderTextColor={COLORS.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={19}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleAdminHrLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Sign In to Management
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : step === "INPUT" ? (
            /* Step 1: Mobile Number Input */
            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="call-outline"
                  size={19}
                  color={COLORS.blue}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder={
                    activeTab === "doctor"
                      ? "Doctor Mobile (e.g. 8125260176)"
                      : activeTab === "reception"
                      ? "Reception Phone (e.g. 9030176176)"
                      : "Telecaller Mobile Number"
                  }
                  placeholderTextColor={COLORS.textLight}
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSendOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Send Verification OTP
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* Step 2: OTP Verification */
            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={19}
                  color={COLORS.blue}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter 4-digit OTP"
                  placeholderTextColor={COLORS.textLight}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              {/* Countdown Timer */}
              <View style={styles.timerRow}>
                <Text style={styles.timerLabel}>
                  OTP expires in{" "}
                  <Text style={styles.timerValue}>
                    {timer > 0 ? `${timer}s` : "Expired"}
                  </Text>
                </Text>
                {timer === 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setTimer(30);
                      Alert.alert("New OTP Sent", "Code is 1234");
                    }}
                  >
                    <Text style={styles.resendText}>Resend OTP</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleVerifyOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify &amp; Sign In</Text>
                )}
              </TouchableOpacity>

              {/* Change Mobile Number Link */}
              <TouchableOpacity
                style={styles.changePhoneButton}
                onPress={() => setStep("INPUT")}
              >
                <Text style={styles.changePhoneText}>Change Mobile Number</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Access Note at bottom of card */}
          <View style={styles.accessNoteContainer}>
            <Text style={styles.accessNoteTitle}>LOGIN ACCOUNTS ACCESS:</Text>
            <Text style={styles.accessNoteItem}>
              • Doctor, Staff &amp; Reception: Mobile Number OTP
            </Text>
            <Text style={styles.accessNoteItem}>
              • Admin &amp; HR: Email &amp; Password Sign In
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.pageBg,
  },
  scrollContent: {
    paddingHorizontal: 18,
    justifyContent: "center",
    flexGrow: 1,
  },
  brandingContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  brandingContainerCompact: {
    alignItems: "center",
    marginBottom: 10,
    marginTop: 2,
  },
  logo: {
    width: 140,
    height: 60,
    marginBottom: 10,
  },
  logoCompact: {
    width: 90,
    height: 38,
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.textDark,
    textAlign: "center",
  },
  mainTitleCompact: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textDark,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: "center",
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#eef2f6",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.tabContainerBg,
    borderRadius: 14,
    padding: 3,
    alignItems: "center",
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 11,
  },
  tabItemActive: {
    backgroundColor: COLORS.white,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabIcon: {
    marginRight: 4,
  },
  tabText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textMuted,
    textAlign: "center",
  },
  tabTextActive: {
    color: COLORS.blue,
    fontWeight: "700",
  },
  formHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textDark,
    textAlign: "center",
    marginTop: 22,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.white,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
  },
  eyeButton: {
    padding: 6,
  },
  timerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
    gap: 8,
  },
  timerLabel: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: "500",
  },
  timerValue: {
    color: COLORS.timerRed,
    fontWeight: "700",
  },
  resendText: {
    fontSize: 13,
    color: COLORS.blue,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  primaryButton: {
    backgroundColor: COLORS.blue,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },
  changePhoneButton: {
    alignItems: "center",
    marginTop: 14,
    paddingVertical: 4,
  },
  changePhoneText: {
    color: COLORS.blue,
    fontSize: 14,
    fontWeight: "600",
  },
  accessNoteContainer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  accessNoteTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textLight,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  accessNoteItem: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
});
