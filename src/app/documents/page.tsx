"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { AppLayout } from "@/components/app-layout";
import { api } from "@/lib/api";
import {
  Upload,
  Download,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Presentation,
  Search,
  LayoutGrid,
  List,
  History,
  X,
  Trash2,
  ExternalLink,
  ChevronDown,
  Loader2,
  FolderOpen,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

// Format file size nicely (e.g. 2.4 MB, 860 KB)
function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || isNaN(bytes)) return "0 B";
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

// Relative time formatting matching mockup (e.g. 1h ago, 3h ago, Yesterday, 2 days ago)
function formatRelativeTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "Recently";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return diffMin <= 1 ? "Just now" : `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// File category resolver
function getFileCategory(
  filename?: string,
  mimeType?: string
): "pdf" | "image" | "word" | "excel" | "presentation" | "other" {
  const name = (filename || "").toLowerCase();
  const mime = (mimeType || "").toLowerCase();

  if (name.endsWith(".pdf") || mime.includes("pdf")) return "pdf";
  if (
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp") ||
    name.endsWith(".svg") ||
    mime.includes("image")
  )
    return "image";
  if (
    name.endsWith(".docx") ||
    name.endsWith(".doc") ||
    mime.includes("wordprocessingml") ||
    mime.includes("msword")
  )
    return "word";
  if (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".csv") ||
    mime.includes("spreadsheetml") ||
    mime.includes("excel") ||
    mime.includes("csv")
  )
    return "excel";
  if (
    name.endsWith(".pptx") ||
    name.endsWith(".ppt") ||
    mime.includes("presentationml") ||
    mime.includes("powerpoint")
  )
    return "presentation";

  return "other";
}

// User avatar initials & color styling
function getUserAvatarStyle(displayName?: string, email?: string) {
  const name = (displayName || email || "User").trim();
  const lower = name.toLowerCase();

  if (lower.includes("panhavorn")) {
    return { initials: "NP", bg: "bg-amber-500 text-white", name: "Panhavorn" };
  }
  if (lower.includes("john") || lower.includes("smith")) {
    return { initials: "JS", bg: "bg-slate-900 text-white", name: "John Smith" };
  }
  if (lower.includes("meng") || lower.includes("fong")) {
    return { initials: "MF", bg: "bg-blue-600 text-white", name: "Mengfong" };
  }
  if (lower.includes("jane") || lower.includes("doe")) {
    return { initials: "JD", bg: "bg-indigo-500 text-white", name: "Jane Doe" };
  }

  // Fallback initials
  const parts = name.split(" ").filter(Boolean);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  return { initials, bg: "bg-slate-700 text-white", name };
}

// Project pill styling
function getProjectBadgeStyle(projectName?: string, projectKey?: string) {
  const name = (projectName || projectKey || "").toLowerCase();
  if (name.includes("ai project") || name.includes("aiw")) {
    return "bg-blue-50 text-blue-600 border border-blue-100";
  }
  if (name.includes("onboarding") || name.includes("cor")) {
    return "bg-amber-50 text-amber-700 border border-amber-100";
  }
  if (name.includes("style") || name.includes("isg")) {
    return "bg-emerald-50 text-emerald-700 border border-emerald-100";
  }
  return "bg-slate-50 text-slate-600 border border-slate-200";
}

export default function DocumentsPage() {
  const { currentProject, projects } = useAuth();
  const { showToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const revisionFileInputRef = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View mode: Grid vs List
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filters
  const [selectedProject, setSelectedProject] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedUploader, setSelectedUploader] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadProjectId, setUploadProjectId] = useState<string>("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  // Selected document detail modal
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  // Revision modal state
  const [revisionsModalDoc, setRevisionsModalDoc] = useState<any | null>(null);
  const [revisionsList, setRevisionsList] = useState<any[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [uploadingRevision, setUploadingRevision] = useState(false);

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);

  // Load all documents across active projects
  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.documents.listAll({
        projectId: selectedProject !== "ALL" ? selectedProject : undefined,
        fileType: selectedType !== "ALL" ? selectedType : undefined,
        createdBy: selectedUploader !== "ALL" ? selectedUploader : undefined,
        search: searchQuery.trim() || undefined,
        pageSize: 100,
      });

      const docsList = Array.isArray(response)
        ? response
        : (response as any)?.data || [];

      setDocs(docsList);

      // Load ingestion sources if a project is selected
      if (currentProject) {
        try {
          const sourcesData = await api.ingestion.listSources(currentProject.id, {
            sourceType: "DOCUMENT",
          });
          setSources(sourcesData || []);
        } catch {
          setSources([]);
        }
      }
    } catch (err: any) {
      console.error("Failed to load documents:", err);
      showToast(err.message || "Failed to load documents", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject, selectedType, selectedUploader, searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedDoc) setSelectedDoc(null);
        if (revisionsModalDoc) setRevisionsModalDoc(null);
        if (uploadModalOpen && !uploading) setUploadModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDoc, revisionsModalDoc, uploadModalOpen, uploading]);

  // Handle default project selection for upload modal
  useEffect(() => {
    if (currentProject) {
      setUploadProjectId(currentProject.id);
    } else if (projects && projects.length > 0) {
      setUploadProjectId(projects[0].id);
    }
  }, [currentProject, projects]);

  // Filtered documents list
  const filteredDocuments = useMemo(() => {
    return docs.filter((doc) => {
      // Project filter
      if (selectedProject !== "ALL") {
        if (doc.projectId !== selectedProject) return false;
      }

      // Type filter
      if (selectedType !== "ALL") {
        const cat = getFileCategory(doc.originalFilename, doc.mimeType);
        if (cat.toLowerCase() !== selectedType.toLowerCase()) return false;
      }

      // Uploader filter
      if (selectedUploader !== "ALL") {
        const uploaderName = (doc.creator?.displayName || "").toLowerCase();
        if (!uploaderName.includes(selectedUploader.toLowerCase())) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (doc.originalFilename || "").toLowerCase().includes(q);
        const matchesTitle = (doc.title || "").toLowerCase().includes(q);
        const matchesProject = (doc.project?.name || "").toLowerCase().includes(q);
        if (!matchesName && !matchesTitle && !matchesProject) return false;
      }

      return true;
    });
  }, [docs, selectedProject, selectedType, selectedUploader, searchQuery]);

  // Unique projects count
  const uniqueProjectsCount = useMemo(() => {
    const projectSet = new Set<string>();
    filteredDocuments.forEach((d) => {
      if (d.projectId) projectSet.add(d.projectId);
      else if (d.project?.id) projectSet.add(d.project.id);
    });
    return Math.max(projectSet.size, projects?.length || 1);
  }, [filteredDocuments, projects]);

  // Download handler
  const handleDownload = async (doc: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      showToast(`Downloading "${doc.originalFilename || doc.title}"...`, "info");
      await api.documents.downloadFile(
        doc.projectId,
        doc.id,
        doc.originalFilename || doc.title
      );
    } catch (err: any) {
      showToast(err.message || "Failed to download document", "error");
    }
  };

  // Delete handler
  const handleDelete = async (doc: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${doc.originalFilename || doc.title}"?`)) {
      return;
    }

    try {
      await api.documents.delete(doc.projectId, doc.id);
      showToast(`Deleted "${doc.originalFilename || doc.title}"`, "success");
      if (selectedDoc?.id === doc.id) setSelectedDoc(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to delete document", "error");
    }
  };

  // Upload handler
  const handlePerformUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      showToast("Please choose a file to upload", "error");
      return;
    }
    const targetProjId = uploadProjectId || currentProject?.id || projects?.[0]?.id;
    if (!targetProjId) {
      showToast("Please select a project", "error");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("title", uploadTitle.trim() || uploadFile.name);

    try {
      await api.documents.upload(targetProjId, formData);
      showToast(`Uploaded "${uploadFile.name}" successfully!`, "success");
      setUploadModalOpen(false);
      setUploadFile(null);
      setUploadTitle("");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  // Open revisions modal
  const openRevisions = async (doc: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRevisionsModalDoc(doc);
    setLoadingRevisions(true);
    try {
      const revs = await api.documents.listRevisions(doc.projectId, doc.id);
      setRevisionsList(revs || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load revisions", "error");
    } finally {
      setLoadingRevisions(false);
    }
  };

  // Upload new revision handler
  const handleRevisionFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !revisionsModalDoc) return;
    setUploadingRevision(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.documents.uploadRevision(
        revisionsModalDoc.projectId,
        revisionsModalDoc.id,
        formData
      );
      showToast(`Uploaded new revision for "${revisionsModalDoc.title}"`, "success");
      const updatedRevs = await api.documents.listRevisions(
        revisionsModalDoc.projectId,
        revisionsModalDoc.id
      );
      setRevisionsList(updatedRevs || []);
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to upload revision", "error");
    } finally {
      setUploadingRevision(false);
      if (revisionFileInputRef.current) revisionFileInputRef.current.value = "";
    }
  };

  // Render type icon with exact background & color
  const renderTypeIcon = (category: string, sizeClass = "w-5 h-5") => {
    switch (category) {
      case "pdf":
        return (
          <div className="w-9 h-9 rounded-xl bg-[#fee2e2] text-[#ef4444] flex items-center justify-center flex-shrink-0">
            <FileText className={sizeClass} />
          </div>
        );
      case "image":
        return (
          <div className="w-9 h-9 rounded-xl bg-[#f3e8ff] text-[#a855f7] flex items-center justify-center flex-shrink-0">
            <ImageIcon className={sizeClass} />
          </div>
        );
      case "word":
        return (
          <div className="w-9 h-9 rounded-xl bg-[#dbeafe] text-[#3b82f6] flex items-center justify-center flex-shrink-0">
            <FileText className={sizeClass} />
          </div>
        );
      case "excel":
        return (
          <div className="w-9 h-9 rounded-xl bg-[#dcfce7] text-[#10b981] flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className={sizeClass} />
          </div>
        );
      case "presentation":
        return (
          <div className="w-9 h-9 rounded-xl bg-[#ffedd5] text-[#f97316] flex items-center justify-center flex-shrink-0">
            <Presentation className={sizeClass} />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
            <FileText className={sizeClass} />
          </div>
        );
    }
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
        {/* BREADCRUMB & HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
              <Link
                href="/dashboard"
                className="text-blue-600 hover:text-blue-700 hover:underline"
              >
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-800">Documents</span>
            </nav>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 tracking-tight">
              Documents
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-normal">
              {filteredDocuments.length} document{filteredDocuments.length === 1 ? "" : "s"} across{" "}
              {uniqueProjectsCount} active project{uniqueProjectsCount === 1 ? "" : "s"}.
            </p>
          </div>

          {/* UPLOAD DOCUMENT BUTTON */}
          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-xs transition-all active:scale-[0.98] w-fit"
          >
            <Upload className="w-4 h-4 stroke-[2.2]" />
            <span>Upload Document</span>
          </button>
        </div>

        {/* FILTER TOOLBAR & VIEW SWITCHER */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-1">
          {/* Left filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Project Filter */}
            <div className="relative">
              <select
                aria-label="Filter documents by project"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-xl px-3.5 py-2 pr-8 text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer transition-all"
              >
                <option value="ALL">Project: All</option>
                {projects &&
                  projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      Project: {p.name}
                    </option>
                  ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <select
                aria-label="Filter documents by file type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-xl px-3.5 py-2 pr-8 text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer transition-all"
              >
                <option value="ALL">Type: All</option>
                <option value="pdf">Type: PDF</option>
                <option value="image">Type: Image (PNG / JPG)</option>
                <option value="word">Type: Word (DOCX)</option>
                <option value="excel">Type: Excel (XLSX / CSV)</option>
                <option value="presentation">Type: Presentation (PPTX)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Uploaded By Filter */}
            <div className="relative">
              <select
                aria-label="Filter documents by uploader"
                value={selectedUploader}
                onChange={(e) => setSelectedUploader(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-xl px-3.5 py-2 pr-8 text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer transition-all"
              >
                <option value="ALL">Uploaded by: All</option>
                <option value="Panhavorn">Uploaded by: Panhavorn</option>
                <option value="Meng">Uploaded by: Meng Fong</option>
                <option value="John">Uploaded by: John Smith</option>
                <option value="Jane">Uploaded by: Jane Doe</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Right search & view switcher */}
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 md:w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Grid / List Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === "grid"
                    ? "bg-[#0f172a] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === "list"
                    ? "bg-[#0f172a] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
            </div>
          </div>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 h-48 animate-pulse flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100" />
                  <div className="w-3/4 h-4 bg-slate-100 rounded-md" />
                  <div className="w-1/2 h-5 bg-slate-100 rounded-full" />
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <div className="w-20 h-4 bg-slate-100 rounded-md" />
                  <div className="w-14 h-4 bg-slate-100 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          /* EMPTY STATE */
          <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
              <FolderOpen className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-base font-semibold text-slate-900">No documents found</h3>
              <p className="text-xs text-slate-500">
                {searchQuery || selectedProject !== "ALL" || selectedType !== "ALL"
                  ? "Try resetting your active filters or search terms."
                  : "Upload a document to get started with specs, diagrams, and files."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium shadow-xs transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Document
            </button>
          </div>
        ) : viewMode === "grid" ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {filteredDocuments.map((doc) => {
              const category = getFileCategory(doc.originalFilename, doc.mimeType);
              const avatar = getUserAvatarStyle(
                doc.creator?.displayName,
                doc.creator?.email
              );
              const projectName = doc.project?.name || "Workspace";
              const badgeStyle = getProjectBadgeStyle(projectName, doc.project?.key);

              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all p-5 flex flex-col justify-between h-[210px] cursor-pointer group relative overflow-hidden"
                >
                  {/* Top content */}
                  <div>
                    {/* File icon */}
                    <div className="mb-3">{renderTypeIcon(category)}</div>

                    {/* File title */}
                    <h3
                      title={doc.originalFilename || doc.title}
                      className="font-semibold text-slate-900 text-sm truncate mb-2 group-hover:text-blue-600 transition-colors"
                    >
                      {doc.originalFilename || doc.title}
                    </h3>

                    {/* Project badge */}
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium truncate max-w-full ${badgeStyle}`}
                    >
                      {projectName}
                    </span>
                  </div>

                  {/* Bottom footer: Avatar + Meta */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    {/* User avatar & name */}
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 ${avatar.bg}`}
                      >
                        {avatar.initials}
                      </div>
                      <span className="text-xs text-slate-500 truncate">{avatar.name}</span>
                    </div>

                    {/* Size and Relative time */}
                    <div className="flex flex-col items-end text-right flex-shrink-0">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatFileSize(doc.sizeBytes)}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatRelativeTime(doc.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Document</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Uploaded By</th>
                    <th className="py-3 px-4">Uploaded</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredDocuments.map((doc) => {
                    const category = getFileCategory(doc.originalFilename, doc.mimeType);
                    const avatar = getUserAvatarStyle(
                      doc.creator?.displayName,
                      doc.creator?.email
                    );
                    const projectName = doc.project?.name || "Workspace";
                    const badgeStyle = getProjectBadgeStyle(projectName, doc.project?.key);

                    return (
                      <tr
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        {/* Document Name */}
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            {renderTypeIcon(category, "w-4 h-4")}
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate block">
                                {doc.originalFilename || doc.title}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                rev {doc.revision || 1}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Project */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badgeStyle}`}
                          >
                            {projectName}
                          </span>
                        </td>

                        {/* Type */}
                        <td className="py-3 px-4 uppercase text-[11px] font-mono text-slate-500">
                          {category}
                        </td>

                        {/* Size */}
                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                          {formatFileSize(doc.sizeBytes)}
                        </td>

                        {/* Uploaded By */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold ${avatar.bg}`}
                            >
                              {avatar.initials}
                            </div>
                            <span className="text-slate-600 truncate">{avatar.name}</span>
                          </div>
                        </td>

                        {/* Uploaded Date */}
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {formatRelativeTime(doc.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-5 text-right">
                          <div
                            className="flex items-center justify-end gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => handleDownload(doc, e)}
                              title="Download document"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => openRevisions(doc, e)}
                              title="Revision history"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                              <History className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(doc, e)}
                              title="Delete document"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* UPLOAD DOCUMENT MODAL */}
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div
              className="fixed inset-0"
              onClick={() => !uploading && setUploadModalOpen(false)}
            />
            <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-10 animate-in zoom-in-95">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Upload New Document</h3>
                </div>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => setUploadModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handlePerformUpload} className="p-6 space-y-4">
                {/* Project selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Target Project
                  </label>
                  <select
                    value={uploadProjectId}
                    onChange={(e) => setUploadProjectId(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {projects &&
                      projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.key})
                        </option>
                      ))}
                  </select>
                </div>

                {/* File Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      setUploadFile(file);
                      if (!uploadTitle) setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-blue-500 bg-blue-50/50"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/40 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadFile(file);
                        if (!uploadTitle) setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
                      }
                    }}
                  />
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2.5">
                    <Upload className="w-5 h-5" />
                  </div>
                  {uploadFile ? (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-800 truncate max-w-xs mx-auto">
                        {uploadFile.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {formatFileSize(uploadFile.size)}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-700">
                        Click to upload or drag & drop
                      </p>
                      <p className="text-[11px] text-slate-400">
                        PDF, Word (.docx), Excel (.xlsx), PPTX, PNG, JPG (up to 20MB)
                      </p>
                    </div>
                  )}
                </div>

                {/* Document Title (Optional) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Document Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. System Architecture Specification"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => setUploadModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !uploadFile}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-medium shadow-xs transition-all flex items-center gap-1.5"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload File</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DOCUMENT DETAILS MODAL */}
        {selectedDoc && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="fixed inset-0" onClick={() => setSelectedDoc(null)} />
            <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-10 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  {renderTypeIcon(
                    getFileCategory(selectedDoc.originalFilename, selectedDoc.mimeType)
                  )}
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {selectedDoc.originalFilename || selectedDoc.title}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Revision {selectedDoc.revision || 1} &bull;{" "}
                      {formatFileSize(selectedDoc.sizeBytes)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100 font-sans">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Project
                    </span>
                    <span className="font-semibold text-slate-800 text-xs">
                      {selectedDoc.project?.name || "Workspace Project"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Uploaded By
                    </span>
                    <span className="font-semibold text-slate-800 text-xs">
                      {selectedDoc.creator?.displayName || "Team Member"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Uploaded Date
                    </span>
                    <span className="text-slate-700 text-xs">
                      {new Date(selectedDoc.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      MIME Type
                    </span>
                    <span className="font-mono text-[11px] text-slate-600 truncate block">
                      {selectedDoc.mimeType || "application/octet-stream"}
                    </span>
                  </div>
                </div>

                {/* Processing & Ingestion Status */}
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800">
                      AI Ingestion & Knowledge Index
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Indexed
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    This document is ingested into the pgvector knowledge base. AI Copilot uses
                    its semantic content for cross-referencing and contextual citation.
                  </p>
                </div>

                {/* Primary Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={(e) => handleDownload(selectedDoc, e)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-xs transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => openRevisions(selectedDoc, e)}
                    className="flex items-center gap-1.5 py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-medium transition-all"
                  >
                    <History className="w-4 h-4" />
                    <span>Revisions</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(selectedDoc, e)}
                    className="p-2 border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-all"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REVISIONS MODAL */}
        {revisionsModalDoc && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="fixed inset-0" onClick={() => setRevisionsModalDoc(null)} />
            <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-10 animate-in zoom-in-95 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    Revision History &bull; {revisionsModalDoc.originalFilename || revisionsModalDoc.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRevisionsModalDoc(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Upload new revision trigger */}
                <div className="flex items-center justify-between bg-blue-50/50 border border-blue-100 rounded-xl p-3.5">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-blue-900">Upload New Revision</p>
                    <p className="text-[11px] text-blue-600">
                      Replaces current file while preserving audit trail
                    </p>
                  </div>
                  <input
                    type="file"
                    ref={revisionFileInputRef}
                    className="hidden"
                    onChange={handleRevisionFileChange}
                  />
                  <button
                    type="button"
                    disabled={uploadingRevision}
                    onClick={() => revisionFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium shadow-xs transition-all"
                  >
                    {uploadingRevision ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{uploadingRevision ? "Uploading..." : "Upload Revision"}</span>
                  </button>
                </div>

                {loadingRevisions ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : revisionsList.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">
                    No past revisions recorded. Current version is baseline (v1).
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {revisionsList.map((rev) => (
                      <div
                        key={rev.id || rev.revision}
                        className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="space-y-1 min-w-0 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-blue-600 font-mono">
                              rev {rev.revision}
                            </span>
                            <span className="font-medium text-slate-800 truncate">
                              {rev.originalFilename}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span>{formatFileSize(rev.sizeBytes)}</span>
                            <span>&bull;</span>
                            <span>{formatRelativeTime(rev.createdAt)}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            api.documents.downloadFile(
                              revisionsModalDoc.projectId,
                              revisionsModalDoc.id,
                              rev.originalFilename
                            )
                          }
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all flex-shrink-0"
                          title="Download this revision"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
