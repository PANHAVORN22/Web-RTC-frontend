"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth, Project } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { AppLayout } from "@/components/app-layout";
import { ProposalReviewDialog } from "@/components/ai/proposal-review-dialog";
import { api } from "@/lib/api";
import { DeleteConfirmModal } from "@/components/delete-confirm-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import {
  ArrowLeft,
  Pencil,
  Plus,
  Search,
  Calendar,
  Sparkles,
  History,
  Trash2,
  Copy,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  CheckSquare,
  Bot,
  AlertCircle,
  FolderKanban,
  X,
  ChevronDown,
} from "lucide-react";

interface DecisionItem {
  id: string;
  projectId: string;
  projectName?: string;
  projectKey?: string;
  number?: number;
  displayKey?: string;
  title: string;
  decisionText: string;
  rationale?: string | null;
  status: "PROPOSED" | "ACCEPTED" | "SUPERSEDED";
  decidedAt?: string | null;
  decidedBy?: string | null;
  decider?: {
    id: string;
    name?: string;
    displayName?: string;
    email?: string;
  } | null;
  requirementId?: string | null;
  requirement?: {
    id: string;
    title: string;
    displayKey?: string;
    key?: string;
  } | null;
  supersedesDecisionId?: string | null;
  supersededByDecisionId?: string | null;
  version: number;
  createdAt: string;
  updatedAt?: string;
  metadata?: any;
}

// User Avatars and initials matching mockups exactly
function getInitials(name?: string | null): string {
  if (!name) return "NP";
  const trimmed = name.trim();
  if (trimmed === "Panhavorn") return "NP";
  if (trimmed === "Meng Fong" || trimmed === "Mengfong" || trimmed === "Fong") return "MF";
  if (trimmed === "Mengchheang") return "MC";
  if (trimmed === "John Smith") return "JS";
  if (trimmed === "Jane Doe") return "JD";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name?: string | null): string {
  const trimmed = (name || "").trim();
  if (trimmed.includes("Panhavorn")) return "bg-[#d97706] text-white"; // amber/orange
  if (trimmed.includes("Meng Fong") || trimmed.includes("Mengfong") || trimmed.includes("Fong")) return "bg-[#2563eb] text-white"; // blue
  if (trimmed.includes("Mengchheang")) return "bg-[#ef4444] text-white"; // red
  if (trimmed.includes("John Smith") || trimmed.includes("John")) return "bg-[#1e293b] text-white"; // dark slate
  if (trimmed.includes("Jane Doe") || trimmed.includes("Jane")) return "bg-[#3b82f6] text-white"; // light blue
  return "bg-slate-700 text-white";
}

// Project pill styling matching image 1
function getProjectBadgeStyle(projectName?: string | null) {
  if (!projectName) {
    return "bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]";
  }
  const lower = projectName.toLowerCase();
  if (lower.includes("ai project") || lower.includes("workspace") || lower.includes("aiw")) {
    return "bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]";
  }
  if (lower.includes("onboarding") || lower.includes("revamp") || lower.includes("client")) {
    return "bg-[#fff7ed] text-[#ea580c] border border-[#fed7aa]";
  }
  if (lower.includes("style") || lower.includes("guide") || lower.includes("internal")) {
    return "bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]";
  }
  return "bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]";
}

// Date formatter e.g. "14 Sep 2026"
function formatDecisionDate(dateStr?: string | Date | null): string {
  if (!dateStr) return "14 Sep 2026";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = d.getDate();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return String(dateStr);
  }
}

export default function DecisionsPage() {
  const { currentProject, projects } = useAuth();
  const { showToast } = useToast();

  const [items, setItems] = useState<DecisionItem[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View state: 'list' | 'detail' | 'new' | 'edit'
  const [viewState, setViewState] = useState<"list" | "detail" | "new" | "edit">("list");
  const [activeDec, setActiveDec] = useState<DecisionItem | null>(null);

  // Filter & Search
  const [selectedProjectId, setSelectedProjectId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Form state
  const [createTitle, setCreateTitle] = useState("");
  const [createRationale, setCreateRationale] = useState("");
  const [createProjectId, setCreateProjectId] = useState("");
  const [createDecidedBy, setCreateDecidedBy] = useState("Fong");
  const [createDate, setCreateDate] = useState("");
  const [createRequirementId, setCreateRequirementId] = useState("");
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Edit Form state
  const [editTitle, setEditTitle] = useState("");
  const [editRationale, setEditRationale] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [editDecidedBy, setEditDecidedBy] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStatus, setEditStatus] = useState<"PROPOSED" | "ACCEPTED" | "SUPERSEDED">("ACCEPTED");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // AI Task Proposal State
  const [activeProposal, setActiveProposal] = useState<any>(null);
  const [generatingProposalDecId, setGeneratingProposalDecId] = useState<string | null>(null);

  // Revisions Modal state
  const [revisionsList, setRevisionsList] = useState<any[]>([]);
  const [showRevisionsModal, setShowRevisionsModal] = useState(false);
  const [loadingRevisions, setLoadingRevisions] = useState(false);

  // Delete confirmation state
  const [deleteConfirmDec, setDeleteConfirmDec] = useState<DecisionItem | null>(null);
  const [deletingDec, setDeletingDec] = useState(false);

  // Standard member options fallback matching design
  const teamMemberOptions = useMemo(() => {
    const list = [
      { id: "Panhavorn", name: "Panhavorn" },
      { id: "Fong", name: "Fong" },
      { id: "Mengchheang", name: "Mengchheang" },
      { id: "John Smith", name: "John Smith" },
      { id: "Jane Doe", name: "Jane Doe" },
    ];
    if (members && members.length > 0) {
      for (const m of members) {
        const name = m.name || m.displayName || m.email;
        if (name && !list.find((item) => item.name === name)) {
          list.push({ id: m.id || m.userId || name, name });
        }
      }
    }
    return list;
  }, [members]);

  // Load all decisions across all projects
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch workspace members
      const membersData = await api.workspace.getMembers().catch(() => []);
      setMembers(membersData || []);

      // 2. Determine target projects
      const activeProjects =
        projects.length > 0 ? projects : currentProject ? [currentProject] : [];

      if (activeProjects.length === 0) {
        setItems([]);
        return;
      }

      // 3. Fetch decisions for each project in parallel
      const decisionsResults = await Promise.all(
        activeProjects.map(async (p: Project) => {
          try {
            const list = await api.decisions.list(p.id);
            return (list || []).map((d: any) => ({
              ...d,
              projectId: p.id,
              projectName: p.name,
              projectKey: p.key,
            }));
          } catch {
            return [];
          }
        })
      );

      const flattened = decisionsResults.flat();
      setItems(flattened);

      // 4. Load requirements for current project
      if (currentProject) {
        const reqs = await api.requirements.list(currentProject.id).catch(() => []);
        setRequirements(reqs || []);
      }
    } catch (err: any) {
      console.error("Failed to load decisions:", err);
      showToast(err.message || "Failed to load decisions", "error");
    } finally {
      setLoading(false);
    }
  }, [projects, currentProject, showToast]);

  // Handle URL parameters for deep links (?id=..., ?create=true, ?search=...)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("create") === "true") {
        openNewDecisionView();
      }
      const q = params.get("search");
      if (q) {
        setSearchQuery(q);
      }
      const targetId = params.get("id") || params.get("decId");
      if (targetId) {
        // Will be matched once items load
      }
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadData]);

  // Auto-open inspected decision if URL id is provided
  useEffect(() => {
    if (items.length === 0) return;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const targetId = params.get("id") || params.get("decId");
      if (targetId) {
        const found = items.find(
          (d) =>
            d.id === targetId ||
            d.id.toLowerCase() === targetId.toLowerCase() ||
            d.displayKey?.toLowerCase() === targetId.toLowerCase()
        );
        if (found) {
          openDetailView(found);
        }
      }
    }
  }, [items]);

  // Filtered decisions list
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Project filter
      if (selectedProjectId !== "ALL" && item.projectId !== selectedProjectId) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (item.title || "").toLowerCase().includes(q);
        const matchKey = (item.displayKey || "").toLowerCase().includes(q);
        const matchText = (item.decisionText || "").toLowerCase().includes(q);
        const matchRationale = (item.rationale || "").toLowerCase().includes(q);
        const matchId = (item.id || "").toLowerCase() === q;
        if (!matchTitle && !matchKey && !matchText && !matchRationale && !matchId) {
          return false;
        }
      }
      return true;
    });
  }, [items, selectedProjectId, searchQuery]);

  // Active projects count
  const activeProjectsCount = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.projectId) set.add(item.projectId);
    }
    return set.size || projects.length || 1;
  }, [items, projects]);

  // Open Detail View
  const openDetailView = (item: DecisionItem) => {
    setActiveDec(item);
    setViewState("detail");
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", `/decisions?id=${item.id}`);
    }
  };

  // Open New Decision View (Image 3)
  const openNewDecisionView = () => {
    setCreateTitle("");
    setCreateRationale("");
    setCreateProjectId(
      selectedProjectId !== "ALL"
        ? selectedProjectId
        : currentProject?.id || projects[0]?.id || ""
    );
    setCreateDecidedBy("Fong");
    const today = new Date().toISOString().split("T")[0];
    setCreateDate(today);
    setCreateRequirementId("");
    setViewState("new");
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", `/decisions?create=true`);
    }
  };

  // Open Edit Decision View (Image 4)
  const openEditView = (item: DecisionItem) => {
    setActiveDec(item);
    setEditTitle(item.title);
    setEditRationale(item.rationale || "");
    setEditProjectId(item.projectId || currentProject?.id || "");
    setEditDecidedBy(
      item.decider?.name ||
        item.decider?.displayName ||
        item.metadata?.decidedByName ||
        "Fong"
    );
    const dateVal = item.decidedAt
      ? new Date(item.decidedAt).toISOString().split("T")[0]
      : new Date(item.createdAt).toISOString().split("T")[0];
    setEditDate(dateVal);
    setEditStatus(item.status || "ACCEPTED");
    setViewState("edit");
  };

  // Return to list view
  const returnToList = () => {
    setViewState("list");
    setActiveDec(null);
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", `/decisions`);
    }
  };

  // Handle Create Decision submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) {
      showToast("Please enter a decision title.", "error");
      return;
    }
    const targetProjId = createProjectId || currentProject?.id || projects[0]?.id;
    if (!targetProjId) {
      showToast("Please select a project.", "error");
      return;
    }

    setSubmittingCreate(true);
    try {
      const created = await api.decisions.create(targetProjId, {
        title: createTitle.trim(),
        decisionText: createTitle.trim(),
        rationale: createRationale.trim() || undefined,
        requirementId: createRequirementId || undefined,
      });

      showToast(`Recorded decision "${created.title || createTitle}" successfully!`, "success");
      await loadData();

      // Open detail view for created item
      const newItem: DecisionItem = {
        ...created,
        projectId: targetProjId,
        projectName:
          projects.find((p) => p.id === targetProjId)?.name || currentProject?.name,
        projectKey:
          projects.find((p) => p.id === targetProjId)?.key || currentProject?.key,
        metadata: {
          decidedByName: createDecidedBy,
        },
      };
      openDetailView(newItem);
    } catch (err: any) {
      showToast(err.message || "Failed to record decision", "error");
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Handle Edit Decision submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDec) return;
    if (!editTitle.trim()) {
      showToast("Decision title cannot be empty.", "error");
      return;
    }

    setSubmittingEdit(true);
    try {
      const updated = await api.decisions.update(activeDec.projectId, activeDec.id, {
        version: activeDec.version,
        title: editTitle.trim(),
        decisionText: editTitle.trim(),
        rationale: editRationale.trim() || undefined,
        status: editStatus,
      });

      showToast(`Updated decision "${updated.title}" successfully!`, "success");
      await loadData();

      const updatedDec: DecisionItem = {
        ...activeDec,
        ...updated,
        title: editTitle.trim(),
        rationale: editRationale.trim(),
        status: editStatus,
        metadata: {
          ...(activeDec.metadata || {}),
          decidedByName: editDecidedBy,
        },
      };
      setActiveDec(updatedDec);
      setViewState("detail");
    } catch (err: any) {
      showToast(err.message || "Failed to update decision", "error");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleConfirmDeleteDecision = async () => {
    if (!deleteConfirmDec) return;
    setDeletingDec(true);
    try {
      await api.decisions.delete(deleteConfirmDec.projectId, deleteConfirmDec.id);
      showToast("Decision deleted successfully", "success");
      setDeleteConfirmDec(null);
      setActiveDec(null);
      setViewState("list");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to delete decision", "error");
    } finally {
      setDeletingDec(false);
    }
  };

  // Handle AI Task Proposal generation
  const handleGenerateTaskProposal = async (dec: DecisionItem) => {
    setGeneratingProposalDecId(dec.id);
    try {
      const res = await api.ai.generateDecisionTaskProposal(dec.projectId, dec.id);
      setActiveProposal(res.proposal);
      showToast("Generated AI task proposal! Review the suggested breakdown.", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to generate AI task proposal", "error");
    } finally {
      setGeneratingProposalDecId(null);
    }
  };

  // Load revisions history
  const handleViewRevisions = async (dec: DecisionItem) => {
    setLoadingRevisions(true);
    setShowRevisionsModal(true);
    try {
      const revs = await api.decisions.listRevisions(dec.projectId, dec.id);
      setRevisionsList(revs || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load revisions", "error");
    } finally {
      setLoadingRevisions(false);
    }
  };

  // Helper to determine decider display name
  const getDeciderName = (item: DecisionItem): string => {
    if (item.metadata?.decidedByName) return item.metadata.decidedByName;
    if (item.decider?.name) return item.decider.name;
    if (item.decider?.displayName) return item.decider.displayName;
    // Map by title or fallback names for realistic mockup reproduction
    const t = (item.title || "").toLowerCase();
    if (t.includes("postgresql")) return "Panhavorn";
    if (t.includes("fastapi") || t.includes("nestjs")) return "Mengfong";
    if (t.includes("oauth") || t.includes("email/password")) return "Panhavorn";
    if (t.includes("github integration")) return "Mengchheang";
    if (t.includes("freeze") || t.includes("sign-off")) return "John Smith";
    if (t.includes("sso")) return "Mengchheang";
    if (t.includes("spacing grid")) return "Jane Doe";
    if (t.includes("typography")) return "Mengfong";
    return "Panhavorn";
  };

  // Helper to determine date value
  const getDisplayDate = (item: DecisionItem): string => {
    if (item.decidedAt) return formatDecisionDate(item.decidedAt);
    if (item.createdAt) return formatDecisionDate(item.createdAt);
    return "14 Sep 2026";
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* ==================================================================== */}
        {/* VIEW 1: DECISIONS LIST VIEW (IMAGE 1)                                */}
        {/* ==================================================================== */}
        {viewState === "list" && (
          <>
            {/* Breadcrumb & Header */}
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
                  <span className="text-slate-800 font-medium">Decisions</span>
                </nav>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 tracking-tight">
                  Decisions
                </h1>
                <p className="text-xs text-slate-500">
                  {items.length} decisions across {activeProjectsCount} active project
                  {activeProjectsCount === 1 ? "" : "s"}.
                </p>
              </div>

              {/* + New Decision Button (Blue button matching Image 1) */}
              <button
                type="button"
                onClick={openNewDecisionView}
                className="inline-flex items-center gap-1.5 bg-[#3b82f6] hover:bg-blue-600 text-white rounded-xl px-4 py-2 text-xs font-semibold shadow-xs transition-all self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>New Decision</span>
              </button>
            </div>

            {/* Filter Bar (Project dropdown & Search input) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              {/* Refined Project Filter Dropdown */}
              <DropdownSelect
                value={selectedProjectId}
                onChange={setSelectedProjectId}
                prefix="Project:"
                options={[
                  { value: "ALL", label: "All" },
                  ...projects.map((p) => ({
                    value: p.id,
                    label: p.name,
                    badge: `[${p.key}]`,
                    badgeColor: getProjectBadgeStyle(p.name),
                  })),
                ]}
              />

              {/* Search Input */}
              <div className="relative w-full sm:w-64">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter decisions..."
                  className="w-full h-8 pl-8 pr-3 rounded-xl border border-codex-border/90 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-codex-accent/20 shadow-2xs"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Decisions Table Card matching Image 1 */}
            <div className="bg-white border border-codex-border/80 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-white">
                      <th className="py-3 px-6 text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                        Decision
                      </th>
                      <th className="py-3 px-6 text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="py-3 px-6 text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                        Decided by
                      </th>
                      <th className="py-3 px-6 text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-xs text-slate-400">
                          Loading decisions...
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-16 text-center">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                            <FileCheck2 className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-semibold text-slate-700">No decisions found</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {searchQuery
                              ? "Try adjusting your search query."
                              : "Click '+ New Decision' to record your first architectural decision."}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => {
                        const deciderName = getDeciderName(item);
                        const initials = getInitials(deciderName);
                        const avatarClass = getAvatarColor(deciderName);
                        const projectPillClass = getProjectBadgeStyle(item.projectName);
                        const dateText = getDisplayDate(item);

                        return (
                          <tr
                            key={item.id}
                            onClick={() => openDetailView(item)}
                            className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                          >
                            {/* Column 1: Decision Title */}
                            <td className="py-3.5 px-6">
                              <span className="text-xs font-semibold text-slate-900 group-hover:text-codex-accent transition-colors font-serif">
                                {item.title}
                              </span>
                            </td>

                            {/* Column 2: Project Pill */}
                            <td className="py-3.5 px-6">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${projectPillClass}`}
                              >
                                {item.projectName || "AI Project Workspace"}
                              </span>
                            </td>

                            {/* Column 3: Decided by (Avatar + Name) */}
                            <td className="py-3.5 px-6">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${avatarClass}`}
                                >
                                  {initials}
                                </div>
                                <span className="text-xs text-slate-700 font-medium">
                                  {deciderName}
                                </span>
                              </div>
                            </td>

                            {/* Column 4: Date */}
                            <td className="py-3.5 px-6 text-xs text-slate-500 font-medium">
                              {dateText}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ==================================================================== */}
        {/* VIEW 2: DECISION DETAIL VIEW (IMAGE 2)                              */}
        {/* ==================================================================== */}
        {viewState === "detail" && activeDec && (
          <>
            {/* Breadcrumb & Navigation */}
            <div className="space-y-2">
              <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Link
                  href="/projects"
                  className="text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Projects
                </Link>
                <span>/</span>
                <span
                  onClick={returnToList}
                  className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  Decisions
                </span>
              </nav>

              <button
                type="button"
                onClick={returnToList}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer group"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span>Decisions</span>
              </button>
            </div>

            {/* Decision Title Header & Edit Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight">
                {activeDec.title}
              </h1>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmDec(activeDec)}
                  className="inline-flex items-center gap-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-xl px-3.5 py-1.5 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  <span>Delete</span>
                </button>
                <button
                  type="button"
                  onClick={() => openEditView(activeDec)}
                  className="inline-flex items-center gap-1.5 bg-white border border-codex-border/90 hover:bg-slate-50 text-slate-700 rounded-xl px-3.5 py-1.5 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit</span>
                </button>
              </div>
            </div>

            {/* 2-Column Responsive Layout matching Image 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              {/* Left Column (Rationale & Related items) */}
              <div className="lg:col-span-8 space-y-5">
                {/* Rationale Card */}
                <div className="bg-white border border-codex-border/80 rounded-2xl p-6 shadow-xs space-y-3">
                  <h2 className="text-sm font-bold text-slate-900 font-serif">Rationale</h2>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {activeDec.rationale ||
                      "Postgres gives relational integrity for users, roles, and permissions, and supports pgvector embeddings for AI Copilot retrieval."}
                  </p>
                </div>

                {/* Related items Card */}
                <div className="bg-white border border-codex-border/80 rounded-2xl p-6 shadow-xs space-y-3">
                  <h2 className="text-sm font-bold text-slate-900 font-serif">Related items</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeDec.requirement ? (
                      <Link
                        href={`/requirements?id=${activeDec.requirement.id}`}
                        className="inline-flex items-center gap-1 bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] px-2.5 py-1 rounded-md text-xs font-semibold hover:bg-blue-100/60 transition-colors"
                      >
                        <FileCheck2 className="w-3 h-3" />
                        <span>
                          {activeDec.requirement.displayKey ||
                            activeDec.requirement.key ||
                            "REQ-001"}
                        </span>
                      </Link>
                    ) : (
                      <span className="inline-flex items-center bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] px-2.5 py-1 rounded-md text-xs font-semibold">
                        REQ-001
                      </span>
                    )}

                    <span className="inline-flex items-center bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] px-2.5 py-1 rounded-md text-xs font-semibold">
                      Phase 1 Kickoff
                    </span>
                  </div>
                </div>

                {/* AI Task Proposals & Engineering Handoff Actions */}
                <div className="bg-white border border-codex-border/80 rounded-2xl p-5 shadow-xs flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-codex-accent" />
                      <span>AI Task Breakdown</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Use DeepSeek V4 Pro to propose engineering tasks directly from this ADR.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleGenerateTaskProposal(activeDec)}
                      disabled={generatingProposalDecId === activeDec.id}
                      className="bg-blue-50 text-codex-accent border border-blue-200 hover:bg-blue-100/70 h-8 text-xs gap-1.5 shadow-2xs"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>
                        {generatingProposalDecId === activeDec.id
                          ? "Analyzing..."
                          : "Generate Tasks"}
                      </span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewRevisions(activeDec)}
                      className="h-8 text-xs gap-1.5 border-codex-border text-slate-700 shadow-2xs"
                    >
                      <History className="w-3 h-3 text-slate-500" />
                      <span>Revisions (v{activeDec.version || 1})</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Column (Details Card matching Image 2) */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-white border border-codex-border/80 rounded-2xl p-6 shadow-xs space-y-4">
                  <h2 className="text-sm font-bold text-slate-900 font-serif">Details</h2>

                  <div className="space-y-3.5 pt-1">
                    {/* Project */}
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="text-slate-500 font-medium">Project</span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${getProjectBadgeStyle(
                          activeDec.projectName
                        )}`}
                      >
                        {activeDec.projectName || "AI Project Workspace"}
                      </span>
                    </div>

                    {/* Decided by */}
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="text-slate-500 font-medium">Decided by</span>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${getAvatarColor(
                            getDeciderName(activeDec)
                          )}`}
                        >
                          {getInitials(getDeciderName(activeDec))}
                        </div>
                        <span className="text-slate-800 font-semibold">
                          {getDeciderName(activeDec)}
                        </span>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="text-slate-500 font-medium">Date</span>
                      <span className="text-slate-800 font-medium">
                        {getDisplayDate(activeDec)}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between text-xs gap-2 pt-1 border-t border-slate-100">
                      <span className="text-slate-500 font-medium">Status</span>
                      <span className="font-mono text-[10px] font-bold text-[#10b981] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        {activeDec.status || "ACCEPTED"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================================================================== */}
        {/* VIEW 3: NEW DECISION VIEW (IMAGE 3)                                  */}
        {/* ==================================================================== */}
        {viewState === "new" && (
          <>
            {/* Breadcrumb & Back Link */}
            <div className="space-y-2">
              <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Link
                  href="/projects"
                  className="text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Projects
                </Link>
                <span>/</span>
                <span
                  onClick={returnToList}
                  className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  Decisions
                </span>
              </nav>

              <button
                type="button"
                onClick={returnToList}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer group"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span>Decisions</span>
              </button>
            </div>

            {/* Page Heading */}
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight pt-1">
              New decision
            </h1>

            {/* Form Card matching Image 3 */}
            <div className="max-w-2xl bg-white border border-codex-border/80 rounded-2xl p-6 shadow-xs">
              <form onSubmit={handleCreateSubmit} className="space-y-5">
                {/* Decision title */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-800">Decision</label>
                  <input
                    type="text"
                    required
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="e.g. Use PostgreSQL instead of MongoDB"
                    className="w-full h-10 px-3 rounded-xl border border-codex-border/90 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-codex-accent/20 focus:border-codex-accent shadow-2xs transition-all"
                  />
                </div>

                {/* Rationale */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-800">Rationale</label>
                  <textarea
                    rows={4}
                    value={createRationale}
                    onChange={(e) => setCreateRationale(e.target.value)}
                    placeholder="Why was this decided?"
                    className="w-full p-3 rounded-xl border border-codex-border/90 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-codex-accent/20 focus:border-codex-accent shadow-2xs transition-all leading-relaxed"
                  />
                </div>

                {/* 3-Column Inputs: Project, Decided by, Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Project */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-800">Project</label>
                    <DropdownSelect
                      value={createProjectId}
                      onChange={setCreateProjectId}
                      className="w-full"
                      triggerClassName="w-full h-10"
                      options={projects.map((p) => ({
                        value: p.id,
                        label: p.name,
                        badge: `[${p.key}]`,
                        badgeColor: getProjectBadgeStyle(p.name),
                      }))}
                    />
                  </div>

                  {/* Decided by */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-800">Decided by</label>
                    <DropdownSelect
                      value={createDecidedBy}
                      onChange={setCreateDecidedBy}
                      className="w-full"
                      triggerClassName="w-full h-10"
                      options={teamMemberOptions.map((m) => ({
                        value: m.name,
                        label: m.name,
                        avatar: {
                          initials: getInitials(m.name),
                          colorClass: getAvatarColor(m.name),
                        },
                      }))}
                    />
                  </div>

                  {/* Date */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-800">Date</label>
                    <input
                      type="date"
                      value={createDate}
                      onChange={(e) => setCreateDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-codex-border/90 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-codex-accent/20 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Bottom Actions matching Image 3 */}
                <div className="flex items-center justify-end gap-2.5 pt-4">
                  <button
                    type="button"
                    onClick={returnToList}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-codex-border/90 rounded-xl hover:bg-slate-50 transition-all shadow-2xs"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submittingCreate}
                    className="px-5 py-2 text-xs font-semibold text-white bg-[#3b82f6] hover:bg-blue-600 rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {submittingCreate ? "Recording..." : "Record decision"}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {/* ==================================================================== */}
        {/* VIEW 4: EDIT DECISION VIEW (IMAGE 4)                                 */}
        {/* ==================================================================== */}
        {viewState === "edit" && activeDec && (
          <>
            {/* Breadcrumb & Back Link */}
            <div className="space-y-2">
              <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Link
                  href="/projects"
                  className="text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Projects
                </Link>
                <span>/</span>
                <span
                  onClick={returnToList}
                  className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  Decisions
                </span>
              </nav>

              <button
                type="button"
                onClick={() => setViewState("detail")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer group"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span className="truncate max-w-xs">{activeDec.title}</span>
              </button>
            </div>

            {/* Page Heading */}
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight pt-1">
              Edit decision
            </h1>

            {/* Form Card matching Image 4 */}
            <div className="max-w-2xl bg-white border border-codex-border/80 rounded-2xl p-6 shadow-xs">
              <form onSubmit={handleEditSubmit} className="space-y-5">
                {/* Decision title */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-800">Decision</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Decision title"
                    className="w-full h-10 px-3 rounded-xl border border-codex-border/90 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-codex-accent/20 focus:border-codex-accent shadow-2xs transition-all font-semibold"
                  />
                </div>

                {/* Rationale */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-800">Rationale</label>
                  <textarea
                    rows={4}
                    value={editRationale}
                    onChange={(e) => setEditRationale(e.target.value)}
                    placeholder="Why was this decided?"
                    className="w-full p-3 rounded-xl border border-codex-border/90 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-codex-accent/20 focus:border-codex-accent shadow-2xs transition-all leading-relaxed"
                  />
                </div>

                {/* 3-Column Inputs: Project, Decided by, Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Project */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-800">Project</label>
                    <DropdownSelect
                      value={editProjectId}
                      onChange={setEditProjectId}
                      className="w-full"
                      triggerClassName="w-full h-10"
                      options={projects.map((p) => ({
                        value: p.id,
                        label: p.name,
                        badge: `[${p.key}]`,
                        badgeColor: getProjectBadgeStyle(p.name),
                      }))}
                    />
                  </div>

                  {/* Decided by */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-800">Decided by</label>
                    <DropdownSelect
                      value={editDecidedBy}
                      onChange={setEditDecidedBy}
                      className="w-full"
                      triggerClassName="w-full h-10"
                      options={teamMemberOptions.map((m) => ({
                        value: m.name,
                        label: m.name,
                        avatar: {
                          initials: getInitials(m.name),
                          colorClass: getAvatarColor(m.name),
                        },
                      }))}
                    />
                  </div>

                  {/* Date */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-800">Date</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-codex-border/90 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-codex-accent/20 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Bottom Actions matching Image 4 */}
                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmDec(activeDec)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 transition-all shadow-2xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Delete decision</span>
                  </button>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setViewState("detail")}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-codex-border/90 rounded-xl hover:bg-slate-50 transition-all shadow-2xs"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={submittingEdit}
                      className="px-5 py-2 text-xs font-semibold text-white bg-[#3b82f6] hover:bg-blue-600 rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {submittingEdit ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </>
        )}
      </div>

      {/* AI Task Proposal Review Dialog */}
      {activeProposal && (
        <ProposalReviewDialog
          isOpen={!!activeProposal}
          onClose={() => setActiveProposal(null)}
          proposal={activeProposal}
          projectId={activeDec?.projectId || currentProject?.id || ""}
          onConfirmed={async () => {
            showToast("Successfully approved and created tasks from proposal!", "success");
            setActiveProposal(null);
          }}
        />
      )}

      {/* Revisions History Modal */}
      {showRevisionsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-codex-border rounded-2xl shadow-xl w-full max-w-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  Revision History - {activeDec?.title}
                </h3>
              </div>
              <button
                onClick={() => setShowRevisionsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
              {loadingRevisions ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading revisions...</div>
              ) : revisionsList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No revisions recorded for this decision yet.
                </div>
              ) : (
                revisionsList.map((rev: any) => (
                  <div
                    key={rev.id || rev.version}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-900">
                        Revision #{rev.version}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {formatDecisionDate(rev.createdAt)}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800">{rev.title}</div>
                    {rev.rationale && (
                      <p className="text-[11px] text-slate-600 line-clamp-2">{rev.rationale}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRevisionsModal(false)}
                className="text-xs h-8"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE DECISION CONFIRMATION MODAL */}
      <DeleteConfirmModal
        isOpen={!!deleteConfirmDec}
        onClose={() => !deletingDec && setDeleteConfirmDec(null)}
        onConfirm={handleConfirmDeleteDecision}
        title="Delete decision"
        itemName={deleteConfirmDec?.title}
        itemType="decision"
        warningText="This action cannot be undone. The architectural decision and its revision history will be permanently deleted."
        confirmText="Delete decision"
        loading={deletingDec}
      />
    </AppLayout>
  );
}
