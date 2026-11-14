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

    setLoading(true);
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
        if (validatedData?.branch?.name) {
          localStorage.setItem("branch_name", validatedData.branch.name);
          localStorage.setItem("branch_id", validatedData.branch.id || "");
        }
        window.location.href = "/reception/dashboard";
      } else if (returnedRole === "TELECALLER") {
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
          </form>
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
                      placeholder="Enter 4-digit code (e.g. 1234)"
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
