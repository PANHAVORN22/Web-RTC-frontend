"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { api } from "@/lib/api";
import {
  CheckCheck,
  CheckSquare,
  FileCheck2,
  Bookmark,
  Calendar,
  FileText,
  AlertTriangle,
  X,
  Clock,
  Sparkles,
  ExternalLink,
  Trash2,
  Inbox,
  Check,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProposalReviewDialog } from "@/components/ai/proposal-review-dialog";

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  entityType: "TASK" | "REQUIREMENT" | "DECISION" | "MEETING" | "DOCUMENT" | "ALERT" | "PROJECT";
  entityId?: string;
  action?: string;
  actorName?: string;
  createdAt: string;
  read: boolean;
  link: string;
}

export interface ActionableInboxItem {
  id: string;
  type: "AI_PROPOSAL" | "PROPOSED_DECISION" | "BLOCKED_TASK";
  title: string;
  subtitle: string;
  entityId: string;
  createdAt: string;
  raw: any;
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return "Recently";
  const now = new Date();
  const date = new Date(dateString);
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const NotificationCenter: React.FC = () => {
  const router = useRouter();
  const { currentProject, user } = useAuth();
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"inbox" | "activity" | "alerts">("inbox");
  const [activityFilter, setActivityFilter] = useState<"all" | "unread">("all");

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [inboxItems, setInboxItems] = useState<ActionableInboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // AI Proposal Review Modal state
  const [reviewingProposal, setReviewingProposal] = useState<any | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Storage key scoped to user
  const storageKey = `aiw_read_notifications_${user?.id || "guest"}`;

  // Get read IDs from localStorage
  const getReadIds = useCallback((): Set<string> => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  }, [storageKey]);

  // Save read IDs to localStorage
  const saveReadIds = useCallback(
    (ids: Set<string>) => {
      if (typeof window === "undefined") return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(ids)));
      } catch (e) {
        console.error("Failed to save read notifications to localStorage", e);
      }
    },
    [storageKey]
  );

  // Fetch live notifications and actionable inbox items
  const loadNotificationsAndInbox = useCallback(async () => {
    if (!currentProject?.id) return;
    setLoading(true);

    try {
      const readIds = getReadIds();
      const items: NotificationItem[] = [];
      const actionable: ActionableInboxItem[] = [];

      // 1. Fetch dashboard metrics for alerts (e.g. overdue tasks)
      try {
        const dashRes = await api.dashboard.get(currentProject.id);
        const dashData = dashRes?.data || dashRes;

        if (dashData?.overdueTasksCount > 0) {
          const alertId = `alert-overdue-${currentProject.id}-${new Date().toISOString().slice(0, 10)}`;
          items.push({
            id: alertId,
            title: "Overdue Tasks Alert",
            description: `${dashData.overdueTasksCount} task${dashData.overdueTasksCount > 1 ? "s are" : " is"} past due date in ${currentProject.name}`,
            entityType: "ALERT",
            createdAt: new Date().toISOString(),
            read: readIds.has(alertId),
            link: "/tasks?filter=overdue",
          });
        }
      } catch (err) {
        console.warn("Failed to load dashboard metrics for notifications", err);
      }

      // 2. Fetch actionable Inbox Items: Pending AI Proposals
      try {
        const propRes = await api.ai.listProposals(currentProject.id, { status: "PENDING" });
        const proposals = Array.isArray(propRes) ? propRes : (propRes as any)?.data || [];
        for (const p of proposals) {
          const count = p.draftJson?.items?.length ?? 0;
          actionable.push({
            id: `proposal-${p.id}`,
            type: "AI_PROPOSAL",
            title: p.title || "AI Proposal Pending Review",
            subtitle: `Generated from ${p.sourceType || "Copilot"}${count > 0 ? ` • ${count} item${count > 1 ? "s" : ""}` : ""}`,
            entityId: p.id,
            createdAt: p.createdAt || new Date().toISOString(),
            raw: p,
          });
        }
      } catch (err) {
        console.warn("Failed to load AI proposals for inbox", err);
      }

      // 3. Fetch actionable Inbox Items: Proposed Decisions awaiting sign-off
      try {
        const decRes = await api.decisions.list(currentProject.id, "PROPOSED");
        const proposedDecs = Array.isArray(decRes) ? decRes : (decRes as any)?.data || [];
        for (const d of proposedDecs) {
          actionable.push({
            id: `decision-${d.id}`,
            type: "PROPOSED_DECISION",
            title: d.title,
            subtitle: d.rationale || "Architectural decision awaiting sign-off",
            entityId: d.id,
            createdAt: d.createdAt || new Date().toISOString(),
            raw: d,
          });
        }
      } catch (err) {
        console.warn("Failed to load proposed decisions for inbox", err);
      }

      // 4. Fetch actionable Inbox Items: Blocked Tasks needing unblocking
      try {
        const taskRes = await api.tasks.list(currentProject.id, "BLOCKED");
        const blockedTasks = Array.isArray(taskRes) ? taskRes : (taskRes as any)?.data || [];
        for (const t of blockedTasks) {
          actionable.push({
            id: `task-${t.id}`,
            type: "BLOCKED_TASK",
            title: t.title,
            subtitle: t.assignee
              ? `Assigned to ${t.assignee.displayName || t.assignee.email} • Blocked`
              : "Blocked • Awaiting unblocking",
            entityId: t.id,
            createdAt: t.createdAt || new Date().toISOString(),
            raw: t,
          });
        }
      } catch (err) {
        console.warn("Failed to load blocked tasks for inbox", err);
      }

      // 5. Fetch recent project activity stream
      try {
        const actRes = await api.dashboard.getActivity(currentProject.id, 1, 15);
        const activities = Array.isArray(actRes) ? actRes : (actRes as any)?.data || [];

        for (const act of activities) {
          const actId = `act-${act.id}`;
          const actor = act.actor?.displayName || act.actor?.email || "Team member";
          let title = "Project Activity";
          let description = `${actor} updated ${act.entityType?.toLowerCase() || "item"}`;
          let link = "/dashboard";
          let entityType: NotificationItem["entityType"] = "PROJECT";

          const metaTitle = act.metadata?.title || act.metadata?.name;

          switch (act.entityType) {
            case "TASK":
              entityType = "TASK";
              link = "/tasks";
              if (act.action === "CREATE_TASK") {
                title = "New Task Created";
                description = `${actor} created task "${metaTitle || "Untitled"}"`;
              } else if (act.action === "UPDATE_TASK_STATUS") {
                title = "Task Status Updated";
                description = `${actor} changed status to ${act.metadata?.newStatus || "updated"}`;
              } else {
                title = "Task Updated";
                description = `${actor} modified task "${metaTitle || "Task"}"`;
              }
              break;

            case "REQUIREMENT":
              entityType = "REQUIREMENT";
              link = "/requirements";
              if (act.action === "CREATE_REQUIREMENT") {
                title = "New Requirement";
                description = `${actor} defined requirement "${metaTitle || "Requirement"}"`;
              } else {
                title = "Requirement Updated";
                description = `${actor} updated requirement "${metaTitle || "Requirement"}"`;
              }
              break;

            case "DECISION":
              entityType = "DECISION";
              link = "/decisions";
              title = "Architectural Decision";
              description = `${actor} logged decision "${metaTitle || "Decision"}"`;
              break;

            case "MEETING":
              entityType = "MEETING";
              link = "/meetings";
              title = "Meeting Scheduled";
              description = `${actor} scheduled "${metaTitle || "Meeting"}"`;
              break;

            case "DOCUMENT":
              entityType = "DOCUMENT";
              link = "/documents";
              title = "Document Uploaded";
              description = `${actor} uploaded document "${metaTitle || "File"}"`;
              break;

            case "PROJECT":
              entityType = "PROJECT";
              link = "/projects";
              title = "Workspace Update";
              description = `${actor} updated project settings`;
              break;
          }

          items.push({
            id: actId,
            title,
            description,
            entityType,
            entityId: act.entityId,
            action: act.action,
            actorName: actor,
            createdAt: act.createdAt || new Date().toISOString(),
            read: readIds.has(actId),
            link,
          });
        }
      } catch (err) {
        console.warn("Failed to load activity stream for notifications", err);
      }

      // If no activities yet, add a welcoming workspace notification
      if (items.length === 0) {
        const welcomeId = `welcome-${currentProject.id}`;
        items.push({
          id: welcomeId,
          title: `Welcome to ${currentProject.name}`,
          description: `Connected to [${currentProject.key}]. Create tasks, requirements, or documents to collaborate.`,
          entityType: "PROJECT",
          createdAt: currentProject.createdAt || new Date().toISOString(),
          read: readIds.has(welcomeId),
          link: "/dashboard",
        });
      }

      setNotifications(items);
      setInboxItems(actionable);
    } finally {
      setLoading(false);
    }
  }, [currentProject, getReadIds]);

  useEffect(() => {
    void loadNotificationsAndInbox();
  }, [loadNotificationsAndInbox]);

  // Listen to workspace:refresh event to update notifications live
  useEffect(() => {
    const handleRefresh = () => {
      void loadNotificationsAndInbox();
    };

    window.addEventListener("workspace:refresh", handleRefresh);
    return () => window.removeEventListener("workspace:refresh", handleRefresh);
  }, [loadNotificationsAndInbox]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Visible notifications after dismiss filter
  const visibleNotifications = notifications.filter((n) => !dismissedIds.has(n.id));
  const unreadCount = visibleNotifications.filter((n) => !n.read).length;
  const alertCount = visibleNotifications.filter((n) => n.entityType === "ALERT").length;
  const inboxCount = inboxItems.length;

  // Filtered activity notifications
  const filteredActivities = visibleNotifications.filter((n) => {
    if (activeTab === "alerts") return n.entityType === "ALERT";
    if (activeTab === "activity") {
      if (activityFilter === "unread") return !n.read;
      return n.entityType !== "ALERT";
    }
    return true;
  });

  // Mark single activity as read
  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const readIds = getReadIds();
    readIds.add(id);
    saveReadIds(readIds);
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  };

  // Mark all activities as read
  const handleMarkAllAsRead = () => {
    const readIds = getReadIds();
    visibleNotifications.forEach((n) => readIds.add(n.id));
    saveReadIds(readIds);
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    showToast("All notifications marked as read", "info");
  };

  // Dismiss notification
  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  // Clear all visible notifications
  const handleClearAll = () => {
    setDismissedIds(new Set(notifications.map((n) => n.id)));
  };

  // Click on a notification item
  const handleNotificationClick = (item: NotificationItem) => {
    handleMarkAsRead(item.id);
    setIsOpen(false);
    if (item.link) {
      router.push(item.link);
    }
  };

  // --- Inbox Actions ---

  // One-click accept decision
  const handleAcceptDecision = async (item: ActionableInboxItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentProject) return;
    setActionInProgressId(item.id);
    try {
      await api.decisions.update(currentProject.id, item.raw.id, {
        version: item.raw.version ?? 1,
        status: "ACCEPTED",
      });
      setInboxItems((prev) => prev.filter((i) => i.id !== item.id));
      showToast(`Decision "${item.title}" accepted!`, "success");
      window.dispatchEvent(new CustomEvent("workspace:refresh", { detail: { type: "decision" } }));
    } catch (err: any) {
      showToast(err.message || "Failed to accept decision", "error");
    } finally {
      setActionInProgressId(null);
    }
  };

  // One-click unblock task
  const handleUnblockTask = async (item: ActionableInboxItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentProject) return;
    setActionInProgressId(item.id);
    try {
      await api.tasks.update(currentProject.id, item.raw.id, {
        version: item.raw.version ?? 1,
        status: "IN_PROGRESS",
      });
      setInboxItems((prev) => prev.filter((i) => i.id !== item.id));
      showToast(`Task "${item.title}" unblocked and moved to In Progress!`, "success");
      window.dispatchEvent(new CustomEvent("workspace:refresh", { detail: { type: "task" } }));
    } catch (err: any) {
      showToast(err.message || "Failed to unblock task", "error");
    } finally {
      setActionInProgressId(null);
    }
  };

  // Quick reject AI proposal
  const handleRejectProposal = async (item: ActionableInboxItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentProject) return;
    setActionInProgressId(item.id);
    try {
      await api.ai.rejectProposal(currentProject.id, item.raw.id);
      setInboxItems((prev) => prev.filter((i) => i.id !== item.id));
      showToast("AI proposal rejected", "info");
      window.dispatchEvent(new CustomEvent("workspace:refresh", { detail: { type: "proposal" } }));
    } catch (err: any) {
      showToast(err.message || "Failed to reject proposal", "error");
    } finally {
      setActionInProgressId(null);
    }
  };

  // Open Proposal Review modal
  const handleReviewProposal = (item: ActionableInboxItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setReviewingProposal(item.raw);
    setIsOpen(false);
  };

  // Render icon for entity type
  const renderIcon = (type: NotificationItem["entityType"]) => {
    switch (type) {
      case "TASK":
        return <CheckSquare className="w-4 h-4 text-blue-500" />;
      case "REQUIREMENT":
        return <FileCheck2 className="w-4 h-4 text-purple-500" />;
      case "DECISION":
        return <Bookmark className="w-4 h-4 text-amber-500" />;
      case "MEETING":
        return <Calendar className="w-4 h-4 text-emerald-500" />;
      case "DOCUMENT":
        return <FileText className="w-4 h-4 text-indigo-500" />;
      case "ALERT":
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <>
      <div className="relative" ref={popoverRef}>
        {/* Operator Inbox Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "relative p-2.5 rounded-xl border bg-white text-slate-600 hover:text-slate-900 shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer",
            isOpen
              ? "border-blue-500 ring-2 ring-blue-100 text-blue-600"
              : "border-slate-200 hover:bg-slate-50"
          )}
          aria-label="Toggle operator inbox"
          aria-expanded={isOpen}
          title={
            inboxCount > 0
              ? `${inboxCount} action item${inboxCount > 1 ? "s" : ""} waiting for review`
              : "Operator Inbox"
          }
        >
          <Inbox className={cn("w-4 h-4", inboxCount > 0 ? "text-blue-600" : "text-slate-600")} />

          {/* Badge count */}
          {inboxCount > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs ring-2 ring-white animate-in zoom-in duration-150">
              {inboxCount > 9 ? "9+" : inboxCount}
            </span>
          ) : unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs ring-2 ring-white animate-in zoom-in duration-150">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>

        {/* Popover Dropdown */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-88 sm:w-[440px] bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 tracking-tight">
                  Operator Inbox
                </span>
                {currentProject && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-medium border border-slate-200/60">
                    {currentProject.key}
                  </span>
                )}
                {inboxCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-100">
                    {inboxCount} pending
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {activeTab === "activity" && unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    title="Mark all as read"
                    className="flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark read</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Close notifications"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Segmented Control Tabs */}
            <div className="p-2 border-b border-slate-100 bg-slate-50/50">
              <div className="grid grid-cols-3 p-1 bg-slate-200/60 rounded-xl text-xs gap-1 select-none">
                <button
                  type="button"
                  onClick={() => setActiveTab("inbox")}
                  className={cn(
                    "py-1.5 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs",
                    activeTab === "inbox"
                      ? "bg-white text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span>Inbox</span>
                  {inboxCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                      {inboxCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("activity")}
                  className={cn(
                    "py-1.5 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs",
                    activeTab === "activity"
                      ? "bg-white text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Activity</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-300 text-slate-700 text-[10px] font-semibold">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("alerts")}
                  className={cn(
                    "py-1.5 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs",
                    activeTab === "alerts"
                      ? "bg-white text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Alerts</span>
                  {alertCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                      {alertCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Tab 1: ACTIONABLE INBOX CONTENT */}
            {activeTab === "inbox" && (
              <div className="max-h-[390px] overflow-y-auto divide-y divide-slate-100 [scrollbar-width:thin]">
                {loading && inboxItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    <Loader2 className="w-5 h-5 mx-auto mb-2 text-blue-500 animate-spin" />
                    Checking pending proposals and decisions...
                  </div>
                ) : inboxItems.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-2xs">
                      <CheckCheck className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div className="text-xs font-semibold text-slate-800">Inbox Zero</div>
                    <p className="text-[11px] text-slate-400 max-w-[240px] mx-auto leading-relaxed">
                      All caught up! No pending AI proposals, unreviewed decisions, or blocked tasks.
                    </p>
                  </div>
                ) : (
                  inboxItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 hover:bg-slate-50/70 transition-colors text-left flex flex-col gap-2"
                    >
                      {/* Top Header: Badge + Relative Time */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {item.type === "AI_PROPOSAL" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60 text-[10px] font-medium">
                              <Sparkles className="w-3 h-3 text-purple-600" />
                              <span>AI Proposal</span>
                            </span>
                          )}
                          {item.type === "PROPOSED_DECISION" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60 text-[10px] font-medium">
                              <Bookmark className="w-3 h-3 text-amber-600" />
                              <span>Proposed Decision</span>
                            </span>
                          )}
                          {item.type === "BLOCKED_TASK" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/60 text-[10px] font-medium">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>Blocked Task</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-normal">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>

                      {/* Middle: Title & Description */}
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 leading-snug line-clamp-1">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                          {item.subtitle}
                        </p>
                      </div>

                      {/* Bottom Action Bar */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                        {/* Secondary context / Link button */}
                        <div>
                          {item.type === "AI_PROPOSAL" && (
                            <button
                              type="button"
                              onClick={(e) => void handleRejectProposal(item, e)}
                              disabled={actionInProgressId === item.id}
                              className="h-7 px-2.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Dismiss
                            </button>
                          )}
                          {item.type === "PROPOSED_DECISION" && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsOpen(false);
                                router.push("/decisions");
                              }}
                              className="h-7 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-[11px] font-medium transition-all shadow-2xs cursor-pointer"
                            >
                              View details
                            </button>
                          )}
                          {item.type === "BLOCKED_TASK" && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsOpen(false);
                                router.push("/tasks");
                              }}
                              className="h-7 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-[11px] font-medium transition-all shadow-2xs cursor-pointer"
                            >
                              View task
                            </button>
                          )}
                        </div>

                        {/* Primary Action Button */}
                        <div className="flex items-center gap-1.5">
                          {item.type === "AI_PROPOSAL" && (
                            <button
                              type="button"
                              onClick={(e) => handleReviewProposal(item, e)}
                              className="h-7 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Review Proposal</span>
                              <ChevronRight className="w-3 h-3 opacity-70" />
                            </button>
                          )}

                          {item.type === "PROPOSED_DECISION" && (
                            <button
                              type="button"
                              onClick={(e) => void handleAcceptDecision(item, e)}
                              disabled={actionInProgressId === item.id}
                              className="h-7 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {actionInProgressId === item.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3 stroke-[2.5]" />
                              )}
                              <span>Accept Decision</span>
                            </button>
                          )}

                          {item.type === "BLOCKED_TASK" && (
                            <button
                              type="button"
                              onClick={(e) => void handleUnblockTask(item, e)}
                              disabled={actionInProgressId === item.id}
                              className="h-7 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {actionInProgressId === item.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckSquare className="w-3 h-3 text-slate-300" />
                              )}
                              <span>Mark In Progress</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 2 & 3: ACTIVITY / ALERTS LIST */}
            {(activeTab === "activity" || activeTab === "alerts") && (
              <div className="max-h-[390px] overflow-y-auto divide-y divide-slate-100 [scrollbar-width:thin]">
                {activeTab === "activity" && (
                  <div className="px-3.5 py-1.5 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-100">
                    <span>Recent project updates</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setActivityFilter("all")}
                        className={cn(
                          "px-2 py-0.5 rounded cursor-pointer",
                          activityFilter === "all" ? "bg-slate-200 text-slate-900 font-semibold" : "hover:text-slate-900"
                        )}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivityFilter("unread")}
                        className={cn(
                          "px-2 py-0.5 rounded cursor-pointer",
                          activityFilter === "unread" ? "bg-slate-200 text-slate-900 font-semibold" : "hover:text-slate-900"
                        )}
                      >
                        Unread
                      </button>
                    </div>
                  </div>
                )}

                {loading && filteredActivities.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    <Loader2 className="w-5 h-5 mx-auto mb-2 text-slate-300 animate-spin" />
                    Loading updates...
                  </div>
                ) : filteredActivities.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                      <CheckCheck className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">No updates</p>
                    <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                      {activeTab === "alerts"
                        ? "No active alerts or overdue items."
                        : "You have reviewed all recent updates."}
                    </p>
                  </div>
                ) : (
                  filteredActivities.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={cn(
                        "group relative p-3 flex items-start gap-2.5 hover:bg-slate-50 cursor-pointer transition-colors text-left",
                        !item.read && "bg-blue-50/30"
                      )}
                    >
                      {/* Compact Entity Icon */}
                      <div
                        className={cn(
                          "w-7 h-7 rounded-lg shrink-0 mt-0.5 border flex items-center justify-center shadow-2xs",
                          item.entityType === "ALERT"
                            ? "bg-rose-50 text-rose-600 border-rose-200/60"
                            : item.entityType === "TASK"
                            ? "bg-blue-50 text-blue-600 border-blue-200/60"
                            : item.entityType === "REQUIREMENT"
                            ? "bg-purple-50 text-purple-600 border-purple-200/60"
                            : item.entityType === "DECISION"
                            ? "bg-amber-50 text-amber-600 border-amber-200/60"
                            : item.entityType === "MEETING"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200/60"
                            : "bg-slate-50 text-slate-600 border-slate-200/60"
                        )}
                      >
                        {renderIcon(item.entityType)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-semibold text-slate-800 truncate">
                            {item.title}
                          </span>
                          {!item.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-1 inline-block">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>

                      {/* Dismiss button on hover */}
                      <div className="absolute right-2.5 top-3 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleDismiss(item.id, e)}
                          title="Dismiss"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-opacity cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 text-[11px]">
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear read</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push("/dashboard");
                }}
                className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium transition-colors cursor-pointer"
              >
                <span>Open Dashboard</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Proposal Review Dialog (Integrated directly with Inbox) */}
      {reviewingProposal && currentProject && (
        <ProposalReviewDialog
          isOpen={true}
          proposal={reviewingProposal}
          projectId={currentProject.id}
          onClose={() => setReviewingProposal(null)}
          onConfirmed={() => {
            setReviewingProposal(null);
            showToast("AI Proposal confirmed and committed!", "success");
            void loadNotificationsAndInbox();
            window.dispatchEvent(new CustomEvent("workspace:refresh", { detail: { type: "proposal" } }));
          }}
          onRejected={() => {
            setReviewingProposal(null);
            showToast("AI Proposal rejected", "info");
            void loadNotificationsAndInbox();
            window.dispatchEvent(new CustomEvent("workspace:refresh", { detail: { type: "proposal" } }));
          }}
        />
      )}
    </>
  );
};
