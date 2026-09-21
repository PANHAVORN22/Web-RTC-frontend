"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
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
  Plus,
  Calendar,
  Clock,
  AlertTriangle,
  Search,
  CheckCircle2,
  Copy,
  ListTodo,
  CheckSquare,
  ArrowRight,
  Filter,
  Sparkles,
  Link as LinkIcon,
  Bot,
  FileCheck2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function TasksPage() {
  const { currentProject } = useAuth();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [requirementId, setRequirementId] = useState("");
  const [sourceMeetingId, setSourceMeetingId] = useState("");
  const [inspectingReq, setInspectingReq] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const loadData = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const [tasksData, reqsData] = await Promise.all([
        api.tasks.list(currentProject.id),
        api.requirements.list(currentProject.id).catch(() => []),
      ]);
      setTasks(tasksData || []);
      setRequirements(reqsData || []);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to load tasks", "error");
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
      const rId = params.get("reqId");
      if (rId) {
        setRequirementId(rId);
        setShowCreate(true);
      }
      const mId = params.get("meetingId") || params.get("sourceMeetingId");
      if (mId) {
        setSourceMeetingId(mId);
        setShowCreate(true);
      }
      const tTitle = params.get("title");
      if (tTitle) {
        setTitle(tTitle);
      }
      const p = params.get("priority");
      if (p && ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(p)) {
        setPriority(p as any);
      }
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject]);

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
      const created = await api.tasks.create(currentProject.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate ? dueDate : undefined,
        requirementId: requirementId ? requirementId : undefined,
        sourceMeetingId: sourceMeetingId ? sourceMeetingId : undefined,
      });
      setTitle("");
      setDescription("");
      setDueDate("");
      setRequirementId("");
      setSourceMeetingId("");
      setShowCreate(false);
      showToast(`Task ${created.displayKey || "item"} created successfully!`, "success");
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create task");
      showToast(err.message || "Failed to create task", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (task: any, newStatus: string) => {
    if (!currentProject) return;
    try {
      await api.tasks.update(currentProject.id, task.id, {
        version: task.version,
        status: newStatus,
      });
      showToast(`${task.displayKey} marked as ${newStatus}`, "success");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to update task status", "error");
    }
  };

  const isTaskOverdue = useCallback((task: any) => {
    if (!task.dueDate) return false;
    if (task.status === "DONE" || task.status === "CANCELLED") return false;
    return task.dueDate < todayStr;
  }, [todayStr]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        task.id.toLowerCase() === q ||
        task.title.toLowerCase().includes(q) ||
        (task.displayKey && task.displayKey.toLowerCase().includes(q)) ||
        (task.description && task.description.toLowerCase().includes(q)) ||
        (task.requirement?.displayKey &&
          task.requirement.displayKey.toLowerCase().includes(q)) ||
        (task.requirement?.title &&
          task.requirement.title.toLowerCase().includes(q));

      let matchesTab = true;
      if (activeTab === "OVERDUE") {
        matchesTab = isTaskOverdue(task);
      } else if (activeTab === "LINKED") {
        matchesTab = Boolean(task.requirementId || task.requirement);
      } else if (activeTab !== "ALL") {
        matchesTab = task.status === activeTab;
      }

      const matchesPriority =
        priorityFilter === "ALL" || task.priority === priorityFilter;

      return matchesSearch && matchesTab && matchesPriority;
    });
  }, [tasks, searchQuery, activeTab, priorityFilter, isTaskOverdue]);

  const overdueCount = useMemo(() => {
    return tasks.filter((t) => isTaskOverdue(t)).length;
  }, [tasks, isTaskOverdue]);

  const linkedReqCount = useMemo(() => {
    return tasks.filter((t) => Boolean(t.requirementId || t.requirement)).length;
  }, [tasks]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DONE":
        return <Badge variant="success" className="text-[10px]">DONE</Badge>;
      case "IN_PROGRESS":
        return <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30 text-[10px]">IN PROGRESS</Badge>;
      case "IN_REVIEW":
        return <Badge className="bg-amber-600/20 text-amber-400 border-amber-500/30 text-[10px]">IN REVIEW</Badge>;
      case "CANCELLED":
        return <Badge variant="secondary" className="line-through text-zinc-500 text-[10px]">CANCELLED</Badge>;
      default:
        return <Badge variant="outline" className="text-zinc-400 text-[10px]">TO DO</Badge>;
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

  const selectedReqObj = requirements.find((r) => r.id === requirementId);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-codex-border pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-codex-accent flex items-center justify-center border border-blue-100">
                <CheckSquare className="w-4 h-4" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-codex-text font-serif">
                Tasks
              </h1>
            </div>
            <p className="text-xs text-codex-muted mt-1">
              Actionable engineering items with due dates, priorities, optimistic locking, and requirement traceability.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link href="/requirements">
              <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-codex-accent" />
                <span>Requirements</span>
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => setShowCreate(!showCreate)}
              className="gap-1.5 text-xs bg-codex-accent hover:bg-codex-hover text-white shadow-sm h-9"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showCreate ? "Close Form" : "Create Task"}</span>
            </Button>
          </div>
        </div>

        {/* Create Task Card */}
        {showCreate && (
          <Card className="border-codex-accent/30 shadow-xl animate-in fade-in slide-in-from-top-2">
            <CardHeader className="pb-3 border-b border-codex-border">
              <CardTitle className="text-sm font-bold text-codex-text flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-codex-accent" />
                  <span>Create New Actionable Task</span>
                </div>
                {selectedReqObj && (
                  <Badge className="bg-blue-50 text-codex-accent border-blue-100 text-[10px] font-mono">
                    Linked to {selectedReqObj.displayKey}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleCreate}>
              <div className="p-5 space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Task Title *</label>
                  <Input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Implement Session Cookie CSRF Interceptor"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    <label className="text-xs font-semibold text-slate-700">Due Date</label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Link Requirement</label>
                    <select
                      value={requirementId}
                      onChange={(e) => setRequirementId(e.target.value)}
                      className="w-full h-9 rounded-lg border border-codex-border bg-white px-3 text-xs text-codex-text shadow-sm focus:outline-none focus:ring-2 focus:ring-codex-accent cursor-pointer"
                    >
                      <option value="">No Requirement Link</option>
                      {requirements.map((req) => (
                        <option key={req.id} value={req.id}>
                          [{req.displayKey || "REQ"}] {req.title.substring(0, 32)}...
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Description / Instructions</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide technical implementation notes, target files, or acceptance requirements..."
                    className="w-full rounded-lg bg-white border border-codex-border p-2.5 text-xs text-codex-text shadow-sm focus:outline-none focus:ring-2 focus:ring-codex-accent"
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
                  {submitting ? "Saving..." : "Create Task"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Filter Tabs & Search Bar */}
        <div className="space-y-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-codex-border pb-2 text-xs">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === "ALL"
                  ? "bg-slate-200 text-codex-text font-semibold"
                  : "text-slate-500 hover:text-codex-text"
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              onClick={() => setActiveTab("TODO")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === "TODO"
                  ? "bg-slate-200 text-codex-text font-semibold"
                  : "text-slate-500 hover:text-codex-text"
              }`}
            >
              To Do ({tasks.filter((t) => t.status === "TODO").length})
            </button>
            <button
              onClick={() => setActiveTab("IN_PROGRESS")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === "IN_PROGRESS"
                  ? "bg-blue-50 text-codex-accent font-semibold border border-blue-200"
                  : "text-slate-500 hover:text-codex-text"
              }`}
            >
              In Progress ({tasks.filter((t) => t.status === "IN_PROGRESS").length})
            </button>
            <button
              onClick={() => setActiveTab("IN_REVIEW")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === "IN_REVIEW"
                  ? "bg-amber-50 text-[#D97706] font-semibold border border-amber-200"
                  : "text-slate-500 hover:text-codex-text"
              }`}
            >
              In Review ({tasks.filter((t) => t.status === "IN_REVIEW").length})
            </button>
            <button
              onClick={() => setActiveTab("DONE")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === "DONE"
                  ? "bg-emerald-50 text-[#2D8A60] font-semibold border border-emerald-200"
                  : "text-slate-500 hover:text-codex-text"
              }`}
            >
              Done ({tasks.filter((t) => t.status === "DONE").length})
            </button>
            {linkedReqCount > 0 && (
              <button
                onClick={() => setActiveTab("LINKED")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === "LINKED"
                    ? "bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30"
                    : "text-indigo-400 hover:bg-indigo-500/10"
                }`}
              >
                <LinkIcon className="w-3 h-3" />
                <span>Linked REQ ({linkedReqCount})</span>
              </button>
            )}
            {overdueCount > 0 && (
              <button
                onClick={() => setActiveTab("OVERDUE")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === "OVERDUE"
                    ? "bg-red-500/20 text-red-300 font-semibold border border-red-500/40"
                    : "text-red-400 hover:bg-red-500/10"
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Overdue ({overdueCount})</span>
              </button>
            )}
          </div>

          {/* Search & Priority Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-codex-border p-3 rounded-xl shadow-sm">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks by title, key, or requirement..."
                className="pl-8 h-8 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="h-8 rounded-lg border border-codex-border bg-white px-2.5 text-xs text-codex-text shadow-sm focus:outline-none focus:ring-2 focus:ring-codex-accent cursor-pointer"
              >
                <option value="ALL">All</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        {loading ? (
          <div className="space-y-3">
            <div className="h-20 rounded-xl bg-slate-200 animate-pulse" />
            <div className="h-20 rounded-xl bg-slate-200 animate-pulse" />
            <div className="h-20 rounded-xl bg-slate-200 animate-pulse" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-16 p-6 rounded-2xl border border-dashed border-codex-border bg-white space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-codex-accent flex items-center justify-center mx-auto">
              <CheckSquare className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-codex-text">
              {tasks.length === 0 ? "No Tasks in this Workspace Yet" : "No Matching Tasks Found"}
            </h3>
            <p className="text-xs text-codex-muted max-w-sm mx-auto">
              {tasks.length === 0
                ? "Break down your project requirements into trackable action items with due dates."
                : "Try clearing your search query or switching to another status tab."}
            </p>
            {tasks.length === 0 ? (
              <Button size="sm" onClick={() => setShowCreate(true)} className="text-xs bg-codex-accent hover:bg-codex-hover text-white">
                <Plus className="w-3.5 h-3.5 mr-1" /> Create First Task
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setActiveTab("ALL");
                  setPriorityFilter("ALL");
                }}
                className="text-xs"
              >
                Reset Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const overdue = isTaskOverdue(task);
              const isSearchMatch =
                searchQuery.trim() !== "" &&
                (task.displayKey?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  task.title?.toLowerCase().includes(searchQuery.toLowerCase()));

              return (
                <Card
                  key={task.id}
                  className={`bg-white border-codex-border hover:border-codex-accent/40 transition-all shadow-sm ${
                    overdue
                      ? "border-red-300 bg-red-50/20"
                      : isSearchMatch
                      ? "ring-1 ring-codex-accent border-codex-accent"
                      : ""
                  }`}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => copyToClipboard(task.displayKey || task.id, "task key")}
                          className="flex items-center gap-1 font-mono text-xs font-bold text-codex-accent bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-100 transition-all group"
                          title="Click to copy key"
                        >
                          <span>{task.displayKey || task.id.substring(0, 8)}</span>
                          <Copy className="w-3 h-3 text-codex-accent/60 group-hover:text-codex-accent" />
                        </button>
                        {getPriorityBadge(task.priority)}
                        {getStatusBadge(task.status)}
                        {overdue && (
                          <Badge variant="destructive" className="text-[9px] gap-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3" /> Overdue
                          </Badge>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">Rev: v{task.version}</span>
                      </div>

                      {/* Status changer & Quick Actions */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {task.status === "TODO" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateStatus(task, "IN_PROGRESS")}
                            className="h-7 text-[11px] px-2.5 border-blue-200 text-codex-accent hover:bg-blue-50 gap-1"
                          >
                            Start Task <ArrowRight className="w-3 h-3" />
                          </Button>
                        )}
                        {task.status === "IN_PROGRESS" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateStatus(task, "DONE")}
                            className="h-7 text-[11px] px-2.5 border-emerald-200 text-[#2D8A60] hover:bg-emerald-50 gap-1"
                          >
                            Mark Done <CheckCircle2 className="w-3 h-3" />
                          </Button>
                        )}

                        <select
                          value={task.status}
                          onChange={(e) => updateStatus(task, e.target.value)}
                          className="text-xs bg-slate-50 border border-codex-border rounded-lg px-2 py-1 text-codex-text focus:outline-none focus:ring-1 focus:ring-codex-accent cursor-pointer"
                        >
                          <option value="TODO">TO DO</option>
                          <option value="IN_PROGRESS">IN PROGRESS</option>
                          <option value="IN_REVIEW">IN REVIEW</option>
                          <option value="DONE">DONE</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </div>
                    </div>

                    <CardTitle className="text-sm font-semibold text-codex-text pt-2 leading-snug">
                      {task.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-4 pt-1 space-y-2.5">
                    {task.description && (
                      <p className="text-xs text-codex-muted leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-codex-border text-[11px] text-slate-500">
                      <div className="flex items-center gap-3 flex-wrap">
                        {task.dueDate ? (
                          <span className={`flex items-center gap-1 font-mono ${overdue ? "text-codex-warning font-semibold" : "text-slate-500"}`}>
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Due: {task.dueDate}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">No due date</span>
                        )}

                        {/* Interactive Clickable Requirement Badge */}
                        {task.requirement ? (
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/requirements?search=${encodeURIComponent(task.requirement.displayKey || task.requirement.id)}`}
                              className="flex items-center gap-1 text-codex-accent hover:underline font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-100 transition-all group"
                              title="Jump to linked requirement"
                            >
                              <LinkIcon className="w-3 h-3 text-codex-accent/70" />
                              <span className="font-semibold">{task.requirement.displayKey || "Linked REQ"}</span>
                              <span className="text-slate-500 text-[10px] hidden md:inline">
                                ({task.requirement.title.substring(0, 20)}...)
                              </span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => setInspectingReq(task.requirement)}
                              className="text-[10px] text-codex-accent hover:underline font-mono"
                              title="View acceptance criteria & specs without leaving this page"
                            >
                              Spec
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[10px]">Unlinked</span>
                        )}

                        {/* Source Meeting Badge */}
                        {task.sourceMeetingId && (
                          <Link
                            href={`/meetings?search=${encodeURIComponent(task.sourceMeetingId)}`}
                            className="flex items-center gap-1 text-codex-accent font-mono text-[10px] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 transition-all"
                            title="Follow-up from team meeting"
                          >
                            <Calendar className="w-3 h-3 text-codex-accent" />
                            <span>Meeting Item</span>
                          </Link>
                        )}
                      </div>

                      {/* Right side: AI Copilot Link and Timestamp */}
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/assistant?prompt=${encodeURIComponent(`How should I implement task [${task.displayKey}]: "${task.title}"? Provide architectural advice and step-by-step code guidance.`)}&mode=DEVELOPER`}
                          className="text-slate-500 hover:text-codex-accent flex items-center gap-1 font-medium transition-colors"
                          title="Ask Copilot for developer implementation guidance"
                        >
                          <Bot className="w-3.5 h-3.5 text-codex-accent" />
                          <span className="hidden sm:inline">Ask Copilot</span>
                        </Link>
                        <span className="text-slate-400 font-mono">
                          Created {formatDate(task.createdAt)}
                        </span>
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
              Next in workflow: Coordinate with the team in <strong className="text-codex-accent">Meetings</strong> or verify deliverables against specs in <strong className="text-amber-700">Documents</strong>.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/meetings">
              <Button size="sm" variant="outline" className="h-8 text-xs">
                Go to Meetings →
              </Button>
            </Link>
            <Link href="/documents">
              <Button size="sm" className="h-8 text-xs bg-codex-accent hover:bg-codex-hover text-white">
                Go to Documents →
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick REQ Spec & Acceptance Criteria Modal */}
      {inspectingReq && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setInspectingReq(null)}
          />
          <div className="relative w-full max-w-lg bg-white border border-codex-border rounded-2xl shadow-2xl p-6 space-y-4 z-10 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-codex-border pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-codex-accent bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  {inspectingReq.displayKey || "REQ"}
                </span>
                <h3 className="text-sm font-bold text-codex-text truncate max-w-xs">
                  {inspectingReq.title}
                </h3>
              </div>
              <button
                onClick={() => setInspectingReq(null)}
                className="text-slate-400 hover:text-codex-text p-1 rounded"
              >
                ✕
              </button>
            </div>

            {inspectingReq.description && (
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Description</div>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-codex-border">
                  {inspectingReq.description}
                </p>
              </div>
            )}

            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-[#2D8A60] uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2D8A60]" />
                <span>Acceptance Criteria</span>
              </div>
              <div className="text-xs text-slate-800 whitespace-pre-wrap font-mono bg-slate-50 p-3 rounded-lg border border-codex-border max-h-56 overflow-y-auto leading-relaxed">
                {inspectingReq.acceptanceCriteria || "No acceptance criteria specified for this requirement."}
              </div>
            </div>

            <div className="pt-2 border-t border-codex-border flex items-center justify-between">
              <Link
                href={`/requirements?search=${encodeURIComponent(inspectingReq.displayKey || inspectingReq.id)}`}
                className="text-xs text-codex-accent hover:underline flex items-center gap-1 font-medium"
              >
                <span>Open full requirement in Scope</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setInspectingReq(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
