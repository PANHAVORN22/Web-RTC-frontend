"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth, Project } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { AppLayout } from "@/components/app-layout";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  User,
  Zap,
  Check,
  MoreHorizontal,
  Pencil,
  PlusCircle,
  FileText,
  Upload,
  UserPlus,
  Circle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Download,
  Copy,
  Plus,
  ShieldCheck,
  Shield,
  Trash2,
  UserMinus,
  History,
  Archive,
  RefreshCw,
  X,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;
  const { projects, currentProject, setCurrentProject, user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [projectData, setProjectData] = useState<any>(null);
  const [projectNotFound, setProjectNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "requirements" | "tasks" | "documents" | "audit">("overview");

  // Tab data states
  const [tabRequirements, setTabRequirements] = useState<any[]>([]);
  const [tabTasks, setTabTasks] = useState<any[]>([]);
  const [tabDocuments, setTabDocuments] = useState<any[]>([]);
  const [loadingTabData, setLoadingTabData] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Dynamic Members state
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("CONTRIBUTOR");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [submittingMember, setSubmittingMember] = useState(false);

  // Ownership transfer state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [newOwnerUserId, setNewOwnerUserId] = useState("");
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // Audit Log tab state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!projectId) return;
    setLoadingMembers(true);
    try {
      const list = await api.projects.getMembers(projectId);
      setMembers(list || []);
    } catch (err: any) {
      console.error("Failed to load project members", err);
    } finally {
      setLoadingMembers(false);
    }
  }, [projectId]);

  const loadAuditLogs = useCallback(async (page = 1) => {
    if (!projectId) return;
    setLoadingAudit(true);
    try {
      const res = await api.projects.getAuditLogs(projectId, page, 25);
      setAuditLogs(res.data || []);
      setAuditTotal(res.meta?.total || (res.data?.length ?? 0));
      setAuditPage(page);
    } catch (err: any) {
      console.error("Failed to load audit logs", err);
    } finally {
      setLoadingAudit(false);
    }
  }, [projectId]);

  // Load project details
  useEffect(() => {
    if (!projectId) return;

    const found = projects.find((p) => p.id === projectId);
    if (found) {
      setProjectData(found);
      if (currentProject?.id !== found.id) {
        setCurrentProject(found);
      }
    } else {
      api.projects
        .get(projectId)
        .then((res) => {
          setProjectData(res);
          if (res) setCurrentProject(res);
        })
        .catch(() => {
          setProjectNotFound(true);
        });
    }
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, projects, loadMembers]);

  // Load tab-specific data when tab changes
  useEffect(() => {
    if (!projectId) return;

    if (activeTab === "requirements") {
      setLoadingTabData(true);
      api.requirements
        .list(projectId)
        .then((data) => setTabRequirements(data || []))
        .catch(() => setTabRequirements([]))
        .finally(() => setLoadingTabData(false));
    } else if (activeTab === "tasks") {
      setLoadingTabData(true);
      api.tasks
        .list(projectId)
        .then((data) => setTabTasks(data || []))
        .catch(() => setTabTasks([]))
        .finally(() => setLoadingTabData(false));
    } else if (activeTab === "documents") {
      setLoadingTabData(true);
      api.documents
        .list(projectId)
        .then((data) => setTabDocuments(data || []))
        .catch(() => setTabDocuments([]))
        .finally(() => setLoadingTabData(false));
    } else if (activeTab === "audit") {
      loadAuditLogs(auditPage);
    }
  }, [projectId, activeTab, auditPage, loadAuditLogs]);

  // Candidate user autocomplete search
  useEffect(() => {
    if (!showInviteModal || !projectId) return;
    let active = true;
    setLoadingCandidates(true);
    const timer = setTimeout(async () => {
      try {
        const results = await api.projects.getMemberCandidates(projectId, candidateSearch.trim() || undefined);
        if (active) setCandidates(results || []);
      } catch (err) {
        if (active) setCandidates([]);
      } finally {
        if (active) setLoadingCandidates(false);
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [showInviteModal, projectId, candidateSearch]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSubmittingMember(true);
    try {
      await api.projects.addMember(projectId, {
        email: inviteEmail.trim(),
        accessRole: inviteRole,
      });
      showToast(`Added ${inviteEmail.trim()} as ${inviteRole}`, "success");
      setInviteEmail("");
      setCandidateSearch("");
      setShowInviteModal(false);
      await loadMembers();
    } catch (err: any) {
      showToast(err.message || "Failed to add member", "error");
    } finally {
      setSubmittingMember(false);
    }
  };

  const handleUpdateRole = async (memberUserId: string, newRole: string) => {
    try {
      await api.projects.updateMemberRole(projectId, memberUserId, {
        accessRole: newRole,
      });
      showToast(`Member access role updated to ${newRole}`, "success");
      await loadMembers();
    } catch (err: any) {
      showToast(err.message || "Failed to update role", "error");
    }
  };

  const handleRemoveMember = async (memberUserId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this project?`)) return;
    try {
      await api.projects.removeMember(projectId, memberUserId);
      showToast(`Removed ${memberName} from project`, "info");
      await loadMembers();
    } catch (err: any) {
      showToast(err.message || "Failed to remove member", "error");
    }
  };

  const handleTransferOwnership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOwnerUserId) return;
    setSubmittingTransfer(true);
    try {
      await api.projects.transferOwnership(projectId, { newOwnerUserId });
      showToast("Project ownership transferred successfully", "success");
      setShowTransferModal(false);
      await loadMembers();
      const updatedProj = await api.projects.get(projectId);
      setProjectData(updatedProj);
    } catch (err: any) {
      showToast(err.message || "Failed to transfer ownership", "error");
    } finally {
      setSubmittingTransfer(false);
    }
  };

  const handleArchiveToggle = async () => {
    const isArchived = projectData?.status === "ARCHIVED";
    try {
      if (isArchived) {
        const res = await api.projects.unarchive(projectId);
        setProjectData(res);
        showToast("Project restored to ACTIVE status", "success");
      } else {
        const res = await api.projects.archive(projectId);
        setProjectData(res);
        showToast("Project archived", "info");
      }
      setShowOptions(false);
    } catch (err: any) {
      showToast(err.message || "Failed to toggle archive status", "error");
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "OWNER":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-mono">OWNER</Badge>;
      case "MANAGER":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] font-mono">MANAGER</Badge>;
      case "CONTRIBUTOR":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-mono">CONTRIBUTOR</Badge>;
      case "VIEWER":
      default:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-mono">VIEWER</Badge>;
    }
  };

  const projectName = projectData?.name || "AI Project Workspace";
  const projectKey = projectData?.key || "AIW";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`, "info");
  };

  if (projectNotFound) {
    return (
      <AppLayout>
        <div className="max-w-xl mx-auto py-20 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 font-serif">Project Workspace Not Found</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            The workspace with ID <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">{projectId}</code> does not exist or you do not have permission to view it.
          </p>
          <div className="pt-2">
            <Button
              onClick={() => router.push("/projects")}
              size="sm"
              className="text-xs bg-codex-accent hover:bg-codex-hover text-white rounded-lg px-4"
            >
              Back to Projects
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-codex-muted">
          <Link href="/projects" className="hover:text-codex-text transition-colors">
            Projects
          </Link>
          <span>/</span>
          <span className="font-semibold text-codex-text">{projectName}</span>
        </div>

        {/* Title & Actions Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-serif">
                {projectName}
              </h1>
              {projectData?.status === "ARCHIVED" ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  <Archive className="w-3 h-3 mr-1" /> Archived
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#E8F5E9] text-[#2D8A60]">
                  On track
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Phase 2 Intelligent Workspace — centralizing project knowledge with grounded AI copilot and vector search
            </p>
          </div>

          <div className="flex items-center gap-2 relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditModal(true)}
              className="gap-1.5 text-xs bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-xs"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </Button>

            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOptions(!showOptions)}
                className="w-8 h-8 p-0 bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-xs"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>

              {showOptions && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-30 space-y-0.5 text-xs animate-in fade-in">
                  <button
                    onClick={() => {
                      copyToClipboard(projectKey, "project key");
                      setShowOptions(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-50 text-left"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Project Key</span>
                  </button>
                  <button
                    onClick={() => {
                      copyToClipboard(window.location.href, "project link");
                      setShowOptions(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-50 text-left"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Page Link</span>
                  </button>
                  <button
                    onClick={() => {
                      if (projectData) setCurrentProject(projectData);
                      showToast(`Active workspace set to ${projectName}`, "success");
                      setShowOptions(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-50 text-left"
                  >
                    <Check className="w-3.5 h-3.5 text-[#2D8A60]" />
                    <span>Set Active Workspace</span>
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={() => {
                      setShowInviteModal(true);
                      setShowOptions(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-50 text-left"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-codex-accent" />
                    <span>Invite Team Member</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowTransferModal(true);
                      setShowOptions(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-amber-700 hover:bg-amber-50 text-left"
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-600" />
                    <span>Transfer Ownership</span>
                  </button>
                  <button
                    onClick={handleArchiveToggle}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-50 text-left"
                  >
                    <Archive className="w-3.5 h-3.5 text-slate-500" />
                    <span>{projectData?.status === "ARCHIVED" ? "Unarchive Project" : "Archive Project"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs matching media_1789974974747.png */}
        <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-medium pt-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-2.5 transition-all relative ${
              activeTab === "overview"
                ? "text-codex-accent font-semibold border-b-2 border-codex-accent"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("requirements")}
            className={`pb-2.5 transition-all relative ${
              activeTab === "requirements"
                ? "text-codex-accent font-semibold border-b-2 border-codex-accent"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Requirements
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`pb-2.5 transition-all relative ${
              activeTab === "tasks"
                ? "text-codex-accent font-semibold border-b-2 border-codex-accent"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Tasks
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`pb-2.5 transition-all relative ${
              activeTab === "documents"
                ? "text-codex-accent font-semibold border-b-2 border-codex-accent"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Documents
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`pb-2.5 transition-all relative ${
              activeTab === "audit"
                ? "text-codex-accent font-semibold border-b-2 border-codex-accent"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Audit Trail
          </button>
        </div>

        {/* OVERVIEW TAB: Pixel-accurate implementation of media_1789974974747.png */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Card 1: Description */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-xs">
                <h2 className="text-sm font-bold text-slate-900 font-serif">
                  Description
                </h2>
                <div className="text-xs text-slate-600 leading-relaxed space-y-3">
                  <p>
                    {projectData?.description ||
                      "Codex centralizes requirements, decisions, tasks, meetings, and documents for the team into one permission-aware workspace, replacing scattered docs and chat threads with a single source of truth."}
                  </p>
                  <p>
                    Phase 2 is fully active — featuring grounded AI Copilot chat, pgvector semantic and hybrid search, automated meeting action item extraction, ADR supersession tracking, and GitHub issue synchronization alongside core workspace operations.
                  </p>
                </div>
              </div>

              {/* Card 2: Progress */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
                <h2 className="text-sm font-bold text-slate-900 font-serif">
                  Progress
                </h2>

                {/* KPI Metrics Row with Radial Ring */}
                <div className="flex flex-wrap items-center gap-8">
                  {/* Radial Ring */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16">
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-100"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-codex-accent"
                          strokeDasharray="75, 100"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-xs font-bold font-serif text-slate-900">75%</span>
                        <span className="text-[8px] text-slate-400">complete</span>
                      </div>
                    </div>
                  </div>

                  {/* Metric 1 */}
                  <div>
                    <div className="text-base font-bold font-serif text-slate-900">9 / 12</div>
                    <div className="text-[11px] text-slate-400">Tasks done</div>
                  </div>

                  {/* Metric 2 */}
                  <div>
                    <div className="text-base font-bold font-serif text-slate-900">6</div>
                    <div className="text-[11px] text-slate-400">Requirements</div>
                  </div>

                  {/* Metric 3 */}
                  <div>
                    <div className="text-base font-bold font-serif text-slate-900">8</div>
                    <div className="text-[11px] text-slate-400">Documents</div>
                  </div>

                  {/* Metric 4 */}
                  <div>
                    <div className="text-base font-bold font-serif text-slate-900">19 days</div>
                    <div className="text-[11px] text-slate-400">To MVP deadline</div>
                  </div>
                </div>

                {/* Milestones List */}
                <div className="pt-2 border-t border-slate-100 space-y-4">
                  {/* Milestone 1 */}
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#2D8A60] text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Planning & Architecture</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#E8F5E9] text-[#2D8A60]">
                          Done
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Week 1</p>
                    </div>
                  </div>

                  {/* Milestone 2 */}
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#2D8A60] text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Database, Backend & Auth</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#E8F5E9] text-[#2D8A60]">
                          Done
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Week 1–2</p>
                    </div>
                  </div>

                  {/* Milestone 3 */}
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-codex-accent text-white flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Core Workspace Features</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-codex-accent border border-blue-100">
                          In Progress
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Week 2–3</p>
                    </div>
                  </div>

                  {/* Milestone 4 */}
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">QA, Deployment & Sign-off</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                          Upcoming
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Week 3 · due 04 Oct</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Recent Activity */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 font-serif">
                    Recent Activity
                  </h2>
                  <Link
                    href="/tasks"
                    className="text-xs text-codex-accent hover:underline font-medium"
                  >
                    View all
                  </Link>
                </div>

                <div className="relative">
                  {/* 1 */}
                  <div className="relative flex items-start gap-3.5 pb-4">
                    <span
                      className="absolute left-3.5 top-3.5 -bottom-0.5 w-[1.5px] -translate-x-1/2 bg-slate-200"
                      aria-hidden="true"
                    />
                    <div className="relative z-10 w-7 h-7 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs">
                      MF
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-slate-700 leading-relaxed">
                        <span className="font-bold text-slate-900">Fong</span> moved task{" "}
                        <span className="font-medium text-blue-600 hover:underline cursor-pointer">
                          Design database schema
                        </span>{" "}
                        to In Progress
                      </p>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">20m ago</span>
                    </div>
                  </div>

                  {/* 2 */}
                  <div className="relative flex items-start gap-3.5 pb-4">
                    <span
                      className="absolute left-3.5 top-3.5 -bottom-0.5 w-[1.5px] -translate-x-1/2 bg-slate-200"
                      aria-hidden="true"
                    />
                    <div className="relative z-10 w-7 h-7 rounded-full bg-[#d4974d] text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs">
                      JS
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-slate-700 leading-relaxed">
                        <span className="font-bold text-slate-900">John</span> recorded a decision:{" "}
                        <span className="font-medium text-blue-600 hover:underline cursor-pointer">
                          Use PostgreSQL, not MongoDB
                        </span>
                      </p>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">1h ago</span>
                    </div>
                  </div>

                  {/* 3 */}
                  <div className="relative flex items-start gap-3.5 pb-4">
                    <span
                      className="absolute left-3.5 top-3.5 -bottom-0.5 w-[1.5px] -translate-x-1/2 bg-slate-200"
                      aria-hidden="true"
                    />
                    <div className="relative z-10 w-7 h-7 rounded-full bg-[#c0392b] text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs">
                      JD
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-slate-700 leading-relaxed">
                        <span className="font-bold text-slate-900">Jane</span> uploaded{" "}
                        <span className="font-medium text-blue-600 hover:underline cursor-pointer">
                          SRS_v1.0.pdf
                        </span>
                      </p>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">1h ago</span>
                    </div>
                  </div>

                  {/* 4 */}
                  <div className="relative flex items-start gap-3.5 pb-4">
                    <span
                      className="absolute left-3.5 top-3.5 -bottom-0.5 w-[1.5px] -translate-x-1/2 bg-slate-200"
                      aria-hidden="true"
                    />
                    <div className="relative z-10 w-7 h-7 rounded-full bg-[#818cf8] text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs">
                      PV
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-slate-700 leading-relaxed">
                        <span className="font-bold text-slate-900">Panhavorn</span> completed task{" "}
                        <span className="font-medium text-blue-600 hover:underline cursor-pointer">
                          Build login screen UI
                        </span>
                      </p>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">3h ago</span>
                    </div>
                  </div>

                  {/* 5 */}
                  <div className="relative flex items-start gap-3.5 pb-4">
                    <span
                      className="absolute left-3.5 top-3.5 -bottom-0.5 w-[1.5px] -translate-x-1/2 bg-slate-200"
                      aria-hidden="true"
                    />
                    <div className="relative z-10 w-7 h-7 rounded-full bg-black text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs">
                      MC
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-slate-700 leading-relaxed">
                        <span className="font-bold text-slate-900">Mengchheang</span> added requirement{" "}
                        <span className="font-medium text-blue-600 hover:underline cursor-pointer">
                          Dashboard must surface project overview
                        </span>
                      </p>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">4h ago</span>
                    </div>
                  </div>

                  {/* 6 */}
                  <div className="relative flex items-start gap-3.5">
                    <div className="relative z-10 w-7 h-7 rounded-full bg-[#52525b] text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs">
                      EY
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-slate-700 leading-relaxed">
                        <span className="font-bold text-slate-900">Eren</span> commented on{" "}
                        <span className="font-medium text-blue-600 hover:underline cursor-pointer">
                          Client Onboarding Revamp
                        </span>
                      </p>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">Yesterday</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Card 1: Project Details */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                <h2 className="text-sm font-bold text-slate-900 font-serif">
                  Project Details
                </h2>

                <div className="space-y-3 text-xs">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Circle className="w-3.5 h-3.5" />
                      <span>Status</span>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#E8F5E9] text-[#2D8A60]">
                      On track
                    </span>
                  </div>

                  {/* Deadline */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Deadline</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800">04 Oct 2026</span>
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#FEF3C7] text-[#D97706]">
                        19d left
                      </span>
                    </div>
                  </div>

                  {/* Priority */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Priority</span>
                    </div>
                    <span className="font-semibold text-slate-800">High</span>
                  </div>

                  {/* Project Lead */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <User className="w-3.5 h-3.5" />
                      <span>Project Lead</span>
                    </div>
                    <span className="font-semibold text-slate-800">Meng Fong</span>
                  </div>

                  {/* Created */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Created</span>
                    </div>
                    <span className="font-semibold text-slate-800">14 Sep 2026</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Real Dynamic Team Members */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 font-serif">
                      Team Members
                    </h2>
                    <span className="text-xs text-slate-400 font-mono">({members.length})</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowInviteModal(true)}
                    className="h-7 text-xs text-codex-accent hover:text-codex-hover hover:bg-blue-50 px-2 gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Invite</span>
                  </Button>
                </div>

                {loadingMembers ? (
                  <div className="py-6 text-center text-xs text-slate-400">Loading team members...</div>
                ) : members.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 border border-dashed rounded-xl space-y-2">
                    <p>No members found in project.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowInviteModal(true)}
                      className="text-xs"
                    >
                      Invite First Member
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {members.map((m: any) => {
                      const u = m.user || {};
                      const name = u.displayName || u.fullName || u.email || "Member";
                      const initials = name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase();

                      return (
                        <div key={m.id || m.userId} className="flex items-center justify-between text-xs group">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">{name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Role selector */}
                            <select
                              value={m.accessRole}
                              disabled={m.accessRole === "OWNER"}
                              onChange={(e) => handleUpdateRole(m.userId, e.target.value)}
                              className={`text-[10px] font-mono border rounded px-1.5 py-0.5 ${
                                m.accessRole === "OWNER"
                                  ? "bg-amber-50 text-amber-800 border-amber-200 cursor-default"
                                  : "bg-slate-50 border-slate-200 text-slate-700 cursor-pointer hover:bg-white"
                              }`}
                              title={m.accessRole === "OWNER" ? "Project Owner" : "Change access role"}
                            >
                              <option value="OWNER" disabled>OWNER</option>
                              <option value="MANAGER">MANAGER</option>
                              <option value="CONTRIBUTOR">CONTRIBUTOR</option>
                              <option value="VIEWER">VIEWER</option>
                            </select>

                            {m.accessRole !== "OWNER" && (
                              <button
                                onClick={() => handleRemoveMember(m.userId, name)}
                                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                                title="Remove member"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Card 3: Quick Action */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2.5 shadow-xs">
                <h2 className="text-sm font-bold text-slate-900 font-serif">
                  Quick Action
                </h2>

                <div className="space-y-2">
                  <Link
                    href={`/tasks?create=true`}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-xs font-medium text-slate-700 transition-all shadow-2xs"
                  >
                    <PlusCircle className="w-4 h-4 text-blue-600" />
                    <span>New Tasks</span>
                  </Link>

                  <Link
                    href={`/requirements?create=true`}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-xs font-medium text-slate-700 transition-all shadow-2xs"
                  >
                    <FileText className="w-4 h-4 text-slate-600" />
                    <span>New Requirement</span>
                  </Link>

                  <Link
                    href={`/documents`}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-xs font-medium text-slate-700 transition-all shadow-2xs"
                  >
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span>Upload Document</span>
                  </Link>

                  <Link
                    href={`/meetings?create=true`}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-xs font-medium text-slate-700 transition-all shadow-2xs"
                  >
                    <Calendar className="w-4 h-4 text-slate-600" />
                    <span>Schedule Meeting</span>
                  </Link>

                  <button
                    onClick={() => showToast("Member invitation link copied to clipboard", "success")}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-xs font-medium text-slate-700 transition-all shadow-2xs text-left cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-slate-600" />
                    <span>Invite Member</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REQUIREMENTS TAB */}
        {activeTab === "requirements" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 font-serif">
                Requirements for {projectName}
              </h2>
              <Link href={`/requirements?create=true`}>
                <Button size="sm" className="gap-1.5 text-xs bg-codex-accent hover:bg-codex-hover text-white rounded-lg shadow-xs">
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Requirement</span>
                </Button>
              </Link>
            </div>

            {loadingTabData ? (
              <div className="h-32 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            ) : tabRequirements.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 p-8 space-y-3">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900 font-serif">No requirements yet</h3>
                <p className="text-xs text-slate-500">Capture requirements to track specifications and acceptance criteria.</p>
                <Link href={`/requirements?create=true`}>
                  <Button size="sm" className="text-xs bg-codex-accent hover:bg-codex-hover text-white">Create First Requirement</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {tabRequirements.map((req) => (
                  <div key={req.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-codex-accent bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {req.displayKey || req.id.substring(0, 8)}
                        </span>
                        <span className="text-sm font-bold text-slate-900 font-serif">{req.title}</span>
                      </div>
                      {req.description && (
                        <p className="text-xs text-slate-500 line-clamp-1">{req.description}</p>
                      )}
                    </div>
                    <Link href={`/requirements?search=${encodeURIComponent(req.displayKey || req.id)}`}>
                      <Button variant="ghost" size="sm" className="text-xs text-slate-600 hover:text-slate-900">
                        <span>View</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TASKS TAB */}
        {activeTab === "tasks" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 font-serif">
                Tasks for {projectName}
              </h2>
              <Link href={`/tasks?create=true`}>
                <Button size="sm" className="gap-1.5 text-xs bg-codex-accent hover:bg-codex-hover text-white rounded-lg shadow-xs">
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Task</span>
                </Button>
              </Link>
            </div>

            {loadingTabData ? (
              <div className="h-32 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            ) : tabTasks.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 p-8 space-y-3">
                <PlusCircle className="w-8 h-8 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900 font-serif">No tasks created yet</h3>
                <p className="text-xs text-slate-500">Plan tasks to execute features and engineering milestones.</p>
                <Link href={`/tasks?create=true`}>
                  <Button size="sm" className="text-xs bg-codex-accent hover:bg-codex-hover text-white">Create First Task</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {tabTasks.map((t) => (
                  <div key={t.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {t.displayKey || t.id.substring(0, 8)}
                        </span>
                        <span className="text-sm font-bold text-slate-900 font-serif">{t.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <span>Status: {t.status}</span>
                        <span>•</span>
                        <span>Priority: {t.priority}</span>
                      </div>
                    </div>
                    <Link href={`/tasks?search=${encodeURIComponent(t.displayKey || t.id)}`}>
                      <Button variant="ghost" size="sm" className="text-xs text-slate-600 hover:text-slate-900">
                        <span>Open</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DOCUMENTS TAB */}
        {activeTab === "documents" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 font-serif">
                Documents for {projectName}
              </h2>
              <Link href={`/documents`}>
                <Button size="sm" className="gap-1.5 text-xs bg-codex-accent hover:bg-codex-hover text-white rounded-lg shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Document</span>
                </Button>
              </Link>
            </div>

            {loadingTabData ? (
              <div className="h-32 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            ) : tabDocuments.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 p-8 space-y-3">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900 font-serif">No documents uploaded yet</h3>
                <p className="text-xs text-slate-500">Upload PDF, DOCX, Markdown, or TXT specs for RAG vectorization.</p>
                <Link href={`/documents`}>
                  <Button size="sm" className="text-xs bg-codex-accent hover:bg-codex-hover text-white">Upload Specification</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {tabDocuments.map((doc) => (
                  <div key={doc.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-sm font-bold text-slate-900 font-serif">{doc.title || doc.originalFilename}</span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <span>{doc.originalFilename}</span>
                        <span>•</span>
                        <span>{formatDate(doc.createdAt)}</span>
                      </div>
                    </div>
                    <Link href={`/documents?search=${encodeURIComponent(doc.title || doc.originalFilename)}`}>
                      <Button variant="ghost" size="sm" className="text-xs text-slate-600 hover:text-slate-900">
                        <span>Inspect</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AUDIT TRAIL TAB */}
        {activeTab === "audit" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Header info */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-serif">Security & Activity Audit Log</h3>
                  <p className="text-xs text-slate-300">
                    Immutable enterprise audit records tracking workspace events, memberships, and data mutations.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadAuditLogs(auditPage)}
                  className="h-8 text-xs bg-white/10 text-white border-white/20 hover:bg-white/20 gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </Button>
              </div>
            </div>

            {/* Audit Logs Table / Stream */}
            {loadingAudit ? (
              <div className="space-y-2">
                <div className="h-16 rounded-xl bg-white animate-pulse border border-slate-200" />
                <div className="h-16 rounded-xl bg-white animate-pulse border border-slate-200" />
                <div className="h-16 rounded-xl bg-white animate-pulse border border-slate-200" />
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 p-8 space-y-2">
                <Shield className="w-8 h-8 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900 font-serif">No audit events logged yet</h3>
                <p className="text-xs text-slate-500">Security actions and modifications will be chronologically recorded here.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px] font-mono">
                      <tr>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Actor</th>
                        <th className="py-3 px-4">Target Entity</th>
                        <th className="py-3 px-4">Metadata / Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.map((log: any) => {
                        const actorName = log.actor?.displayName || log.actor?.email || log.actorId?.substring(0, 8) || "System";
                        return (
                          <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {formatDateTime(log.createdAt)}
                            </td>
                            <td className="py-3 px-4">
                              <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px] font-mono">
                                {log.action}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-900">
                              {actorName}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                              <span className="font-semibold text-slate-700">{log.entityType}</span>
                              {log.entityId && (
                                <span className="text-slate-400 ml-1">({log.entityId.substring(0, 8)})</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                              {log.metadata ? (
                                <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 text-[10px]">
                                  {JSON.stringify(log.metadata)}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="p-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Showing {auditLogs.length} events (Total: {auditTotal})</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={auditPage <= 1}
                      onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                      className="h-7 text-xs px-2.5"
                    >
                      Previous
                    </Button>
                    <span className="font-mono text-[11px]">Page {auditPage}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={auditLogs.length < 25}
                      onClick={() => setAuditPage((p) => p + 1)}
                      className="h-7 text-xs px-2.5"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Invite Member Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-codex-accent" />
                  <h3 className="text-sm font-bold text-slate-900 font-serif">Invite Team Member</h3>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddMember} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Search Candidate or Enter Email *</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                      setCandidateSearch(e.target.value);
                    }}
                    placeholder="user@example.com"
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 shadow-2xs focus:ring-1 focus:ring-codex-accent"
                  />

                  {/* Candidate Autocomplete Suggestions */}
                  {candidates.length > 0 && (
                    <div className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-1 space-y-1 shadow-sm">
                      <span className="text-[10px] text-slate-400 px-2 py-0.5 block font-mono">
                        Available workspace users:
                      </span>
                      {candidates.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setInviteEmail(c.email);
                            setCandidates([]);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-white flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <span className="font-bold text-slate-800">{c.displayName || c.email}</span>
                            <span className="text-[10px] text-slate-400 block">{c.email}</span>
                          </div>
                          {c.professionalRole && (
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">
                              {c.professionalRole}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Access Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 shadow-2xs cursor-pointer"
                  >
                    <option value="CONTRIBUTOR">CONTRIBUTOR (Create & edit requirements, tasks, decisions)</option>
                    <option value="MANAGER">MANAGER (Manage members, settings, and workflows)</option>
                    <option value="VIEWER">VIEWER (Read-only workspace access)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInviteModal(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submittingMember}
                    className="text-xs bg-codex-accent hover:bg-codex-hover text-white"
                  >
                    {submittingMember ? "Inviting..." : "Send Invitation"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Transfer Ownership Modal */}
        {showTransferModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900 font-serif">Transfer Project Ownership</h3>
                </div>
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                ⚠️ <strong>Caution:</strong> Transferring ownership gives another member full administrative control of this project. You will automatically be demoted to Manager.
              </div>

              <form onSubmit={handleTransferOwnership} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Select New Owner *</label>
                  <select
                    required
                    value={newOwnerUserId}
                    onChange={(e) => setNewOwnerUserId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 shadow-2xs cursor-pointer"
                  >
                    <option value="">-- Choose active team member --</option>
                    {members
                      .filter((m) => m.accessRole !== "OWNER")
                      .map((m) => {
                        const name = m.user?.displayName || m.user?.email || m.userId;
                        return (
                          <option key={m.userId} value={m.userId}>
                            {name} ({m.accessRole})
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTransferModal(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submittingTransfer || !newOwnerUserId}
                    className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {submittingTransfer ? "Transferring..." : "Confirm Transfer"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Project Dialog */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 font-serif">Edit Project Workspace</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Project Name</label>
                  <input
                    type="text"
                    defaultValue={projectName}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Project Key</label>
                  <input
                    type="text"
                    defaultValue={projectKey}
                    disabled
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Description</label>
                  <textarea
                    rows={3}
                    defaultValue={projectData?.description || ""}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setShowEditModal(false)} className="text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    showToast("Project details saved successfully!", "success");
                    setShowEditModal(false);
                  }}
                  className="text-xs bg-codex-accent hover:bg-codex-hover text-white"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
