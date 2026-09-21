"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { AppLayout } from "@/components/app-layout";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Bot,
  Send,
  Plus,
  Trash2,
  Edit3,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  FileText,
  FileCheck2,
  GitPullRequest,
  CheckSquare,
  Calendar,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Zap,
  Code2,
  TestTube,
  Layers,
  Server,
  Presentation,
  ExternalLink,
  Filter,
  ArrowRight,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { MarkdownContent } from "@/components/markdown-content";
import { ConfirmModal } from "@/components/confirm-modal";

const getSourceLink = (sourceType: string, title: string, sourceId?: string) => {
  const cleanTitle = title.replace(/\s*\([^)]*\)$/, "");
  const query = sourceId || cleanTitle;
  switch (sourceType) {
    case "REQUIREMENT":
      return `/requirements?search=${encodeURIComponent(query)}`;
    case "DECISION":
      return `/decisions?search=${encodeURIComponent(query)}`;
    case "TASK":
      return `/tasks?search=${encodeURIComponent(query)}`;
    case "MEETING":
      return `/meetings?search=${encodeURIComponent(query)}`;
    case "DOCUMENT":
      return `/documents?search=${encodeURIComponent(query)}`;
    default:
      return `/search?q=${encodeURIComponent(query)}`;
  }
};

interface CitationItem {
  chunkId: string;
  sourceId: string;
  sourceType: string;
  title: string;
  revision: number;
  locator?: string | null;
  score?: number;
  snippet?: string;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  mode: string;
  content: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  citations: CitationItem[];
  modelName?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  createdAt: string;
}

interface Conversation {
  id: string;
  projectId: string;
  title: string;
  defaultMode: string;
  createdAt: string;
  updatedAt: string;
}

const MODES = [
  { key: "PM", label: "PM", icon: Zap, color: "text-violet-600", bgActive: "bg-violet-50 text-violet-700 border-violet-200", desc: "Project status, risks & blockers" },
  { key: "DEVELOPER", label: "Dev", icon: Code2, color: "text-blue-600", bgActive: "bg-blue-50 text-blue-700 border-blue-200", desc: "Architecture, APIs & code guidance" },
  { key: "QA", label: "QA", icon: TestTube, color: "text-emerald-600", bgActive: "bg-emerald-50 text-emerald-700 border-emerald-200", desc: "Acceptance criteria & test cases" },
  { key: "DX", label: "DX", icon: Layers, color: "text-amber-600", bgActive: "bg-amber-50 text-amber-700 border-amber-200", desc: "Onboarding & developer workflow" },
  { key: "INFRASTRUCTURE", label: "Infra", icon: Server, color: "text-cyan-600", bgActive: "bg-cyan-50 text-cyan-700 border-cyan-200", desc: "Containers & runtime ops" },
  { key: "PRESENTATION", label: "Slides", icon: Presentation, color: "text-pink-600", bgActive: "bg-pink-50 text-pink-700 border-pink-200", desc: "Executive summaries & reports" },
];

const SOURCE_TYPE_ICONS: Record<string, React.ElementType> = {
  DOCUMENT: FileText,
  REQUIREMENT: FileCheck2,
  DECISION: GitPullRequest,
  TASK: CheckSquare,
  MEETING: Calendar,
};

const PROMPT_SUGGESTIONS = [
  {
    mode: "PM",
    title: "Project Scope & Progress",
    desc: "Current requirements status, milestone progress, and blockers.",
    prompt: "What are the core requirements and current project status?",
  },
  {
    mode: "DEVELOPER",
    title: "Database & Vector Architecture",
    desc: "PostgreSQL schema, pgvector indexing, and modular monolith design.",
    prompt: "Explain the database architecture and pgvector indexing rules.",
  },
  {
    mode: "QA",
    title: "QA Test Matrix & Criteria",
    desc: "Acceptance criteria verification, cookie auth edge cases, and CSRF.",
    prompt: "Generate comprehensive QA acceptance test cases for user authentication and session security.",
  },
  {
    mode: "INFRASTRUCTURE",
    title: "DevOps & PostgreSQL Setup",
    desc: "Docker Compose, ports, pgvector extension, and local runtime.",
    prompt: "How are PostgreSQL, pgvector, and local environment variables configured for development?",
  },
];

function getModeConfig(key: string) {
  return MODES.find((m) => m.key === key) ?? MODES[0]!;
}

function UserAvatar({ name }: { name?: string }) {
  const initials = (name ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs">
      {initials}
    </div>
  );
}

export default function AssistantPage() {
  const { currentProject, user } = useAuth();
  const { showToast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedMode, setSelectedMode] = useState<string>("PM");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [inputContent, setInputContent] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [expandedCitation, setExpandedCitation] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Search in conversation history
  const [convSearch, setConvSearch] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<string, "up" | "down">>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => {
    if (!currentProject) return;
    void loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.id]);

  useEffect(() => {
    if (!currentProject || !activeConv) {
      setMessages([]);
      return;
    }
    void loadMessages(activeConv.id);
    setSelectedMode(activeConv.defaultMode || "PM");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConv?.id]);

  const loadConversations = async () => {
    if (!currentProject) return;
    setIsLoading(true);
    try {
      const res = await api.ai.listConversations(currentProject.id);
      const list: Conversation[] = Array.isArray(res) ? res : [];
      setConversations(list);
      if (list.length > 0) {
        setActiveConv((prev) => (prev && list.some((c) => c.id === prev.id) ? prev : list[0]!));
      } else {
        setActiveConv(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (convId: string) => {
    if (!currentProject) return;
    try {
      const res = await api.ai.listMessages(currentProject.id, convId);
      setMessages(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  const handleCreateConversation = async () => {
    if (!currentProject) return;
    try {
      const conv = await api.ai.createConversation(currentProject.id, {
        title: "New Conversation",
        defaultMode: selectedMode,
      });
      setConversations((prev) => [conv, ...prev]);
      setActiveConv(conv);
      setMessages([]);
      textareaRef.current?.focus();
    } catch (err: any) {
      showToast(err.message || "Failed to create conversation", "error");
    }
  };

  const promptDeleteConversation = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    setDeleteTargetId(convId);
  };

  const confirmDeleteConversation = async () => {
    if (!currentProject || !deleteTargetId) return;
    setIsDeleting(true);
    try {
      await api.ai.deleteConversation(currentProject.id, deleteTargetId);
      const updated = conversations.filter((c) => c.id !== deleteTargetId);
      setConversations(updated);
      if (activeConv?.id === deleteTargetId) setActiveConv(updated[0] ?? null);
      setDeleteTargetId(null);
      showToast("Conversation deleted", "info");
    } catch (err: any) {
      showToast(err.message || "Failed to delete conversation", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(msgId);
    showToast("Message copied to clipboard", "success");
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleFeedback = (msgId: string, type: "up" | "down") => {
    setFeedbackState((prev) => ({
      ...prev,
      [msgId]: prev[msgId] === type ? undefined! : type,
    }));
    showToast(type === "up" ? "Thanks for your feedback!" : "Feedback recorded", "info");
  };

  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const text = (textToSend !== undefined ? textToSend : inputContent).trim();
      if (!text || isSending || !currentProject) return;

      setSendError(null);

      let conv = activeConv;
      if (!conv) {
        try {
          conv = await api.ai.createConversation(currentProject.id, {
            title: text.length > 45 ? text.slice(0, 42) + "..." : text,
            defaultMode: selectedMode,
          });
          setActiveConv(conv);
          setConversations((prev) => [conv!, ...prev]);
        } catch (err: any) {
          setSendError(err?.message ?? "Failed to create conversation. Are you logged in?");
          return;
        }
      }

      if (!conv) return;

      const optimisticId = "temp-" + Date.now();
      const optimisticMsg: ChatMessage = {
        id: optimisticId,
        conversationId: conv.id,
        role: "user",
        mode: selectedMode,
        content: text,
        status: "COMPLETED",
        citations: [],
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      setInputContent("");
      setIsSending(true);

      try {
        const res = await api.ai.postMessage(currentProject.id, conv.id, {
          content: text,
          mode: selectedMode,
          sourceType: sourceFilter || undefined,
        });

        const { userMessage, assistantMessage } = res;

        setMessages((prev) => [
          ...prev.filter((m) => m.id !== optimisticId),
          userMessage,
          assistantMessage,
        ]);

        setConversations((prev) =>
          prev.map((c) =>
            c.id === conv!.id && c.title === "New Conversation"
              ? { ...c, title: text.slice(0, 45) }
              : c
          )
        );
      } catch (err: any) {
        setSendError(err?.message ?? "Failed to send message");
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      } finally {
        setIsSending(false);
      }
    },
    [activeConv, currentProject, inputContent, isSending, selectedMode, sourceFilter]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const filteredConversations = useMemo(() => {
    if (!convSearch.trim()) return conversations;
    const q = convSearch.toLowerCase().trim();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.defaultMode.toLowerCase().includes(q)
    );
  }, [conversations, convSearch]);

  const currentModeConfig = getModeConfig(selectedMode);
  const ModeIcon = currentModeConfig.icon;

  return (
    <AppLayout>
      <div className="flex flex-1 h-full w-full overflow-hidden bg-[#F8FAFC]">
        {/* Conversations Sidebar */}
        <aside
          className={
            "border-r border-slate-200/80 bg-white flex flex-col shrink-0 transition-all duration-200 z-10 " +
            (sidebarOpen ? "w-64 sm:w-72" : "w-0 overflow-hidden border-r-0")
          }
        >
          {/* Sidebar Header */}
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 font-serif">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-codex-accent flex items-center justify-center border border-blue-100">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span>Conversations</span>
            </div>
            <Button
              size="sm"
              onClick={() => void handleCreateConversation()}
              className="h-7 px-2.5 text-xs bg-codex-accent hover:bg-codex-hover text-white gap-1 rounded-lg shadow-2xs font-medium"
              title="New chat (Cmd/Ctrl+N)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </Button>
          </div>

          {/* Search Filter */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                value={convSearch}
                onChange={(e) => setConvSearch(e.target.value)}
                placeholder="Filter chats..."
                className="pl-7 h-7 text-xs bg-white border-slate-200 rounded-lg placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center gap-2 text-slate-400 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-codex-accent" />
                <span>Loading chats...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-2 text-center px-4">
                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {conversations.length === 0 ? "No chats yet" : "No matching chats"}
                </p>
                <p className="text-[11px] text-slate-400">
                  {conversations.length === 0 ? "Start a new conversation!" : "Try another search term."}
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isActive = activeConv?.id === c.id;
                const modeConf = getModeConfig(c.defaultMode);
                const MIcon = modeConf.icon;
                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveConv(c)}
                    className={
                      "group flex items-start justify-between gap-1.5 px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-all " +
                      (isActive
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900")
                    }
                  >
                    <div className="truncate flex-1 min-w-0">
                      <div className="truncate font-semibold text-[12px] leading-tight">
                        {c.title || "New Conversation"}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className={
                            "text-[10px] font-mono font-semibold flex items-center gap-1 " +
                            (isActive ? "text-blue-300" : modeConf.color)
                          }
                        >
                          <MIcon className="w-2.5 h-2.5" />
                          {c.defaultMode}
                        </span>
                        <span className={isActive ? "text-slate-500" : "text-slate-300"}>•</span>
                        <span
                          className={
                            "text-[10px] " + (isActive ? "text-slate-400" : "text-slate-400")
                          }
                        >
                          {formatDate(c.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => void promptDeleteConversation(e, c.id)}
                      className={
                        "opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 p-1 rounded hover:text-red-400 transition-all " +
                        (isActive ? "text-slate-400" : "text-slate-400")
                      }
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="px-3.5 py-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 bg-slate-50/50">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2D8A60] shrink-0" />
              <span>Project Grounded</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">pgvector RAG</span>
          </div>
        </aside>

        {/* Main Conversation Canvas */}
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#F8FAFC]">
          {/* Top Header Bar */}
          <header className="h-14 px-4 sm:px-6 border-b border-slate-200/80 bg-white flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-2xs shrink-0"
                title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="w-4 h-4" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4" />
                )}
              </button>

              <div className="truncate">
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate font-serif">
                  {activeConv?.title || "AI Workspace Copilot"}
                </h2>
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  [{currentProject?.key}] {currentProject?.name}
                </span>
              </div>
            </div>

            {/* Mode Tabs / Pills */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="hidden lg:flex items-center gap-1 bg-slate-100/90 rounded-xl p-0.5 border border-slate-200">
                {MODES.map((m) => {
                  const Icon = m.icon;
                  const isSelected = selectedMode === m.key;
                  return (
                    <button
                      key={m.key}
                      onClick={() => setSelectedMode(m.key)}
                      title={m.desc}
                      className={
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all " +
                        (isSelected
                          ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/60")
                      }
                    >
                      <Icon className={"w-3 h-3 " + (isSelected ? "text-codex-accent" : m.color)} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Mobile Mode Select */}
              <div className="lg:hidden flex items-center gap-1">
                <select
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value)}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-codex-accent"
                  aria-label="Select AI mode"
                >
                  {MODES.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label} Mode
                    </option>
                  ))}
                </select>
              </div>

              {/* Model Pill Badge */}
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-[#2D8A60] text-[11px] font-mono font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2D8A60] animate-pulse" />
                <span>DeepSeek V4 Pro</span>
              </div>
            </div>
          </header>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
            {messages.length === 0 ? (
              <div className="max-w-2xl mx-auto mt-6 space-y-6 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">
                    AI Workspace Copilot
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg mx-auto leading-relaxed">
                    Ask questions, verify specifications, or generate implementation proposals. Every answer is grounded in project records with verified citations.
                  </p>
                </div>

                {/* Active Mode Pill Card */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200 bg-white text-xs shadow-2xs">
                  <ModeIcon className={"w-3.5 h-3.5 " + currentModeConfig.color} />
                  <span className="font-semibold text-slate-800">{currentModeConfig.label} Mode:</span>
                  <span className="text-slate-500">{currentModeConfig.desc}</span>
                </div>

                {/* 4-Card Starter Prompt Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  {PROMPT_SUGGESTIONS.map((item, idx) => {
                    const mc = getModeConfig(item.mode);
                    const SIcon = mc.icon;
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedMode(item.mode);
                          setTimeout(() => void handleSendMessage(item.prompt), 0);
                        }}
                        className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-codex-accent/50 hover:shadow-md transition-all cursor-pointer group space-y-1.5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                                <SIcon className={"w-3.5 h-3.5 " + mc.color} />
                              </div>
                              <span className="text-xs font-bold text-slate-800 group-hover:text-codex-accent transition-colors font-serif">
                                {item.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-medium">
                              {item.mode}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                        <div className="pt-2 flex items-center gap-1 text-[11px] text-codex-accent font-medium group-hover:underline">
                          <span>Run prompt</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isAssistant = msg.role === "assistant";
                const isFailed = msg.status === "FAILED";
                const isInsufficient =
                  msg.content.toLowerCase().includes("insufficient evidence") ||
                  msg.content.toLowerCase().includes("no relevant project evidence");

                return (
                  <div
                    key={msg.id}
                    className={
                      "flex gap-3 items-start max-w-4xl mx-auto " +
                      (!isAssistant ? "flex-row-reverse" : "")
                    }
                  >
                    {isAssistant ? (
                      <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 shadow-2xs">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <UserAvatar name={user?.displayName ?? user?.fullName} />
                    )}

                    <div
                      className={
                        "space-y-1.5 " +
                        (isAssistant
                          ? "w-full max-w-[90%] sm:max-w-[85%]"
                          : "max-w-[80%] sm:max-w-[70%]")
                      }
                    >
                      {/* Meta header */}
                      <div
                        className={
                          "flex items-center gap-2 text-[10px] text-slate-400 " +
                          (!isAssistant ? "flex-row-reverse" : "")
                        }
                      >
                        <span className="font-semibold text-slate-700">
                          {isAssistant ? "AI Copilot" : user?.displayName ?? "You"}
                        </span>
                        {isAssistant && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                            {msg.mode}
                          </span>
                        )}
                        <span>{formatDateTime(msg.createdAt)}</span>
                      </div>

                      {/* Bubble Body */}
                      <div
                        className={
                          "rounded-2xl p-4 sm:p-5 space-y-3 " +
                          (isAssistant
                            ? isFailed
                              ? "bg-red-50 border border-red-200 text-red-700"
                              : "bg-white border border-slate-200/90 shadow-xs text-slate-800"
                            : "bg-slate-900 text-white shadow-xs")
                        }
                      >
                        {isAssistant && isInsufficient && (
                          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-amber-800">
                                Knowledge Boundary Enforced
                              </p>
                              <p className="text-[11px] text-amber-700 mt-0.5">
                                No verified evidence in this workspace — the assistant declined to hallucinate unverified content.
                              </p>
                            </div>
                          </div>
                        )}

                        {isAssistant ? (
                          <div className="text-[13px] leading-relaxed text-slate-800">
                            <MarkdownContent content={msg.content} />
                          </div>
                        ) : (
                          <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-white">
                            {msg.content}
                          </p>
                        )}

                        {/* Citations Drawer */}
                        {isAssistant && msg.citations && msg.citations.length > 0 && (
                          <div className="pt-3 border-t border-slate-100 space-y-2">
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono uppercase tracking-wider font-bold">
                              <ShieldCheck className="w-3 h-3 text-[#2D8A60]" />
                              <span>Verified Citations ({msg.citations.length})</span>
                            </div>
                            <div className="space-y-1.5">
                              {msg.citations.map((cite, cIdx) => {
                                const Icon = SOURCE_TYPE_ICONS[cite.sourceType] ?? FileText;
                                const isExpanded = expandedCitation === cite.chunkId;
                                return (
                                  <div
                                    key={cIdx}
                                    className="rounded-xl border border-slate-200/80 bg-slate-50/70 overflow-hidden text-xs"
                                  >
                                    <button
                                      onClick={() =>
                                        setExpandedCitation(isExpanded ? null : cite.chunkId)
                                      }
                                      className="w-full flex items-center justify-between px-3 py-2 text-[11px] hover:bg-slate-100/70 transition-colors"
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <span className="font-mono text-slate-400 shrink-0 font-semibold">
                                          #{cIdx + 1}
                                        </span>
                                        <Icon className="w-3.5 h-3.5 text-codex-accent shrink-0" />
                                        <span className="text-slate-800 truncate font-semibold">
                                          {cite.title}
                                        </span>
                                        {cite.locator && (
                                          <span className="text-slate-400 truncate text-[10px] font-mono">
                                            ({cite.locator})
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0 ml-2">
                                        <Link
                                          href={getSourceLink(
                                            cite.sourceType,
                                            cite.title,
                                            cite.sourceId
                                          )}
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-slate-400 hover:text-codex-accent p-0.5 rounded transition-colors"
                                          title={`Inspect in ${cite.sourceType.toLowerCase()} module`}
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                        </Link>
                                        {cite.score !== undefined && (
                                          <span className="text-[9px] font-mono text-slate-400">
                                            score: {cite.score.toFixed(4)}
                                          </span>
                                        )}
                                        {isExpanded ? (
                                          <ChevronUp className="w-3 h-3 text-slate-400" />
                                        ) : (
                                          <ChevronDown className="w-3 h-3 text-slate-400" />
                                        )}
                                      </div>
                                    </button>

                                    {isExpanded && cite.snippet && (
                                      <div className="px-3 pb-2.5 pt-1.5 border-t border-slate-200 bg-white">
                                        <p className="text-[11px] text-slate-600 italic leading-relaxed">
                                          &ldquo;{cite.snippet}&rdquo;
                                        </p>
                                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                                          <span className="text-[10px] text-slate-400 font-mono">
                                            {cite.sourceType} • Rev {cite.revision}
                                            {cite.locator ? " • " + cite.locator : ""}
                                          </span>
                                          <Link
                                            href={getSourceLink(
                                              cite.sourceType,
                                              cite.title,
                                              cite.sourceId
                                            )}
                                            className="text-[10px] text-codex-accent hover:underline flex items-center gap-1 font-medium"
                                          >
                                            <span>Inspect Source</span>
                                            <ExternalLink className="w-2.5 h-2.5" />
                                          </Link>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Assistant Action Buttons Toolbar */}
                        {isAssistant && !isFailed && (
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleCopyMessage(msg.id, msg.content)}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1 text-[11px]"
                                title="Copy response"
                              >
                                {copiedMsgId === msg.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-[#2D8A60]" />
                                    <span className="text-[#2D8A60] text-[10px]">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span className="text-[10px]">Copy</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleFeedback(msg.id, "up")}
                                className={
                                  "p-1 rounded transition-colors text-[10px] flex items-center gap-0.5 " +
                                  (feedbackState[msg.id] === "up"
                                    ? "text-[#2D8A60] bg-emerald-50"
                                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-100")
                                }
                                title="Helpful"
                              >
                                <ThumbsUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleFeedback(msg.id, "down")}
                                className={
                                  "p-1 rounded transition-colors text-[10px] flex items-center gap-0.5 " +
                                  (feedbackState[msg.id] === "down"
                                    ? "text-red-500 bg-red-50"
                                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-100")
                                }
                                title="Needs improvement"
                              >
                                <ThumbsDown className="w-3 h-3" />
                              </button>
                            </div>

                            <span className="text-[10px] text-slate-400 font-mono">
                              DeepSeek V4 Pro
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {isSending && (
              <div className="flex items-start gap-3 max-w-4xl mx-auto">
                <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 shadow-2xs">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-codex-accent rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-codex-accent rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-codex-accent rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span className="text-xs text-slate-600 font-medium">
                    Retrieving knowledge chunks & generating grounded answer…
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Floating Elevated Bottom Composer */}
          <footer className="p-4 sm:px-8 border-t border-slate-200/80 bg-white/80 backdrop-blur-md shrink-0">
            <div className="max-w-4xl mx-auto space-y-2">
              {sendError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                  <span className="flex-1">{sendError}</span>
                  <button
                    onClick={() => setSendError(null)}
                    className="text-red-500 hover:text-red-700 transition-colors ml-auto"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Elevated Chat Composer Box */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm focus-within:border-codex-accent focus-within:ring-2 focus-within:ring-codex-accent/15 p-3 transition-all">
                <Textarea
                  ref={textareaRef}
                  value={inputContent}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setInputContent(e.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  placeholder={
                    "Ask in " +
                    currentModeConfig.label +
                    " mode — " +
                    currentModeConfig.desc.toLowerCase() +
                    "…"
                  }
                  rows={2}
                  disabled={isSending}
                  className="bg-transparent border-0 focus-visible:ring-0 p-0 text-[13px] text-slate-900 placeholder:text-slate-400 resize-none min-h-[44px] flex-1 shadow-none"
                />

                {/* Composer Toolbar */}
                <div className="pt-2 mt-1 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Filter className="w-3 h-3 text-slate-400" />
                      <select
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-slate-700 text-[11px] focus:outline-none focus:ring-1 focus:ring-codex-accent cursor-pointer"
                        aria-label="Filter knowledge source"
                      >
                        <option value="">All Project Knowledge</option>
                        <option value="DOCUMENT">Documents Only</option>
                        <option value="REQUIREMENT">Requirements Only</option>
                        <option value="DECISION">Decisions Only</option>
                        <option value="TASK">Tasks Only</option>
                        <option value="MEETING">Meetings Only</option>
                      </select>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
                      DeepSeek V4 Pro
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline text-[10px] text-slate-400">
                      <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-slate-600">
                        Enter
                      </kbd>{" "}
                      to send
                    </span>

                    <Button
                      onClick={() => void handleSendMessage()}
                      disabled={!inputContent.trim() || isSending || !currentProject}
                      size="sm"
                      className="h-8 w-8 p-0 bg-codex-accent hover:bg-codex-hover disabled:opacity-30 text-white rounded-xl transition-all shrink-0 flex items-center justify-center shadow-xs"
                      title="Send message"
                    >
                      {isSending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* Confirmation Modal for Conversation Deletion */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        onClose={() => !isDeleting && setDeleteTargetId(null)}
        onConfirm={confirmDeleteConversation}
        title="Delete Conversation"
        description="Are you sure you want to delete this conversation? This will permanently delete its messages and citations."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={isDeleting}
      />
    </AppLayout>
  );
}
