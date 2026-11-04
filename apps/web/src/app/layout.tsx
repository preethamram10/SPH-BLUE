import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spiritual Homeopathy - Clinic Administration",
  description: "Hospital & Clinic ERP Management Portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased font-sans">
      <body className="min-h-full flex flex-col bg-[#f8fafc] text-slate-800">
        {children}
      </body>
    </html>
  );
}
