"use client";

import React, { useState, useEffect } from "react";
import { Phone, Mail, Headphones, ShieldCheck, Lock, Eye, EyeOff, AlertCircle, Stethoscope, Building2 } from "lucide-react";

type TabType = "doctor" | "reception" | "admin_hr" | "telecaller";

export default function WebLoginPage() {
  const [activeTab, setActiveTab] = useState<TabType>("doctor");
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
      const roleToSend = activeTab === "doctor" ? "DOCTOR" : activeTab === "reception" ? "RECEPTION" : "TELECALLER";
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
      }

      setStep("OTP");
      setTimer(30);
      setOtp("1234"); // Auto-fill demo OTP
    } catch (err: any) {
      setErrorMessage("Network error: " + (err.message || "Failed to verify phone"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (!otp) {
      setErrorMessage("Please enter the verification code");
      return;
    }

    const expectedRole = activeTab === "doctor" ? "DOCTOR" : activeTab === "reception" ? "RECEPTION" : "TELECALLER";
    if (validatedData?.role && validatedData.role !== expectedRole) {
      setErrorMessage(`Role Mismatch: You are not authorized to log in as ${expectedRole}.`);
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (activeTab === "doctor" && validatedData?.role === "DOCTOR") {
        localStorage.setItem("user_role", "DOCTOR");
        if (validatedData?.doctor?.name) {
          localStorage.setItem("doctor_name", validatedData.doctor.name);
        }
        window.location.href = "/doctor/dashboard";
      } else if (activeTab === "reception" && validatedData?.role === "RECEPTION") {
        localStorage.setItem("user_role", "RECEPTION");
        window.location.href = "/reception/dashboard";
      } else if (activeTab === "telecaller" && validatedData?.role === "TELECALLER") {
        localStorage.setItem("user_role", "TELECALLER");
        window.location.href = "/telecaller/dashboard";
      } else {
        setErrorMessage("Unauthorized: Please sign in with your registered role.");
      }
    }, 400);
  };

  const handleAdminHrLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMessage("Please enter both Username/ID and Password.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);

      // 1. Admin Verification
      if (cleanUser === "admin" && cleanPass === "admin@123") {
        localStorage.setItem("user_role", "ADMIN");
        window.location.href = "/admin/dashboard";
        return;
      }

      // 2. HR Verification
      if (cleanUser === "hr" && cleanPass === "hr@123") {
        localStorage.setItem("user_role", "HR");
        window.location.href = "/hr/dashboard";
        return;
      }

      // 3. Invalid credentials
      setErrorMessage("Invalid credentials. For Admin use: admin / admin@123. For HR use: hr / hr@123.");
    }, 400);
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
            Doctor, Staff, HR, Reception, Admin &amp; Telecaller Portal
          </p>
        </div>
        {/* Segmented 4 Tabs (Doctor, Reception, Admin / HR, Telecaller) */}
        <div className="bg-[#f1f5f9] p-1 rounded-xl flex items-center justify-between gap-1 mt-6">
          {/* Tab 1: Doctor */}
          <button
            type="button"
            onClick={() => handleTabChange("doctor")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "doctor"
                ? "bg-white text-[#268ec8] shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5 shrink-0" />
            <span>Doctor</span>
          </button>
          {/* Tab 2: Reception */}
          <button
            type="button"
            onClick={() => handleTabChange("reception")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "reception"
                ? "bg-white text-[#268ec8] shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span>Reception</span>
          </button>
          {/* Tab 3: Admin / HR */}
          <button
            type="button"
            onClick={() => handleTabChange("admin_hr")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "admin_hr"
                ? "bg-white text-[#268ec8] shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span>Admin/HR</span>
          </button>
          {/* Tab 4: Telecaller */}
          <button
            type="button"
            onClick={() => handleTabChange("telecaller")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "telecaller"
                ? "bg-white text-[#268ec8] shadow-sm"
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
          /* Admin / HR Form (Username / ID & Password) */
          <form onSubmit={handleAdminHrLogin} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username / Official ID
              </label>
              <div className="flex items-center bg-[#f0f6fc] border border-blue-100 rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-[#268ec8] focus-within:border-transparent transition-all">
                <Mail className="w-4 h-4 text-[#268ec8] mr-2.5 shrink-0" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter 'admin' or 'hr'"
                  className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 placeholder:text-xs outline-none"
                  autoCapitalize="none"
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
                  placeholder="admin@123 or hr@123"
                  className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 placeholder:text-xs outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 transition-colors ml-1.5"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#268ec8] hover:bg-[#1f7bb0] text-white font-medium text-sm py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
            >
              <ShieldCheck className="w-4 h-4" />
              {loading ? "Authenticating..." : "Sign In to Management Portal"}
            </button>
          </form>
        ) : step === "INPUT" ? (
          /* Step 1: Mobile Number Input */
          <form onSubmit={handleSendOtp} className="mt-5">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {activeTab === "doctor"
                ? "Doctor Registered Mobile Number"
                : activeTab === "reception"
                ? "Branch Reception Contact Number"
                : "Telecaller Mobile Number"}
            </label>

            <div className="flex items-center bg-[#f0f6fc] border border-blue-100 rounded-xl px-3.5 py-3 focus-within:ring-2 focus-within:ring-[#268ec8] focus-within:border-transparent transition-all">
              <Phone className="w-4 h-4 text-[#268ec8] mr-2.5 shrink-0" />
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder={
                  activeTab === "doctor"
                    ? "e.g. 8125260176 (Dr. Prashanth)"
                    : activeTab === "reception"
                    ? "e.g. 9030176176 (KPHB Branch)"
                    : "Enter telecaller mobile"
                }
                className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 placeholder:text-xs outline-none"
                maxLength={10}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#268ec8] hover:bg-[#1f7bb0] text-white font-medium text-sm py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mt-5"
            >
              <ShieldCheck className="w-4 h-4" />
              {loading ? "Sending OTP..." : "Send Verification OTP"}
            </button>
          </form>
        ) : (
          /* Step 2: OTP Verification */
          <form onSubmit={handleVerifyOtp} className="mt-5">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Enter Verification Code
            </label>

            <div className="flex items-center bg-[#f0f6fc] border border-blue-100 rounded-xl px-3.5 py-3 focus-within:ring-2 focus-within:ring-[#268ec8] focus-within:border-transparent transition-all">
              <Lock className="w-4 h-4 text-[#268ec8] mr-2.5 shrink-0" />
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 4-digit OTP"
                className="w-full bg-transparent text-sm text-slate-800 font-semibold tracking-widest placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 placeholder:text-xs outline-none"
                maxLength={6}
                required
              />
            </div>

            {/* Timer countdown */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-600 mt-3 font-medium">
              <span>
                OTP expires in{" "}
                <span className="text-rose-500 font-bold">
                  {timer > 0 ? `${timer}s` : "Expired"}
                </span>
              </span>
              {timer === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setTimer(30);
                    setOtp("1234");
                  }}
                  className="text-[#268ec8] font-bold underline ml-1"
                >
                  Resend OTP
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#268ec8] hover:bg-[#1f7bb0] text-white font-medium text-sm py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mt-4"
            >
              <ShieldCheck className="w-4 h-4" />
              {loading ? "Verifying..." : "Verify & Sign In"}
            </button>

            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => setStep("INPUT")}
                className="text-xs text-[#268ec8] hover:underline font-semibold"
              >
                Change Mobile Number
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
