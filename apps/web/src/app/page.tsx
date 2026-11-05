"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    try {
      const role = localStorage.getItem("user_role")?.toUpperCase();
      switch (role) {
        case "RECEPTION":
          router.replace("/reception/dashboard");
          return;
        case "ADMIN":
          router.replace("/admin/dashboard");
          return;
        case "DOCTOR":
          router.replace("/doctor/dashboard");
          return;
        case "TELECALLER":
          router.replace("/telecaller/dashboard");
          return;
        default:
          router.replace("/login");
          return;
      }
    } catch {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#f8fafc]">
      <div className="w-8 h-8 border-3 border-[#0284c7] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
