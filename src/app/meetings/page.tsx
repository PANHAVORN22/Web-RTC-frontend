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
  Calendar,
  Clock,
  Search,
  X,
  Sparkles,
  BookOpen,
  CheckSquare,
  GitPullRequest,
  Bot,
  FileCheck2,
  LayoutGrid,
  List,
  Trash2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatDateTime, formatDate } from "@/lib/utils";

interface ProjectInfo {
  id: string;
  name: string;
  key: string;
}

const MEETING_PROJECT_COLORS = [
  "#C0392B",
  "#8B5CF6",
  "#3B82F6",
  "#059669",
  "#D97706",
  "#EC4899",
  "#6366F1",
];

const MEETING_STATUS_OPTIONS: FilterOption[] = [
  { value: "UPCOMING", label: "Upcoming", color: "#3B82F6" },
  { value: "COMPLETED", label: "Completed", color: "#10B981" },
  { value: "TRANSCRIPT", label: "With Transcript", color: "#8B5CF6" },
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

export default function MeetingsPage() {
  const { currentProject, projects } = useAuth();
  const { showToast } = useToast();

  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [selectedProjectId, setSelectedProjectId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [targetMeetingId, setTargetMeetingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Create Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createProjectId, setCreateProjectId] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createDate, setCreateDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [createStartTime, setCreateStartTime] = useState("10:00");
  const [createEndTime, setCreateEndTime] = useState("11:00");
  const [createAgenda, setCreateAgenda] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [createTranscriptText, setCreateTranscriptText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createErrorMsg, setCreateErrorMsg] = useState<string | null>(null);

  // Detail / Edit Modal state
  const [activeMeeting, setActiveMeeting] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAgenda, setEditAgenda] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTranscript, setEditTranscript] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // AI Proposal state
  const [activeProposal, setActiveProposal] = useState<any>(null);
  const [generatingProposalId, setGeneratingProposalId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const data = await api.meetings.list(currentProject.id);
      setMeetings(data || []);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to load meetings", "error");
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
      const targetId = params.get("id") || params.get("meetingId");
      if (targetId) {
        setTargetMeetingId(targetId);
      }
    }
    loadData();
  }, [loadData]);

  // Auto-open inspected meeting modal if id/meetingId is in URL
  useEffect(() => {
    if (!targetMeetingId || meetings.length === 0) return;
    const found = meetings.find(
      (m: any) =>
        m.id === targetMeetingId ||
        m.id?.toLowerCase() === targetMeetingId.toLowerCase()
    );
    if (found) {
      openDetailModal(found);
      setTargetMeetingId(null);
    }
  }, [meetings, targetMeetingId]);

  // Project options for dropdown
  const activeProjectsList = useMemo(() => {
    const map = new Map<string, ProjectInfo>();
    for (const p of projects) {
      map.set(p.id, { id: p.id, name: p.name, key: p.key });
    }
    for (const m of meetings) {
      if (m.project) {
        map.set(m.project.id, m.project);
      }
    }
    return Array.from(map.values());
  }, [projects, meetings]);

  const meetingProjectOptions: FilterOption[] = useMemo(() => {
    return activeProjectsList.map((p, idx) => ({
      value: p.id,
      label: p.name,
      color: MEETING_PROJECT_COLORS[idx % MEETING_PROJECT_COLORS.length],
    }));
  }, [activeProjectsList]);

  // Status Counts for summary pills
  const now = useMemo(() => new Date(), []);
  const statusCounts = useMemo(() => {
    let upcoming = 0;
    let completed = 0;
    let transcript = 0;
    for (const m of meetings) {
      const isUp = new Date(m.startsAt || m.createdAt) >= now;
      if (isUp) upcoming++;
      else completed++;
      if (m.transcriptText) transcript++;
    }
    return { UPCOMING: upcoming, COMPLETED: completed, TRANSCRIPT: transcript };
  }, [meetings, now]);

  // Filtered meetings list
  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      // Project filter
      if (selectedProjectId !== "ALL" && m.projectId !== selectedProjectId) {
        return false;
      }
      // Status filter
      if (selectedStatus === "UPCOMING" && new Date(m.startsAt || m.createdAt) < now) return false;
      if (selectedStatus === "COMPLETED" && new Date(m.startsAt || m.createdAt) >= now) return false;
      if (selectedStatus === "TRANSCRIPT" && !m.transcriptText) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (m.title || "").toLowerCase().includes(q);
        const matchAgenda = (m.agenda || "").toLowerCase().includes(q);
        const matchNotes = (m.notes || "").toLowerCase().includes(q);
        const matchTranscript = (m.transcriptText || "").toLowerCase().includes(q);
        const matchId = (m.id || "").toLowerCase() === q;
        if (!matchTitle && !matchAgenda && !matchNotes && !matchTranscript && !matchId) {
          return false;
        }
      }
      return true;
    });
  }, [meetings, selectedProjectId, selectedStatus, searchQuery, now]);

  const filteredProjectsCount = useMemo(() => {
    const set = new Set<string>();
    for (const m of filteredMeetings) {
      if (m.projectId) set.add(m.projectId);
    }
    return set.size || (activeProjectsList.length > 0 ? activeProjectsList.length : 1);
  }, [filteredMeetings, activeProjectsList]);

  // Open Create Modal
  const openCreateModal = () => {
    setCreateProjectId(
      selectedProjectId !== "ALL"
        ? selectedProjectId
        : currentProject?.id || activeProjectsList[0]?.id || ""
    );
    setCreateTitle("");
    setCreateDate(new Date().toISOString().split("T")[0]);
    setCreateStartTime("10:00");
    setCreateEndTime("11:00");
    setCreateAgenda("");
    setCreateNotes("");
    setCreateTranscriptText("");
    setCreateErrorMsg(null);
    setShowCreateModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetProjId = createProjectId || currentProject?.id;
    if (!targetProjId || !createTitle.trim()) {
      setCreateErrorMsg("Please provide a title for the meeting.");
      return;
    }
    setSubmitting(true);
    setCreateErrorMsg(null);
    try {
      const startsAt = new Date(`${createDate}T${createStartTime}:00`).toISOString();
      const endsAt = new Date(`${createDate}T${createEndTime}:00`).toISOString();

      if (new Date(endsAt) <= new Date(startsAt)) {
        throw new Error("Meeting end time must be after start time");
      }

      await api.meetings.create(targetProjId, {
        title: createTitle.trim(),
        startsAt,
        endsAt,
        agenda: createAgenda.trim() || undefined,
        notes: createNotes.trim() || undefined,
        transcriptText: createTranscriptText.trim() || undefined,
      });

      setShowCreateModal(false);
      showToast("Logged meeting successfully!", "success");
      await loadData();
    } catch (err: any) {
      setCreateErrorMsg(err.message || "Failed to log meeting");
      showToast(err.message || "Failed to log meeting", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Detail / Edit Modal
  const openDetailModal = (meeting: any) => {
    setActiveMeeting(meeting);
    setEditTitle(meeting.title || "");
    setEditAgenda(meeting.agenda || "");
    setEditNotes(meeting.notes || "");
    setEditTranscript(meeting.transcriptText || "");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMeeting || !editTitle.trim()) return;
    setEditSubmitting(true);
    try {
      await api.meetings.update(activeMeeting.projectId || currentProject?.id, activeMeeting.id, {
        title: editTitle.trim(),
        agenda: editAgenda.trim() || undefined,
        notes: editNotes.trim() || undefined,
        transcriptText: editTranscript.trim() || undefined,
      });
      showToast("Meeting updated successfully", "success");
      setActiveMeeting(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to update meeting", "error");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!activeMeeting) return;
    if (!confirm(`Are you sure you want to delete meeting "${activeMeeting.title}"?`)) return;
    setEditSubmitting(true);
    try {
      await api.meetings.delete(activeMeeting.projectId || currentProject?.id, activeMeeting.id);
      showToast("Meeting deleted", "success");
      setActiveMeeting(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to delete meeting", "error");
    } finally {
      setEditSubmitting(false);
    }
  };

  // AI Meeting Analysis
  const handleGenerateAnalysis = async (meeting: any) => {
    const projId = meeting.projectId || currentProject?.id;
    if (!projId) return;
    if (!meeting.transcriptText && !meeting.notes) {
      showToast("Meeting must have notes or a transcript for AI analysis.", "error");
      return;
    }
    setGeneratingProposalId(meeting.id);
    try {
      const res = await api.ai.generateMeetingAnalysis(projId, meeting.id);
      setActiveProposal(res.proposal || res);
      showToast("Generated meeting analysis! Review proposals before applying.", "info");
    } catch (err: any) {
      showToast(err.message || "Failed to generate meeting analysis", "error");
    } finally {
      setGeneratingProposalId(null);
    }
  };

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
              <span className="text-slate-800 font-medium">Meetings</span>
            </nav>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-serif">
              Meetings
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {filteredMeetings.length} meeting{filteredMeetings.length === 1 ? "" : "s"} across{" "}
              {filteredProjectsCount} active {filteredProjectsCount === 1 ? "project" : "projects"}.
            </p>

            {/* Status Summary Pills (Matching Requirements & Tasks page!) */}
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => setSelectedStatus(selectedStatus === "UPCOMING" ? "ALL" : "UPCOMING")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  selectedStatus === "UPCOMING"
                    ? "bg-blue-50 text-blue-900 border-blue-400 ring-1 ring-blue-400 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 shadow-2xs"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                <span>Upcoming {statusCounts.UPCOMING}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus(selectedStatus === "COMPLETED" ? "ALL" : "COMPLETED")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  selectedStatus === "COMPLETED"
                    ? "bg-emerald-50 text-emerald-900 border-emerald-400 ring-1 ring-emerald-400 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 shadow-2xs"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                <span>Completed {statusCounts.COMPLETED}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStatus(selectedStatus === "TRANSCRIPT" ? "ALL" : "TRANSCRIPT")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  selectedStatus === "TRANSCRIPT"
                    ? "bg-purple-50 text-purple-900 border-purple-400 ring-1 ring-purple-400 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 shadow-2xs"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
                <span>With Transcripts {statusCounts.TRANSCRIPT}</span>
              </button>
            </div>
          </div>

          <Button
            onClick={openCreateModal}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 self-start sm:self-auto h-9"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Meeting</span>
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
              options={meetingProjectOptions}
            />

            {/* Status Filter */}
            <FilterDropdown
              label="Status"
              allLabel="All meetings"
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={MEETING_STATUS_OPTIONS}
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
                placeholder="Filter meetings..."
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

            {/* List / Grid Switcher */}
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
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-[#0f172a] text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="text-center py-20 p-8 rounded-2xl border border-dashed border-slate-200 bg-white space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No matching meetings found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {meetings.length === 0
                ? "No meetings logged yet. Log your first meeting to capture agenda, minutes, and transcripts."
                : "Try adjusting your project or status filters, or clear your search term."}
            </p>
            {meetings.length === 0 ? (
              <Button
                onClick={openCreateModal}
                className="text-xs bg-[#2563eb] hover:bg-[#1d4ed8] text-white mt-2"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Log First Meeting
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
        ) : viewMode === "grid" ? (
          /* Grid View (Matching Documents grid view!) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {filteredMeetings.map((meeting) => {
              const projectName = meeting.project?.name || currentProject?.name || "AI Workspace";
              const projectBadgeStyle = getProjectBadgeStyle(projectName);
              const isUp = new Date(meeting.startsAt || meeting.createdAt) >= now;
              const hasContentForAi = Boolean(meeting.notes || meeting.transcriptText);

              return (
                <div
                  key={meeting.id}
                  onClick={() => openDetailModal(meeting)}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between space-y-3.5 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 font-mono text-[11px] text-slate-600 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md">
                        <Clock className="w-3 h-3 text-blue-600" />
                        <span>{formatDateTime(meeting.startsAt)}</span>
                      </span>

                      {isUp ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          <span>Scheduled</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#E8F5E9] text-[#2D8A60] border border-[#2D8A60]/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2D8A60]" />
                          <span>Completed</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 font-serif group-hover:text-blue-600 transition-colors line-clamp-2">
                      {meeting.title}
                    </h3>

                    {meeting.agenda && (
                      <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                        <strong className="text-slate-800">Agenda:</strong> {meeting.agenda}
                      </p>
                    )}

                    {meeting.notes && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 italic">
                        {meeting.notes}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border truncate max-w-[130px] ${projectBadgeStyle}`}>
                      {projectName}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {meeting.transcriptText && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200/80">
                          <BookOpen className="w-3 h-3 text-purple-600" />
                          <span>Transcript</span>
                        </span>
                      )}

                      {hasContentForAi && (
                        <span className="p-1 rounded bg-blue-50 text-blue-600 border border-blue-100" title="AI Analysis Ready">
                          <Sparkles className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View (Matching Requirements & Tasks tables!) */
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 w-[42%]">Meeting</th>
                    <th className="py-3 px-4 w-[16%]">Project</th>
                    <th className="py-3 px-4 w-[16%]">Date & Time</th>
                    <th className="py-3 px-4 w-[14%]">Status</th>
                    <th className="py-3 px-4 w-[12%]">Artifacts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredMeetings.map((meeting) => {
                    const projectName = meeting.project?.name || currentProject?.name || "AI Workspace";
                    const projectBadgeStyle = getProjectBadgeStyle(projectName);
                    const isUp = new Date(meeting.startsAt || meeting.createdAt) >= now;
                    const hasContentForAi = Boolean(meeting.notes || meeting.transcriptText);

                    return (
                      <tr
                        key={meeting.id}
                        onClick={() => openDetailModal(meeting)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        {/* Meeting Title & Agenda Column */}
                        <td className="py-3 px-4">
                          <div className="flex items-start gap-2.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                              style={{ backgroundColor: isUp ? "#3b82f6" : "#10b981" }}
                            />
                            <div className="min-w-0">
                              <span className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors leading-relaxed">
                                {meeting.title}
                              </span>
                              {meeting.agenda && (
                                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
                                  {meeting.agenda}
                                </p>
                              )}
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

                        {/* Schedule Time */}
                        <td className="py-3 px-4 font-mono text-[11.5px] text-slate-600 whitespace-nowrap">
                          {formatDateTime(meeting.startsAt)}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {isUp ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                              <span>Scheduled</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-[#E8F5E9] text-[#2D8A60] border border-[#2D8A60]/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#2D8A60]" />
                              <span>Completed</span>
                            </span>
                          )}
                        </td>

                        {/* Artifacts (Transcript / AI Analysis badge) */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {meeting.transcriptText && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200/80">
                                <BookOpen className="w-3 h-3 text-purple-600" />
                                <span>Transcript</span>
                              </span>
                            )}
                            {hasContentForAi && (
                              <span className="p-1 rounded bg-blue-50 text-blue-600 border border-blue-100" title="AI Analysis Ready">
                                <Sparkles className="w-3 h-3" />
                              </span>
                            )}
                            {!meeting.transcriptText && !hasContentForAi && (
                              <span className="text-slate-400 font-sans text-xs">-</span>
                            )}
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

        {/* CREATE MEETING MODAL (Matching Requirements Create Modal!) */}
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
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900 font-serif">
                    Log New Meeting
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
                  <label className="text-xs font-semibold text-slate-700">Meeting Title *</label>
                  <Input
                    required
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="e.g. Sprint Planning & Architecture Review"
                    className="text-xs h-9 font-medium"
                  />
                </div>

                {/* Date, Start Time, End Time */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Date *</label>
                    <input
                      type="date"
                      required
                      value={createDate}
                      onChange={(e) => setCreateDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Start Time *</label>
                    <input
                      type="time"
                      required
                      value={createStartTime}
                      onChange={(e) => setCreateStartTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">End Time *</label>
                    <input
                      type="time"
                      required
                      value={createEndTime}
                      onChange={(e) => setCreateEndTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Agenda */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Agenda (Optional)</label>
                  <Input
                    value={createAgenda}
                    onChange={(e) => setCreateAgenda(e.target.value)}
                    placeholder="e.g. Discuss pgvector indexing and API specifications"
                    className="text-xs h-9"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Meeting Notes & Summary</label>
                  <textarea
                    rows={3}
                    value={createNotes}
                    onChange={(e) => setCreateNotes(e.target.value)}
                    placeholder="Document decisions, conclusions, open questions, and next steps..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Raw Transcript */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Raw Transcript (Optional)</label>
                    <span className="text-[10px] text-slate-400">Zoom / Teams transcript text</span>
                  </div>
                  <textarea
                    rows={3}
                    value={createTranscriptText}
                    onChange={(e) => setCreateTranscriptText(e.target.value)}
                    placeholder="Paste full transcript text here for AI extraction of action items..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-mono text-[11px] shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                    {submitting ? "Saving..." : "Log Meeting"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MEETING DETAIL / EDIT MODAL (Matching Requirements Detail Modal!) */}
        {activeMeeting && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div
              className="fixed inset-0"
              onClick={() => !editSubmitting && setActiveMeeting(null)}
            />
            <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-10 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        new Date(activeMeeting.startsAt || activeMeeting.createdAt) >= now
                          ? "#3b82f6"
                          : "#10b981",
                    }}
                  />
                  <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    {formatDateTime(activeMeeting.startsAt)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium border truncate max-w-[180px] ${getProjectBadgeStyle(
                      activeMeeting.project?.name || currentProject?.name
                    )}`}
                  >
                    {activeMeeting.project?.name || currentProject?.name || "Workspace"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveMeeting(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleUpdate} className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Meeting Title *</label>
                  <Input
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-xs h-9 font-medium"
                  />
                </div>

                {/* Agenda */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Agenda</label>
                  <Input
                    value={editAgenda}
                    onChange={(e) => setEditAgenda(e.target.value)}
                    placeholder="Meeting agenda items..."
                    className="text-xs h-9"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Meeting Notes & Summary</label>
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Minutes, decisions, and action conclusions..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
                  />
                </div>

                {/* Transcript Viewer / Editor */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Meeting Transcript</label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {editTranscript ? "Recorded transcript text" : "Optional"}
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={editTranscript}
                    onChange={(e) => setEditTranscript(e.target.value)}
                    placeholder="Paste or view full meeting transcript here..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-mono text-[11px] shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
                  />
                </div>

                {/* Cross-Workflow Actions Hub */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  {/* Analyze with AI */}
                  {(activeMeeting.notes || activeMeeting.transcriptText) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={generatingProposalId === activeMeeting.id}
                      onClick={() => handleGenerateAnalysis(activeMeeting)}
                      className="h-8 text-xs border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 gap-1.5 px-3"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${generatingProposalId === activeMeeting.id ? "animate-spin" : "text-blue-600"}`} />
                      <span>{generatingProposalId === activeMeeting.id ? "Analyzing..." : "Analyze with AI"}</span>
                    </Button>
                  )}

                  {/* Add Task Link */}
                  <Link
                    href={`/tasks?create=true&meetingId=${activeMeeting.id}&title=${encodeURIComponent(
                      `Follow-up from meeting: ${activeMeeting.title}`
                    )}`}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 px-3"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-[#2D8A60]" />
                      <span>Add Task</span>
                    </Button>
                  </Link>

                  {/* Create REQ Link */}
                  <Link
                    href={`/requirements?create=true&title=${encodeURIComponent(
                      `Requirement from meeting: ${activeMeeting.title}`
                    )}`}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 px-3"
                    >
                      <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Create REQ</span>
                    </Button>
                  </Link>

                  {/* Log Decision Link */}
                  <Link
                    href={`/decisions?create=true&title=${encodeURIComponent(
                      `Decision from: ${activeMeeting.title}`
                    )}`}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 px-3"
                    >
                      <GitPullRequest className="w-3.5 h-3.5 text-purple-600" />
                      <span>Log Decision</span>
                    </Button>
                  </Link>

                  {/* Ask Copilot */}
                  <Link
                    href={`/assistant?prompt=${encodeURIComponent(
                      `Summarize meeting "${activeMeeting.title}". Agenda: "${activeMeeting.agenda || ""}". Notes: "${
                        activeMeeting.notes || ""
                      }". What key conclusions and follow-ups should be tracked?`
                    )}&mode=PM`}
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
                      onClick={() => setActiveMeeting(null)}
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

        {/* AI Analysis Proposal Review Dialog */}
        {activeProposal && currentProject && (
          <ProposalReviewDialog
            isOpen={!!activeProposal}
            onClose={() => setActiveProposal(null)}
            proposal={activeProposal}
            projectId={currentProject.id}
            onConfirmed={(resultRecordIds) => {
              showToast(`Created ${resultRecordIds.length} records from meeting analysis!`, "success");
              setActiveProposal(null);
              loadData();
            }}
            onRejected={() => {
              showToast("Meeting analysis discarded", "info");
              setActiveProposal(null);
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
