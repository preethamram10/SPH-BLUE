"use client";

import React from "react";
import { Printer, X, Pill } from "lucide-react";
import {
  MedicineRequest,
  generateMedicineRequestPDF,
  getBranchPhone,
} from "./generateMedicineRequestPDF";

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: MedicineRequest;
}

export const MedicineRequestPDFPreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  request,
}) => {
  if (!isOpen) return null;

  const formattedDate = new Date().toLocaleDateString("en-GB");
  const branchPhone = (request as any).receptionPhone || getBranchPhone(request.branchName);
  const totalAmt = Number(request.totalAmount) || 0;
  const isDrSalutation = (request.gender || "").toLowerCase().startsWith("dr");
  const cleanPatName = isDrSalutation
    ? (request.patientName || "").replace(/^dr\.?\s+/i, "")
    : request.patientName || "";
  const displayPatName = `${request.gender || "MR."} ${cleanPatName}`.trim();

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Control Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Pill className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="font-bold text-sm">Medicine Request Certificate Preview</h3>
              <p className="text-[11px] text-slate-400">
                Official A4 Letterhead Format • Spiritual Homeopathy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => generateMedicineRequestPDF(request)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Generate &amp; Print PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Certificate Paper Simulation (A4 Aspect Ratio) */}
        <div className="p-6 overflow-y-auto bg-slate-100/80 flex justify-center">
          <div className="w-full max-w-[650px] bg-white shadow-lg border border-slate-200 rounded-lg overflow-hidden text-slate-900 font-sans flex flex-col justify-between min-h-[750px]">
            {/* Top Blue Header */}
            <div className="bg-[#1d8ecd] h-14 px-4 flex items-center justify-between text-white">
              <div className="bg-white text-sky-700 px-3 py-1 rounded shadow-xs">
                <span className="font-extrabold text-xs tracking-tight">Spiritual Homeopathy</span>
              </div>
              <span className="text-[11px] font-bold tracking-wider uppercase">
                spiritualhomeoclinic.com
              </span>
            </div>

            {/* Certificate Body */}
            <div className="p-8 flex-1 text-xs leading-relaxed space-y-4">
              <div className="text-right font-bold text-slate-800 text-[11px]">
                DATE: {formattedDate}
              </div>

              <div className="text-center font-extrabold text-sm tracking-wider uppercase underline underline-offset-4 text-slate-900 pt-2 pb-3">
                TO WHOM SO EVER IT MAY CONCERN
              </div>

              <p className="text-slate-700 leading-6 text-justify">
                THIS IS TO CERTIFY THAT{" "}
                <strong className="text-slate-900 uppercase">
                  {displayPatName}
                </strong>
                {request.age ? (
                  <span>
                    {" "}
                    AGED ABOUT <strong className="text-slate-900">{request.age} YEARS</strong>,
                  </span>
                ) : null}{" "}
                HAS BEEN UNDER OUR TREATMENT AT SPIRITUAL HOMEOPATHY.
              </p>

              <p className="text-slate-700 leading-6 text-justify">
                {request.duration && (
                  <span>
                    THE PATIENT NEEDED TO TAKE HOMEOPATHY MEDICINE FOR{" "}
                    <strong className="text-slate-900 uppercase">{request.duration}</strong>.{" "}
                  </span>
                )}
                WE RECOMMENDED THAT{" "}
                <strong className="text-slate-900 uppercase">
                  {displayPatName}
                </strong>{" "}
                CONTINUES TO FOLLOW THE PRESCRIBED MEDICATIONS.
              </p>

              {request.notes && request.notes.trim() ? (
                <div className="pt-3 text-[11.5px] text-slate-800 whitespace-pre-wrap leading-relaxed font-medium">
                  {request.notes.trim()}
                </div>
              ) : null}

              {/* Prescribed Remedies Table */}
              <div className="pt-4">
                <div className="flex items-center justify-between border-b-2 border-slate-200 pb-1 mb-2">
                  <span className="font-extrabold text-[#1d8ecd] uppercase tracking-wide text-xs">
                    Prescribed Medicines
                  </span>
                  {totalAmt > 0 && (
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                      Total Fee: ₹{totalAmt.toFixed(2)}
                    </span>
                  )}
                </div>

                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                      <th className="py-2 px-2 text-center w-8">#</th>
                      <th className="py-2 px-3">Remedy Name</th>
                      <th className="py-2 px-3 text-center">Type</th>
                      <th className="py-2 px-3">Dosage &amp; Timing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {(request.medicines || []).map((m, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">{m.name}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded text-[10px] font-semibold border border-sky-200">
                            {m.type || "Pills"}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600 font-medium">{m.timing}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-8 text-center text-[10px] text-slate-400 italic border-t border-dashed border-slate-200">
                This is a computer-generated document. No physical signature required.
              </div>
            </div>

            {/* Bottom Green Footer */}
            <div className="bg-[#a3cf3b] h-10 px-4 flex items-center justify-around text-white text-[10px] font-bold tracking-wide uppercase">
              <span>📞 {branchPhone}</span>
              <span>•</span>
              <span>✉️ support@spiritualhomeo.com</span>
              <span>•</span>
              <span>📍 {request.branchName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
