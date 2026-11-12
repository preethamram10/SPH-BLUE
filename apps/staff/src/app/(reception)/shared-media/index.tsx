import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Share,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getActiveBranch, apiFetch } from "../../../services/auth";
import { ReceptionBottomNav } from "../../../components/reception/ReceptionBottomNav";

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

export default function ReceptionSharedMediaScreen() {
  const router = useRouter();
  const [folders, setFolders] = useState<SharedMediaFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeBranchName, setActiveBranchName] = useState("KPHB Branch");

  // Expanded folders
  const [expandedFolderIds, setExpandedFolderIds] = useState<Record<string, boolean>>({});

  // Create Folder Modal State
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Add Link Modal State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [activeFolderForLink, setActiveFolderForLink] = useState<SharedMediaFolder | null>(null);
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [isSavingLink, setIsSavingLink] = useState(false);

  useEffect(() => {
    getActiveBranch().then((b) => {
      if (b?.name) setActiveBranchName(b.name);
    });
    loadSharedMedia();
  }, []);

  const loadSharedMedia = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<any>("/shared-media");
      if (res && res.success && Array.isArray(res.folders)) {
        setFolders(res.folders);
        const exp: Record<string, boolean> = {};
        res.folders.forEach((f: SharedMediaFolder) => {
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

  const handleOpenLink = async (url: string) => {
    if (!url) return;
    try {
      let cleanUrl = url.trim();
      if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = "https://" + cleanUrl;
      }
      const canOpen = await Linking.canOpenURL(cleanUrl);
      if (canOpen) {
        await Linking.openURL(cleanUrl);
      } else {
        Alert.alert("Invalid Link", `Unable to open URL: ${cleanUrl}`);
      }
    } catch {
      Alert.alert("Error", "Could not open URL");
    }
  };

  const handleShareLink = async (name: string, url: string) => {
    try {
      await Share.share({
        title: name,
        message: `${name}\n${url}`,
        url: url,
      });
    } catch {}
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert("Required", "Please enter a folder name");
      return;
    }
    setIsCreatingFolder(true);
    try {
      const res = await apiFetch<any>("/shared-media", {
        method: "POST",
        body: JSON.stringify({
          action: "create_folder",
          name: newFolderName.trim(),
          description: newFolderDesc.trim(),
          color: "sky",
          createdBy: "Reception Staff",
          createdBranch: activeBranchName,
        }),
      });

      if (res && res.success && res.folder) {
        setFolders((prev) => [...prev, res.folder]);
        setExpandedFolderIds((prev) => ({ ...prev, [res.folder.id]: true }));
        setIsFolderModalOpen(false);
        setNewFolderName("");
        setNewFolderDesc("");
        Alert.alert("Success", "Shared Media Folder created!");
      } else {
        Alert.alert("Error", res?.error || "Failed to create folder");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create folder");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteFolder = (folderId: string, folderName: string) => {
    Alert.alert(
      "Delete Folder",
      `Are you sure you want to delete "${folderName}" and all its links?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await apiFetch<any>(`/shared-media?folderId=${encodeURIComponent(folderId)}`, {
                method: "DELETE",
              });
              if (res && res.success) {
                setFolders((prev) => prev.filter((f) => f.id !== folderId));
              } else {
                Alert.alert("Error", res?.error || "Failed to delete");
              }
            } catch {
              Alert.alert("Error", "Failed to delete folder");
            }
          },
        },
      ]
    );
  };

  const handleOpenAddLink = (folder: SharedMediaFolder) => {
    setActiveFolderForLink(folder);
    setNewLinkName("");
    setNewLinkUrl("");
    setIsLinkModalOpen(true);
  };

  const handleSaveLink = async () => {
    if (!activeFolderForLink || !newLinkName.trim() || !newLinkUrl.trim()) {
      Alert.alert("Required", "Please provide both link name and URL");
      return;
    }

    let formattedUrl = newLinkUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = "https://" + formattedUrl;
    }

    setIsSavingLink(true);
    try {
      const res = await apiFetch<any>("/shared-media", {
        method: "POST",
        body: JSON.stringify({
          action: "add_link",
          folderId: activeFolderForLink.id,
          name: newLinkName.trim(),
          url: formattedUrl,
          createdBy: "Reception Staff",
          createdBranch: activeBranchName,
        }),
      });

      if (res && res.success && res.link) {
        setFolders((prev) =>
          prev.map((f) => {
            if (f.id === activeFolderForLink.id) {
              return {
                ...f,
                links: [res.link, ...(f.links || [])],
              };
            }
            return f;
          })
        );
        setIsLinkModalOpen(false);
        setActiveFolderForLink(null);
        setNewLinkName("");
        setNewLinkUrl("");
        Alert.alert("Success", "Link added to folder!");
      } else {
        Alert.alert("Error", res?.error || "Failed to add link");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to add link");
    } finally {
      setIsSavingLink(false);
    }
  };

  const handleDeleteLink = (folderId: string, linkId: string, linkName: string) => {
    Alert.alert("Delete Link", `Remove "${linkName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await apiFetch<any>(
              `/shared-media?folderId=${encodeURIComponent(folderId)}&linkId=${encodeURIComponent(linkId)}`,
              { method: "DELETE" }
            );
            if (res && res.success) {
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
            }
          } catch {
            Alert.alert("Error", "Failed to delete link");
          }
        },
      },
    ]);
  };

  const filteredFolders = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return folders;
    return folders
      .map((f) => {
        const matchesFolder = f.name.toLowerCase().includes(q) || (f.description || "").toLowerCase().includes(q);
        const matchingLinks = (f.links || []).filter(
          (l) => l.name.toLowerCase().includes(q) || l.url.toLowerCase().includes(q)
        );
        if (matchesFolder) return f;
        if (matchingLinks.length > 0) return { ...f, links: matchingLinks };
        return null;
      })
      .filter(Boolean) as SharedMediaFolder[];
  }, [folders, search]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      {/* Top Navbar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.topBarTitleContainer}>
          <Text style={styles.topBarTitle}>Shared Media Library</Text>
          <View style={styles.globalBadge}>
            <Ionicons name="globe-outline" size={11} color="#047857" />
            <Text style={styles.globalBadgeText}>All Branches Shared</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addFolderBtn} onPress={() => setIsFolderModalOpen(true)}>
          <Ionicons name="add" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search folders or links..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} style={styles.clearSearchBtn}>
            <Ionicons name="close-circle" size={16} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Main Body Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0284c7" />
            <Text style={styles.loadingText}>Loading Shared Media Library...</Text>
          </View>
        ) : filteredFolders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Folders Found</Text>
            <Text style={styles.emptySubtitle}>
              Tap the &apos;+&apos; button above to create a new shared folder for all branches.
            </Text>
          </View>
        ) : (
          filteredFolders.map((folder) => {
            const isExpanded = expandedFolderIds[folder.id] ?? true;
            const links = folder.links || [];

            return (
              <View key={folder.id} style={styles.folderCard}>
                {/* Folder Header */}
                <TouchableOpacity
                  style={styles.folderHeader}
                  activeOpacity={0.8}
                  onPress={() => toggleFolderExpand(folder.id)}
                >
                  <View style={styles.folderHeaderLeft}>
                    <View style={styles.folderIconWrap}>
                      <Ionicons name="folder" size={20} color="#0284c7" />
                    </View>
                    <View style={styles.folderTitleWrap}>
                      <View style={styles.folderNameRow}>
                        <Text style={styles.folderNameText}>{folder.name}</Text>
                        <View style={styles.countBadge}>
                          <Text style={styles.countBadgeText}>{links.length}</Text>
                        </View>
                      </View>
                      {folder.description ? (
                        <Text style={styles.folderDescText} numberOfLines={1}>
                          {folder.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.folderHeaderRight}>
                    <TouchableOpacity
                      style={styles.addLinkIconBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleOpenAddLink(folder);
                      }}
                    >
                      <Ionicons name="add-circle" size={22} color="#0284c7" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteFolderBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder.id, folder.name);
                      }}
                    >
                      <Ionicons name="trash-outline" size={17} color="#cbd5e1" />
                    </TouchableOpacity>

                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#64748b"
                      style={{ marginLeft: 4 }}
                    />
                  </View>
                </TouchableOpacity>

                {/* Folder Links Body */}
                {isExpanded && (
                  <View style={styles.linksContainer}>
                    {links.length === 0 ? (
                      <View style={styles.emptyLinksRow}>
                        <Text style={styles.emptyLinksText}>No links in this folder yet. Tap </Text>
                        <TouchableOpacity onPress={() => handleOpenAddLink(folder)}>
                          <Text style={styles.addLinkInlineText}>+ Add Link</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      links.map((link) => (
                        <View key={link.id} style={styles.linkRow}>
                          <TouchableOpacity
                            style={styles.linkInfoWrap}
                            onPress={() => handleOpenLink(link.url)}
                          >
                            <View style={styles.linkIconCircle}>
                              <Ionicons name="link" size={14} color="#0284c7" />
                            </View>
                            <View style={styles.linkTextContainer}>
                              <Text style={styles.linkNameText} numberOfLines={1}>
                                {link.name}
                              </Text>
                              <Text style={styles.linkUrlText} numberOfLines={1}>
                                {link.url}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          <View style={styles.linkActionsWrap}>
                            <TouchableOpacity
                              style={styles.actionBtn}
                              onPress={() => handleShareLink(link.name, link.url)}
                            >
                              <Ionicons name="share-outline" size={16} color="#64748b" />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.actionBtn}
                              onPress={() => handleOpenLink(link.url)}
                            >
                              <Ionicons name="open-outline" size={16} color="#0284c7" />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.actionBtn}
                              onPress={() => handleDeleteLink(folder.id, link.id, link.name)}
                            >
                              <Ionicons name="trash-outline" size={16} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* CREATE FOLDER MODAL */}
      <Modal visible={isFolderModalOpen} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Shared Folder</Text>
              <TouchableOpacity onPress={() => setIsFolderModalOpen(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Folder Name *</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Diet Charts, Therapy Videos"
                value={newFolderName}
                onChangeText={setNewFolderName}
              />

              <Text style={styles.fieldLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.inputField, { height: 60 }]}
                placeholder="Description of folder contents..."
                multiline
                value={newFolderDesc}
                onChangeText={setNewFolderDesc}
              />

              <View style={styles.modalBtnsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsFolderModalOpen(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitBtn, isCreatingFolder && { opacity: 0.6 }]}
                  disabled={isCreatingFolder}
                  onPress={handleCreateFolder}
                >
                  <Text style={styles.submitBtnText}>
                    {isCreatingFolder ? "Creating..." : "Create Folder"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ADD LINK MODAL */}
      <Modal visible={isLinkModalOpen} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add Link to Folder</Text>
                <Text style={styles.modalSub}>
                  Folder: {activeFolderForLink?.name || ""}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsLinkModalOpen(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Link Title / Name *</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Chronic Care Diet Plan PDF"
                value={newLinkName}
                onChangeText={setNewLinkName}
              />

              <Text style={styles.fieldLabel}>Link URL *</Text>
              <TextInput
                style={styles.inputField}
                placeholder="https://drive.google.com/... or https://youtube.com/..."
                autoCapitalize="none"
                keyboardType="url"
                value={newLinkUrl}
                onChangeText={setNewLinkUrl}
              />

              <View style={styles.modalBtnsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsLinkModalOpen(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitBtn, isSavingLink && { opacity: 0.6 }]}
                  disabled={isSavingLink}
                  onPress={handleSaveLink}
                >
                  <Text style={styles.submitBtnText}>
                    {isSavingLink ? "Saving..." : "Save Link"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ReceptionBottomNav activeTab="dashboard" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  topBarTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  globalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  globalBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#047857",
  },
  addFolderBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#0284c7",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    height: 42,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
    fontWeight: "500",
  },
  clearSearchBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1e293b",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  folderCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  folderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: "#f0f9ff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0f2fe",
  },
  folderHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  folderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  folderTitleWrap: {
    flex: 1,
  },
  folderNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  folderNameText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: "#bae6fd",
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0369a1",
  },
  folderDescText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  folderHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addLinkIconBtn: {
    padding: 4,
  },
  deleteFolderBtn: {
    padding: 4,
  },
  linksContainer: {
    padding: 12,
    backgroundColor: "#ffffff",
  },
  emptyLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  emptyLinksText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  addLinkInlineText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0284c7",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    marginBottom: 8,
  },
  linkInfoWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  linkIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#e0f2fe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  linkTextContainer: {
    flex: 1,
  },
  linkNameText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  linkUrlText: {
    fontSize: 11,
    color: "#0284c7",
    marginTop: 1,
  },
  linkActionsWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 12,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  modalSub: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0284c7",
    marginTop: 2,
  },
  modalBody: {
    gap: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  inputField: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0f172a",
  },
  modalBtnsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  submitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#0284c7",
  },
  submitBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
  },
});
