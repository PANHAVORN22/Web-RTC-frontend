"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { AppLayout } from "@/components/app-layout";
import { ProposalReviewDialog } from "@/components/ai/proposal-review-dialog";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Calendar,
  Clock,
  FileText,
  AlertCircle,
  Search,
  Users,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  CheckSquare,
  GitPullRequest,
  Bot,
  FileCheck2,
} from "lucide-react";
import { formatDateTime, formatDate } from "@/lib/utils";

export default function MeetingsPage() {
  const { currentProject } = useAuth();
  const { showToast } = useToast();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Search & Expansion state
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [agenda, setAgenda] = useState("");
  const [notes, setNotes] = useState("");
  const [transcriptText, setTranscriptText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // AI Proposal state
  const [activeProposal, setActiveProposal] = useState<any>(null);
  const [generatingProposalId, setGeneratingProposalId] = useState<string | null>(null);

  const handleGenerateAnalysis = async (meeting: any) => {
    if (!currentProject) return;
    if (!meeting.transcriptText && !meeting.notes) {
      showToast("Meeting must have notes or a transcript for AI analysis.", "error");
      return;
    }
    setGeneratingProposalId(meeting.id);
    try {
      const res = await api.ai.generateMeetingAnalysis(currentProject.id, meeting.id);
      setActiveProposal(res.proposal || res);
      showToast("Generated meeting analysis! Review proposals before applying.", "info");
    } catch (err: any) {
      showToast(err.message || "Failed to generate meeting analysis", "error");
    } finally {
      setGeneratingProposalId(null);
    }
  };

  const loadData = async () => {
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
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("create") === "true") {
        setShowCreate(true);
      }
      const q = params.get("search");
      if (q) {
        setSearchQuery(q);
      }
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !title.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const startsAt = new Date(`${date}T${startTime}:00`).toISOString();
      const endsAt = new Date(`${date}T${endTime}:00`).toISOString();

      if (new Date(endsAt) <= new Date(startsAt)) {
        throw new Error("Meeting end time must be after start time");
      }

      const created = await api.meetings.create(currentProject.id, {
        title: title.trim(),
        startsAt,
        endsAt,
        agenda: agenda.trim() || undefined,
        notes: notes.trim() || undefined,
        transcriptText: transcriptText.trim() || undefined,
      });

      setTitle("");
      setAgenda("");
      setNotes("");
      setTranscriptText("");
      setShowCreate(false);
      showToast(`Logged meeting "${created.title}" successfully!`, "success");
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to log meeting");
      showToast(err.message || "Failed to log meeting", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      if (searchQuery.trim() === "") return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        m.id.toLowerCase() === q ||
        m.title.toLowerCase().includes(q) ||
        (m.agenda && m.agenda.toLowerCase().includes(q)) ||
        (m.notes && m.notes.toLowerCase().includes(q))
      );
    });
  }, [meetings, searchQuery]);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-codex-border pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-codex-accent flex items-center justify-center border border-blue-100">
                <Calendar className="w-4 h-4" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-codex-text font-serif">
                Meeting Logs & Minutes
              </h1>
            </div>
            <p className="text-xs text-codex-muted mt-1">
              Capture meeting schedules, agendas, collaborative notes, and transcripts with automatic AI action item extraction.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link href="/tasks">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
              >
                <CheckSquare className="w-3.5 h-3.5 text-codex-accent" />
                <span>Action Tasks</span>
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => setShowCreate(!showCreate)}
              className="gap-1.5 text-xs bg-codex-accent hover:bg-codex-hover text-white shadow-xs rounded-lg px-4"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showCreate ? "Close Form" : "Log Meeting"}</span>
            </Button>
          </div>
        </div>

        {/* Create Meeting Card */}
        {showCreate && (
          <Card className="border-slate-200 bg-white shadow-lg animate-in fade-in slide-in-from-top-2 rounded-2xl">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 font-serif flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-codex-accent" />
                <span>Log New Team Meeting</span>
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleCreate}>
              <div className="p-5 space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-codex-warning text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Meeting Title *</label>
                  <Input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Sprint Planning & Architecture Review"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Date *</label>
                    <Input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Start Time *</label>
                    <Input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">End Time *</label>
                    <Input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Agenda</label>
                  <Input
                    value={agenda}
                    onChange={(e) => setAgenda(e.target.value)}
                    placeholder="e.g., Discuss pgvector chunking, review PRs, assign phase 2 tasks"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Meeting Notes & Summary</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Document decisions, conclusions, open questions, and next steps..."
                    className="w-full rounded-lg bg-white border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-codex-accent shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Raw Transcript (Optional)</label>
                    <span className="text-[10px] text-slate-400">Paste Zoom/Teams transcript for AI analysis</span>
                  </div>
                  <textarea
                    rows={4}
                    value={transcriptText}
                    onChange={(e) => setTranscriptText(e.target.value)}
                    placeholder="Paste full transcript text here. AI assistant will parse this to propose requirements and tasks..."
                    className="w-full rounded-lg bg-white border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-codex-accent font-mono text-[11px] shadow-2xs"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 rounded-b-2xl">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreate(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-codex-accent hover:bg-codex-hover text-white text-xs px-4"
                >
                  {submitting ? "Saving..." : "Log Meeting"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meetings by title, agenda, or notes content..."
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-codex-accent focus:border-codex-accent shadow-xs"
          />
        </div>

        {/* Meetings List */}
        {loading ? (
          <div className="space-y-3">
            <div className="h-28 rounded-2xl bg-white border border-slate-200 animate-pulse" />
            <div className="h-28 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="text-center py-16 p-8 rounded-2xl border border-dashed border-slate-200 bg-white space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-codex-accent flex items-center justify-center mx-auto border border-blue-100">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 font-serif">
              {meetings.length === 0 ? "No Meetings Recorded Yet" : "No Matching Meetings Found"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {meetings.length === 0
                ? "Keep everyone on the same page by logging meeting minutes and analyzing transcripts with AI."
                : "Try searching with different keywords."}
            </p>
            {meetings.length === 0 ? (
              <Button
                size="sm"
                onClick={() => setShowCreate(true)}
                className="text-xs bg-codex-accent hover:bg-codex-hover text-white shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Log First Meeting
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
          <div className="space-y-4">
            {filteredMeetings.map((meeting) => {
              const isExpanded = expandedMeetingId === meeting.id;
              const hasContentForAi = Boolean(meeting.notes || meeting.transcriptText);
              const isSearchMatch =
                searchQuery.trim() !== "" &&
                meeting.title.toLowerCase().includes(searchQuery.toLowerCase());

              return (
                <Card
                  key={meeting.id}
                  className={`bg-white border transition-all duration-150 shadow-xs hover:shadow-md ${
                    isSearchMatch ? "border-codex-accent ring-1 ring-codex-accent/40" : "border-slate-200"
                  }`}
                >
                  <CardHeader className="p-5 pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-mono text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                          <Clock className="w-3.5 h-3.5 text-codex-accent" />
                          <span>{formatDateTime(meeting.startsAt)}</span>
                        </span>
                        {meeting.transcriptText && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-codex-accent border border-blue-100">
                            Transcript Included
                          </span>
                        )}
                      </div>

                      {/* Actions: AI Analyze + Expand */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {hasContentForAi && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={generatingProposalId === meeting.id}
                            onClick={() => handleGenerateAnalysis(meeting)}
                            className="h-7 text-[11px] border-blue-200 bg-blue-50 hover:bg-blue-100 text-codex-accent gap-1 px-2.5 font-medium shadow-2xs"
                            title="AI extracts requirements, decisions, and tasks from notes and transcript"
                          >
                            <Sparkles
                              className={`w-3 h-3 ${
                                generatingProposalId === meeting.id ? "animate-spin" : "text-codex-accent"
                              }`}
                            />
                            <span>{generatingProposalId === meeting.id ? "Analyzing..." : "Analyze with AI"}</span>
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedMeetingId(isExpanded ? null : meeting.id)}
                          className="h-7 text-[11px] text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 gap-1 px-2.5 shadow-2xs"
                        >
                          <span>{isExpanded ? "Hide Details" : "View Details"}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </Button>
                      </div>
                    </div>

                    <CardTitle className="text-base font-bold text-slate-900 font-serif pt-2 leading-snug">
                      {meeting.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-5 pt-1 space-y-3">
                    {meeting.agenda && (
                      <div className="text-xs text-slate-600">
                        <strong className="text-slate-900 font-semibold">Agenda:</strong> {meeting.agenda}
                      </div>
                    )}

                    {meeting.notes && (
                      <div className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        {meeting.notes}
                      </div>
                    )}

                    {/* Expandable Transcript Drawer */}
                    {isExpanded && meeting.transcriptText && (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 animate-in fade-in">
                        <div className="text-[11px] font-mono uppercase text-slate-600 flex items-center gap-1.5 font-bold">
                          <BookOpen className="w-3.5 h-3.5 text-codex-accent" />
                          <span>Full Meeting Transcript (v{meeting.transcriptVersion})</span>
                        </div>
                        <div className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto p-3 bg-white rounded-lg border border-slate-200">
                          {meeting.transcriptText}
                        </div>
                      </div>
                    )}

                    {/* Cross-Workflow Actions Hub */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Create Action Task linked to this meeting */}
                        <Link
                          href={`/tasks?create=true&meetingId=${meeting.id}&title=${encodeURIComponent(
                            `Follow-up from meeting: ${meeting.title}`
                          )}`}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] border-slate-200 text-slate-700 hover:bg-slate-50 gap-1 px-2.5 font-medium shadow-2xs"
                            title="Create an actionable task linked to this meeting"
                          >
                            <CheckSquare className="w-3 h-3 text-[#2D8A60]" />
                            <span>Add Task</span>
                          </Button>
                        </Link>

                        {/* Create Requirement from meeting */}
                        <Link
                          href={`/requirements?create=true&title=${encodeURIComponent(
                            `Requirement from meeting: ${meeting.title}`
                          )}`}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] border-slate-200 text-slate-700 hover:bg-slate-50 gap-1 px-2.5 font-medium shadow-2xs"
                            title="Capture a requirement identified in this meeting"
                          >
                            <FileCheck2 className="w-3 h-3 text-blue-600" />
                            <span>Create REQ</span>
                          </Button>
                        </Link>

                        {/* Log Decision */}
                        <Link
                          href={`/decisions?create=true&title=${encodeURIComponent(
                            `Decision from: ${meeting.title}`
                          )}`}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] border-slate-200 text-slate-700 hover:bg-slate-50 gap-1 px-2.5 font-medium shadow-2xs"
                            title="Log a decision agreed upon during this meeting"
                          >
                            <GitPullRequest className="w-3 h-3 text-purple-600" />
                            <span>Log Decision</span>
                          </Button>
                        </Link>

                        {/* Ask Copilot */}
                        <Link
                          href={`/assistant?prompt=${encodeURIComponent(
                            `Summarize meeting "${meeting.title}". Agenda: "${meeting.agenda || ""}". Notes: "${
                              meeting.notes || ""
                            }". What key conclusions and follow-ups should be tracked?`
                          )}&mode=PM`}
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[11px] text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 gap-1 px-2.5 shadow-2xs"
                            title="Query Copilot regarding this meeting"
                          >
                            <Bot className="w-3 h-3 text-codex-accent" />
                            <span className="hidden sm:inline">Ask Copilot</span>
                          </Button>
                        </Link>
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono">
                        Logged {formatDate(meeting.createdAt)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
                Next in Workflow: Convert Notes to Action
              </p>
              <p className="text-[11px] text-slate-500">
                Run AI analysis on meeting minutes to automatically draft proposed requirements and sprint tasks with one click.
              </p>
            </div>
          </div>
          <Link href="/tasks">
            <Button
              size="sm"
              className="text-xs bg-codex-accent hover:bg-codex-hover text-white shadow-xs shrink-0"
            >
              View Tasks Board →
            </Button>
          </Link>
        </div>
      </div>

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
    </AppLayout>
  );
}
