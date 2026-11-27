"use client";

import React, { useState, useEffect } from "react";
import { Phone, Mail, Headphones, ShieldCheck, Lock, Eye, EyeOff, AlertCircle, Stethoscope, Building2 } from "lucide-react";

type TabType = "doctor_reception" | "admin_hr" | "telecaller";

export default function WebLoginPage() {
  const [activeTab, setActiveTab] = useState<TabType>("doctor_reception");
  const [step, setStep] = useState<"INPUT" | "OTP">("INPUT");

  // Form states
  const [mobileNumber, setMobileNumber] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [validatedData, setValidatedData] = useState<any>(null);

  // Admin / HR Forgot & Change Password Modal State
  const [pwdModalMode, setPwdModalMode] = useState<null | "forgot" | "change">(null);
  const [pwdStep, setPwdStep] = useState<"EMAIL" | "VERIFY">("EMAIL");
  const [pwdEmail, setPwdEmail] = useState("");
  const [pwdCode, setPwdCode] = useState("");
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");

  // Check persistent session: if already logged in, redirect directly to role dashboard
  useEffect(() => {
    try {
      const role = localStorage.getItem("user_role")?.toUpperCase();
      if (role === "RECEPTION") {
        window.location.href = "/reception/dashboard";
      } else if (role === "ADMIN") {
        window.location.href = "/admin/dashboard";
      } else if (role === "DOCTOR") {
        window.location.href = "/doctor/dashboard";
      } else if (role === "TELECALLER") {
        window.location.href = "/telecaller/dashboard";
      } else if (role === "HR") {
        window.location.href = "/hr/dashboard";
      }
    } catch {}
  }, []);

  // OTP Countdown timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (step === "OTP" && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setStep("INPUT");
    setOtp("");
    setErrorMessage("");
    setValidatedData(null);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    const cleanNumber = mobileNumber.trim();
    if (!cleanNumber || cleanNumber.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);

    try {
      const roleToSend = activeTab === "doctor_reception" ? "DOCTOR_RECEPTION" : "TELECALLER";
      const res = await fetch("/api/auth/validate-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanNumber, role: roleToSend }),
      });

      const data = await res.json();
      if (!res.ok || !data.authorized) {
        setErrorMessage(
          data.error ||
            "Not Authorized: Please check your mobile number or contact clinic admin."
        );
        setLoading(false);
        return;
      }

      setValidatedData(data);

      if (data.branch) {
        localStorage.setItem("branch_id", data.branch.id);
        localStorage.setItem("branch_name", data.branch.name);
        localStorage.setItem("user_branch", data.branch.name);
        localStorage.setItem("user_assigned_branch", data.branch.name);
        localStorage.setItem("branch_phone", data.branch.phone);
      }

      if (data.doctor) {
        localStorage.setItem("doctor_id", data.doctor.id);
        localStorage.setItem("doctor_name", data.doctor.name);
        localStorage.setItem("branch_name", data.doctor.branch || "KPHB Branch");
        localStorage.setItem("is_head_doctor", String(Boolean(data.doctor.isHeadDoctor)));
        localStorage.setItem("doctor_category", data.doctor.doctorCategory || (data.doctor.isHeadDoctor ? "HEAD" : "EMPLOYEE"));
      }

      const otpRes = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanNumber }),
      });
      const otpData = await otpRes.json();
      if (!otpRes.ok || !otpData.success) {
        setErrorMessage(otpData.error || "Failed to send OTP. Please try again.");
        setLoading(false);
        return;
      }

      setStep("OTP");
      setTimer(120);
      setOtp("");
    } catch (err: any) {
      setErrorMessage("Network error: " + (err.message || "Failed to verify phone"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (!otp || otp.trim().length < 4) {
      setErrorMessage("Please enter the 4-digit verification code");
      return;
    }

    setLoading(true);
    try {
      const verifyRes = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: mobileNumber.trim(), otp: otp.trim() }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        setErrorMessage(verifyData.error || "Invalid or expired OTP.");
        setLoading(false);
        return;
      }
    } catch (err: any) {
      setErrorMessage("Network error: " + (err?.message || "Failed to verify OTP"));
      setLoading(false);
      return;
    }

    setTimeout(() => {
      setLoading(false);
      const returnedRole = (validatedData?.role || "").toUpperCase();

      if (returnedRole === "DOCTOR") {
        localStorage.setItem("user_role", "DOCTOR");
        if (validatedData?.doctor?.name) {
          localStorage.setItem("doctor_name", validatedData.doctor.name);
        }
        if (validatedData?.doctor?.isHeadDoctor !== undefined) {
          localStorage.setItem("is_head_doctor", String(Boolean(validatedData.doctor.isHeadDoctor)));
        }
        if (validatedData?.doctor?.doctorCategory) {
          localStorage.setItem("doctor_category", validatedData.doctor.doctorCategory);
        }
        if (validatedData?.doctor?.branch) {
          localStorage.setItem("branch_name", validatedData.doctor.branch);
        }
        window.location.href = "/doctor/dashboard";
      } else if (returnedRole === "RECEPTION") {
        localStorage.setItem("user_role", "RECEPTION");
        localStorage.removeItem("doctor_name");
        localStorage.removeItem("doctor_id");
        localStorage.removeItem("is_head_doctor");
        localStorage.removeItem("doctor_category");
        const bName = validatedData?.branch?.name || "Clinic Branch";
        if (validatedData?.branch?.name) {
          localStorage.setItem("branch_name", validatedData.branch.name);
          localStorage.setItem("branch_id", validatedData.branch.id || "");
        }

        // Record Reception Web Login Activity (12-hour IST)
        fetch("/api/auth/login-activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "LOGIN",
            userId: validatedData?.branch?.id || `rec-${mobileNumber}`,
            userName: `${bName} (Reception)`,
            userRole: "RECEPTION",
            phone: mobileNumber,
            branchName: bName,
            platform: "WEB",
            deviceInfo: navigator.userAgent || "Web Browser",
          }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.sessionId) localStorage.setItem("session_id", d.sessionId);
          })
          .catch(() => {});

        window.location.href = "/reception/dashboard";
      } else if (returnedRole === "TELECALLER") {
        localStorage.setItem("user_role", "TELECALLER");
        if (validatedData?.user) {
          localStorage.setItem("telecaller_id", validatedData.user.telecallerId || "TC01");
          localStorage.setItem("telecaller_name", validatedData.user.name || "Telecaller Staff");
          localStorage.setItem("branch_name", validatedData.user.branch || "All Branches");
        }
        window.location.href = "/telecaller/dashboard";
      } else {
        setErrorMessage("Unauthorized: Please sign in with your registered role.");
      }
    }, 400);
  };

  const handleAdminHrLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    const cleanEmail = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      setErrorMessage("Please enter both Email and Password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin-hr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "LOGIN",
          email: cleanEmail,
          password: cleanPass,
          platform: "WEB",
          deviceInfo: navigator.userAgent || "Web Browser",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Invalid email or password.");
        return;
      }

      const role = String(data.user?.role || "").toUpperCase();
      localStorage.setItem("user_role", role);
      if (data.sessionId) localStorage.setItem("session_id", data.sessionId);
      if (data.user?.email) localStorage.setItem("user_email", data.user.email);

      if (role === "ADMIN") {
        window.location.href = "/admin/dashboard";
      } else if (role === "HR") {
        window.location.href = "/hr/dashboard";
      } else {
        setErrorMessage("Unauthorized account role.");
      }
    } catch (err: any) {
      setErrorMessage("Network error: " + (err?.message || "Failed to sign in"));
    } finally {
      setLoading(false);
    }
  };

  const openPwdModal = (mode: "forgot" | "change") => {
    setPwdModalMode(mode);
    setPwdStep("EMAIL");
    setPwdEmail(username.trim());
    setPwdCode("");
    setPwdCurrent("");
    setPwdNew("");
    setPwdError("");
    setPwdSuccess("");
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");
    setPwdLoading(true);
    try {
      const res = await fetch("/api/auth/admin-hr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "FORGOT_PASSWORD", email: pwdEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPwdError(data.error || "Failed to send reset email.");
        return;
      }
      setPwdSuccess(data.message || "Reset code sent to your email.");
      setPwdStep("VERIFY");
    } catch (err: any) {
      setPwdError(err?.message || "Network error");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleConfirmResetOrChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");
    setPwdLoading(true);
    try {
      const payload =
        pwdModalMode === "forgot"
          ? {
              action: "RESET_PASSWORD",
              email: pwdEmail.trim(),
              code: pwdCode.trim(),
              newPassword: pwdNew,
            }
          : {
              action: "CHANGE_PASSWORD",
              email: pwdEmail.trim(),
              currentPassword: pwdCurrent,
              newPassword: pwdNew,
            };

      const res = await fetch("/api/auth/admin-hr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPwdError(data.error || "Failed to update password.");
        return;
      }
      setPwdSuccess(data.message || "Password updated successfully!");
      setTimeout(() => setPwdModalMode(null), 1500);
    } catch (err: any) {
      setPwdError(err?.message || "Network error");
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#edf4f9] via-[#f1f6fa] to-[#e7f0f7]">
      {/* Centered White Card */}
      <div className="w-full max-w-[450px] bg-white rounded-3xl p-8 sm:p-9 shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-slate-100">
        
        {/* Header Branding */}
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            Spiritual Homeopathy
          </h1>
          <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-1">
            Doctor, Reception, Admin, HR &amp; Telecaller Portal
          </p>
        </div>

        {/* Segmented 3 Tabs (Doctor / Reception, Admin / HR, Telecaller) */}
        <div className="bg-[#f1f5f9] p-1 rounded-xl flex items-center justify-between gap-1 mt-6">
          {/* Tab 1: Doctor / Reception */}
          <button
            type="button"
            onClick={() => handleTabChange("doctor_reception")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-[11.5px] font-semibold transition-all ${
              activeTab === "doctor_reception"
                ? "bg-white text-[#268ec8] shadow-sm font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5 shrink-0" />
            <span>Doctor / Reception</span>
          </button>

          {/* Tab 2: Admin / HR */}
          <button
            type="button"
            onClick={() => handleTabChange("admin_hr")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "admin_hr"
                ? "bg-white text-[#268ec8] shadow-sm font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span>Admin / HR</span>
          </button>

          {/* Tab 3: Telecaller */}
          <button
            type="button"
            onClick={() => handleTabChange("telecaller")}
            className={`flex-1 flex items-center justify-center gap-1 py-2 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "telecaller"
                ? "bg-white text-[#268ec8] shadow-sm font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Headphones className="w-3.5 h-3.5 shrink-0" />
            <span>Telecaller</span>
          </button>
        </div>

        {/* Error Alert Message */}
        {errorMessage ? (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {/* Dynamic Form Content */}
        {activeTab === "admin_hr" ? (
          <>
          {/* Admin / HR Form (Email & Password) */}
          <form onSubmit={handleAdminHrLogin} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Admin / HR Email
              </label>
              <div className="flex items-center bg-[#f0f6fc] border border-blue-100 rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-[#268ec8] focus-within:border-transparent transition-all">
                <Mail className="w-4 h-4 text-[#268ec8] mr-2.5 shrink-0" />
                <input
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter registered Admin or HR email"
                  className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="flex items-center bg-[#f0f6fc] border border-blue-100 rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-[#268ec8] focus-within:border-transparent transition-all">
                <Lock className="w-4 h-4 text-[#268ec8] mr-2.5 shrink-0" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 transition-colors ml-2 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#268ec8] hover:bg-[#1f75a6] text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In to Admin/HR Portal</span>
              )}
            </button>

            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => openPwdModal("forgot")}
                className="text-[#268ec8] hover:underline font-semibold cursor-pointer"
              >
                Forgot Password? (Email)
              </button>
              <button
                type="button"
                onClick={() => openPwdModal("change")}
                className="text-slate-600 hover:text-[#268ec8] hover:underline font-semibold cursor-pointer"
              >
                Change Password
              </button>
            </div>
          </form>

          {pwdModalMode && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900">
                    {pwdModalMode === "forgot" ? "Forgot Password (via Email)" : "Change Admin / HR Password"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setPwdModalMode(null)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {pwdError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {pwdError}
                  </div>
                )}
                {pwdSuccess && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                    {pwdSuccess}
                  </div>
                )}

                {pwdModalMode === "forgot" && pwdStep === "EMAIL" ? (
                  <form onSubmit={handleSendResetEmail} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Registered Admin / HR Email
                      </label>
                      <input
                        type="email"
                        value={pwdEmail}
                        onChange={(e) => setPwdEmail(e.target.value)}
                        placeholder="support@spiritualhomeo.com"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={pwdLoading}
                      className="w-full bg-[#268ec8] hover:bg-[#1f75a6] text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-60 cursor-pointer"
                    >
                      {pwdLoading ? "Sending Email..." : "Send Reset Code to Email"}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleConfirmResetOrChange} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Registered Admin / HR Email
                      </label>
                      <input
                        type="email"
                        value={pwdEmail}
                        onChange={(e) => setPwdEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800"
                        required
                      />
                    </div>

                    {pwdModalMode === "forgot" ? (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          6-Digit Email Verification Code
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={pwdCode}
                          onChange={(e) => setPwdCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="Enter 6-digit code"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 tracking-widest"
                          required
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={pwdCurrent}
                          onChange={(e) => setPwdCurrent(e.target.value)}
                          placeholder="Enter current password"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        New Password (min 6 characters)
                      </label>
                      <input
                        type="password"
                        value={pwdNew}
                        onChange={(e) => setPwdNew(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={pwdLoading}
                      className="w-full bg-[#268ec8] hover:bg-[#1f75a6] text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-60 cursor-pointer"
                    >
                      {pwdLoading ? "Updating..." : "Update Password"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
          </>
        ) : (
          /* Phone + OTP Form for Doctor / Reception or Telecaller */
          <div className="mt-5">
            {step === "INPUT" ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {activeTab === "doctor_reception"
                      ? "Doctor or Reception Mobile Number"
                      : "Telecaller Mobile Number"}
                  </label>
                  <div className="flex items-center bg-[#f0f6fc] border border-blue-100 rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-[#268ec8] focus-within:border-transparent transition-all">
                    <span className="text-sm font-semibold text-slate-500 mr-2 border-r border-slate-300 pr-2">
                      +91
                    </span>
                    <Phone className="w-4 h-4 text-[#268ec8] mr-2 shrink-0" />
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10-digit registered number"
                      className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none tracking-wide"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    {activeTab === "doctor_reception"
                      ? "Both Doctors and Reception branch numbers can sign in here."
                      : "Enter your registered telecaller phone number."}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-[#268ec8] hover:bg-[#1f75a6] text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying Phone...</span>
                    </>
                  ) : (
                    <span>Send Verification Code</span>
                  )}
                </button>
              </form>
            ) : (
              /* Step 2: OTP Verification */
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Enter 4-Digit Verification Code
                    </label>
                    <button
                      type="button"
                      onClick={() => setStep("INPUT")}
                      className="text-xs text-[#268ec8] hover:underline font-medium cursor-pointer"
                    >
                      Change Number
                    </button>
                  </div>

                  <div className="flex items-center bg-[#f0f6fc] border border-blue-100 rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-[#268ec8] focus-within:border-transparent transition-all">
                    <ShieldCheck className="w-4 h-4 text-[#268ec8] mr-2.5 shrink-0" />
                    <input
                      type="text"
                      maxLength={4}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="Enter 4-digit OTP"
                      className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none tracking-widest font-semibold"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-slate-400">
                      Code sent to <b className="text-slate-600">+91 {mobileNumber}</b>
                    </span>
                    {timer > 0 ? (
                      <span className="text-slate-400">Resend in {timer}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="text-[#268ec8] hover:underline font-semibold cursor-pointer"
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-[#268ec8] hover:bg-[#1f75a6] text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <span>Verify &amp; Sign In</span>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            Secure Clinic Management System • Spiritual Homeopathy
          </p>
        </div>
      </div>
    </div>
  );
}
