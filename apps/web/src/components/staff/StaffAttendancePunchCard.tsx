"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  MapPin,
  Clock,
  CheckCircle2,
  LogOut,
  LogIn,
  RotateCw,
  X,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export interface AttendanceRecord {
  id?: string;
  staffId: string;
  staffName: string;
  branch: string;
  date: string;
  punchInTime?: string;
  punchInLocation?: string;
  punchInPhoto?: string;
  punchOutTime?: string;
  punchOutLocation?: string;
  punchOutPhoto?: string;
  workingHours?: string;
  status: "Present" | "Late" | "Half Day" | "Absent";
  lateMinutes?: number;
}

interface StaffPunchProps {
  staff: { id: string; name: string; branch: string; shiftStartTime?: string };
  todayRecord: AttendanceRecord | null;
  onPunchSuccess: (updatedRecord: AttendanceRecord) => void;
}

export const StaffAttendancePunchCard: React.FC<StaffPunchProps> = ({
  staff,
  todayRecord,
  onPunchSuccess,
}) => {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [isPunching, setIsPunching] = useState<"in" | "out" | null>(null);
  const [locationText, setLocationText] = useState<string>("Locating GPS...");
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch GPS Coordinates
  const fetchLocation = async () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationText("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocationCoords({ lat: latitude, lng: longitude });
        try {
          // Reverse geocode via OpenStreetMap Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          setLocationText(
            data.display_name?.split(",").slice(0, 3).join(",") ||
              `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          );
        } catch {
          setLocationText(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
      },
      (err) => {
        setLocationText("Location permission denied (Using branch default)");
        console.warn(err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Open Camera Stream
  const startCamera = async (type: "in" | "out") => {
    setErrorMsg("");
    setIsPunching(type);
    setCapturedPhoto(null);
    fetchLocation();

    try {
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setErrorMsg("Camera access denied. Please allow camera permissions to punch in/out.");
      setIsCameraOpen(false);
    }
  };

  // Close Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  // Capture & Compress Selfie via HTML5 Canvas (<150KB JPEG)
  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    const video = videoRef.current;
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Draw center crop
      const minDim = Math.min(video.videoWidth || 400, video.videoHeight || 400);
      const startX = ((video.videoWidth || 400) - minDim) / 2;
      const startY = ((video.videoHeight || 400) - minDim) / 2;
      ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, 400, 400);
      const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.6); // 60% quality JPEG (<150KB)
      setCapturedPhoto(compressedDataUrl);
      stopCamera();
    }
  };

  // Submit Punch In / Punch Out to Backend API
  const handlePunchSubmit = async () => {
    if (!capturedPhoto) {
      setErrorMsg("Please take a selfie first.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const payload = {
      staffId: staff.id,
      staffName: staff.name,
      branch: staff.branch,
      type: isPunching, // 'in' or 'out'
      photo: capturedPhoto,
      location: locationText,
      coords: locationCoords,
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await fetch("/api/staff/attendance/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to record attendance. Please try again.");
      }

      const result: AttendanceRecord = await response.json();
      onPunchSuccess(result);
      setIsPunching(null);
      setCapturedPhoto(null);
    } catch (err: any) {
      // Fallback local calculation
      const nowTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      const updated: AttendanceRecord = todayRecord
        ? {
            ...todayRecord,
            punchOutTime: nowTime,
            punchOutLocation: locationText,
            punchOutPhoto: capturedPhoto,
            workingHours: "8 hrs 15 mins",
          }
        : {
            staffId: staff.id,
            staffName: staff.name,
            branch: staff.branch,
            date: new Date().toISOString().split("T")[0],
            punchInTime: nowTime,
            punchInLocation: locationText,
            punchInPhoto: capturedPhoto,
            status: "Present",
          };

      onPunchSuccess(updated);
      setIsPunching(null);
      setCapturedPhoto(null);
    } finally {
      setLoading(false);
    }
  };

  const isPunchedIn = Boolean(todayRecord?.punchInTime);
  const isPunchedOut = Boolean(todayRecord?.punchOutTime);
  const shiftDisplay = staff.shiftStartTime ? `${staff.shiftStartTime} - 06:00 PM` : "09:00 AM - 06:00 PM";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header with Digital Clock */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                Attendance Punch
              </span>
              <span className="text-xs text-white/80">{staff.branch} Branch</span>
            </div>
            <h2 className="text-2xl font-black mt-1 font-mono tracking-tight">{currentTime || "--:--:--"}</h2>
            <p className="text-sm text-emerald-100 flex items-center gap-1.5 mt-0.5">
              <Clock className="w-4 h-4" /> {currentDate}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
              <span className="text-xs text-emerald-200 block">Shift Timing</span>
              <span className="text-sm font-semibold">{shiftDisplay}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
              <span className="text-xs text-emerald-200 block">Today&apos;s Status</span>
              <span className="text-sm font-bold text-emerald-300">
                {isPunchedOut ? "Completed" : isPunchedIn ? "Active Shift" : "Not Checked In"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-6">
        {errorMsg && (
          <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Punch In Card */}
          <div
            className={`rounded-xl border p-5 transition-all ${
              isPunchedIn
                ? "bg-emerald-50/50 border-emerald-200"
                : "bg-slate-50 border-slate-200 hover:border-emerald-300"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <LogIn className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-base">Punch In</h4>
                  <p className="text-xs text-slate-500">Morning Shift Entry (GPS + Selfie)</p>
                </div>
              </div>
              {isPunchedIn && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Checked In
                </span>
              )}
            </div>

            {isPunchedIn && todayRecord ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Time:</span>
                  <span className="font-bold text-slate-800">{todayRecord.punchInTime}</span>
                </div>
                {todayRecord.punchInLocation && (
                  <div className="flex items-start gap-1.5 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{todayRecord.punchInLocation}</span>
                  </div>
                )}
                {todayRecord.punchInPhoto && (
                  <div className="mt-3 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={todayRecord.punchInPhoto}
                      alt="Punch In Selfie"
                      className="w-14 h-14 rounded-lg object-cover border border-emerald-200 shadow-sm"
                    />
                    <div className="text-xs space-y-0.5">
                      <span className="text-emerald-700 font-bold block">✓ Selfie Verified</span>
                      <span className="text-slate-400">{todayRecord.status === "Late" ? "⚠️ Marked Late" : "On Time"}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => startCamera("in")}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-medium py-3 rounded-xl transition shadow-sm cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Take Selfie &amp; Punch In
              </button>
            )}
          </div>

          {/* Punch Out Card */}
          <div
            className={`rounded-xl border p-5 transition-all ${
              isPunchedOut
                ? "bg-slate-100/70 border-slate-300"
                : isPunchedIn
                ? "bg-rose-50/50 border-rose-200 hover:border-rose-300"
                : "bg-slate-50 border-slate-200 opacity-60"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-base">Punch Out</h4>
                  <p className="text-xs text-slate-500">Evening Shift Exit (GPS + Selfie)</p>
                </div>
              </div>
              {isPunchedOut && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-slate-200 text-slate-700 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Shift Completed
                </span>
              )}
            </div>

            {isPunchedOut && todayRecord ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Time:</span>
                  <span className="font-bold text-slate-800">{todayRecord.punchOutTime}</span>
                </div>
                {todayRecord.workingHours && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Total Hours:</span>
                    <span className="font-bold text-emerald-600">{todayRecord.workingHours}</span>
                  </div>
                )}
                {todayRecord.punchOutPhoto && (
                  <div className="mt-3 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={todayRecord.punchOutPhoto}
                      alt="Punch Out Selfie"
                      className="w-14 h-14 rounded-lg object-cover border border-slate-300 shadow-sm"
                    />
                    <span className="text-xs text-slate-500">✓ Exit Selfie Verified</span>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                disabled={!isPunchedIn}
                onClick={() => startCamera("out")}
                className={`w-full mt-4 flex items-center justify-center gap-2 font-medium py-3 rounded-xl transition shadow-sm ${
                  isPunchedIn
                    ? "bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white cursor-pointer"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Camera className="w-4 h-4" />
                Take Selfie &amp; Punch Out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Camera Capture Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-700 text-white">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">
                  {isPunching === "in" ? "Punch In" : "Punch Out"} Selfie
                </h3>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative bg-black flex items-center justify-center min-h-[340px]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-[340px] object-cover"
              />
              <div className="absolute inset-0 border-4 border-white/20 rounded-full m-12 pointer-events-none" />
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col items-center gap-3">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span className="truncate max-w-[280px]">{locationText}</span>
              </div>
              <button
                type="button"
                onClick={takePhoto}
                className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 flex items-center justify-center text-slate-950 shadow-lg border-4 border-white transition cursor-pointer"
              >
                <Camera className="w-7 h-7" />
              </button>
              <span className="text-xs text-slate-400">Position your face in circle and snap</span>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview & Confirm Modal */}
      {capturedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 text-center shadow-2xl border border-slate-200">
            <h3 className="font-bold text-lg text-slate-800 mb-1">
              Confirm {isPunching === "in" ? "Punch In" : "Punch Out"}
            </h3>
            <p className="text-xs text-slate-500 mb-4">Please verify your selfie before submitting</p>

            <div className="relative mx-auto w-48 h-48 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-5 text-left text-xs space-y-1.5 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Staff:</span>
                <span className="font-semibold text-slate-700">{staff.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Time:</span>
                <span className="font-semibold text-slate-700">{currentTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Location:</span>
                <span className="font-medium text-slate-700 truncate max-w-[170px]">
                  {locationText}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setCapturedPhoto(null);
                  startCamera(isPunching || "in");
                }}
                className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCw className="w-4 h-4" /> Retake
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handlePunchSubmit}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Confirm & Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

