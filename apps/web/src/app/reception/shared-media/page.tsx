"use client";

import React, { useState, useEffect, useMemo } from "react";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import {
  FolderOpen,
  FolderPlus,
  Plus,
  Link2,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Search,
  Globe2,
  FileText,
  Video,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
} from "lucide-react";

interface SharedMediaLink {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  createdBy?: string;
  createdBranch?: string;
}

interface SharedMediaFolder {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  createdBy?: string;
  createdBranch?: string;
  links: SharedMediaLink[];
}

const COLOR_MAP: Record<
  string,
  {
    bg: string;
    border: string;
    text: string;
    badge: string;
    iconBg: string;
    btnHover: string;
  }
> = {
  sky: {
    bg: "bg-sky-50/60",
    border: "border-sky-200",
    text: "text-sky-900",
    badge: "bg-sky-100 text-sky-800",
    iconBg: "bg-sky-500 text-white",
    btnHover: "hover:bg-sky-100 text-sky-700",
  },
  emerald: {
    bg: "bg-emerald-50/60",
    border: "border-emerald-200",
    text: "text-emerald-900",
    badge: "bg-emerald-100 text-emerald-800",
    iconBg: "bg-emerald-500 text-white",
    btnHover: "hover:bg-emerald-100 text-emerald-700",
  },
  indigo: {
    bg: "bg-indigo-50/60",
    border: "border-indigo-200",
    text: "text-indigo-900",
    badge: "bg-indigo-100 text-indigo-800",
    iconBg: "bg-indigo-500 text-white",
    btnHover: "hover:bg-indigo-100 text-indigo-700",
  },
  amber: {
    bg: "bg-amber-50/60",
    border: "border-amber-200",
    text: "text-amber-900",
    badge: "bg-amber-100 text-amber-800",
    iconBg: "bg-amber-500 text-white",
    btnHover: "hover:bg-amber-100 text-amber-700",
  },
  purple: {
    bg: "bg-purple-50/60",
    border: "border-purple-200",
    text: "text-purple-900",
    badge: "bg-purple-100 text-purple-800",
    iconBg: "bg-purple-500 text-white",
    btnHover: "hover:bg-purple-100 text-purple-700",
  },
  rose: {
    bg: "bg-rose-50/60",
    border: "border-rose-200",
    text: "text-rose-900",
    badge: "bg-rose-100 text-rose-800",
    iconBg: "bg-rose-500 text-white",
    btnHover: "hover:bg-rose-100 text-rose-700",
  },
};

export default function SharedMediaPage() {
  const [folders, setFolders] = useState<SharedMediaFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Expanded folders state (default: all expanded)
  const [expandedFolderIds, setExpandedFolderIds] = useState<Record<string, boolean>>({});

  // Modals state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("sky");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [activeFolderForLink, setActiveFolderForLink] = useState<SharedMediaFolder | null>(null);
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [savingLink, setSavingLink] = useState(false);

  const [currentBranch, setCurrentBranch] = useState("KPHB Branch");

  useEffect(() => {
    try {
      const b =
        localStorage.getItem("user_assigned_branch") ||
        localStorage.getItem("user_branch") ||
        localStorage.getItem("branch_name");
      if (b) setCurrentBranch(b);
    } catch {}
    fetchSharedMedia();
  }, []);

  const fetchSharedMedia = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/shared-media", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.folders)) {
        setFolders(data.folders);
        // Expand all by default
        const exp: Record<string, boolean> = {};
        data.folders.forEach((f: SharedMediaFolder) => {
          exp[f.id] = true;
        });
        setExpandedFolderIds(exp);
      }
    } catch (err) {
      console.error("Failed to fetch shared media:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleFolderExpand = (folderId: string) => {
    setExpandedFolderIds((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setCreatingFolder(true);
    try {
      const res = await fetch("/api/shared-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_folder",
          name: newFolderName.trim(),
          description: newFolderDesc.trim(),
          color: newFolderColor,
          createdBy: "Reception",
          createdBranch: currentBranch,
        }),
      });
      const data = await res.json();
      if (data.success && data.folder) {
        setFolders((prev) => [...prev, data.folder]);
        setExpandedFolderIds((prev) => ({ ...prev, [data.folder.id]: true }));
        setIsFolderModalOpen(false);
        setNewFolderName("");
        setNewFolderDesc("");
        setNewFolderColor("sky");
      } else {
        alert(data.error || "Failed to create folder");
      }
    } catch (err: any) {
      alert("Error creating folder: " + (err.message || ""));
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (!confirm(`Are you sure you want to delete the folder "${folderName}" and all its links?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/shared-media?folderId=${encodeURIComponent(folderId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setFolders((prev) => prev.filter((f) => f.id !== folderId));
      } else {
        alert(data.error || "Failed to delete folder");
      }
    } catch (err: any) {
      alert("Error deleting folder: " + (err.message || ""));
    }
  };

  const handleOpenAddLinkModal = (folder: SharedMediaFolder) => {
    setActiveFolderForLink(folder);
    setNewLinkName("");
    setNewLinkUrl("");
    setIsLinkModalOpen(true);
  };

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFolderForLink || !newLinkName.trim() || !newLinkUrl.trim()) return;

    let formattedUrl = newLinkUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = "https://" + formattedUrl;
    }

    setSavingLink(true);
    try {
      const res = await fetch("/api/shared-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_link",
          folderId: activeFolderForLink.id,
          name: newLinkName.trim(),
          url: formattedUrl,
          createdBy: "Reception",
          createdBranch: currentBranch,
        }),
      });
      const data = await res.json();
      if (data.success && data.link) {
        setFolders((prev) =>
          prev.map((f) => {
            if (f.id === activeFolderForLink.id) {
              return {
                ...f,
                links: [data.link, ...(f.links || [])],
              };
            }
            return f;
          })
        );
        setIsLinkModalOpen(false);
        setNewLinkName("");
        setNewLinkUrl("");
        setActiveFolderForLink(null);
      } else {
        alert(data.error || "Failed to save link");
      }
    } catch (err: any) {
      alert("Error saving link: " + (err.message || ""));
    } finally {
      setSavingLink(false);
    }
  };

  const handleDeleteLink = async (folderId: string, linkId: string, linkName: string) => {
    if (!confirm(`Delete link "${linkName}"?`)) return;

    try {
      const res = await fetch(
        `/api/shared-media?folderId=${encodeURIComponent(folderId)}&linkId=${encodeURIComponent(linkId)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        setFolders((prev) =>
          prev.map((f) => {
            if (f.id === folderId) {
              return {
                ...f,
                links: (f.links || []).filter((l) => l.id !== linkId),
              };
            }
            return f;
          })
        );
      } else {
        alert(data.error || "Failed to delete link");
      }
    } catch (err: any) {
      alert("Error deleting link: " + (err.message || ""));
    }
  };

  // Filter folders and links by search query
  const filteredFolders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return folders;

    return folders
      .map((f) => {
        const matchesFolder = f.name.toLowerCase().includes(q) || (f.description || "").toLowerCase().includes(q);
        const matchingLinks = (f.links || []).filter(
          (l) => l.name.toLowerCase().includes(q) || l.url.toLowerCase().includes(q)
        );
        if (matchesFolder) {
          return f;
        }
        if (matchingLinks.length > 0) {
          return {
            ...f,
            links: matchingLinks,
          };
        }
        return null;
      })
      .filter(Boolean) as SharedMediaFolder[];
  }, [folders, searchQuery]);

  const totalLinksCount = useMemo(() => {
    return folders.reduce((sum, f) => sum + (f.links?.length || 0), 0);
  }, [folders]);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      <ReceptionSidebar activePage="shared-media" />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Top Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 shadow-2xs">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#0284c7] flex items-center justify-center font-bold shadow-2xs border border-sky-100">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                      Shared Media &amp; Links Library
                    </h1>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Globe2 className="w-3 h-3" />
                      All Branches Shared
                    </span>
                  </div>
                  <p className="text-[11.5px] text-slate-500 mt-0.5">
                    Centralized folders and resource links. Media created here is instantly accessible across all branches and can be attached to patient files.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions: Search, Refresh, Create Folder */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search folders or links..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 w-48 sm:w-60 shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                onClick={() => fetchSharedMedia(true)}
                disabled={loading || refreshing}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Refresh Library"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-sky-600" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={() => setIsFolderModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                <span>+ Create Folder</span>
              </button>
            </div>
          </div>
        </header>

        {/* Body Content */}
        <div className="p-6 space-y-6">
          {/* Quick Stats Banner */}
          <div className="bg-gradient-to-r from-sky-50 via-indigo-50 to-emerald-50 rounded-2xl border border-sky-100 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white text-sky-600 flex items-center justify-center shadow-xs border border-sky-100">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900">
                  Global Shared Library Active
                </h3>
                <p className="text-[11px] text-slate-600">
                  No branch restrictions. Everything saved here is synchronized across all receptionists and doctors in all clinics.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-extrabold text-slate-700">
              <div className="bg-white/80 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-200/60 shadow-2xs">
                Folders: <span className="text-sky-700 font-black">{folders.length}</span>
              </div>
              <div className="bg-white/80 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-200/60 shadow-2xs">
                Saved Links: <span className="text-emerald-700 font-black">{totalLinksCount}</span>
              </div>
            </div>
          </div>

          {/* Folder Grid */}
          {loading ? (
            <div className="p-12 text-center text-slate-500 font-bold text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-sky-600" />
              <span>Loading Shared Media Folders...</span>
            </div>
          ) : filteredFolders.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-sky-50 text-sky-600 flex items-center justify-center">
                <FolderOpen className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-800">
                {searchQuery ? "No matching folders or links found" : "No folders created yet"}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchQuery
                  ? "Try searching with a different keyword."
                  : "Create your first shared folder (e.g. Diet Charts, Therapy Videos, Requisition Forms) to start organizing links for all branches."}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setIsFolderModalOpen(true)}
                  className="mt-2 px-4 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs shadow-xs hover:bg-sky-700 transition-colors"
                >
                  + Create First Folder
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredFolders.map((folder) => {
                const theme = COLOR_MAP[folder.color || "sky"] || COLOR_MAP.sky;
                const isExpanded = expandedFolderIds[folder.id] ?? true;
                const links = folder.links || [];

                return (
                  <div
                    key={folder.id}
                    className={`bg-white rounded-2xl border ${theme.border} shadow-2xs hover:shadow-xs transition-all overflow-hidden flex flex-col`}
                  >
                    {/* Folder Header */}
                    <div className={`${theme.bg} p-4 border-b ${theme.border} flex items-start justify-between gap-3`}>
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl ${theme.iconBg} flex items-center justify-center shadow-xs shrink-0`}
                        >
                          <FolderOpen className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-sm font-black text-slate-900 truncate">
                              {folder.name}
                            </h2>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${theme.badge}`}>
                              {links.length} {links.length === 1 ? "Link" : "Links"}
                            </span>
                          </div>
                          {folder.description && (
                            <p className="text-[11.5px] text-slate-600 mt-0.5 line-clamp-2">
                              {folder.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-semibold">
                            <span>By: {folder.createdBranch || "Clinic"}</span>
                            <span>•</span>
                            <span>{new Date(folder.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Header Buttons: Add Link, Collapse, Delete Folder */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenAddLinkModal(folder)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-extrabold text-[11px] flex items-center gap-1 shadow-2xs transition-colors"
                          title="Add new link to this folder"
                        >
                          <Plus className="w-3.5 h-3.5 text-sky-600" />
                          <span>Add Link</span>
                        </button>

                        <button
                          onClick={() => toggleFolderExpand(folder.id)}
                          className="w-7 h-7 rounded-lg bg-white/70 hover:bg-white text-slate-600 flex items-center justify-center transition-colors"
                          title={isExpanded ? "Collapse" : "Expand"}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => handleDeleteFolder(folder.id, folder.name)}
                          className="w-7 h-7 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center transition-colors"
                          title="Delete folder"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Links List Inside Folder */}
                    {isExpanded && (
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        {links.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                            <Link2 className="w-5 h-5 mx-auto mb-1.5 text-slate-300" />
                            No links in this folder yet. Click{" "}
                            <span
                              onClick={() => handleOpenAddLinkModal(folder)}
                              className="text-sky-600 font-bold hover:underline cursor-pointer"
                            >
                              + Add Link
                            </span>{" "}
                            to save a resource.
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {links.map((link) => (
                              <div
                                key={link.id}
                                className="group p-2.5 rounded-xl border border-slate-100 hover:border-slate-300 bg-white hover:bg-slate-50/70 transition-all flex items-center justify-between gap-3 shadow-2xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-sky-50 text-slate-600 group-hover:text-sky-600 flex items-center justify-center shrink-0 transition-colors">
                                    <Link2 className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="text-xs font-bold text-slate-900 truncate">
                                      {link.name}
                                    </h4>
                                    <a
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] text-sky-600 hover:text-sky-800 hover:underline truncate block"
                                    >
                                      {link.url}
                                    </a>
                                  </div>
                                </div>

                                {/* Link Actions */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => handleCopyLink(link.url, link.id)}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors"
                                    title="Copy link URL"
                                  >
                                    {copiedId === link.id ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>

                                  <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-sky-600 transition-colors"
                                    title="Open link in new tab"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>

                                  <button
                                    onClick={() => handleDeleteLink(folder.id, link.id, link.name)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-600 transition-colors"
                                    title="Delete link"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* CREATE FOLDER MODAL */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">Create Shared Media Folder</h3>
              </div>
              <button
                onClick={() => setIsFolderModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Folder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Diet Charts, Knee Pain Exercises, Clinic Leaflets"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Short note about what documents/links belong here..."
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Folder Theme Color</label>
                <div className="grid grid-cols-6 gap-2">
                  {[
                    { id: "sky", label: "Sky", color: "bg-sky-500" },
                    { id: "emerald", label: "Green", color: "bg-emerald-500" },
                    { id: "indigo", label: "Indigo", color: "bg-indigo-500" },
                    { id: "amber", label: "Amber", color: "bg-amber-500" },
                    { id: "purple", label: "Purple", color: "bg-purple-500" },
                    { id: "rose", label: "Rose", color: "bg-rose-500" },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewFolderColor(c.id)}
                      className={`h-8 rounded-lg ${c.color} flex items-center justify-center transition-transform ${
                        newFolderColor === c.id ? "ring-2 ring-offset-2 ring-slate-800 scale-105" : "opacity-80 hover:opacity-100"
                      }`}
                      title={c.label}
                    >
                      {newFolderColor === c.id && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingFolder || !newFolderName.trim()}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {creatingFolder ? "Creating..." : "Create Folder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD LINK POPUP MODAL */}
      {isLinkModalOpen && activeFolderForLink && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Link2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Add Link to Folder</h3>
                  <p className="text-[11px] text-sky-700 font-bold">
                    Folder: {activeFolderForLink.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setActiveFolderForLink(null);
                }}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLink} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Link Name / Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chronic Care Diet Plan PDF, Physiotherapy Video"
                  value={newLinkName}
                  onChange={(e) => setNewLinkName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Link URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/... or https://youtube.com/..."
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-[10.5px] text-slate-400 mt-1">
                  Paste any Google Drive, YouTube, website, or document link.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsLinkModalOpen(false);
                    setActiveFolderForLink(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLink || !newLinkName.trim() || !newLinkUrl.trim()}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {savingLink ? "Saving..." : "Save Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
