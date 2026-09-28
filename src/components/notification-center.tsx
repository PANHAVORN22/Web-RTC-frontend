"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import {
  Bell,
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
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "alerts">("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
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

  // Fetch live notifications based on current project
  const loadNotifications = useCallback(async () => {
    if (!currentProject?.id) return;
    setLoading(true);

    try {
      const readIds = getReadIds();
      const items: NotificationItem[] = [];

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

      // 2. Fetch recent project activity stream
      try {
        const actRes = await api.dashboard.getActivity(currentProject.id, 1, 15);
        const activities = Array.isArray(actRes) ? actRes : actRes?.data || [];

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
          description: `You are connected to workspace [${currentProject.key}]. Create tasks, requirements, or documents to collaborate.`,
          entityType: "PROJECT",
          createdAt: currentProject.createdAt || new Date().toISOString(),
          read: readIds.has(welcomeId),
          link: "/dashboard",
        });
      }

      setNotifications(items);
    } finally {
      setLoading(false);
    }
  }, [currentProject, getReadIds]);

  // Load when current project changes or component mounts
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Listen to workspace:refresh event to update notifications live
  useEffect(() => {
    const handleRefresh = (e: Event) => {
      const customEvent = e as CustomEvent;
      const type = customEvent.detail?.type || "item";
      // Add immediate optimistic notification
      const newId = `live-${Date.now()}`;
      const optimisticNotification: NotificationItem = {
        id: newId,
        title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Created`,
        description: `You just created a new ${type} in [${currentProject?.key || "Workspace"}].`,
        entityType:
          type === "task"
            ? "TASK"
            : type === "requirement"
            ? "REQUIREMENT"
            : type === "decision"
            ? "DECISION"
            : type === "meeting"
            ? "MEETING"
            : "PROJECT",
        createdAt: new Date().toISOString(),
        read: false,
        link: `/${type}s`,
      };

      setNotifications((prev) => [optimisticNotification, ...prev]);
      // Refetch actual records in background after brief delay
      setTimeout(() => {
        loadNotifications();
      }, 1500);
    };

    window.addEventListener("workspace:refresh", handleRefresh);
    return () => window.removeEventListener("workspace:refresh", handleRefresh);
  }, [currentProject, loadNotifications]);

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

  // Count unread
  const unreadCount = visibleNotifications.filter((n) => !n.read).length;

  // Filtered by tab
  const filteredNotifications = visibleNotifications.filter((n) => {
    if (activeFilter === "unread") return !n.read;
    if (activeFilter === "alerts") return n.entityType === "ALERT";
    return true;
  });

  // Mark single notification as read
  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const readIds = getReadIds();
    readIds.add(id);
    saveReadIds(readIds);
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  };

  // Mark all as read
  const handleMarkAllAsRead = () => {
    const readIds = getReadIds();
    visibleNotifications.forEach((n) => readIds.add(n.id));
    saveReadIds(readIds);
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
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
        return <Sparkles className="w-4 h-4 text-codex-accent" />;
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "relative p-2.5 rounded-xl border bg-white text-slate-600 hover:text-codex-text shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-codex-accent",
          isOpen
            ? "border-codex-accent ring-2 ring-blue-100 text-codex-accent"
            : "border-codex-border hover:bg-slate-50"
        )}
        aria-label="Toggle notifications center"
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs ring-2 ring-white animate-in zoom-in duration-150">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-codex-border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-codex-border bg-slate-50/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-codex-text">Notifications</span>
              {currentProject && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-codex-accent font-semibold border border-blue-100">
                  {currentProject.key}
                </span>
              )}
              {unreadCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-600 font-semibold border border-rose-200">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  title="Mark all as read"
                  className="flex items-center gap-1 text-[11px] font-medium text-codex-accent hover:text-blue-700 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
                aria-label="Close notifications"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-codex-border bg-white px-3 text-xs">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={cn(
                "py-2 px-3 font-medium border-b-2 transition-all",
                activeFilter === "all"
                  ? "border-codex-accent text-codex-accent font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              )}
            >
              All ({visibleNotifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("unread")}
              className={cn(
                "py-2 px-3 font-medium border-b-2 transition-all",
                activeFilter === "unread"
                  ? "border-codex-accent text-codex-accent font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              )}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("alerts")}
              className={cn(
                "py-2 px-3 font-medium border-b-2 transition-all",
                activeFilter === "alerts"
                  ? "border-codex-accent text-codex-accent font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              )}
            >
              Alerts ({visibleNotifications.filter((n) => n.entityType === "ALERT").length})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 [scrollbar-width:thin]">
            {loading && filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <Clock className="w-5 h-5 mx-auto mb-2 text-slate-300 animate-spin" />
                Loading recent notifications...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                  <CheckCheck className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">All caught up!</p>
                <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                  {activeFilter === "unread"
                    ? "You have read all current notifications."
                    : activeFilter === "alerts"
                    ? "No active alerts or overdue items."
                    : `No notifications in ${currentProject?.name || "this workspace"}.`}
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={cn(
                    "group relative p-3.5 flex items-start gap-3 hover:bg-slate-50 cursor-pointer transition-colors text-left",
                    !item.read && "bg-blue-50/40"
                  )}
                >
                  {/* Entity Icon with soft background */}
                  <div
                    className={cn(
                      "p-2 rounded-xl shrink-0 mt-0.5 border shadow-2xs",
                      item.entityType === "ALERT"
                        ? "bg-rose-50 border-rose-200"
                        : item.entityType === "TASK"
                        ? "bg-blue-50 border-blue-200"
                        : item.entityType === "REQUIREMENT"
                        ? "bg-purple-50 border-purple-200"
                        : item.entityType === "DECISION"
                        ? "bg-amber-50 border-amber-200"
                        : item.entityType === "MEETING"
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-slate-50 border-slate-200"
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
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {visibleNotifications.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-codex-border bg-slate-50/60 text-[11px] text-slate-500">
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1 text-slate-500 hover:text-rose-600 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear list</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push("/dashboard");
                }}
                className="flex items-center gap-1 text-codex-accent hover:underline font-medium"
              >
                <span>View Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
