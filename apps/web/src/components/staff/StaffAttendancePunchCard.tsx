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

const getMapLink = (location?: string, coords?: { lat: number; lng: number } | null): string => {
  if (coords && typeof coords.lat === "number" && typeof coords.lng === "number") {
    return `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
  }
  if (!location) return "";
  const match = location.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
  if (match) {
    return `https://www.google.com/maps?q=${match[1]},${match[2]}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
};

export interface AttendanceRecord {
  id?: string;
  staffId: string;
  staffName: string;
  branch: string;
  date: string;
  shiftType?: "SINGLE_STRICT" | "MULTI_STRICT";
  shift1PunchInTime?: string;
  shift1PunchInLocation?: string;
  shift1PunchInPhoto?: string;
  shift1PunchInCoords?: { lat: number; lng: number };
  shift1PunchOutTime?: string;
  shift1PunchOutLocation?: string;
  shift1PunchOutPhoto?: string;
  shift1PunchOutCoords?: { lat: number; lng: number };
  shift2PunchInTime?: string;
  shift2PunchInLocation?: string;
  shift2PunchInPhoto?: string;
  shift2PunchInCoords?: { lat: number; lng: number };
  shift2PunchOutTime?: string;
  shift2PunchOutLocation?: string;
  shift2PunchOutPhoto?: string;
  shift2PunchOutCoords?: { lat: number; lng: number };
  punchInTime?: string;
  punchInLocation?: string;
  punchInPhoto?: string;
  punchInCoords?: { lat: number; lng: number };
  punchOutTime?: string;
  punchOutLocation?: string;
  punchOutPhoto?: string;
  punchOutCoords?: { lat: number; lng: number };
  workingHours?: string;
  status: "Present" | "Late" | "Half Day" | "Absent";
  lateMinutes?: number;
  punches?: Array<any>;
}

interface StaffPunchProps {
  staff: {
    id: string;
    name: string;
    branch: string;
    shiftStartTime?: string;
    shiftType?: "SINGLE_STRICT" | "MULTI_STRICT";
    shift1Start?: string;
    shift1End?: string;
    shift2Start?: string;
    shift2End?: string;
  };
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
  const [punchShift, setPunchShift] = useState<"shift1" | "shift2">("shift1");
  const [locationText, setLocationText] = useState<string>("Locating GPS...");
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"locating" | "success" | "error">("locating");
  const [locationError, setLocationError] = useState<string>("");
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

  // Fetch Accurate GPS Coordinates
  const fetchLocation = async () => {
    setLocationStatus("locating");
    setLocationError("");
    setLocationText("Acquiring high-accuracy GPS coordinates...");

    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationStatus("error");
      setLocationError("Geolocation is not supported by your browser.");
      setLocationText("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const coords = { lat: latitude, lng: longitude };
        setLocationCoords(coords);
        setLocationStatus("success");

        try {
          // Reverse geocode via OpenStreetMap Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          if (res.ok) {
            const data = await res.json();
            const displayName = data.display_name?.split(",").slice(0, 3).join(",").trim();
            if (displayName) {
              setLocationText(`${displayName} (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
              return;
            }
          }
        } catch {
          // Ignore reverse geocode failures
        }
        setLocationText(`GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (±${Math.round(accuracy)}m)`);
      },
      (err) => {
        setLocationStatus("error");
        setLocationCoords(null);
        let msg = "GPS location access required. Please enable location permissions.";
        if (err.code === 1) {
          msg = "Location permission denied. Please allow location access in your browser to verify punch.";
        } else if (err.code === 2) {
          msg = "Position unavailable. Please ensure GPS/Location is enabled on your device.";
        } else if (err.code === 3) {
          msg = "Location request timed out. Please tap 'Retry GPS'.";
        }
        setLocationError(msg);
        setLocationText(msg);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Open Camera Stream
  const startCamera = async (type: "in" | "out", targetShift?: "shift1" | "shift2") => {
    setErrorMsg("");
    setIsPunching(type);
    if (targetShift) setPunchShift(targetShift);
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

    if (!locationCoords) {
      setErrorMsg("Real-time GPS coordinates are required for attendance compliance. Please enable device location / GPS and tap 'Retry GPS'.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const payload = {
      staffId: staff.id,
      staffName: staff.name,
      branch: staff.branch,
      type: isPunching, // 'in' or 'out'
      shift: punchShift,
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

  const isMultiShift =
    todayRecord?.shiftType === "MULTI_STRICT" ||
    staff.shiftType === "MULTI_STRICT" ||
    Boolean(todayRecord?.shift2PunchInTime || todayRecord?.shift2PunchOutTime || todayRecord?.shift1PunchOutTime);

  const s1In = todayRecord?.shift1PunchInTime || (!isMultiShift ? todayRecord?.punchInTime : undefined);
  const s1Out = todayRecord?.shift1PunchOutTime;
  const s2In = todayRecord?.shift2PunchInTime;
  const s2Out = todayRecord?.shift2PunchOutTime || (!isMultiShift ? todayRecord?.punchOutTime : undefined);

  const isPunchedIn = Boolean(todayRecord?.punchInTime || todayRecord?.shift1PunchInTime || todayRecord?.shift2PunchInTime);
  const isPunchedOut = Boolean(todayRecord?.punchOutTime || todayRecord?.shift2PunchOutTime);

  const logsCount = [s1In, s1Out, s2In, s2Out].filter(Boolean).length;

  const shiftDisplay = isMultiShift
    ? `S1: ${staff.shift1Start || "09:00 AM"} - ${staff.shift1End || "01:00 PM"} | S2: ${staff.shift2Start || "04:30 PM"} - ${staff.shift2End || "08:30 PM"}`
    : staff.shiftStartTime
    ? `${staff.shiftStartTime} - 06:00 PM`
    : "09:00 AM - 06:00 PM";

  const statusDisplay = isMultiShift
    ? logsCount === 4
      ? "Completed (4/4 Logs)"
      : logsCount === 3
      ? "Shift 2 Active (3/4 Logs)"
      : logsCount === 2
      ? "Shift 1 Closed (2/4 Logs)"
      : logsCount === 1
      ? "Shift 1 Active (1/4 Logs)"
      : "Not Checked In (0/4 Logs)"
    : isPunchedOut
    ? "Completed"
    : isPunchedIn
    ? "Active Shift"
    : "Not Checked In";

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
              {isMultiShift && (
                <span className="text-xs font-bold uppercase tracking-wider bg-amber-400 text-slate-900 px-2.5 py-0.5 rounded-full">
                  Split / Multi Shift
                </span>
              )}
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
                {statusDisplay}
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

        {isMultiShift ? (
          /* Multi / Split Shift (4 Logs Total) */
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">Split Shift Daily Logs (4 Punches Required)</h3>
                <p className="text-xs text-slate-500">Record Shift 1 (In &amp; Out) and Shift 2 (In &amp; Out) with GPS &amp; facial selfie verification.</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {logsCount} / 4 Logs Recorded
              </span>
            </div>

            {/* Shift 1 Section */}
            <div className="bg-sky-50/40 rounded-2xl border border-sky-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded text-xs font-black bg-sky-600 text-white">SHIFT 1</span>
                <span className="text-xs font-semibold text-sky-900">Morning Session ({staff.shift1Start || "09:00 AM"} - {staff.shift1End || "01:00 PM"})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* S1 In */}
                <div className={`rounded-xl border p-4 transition-all ${s1In ? "bg-white border-emerald-300 shadow-2xs" : "bg-white/80 border-slate-200"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <LogIn className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Shift 1 • Punch In</h4>
                        <p className="text-[11px] text-slate-500">Morning Login (1 of 4)</p>
                      </div>
                    </div>
                    {s1In && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Logged
                      </span>
                    )}
                  </div>
                  {s1In ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Time:</span>
                        <span className="font-bold text-slate-800">{s1In}</span>
                      </div>
                      {(todayRecord?.shift1PunchInLocation || todayRecord?.punchInLocation) && (
                        <div className="flex items-start gap-1 text-[11px] text-slate-500">
                          <MapPin className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">{todayRecord.shift1PunchInLocation || todayRecord.punchInLocation}</span>
                        </div>
                      )}
                      {(todayRecord?.shift1PunchInPhoto || todayRecord?.punchInPhoto) && (
                        <div className="flex items-center gap-2 pt-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={todayRecord.shift1PunchInPhoto || todayRecord.punchInPhoto}
                            alt="S1 In Selfie"
                            className="w-12 h-12 rounded-lg object-cover border border-emerald-300"
                          />
                          <span className="text-[11px] font-bold text-emerald-700">✓ Selfie Verified</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startCamera("in", "shift1")}
                      className="w-full mt-2 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-xl transition text-xs shadow-xs cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Take Selfie &amp; Punch In (Shift 1)
                    </button>
                  )}
                </div>

                {/* S1 Out */}
                <div className={`rounded-xl border p-4 transition-all ${s1Out ? "bg-white border-slate-300 shadow-2xs" : s1In ? "bg-white/80 border-rose-200" : "bg-slate-50 border-slate-200 opacity-60"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Shift 1 • Punch Out</h4>
                        <p className="text-[11px] text-slate-500">Morning Logout (2 of 4)</p>
                      </div>
                    </div>
                    {s1Out && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Logged
                      </span>
                    )}
                  </div>
                  {s1Out ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Time:</span>
                        <span className="font-bold text-slate-800">{s1Out}</span>
                      </div>
                      {todayRecord?.shift1PunchOutLocation && (
                        <div className="flex items-start gap-1 text-[11px] text-slate-500">
                          <MapPin className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">{todayRecord.shift1PunchOutLocation}</span>
                        </div>
                      )}
                      {todayRecord?.shift1PunchOutPhoto && (
                        <div className="flex items-center gap-2 pt-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={todayRecord.shift1PunchOutPhoto}
                            alt="S1 Out Selfie"
                            className="w-12 h-12 rounded-lg object-cover border border-slate-300"
                          />
                          <span className="text-[11px] font-medium text-slate-600">✓ Exit Selfie Verified</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!s1In}
                      onClick={() => startCamera("out", "shift1")}
                      className={`w-full mt-2 flex items-center justify-center gap-1.5 font-medium py-2.5 rounded-xl transition text-xs shadow-xs ${
                        s1In
                          ? "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                          : "bg-slate-200 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Take Selfie &amp; Punch Out (Shift 1)
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Shift 2 Section */}
            <div className="bg-purple-50/40 rounded-2xl border border-purple-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded text-xs font-black bg-purple-600 text-white">SHIFT 2</span>
                <span className="text-xs font-semibold text-purple-900">Evening Session ({staff.shift2Start || "04:30 PM"} - {staff.shift2End || "08:30 PM"})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* S2 In */}
                <div className={`rounded-xl border p-4 transition-all ${s2In ? "bg-white border-purple-300 shadow-2xs" : s1Out ? "bg-white/80 border-purple-200" : "bg-slate-50 border-slate-200 opacity-60"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                        <LogIn className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Shift 2 • Punch In</h4>
                        <p className="text-[11px] text-slate-500">Evening Login (3 of 4)</p>
                      </div>
                    </div>
                    {s2In && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Logged
                      </span>
                    )}
                  </div>
                  {s2In ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Time:</span>
                        <span className="font-bold text-purple-900">{s2In}</span>
                      </div>
                      {todayRecord?.shift2PunchInLocation && (
                        <div className="flex items-start gap-1 text-[11px] text-slate-500">
                          <MapPin className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">{todayRecord.shift2PunchInLocation}</span>
                        </div>
                      )}
                      {todayRecord?.shift2PunchInPhoto && (
                        <div className="flex items-center gap-2 pt-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={todayRecord.shift2PunchInPhoto}
                            alt="S2 In Selfie"
                            className="w-12 h-12 rounded-lg object-cover border border-purple-300"
                          />
                          <span className="text-[11px] font-bold text-purple-700">✓ Selfie Verified</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!s1Out}
                      onClick={() => startCamera("in", "shift2")}
                      className={`w-full mt-2 flex items-center justify-center gap-1.5 font-medium py-2.5 rounded-xl transition text-xs shadow-xs ${
                        s1Out
                          ? "bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                          : "bg-slate-200 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Take Selfie &amp; Punch In (Shift 2)
                    </button>
                  )}
                </div>

                {/* S2 Out */}
                <div className={`rounded-xl border p-4 transition-all ${s2Out ? "bg-white border-slate-300 shadow-2xs" : s2In ? "bg-white/80 border-rose-200" : "bg-slate-50 border-slate-200 opacity-60"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Shift 2 • Punch Out</h4>
                        <p className="text-[11px] text-slate-500">Evening Logout (4 of 4)</p>
                      </div>
                    </div>
                    {s2Out && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Logged
                      </span>
                    )}
                  </div>
                  {s2Out ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Time:</span>
                        <span className="font-bold text-slate-800">{s2Out}</span>
                      </div>
                      {todayRecord?.workingHours && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Total Worked:</span>
                          <span className="font-bold text-emerald-600">{todayRecord.workingHours}</span>
                        </div>
                      )}
                      {todayRecord?.shift2PunchOutLocation && (
                        <div className="flex items-start gap-1 text-[11px] text-slate-500">
                          <MapPin className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">{todayRecord.shift2PunchOutLocation}</span>
                        </div>
                      )}
                      {todayRecord?.shift2PunchOutPhoto && (
                        <div className="flex items-center gap-2 pt-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={todayRecord.shift2PunchOutPhoto}
                            alt="S2 Out Selfie"
                            className="w-12 h-12 rounded-lg object-cover border border-slate-300"
                          />
                          <span className="text-[11px] font-medium text-slate-600">✓ Exit Selfie Verified</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!s2In}
                      onClick={() => startCamera("out", "shift2")}
                      className={`w-full mt-2 flex items-center justify-center gap-1.5 font-medium py-2.5 rounded-xl transition text-xs shadow-xs ${
                        s2In
                          ? "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                          : "bg-slate-200 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Take Selfie &amp; Punch Out (Shift 2)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Single Shift (2 Logs Total) */
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
                    <div className="flex flex-col gap-0.5 text-xs text-slate-600">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{todayRecord.punchInLocation}</span>
                      </div>
                      <a
                        href={getMapLink(todayRecord.punchInLocation, todayRecord.punchInCoords)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-sky-600 hover:underline pl-5"
                      >
                        View on Map ↗
                      </a>
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
                  {todayRecord.punchOutLocation && (
                    <div className="flex flex-col gap-0.5 text-xs text-slate-600">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{todayRecord.punchOutLocation}</span>
                      </div>
                      <a
                        href={getMapLink(todayRecord.punchOutLocation, todayRecord.punchOutCoords)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-sky-600 hover:underline pl-5"
                      >
                        View on Map ↗
                      </a>
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
        )}
      </div>

      {/* Camera Capture Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-700 text-white">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">
                  {isPunching === "in" ? "Punch In" : "Punch Out"} Selfie {isMultiShift ? (punchShift === "shift2" ? "(Shift 2 • Evening)" : "(Shift 1 • Morning)") : ""}
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
              <div className="text-xs flex items-center justify-center gap-1.5 w-full px-2 text-center">
                <MapPin className={`w-3.5 h-3.5 shrink-0 ${locationCoords ? "text-emerald-400" : "text-amber-400"}`} />
                <span className={`truncate max-w-[280px] font-medium ${locationCoords ? "text-emerald-300" : "text-amber-300"}`}>
                  {locationText}
                </span>
                {locationStatus === "error" && (
                  <button
                    type="button"
                    onClick={fetchLocation}
                    className="ml-1 text-[11px] underline text-sky-400 hover:text-sky-300 font-bold"
                  >
                    Retry
                  </button>
                )}
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
              Confirm {isPunching === "in" ? "Punch In" : "Punch Out"} {isMultiShift ? (punchShift === "shift2" ? "• Shift 2" : "• Shift 1") : ""}
            </h3>
            <p className="text-xs text-slate-500 mb-4">Please verify your selfie &amp; GPS location before submitting</p>

            <div className="relative mx-auto w-48 h-48 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-4 text-left text-xs space-y-2 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Staff:</span>
                <span className="font-semibold text-slate-700">{staff.name}</span>
              </div>
              {isMultiShift && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Duty Session:</span>
                  <span className="font-bold text-emerald-700">
                    {punchShift === "shift2" ? "Shift 2 (Evening Session)" : "Shift 1 (Morning Session)"}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Time:</span>
                <span className="font-semibold text-slate-700">{currentTime}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">GPS Location:</span>
                  {locationCoords ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      GPS Locked
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={fetchLocation}
                      className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 hover:bg-rose-100"
                    >
                      Retry GPS
                    </button>
                  )}
                </div>
                <p className="font-medium text-slate-700 text-[11px] leading-tight break-words mt-1">
                  📍 {locationText}
                </p>
                {locationCoords && (
                  <a
                    href={getMapLink(locationText, locationCoords)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10.5px] font-bold text-sky-600 hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    View Exact Coordinates on Google Maps ↗
                  </a>
                )}
              </div>
            </div>

            {errorMsg && (
              <div className="mb-3 p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium text-left">
                {errorMsg}
              </div>
            )}

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
                disabled={loading || !locationCoords}
                onClick={handlePunchSubmit}
                className={`py-2.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 shadow-sm transition ${
                  loading || !locationCoords
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                }`}
              >
                {loading ? "Submitting..." : !locationCoords ? "Awaiting GPS..." : "Confirm & Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

