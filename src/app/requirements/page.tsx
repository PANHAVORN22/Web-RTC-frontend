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
  Clock,
  AlertCircle,
  Search,
  CheckCircle2,
  Copy,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Filter,
  Sparkles,
  ListTodo,
  Bot,
  ArrowRight,
  ExternalLink,
  GitPullRequest,
  History,
  X,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

export default function RequirementsPage() {
  const { currentProject } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState("ALL");
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("HIGH");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // AI Proposal state
  const [activeProposal, setActiveProposal] = useState<any>(null);
  const [generatingProposalId, setGeneratingProposalId] = useState<string | null>(null);

  // Revisions Modal state
  const [revisionsModalReq, setRevisionsModalReq] = useState<any | null>(null);
  const [revisionsList, setRevisionsList] = useState<any[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);

  const openRevisions = async (req: any) => {
    if (!currentProject) return;
    setRevisionsModalReq(req);
    setLoadingRevisions(true);
    try {
      const revs = await api.requirements.listRevisions(currentProject.id, req.id);
      setRevisionsList(revs || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load requirement revisions", "error");
    } finally {
      setLoadingRevisions(false);
    }
  };

  const handleGenerateTasks = async (req: any) => {
    if (!currentProject) return;
    setGeneratingProposalId(req.id);
    try {
      const res = await api.ai.generateTaskProposal(currentProject.id, req.id);
      setActiveProposal(res.proposal || res);
      showToast("Generated task proposal! Review before applying.", "info");
    } catch (err: any) {
      showToast(err.message || "Failed to generate tasks", "error");
    } finally {
      setGeneratingProposalId(null);
    }
  };

  const loadData = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const [reqsData, tasksData] = await Promise.all([
        api.requirements.list(currentProject.id),
        api.tasks.list(currentProject.id).catch(() => []),
      ]);
      setItems(reqsData || []);
      setTasks(tasksData || []);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to load requirements", "error");
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

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpandTasks = (id: string) => {
    setExpandedTasks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`, "info");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !title.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const created = await api.requirements.create(currentProject.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        acceptanceCriteria: acceptanceCriteria.trim() || undefined,
        priority,
      });
      setTitle("");
      setDescription("");
      setAcceptanceCriteria("");
      setShowCreate(false);
      showToast(`Created ${created.displayKey || "requirement"} successfully!`, "success");
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create requirement");
      showToast(err.message || "Failed to create requirement", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (req: any, newStatus: string) => {
    if (!currentProject) return;
    try {
      await api.requirements.update(currentProject.id, req.id, {
        version: req.version,
        status: newStatus,
      });
      showToast(`${req.displayKey} updated to ${newStatus}`, "success");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to update requirement status", "error");
    }
  };

  const updateTaskStatus = async (task: any, newStatus: string) => {
    if (!currentProject) return;
    try {
      await api.tasks.update(currentProject.id, task.id, {
        version: task.version,
        status: newStatus,
      });
      showToast(`Task ${task.displayKey || ""} updated to ${newStatus}`, "success");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to update task", "error");
    }
  };

  const getLinkedTasks = (reqId: string, reqKey?: string) => {
    return tasks.filter(
      (t) =>
        t.requirementId === reqId ||
        t.requirement?.id === reqId ||
        (reqKey && t.requirement?.displayKey === reqKey)
    );
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        item.id.toLowerCase() === q ||
        item.title.toLowerCase().includes(q) ||
        (item.displayKey && item.displayKey.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q));

      const matchesStatus =
        selectedStatus === "ALL" || item.status === selectedStatus;

      const matchesPriority =
        selectedPriority === "ALL" || item.priority === selectedPriority;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [items, searchQuery, selectedStatus, selectedPriority]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="success" className="text-[10px]">APPROVED</Badge>;
      case "IN_PROGRESS":
        return <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30 text-[10px]">IN PROGRESS</Badge>;
      case "DONE":
        return <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-500/30 text-[10px]">DONE</Badge>;
      case "ARCHIVED":
        return <Badge variant="secondary" className="text-zinc-500 text-[10px]">ARCHIVED</Badge>;
      default:
        return <Badge variant="outline" className="text-zinc-400 text-[10px]">DRAFT</Badge>;
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "URGENT":
        return <Badge variant="destructive" className="text-[9px]">URGENT</Badge>;
      case "HIGH":
        return <Badge className="bg-orange-600/20 text-orange-400 border-orange-500/30 text-[9px]">HIGH</Badge>;
      case "MEDIUM":
        return <Badge className="bg-amber-600/20 text-amber-400 border-amber-500/30 text-[9px]">MEDIUM</Badge>;
      default:
        return <Badge variant="secondary" className="text-[9px]">LOW</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-codex-border pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-codex-accent flex items-center justify-center border border-blue-100">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-codex-text font-serif">
                Requirements
              </h1>
            </div>
            <p className="text-xs text-codex-muted mt-1">
              Define specifications and acceptance criteria. Requirements drive engineering tasks and store immutable revision history.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link href="/tasks">
              <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5">
                <ListTodo className="w-3.5 h-3.5 text-codex-accent" />
                <span>View All Tasks</span>
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => setShowCreate(!showCreate)}
              className="gap-1.5 text-xs bg-codex-accent hover:bg-codex-hover text-white shadow-sm h-9"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showCreate ? "Close Form" : "New Requirement"}</span>
            </Button>
          </div>
        </div>

        {/* Create Form Drawer / Card */}
        {showCreate && (
          <Card className="border-codex-accent/30 shadow-xl animate-in fade-in slide-in-from-top-2">
            <CardHeader className="pb-3 border-b border-codex-border">
              <CardTitle className="text-sm font-bold text-codex-text flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-codex-accent" />
                <span>Create New Project Requirement</span>
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleCreate}>
              <div className="p-5 space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Requirement Title *</label>
                  <Input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., User Authentication with Cookie Sessions"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full h-9 rounded-lg border border-codex-border bg-white px-3 text-xs text-codex-text shadow-sm focus:outline-none focus:ring-2 focus:ring-codex-accent cursor-pointer"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Project Context</label>
                    <div className="h-9 rounded-lg bg-slate-50 border border-codex-border px-3 flex items-center text-xs text-slate-600 font-mono">
                      [{currentProject?.key}] {currentProject?.name}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide context on why this requirement is necessary and the expected user experience..."
                    className="w-full rounded-lg bg-white border border-codex-border p-2.5 text-xs text-codex-text shadow-sm focus:outline-none focus:ring-2 focus:ring-codex-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Acceptance Criteria</label>
                    <span className="text-[10px] text-slate-400 font-mono">Recommended for QA & Testing</span>
                  </div>
                  <textarea
                    rows={3}
                    value={acceptanceCriteria}
                    onChange={(e) => setAcceptanceCriteria(e.target.value)}
                    placeholder="e.g., - Session cookie is httpOnly and secure&#10;- CSRF token is rotated and validated on mutation&#10;- Unauthorized requests return 401"
                    className="w-full rounded-lg bg-white border border-codex-border p-2.5 text-xs text-codex-text shadow-sm focus:outline-none focus:ring-2 focus:ring-codex-accent font-mono"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-codex-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-codex-accent hover:bg-codex-hover text-white text-xs px-4"
                >
                  {submitting ? "Saving..." : "Create Requirement"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-codex-border p-3 rounded-xl shadow-sm">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, key, or content..."
              className="pl-8 h-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-slate-400" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-8 rounded-lg border border-codex-border bg-white px-2.5 text-xs text-codex-text shadow-sm focus:outline-none focus:ring-2 focus:ring-codex-accent cursor-pointer"
                aria-label="Filter by status"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="APPROVED">Approved</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="h-8 rounded-lg border border-codex-border bg-white px-2.5 text-xs text-codex-text shadow-sm focus:outline-none focus:ring-2 focus:ring-codex-accent cursor-pointer"
              aria-label="Filter by priority"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* Items List */}
        {loading ? (
          <div className="space-y-3">
            <div className="h-24 rounded-xl bg-slate-200 animate-pulse" />
            <div className="h-24 rounded-xl bg-slate-200 animate-pulse" />
            <div className="h-24 rounded-xl bg-slate-200 animate-pulse" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 p-6 rounded-2xl border border-dashed border-codex-border bg-white space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-codex-accent flex items-center justify-center mx-auto">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-codex-text">
              {items.length === 0 ? "No Requirements Created Yet" : "No Matching Requirements Found"}
            </h3>
            <p className="text-xs text-codex-muted max-w-sm mx-auto">
              {items.length === 0
                ? "Requirements define the scope and criteria of your project. Create your first requirement to get started."
                : "Try clearing your search query or adjusting your status filters."}
            </p>
            {items.length === 0 ? (
              <Button size="sm" onClick={() => setShowCreate(true)} className="text-xs bg-codex-accent hover:bg-codex-hover text-white">
                <Plus className="w-3.5 h-3.5 mr-1" /> Create First Requirement
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedStatus("ALL");
                  setSelectedPriority("ALL");
                }}
                className="text-xs"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((req) => {
              const isExpanded = expandedItems[req.id];
              const linkedTasks = getLinkedTasks(req.id, req.displayKey);
              const isSearchMatch =
                searchQuery.trim() !== "" &&
                (req.displayKey?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  req.title?.toLowerCase().includes(searchQuery.toLowerCase()));

              return (
                <Card
                  key={req.id}
                  className={`bg-white border-codex-border hover:border-codex-accent/40 transition-all shadow-sm ${
                    isSearchMatch ? "ring-1 ring-codex-accent border-codex-accent" : ""
                  }`}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => copyToClipboard(req.displayKey || req.id, "key")}
                          className="flex items-center gap-1 font-mono text-xs font-bold text-codex-accent bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-100 transition-all group"
                          title="Click to copy key"
                        >
                          <span>{req.displayKey || req.id.substring(0, 8)}</span>
                          <Copy className="w-3 h-3 text-codex-accent/60 group-hover:text-codex-accent" />
                        </button>
                        {getPriorityBadge(req.priority)}
                        {getStatusBadge(req.status)}
                        {linkedTasks.length > 0 ? (
                          <Badge className="bg-emerald-50 text-[#2D8A60] border-emerald-200 text-[10px] font-mono">
                            {linkedTasks.length} {linkedTasks.length === 1 ? "Task" : "Tasks"}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">No tasks yet</span>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRevisions(req)}
                          className="h-5 text-[10px] font-mono px-2 py-0 border-slate-200 text-slate-600 hover:text-codex-accent hover:bg-slate-50 gap-1"
                          title="View revision history"
                        >
                          <History className="w-2.5 h-2.5 text-slate-400" />
                          <span>v{req.version}</span>
                        </Button>
                      </div>

                      {/* Actions: AI Generate Tasks & Status dropdown */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={generatingProposalId === req.id}
                          onClick={() => handleGenerateTasks(req)}
                          className="h-6 text-[11px] border-blue-200 bg-blue-50 hover:bg-blue-100 text-codex-accent gap-1 px-2"
                          title="AI generates actionable tasks for this requirement"
                        >
                          <Sparkles className={`w-3 h-3 ${generatingProposalId === req.id ? "animate-spin" : "text-codex-accent"}`} />
                          <span>{generatingProposalId === req.id ? "Generating..." : "Generate Tasks"}</span>
                        </Button>

                        <span className="text-[10px] text-slate-500 font-medium">Status:</span>
                        <select
                          value={req.status}
                          onChange={(e) => updateStatus(req, e.target.value)}
                          className="text-xs bg-slate-50 border border-codex-border rounded-lg px-2 py-0.5 text-codex-text focus:outline-none focus:ring-1 focus:ring-codex-accent cursor-pointer"
                        >
                          <option value="DRAFT">DRAFT</option>
                          <option value="APPROVED">APPROVED</option>
                          <option value="IN_PROGRESS">IN PROGRESS</option>
                          <option value="DONE">DONE</option>
                          <option value="ARCHIVED">ARCHIVED</option>
                        </select>
                      </div>
                    </div>

                    <CardTitle className="text-sm font-semibold text-codex-text pt-2 leading-snug">
                      {req.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-4 pt-1 space-y-3">
                    {req.description && (
                      <p className="text-xs text-codex-muted leading-relaxed">
                        {req.description}
                      </p>
                    )}

                    {/* Acceptance Criteria Collapsible */}
                    {req.acceptanceCriteria && (
                      <div className="rounded-xl bg-slate-50 border border-codex-border p-3 space-y-1.5">
                        <button
                          onClick={() => toggleExpand(req.id)}
                          className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-codex-text"
                        >
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#2D8A60]" />
                            <span>Acceptance Criteria</span>
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                        {isExpanded && (
                          <div className="pt-2 text-xs text-slate-800 whitespace-pre-wrap font-mono bg-white p-2.5 rounded-lg border border-codex-border animate-in fade-in">
                            {req.acceptanceCriteria}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Inline Linked Tasks Drawer */}
                    {expandedTasks[req.id] && (
                      <div className="rounded-xl bg-slate-50 border border-codex-border p-3 space-y-2 animate-in fade-in">
                        <div className="flex items-center justify-between text-xs pb-1 border-b border-codex-border">
                          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <ListTodo className="w-3.5 h-3.5 text-codex-accent" />
                            <span>Linked Execution Tasks ({linkedTasks.length})</span>
                          </span>
                          <Link
                            href={`/tasks?search=${encodeURIComponent(req.displayKey || req.id)}`}
                            className="text-[11px] text-codex-accent hover:underline flex items-center gap-1"
                          >
                            <span>Open in Tasks</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                        {linkedTasks.length === 0 ? (
                          <div className="text-xs text-slate-500 py-2 text-center">
                            No tasks linked yet. Click &quot;Add Task&quot; to break this requirement down!
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {linkedTasks.map((t) => (
                              <div
                                key={t.id}
                                className="p-2.5 rounded-lg bg-white border border-codex-border flex items-center justify-between text-xs gap-2"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono text-[10px] text-codex-accent shrink-0 font-semibold">{t.displayKey || "TSK"}</span>
                                  <span className="text-codex-text truncate">{t.title}</span>
                                  {t.dueDate && (
                                    <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">Due: {t.dueDate}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {t.status === "DONE" ? (
                                    <Badge variant="success" className="text-[9px]">DONE</Badge>
                                  ) : (
                                    <button
                                      onClick={() => updateTaskStatus(t, "DONE")}
                                      className="text-[10px] text-slate-500 hover:text-[#2D8A60] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 transition-colors"
                                      title="Mark task done"
                                    >
                                      Complete
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Seamless Cross-Workflow Action Hub */}
                    <div className="pt-2 border-t border-white/[0.04] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Direct Create Task from Requirement */}
                        <Link
                          href={`/tasks?create=true&reqId=${req.id}&title=${encodeURIComponent(`Implement: ${req.title}`)}`}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[11px] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-1 px-2 font-medium"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Task</span>
                          </Button>
                        </Link>

                        {/* Inline View Tasks Toggle */}
                        {linkedTasks.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleExpandTasks(req.id)}
                            className="h-6 text-[11px] text-zinc-400 hover:text-emerald-300 gap-1 px-2"
                          >
                            <ListTodo className="w-3 h-3 text-emerald-400" />
                            <span>
                              {expandedTasks[req.id] ? "Hide Tasks" : `View Tasks (${linkedTasks.length})`}
                            </span>
                          </Button>
                        )}

                        {/* Direct Log ADR from Requirement */}
                        <Link
                          href={`/decisions?create=true&reqId=${req.id}&title=${encodeURIComponent(`Architectural Choice for: ${req.title}`)}`}
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[11px] border-purple-500/30 text-purple-400 hover:bg-purple-500/10 gap-1 px-2 font-medium"
                            title="Log architectural decision (ADR) for this requirement"
                          >
                            <GitPullRequest className="w-3 h-3" />
                            <span>Log ADR</span>
                          </Button>
                        </Link>

                        {/* Requirement Revision History Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openRevisions(req)}
                          className="h-6 text-[11px] text-zinc-500 hover:text-slate-800 gap-1 px-2"
                          title="View revision snapshots and audit history"
                        >
                          <History className="w-3 h-3 text-slate-400" />
                          <span className="hidden sm:inline">History</span>
                        </Button>

                        {/* Consult AI Assistant with Pre-filled context */}
                        <Link
                          href={`/assistant?prompt=${encodeURIComponent(`Analyze requirement [${req.displayKey}]: "${req.title}". Acceptance criteria: "${req.acceptanceCriteria || 'None'}". What test cases and edge cases should we verify?`)}&mode=QA`}
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[11px] text-zinc-400 hover:text-indigo-300 gap-1 px-2"
                            title="Open in AI Copilot for QA and test case analysis"
                          >
                            <Bot className="w-3 h-3 text-indigo-400" />
                            <span className="hidden sm:inline">Ask Copilot</span>
                          </Button>
                        </Link>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-mono">
                        <span>Created {formatDate(req.createdAt)}</span>
                        {req.createdBy && (
                          <span className="hidden sm:inline">
                            Author: {req.createdBy.displayName || req.createdBy.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Next in Workflow Guide Banner */}
        <div className="p-4 rounded-xl bg-white border border-codex-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-codex-accent shrink-0" />
            <span className="text-slate-600">
              Next in workflow: Record architectural choices in <strong className="text-codex-accent">Decisions</strong> or track development in <strong className="text-[#2D8A60]">Tasks</strong>.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/decisions">
              <Button size="sm" variant="outline" className="h-8 text-xs">
                Go to Decisions →
              </Button>
            </Link>
            <Link href="/tasks">
              <Button size="sm" className="h-8 text-xs bg-codex-accent hover:bg-codex-hover text-white">
                Go to Tasks →
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Revisions History Modal */}
      {revisionsModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-codex-accent bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {revisionsModalReq.displayKey || revisionsModalReq.id.substring(0, 8)}
                  </span>
                  <h2 className="text-base font-bold text-slate-900 font-serif">
                    Requirement Revision History
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                  {revisionsModalReq.title}
                </p>
              </div>
              <button
                onClick={() => setRevisionsModalReq(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {loadingRevisions ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading requirement audit trail...</div>
              ) : revisionsList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl p-4 border border-dashed border-slate-200">
                  No past revisions recorded yet. This requirement is currently at baseline version (v{revisionsModalReq.version}).
                </div>
              ) : (
                <div className="space-y-4">
                  {revisionsList.map((rev: any, idx: number) => (
                    <div
                      key={rev.id || idx}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-[#161927] text-white text-[10px] font-mono">
                            v{rev.version}
                          </Badge>
                          {getStatusBadge(rev.status)}
                          {getPriorityBadge(rev.priority)}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDateTime(rev.createdAt)}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 font-serif">{rev.title}</h4>
                      {rev.description && (
                        <div className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-100">
                          {rev.description}
                        </div>
                      )}
                      {rev.acceptanceCriteria && (
                        <div className="text-[11px] font-mono text-slate-600 bg-white/80 p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap">
                          <span className="font-semibold text-slate-700 font-sans block mb-1">Acceptance Criteria:</span>
                          {rev.acceptanceCriteria}
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
                onClick={() => setRevisionsModalReq(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeProposal && currentProject && (
        <ProposalReviewDialog
          isOpen={!!activeProposal}
          onClose={() => setActiveProposal(null)}
          proposal={activeProposal}
          projectId={currentProject.id}
          onConfirmed={(resultRecordIds) => {
            showToast(`Created ${resultRecordIds.length} tasks successfully!`, "success");
            setActiveProposal(null);
            loadData();
          }}
          onRejected={() => {
            showToast("Proposal discarded", "info");
            setActiveProposal(null);
          }}
        />
      )}
    </AppLayout>
  );
}
