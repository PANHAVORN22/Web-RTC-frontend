"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { AppLayout } from "@/components/app-layout";
import { ProposalReviewDialog } from "@/components/ai/proposal-review-dialog";
import { FilterDropdown, FilterOption } from "@/components/ui/filter-dropdown";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  X,
  GitPullRequest,
  Sparkles,
  CheckCircle2,
  Copy,
  GitMerge,
  History,
  Bot,
  FileCheck2,
  CheckSquare,
  List,
  Trash2,
  AlertCircle,
  ShieldCheck,
  GitCommit,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Layers,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

interface ProjectInfo {
  id: string;
  name: string;
  key: string;
}

const DECISION_PROJECT_COLORS = [
  "#C0392B",
  "#8B5CF6",
  "#3B82F6",
  "#059669",
  "#D97706",
  "#EC4899",
  "#6366F1",
];

const DECISION_STATUS_OPTIONS: FilterOption[] = [
  { value: "PROPOSED", label: "Proposed", color: "#3B82F6" },
  { value: "ACCEPTED", label: "Accepted", color: "#10B981" },
  { value: "SUPERSEDED", label: "Superseded", color: "#94A3B8" },
];

function getProjectBadgeStyle(projectName?: string | null) {
  if (!projectName) {
    return "bg-slate-100 text-slate-700 border-slate-200";
  }
  const lower = projectName.toLowerCase();
  if (lower.includes("ai project") || lower.includes("workspace")) {
    return "bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]";
  }
  if (lower.includes("onboarding") || lower.includes("revamp") || lower.includes("client")) {
    return "bg-[#fff7ed] text-[#ea580c] border-[#fed7aa]";
  }
  if (lower.includes("style") || lower.includes("guide") || lower.includes("internal")) {
    return "bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]";
  }
  return "bg-purple-50 text-purple-700 border-purple-200";
}

function getStatusDotColor(status: string): string {
  switch (status) {
    case "ACCEPTED":
      return "#10b981"; // green
    case "PROPOSED":
      return "#3b82f6"; // blue
    case "SUPERSEDED":
    default:
      return "#94a3b8"; // grey
  }
}

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case "ACCEPTED":
      return "bg-[#E8F5E9] text-[#2D8A60] border border-[#2D8A60]/20";
    case "SUPERSEDED":
      return "bg-slate-100 text-slate-500 border border-slate-200 line-through";
    case "PROPOSED":
    default:
      return "bg-blue-50 text-[#2563eb] border border-blue-200";
  }
}

function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
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

export default function DecisionsPage() {
  const { currentProject, projects } = useAuth();
  const { showToast } = useToast();

  const [items, setItems] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [selectedProjectId, setSelectedProjectId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [targetDecId, setTargetDecId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "graph">("table");

  // Create Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createProjectId, setCreateProjectId] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createDecisionText, setCreateDecisionText] = useState("");
  const [createRationale, setCreateRationale] = useState("");
  const [createRequirementId, setCreateRequirementId] = useState("");
  const [createSupersedesId, setCreateSupersedesId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createErrorMsg, setCreateErrorMsg] = useState<string | null>(null);

  // Detail / Edit Modal state
  const [activeDec, setActiveDec] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDecisionText, setEditDecisionText] = useState("");
  const [editRationale, setEditRationale] = useState("");
  const [editStatus, setEditStatus] = useState<string>("PROPOSED");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Revisions Modal state
  const [revisionsModalDec, setRevisionsModalDec] = useState<any | null>(null);
  const [revisionsList, setRevisionsList] = useState<any[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);

  // AI Task Proposal State
  const [activeProposal, setActiveProposal] = useState<any>(null);
  const [generatingProposalDecId, setGeneratingProposalDecId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const [data, reqs] = await Promise.all([
        api.decisions.list(currentProject.id),
        api.requirements.list(currentProject.id).catch(() => []),
      ]);
      setItems(data || []);
      setRequirements(reqs || []);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to load decisions", "error");
    } finally {
      setLoading(false);
    }
  }, [currentProject, showToast]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("create") === "true") {
        setShowCreateModal(true);
      }
      const q = params.get("search");
      if (q) {
        setSearchQuery(q);
      }
      const rId = params.get("reqId");
      if (rId) {
        setCreateRequirementId(rId);
        setShowCreateModal(true);
      }
      const t = params.get("title");
      if (t) {
        setCreateTitle(t);
      }
      const targetId = params.get("id") || params.get("decId");
      if (targetId) {
        setTargetDecId(targetId);
      }
    }
    loadData();
  }, [loadData]);

  // Auto-open inspected decision modal if id/decId is in URL
  useEffect(() => {
    if (!targetDecId || items.length === 0) return;
    const found = items.find(
      (d: any) =>
        d.id === targetDecId ||
        d.id?.toLowerCase() === targetDecId.toLowerCase() ||
        d.displayKey?.toLowerCase() === targetDecId.toLowerCase()
    );
    if (found) {
      openDetailModal(found);
      setTargetDecId(null);
    }
  }, [items, targetDecId]);

  // Project options for dropdown
  const activeProjectsList = useMemo(() => {
    const map = new Map<string, ProjectInfo>();
    for (const p of projects) {
      map.set(p.id, { id: p.id, name: p.name, key: p.key });
    }
    for (const item of items) {
      if (item.project) {
        map.set(item.project.id, item.project);
      }
    }
    return Array.from(map.values());
  }, [projects, items]);

  const decisionProjectOptions: FilterOption[] = useMemo(() => {
    return activeProjectsList.map((p, idx) => ({
      value: p.id,
      label: p.name,
      color: DECISION_PROJECT_COLORS[idx % DECISION_PROJECT_COLORS.length],
    }));
  }, [activeProjectsList]);

  // Status Counts for summary pills
  const statusCounts = useMemo(() => {
    let proposed = 0;
    let accepted = 0;
    let superseded = 0;
    for (const item of items) {
      if (item.status === "PROPOSED") proposed++;
      else if (item.status === "ACCEPTED") accepted++;
      else if (item.status === "SUPERSEDED") superseded++;
    }
    return { PROPOSED: proposed, ACCEPTED: accepted, SUPERSEDED: superseded };
  }, [items]);

  // Filtered decisions list
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Project filter
      if (selectedProjectId !== "ALL" && item.projectId !== selectedProjectId) {
        return false;
      }
      // Status filter
      if (selectedStatus !== "ALL" && item.status !== selectedStatus) {
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
  }, [items, selectedProjectId, selectedStatus, searchQuery]);

  const filteredProjectsCount = useMemo(() => {
    const set = new Set<string>();
    for (const item of filteredItems) {
      if (item.projectId) set.add(item.projectId);
    }
    return set.size || (activeProjectsList.length > 0 ? activeProjectsList.length : 1);
  }, [filteredItems, activeProjectsList]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`, "info");
  };

  // Open Create Modal
  const openCreateModal = () => {
    setCreateProjectId(
      selectedProjectId !== "ALL"
        ? selectedProjectId
        : currentProject?.id || activeProjectsList[0]?.id || ""
    );
    setCreateTitle("");
    setCreateDecisionText("");
    setCreateRationale("");
    setCreateRequirementId("");
    setCreateSupersedesId("");
    setCreateErrorMsg(null);
    setShowCreateModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetProjId = createProjectId || currentProject?.id;
    if (!targetProjId || !createTitle.trim() || !createDecisionText.trim()) {
      setCreateErrorMsg("Please provide a title and decision outcome.");
      return;
    }
    setSubmitting(true);
    setCreateErrorMsg(null);
    try {
      const created = await api.decisions.create(targetProjId, {
        title: createTitle.trim(),
        decisionText: createDecisionText.trim(),
        rationale: createRationale.trim() || undefined,
        requirementId: createRequirementId || undefined,
        supersedesDecisionId: createSupersedesId || undefined,
      });

      setShowCreateModal(false);
      showToast(`Created ${created.displayKey || "decision"} successfully!`, "success");
      await loadData();
    } catch (err: any) {
      const rawMsg = err.message || "Failed to create decision";
      const isCycle =
        rawMsg.toLowerCase().includes("cycle") ||
        rawMsg.toLowerCase().includes("supersede itself") ||
        rawMsg.includes("SUPERSESSION_CYCLE");
      const friendlyMsg = isCycle
        ? "Circular supersession detected! A decision cannot supersede itself or form an indirect loop."
        : rawMsg;
      setCreateErrorMsg(friendlyMsg);
      showToast(friendlyMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Detail / Edit Modal
  const openDetailModal = (dec: any) => {
    setActiveDec(dec);
    setEditTitle(dec.title || "");
    setEditDecisionText(dec.decisionText || "");
    setEditRationale(dec.rationale || "");
    setEditStatus(dec.status || "PROPOSED");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDec || !editTitle.trim()) return;
    setEditSubmitting(true);
    try {
      await api.decisions.update(activeDec.projectId || currentProject?.id, activeDec.id, {
        version: activeDec.version,
        title: editTitle.trim(),
        decisionText: editDecisionText.trim() || undefined,
        rationale: editRationale.trim() || undefined,
        status: editStatus,
      });
      showToast("Decision updated successfully", "success");
      setActiveDec(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to update decision", "error");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!activeDec) return;
    if (!confirm(`Are you sure you want to delete decision "${activeDec.title}"?`)) return;
    setEditSubmitting(true);
    try {
      await api.decisions.delete(activeDec.projectId || currentProject?.id, activeDec.id);
      showToast("Decision deleted", "success");
      setActiveDec(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to delete decision", "error");
    } finally {
      setEditSubmitting(false);
    }
  };

  // AI Task Generation from Decision
  const handleGenerateTasksFromDecision = async (dec: any) => {
    const projId = dec.projectId || currentProject?.id;
    if (!projId) return;
    setGeneratingProposalDecId(dec.id);
    try {
      const res = await api.ai.generateDecisionTaskProposal(projId, dec.id);
      setActiveProposal(res.proposal || res);
      showToast(`Generated implementation tasks for ADR ${dec.displayKey || dec.title}! Review before confirming.`, "info");
    } catch (err: any) {
      console.error("Failed to generate task proposal from decision", err);
      showToast(err.message || "Failed to generate tasks from decision", "error");
    } finally {
      setGeneratingProposalDecId(null);
    }
  };

  // Revisions Modal
  const openRevisions = async (dec: any) => {
    const projId = dec.projectId || currentProject?.id;
    if (!projId) return;
    setRevisionsModalDec(dec);
    setLoadingRevisions(true);
    try {
      const revs = await api.decisions.listRevisions(projId, dec.id);
      setRevisionsList(revs || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load decision revisions", "error");
    } finally {
      setLoadingRevisions(false);
    }
  };

  // Supersession Graph computation
  const graphData = useMemo(() => {
    const map = new Map<string, any>();
    items.forEach((item) => map.set(item.id, item));

    const supersededByMap = new Map<string, any[]>();
    items.forEach((item) => {
      if (item.supersedesDecisionId) {
        const list = supersededByMap.get(item.supersedesDecisionId) || [];
        list.push(item);
        supersededByMap.set(item.supersedesDecisionId, list);
      }
    });

    const chainRoots: any[] = [];
    items.forEach((item) => {
      const isRoot = !item.supersedesDecisionId || !map.has(item.supersedesDecisionId);
      const hasChildren = (supersededByMap.get(item.id) || []).length > 0;
      if (isRoot && hasChildren) {
        chainRoots.push(item);
      }
    });

    const chains: any[][] = [];
    chainRoots.forEach((root) => {
      const buildPaths = (curr: any): any[][] => {
        const children = supersededByMap.get(curr.id) || [];
        if (children.length === 0) {
          return [[curr]];
        }
        const paths: any[][] = [];
        children.forEach((child) => {
          const subPaths = buildPaths(child);
          subPaths.forEach((sp) => paths.push([curr, ...sp]));
        });
        return paths;
      };
      chains.push(...buildPaths(root));
    });

    const standalone = items.filter(
      (item) => !item.supersedesDecisionId && (supersededByMap.get(item.id) || []).length === 0
    );

    return { chains, standalone };
  }, [items]);

  return (
    <AppLayout>
      <div className="space-y-5 max-w-7xl mx-auto pb-12">
        {/* Top Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
              <Link href="/dashboard" className="text-[#2563eb] hover:underline font-medium">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-medium">Decisions</span>
            </nav>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-serif">
              Decisions
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {filteredItems.length} architectural decision{filteredItems.length === 1 ? "" : "s"} across{" "}
              {filteredProjectsCount} active {filteredProjectsCount === 1 ? "project" : "projects"}.
            </p>

            {/* Status Summary Pills (Matching Requirements & Tasks page!) */}
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => setSelectedStatus(selectedStatus === "PROPOSED" ? "ALL" : "PROPOSED")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  selectedStatus === "PROPOSED"
                    ? "bg-blue-50 text-blue-900 border-blue-400 ring-1 ring-blue-400 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 shadow-2xs"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                <span>Proposed {statusCounts.PROPOSED}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus(selectedStatus === "ACCEPTED" ? "ALL" : "ACCEPTED")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  selectedStatus === "ACCEPTED"
                    ? "bg-emerald-50 text-emerald-900 border-emerald-400 ring-1 ring-emerald-400 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 shadow-2xs"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                <span>Accepted {statusCounts.ACCEPTED}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus(selectedStatus === "SUPERSEDED" ? "ALL" : "SUPERSEDED")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  selectedStatus === "SUPERSEDED"
                    ? "bg-slate-100 text-slate-900 border-slate-400 ring-1 ring-slate-400 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 shadow-2xs"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#94a3b8]" />
                <span>Superseded {statusCounts.SUPERSEDED}</span>
              </button>
            </div>
          </div>

          <Button
            onClick={openCreateModal}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 self-start sm:self-auto h-9"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Decision</span>
          </Button>
        </div>

        {/* Filter Toolbar & View Switcher */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
          {/* Left: Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Project Filter */}
            <FilterDropdown
              label="Project"
              allLabel="All projects"
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              options={decisionProjectOptions}
            />

            {/* Status Filter */}
            <FilterDropdown
              label="Status"
              allLabel="All statuses"
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={DECISION_STATUS_OPTIONS}
            />
          </div>

          {/* Right: Search Filter & View Switcher */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter decisions..."
                className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 h-9"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* List / Graph Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-[#0f172a] text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("graph")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  viewMode === "graph"
                    ? "bg-[#0f172a] text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <GitMerge className="w-3.5 h-3.5 text-blue-400" />
                <span>Graph</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area: Table / Graph View */}
        {loading ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 p-8 rounded-2xl border border-dashed border-slate-200 bg-white space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
              <GitPullRequest className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No matching decisions found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {items.length === 0
                ? "No architectural decisions recorded yet. Log your first ADR to keep everyone aligned."
                : "Try adjusting your project or status filters, or clear your search term."}
            </p>
            {items.length === 0 ? (
              <Button
                onClick={openCreateModal}
                className="text-xs bg-[#2563eb] hover:bg-[#1d4ed8] text-white mt-2"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Log First Decision
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedProjectId("ALL");
                  setSelectedStatus("ALL");
                  setSearchQuery("");
                }}
                className="text-xs mt-2"
              >
                Reset Filters
              </Button>
            )}
          </div>
        ) : viewMode === "graph" ? (
          /* DAG Graph View */
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50 border border-blue-100/80 flex items-start gap-3.5 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-[#2563eb] text-white flex items-center justify-center shrink-0 shadow-xs">
                <GitMerge className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 font-serif">
                    Architectural Supersession DAG (Directed Acyclic Graph)
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 border border-blue-200">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Kahn&apos;s Cycle Verified</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Decisions evolve over time. When an architecture changes, new ADRs supersede older ones, retiring previous choices while maintaining an immutable historical chain.
                </p>
              </div>
            </div>

            {graphData.chains.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                    Supersession Evolution Chains ({graphData.chains.length})
                  </h3>
                </div>

                <div className="space-y-4">
                  {graphData.chains.map((chain, cIdx) => (
                    <div key={cIdx} className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                      <div className="bg-slate-50/80 px-4 py-2 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
                        <span className="font-semibold text-slate-700">Evolution Path #{cIdx + 1}</span>
                        <span>{chain.length} Decision Generations</span>
                      </div>
                      <div className="p-5 overflow-x-auto">
                        <div className="flex items-center gap-3 min-w-max">
                          {chain.map((stepNode: any, sIdx: number) => {
                            const isLatest = sIdx === chain.length - 1;
                            return (
                              <React.Fragment key={stepNode.id}>
                                <div
                                  onClick={() => openDetailModal(stepNode)}
                                  className={`w-72 p-4 rounded-xl border transition-all cursor-pointer ${
                                    isLatest
                                      ? "bg-blue-50/40 border-blue-400 shadow-xs ring-1 ring-blue-400/20"
                                      : "bg-slate-50/70 border-slate-200 opacity-80 hover:opacity-100"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-200/60">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-xs font-bold text-blue-600">
                                        {stepNode.displayKey}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        v{stepNode.version}
                                      </span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getStatusBadgeStyle(stepNode.status)}`}>
                                      {stepNode.status}
                                    </span>
                                  </div>

                                  <h4 className="text-xs font-bold text-slate-900 font-serif line-clamp-1 mb-1.5" title={stepNode.title}>
                                    {stepNode.title}
                                  </h4>
                                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed bg-white p-2 rounded-lg border border-slate-100 mb-3">
                                    {stepNode.decisionText}
                                  </p>

                                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                                    <span>{formatDate(stepNode.createdAt)}</span>
                                    <span className="text-blue-600 font-medium">Click for details →</span>
                                  </div>
                                </div>

                                {!isLatest && (
                                  <div className="flex flex-col items-center justify-center px-1 text-slate-400">
                                    <ArrowRight className="w-5 h-5 text-blue-600" />
                                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter">
                                      superseded by
                                    </span>
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Baseline Standalone Architectures */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                  Baseline Architecture Standards (Independent • {graphData.standalone.length})
                </h3>
              </div>

              {graphData.standalone.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                  All recorded decisions currently participate in evolution chains.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {graphData.standalone.map((item: any) => (
                    <div
                      key={item.id}
                      onClick={() => openDetailModal(item)}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-2.5 hover:border-slate-300 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                            {item.displayKey}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getStatusBadgeStyle(item.status)}`}>
                            {item.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">v{item.version}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{formatDate(item.createdAt)}</span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 font-serif">{item.title}</h4>
                      <p className="text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                        {item.decisionText}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Table View (Matching Requirements page table exactly!) */
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 w-[42%]">Decision (ADR)</th>
                    <th className="py-3 px-4 w-[16%]">Project</th>
                    <th className="py-3 px-4 w-[14%]">Status</th>
                    <th className="py-3 px-4 w-[16%]">Traceability</th>
                    <th className="py-3 px-4 w-[12%]">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredItems.map((dec) => {
                    const projectName = dec.project?.name || currentProject?.name || "AI Workspace";
                    const projectBadgeStyle = getProjectBadgeStyle(projectName);
                    const dotColor = getStatusDotColor(dec.status);
                    const relativeTime = formatRelativeTime(dec.updatedAt || dec.createdAt);
                    const linkedReq = dec.requirement || requirements.find((r) => r.id === dec.requirementId);
                    const predecessor = items.find((i) => i.id === dec.supersedesDecisionId);

                    return (
                      <tr
                        key={dec.id}
                        onClick={() => openDetailModal(dec)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        {/* Title & Outcome snippet */}
                        <td className="py-3 px-4">
                          <div className="flex items-start gap-2.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                              style={{ backgroundColor: dotColor }}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                  {dec.displayKey || dec.id.slice(0, 8)}
                                </span>
                                <span className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
                                  {dec.title}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
                                {dec.decisionText}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Project */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] font-medium border truncate max-w-[150px] ${projectBadgeStyle}`}
                          >
                            {projectName}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium ${getStatusBadgeStyle(
                              dec.status
                            )}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
                            <span>{dec.status}</span>
                          </span>
                        </td>

                        {/* Traceability: Predecessor / Linked REQ */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1 text-[11px] font-mono">
                            {predecessor && (
                              <span className="text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded inline-flex items-center gap-1 truncate max-w-[150px]">
                                <GitMerge className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>Supersedes: {predecessor.displayKey}</span>
                              </span>
                            )}
                            {linkedReq && (
                              <span className="text-blue-700 bg-blue-50 border border-blue-200/80 px-1.5 py-0.5 rounded inline-flex items-center gap-1 truncate max-w-[150px]">
                                <FileCheck2 className="w-3 h-3 text-blue-600 shrink-0" />
                                <span>Req: {linkedReq.displayKey || linkedReq.title}</span>
                              </span>
                            )}
                            {!predecessor && !linkedReq && (
                              <span className="text-slate-400 font-sans text-xs">-</span>
                            )}
                          </div>
                        </td>

                        {/* Updated */}
                        <td className="py-3 px-4 text-slate-500 text-[11.5px] whitespace-nowrap">
                          {relativeTime}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CREATE DECISION MODAL (Matching Requirements create modal!) */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div
              className="fixed inset-0"
              onClick={() => !submitting && setShowCreateModal(false)}
            />
            <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-10 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <GitPullRequest className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900 font-serif">
                    New Architectural Decision
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto flex-1">
                {createErrorMsg && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{createErrorMsg}</span>
                  </div>
                )}

                {/* Project Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Project Workspace *</label>
                  <select
                    value={createProjectId}
                    onChange={(e) => setCreateProjectId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    {activeProjectsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.key})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Decision Title *</label>
                  <Input
                    required
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="e.g. Adopt Argon2id for User Password Hashing"
                    className="text-xs h-9 font-medium"
                  />
                </div>

                {/* Link Requirement & Supersedes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Link Requirement (Optional)</label>
                    <select
                      value={createRequirementId}
                      onChange={(e) => setCreateRequirementId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="">-- None (Standalone ADR) --</option>
                      {requirements.map((req) => (
                        <option key={req.id} value={req.id}>
                          {req.displayKey ? `[${req.displayKey}] ` : ""}{req.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Supersedes ADR (Optional)</label>
                    <select
                      value={createSupersedesId}
                      onChange={(e) => setCreateSupersedesId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="">-- None (Independent Baseline) --</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.displayKey ? `[${item.displayKey}] ` : ""}{item.title} ({item.status})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Decision Text */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Decision Outcome *</label>
                  <textarea
                    required
                    rows={3}
                    value={createDecisionText}
                    onChange={(e) => setCreateDecisionText(e.target.value)}
                    placeholder="Technical specification and choices made..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Rationale */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Rationale & Context (Optional)</label>
                  <textarea
                    rows={2}
                    value={createRationale}
                    onChange={(e) => setCreateRationale(e.target.value)}
                    placeholder="Why was this option chosen over alternatives?"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateModal(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitting}
                    className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs px-4"
                  >
                    {submitting ? "Saving..." : "Create Decision"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DECISION DETAIL / EDIT MODAL (Matching Requirements Detail Modal!) */}
        {activeDec && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div
              className="fixed inset-0"
              onClick={() => !editSubmitting && setActiveDec(null)}
            />
            <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-10 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: getStatusDotColor(editStatus) }}
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeDec.displayKey, "key")}
                    className="font-mono text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1 transition-all"
                    title="Click to copy key"
                  >
                    <span>{activeDec.displayKey || activeDec.id.substring(0, 8)}</span>
                    <Copy className="w-3 h-3 text-blue-500" />
                  </button>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium border truncate max-w-[180px] ${getProjectBadgeStyle(
                      activeDec.project?.name || currentProject?.name
                    )}`}
                  >
                    {activeDec.project?.name || currentProject?.name || "Workspace"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDec(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleUpdate} className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Decision Title *</label>
                  <Input
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-xs h-9 font-medium"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="PROPOSED">Proposed</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="SUPERSEDED">Superseded</option>
                  </select>
                </div>

                {/* Decision Outcome */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Decision Outcome *</label>
                  <textarea
                    required
                    rows={3}
                    value={editDecisionText}
                    onChange={(e) => setEditDecisionText(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
                  />
                </div>

                {/* Rationale */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Rationale & Context</label>
                  <textarea
                    rows={2}
                    value={editRationale}
                    onChange={(e) => setEditRationale(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
                  />
                </div>

                {/* Cross-Workflow Actions Hub */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  {/* Convert to Tasks with AI */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={generatingProposalDecId === activeDec.id}
                    onClick={() => handleGenerateTasksFromDecision(activeDec)}
                    className="h-8 text-xs border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 gap-1.5 px-3"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${generatingProposalDecId === activeDec.id ? "animate-spin" : "text-blue-600"}`} />
                    <span>{generatingProposalDecId === activeDec.id ? "Generating Tasks..." : "Convert to Tasks with AI"}</span>
                  </Button>

                  {/* Manual Task Link */}
                  <Link
                    href={`/tasks?create=true&title=${encodeURIComponent(`Implement ADR [${activeDec.displayKey}]: ${activeDec.title}`)}&priority=HIGH`}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 px-3"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-[#2D8A60]" />
                      <span>Create Task</span>
                    </Button>
                  </Link>

                  {/* Revisions History */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openRevisions(activeDec)}
                    className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 px-3"
                  >
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span>Revisions (v{activeDec.version})</span>
                  </Button>

                  {/* Discuss with Copilot */}
                  <Link
                    href={`/assistant?prompt=${encodeURIComponent(`Review architectural decision [${activeDec.displayKey}]: "${activeDec.title}". Outcome: "${activeDec.decisionText}". Rationale: "${activeDec.rationale || ''}". What are the key implementation requirements and trade-offs?`)}&mode=DEVELOPER`}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-slate-600 hover:text-slate-900 gap-1.5 px-2.5"
                    >
                      <Bot className="w-3.5 h-3.5 text-blue-600" />
                      <span>Copilot</span>
                    </Button>
                  </Link>
                </div>

                {/* Footer buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 px-2.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveDec(null)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={editSubmitting}
                      className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs px-4"
                    >
                      {editSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* REVISIONS HISTORY MODAL */}
        {revisionsModalDec && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                      {revisionsModalDec.displayKey || revisionsModalDec.id.substring(0, 8)}
                    </span>
                    <h2 className="text-base font-bold text-slate-900 font-serif">
                      Revision History
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                    {revisionsModalDec.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRevisionsModalDec(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {loadingRevisions ? (
                  <div className="py-12 text-center text-xs text-slate-400">Loading revision audit trail...</div>
                ) : revisionsList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl p-4 border border-dashed border-slate-200">
                    No historical revisions recorded yet. This decision is currently at baseline version (v{revisionsModalDec.version}).
                  </div>
                ) : (
                  <div className="space-y-4">
                    {revisionsList.map((rev: any, idx: number) => (
                      <div
                        key={rev.id || idx}
                        className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-2 relative"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-900 text-white">
                              v{rev.version}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getStatusBadgeStyle(rev.status)}`}>
                              {rev.status}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatDateTime(rev.createdAt)}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 font-serif">{rev.title}</h4>
                        <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-100 leading-relaxed">
                          {rev.decisionText}
                        </div>
                        {rev.rationale && (
                          <div className="text-[11px] text-slate-500 bg-white/60 p-2.5 rounded-lg border border-slate-100 italic leading-relaxed">
                            <span className="font-semibold not-italic text-slate-600">Rationale: </span>
                            {rev.rationale}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 pt-1">
                          Snapshot captured by: {rev.changedBy || "System"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRevisionsModalDec(null)}
                  className="text-xs"
                >
                  Close History
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* AI Proposal Review Dialog */}
        {activeProposal && (
          <ProposalReviewDialog
            isOpen={!!activeProposal}
            onClose={() => setActiveProposal(null)}
            proposal={activeProposal}
            projectId={activeProposal.projectId || currentProject?.id || ""}
            onConfirmed={() => {
              setActiveProposal(null);
              loadData();
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
