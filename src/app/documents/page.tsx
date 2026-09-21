"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { AppLayout } from "@/components/app-layout";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Download,
  FileText,
  AlertCircle,
  Search,
  CheckCircle2,
  Copy,
  FileType,
  FileCode,
  HardDrive,
  Loader2,
  Sparkles,
  RefreshCw,
  Bot,
  FileCheck2,
  CheckSquare,
  History,
  X,
  ArrowUpCircle,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

export default function DocumentsPage() {
  const { currentProject } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const revisionFileInputRef = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Revisions Modal state
  const [revisionsModalDoc, setRevisionsModalDoc] = useState<any | null>(null);
  const [revisionsList, setRevisionsList] = useState<any[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);

  // Revision Upload state
  const [revisionUploadDoc, setRevisionUploadDoc] = useState<any | null>(null);
  const [uploadingRevision, setUploadingRevision] = useState(false);

  const openRevisions = async (doc: any) => {
    if (!currentProject) return;
    setRevisionsModalDoc(doc);
    setLoadingRevisions(true);
    try {
      const revs = await api.documents.listRevisions(currentProject.id, doc.id);
      setRevisionsList(revs || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load document revisions", "error");
    } finally {
      setLoadingRevisions(false);
    }
  };

  const handleTriggerRevisionUpload = (doc: any) => {
    setRevisionUploadDoc(doc);
    if (revisionFileInputRef.current) {
      revisionFileInputRef.current.value = "";
      revisionFileInputRef.current.click();
    }
  };

  const handleRevisionFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentProject || !revisionUploadDoc) return;
    setUploadingRevision(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.documents.uploadRevision(currentProject.id, revisionUploadDoc.id, formData);
      showToast(`Uploaded revision for "${revisionUploadDoc.title}" successfully!`, "success");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to upload revision", "error");
    } finally {
      setUploadingRevision(false);
      setRevisionUploadDoc(null);
    }
  };

  const loadData = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const [docsData, sourcesData] = await Promise.all([
        api.documents.list(currentProject.id),
        api.ingestion.listSources(currentProject.id, { sourceType: "DOCUMENT" }).catch(() => []),
      ]);
      setDocs(docsData || []);
      setSources(sourcesData || []);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to load documents", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("search");
      if (q) setSearchQuery(q);
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`, "info");
  };

  const uploadFile = async (file: File) => {
    if (!file || !currentProject) return;
    setUploading(true);
    setErrorMsg(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name.replace(/\.[^/.]+$/, ""));

    try {
      const uploaded = await api.documents.upload(currentProject.id, formData);
      showToast(`Uploaded "${uploaded.title || file.name}" successfully!`, "success");
      await loadData();
    } catch (err: any) {
      const msg = err.message || "File upload failed";
      setErrorMsg(msg);
      showToast(msg, "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDownload = async (doc: any) => {
    if (!currentProject) return;
    setDownloadingId(doc.id);
    try {
      const filename = doc.originalFilename || `${doc.title}.pdf`;
      await api.documents.downloadFile(currentProject.id, doc.id, filename);
      showToast(`Downloaded ${filename} successfully!`, "success");
    } catch (err: any) {
      showToast(err.message || "Failed to download document", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes && bytes !== 0) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileBadge = (filename: string, mime: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext === "pdf" || mime?.includes("pdf")) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-red-50 text-red-700 border border-red-200">
          PDF
        </span>
      );
    }
    if (ext === "docx" || ext === "doc" || mime?.includes("word")) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
          DOCX
        </span>
      );
    }
    if (ext === "md" || ext === "markdown") {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-purple-50 text-purple-700 border border-purple-200">
          MD
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
        TEXT
      </span>
    );
  };

  const sourceMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const s of sources) {
      if (s.sourceId) map.set(s.sourceId, s);
    }
    return map;
  }, [sources]);

  const handleReindex = async (sourceId: string) => {
    if (!currentProject) return;
    setReindexingId(sourceId);
    try {
      await api.ingestion.reindexSource(currentProject.id, sourceId);
      showToast("Re-indexing started for document", "info");
      setTimeout(() => loadData(), 1200);
    } catch (err: any) {
      showToast(err.message || "Failed to reindex document", "error");
    } finally {
      setReindexingId(null);
    }
  };

  const renderIndexingBadge = (source?: any) => {
    if (!source) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
          Unindexed
        </span>
      );
    }
    if (source.status === "INDEXED") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#E8F5E9] text-[#2D8A60] border border-green-200">
          <Sparkles className="w-3 h-3" />
          <span>Indexed ({source.chunkCount ?? 0} chunks)</span>
        </span>
      );
    }
    if (source.status === "PROCESSING") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#FEF3C7] text-[#D97706] border border-amber-200">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Vectorizing...</span>
        </span>
      );
    }
    if (source.status === "FAILED") {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-200"
          title={source.lastError || "Indexing failed"}
        >
          <AlertCircle className="w-3 h-3" />
          <span>Indexing Failed</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
        Queued
      </span>
    );
  };

  const filteredDocs = useMemo(() => {
    return docs.filter((d) => {
      if (searchQuery.trim() === "") return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        d.id.toLowerCase() === q ||
        d.title.toLowerCase().includes(q) ||
        (d.originalFilename && d.originalFilename.toLowerCase().includes(q))
      );
    });
  }, [docs, searchQuery]);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-codex-border pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-codex-accent flex items-center justify-center border border-blue-100">
                <FileText className="w-4 h-4" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-codex-text font-serif">
                Documents & Specifications
              </h1>
            </div>
            <p className="text-xs text-codex-muted mt-1">
              Secure project file storage for PDF, DOCX, TXT, and Markdown (max 20 MiB) with SHA-256 checksums and streaming downloads.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-1.5 text-xs bg-codex-accent hover:bg-codex-hover text-white shadow-xs self-start sm:self-auto rounded-lg px-4"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            <span>{uploading ? "Uploading..." : "Upload Document"}</span>
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".pdf,.docx,.txt,.md,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
          />
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-codex-warning text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Visual Drag & Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-2.5 ${
            dragOver
              ? "border-codex-accent bg-blue-50/50 scale-[0.99]"
              : "border-slate-200 hover:border-codex-accent/50 bg-white hover:bg-slate-50/50 shadow-xs"
          }`}
        >
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-codex-accent flex items-center justify-center border border-blue-100">
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 font-serif">
              {uploading ? "Uploading file to project..." : "Click or drag & drop files here to upload"}
            </span>
            <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[11px] text-slate-400">Supported formats:</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">.PDF</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">.DOCX</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">.MD</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">.TXT</span>
              <span className="text-[11px] text-slate-400">• Max 20 MiB</span>
            </div>
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by title or filename..."
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-codex-accent focus:border-codex-accent shadow-xs"
          />
        </div>

        {/* Documents List */}
        {loading ? (
          <div className="space-y-3">
            <div className="h-20 rounded-2xl bg-white border border-slate-200 animate-pulse" />
            <div className="h-20 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-16 p-8 rounded-2xl border border-dashed border-slate-200 bg-white space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-codex-accent flex items-center justify-center mx-auto border border-blue-100">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 font-serif">
              {docs.length === 0 ? "No Documents Uploaded Yet" : "No Matching Documents Found"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {docs.length === 0
                ? "Upload product specifications, design docs, or notes to keep project knowledge in one central place."
                : "Try clearing your search query to see all documents."}
            </p>
            {docs.length === 0 ? (
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs bg-codex-accent hover:bg-codex-hover text-white shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 mr-1" /> Choose File to Upload
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="text-xs"
              >
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocs.map((doc) => {
              const isDownloading = downloadingId === doc.id;
              const source = sourceMap.get(doc.id);
              const isReindexing = source && reindexingId === source.id;
              return (
                <Card
                  key={doc.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 transition-all shadow-xs hover:shadow-md"
                >
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-codex-accent border border-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 truncate max-w-md font-serif">
                            {doc.title || doc.originalFilename}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                            v{doc.revision || 1}
                          </span>
                          {getFileBadge(doc.originalFilename || "", doc.mimeType || "")}
                          {renderIndexingBadge(source)}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono flex-wrap">
                          <span>{doc.originalFilename}</span>
                          <span>•</span>
                          <span>{formatFileSize(doc.sizeBytes)}</span>
                          <span>•</span>
                          <span>{formatDate(doc.createdAt)}</span>
                          {doc.sha256 && (
                            <>
                              <span>•</span>
                              <button
                                onClick={() => copyToClipboard(doc.sha256, "SHA-256 checksum")}
                                className="text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-0.5"
                                title="Copy SHA-256 Checksum"
                              >
                                <span>SHA: {doc.sha256.substring(0, 8)}...</span>
                                <Copy className="w-2.5 h-2.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                      {/* Upload New Replacement Revision */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTriggerRevisionUpload(doc)}
                        className="h-8 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 gap-1.5 shadow-2xs"
                        title="Upload a new replacement revision for this document"
                      >
                        <Upload className="w-3.5 h-3.5 text-codex-accent" />
                        <span className="hidden md:inline">New Revision</span>
                      </Button>

                      {/* Revisions History Modal Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openRevisions(doc)}
                        className="h-8 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 gap-1.5 shadow-2xs"
                        title="View revision snapshot history"
                      >
                        <History className="w-3.5 h-3.5 text-codex-accent" />
                        <span className="hidden md:inline">Revisions</span>
                      </Button>

                      {/* Ask Copilot */}
                      <Link
                        href={`/assistant?prompt=${encodeURIComponent(
                          `Analyze document "${doc.title || doc.originalFilename}". What key architectural specifications and requirements are outlined here?`
                        )}&mode=DEVELOPER`}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 gap-1.5 shadow-2xs"
                          title="Ask AI Copilot about this document"
                        >
                          <Bot className="w-3.5 h-3.5 text-codex-accent" />
                          <span className="hidden lg:inline">Ask Copilot</span>
                        </Button>
                      </Link>

                      {/* Create Requirement from Document */}
                      <Link
                        href={`/requirements?create=true&title=${encodeURIComponent(
                          `Spec: ${doc.title || doc.originalFilename}`
                        )}`}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 gap-1.5 shadow-2xs"
                          title="Create project requirement referencing this document"
                        >
                          <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                          <span className="hidden lg:inline">Create REQ</span>
                        </Button>
                      </Link>

                      {/* Create Task to Review/Implement Document */}
                      <Link
                        href={`/tasks?create=true&title=${encodeURIComponent(
                          `Review doc: ${doc.title || doc.originalFilename}`
                        )}`}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 gap-1.5 shadow-2xs"
                          title="Create task to review or implement this document"
                        >
                          <CheckSquare className="w-3.5 h-3.5 text-[#2D8A60]" />
                          <span className="hidden lg:inline">Add Task</span>
                        </Button>
                      </Link>

                      {source && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReindex(source.id)}
                          disabled={isReindexing || source.status === "PROCESSING"}
                          title="Trigger full semantic vector reindexing"
                          className="h-8 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 gap-1.5 shadow-2xs"
                        >
                          <RefreshCw className={`w-3 h-3 ${isReindexing ? "animate-spin" : ""}`} />
                          <span className="hidden md:inline">Reindex</span>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        disabled={isDownloading}
                        className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 shadow-2xs"
                      >
                        {isDownloading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>{isDownloading ? "Downloading..." : "Download"}</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Hidden File Input for Revision Replacement Upload */}
        <input
          ref={revisionFileInputRef}
          type="file"
          accept=".pdf,.docx,.md,.txt"
          onChange={handleRevisionFileChange}
          className="hidden"
        />

        {/* Revisions History Modal */}
        {revisionsModalDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-codex-accent bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      v{revisionsModalDoc.revision || 1}
                    </span>
                    <h2 className="text-base font-bold text-slate-900 font-serif">
                      Document Revision History
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                    {revisionsModalDoc.title || revisionsModalDoc.originalFilename}
                  </p>
                </div>
                <button
                  onClick={() => setRevisionsModalDoc(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {loadingRevisions ? (
                  <div className="py-12 text-center text-xs text-slate-400">Loading document revisions...</div>
                ) : revisionsList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl p-4 border border-dashed border-slate-200">
                    No past revisions recorded. This document is currently at baseline version (v{revisionsModalDoc.revision || 1}).
                  </div>
                ) : (
                  <div className="space-y-3">
                    {revisionsList.map((rev: any, idx: number) => (
                      <div
                        key={rev.id || idx}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 relative hover:bg-white transition-all shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-[#161927] text-white text-[10px] font-mono">
                              Revision v{rev.revision}
                            </Badge>
                            <span className="text-xs font-bold text-slate-900 font-serif truncate max-w-sm">
                              {rev.originalFilename}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatDateTime(rev.createdAt)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono flex-wrap">
                          <span>Size: {formatFileSize(rev.sizeBytes)}</span>
                          <span>•</span>
                          <span>MIME: {rev.mimeType}</span>
                          {rev.sha256 && (
                            <>
                              <span>•</span>
                              <button
                                onClick={() => copyToClipboard(rev.sha256, "SHA-256 hash")}
                                className="hover:text-slate-800 flex items-center gap-1"
                              >
                                <span>SHA: {rev.sha256.substring(0, 8)}...</span>
                                <Copy className="w-2.5 h-2.5" />
                              </button>
                            </>
                          )}
                        </div>

                        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
                          <span>Captured by: {rev.changedBy || "System"}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownload(rev)}
                            className="h-6 text-[10px] text-codex-accent hover:underline gap-1 p-0 font-medium"
                          >
                            <Download className="w-3 h-3" /> Download This Version
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    handleTriggerRevisionUpload(revisionsModalDoc);
                    setRevisionsModalDoc(null);
                  }}
                  className="text-xs gap-1.5 bg-white text-slate-700"
                >
                  <Upload className="w-3.5 h-3.5 text-codex-accent" />
                  <span>Upload Replacement Revision</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRevisionsModalDoc(null)}
                  className="text-xs"
                >
                  Close History
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Workflow Progression Banner */}
        <div className="mt-8 p-5 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-codex-accent flex items-center justify-center shrink-0 border border-blue-100">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 font-serif">
                Next in Workflow: Semantic Knowledge Retrieval
              </p>
              <p className="text-[11px] text-slate-500">
                Indexed documents are queryable via pgvector embeddings. Use the AI Copilot to ground answers in these project specs.
              </p>
            </div>
          </div>
          <Link href="/assistant">
            <Button
              size="sm"
              className="text-xs bg-codex-accent hover:bg-codex-hover text-white shadow-xs shrink-0"
            >
              Query in Copilot →
            </Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
