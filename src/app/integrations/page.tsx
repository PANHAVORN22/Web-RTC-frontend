"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  RefreshCw,
  Unlink,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertCircle,
  Filter,
  Layers,
  Clock,
  User,
  Tag,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Bot,
  Sparkles,
  Key,
  Terminal,
  Copy,
  Check,
  ShieldCheck,
  Trash2,
  Code2,
  Zap,
  ArrowLeft,
  SlidersHorizontal,
  ChevronRight,
  Boxes,
  Plus,
  MessageSquareQuote,
  FileText,
  Calendar,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { ConfirmModal } from "@/components/confirm-modal";

// ==========================================
// BRAND ICONS
// ==========================================
function GithubIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function GitlabIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#FC6D26">
      <path d="M22.65 14.39L20.6 8.08c-.14-.42-.71-.42-.85 0L17.7 14.39H6.3L4.25 8.08c-.14-.42-.71-.42-.85 0L1.35 14.39c-.11.35.01.73.3.96l10.05 7.55a.5.5 0 00.6 0l10.05-7.55c.29-.23.41-.61.3-.96z" />
    </svg>
  );
}

function JiraIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#0052CC">
      <path d="M11.53 2c0 2.4-1.97 4.35-4.4 4.35H2.8C2.36 6.35 2 6.7 2 7.14v4.33c0 .44.36.8.8.8h4.33c2.4 0 4.4 1.95 4.4 4.35V21c0 .44.36.8.8.8h4.33c.44 0 .8-.36.8-.8v-4.38c0-2.4 1.96-4.35 4.4-4.35H21.2c.44 0 .8-.36.8-.8V7.14c0-.44-.36-.8-.8-.8h-4.33c-2.44 0-4.4-1.95-4.4-4.35V2h-5.94z" />
    </svg>
  );
}

function SlackIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#E01E5A">
      <path d="M6 15a2 2 0 10-2-2v2h2zm1 0a2 2 0 104 0v-5a2 2 0 10-4 0v5zm8-10a2 2 0 102 2v-2h-2zm-1 0a2 2 0 10-4 0v5a2 2 0 104 0V5zm-8 4a2 2 0 10-2-2h2v2zm0 1a2 2 0 100 4h5a2 2 0 100-4H6zm14 4a2 2 0 102 2h-2v-2zm0-1a2 2 0 100-4h-5a2 2 0 100 4h5z" />
    </svg>
  );
}

function SupabaseIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#3ECF8E">
      <path d="M21.36 12.35L12.98 2.27a.8.8 0 00-1.39.56v8.43H3.45a.8.8 0 00-.63 1.29l8.38 10.08a.8.8 0 001.39-.56v-8.43h8.14a.8.8 0 00.63-1.29z" />
    </svg>
  );
}

function FigmaIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#F24E1E" d="M8 2h4v8H8z" />
      <path fill="#FF7262" d="M12 2h4a4 4 0 010 8h-4z" />
      <path fill="#1ABCFE" d="M12 10h4a4 4 0 11-4 4z" />
      <path fill="#A259FF" d="M8 10h4v8H8a4 4 0 010-8z" />
      <path fill="#0ACF83" d="M8 18h4v2a4 4 0 01-4-2z" />
    </svg>
  );
}

function McpIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M18 84.8528L85.8822 16.9706C95.2548 7.59798 110.451 7.59798 119.823 16.9706V16.9706C129.196 26.3431 129.196 41.5391 119.823 50.9117L68.5581 102.177"
        stroke="currentColor"
        strokeWidth="15"
        strokeLinecap="round"
      />
      <path
        d="M69.2652 101.47L119.823 50.9117C129.196 41.5391 144.392 41.5391 153.765 50.9117L154.118 51.2652C163.491 60.6378 163.491 75.8338 154.118 85.2063L92.7248 146.6C89.6006 149.724 89.6006 154.789 92.7248 157.913L105.331 170.52"
        stroke="currentColor"
        strokeWidth="15"
        strokeLinecap="round"
      />
      <path
        d="M102.853 33.9411L52.6482 84.1457C43.2756 93.5183 43.2756 108.714 52.6482 118.087V118.087C62.0208 127.459 77.2167 127.459 86.5893 118.087L136.794 67.8822"
        stroke="currentColor"
        strokeWidth="15"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LinearIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.886 4.18A11.982 11.982 0 0 1 11.99 0C18.624 0 24 5.376 24 12.009c0 3.64-1.62 6.903-4.18 9.105L2.887 4.18ZM1.817 5.626l16.556 16.556c-.524.33-1.075.62-1.65.866L.951 7.277c.247-.575.537-1.126.866-1.65ZM.322 9.163l14.515 14.515c-.71.172-1.443.282-2.195.322L0 11.358a12 12 0 0 1 .322-2.195Zm-.17 4.862 9.823 9.824a12.02 12.02 0 0 1-9.824-9.824Z" />
    </svg>
  );
}

function CursorIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23" />
    </svg>
  );
}

function ClaudeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z" />
    </svg>
  );
}

function CodexIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.064l-4.83 2.79a4.5 4.5 0 0 1-6.15-1.647zm-1.554-9.87a4.5 4.5 0 0 1 2.34-1.97v5.6a.78.78 0 0 0 .392.68l5.843 3.37-2.02 1.169a.076.076 0 0 1-.07.006l-4.834-2.793a4.505 4.505 0 0 1-1.651-6.062zm16.598 4.606-5.844-3.37 2.02-1.167a.076.076 0 0 1 .07-.006l4.833 2.79a4.504 4.504 0 0 1 .693 7.854v-5.42a.795.795 0 0 0-.39-.681zm2.01-3.023-.141-.085-4.783-2.759a.775.775 0 0 0-.78 0L9.106 10.54V8.208a.08.08 0 0 1 .033-.064l4.83-2.79a4.5 4.5 0 0 1 6.68 4.66zM8.307 12.713l-2.02-1.168a.076.076 0 0 1-.038-.052V5.91a4.504 4.504 0 0 1 7.37-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.392.681zm1.096-2.365L12 8.815l2.597 1.533v3.01L12 14.89l-2.597-1.533z" />
    </svg>
  );
}

function AntigravityIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c.4 3.8 3.8 7.2 7.6 7.6-3.8.4-7.2 3.8-7.6 7.6-.4-3.8-3.8-7.2-7.6-7.6 3.8-.4 7.2-3.8 7.6-7.6z" />
      <circle cx="19" cy="5" r="1.5" />
    </svg>
  );
}

// App Types
type ActiveView = "directory" | "mcp" | "github";
type CategoryFilter = "all" | "ai" | "vcs";

export default function IntegrationsPage() {
  const { currentProject } = useAuth();
  const { showToast } = useToast();

  // Navigation state: "directory" | "mcp" | "github"
  const [activeView, setActiveView] = useState<ActiveView>("directory");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [directorySearch, setDirectorySearch] = useState("");

  // Sync state with URL params on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const app = params.get("app");
      if (app === "mcp") setActiveView("mcp");
      else if (app === "github") setActiveView("github");
    }
  }, []);

  const navigateToView = (view: ActiveView) => {
    setActiveView(view);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (view === "directory") url.searchParams.delete("app");
      else url.searchParams.set("app", view);
      window.history.pushState({}, "", url.toString());
    }
  };

  // GitHub state
  const [connection, setConnection] = useState<any>(null);
  const [loadingConnection, setLoadingConnection] = useState(true);
  const [issues, setIssues] = useState<any[]>([]);
  const [totalIssues, setTotalIssues] = useState(0);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [selectedState, setSelectedState] = useState<string>("all");
  const [issueSearchQuery, setIssueSearchQuery] = useState("");
  const [expandedIssues, setExpandedIssues] = useState<Record<string, boolean>>({});

  // MCP state
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpiryDays, setNewKeyExpiryDays] = useState<number>(90);
  const [creatingKey, setCreatingKey] = useState(false);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [keyToRevoke, setKeyToRevoke] = useState<any>(null);
  const [revokingKey, setRevokingKey] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<"prompt" | "cursor" | "claude" | "codex" | "antigravity">("prompt");
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  // Load GitHub connection
  const loadConnection = useCallback(async () => {
    if (!currentProject) return;
    setLoadingConnection(true);
    try {
      const conn = await api.integrations.github.getConnection(currentProject.id);
      setConnection(conn);
      if (conn && conn.status === "CONNECTED") {
        loadIssues(conn);
      } else {
        setIssues([]);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingConnection(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject]);

  const loadIssues = async (activeConn?: any) => {
    if (!currentProject) return;
    setLoadingIssues(true);
    try {
      const res = await api.integrations.github.listIssues(currentProject.id, {
        state: selectedState !== "all" ? selectedState : undefined,
        q: issueSearchQuery.trim() || undefined,
        limit: 50,
      });
      setIssues(res.items || []);
      setTotalIssues(res.total ?? res.items?.length ?? 0);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingIssues(false);
    }
  };

  // Load Personal Access Tokens
  const loadApiKeys = useCallback(async () => {
    setLoadingKeys(true);
    try {
      const keys = await api.auth.listApiKeys();
      setApiKeys(Array.isArray(keys) ? keys : []);
    } catch (err: any) {
      console.error("Failed to load API keys:", err);
    } finally {
      setLoadingKeys(false);
    }
  }, []);

  useEffect(() => {
    loadConnection();
    loadApiKeys();
  }, [loadConnection, loadApiKeys]);

  useEffect(() => {
    if (connection && connection.status === "CONNECTED") {
      loadIssues(connection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState]);

  const handleConnectGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !owner.trim() || !repo.trim()) return;
    setConnecting(true);
    try {
      await api.integrations.github.connect(currentProject.id, {
        repositoryOwner: owner.trim(),
        repositoryName: repo.trim(),
        accessToken: token.trim() || undefined,
      });
      showToast("Connected GitHub repository successfully!", "success");
      setShowConnectForm(false);
      setOwner("");
      setRepo("");
      setToken("");
      await loadConnection();
    } catch (err: any) {
      showToast(err.message || "Failed to connect repository", "error");
    } finally {
      setConnecting(false);
    }
  };

  const handleSyncGithub = async () => {
    if (!currentProject) return;
    setSyncing(true);
    try {
      const res = await api.integrations.github.sync(currentProject.id);
      showToast(`Sync completed: ${res.syncedCount ?? 0} issues synchronized!`, "success");
      await loadConnection();
    } catch (err: any) {
      showToast(err.message || "Sync failed", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnectGithub = async () => {
    if (!currentProject) return;
    setDisconnecting(true);
    try {
      await api.integrations.github.disconnect(currentProject.id);
      showToast("Repository disconnected successfully", "info");
      setConnection(null);
      setIssues([]);
      setTotalIssues(0);
      setShowDisconnectConfirm(false);
    } catch (err: any) {
      showToast(err.message || "Failed to disconnect", "error");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const created = await api.auth.createApiKey({
        name: newKeyName.trim(),
        expiresInDays: newKeyExpiryDays > 0 ? newKeyExpiryDays : undefined,
      });
      showToast("Personal Access Token created successfully!", "success");
      setRevealedToken(created.rawToken || null);
      setNewKeyName("");
      await loadApiKeys();
    } catch (err: any) {
      showToast(err.message || "Failed to create token", "error");
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeApiKey = async () => {
    if (!keyToRevoke) return;
    setRevokingKey(true);
    try {
      await api.auth.revokeApiKey(keyToRevoke.id);
      showToast(`Revoked token "${keyToRevoke.name}"`, "info");
      setKeyToRevoke(null);
      await loadApiKeys();
    } catch (err: any) {
      showToast(err.message || "Failed to revoke token", "error");
    } finally {
      setRevokingKey(false);
    }
  };

  const copyToClipboard = async (text: string, isToken = false) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
    } catch {
      // safe fallback
    }
    if (isToken) {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    }
    showToast("Copied to clipboard!", "success");
  };

  const projectKey = currentProject?.key || "AIW";

  const handleCopyPrompt = async (text: string, id: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
    } catch {
      // safe fallback
    }
    setCopiedPromptId(id);
    setTimeout(() => setCopiedPromptId(null), 2000);
    showToast("Prompt copied to clipboard!", "success");
  };

  const agentCapabilities = [
    {
      id: "update_task_status",
      tool: "update_task_status",
      badge: "Kanban Sync",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
      hoverBorder: "hover:border-emerald-200",
      icon: CheckCircle2,
      description: "Agent updates Kanban cards and dashboard metrics in real-time when work is finished.",
      prompt: `I just completed the OpenAI embeddings service and tests. Update ${projectKey}-TSK-12 to DONE with a summary.`,
    },
    {
      id: "get_decision",
      tool: "get_decision",
      badge: "Architecture ADR",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
      iconBg: "bg-indigo-50 text-indigo-600 border-indigo-100",
      hoverBorder: "hover:border-indigo-200",
      icon: Sparkles,
      description: "Agent reads accepted Architectural Decisions (ADRs) to guarantee code follows project standards.",
      prompt: `Read accepted architectural decision ${projectKey}-DEC-1 before designing this feature module.`,
    },
    {
      id: "create_requirement",
      tool: "create_requirement",
      badge: "Requirements Spec",
      badgeColor: "bg-sky-50 text-sky-700 border-sky-200/80",
      iconBg: "bg-sky-50 text-sky-600 border-sky-100",
      hoverBorder: "hover:border-sky-200",
      icon: FileText,
      description: "Agent drafts formal requirement specifications and acceptance criteria into the project backlog.",
      prompt: `Create a requirement for JWT auth refresh token rotation in ${projectKey} with verification criteria.`,
    },
    {
      id: "get_meeting",
      tool: "get_meeting",
      badge: "Meeting Sync",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200/80",
      iconBg: "bg-purple-50 text-purple-600 border-purple-100",
      hoverBorder: "hover:border-purple-200",
      icon: Calendar,
      description: "Agent reads sprint meeting notes, transcripts, and action items directly in your IDE.",
      prompt: `Fetch the agenda and notes from our latest sprint architecture meeting to verify API contracts.`,
    },
    {
      id: "search_workspace",
      tool: "search_workspace",
      badge: "Hybrid Vector RAG",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200/80",
      iconBg: "bg-amber-50 text-amber-600 border-amber-100",
      hoverBorder: "hover:border-amber-200",
      icon: Search,
      description: "Agent queries vectorized documentation, past meeting notes, and architecture specs using semantic RAG.",
      prompt: `Search the project workspace for our database connection timeout policies.`,
    },
    {
      id: "list_github_issues",
      tool: "list_github_issues",
      badge: "GitHub VCS Sync",
      badgeColor: "bg-slate-100 text-slate-800 border-slate-300/80",
      iconBg: "bg-slate-100 text-slate-700 border-slate-200",
      hoverBorder: "hover:border-slate-300",
      icon: GithubIcon,
      description: "Agent inspects synchronized GitHub issues, labels, and issue numbers to associate with code commits.",
      prompt: `List open GitHub issues in ${projectKey} to find related bug reports for this feature module.`,
    },
  ];

  const apiBaseUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/v1`
      : "http://localhost:3001/api/v1";

  const activeTokenValue = revealedToken || "<YOUR_PERSONAL_ACCESS_TOKEN>";

  const universalAgentPrompt = `Configure and connect our AI Workspace MCP (Model Context Protocol) server for this project repository.

### MCP Server Parameters:
- Server Command: node <PATH_TO_BACKEND>/dist/mcp/cli.js
- Environment Variables:
  AI_WORKSPACE_API_URL: "${apiBaseUrl}"
  AI_WORKSPACE_API_KEY: "${activeTokenValue}"
  AI_WORKSPACE_PROJECT_ID: "${projectKey}"

### Instructions for Agent:
1. Detect my coding environment (Cursor, Claude Code, Codex, or Google Antigravity) and configure the "ai-workspace" MCP server:
   - In Cursor: add to .cursor/mcp.json
   - In Claude Code: run \`claude mcp add ai-workspace -- node "<PATH_TO_BACKEND>/dist/mcp/cli.js" -e AI_WORKSPACE_API_URL="${apiBaseUrl}" -e AI_WORKSPACE_API_KEY="${activeTokenValue}" -e AI_WORKSPACE_PROJECT_ID="${projectKey}"\`
   - In Codex: add to .codex/mcp.json or run \`codex mcp add ai-workspace ...\`
   - In Antigravity: add to ~/.gemini/config/mcp_config.json or .agents/mcp_config.json
2. Test the connection by running MCP tool \`list_tasks\` for project "${projectKey}".
3. Full Platform Capabilities (24 MCP Tools & Resources):
   - Tasks & Kanban: list_tasks, get_task, create_task, update_task_status (real-time board sync)
   - Architecture ADRs: list_decisions, get_decision, propose_decision
   - Requirements: list_requirements, get_requirement, create_requirement, update_requirement_status
   - Meetings & Transcripts: list_meetings, get_meeting, create_meeting
   - Documents & RAG: list_documents, get_document, search_workspace (keyword, semantic, hybrid)
   - GitHub VCS: get_github_integration, list_github_issues
   - Workspace Health: get_dashboard, get_activity_stream, list_projects, get_project, list_project_members
4. Workflow Rules:
   - Consult accepted architecture decisions (\`list_decisions\`) before making design changes.
   - When any assigned task is completed and verified, automatically call \`update_task_status\` to set it to "DONE" on our AI Workspace dashboard.`;

  // Pre-formatted MCP Configs
  const cursorConfigJson = JSON.stringify(
    {
      mcpServers: {
        "ai-workspace": {
          command: "node",
          args: ["<PATH_TO_BACKEND>/dist/mcp/cli.js"],
          env: {
            AI_WORKSPACE_API_URL: apiBaseUrl,
            AI_WORKSPACE_API_KEY: activeTokenValue,
            AI_WORKSPACE_PROJECT_ID: projectKey,
          },
        },
      },
    },
    null,
    2
  );

  const claudeCodeCommand = `claude mcp add ai-workspace -- node "<PATH_TO_BACKEND>/dist/mcp/cli.js" -e AI_WORKSPACE_API_URL="${apiBaseUrl}" -e AI_WORKSPACE_API_KEY="${activeTokenValue}" -e AI_WORKSPACE_PROJECT_ID="${projectKey}"`;

  const codexConfigJson = JSON.stringify(
    {
      mcpServers: {
        "ai-workspace": {
          command: "node",
          args: ["<PATH_TO_BACKEND>/dist/mcp/cli.js"],
          env: {
            AI_WORKSPACE_API_URL: apiBaseUrl,
            AI_WORKSPACE_API_KEY: activeTokenValue,
            AI_WORKSPACE_PROJECT_ID: projectKey,
          },
        },
      },
    },
    null,
    2
  );

  const codexCommand = `codex mcp add ai-workspace -- node "<PATH_TO_BACKEND>/dist/mcp/cli.js" -e AI_WORKSPACE_API_URL="${apiBaseUrl}" -e AI_WORKSPACE_API_KEY="${activeTokenValue}" -e AI_WORKSPACE_PROJECT_ID="${projectKey}"`;

  const antigravityConfigJson = JSON.stringify(
    {
      mcpServers: {
        "ai-workspace": {
          command: "node",
          args: ["<PATH_TO_BACKEND>/dist/mcp/cli.js"],
          env: {
            AI_WORKSPACE_API_URL: apiBaseUrl,
            AI_WORKSPACE_API_KEY: activeTokenValue,
            AI_WORKSPACE_PROJECT_ID: projectKey,
          },
        },
      },
    },
    null,
    2
  );

  const antigravityCommand = `agy mcp add ai-workspace -- node "<PATH_TO_BACKEND>/dist/mcp/cli.js" -e AI_WORKSPACE_API_URL="${apiBaseUrl}" -e AI_WORKSPACE_API_KEY="${activeTokenValue}" -e AI_WORKSPACE_PROJECT_ID="${projectKey}"`;

  // App catalog data
  const isGithubConnected = connection && connection.status === "CONNECTED";
  const installedCount = 2;

  const searchQuery = directorySearch.trim().toLowerCase();

  const isMcpVisible =
    (categoryFilter === "all" || categoryFilter === "ai") &&
    (!searchQuery ||
      "coding agents & mcp model context protocol claude cursor codex antigravity stdio json-rpc access tokens".includes(
        searchQuery
      ));

  const isGithubVisible =
    (categoryFilter === "all" || categoryFilter === "vcs") &&
    (!searchQuery ||
      "github issues sync git repository version control pull requests".includes(searchQuery));

  const hasAnyResults = isMcpVisible || isGithubVisible;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* ========================================================================= */}
        {/* VIEW 1: APPS DIRECTORY / MARKETPLACE (MATCHING REFERENCE APP STORE)       */}
        {/* ========================================================================= */}
        {activeView === "directory" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header & Title */}
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <Link href="/dashboard" className="hover:text-slate-600 transition-colors">
                  Dashboard
                </Link>
                <span>/</span>
                <span className="text-slate-700 font-medium">Integrations & Apps</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-serif flex items-center gap-2.5">
                    <span>Apps & Integrations</span>
                    <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs font-semibold px-2 py-0.5">
                      {installedCount} Active
                    </Badge>
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Connect coding agents, developer tools, and external services to work across your workspace.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    value={directorySearch}
                    onChange={(e) => setDirectorySearch(e.target.value)}
                    placeholder="Search apps & tools..."
                    className="w-full pl-9 pr-3 h-8 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 shadow-2xs"
                  />
                  {directorySearch && (
                    <button
                      type="button"
                      onClick={() => setDirectorySearch("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: "all" as const, label: "All Integrations" },
                { id: "ai" as const, label: "Coding & AI Agents" },
                { id: "vcs" as const, label: "Version Control & Git" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setCategoryFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    categoryFilter === f.id
                      ? "bg-slate-900 text-white font-semibold shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Empty State when search has zero matches */}
            {!hasAnyResults && (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <Search className="w-8 h-8 text-slate-300 mx-auto" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 font-serif">No integrations found</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    No integrations or tools match &ldquo;{directorySearch}&rdquo; in this filter.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDirectorySearch("");
                    setCategoryFilter("all");
                  }}
                  className="text-xs border-slate-200 text-slate-700"
                >
                  Reset Filters
                </Button>
              </div>
            )}

            {/* SECTION: Available Integrations */}
            {(isMcpVisible || isGithubVisible) && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-blue-600" />
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Available Integrations
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* APP CARD 1: Model Context Protocol (MCP) */}
                  {isMcpVisible && (
                    <div
                      onClick={() => navigateToView("mcp")}
                      className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs p-2">
                              <McpIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900 font-serif group-hover:text-blue-600 transition-colors">
                                Coding Agents & MCP
                              </h3>
                              <span className="text-[11px] text-slate-400 font-mono">
                                Model Context Protocol
                              </span>
                            </div>
                          </div>

                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#E8F5E9] text-[#2D8A60] border border-green-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2D8A60]" />
                            Active
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed mb-4">
                          Connect Cursor, Claude Code, Codex, and Google Antigravity via stdio JSON-RPC. Automatically fetch backlog tasks, inspect ADRs, and update dashboard status in real-time.
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            stdio JSON-RPC
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            {apiKeys.length} {apiKeys.length === 1 ? "Token" : "Tokens"}
                          </span>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-slate-200 hover:bg-slate-50 gap-1 text-slate-700 font-medium"
                        >
                          <span>Configure</span>
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* APP CARD 2: GitHub Integration */}
                  {isGithubVisible && (
                    <div
                      onClick={() => navigateToView("github")}
                      className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                              <GithubIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900 font-serif group-hover:text-blue-600 transition-colors">
                                GitHub Issues Sync
                              </h3>
                              <span className="text-[11px] text-slate-400 font-mono">
                                Repository Knowledge
                              </span>
                            </div>
                          </div>

                          {isGithubConnected ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#E8F5E9] text-[#2D8A60] border border-green-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#2D8A60]" />
                              Connected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              Available
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed mb-4">
                          Synchronize GitHub issues and discussions directly into your project&apos;s vector knowledge base for AI Copilot context retrieval and citation evidence.
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            REST v3
                          </span>
                          {isGithubConnected && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {connection.issueCount ?? totalIssues} Synced
                            </span>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-slate-200 hover:bg-slate-50 gap-1 text-slate-700 font-medium"
                        >
                          <span>{isGithubConnected ? "Manage Sync" : "Connect"}</span>
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: CODING AGENTS & MCP APP CONSOLE                                   */}
        {/* ========================================================================= */}
        {activeView === "mcp" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header & Breadcrumb with Back Navigation */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => navigateToView("directory")}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Apps Directory</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#E8F5E9] text-[#2D8A60] border border-green-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2D8A60]" />
                    Protocol Active
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs p-2">
                    <McpIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-serif">
                      Model Context Protocol (MCP)
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Personal Access Tokens and configuration guides for Cursor, Claude Code, Codex, and Antigravity.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setRevealedToken(null);
                    setShowCreateKeyModal(true);
                  }}
                  className="bg-codex-accent hover:bg-codex-hover text-white text-xs gap-1.5 shadow-xs rounded-xl px-4 h-9 font-medium shrink-0"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Generate Access Token</span>
                </Button>
              </div>
            </div>


            {/* Personal Access Tokens Section */}
            <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
              <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
                    <Key className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 font-serif">
                      Personal Access Tokens (PAT)
                    </CardTitle>
                    <p className="text-[11px] text-slate-500">
                      Tokens authenticate your local coding agents with your user identity and project permissions.
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRevealedToken(null);
                    setShowCreateKeyModal(true);
                  }}
                  className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 rounded-lg shadow-2xs font-medium"
                >
                  <Key className="w-3.5 h-3.5 text-blue-600" />
                  <span>New Token</span>
                </Button>
              </CardHeader>

              <CardContent className="p-0">
                {loadingKeys ? (
                  <div className="p-6 space-y-2">
                    <div className="h-10 bg-slate-50 rounded-xl animate-pulse" />
                    <div className="h-10 bg-slate-50 rounded-xl animate-pulse" />
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className="p-10 text-center space-y-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-800">
                      No active Personal Access Tokens
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Generate a token to connect Cursor, Claude Code, Codex, or Antigravity. Tokens are securely hashed with SHA-256 at rest.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => {
                        setRevealedToken(null);
                        setShowCreateKeyModal(true);
                      }}
                      className="text-xs bg-codex-accent hover:bg-codex-hover text-white rounded-lg mt-2"
                    >
                      Create First Token
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-5">Token Name</th>
                          <th className="py-2.5 px-5">Prefix</th>
                          <th className="py-2.5 px-5">Created</th>
                          <th className="py-2.5 px-5">Last Used</th>
                          <th className="py-2.5 px-5">Expires</th>
                          <th className="py-2.5 px-5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {apiKeys.map((k) => (
                          <tr key={k.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-5 font-semibold text-slate-900 font-serif">
                              {k.name}
                            </td>
                            <td className="py-3 px-5 font-mono text-[11px] text-slate-500">
                              <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {k.keyPrefix}...****
                              </span>
                            </td>
                            <td className="py-3 px-5 text-slate-500 font-mono text-[11px]">
                              {formatDate(k.createdAt)}
                            </td>
                            <td className="py-3 px-5 text-slate-500 font-mono text-[11px]">
                              {k.lastUsedAt ? formatDateTime(k.lastUsedAt) : "Never"}
                            </td>
                            <td className="py-3 px-5 text-slate-500 text-[11px]">
                              {k.expiresAt ? (
                                <span className="font-mono text-amber-700">
                                  {formatDate(k.expiresAt)}
                                </span>
                              ) : (
                                <span className="text-slate-400">Never</span>
                              )}
                            </td>
                            <td className="py-3 px-5 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setKeyToRevoke(k)}
                                className="h-7 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 px-2 rounded-lg"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Revoke</span>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Agent Setup Guides & Universal One-Prompt Config */}
            <Card className="rounded-2xl border-slate-200 bg-white shadow-xs overflow-hidden">
              <CardHeader className="p-5 pb-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center border border-blue-200">
                      <Terminal className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 font-serif flex items-center gap-2">
                        <span>Universal Coding Agent Setup</span>
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-semibold py-0">
                          One-Prompt
                        </Badge>
                      </CardTitle>
                      <p className="text-[11px] text-slate-500">
                        Copy one prompt for your coding agent (Cursor, Claude Code, Codex, Antigravity) or select manual config.
                      </p>
                    </div>
                  </div>

                  {/* Sub tabs */}
                  <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                    {[
                      { id: "prompt" as const, label: "One-Prompt Setup", icon: <Zap className="w-3 h-3 text-amber-500 fill-amber-500" /> },
                      { id: "cursor" as const, label: "Cursor", icon: <CursorIcon className="w-3 h-3" /> },
                      { id: "claude" as const, label: "Claude Code", icon: <ClaudeIcon className="w-3 h-3" /> },
                      { id: "codex" as const, label: "Codex", icon: <CodexIcon className="w-3 h-3 text-slate-800" /> },
                      { id: "antigravity" as const, label: "Antigravity", icon: <AntigravityIcon className="w-3 h-3 text-indigo-600" /> },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActiveGuideTab(t.id)}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                          activeGuideTab === t.id
                            ? "bg-slate-900 text-white font-semibold shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {t.icon}
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                {/* 1. UNIVERSAL ONE-PROMPT SETUP (DEFAULT) */}
                {activeGuideTab === "prompt" && (
                  <div className="space-y-4">
                    {/* Zero-Config Callout Banner */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/40 border border-blue-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              revealedToken
                                ? "bg-emerald-600 text-white"
                                : "bg-blue-600 text-white"
                            }`}
                          >
                            {revealedToken ? "Token Injected" : "Zero Config"}
                          </span>
                          <h3 className="text-xs font-bold text-slate-900">
                            Give this prompt to any coding agent
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed max-w-2xl">
                          Works in <strong>Cursor Composer</strong>, <strong>Claude Code CLI</strong>, <strong>Codex</strong>, or <strong>Google Antigravity</strong>. The agent detects your environment, creates the configuration, tests the tools, and automatically updates task status on your board.
                        </p>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => copyToClipboard(universalAgentPrompt)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shadow-xs rounded-xl px-4 h-9 font-medium shrink-0"
                      >
                        {copiedSnippet ? (
                          <Check className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedSnippet ? "Prompt Copied!" : "Copy Agent Prompt"}</span>
                      </Button>
                    </div>

                    {/* Pre-formatted Prompt Box */}
                    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-inner">
                      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                          </div>
                          <span className="font-mono text-slate-300 ml-1 font-semibold text-xs">agent-setup-prompt.md</span>
                          <span className="text-[10px] text-slate-500">· Ready to paste</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(universalAgentPrompt)}
                          className="h-6 text-[11px] text-slate-300 hover:text-white hover:bg-slate-800 gap-1 px-2.5 rounded-md"
                        >
                          {copiedSnippet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedSnippet ? "Copied" : "Copy"}</span>
                        </Button>
                      </div>
                      <pre className="p-4 text-slate-100 font-mono text-[11.5px] leading-relaxed overflow-x-auto whitespace-pre-wrap select-all">
                        {universalAgentPrompt}
                      </pre>
                    </div>

                    {/* 3-Step Flow Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">1</span>
                          <h4 className="text-xs font-semibold text-slate-900">Copy Prompt</h4>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Click &ldquo;Copy Agent Prompt&rdquo; above. Your project key (<strong className="font-mono text-slate-700">{projectKey}</strong>) and token are embedded.
                        </p>
                      </div>
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center">2</span>
                          <h4 className="text-xs font-semibold text-slate-900">Paste in Agent</h4>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Open Cursor Composer (<kbd className="font-mono text-[10px] bg-white px-1 py-0.5 rounded border border-slate-200">Ctrl+I</kbd>), Claude Code CLI, Codex, or Antigravity and paste.
                        </p>
                      </div>
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center">3</span>
                          <h4 className="text-xs font-semibold text-slate-900">Direct Board Sync</h4>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          The agent verifies MCP tools and automatically transitions tasks to <strong className="text-emerald-700">DONE</strong> upon completion.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. MANUAL CURSOR CONFIG */}
                {activeGuideTab === "cursor" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <p>
                        Paste into <strong className="font-mono text-slate-900">.cursor/mcp.json</strong> in your project repository or workspace root:
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(cursorConfigJson)}
                        className="h-7 text-[11px] gap-1.5 border-slate-200"
                      >
                        {copiedSnippet ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedSnippet ? "Copied" : "Copy JSON"}</span>
                      </Button>
                    </div>
                    <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 shadow-inner">
                      {cursorConfigJson}
                    </pre>
                  </div>
                )}

                {/* 3. MANUAL CLAUDE CODE CLI */}
                {activeGuideTab === "claude" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <p>Run this command in your terminal inside your project:</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(claudeCodeCommand)}
                        className="h-7 text-[11px] gap-1.5 border-slate-200"
                      >
                        {copiedSnippet ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedSnippet ? "Copied" : "Copy Command"}</span>
                      </Button>
                    </div>
                    <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 shadow-inner">
                      {claudeCodeCommand}
                    </pre>
                  </div>
                )}

                {/* 4. MANUAL CODEX */}
                {activeGuideTab === "codex" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <p>Run CLI command in your project terminal:</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(codexCommand)}
                          className="h-7 text-[11px] gap-1.5 border-slate-200"
                        >
                          {copiedSnippet ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedSnippet ? "Copied" : "Copy Command"}</span>
                        </Button>
                      </div>
                      <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 shadow-inner">
                        {codexCommand}
                      </pre>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <p>
                          Or paste into <strong className="font-mono text-slate-900">.codex/mcp.json</strong>:
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(codexConfigJson)}
                          className="h-7 text-[11px] gap-1.5 border-slate-200"
                        >
                          {copiedSnippet ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedSnippet ? "Copied" : "Copy JSON"}</span>
                        </Button>
                      </div>
                      <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 shadow-inner">
                        {codexConfigJson}
                      </pre>
                    </div>
                  </div>
                )}

                {/* 5. MANUAL ANTIGRAVITY */}
                {activeGuideTab === "antigravity" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <p>Run with Antigravity CLI (<strong className="font-mono text-slate-900">agy</strong>):</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(antigravityCommand)}
                          className="h-7 text-[11px] gap-1.5 border-slate-200"
                        >
                          {copiedSnippet ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedSnippet ? "Copied" : "Copy Command"}</span>
                        </Button>
                      </div>
                      <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 shadow-inner">
                        {antigravityCommand}
                      </pre>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <p>
                          Or paste into <strong className="font-mono text-slate-900">~/.gemini/config/mcp_config.json</strong> (or <strong className="font-mono text-slate-900">.agents/mcp_config.json</strong>):
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(antigravityConfigJson)}
                          className="h-7 text-[11px] gap-1.5 border-slate-200"
                        >
                          {copiedSnippet ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedSnippet ? "Copied" : "Copy JSON"}</span>
                        </Button>
                      </div>
                      <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 shadow-inner">
                        {antigravityConfigJson}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Agent Capabilities & Example Prompts Grid */}
            <div className="space-y-4 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-200/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-serif">
                      What You Can Ask Your Coding Agent To Do
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Full-platform access across tasks, requirements, architecture ADRs, meetings, documents, dashboard metrics, and GitHub sync.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Badge variant="outline" className="text-[10px] font-medium bg-emerald-50/70 text-emerald-800 border-emerald-200 gap-1.5 px-2.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    24 MCP Tools Active • Full Platform
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agentCapabilities.map((item) => {
                  const Icon = item.icon;
                  const isCopied = copiedPromptId === item.id;
                  return (
                    <Card
                      key={item.id}
                      className={`rounded-2xl border-slate-200/90 bg-white shadow-xs p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-sm ${item.hoverBorder}`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shadow-2xs ${item.iconBg}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-mono text-xs font-semibold text-slate-900">
                              {item.tool}
                            </span>
                          </div>
                          <Badge variant="outline" className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${item.badgeColor}`}>
                            {item.badge}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      <div className="mt-3.5 rounded-xl bg-slate-50/90 border border-slate-200/80 p-3 space-y-2 group/prompt hover:border-slate-300 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <MessageSquareQuote className="w-3 h-3 text-slate-400" />
                            Sample Prompt
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyPrompt(item.prompt, item.id)}
                            className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-2xs transition-all active:scale-95 cursor-pointer"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                                <span className="text-emerald-700 font-semibold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-2.5 h-2.5 text-slate-400 group-hover/prompt:text-slate-600" />
                                <span>Copy Prompt</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="font-mono text-[11px] text-slate-800 leading-relaxed bg-white rounded-lg p-2.5 border border-slate-200/70 shadow-2xs select-all">
                          &ldquo;{item.prompt}&rdquo;
                        </p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: GITHUB ISSUES APP CONSOLE                                         */}
        {/* ========================================================================= */}
        {activeView === "github" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header & Breadcrumb with Back Navigation */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => navigateToView("directory")}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Apps Directory</span>
                </button>

                <div className="flex items-center gap-2">
                  {isGithubConnected ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#E8F5E9] text-[#2D8A60] border border-green-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2D8A60]" />
                      Repository Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      Disconnected
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                    <GithubIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-serif">
                      GitHub Issues Sync
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Synchronize repository issues into vector memory and cite them as authorized evidence.
                    </p>
                  </div>
                </div>

                {isGithubConnected && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={syncing}
                      onClick={handleSyncGithub}
                      className="h-8 text-xs border-slate-200 hover:bg-slate-50 text-slate-700 gap-1.5 shadow-2xs font-medium"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                      <span>{syncing ? "Syncing..." : "Sync Issues"}</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={disconnecting}
                      onClick={() => setShowDisconnectConfirm(true)}
                      className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>{disconnecting ? "Disconnecting..." : "Disconnect"}</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Connection Status or Connect Form */}
            {loadingConnection ? (
              <div className="h-36 rounded-2xl bg-white border border-slate-200 animate-pulse" />
            ) : isGithubConnected ? (
              <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl">
                <CardHeader className="p-5 pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://github.com/${connection.repositoryOwner}/${connection.repositoryName}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-bold text-slate-900 hover:text-codex-accent transition-colors flex items-center gap-1.5 font-serif"
                        >
                          <span>
                            {connection.repositoryOwner}/{connection.repositoryName}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        </a>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                        <span>{connection.issueCount ?? totalIssues} issues synced</span>
                        <span>•</span>
                        <span>
                          Last sync:{" "}
                          {connection.lastSyncedAt
                            ? formatDateTime(connection.lastSyncedAt)
                            : "Never"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Issues from this repository are indexed into your knowledge base. When you chat with the AI Assistant or search, relevant GitHub issues will be retrieved and cited as authorized project evidence.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="p-8 rounded-2xl border border-dashed border-slate-200 bg-white text-center space-y-4 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-white flex items-center justify-center mx-auto shadow-xs">
                  <GithubIcon className="w-6 h-6" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h3 className="text-sm font-bold text-slate-900 font-serif">
                    Connect a GitHub Repository
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Synchronize issues from your GitHub repository to ground AI proposals and answers in real engineering tasks and bug reports.
                  </p>
                </div>

                {!showConnectForm ? (
                  <Button
                    onClick={() => setShowConnectForm(true)}
                    className="bg-codex-accent hover:bg-codex-hover text-white text-xs gap-1.5 shadow-xs rounded-lg px-4"
                  >
                    <GithubIcon className="w-4 h-4" />
                    <span>Connect Repository</span>
                  </Button>
                ) : (
                  <form
                    onSubmit={handleConnectGithub}
                    className="max-w-md mx-auto p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3 animate-in fade-in"
                  >
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Repository Owner / Org *
                      </label>
                      <Input
                        required
                        value={owner}
                        onChange={(e) => setOwner(e.target.value)}
                        placeholder="e.g., facebook or your-username"
                        className="h-8 text-xs bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Repository Name *
                      </label>
                      <Input
                        required
                        value={repo}
                        onChange={(e) => setRepo(e.target.value)}
                        placeholder="e.g., react or ai-workspace"
                        className="h-8 text-xs bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700">
                          Personal Access Token (Optional)
                        </label>
                        <span className="text-[10px] text-slate-400">For private repos</span>
                      </div>
                      <Input
                        type="password"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="ghp_... (leave empty for public repos)"
                        className="h-8 text-xs bg-white font-mono"
                      />
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowConnectForm(false)}
                        className="text-xs text-slate-600 hover:text-slate-900"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={connecting}
                        className="bg-codex-accent hover:bg-codex-hover text-white text-xs px-4"
                      >
                        {connecting ? "Connecting..." : "Confirm & Sync"}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Synced Issues Section */}
            {isGithubConnected && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-codex-accent" />
                    <h2 className="text-sm font-bold text-slate-900 font-serif">
                      Synchronized Issues ({totalIssues})
                    </h2>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                      <input
                        value={issueSearchQuery}
                        onChange={(e) => setIssueSearchQuery(e.target.value)}
                        placeholder="Search issues..."
                        className="pl-8 h-7 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-codex-accent w-44 sm:w-56 shadow-2xs"
                      />
                    </div>

                    <select
                      value={selectedState}
                      onChange={(e) => setSelectedState(e.target.value)}
                      className="h-7 rounded-lg bg-white border border-slate-200 px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-codex-accent shadow-2xs cursor-pointer"
                    >
                      <option value="all">All States</option>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                {loadingIssues ? (
                  <div className="space-y-3">
                    <div className="h-20 rounded-2xl bg-white border border-slate-200 animate-pulse" />
                    <div className="h-20 rounded-2xl bg-white border border-slate-200 animate-pulse" />
                  </div>
                ) : issues.length === 0 ? (
                  <div className="text-center py-12 p-6 rounded-2xl border border-dashed border-slate-200 bg-white space-y-2">
                    <p className="text-xs text-slate-500">
                      No issues found matching your search or state filter.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIssueSearchQuery("");
                        setSelectedState("all");
                      }}
                      className="text-xs"
                    >
                      Clear Filters
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {issues.map((issue) => {
                      const isExpanded = expandedIssues[issue.id];
                      const isOpen = issue.state === "open";
                      return (
                        <Card
                          key={issue.id}
                          className="bg-white border border-slate-200 hover:border-slate-300 transition-all shadow-xs hover:shadow-md rounded-2xl"
                        >
                          <div className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                              <div className="flex items-start gap-2.5">
                                <span className="pt-0.5">
                                  {isOpen ? (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#E8F5E9] text-[#2D8A60] border border-green-200">
                                      OPEN
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                      CLOSED
                                    </span>
                                  )}
                                </span>

                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-bold text-slate-400">
                                      #{issue.issueNumber}
                                    </span>
                                    <a
                                      href={issue.htmlUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs font-bold text-slate-900 hover:text-codex-accent transition-colors flex items-center gap-1 font-serif"
                                    >
                                      <span>{issue.title}</span>
                                      <ExternalLink className="w-3 h-3 text-slate-400" />
                                    </a>
                                  </div>

                                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono flex-wrap">
                                    {issue.authorLogin && (
                                      <span className="flex items-center gap-1">
                                        <User className="w-3 h-3 text-slate-400" />
                                        <span>{issue.authorLogin}</span>
                                      </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      <span>Updated {formatDate(issue.githubUpdatedAt)}</span>
                                    </span>
                                  </div>

                                  {issue.labels && issue.labels.length > 0 && (
                                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                      {issue.labels.map((label: string, idx: number) => (
                                        <span
                                          key={idx}
                                          className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600"
                                        >
                                          {label}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0 flex-wrap">
                                <Link
                                  href={`/tasks?create=true&title=${encodeURIComponent(
                                    `[GH-#${issue.issueNumber}] ${issue.title}`
                                  )}`}
                                >
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-[11px] border-slate-200 text-slate-700 hover:bg-slate-50 gap-1 px-2.5 font-medium shadow-2xs"
                                    title="Create workspace task from this GitHub issue"
                                  >
                                    <CheckSquare className="w-3 h-3 text-[#2D8A60]" />
                                    <span>Create Task</span>
                                  </Button>
                                </Link>
                                <Link
                                  href={`/assistant?prompt=${encodeURIComponent(
                                    `Analyze GitHub issue #${issue.issueNumber}: "${issue.title}". Body: "${
                                      issue.body || "No description"
                                    }". How should we implement and test this?`
                                  )}&mode=DEVELOPER`}
                                >
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-[11px] text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 gap-1 px-2.5 shadow-2xs"
                                    title="Ask Copilot about this issue"
                                  >
                                    <Bot className="w-3 h-3 text-codex-accent" />
                                    <span className="hidden md:inline">Ask Copilot</span>
                                  </Button>
                                </Link>
                                {issue.body && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setExpandedIssues((prev) => ({
                                        ...prev,
                                        [issue.id]: !prev[issue.id],
                                      }));
                                    }}
                                    className="h-7 text-[11px] text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 shrink-0 gap-1 px-2.5 shadow-2xs"
                                  >
                                    <span>{isExpanded ? "Hide Body" : "View Body"}</span>
                                    {isExpanded ? (
                                      <ChevronUp className="w-3 h-3" />
                                    ) : (
                                      <ChevronDown className="w-3 h-3" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Collapsible Body preview */}
                            {isExpanded && issue.body && (
                              <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed animate-in fade-in">
                                {issue.body}
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CREATE API KEY / PAT                                               */}
      {/* ========================================================================= */}
      {showCreateKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
            {!revealedToken ? (
              <form onSubmit={handleCreateApiKey} className="space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-serif">
                      Generate Personal Access Token
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      For Claude Code CLI, Cursor, or Windsurf.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Token Name *</label>
                  <Input
                    required
                    placeholder="e.g. Claude Code CLI, Cursor MacBook"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="h-8 text-xs bg-slate-50 border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Expiration</label>
                  <select
                    value={newKeyExpiryDays}
                    onChange={(e) => setNewKeyExpiryDays(parseInt(e.target.value, 10))}
                    className="w-full h-8 rounded-lg bg-slate-50 border border-slate-200 px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value={30}>30 Days</option>
                    <option value={60}>60 Days</option>
                    <option value={90}>90 Days (Recommended)</option>
                    <option value={365}>1 Year</option>
                    <option value={0}>Never Expires</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-800 leading-relaxed flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    Tokens grant the authenticated agent your exact permissions on this workspace. Keep your token secret and never commit it to source control.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateKeyModal(false)}
                    className="text-xs text-slate-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={creatingKey || !newKeyName.trim()}
                    className="bg-codex-accent hover:bg-codex-hover text-white text-xs px-4"
                  >
                    {creatingKey ? "Creating..." : "Generate Token"}
                  </Button>
                </div>
              </form>
            ) : (
              /* Token Reveal State (Once only!) */
              <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-serif">
                      Token Generated Successfully!
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Copy and store this token now. It will not be shown again.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-relaxed flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Make sure to copy your Personal Access Token now. For your security, you will not be able to view it again after closing this dialog.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Your Access Token</label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={revealedToken}
                      className="h-9 text-xs bg-slate-50 border-slate-200 font-mono text-slate-800"
                    />
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(revealedToken, true)}
                      className="h-9 px-3 bg-slate-900 hover:bg-slate-800 text-white shrink-0 text-xs gap-1.5"
                    >
                      {copiedToken ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedToken ? "Copied" : "Copy"}</span>
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setRevealedToken(null);
                      setShowCreateKeyModal(false);
                    }}
                    className="bg-codex-accent hover:bg-codex-hover text-white text-xs px-5"
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disconnect GitHub Modal */}
      <ConfirmModal
        isOpen={showDisconnectConfirm}
        onClose={() => !disconnecting && setShowDisconnectConfirm(false)}
        onConfirm={handleDisconnectGithub}
        title="Disconnect Repository"
        description="Are you sure you want to disconnect this repository? Synced issues will be unlinked from this workspace."
        confirmText="Disconnect"
        cancelText="Cancel"
        variant="danger"
        loading={disconnecting}
      />

      {/* Revoke Token Modal */}
      <ConfirmModal
        isOpen={!!keyToRevoke}
        onClose={() => !revokingKey && setKeyToRevoke(null)}
        onConfirm={handleRevokeApiKey}
        title="Revoke Personal Access Token"
        description={`Are you sure you want to revoke "${keyToRevoke?.name}"? Any coding agents using this token will immediately lose access.`}
        confirmText="Revoke Token"
        cancelText="Cancel"
        variant="danger"
        loading={revokingKey}
      />
    </AppLayout>
  );
}
