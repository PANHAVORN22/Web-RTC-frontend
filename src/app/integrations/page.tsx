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
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { ConfirmModal } from "@/components/confirm-modal";

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

export default function IntegrationsPage() {
  const { currentProject } = useAuth();
  const { showToast } = useToast();

  const [connection, setConnection] = useState<any>(null);
  const [loadingConnection, setLoadingConnection] = useState(true);

  // Issues state
  const [issues, setIssues] = useState<any[]>([]);
  const [totalIssues, setTotalIssues] = useState(0);
  const [loadingIssues, setLoadingIssues] = useState(false);

  // Action states
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(false);

  // Form state
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);

  // Filter state
  const [selectedState, setSelectedState] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIssues, setExpandedIssues] = useState<Record<string, boolean>>({});

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
      showToast(err.message || "Failed to load GitHub connection", "error");
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
        q: searchQuery.trim() || undefined,
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

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  useEffect(() => {
    if (connection && connection.status === "CONNECTED") {
      loadIssues(connection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState]);

  const handleConnect = async (e: React.FormEvent) => {
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

  const handleSync = async () => {
    if (!currentProject) return;
    setSyncing(true);
    try {
      const res = await api.integrations.github.sync(currentProject.id);
      showToast(
        `Sync completed: ${res.syncedCount ?? 0} issues synchronized!`,
        "success"
      );
      await loadConnection();
    } catch (err: any) {
      showToast(err.message || "Sync failed", "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
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

  const toggleExpand = (id: string) => {
    setExpandedIssues((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-codex-border pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center border border-slate-700 shadow-xs">
                <GithubIcon className="w-4 h-4" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-codex-text font-serif">
                Integrations
              </h1>
            </div>
            <p className="text-xs text-codex-muted mt-1">
              Connect external developer tools. Synced issues are vectorized into your project&apos;s knowledge base and cited in AI conversations.
            </p>
          </div>
        </div>

        {/* GitHub Connection Status Card */}
        {loadingConnection ? (
          <div className="h-36 rounded-2xl bg-white border border-slate-200 animate-pulse" />
        ) : connection && connection.status === "CONNECTED" ? (
          <Card className="bg-white border border-slate-200 shadow-xs rounded-2xl">
            <CardHeader className="p-5 pb-3 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white shadow-xs">
                    <GithubIcon className="w-5 h-5" />
                  </div>
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
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#E8F5E9] text-[#2D8A60] border border-green-200">
                        CONNECTED
                      </span>
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

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={syncing}
                    onClick={handleSync}
                    className="h-8 text-xs border-slate-200 hover:bg-slate-50 text-slate-700 gap-1.5 shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                    <span>{syncing ? "Syncing..." : "Sync Now"}</span>
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
                onSubmit={handleConnect}
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
        {connection && connection.status === "CONNECTED" && (
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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
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
                    setSearchQuery("");
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
                                onClick={() => toggleExpand(issue.id)}
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

      {/* Disconnect Confirmation Modal Card */}
      <ConfirmModal
        isOpen={showDisconnectConfirm}
        onClose={() => !disconnecting && setShowDisconnectConfirm(false)}
        onConfirm={handleDisconnect}
        title="Disconnect Repository"
        description="Are you sure you want to disconnect this repository? Synced issues will be unlinked from this workspace."
        confirmText="Disconnect"
        cancelText="Cancel"
        variant="danger"
        loading={disconnecting}
      />
    </AppLayout>
  );
}
