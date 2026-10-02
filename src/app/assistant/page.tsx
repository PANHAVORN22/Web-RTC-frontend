"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { AppLayout } from "@/components/app-layout";
import { api } from "@/lib/api";
import {
  Sparkles,
  Bot,
  Send,
  Plus,
  Trash2,
  Search,
  PanelLeftClose,
  PanelLeft,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
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
  Eye,
  X,
  ArrowUpRight,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { MarkdownContent } from "@/components/markdown-content";
import { ConfirmModal } from "@/components/confirm-modal";

const getSourceLink = (sourceType: string, title: string, sourceId?: string) => {
  const cleanTitle = title.replace(/\s*\([^)]*\)$/, "").trim();
  const params = new URLSearchParams();
  if (sourceId) {
    params.set("id", sourceId);
  }
  if (cleanTitle) {
    params.set("search", cleanTitle);
  }
  const qs = params.toString() ? `?${params.toString()}` : "";

  switch (sourceType) {
    case "REQUIREMENT":
      return `/requirements${qs}`;
    case "DECISION":
      return `/decisions${qs}`;
    case "TASK":
      return `/tasks${qs}`;
    case "MEETING":
      return `/meetings${qs}`;
    case "DOCUMENT":
      return `/documents${qs}`;
    default:
      return `/search?q=${encodeURIComponent(cleanTitle || sourceId || "")}`;
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
  { key: "PM", label: "PM", icon: Zap, color: "text-violet-600", desc: "Project status, risks & blockers" },
  { key: "DEVELOPER", label: "Dev", icon: Code2, color: "text-blue-600", desc: "Architecture, APIs & code guidance" },
  { key: "QA", label: "QA", icon: TestTube, color: "text-emerald-600", desc: "Acceptance criteria & test cases" },
  { key: "DX", label: "DX", icon: Layers, color: "text-amber-600", desc: "Developer workflow & onboarding" },
  { key: "INFRASTRUCTURE", label: "Infra", icon: Server, color: "text-cyan-600", desc: "Containers & runtime ops" },
  { key: "PRESENTATION", label: "Slides", icon: Presentation, color: "text-pink-600", desc: "Executive summaries & reports" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "All Project Knowledge", icon: Layers },
  { value: "DOCUMENT", label: "Documents Only", icon: FileText },
  { value: "REQUIREMENT", label: "Requirements Only", icon: FileCheck2 },
  { value: "DECISION", label: "Decisions Only", icon: GitPullRequest },
  { value: "TASK", label: "Tasks Only", icon: CheckSquare },
  { value: "MEETING", label: "Meetings Only", icon: Calendar },
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
    modeLabel: "PM",
    icon: Zap,
    title: "Project Scope & Progress",
    desc: "Current requirements status, milestone progress, and blockers.",
    prompt: "What are the core requirements and current project status?",
  },
  {
    mode: "DEVELOPER",
    modeLabel: "Dev",
    icon: Code2,
    title: "Database & Vector Architecture",
    desc: "PostgreSQL schema, pgvector indexing, and modular monolith design.",
    prompt: "Explain the database architecture and pgvector indexing rules.",
  },
  {
    mode: "QA",
    modeLabel: "QA",
    icon: TestTube,
    title: "QA Test Matrix & Criteria",
    desc: "Acceptance criteria verification, cookie auth edge cases, and CSRF.",
    prompt: "Generate comprehensive QA acceptance test cases for user authentication and session security.",
  },
  {
    mode: "INFRASTRUCTURE",
    modeLabel: "Infra",
    icon: Server,
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

function DeepSeekIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="DeepSeek Logo"
    >
      <path
        d="M27.501 8.46875C27.249 8.3457 27.1406 8.58008 26.9932 8.69922C26.9434 8.73828 26.9004 8.78906 26.8584 8.83398C26.4902 9.22852 26.0605 9.48633 25.5 9.45508C24.6787 9.41016 23.9785 9.66797 23.3594 10.2969C23.2275 9.52148 22.79 9.05859 22.125 8.76172C21.7764 8.60742 21.4238 8.45312 21.1807 8.11719C21.0098 7.87891 20.9639 7.61328 20.8779 7.35156C20.8242 7.19336 20.7695 7.03125 20.5879 7.00391C20.3906 6.97266 20.3135 7.13867 20.2363 7.27734C19.9258 7.84375 19.8066 8.46875 19.8174 9.10156C19.8447 10.5234 20.4453 11.6562 21.6367 12.4629C21.7725 12.5547 21.8076 12.6484 21.7646 12.7832C21.6836 13.0605 21.5869 13.3301 21.501 13.6074C21.4473 13.7852 21.3662 13.8242 21.1768 13.7461C20.5225 13.4727 19.957 13.0684 19.458 12.5781C18.6104 11.7578 17.8438 10.8516 16.8877 10.1426C16.6631 9.97656 16.4395 9.82227 16.207 9.67578C15.2314 8.72656 16.335 7.94727 16.5898 7.85547C16.8574 7.75977 16.6826 7.42773 15.8193 7.43164C14.957 7.43555 14.167 7.72461 13.1611 8.10938C13.0137 8.16797 12.8594 8.21094 12.7002 8.24414C11.7871 8.07227 10.8389 8.0332 9.84766 8.14453C7.98242 8.35352 6.49219 9.23633 5.39648 10.7441C4.08105 12.5547 3.77148 14.6133 4.15039 16.7617C4.54883 19.0234 5.70215 20.8984 7.47559 22.3633C9.31348 23.8809 11.4307 24.625 13.8457 24.4824C15.3125 24.3984 16.9463 24.2012 18.7881 22.6406C19.2529 22.8711 19.7402 22.9629 20.5498 23.0332C21.1729 23.0918 21.7725 23.002 22.2373 22.9062C22.9648 22.752 22.9141 22.0781 22.6514 21.9531C20.5186 20.959 20.9863 21.3633 20.5605 21.0371C21.6445 19.752 23.2783 18.418 23.917 14.0977C23.9668 13.7539 23.9238 13.5391 23.917 13.2598C23.9131 13.0918 23.9512 13.0254 24.1445 13.0059C24.6787 12.9453 25.1973 12.7988 25.6738 12.5352C27.0557 11.7793 27.6123 10.5391 27.7441 9.05078C27.7637 8.82422 27.7402 8.58789 27.501 8.46875ZM15.46 21.8613C13.3926 20.2344 12.3906 19.6992 11.9766 19.7227C11.5898 19.7441 11.6592 20.1875 11.7441 20.4766C11.833 20.7617 11.9492 20.959 12.1123 21.209C12.2246 21.375 12.3018 21.623 12 21.8066C11.334 22.2207 10.1768 21.668 10.1221 21.6406C8.77539 20.8477 7.64941 19.7988 6.85547 18.3652C6.08984 16.9844 5.64453 15.5039 5.57129 13.9238C5.55176 13.541 5.66406 13.4062 6.04297 13.3379C6.54199 13.2461 7.05762 13.2266 7.55664 13.2988C9.66602 13.6074 11.4619 14.5527 12.9668 16.0469C13.8262 16.9004 14.4766 17.918 15.1465 18.9121C15.8584 19.9688 16.625 20.9746 17.6006 21.7988C17.9443 22.0879 18.2197 22.3086 18.4824 22.4707C17.6895 22.5586 16.3652 22.5781 15.46 21.8613ZM16.4502 15.4805C16.4502 15.3105 16.5859 15.1758 16.7568 15.1758C16.7949 15.1758 16.8301 15.1836 16.8613 15.1953C16.9033 15.2109 16.9424 15.2344 16.9727 15.2695C17.0273 15.3223 17.0586 15.4004 17.0586 15.4805C17.0586 15.6504 16.9229 15.7852 16.7529 15.7852C16.582 15.7852 16.4502 15.6504 16.4502 15.4805ZM19.5273 17.0625C19.3301 17.1426 19.1328 17.2129 18.9434 17.2207C18.6494 17.2344 18.3281 17.1152 18.1533 16.9688C17.8828 16.7422 17.6895 16.6152 17.6074 16.2168C17.5732 16.0469 17.5928 15.7852 17.623 15.6348C17.6934 15.3105 17.6152 15.1035 17.3877 14.9141C17.2012 14.7598 16.9658 14.7188 16.7061 14.7188C16.6094 14.7188 16.5205 14.6758 16.4541 14.6406C16.3457 14.5859 16.2568 14.4512 16.3418 14.2852C16.3691 14.2324 16.501 14.1016 16.5322 14.0781C16.8838 13.877 17.29 13.9434 17.666 14.0938C18.0146 14.2363 18.2773 14.498 18.6562 14.8672C19.0439 15.3145 19.1133 15.4395 19.334 15.7734C19.5078 16.0371 19.667 16.3066 19.7754 16.6152C19.8408 16.8066 19.7559 16.9648 19.5273 17.0625Z"
        fill="#4D6BFE"
        fillRule="nonzero"
      />
    </svg>
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
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const skipLoadMessagesRef = useRef<string | null>(null);
  const [expandedCitation, setExpandedCitation] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Search in conversation history
  const [convSearch, setConvSearch] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [composerModeOpen, setComposerModeOpen] = useState<boolean>(false);
  const [composerSourceOpen, setComposerSourceOpen] = useState<boolean>(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<string, "up" | "down">>({});
  const [inspectingCitation, setInspectingCitation] = useState<CitationItem | null>(null);
  const [inspectingDetails, setInspectingDetails] = useState<any | null>(null);
  const [loadingInspectDetails, setLoadingInspectDetails] = useState<boolean>(false);

  // Fetch complete entity records when inspecting citation in-app
  useEffect(() => {
    if (!inspectingCitation || !currentProject) {
      setInspectingDetails(null);
      return;
    }
    let isCancelled = false;
    setLoadingInspectDetails(true);
    setInspectingDetails(null);

    const loadDetails = async () => {
      try {
        const id = inspectingCitation.sourceId;
        const type = inspectingCitation.sourceType;
        if (!id) return;

        if (type === "TASK") {
          const list = await api.tasks.list(currentProject.id);
          const found = (Array.isArray(list) ? list : []).find((t: any) => t.id === id);
          if (!isCancelled && found) setInspectingDetails(found);
        } else if (type === "DECISION") {
          const list = await api.decisions.list(currentProject.id);
          const found = (Array.isArray(list) ? list : []).find((d: any) => d.id === id);
          if (!isCancelled && found) setInspectingDetails(found);
        } else if (type === "REQUIREMENT") {
          const list = await api.requirements.list(currentProject.id);
          const found = (Array.isArray(list) ? list : []).find((r: any) => r.id === id);
          if (!isCancelled && found) setInspectingDetails(found);
        } else if (type === "MEETING") {
          const list = await api.meetings.list(currentProject.id);
          const found = (Array.isArray(list) ? list : []).find((m: any) => m.id === id);
          if (!isCancelled && found) setInspectingDetails(found);
        } else if (type === "DOCUMENT") {
          const res = await api.documents.list(currentProject.id);
          const items = Array.isArray(res) ? res : (res as any)?.data || (res as any)?.items || [];
          const found = items.find((d: any) => d.id === id);
          if (!isCancelled && found) setInspectingDetails(found);
        }
      } catch (err) {
        console.error("Failed to load inspecting citation details:", err);
      } finally {
        if (!isCancelled) setLoadingInspectDetails(false);
      }
    };

    void loadDetails();

    return () => {
      isCancelled = true;
    };
  }, [inspectingCitation, currentProject]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerModeRef = useRef<HTMLDivElement>(null);
  const composerSourceRef = useRef<HTMLDivElement>(null);

  // Auto-scroll only when messages exist or sending
  useEffect(() => {
    if (messages.length > 0 || isSending) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isSending]);

  // Click outside and escape key to close drop-up menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (composerModeRef.current && !composerModeRef.current.contains(target)) {
        setComposerModeOpen(false);
      }
      if (composerSourceRef.current && !composerSourceRef.current.contains(target)) {
        setComposerSourceOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setComposerModeOpen(false);
        setComposerSourceOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const loadConversations = useCallback(async () => {
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
  }, [currentProject]);

  const loadMessages = useCallback(async (convId: string) => {
    if (!currentProject) return;
    setIsLoadingMessages(true);
    try {
      const res = await api.ai.listMessages(currentProject.id, convId);
      const fetched = Array.isArray(res) ? res : [];
      setMessages((prev) => {
        // Keep any active optimistic user messages so they never vanish
        const optimistic = prev.filter((m) => m.id.startsWith("temp-"));
        if (optimistic.length > 0) {
          const fetchedIds = new Set(fetched.map((m) => m.id));
          return [...fetched, ...optimistic.filter((m) => !fetchedIds.has(m.id))];
        }
        return fetched;
      });
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [currentProject]);

  useEffect(() => {
    if (!currentProject) return;
    void loadConversations();
  }, [currentProject, loadConversations]);

  useEffect(() => {
    if (!currentProject || !activeConv) {
      setMessages([]);
      setIsLoadingMessages(false);
      return;
    }
    // If this conversation was just newly created, skip fetching empty message list from server
    if (skipLoadMessagesRef.current === activeConv.id) {
      skipLoadMessagesRef.current = null;
      setIsLoadingMessages(false);
      return;
    }
    void loadMessages(activeConv.id);
    setSelectedMode(activeConv.defaultMode || "PM");
  }, [activeConv, currentProject, loadMessages]);

  const handleCreateConversation = async () => {
    if (!currentProject) return;
    try {
      const conv = await api.ai.createConversation(currentProject.id, {
        title: "New Conversation",
        defaultMode: selectedMode,
      });
      skipLoadMessagesRef.current = conv.id;
      setConversations((prev) => [conv, ...prev]);
      setActiveConv(conv);
      setMessages([]);
      setIsLoadingMessages(false);
      textareaRef.current?.focus();
    } catch (err: any) {
      showToast(err.message || "Failed to create conversation", "error");
    }
  };

  const handleResetChat = () => {
    setActiveConv(null);
    setMessages([]);
    setIsLoadingMessages(false);
    setInputContent("");
    setSendError(null);
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
      if (activeConv?.id === deleteTargetId) {
        setActiveConv(updated[0] ?? null);
        if (updated.length === 0) setMessages([]);
      }
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
      setIsSending(true);
      setInputContent("");

      const optimisticId = "temp-" + Date.now();
      const optimisticMsg: ChatMessage = {
        id: optimisticId,
        conversationId: activeConv?.id ?? "temp-conv",
        role: "user",
        mode: selectedMode,
        content: text,
        status: "COMPLETED",
        citations: [],
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      let conv = activeConv;
      if (!conv) {
        try {
          conv = await api.ai.createConversation(currentProject.id, {
            title: text.length > 45 ? text.slice(0, 42) + "..." : text,
            defaultMode: selectedMode,
          });
          if (!conv) throw new Error("Conversation creation returned empty response");
          skipLoadMessagesRef.current = conv.id;
          setActiveConv(conv);
          setConversations((prev) => [conv!, ...prev]);
        } catch (err: any) {
          setSendError(err?.message ?? "Failed to create conversation. Are you logged in?");
          setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
          setInputContent(text);
          setIsSending(false);
          return;
        }
      }

      if (!conv) {
        setIsSending(false);
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        return;
      }

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
  const currentSourceOption = useMemo(
    () => SOURCE_OPTIONS.find((s) => s.value === sourceFilter) || SOURCE_OPTIONS[0]!,
    [sourceFilter]
  );

  return (
    <AppLayout>
      <div className="flex flex-1 h-full w-full overflow-hidden bg-[#F8FAFC]">
        {/* Collapsible Conversations Panel */}
        {sidebarOpen && (
          <aside className="w-64 sm:w-72 border-r border-slate-200/80 bg-white flex flex-col shrink-0 z-20 animate-in slide-in-from-left-2 duration-150">
            {/* Header */}
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 font-serif">
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <span>Chat History</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void handleCreateConversation()}
                  className="h-7 px-2 text-xs bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg shadow-2xs font-medium flex items-center gap-1 cursor-pointer"
                  title="New chat"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search Filter */}
            <div className="p-2.5 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={convSearch}
                  onChange={(e) => setConvSearch(e.target.value)}
                  placeholder="Filter chats..."
                  className="w-full pl-7 pr-3 h-7 text-xs bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Conversation Items */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {isLoading ? (
                <div className="py-12 flex flex-col items-center gap-2 text-slate-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Loading chats...</span>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-2 text-center px-4">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {conversations.length === 0 ? "No chats yet" : "No matching chats"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {conversations.length === 0 ? "Send a prompt to start a conversation." : "Try another search keyword."}
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
                      className={`group flex items-start justify-between gap-1.5 px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                        isActive
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <div className="truncate flex-1 min-w-0">
                        <div className="truncate font-semibold text-[12px] leading-tight">
                          {c.title || "New Conversation"}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`text-[10px] font-mono font-semibold flex items-center gap-1 ${
                              isActive ? "text-blue-300" : modeConf.color
                            }`}
                          >
                            <MIcon className="w-2.5 h-2.5" />
                            {c.defaultMode}
                          </span>
                          <span className={isActive ? "text-slate-500" : "text-slate-300"}>•</span>
                          <span className={isActive ? "text-slate-400" : "text-slate-400"}>
                            {formatDate(c.updatedAt)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => void promptDeleteConversation(e, c.id)}
                        className={`opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 p-1 rounded hover:text-red-400 transition-all cursor-pointer ${
                          isActive ? "text-slate-400" : "text-slate-400"
                        }`}
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-3.5 py-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 bg-slate-50/50">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2D8A60] shrink-0" />
                <span>pgvector RAG</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">Flash Model</span>
            </div>
          </aside>
        )}

        {/* Main Conversation Canvas */}
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#F8FAFC]">
          {/* Refined Top Header Bar */}
          <header className="h-14 px-4 sm:px-6 border-b border-slate-200/80 bg-white flex items-center justify-between gap-3 shrink-0">
            {/* Left: Sidebar Toggle, Title, Project Tag */}
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`p-1.5 rounded-xl border transition-all shadow-2xs shrink-0 cursor-pointer ${
                  sidebarOpen
                    ? "bg-slate-100 border-slate-300 text-slate-800"
                    : "border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
                title={sidebarOpen ? "Hide chat history" : "Open chat history"}
              >
                <PanelLeft className="w-4 h-4" />
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

            {/* Right: DeepSeek Icon Badge & New Chat Action */}
            <div className="flex items-center gap-2 shrink-0">
              {/* DeepSeek Indicator Badge */}
              <div
                className="h-8 px-2.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-2xs flex items-center gap-2 transition-all select-none"
                title="DeepSeek Flash model"
              >
                <DeepSeekIcon className="w-4 h-4 shrink-0" />
                <span className="font-semibold text-slate-800 hidden sm:inline text-xs">
                  DeepSeek
                </span>
                <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-semibold hidden md:inline">
                  Flash Model
                </span>
              </div>

              {/* New Chat Action */}
              <button
                type="button"
                onClick={handleResetChat}
                className="h-8 px-3 rounded-xl border border-slate-200/90 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="Start a new conversation"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Chat</span>
              </button>
            </div>
          </header>

          {/* Messages Stream / Hero Canvas */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
            {isLoadingMessages ? (
              /* Loading Skeleton when switching conversations */
              <div className="max-w-3xl mx-auto space-y-6 pt-6">
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 animate-pulse shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-100 rounded-md w-24 animate-pulse" />
                    <div className="h-16 bg-slate-100 rounded-2xl w-3/4 animate-pulse" />
                  </div>
                </div>
                <div className="flex gap-3 items-start flex-row-reverse">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 animate-pulse shrink-0" />
                  <div className="space-y-2 flex-1 flex flex-col items-end">
                    <div className="h-4 bg-slate-100 rounded-md w-16 animate-pulse" />
                    <div className="h-12 bg-slate-100 rounded-2xl w-1/2 animate-pulse" />
                  </div>
                </div>
              </div>
            ) : messages.length === 0 && !isSending ? (
              /* Minimal Refined Hero */
              <div className="max-w-2xl mx-auto my-auto pt-6 sm:pt-10 space-y-7 text-center">
                {/* Clean Logo Tile */}
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
                  <Sparkles className="w-6 h-6 stroke-[2.2]" />
                </div>

                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-serif">
                    AI Workspace Copilot
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg mx-auto leading-relaxed">
                    Ask questions, verify specifications, or generate implementation proposals. Every answer is grounded in project records with verified citations.
                  </p>
                </div>

                {/* Active Mode Pill */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200 bg-white text-xs shadow-2xs">
                  <ModeIcon className={`w-3.5 h-3.5 ${currentModeConfig.color}`} />
                  <span className="font-semibold text-slate-800">{currentModeConfig.label} Mode:</span>
                  <span className="text-slate-500">{currentModeConfig.desc}</span>
                </div>

                {/* 4 Clean Prompt Suggestion Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-1">
                  {PROMPT_SUGGESTIONS.map((item, idx) => {
                    const SIcon = item.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedMode(item.mode);
                          setTimeout(() => void handleSendMessage(item.prompt), 0);
                        }}
                        className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-400 hover:shadow-xs transition-all text-left flex flex-col justify-between space-y-2 group cursor-pointer"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                                <SIcon className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors font-serif">
                                {item.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
                              {item.modeLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Message Bubbles */
              messages.map((msg) => {
                const isAssistant = msg.role === "assistant";
                const isFailed = msg.status === "FAILED";
                const isInsufficient =
                  msg.content.toLowerCase().includes("insufficient evidence") ||
                  msg.content.toLowerCase().includes("no relevant project evidence");

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 items-start max-w-3xl mx-auto ${
                      !isAssistant ? "flex-row-reverse" : ""
                    }`}
                  >
                    {isAssistant ? (
                      <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
                        <Bot className="w-4 h-4" />
                      </div>
                    ) : (
                      <UserAvatar name={user?.displayName ?? user?.fullName} />
                    )}

                    <div
                      className={`space-y-1.5 ${
                        isAssistant
                          ? "w-full max-w-[90%] sm:max-w-[85%]"
                          : "max-w-[80%] sm:max-w-[70%]"
                      }`}
                    >
                      {/* Meta header */}
                      <div
                        className={`flex items-center gap-2 text-[10px] text-slate-400 ${
                          !isAssistant ? "flex-row-reverse" : ""
                        }`}
                      >
                        <span className="font-semibold text-slate-700">
                          {isAssistant ? "AI Copilot" : user?.displayName ?? "You"}
                        </span>
                        {isAssistant && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                            {msg.mode}
                          </span>
                        )}
                        <span>{formatDateTime(msg.createdAt)}</span>
                      </div>

                      {/* Bubble Body */}
                      <div
                        className={`rounded-2xl p-4 sm:p-5 space-y-3 ${
                          isAssistant
                            ? isFailed
                              ? "bg-rose-50 border border-rose-200 text-rose-700"
                              : "bg-white border border-slate-200/90 shadow-xs text-slate-800"
                            : "bg-slate-900 text-white shadow-xs"
                        }`}
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
                                      type="button"
                                      onClick={() =>
                                        setExpandedCitation(isExpanded ? null : cite.chunkId)
                                      }
                                      className="w-full flex items-center justify-between px-3 py-2 text-[11px] hover:bg-slate-100/70 transition-colors text-left cursor-pointer"
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <span className="font-mono text-slate-400 shrink-0 font-semibold">
                                          #{cIdx + 1}
                                        </span>
                                        <Icon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                        <span className="text-slate-800 truncate font-semibold">
                                          {cite.title}
                                        </span>
                                        {cite.locator && (
                                          <span className="text-slate-400 truncate text-[10px] font-mono">
                                            ({cite.locator})
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setInspectingCitation(cite);
                                          }}
                                          className="text-slate-400 hover:text-blue-600 p-0.5 rounded transition-colors cursor-pointer"
                                          title={`Inspect ${cite.sourceType.toLowerCase()} evidence`}
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                        </button>
                                        <Link
                                          href={getSourceLink(cite.sourceType, cite.title, cite.sourceId)}
                                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                          className="text-slate-400 hover:text-blue-600 p-0.5 rounded transition-colors"
                                          title={`Open in ${cite.sourceType.toLowerCase()} module`}
                                        >
                                          <ArrowUpRight className="w-3.5 h-3.5" />
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
                                          <div className="flex items-center gap-2.5">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setInspectingCitation(cite);
                                              }}
                                              className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                                            >
                                              <Eye className="w-2.5 h-2.5" />
                                              <span>Inspect Source</span>
                                            </button>
                                            <span className="text-slate-200">•</span>
                                            <Link
                                              href={getSourceLink(cite.sourceType, cite.title, cite.sourceId)}
                                              className="text-[10px] text-slate-500 hover:text-blue-600 hover:underline flex items-center gap-0.5 font-medium transition-colors"
                                              title={`Open full ${cite.sourceType.toLowerCase()} module`}
                                            >
                                              <span>Open in {cite.sourceType.toLowerCase()}</span>
                                              <ArrowUpRight className="w-2.5 h-2.5" />
                                            </Link>
                                          </div>
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
                                type="button"
                                onClick={() => handleCopyMessage(msg.id, msg.content)}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
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
                                type="button"
                                onClick={() => handleFeedback(msg.id, "up")}
                                className={`p-1 rounded transition-colors text-[10px] flex items-center gap-0.5 cursor-pointer ${
                                  feedbackState[msg.id] === "up"
                                    ? "text-[#2D8A60] bg-emerald-50"
                                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                }`}
                                title="Helpful"
                              >
                                <ThumbsUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleFeedback(msg.id, "down")}
                                className={`p-1 rounded transition-colors text-[10px] flex items-center gap-0.5 cursor-pointer ${
                                  feedbackState[msg.id] === "down"
                                    ? "text-rose-500 bg-rose-50"
                                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                }`}
                                title="Needs improvement"
                              >
                                <ThumbsDown className="w-3 h-3" />
                              </button>
                            </div>

                            <span className="text-[10px] text-slate-400 font-mono">
                              {msg.modelName || "Flash Model"}
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
              <div className="flex items-start gap-3 max-w-3xl mx-auto">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span className="text-xs text-slate-600 font-medium">
                    Retrieving knowledge chunks & generating grounded answer…
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Elevated Minimal Composer */}
          <footer className="p-4 sm:px-8 border-t border-slate-200/80 bg-white/80 backdrop-blur-md shrink-0">
            <div className="max-w-3xl mx-auto space-y-2">
              {sendError && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-xs text-rose-700">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span className="flex-1">{sendError}</span>
                  <button
                    type="button"
                    onClick={() => setSendError(null)}
                    className="text-rose-500 hover:text-rose-700 cursor-pointer ml-auto"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Elevated Composer Box */}
              <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 p-3 transition-all">
                <textarea
                  ref={textareaRef}
                  value={inputContent}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setInputContent(e.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask in ${currentModeConfig.label} mode (${currentModeConfig.desc.toLowerCase()})...`}
                  rows={2}
                  disabled={isSending}
                  className="w-full bg-transparent border-0 focus:outline-none p-0 text-[13px] text-slate-900 placeholder:text-slate-400 resize-none min-h-[44px] leading-relaxed shadow-none"
                />

                {/* Composer Toolbar */}
                <div className="pt-2 mt-1 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Refined Custom Knowledge Source Drop-up */}
                    <div className="relative" ref={composerSourceRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setComposerSourceOpen(!composerSourceOpen);
                          setComposerModeOpen(false);
                        }}
                        className={`h-7 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs select-none ${
                          composerSourceOpen
                            ? "bg-slate-100 text-slate-900 border-slate-300 ring-2 ring-slate-400/10 shadow-xs"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200/90 text-slate-700"
                        }`}
                        title="Filter knowledge source"
                      >
                        <Filter className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[130px] sm:max-w-[160px]">{currentSourceOption.label}</span>
                        <ChevronUp
                          className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                            composerSourceOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {composerSourceOpen && (
                        <div className="absolute left-0 bottom-full mb-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-0.5">
                          <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                            Knowledge Source
                          </div>
                          {SOURCE_OPTIONS.map((opt) => {
                            const Icon = opt.icon;
                            const isSelected = sourceFilter === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setSourceFilter(opt.value);
                                  setComposerSourceOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer group ${
                                  isSelected
                                    ? "bg-blue-50 text-blue-700 font-semibold"
                                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate pr-2">
                                  <Icon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span className="text-xs truncate">{opt.label}</span>
                                </div>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[2.5]" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Refined Custom Persona Mode Drop-up */}
                    <div className="relative" ref={composerModeRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setComposerModeOpen(!composerModeOpen);
                          setComposerSourceOpen(false);
                        }}
                        className={`h-7 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs select-none ${
                          composerModeOpen
                            ? "bg-blue-50 text-blue-800 border-blue-400 ring-2 ring-blue-500/10 shadow-xs"
                            : "bg-blue-50/80 hover:bg-blue-100/80 border-blue-200/80 text-blue-700"
                        }`}
                        title="Switch Persona Mode"
                      >
                        <ModeIcon className={`w-3.5 h-3.5 ${currentModeConfig.color}`} />
                        <span className="font-semibold">{currentModeConfig.label} Mode</span>
                        <ChevronUp
                          className={`w-3 h-3 text-blue-500 transition-transform duration-200 ${
                            composerModeOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {composerModeOpen && (
                        <div className="absolute left-0 bottom-full mb-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-0.5">
                          <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                            Select Persona Mode
                          </div>
                          {MODES.map((m) => {
                            const Icon = m.icon;
                            const isSelected = selectedMode === m.key;
                            return (
                              <button
                                key={m.key}
                                type="button"
                                onClick={() => {
                                  setSelectedMode(m.key);
                                  setComposerModeOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer group ${
                                  isSelected
                                    ? "bg-blue-50 text-blue-700 font-semibold"
                                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  <Icon className={`w-3.5 h-3.5 shrink-0 ${m.color}`} />
                                  <div className="truncate">
                                    <div className="text-xs leading-snug">{m.label} Mode</div>
                                    <div className="text-[10px] text-slate-400 font-normal truncate leading-snug">
                                      {m.desc}
                                    </div>
                                  </div>
                                </div>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[2.5]" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline text-[10px] text-slate-400">
                      <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-slate-600">
                        Enter
                      </kbd>{" "}
                      to send
                    </span>

                    <button
                      type="button"
                      onClick={() => void handleSendMessage()}
                      disabled={!inputContent.trim() || isSending || !currentProject}
                      className="h-8 w-8 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-30 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
                      title="Send message"
                    >
                      {isSending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                    </button>
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

      {/* ========================================================================= */}
      {/* INSPECT SOURCE EVIDENCE MODAL (IN-APP WITHOUT REDIRECTING)                 */}
      {/* ========================================================================= */}
      {inspectingCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => setInspectingCitation(null)}
          />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  {inspectingCitation.sourceType === "TASK" ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : inspectingCitation.sourceType === "DECISION" ? (
                    <GitPullRequest className="w-4 h-4" />
                  ) : inspectingCitation.sourceType === "REQUIREMENT" ? (
                    <FileCheck2 className="w-4 h-4" />
                  ) : inspectingCitation.sourceType === "MEETING" ? (
                    <Calendar className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {inspectingDetails?.displayKey ? (
                      <span className="font-bold text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100/90 text-blue-800 border border-blue-200">
                        {inspectingDetails.displayKey}
                      </span>
                    ) : (
                      <span className="font-bold text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-blue-100/80 text-blue-800">
                        {inspectingCitation.sourceType}
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-slate-400">
                      Rev {inspectingCitation.revision}
                    </span>
                    {inspectingCitation.locator && (
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {inspectingCitation.locator}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 font-serif mt-1 line-clamp-1">
                    {inspectingCitation.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectingCitation(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-slate-700 text-xs">
              {/* Grounded Evidence Snippet Callout */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Retrieved Grounding Evidence</span>
                  </span>
                  {inspectingCitation.score !== undefined && (
                    <span className="font-mono text-slate-400 font-normal">
                      Score: {inspectingCitation.score.toFixed(4)}
                    </span>
                  )}
                </div>
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-slate-800 leading-relaxed font-serif text-[13px] italic shadow-2xs">
                  &ldquo;{inspectingCitation.snippet || "No snippet content available."}&rdquo;
                </div>
              </div>

              {/* Live Source Record Details (if loaded) */}
              {loadingInspectDetails ? (
                <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-[11px]">Loading record metadata…</span>
                </div>
              ) : inspectingDetails ? (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Source Record Details
                  </div>

                  {/* TASK DETAILS */}
                  {inspectingCitation.sourceType === "TASK" && (
                    <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="font-semibold text-slate-700">Status:</span>
                        <span className="font-mono px-2 py-0.5 rounded bg-white border border-slate-200 font-medium text-slate-800">
                          {inspectingDetails.status}
                        </span>
                        <span className="font-semibold text-slate-700 ml-2">Priority:</span>
                        <span className="font-mono px-2 py-0.5 rounded bg-white border border-slate-200 font-medium text-slate-800">
                          {inspectingDetails.priority}
                        </span>
                        {inspectingDetails.assignee && (
                          <>
                            <span className="font-semibold text-slate-700 ml-2">Assignee:</span>
                            <span className="text-slate-800">{inspectingDetails.assignee.displayName}</span>
                          </>
                        )}
                      </div>
                      {inspectingDetails.description && (
                        <div className="pt-2 text-slate-700 whitespace-pre-wrap leading-relaxed border-t border-slate-200/60">
                          {inspectingDetails.description}
                        </div>
                      )}
                    </div>
                  )}

                  {/* DECISION DETAILS */}
                  {inspectingCitation.sourceType === "DECISION" && (
                    <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="font-semibold text-slate-700">Status:</span>
                        <span className="font-mono px-2 py-0.5 rounded bg-white border border-slate-200 font-medium text-slate-800">
                          {inspectingDetails.status}
                        </span>
                      </div>
                      {inspectingDetails.decisionText && (
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-700">Decision Outcome:</div>
                          <p className="whitespace-pre-wrap text-slate-800 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/80">{inspectingDetails.decisionText}</p>
                        </div>
                      )}
                      {inspectingDetails.rationale && (
                        <div className="space-y-1 pt-1">
                          <div className="font-semibold text-slate-700">Rationale & Context:</div>
                          <p className="whitespace-pre-wrap text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/80">{inspectingDetails.rationale}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* REQUIREMENT DETAILS */}
                  {inspectingCitation.sourceType === "REQUIREMENT" && (
                    <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="font-semibold text-slate-700">Status:</span>
                        <span className="font-mono px-2 py-0.5 rounded bg-white border border-slate-200 font-medium text-slate-800">
                          {inspectingDetails.status}
                        </span>
                        <span className="font-semibold text-slate-700 ml-2">Priority:</span>
                        <span className="font-mono px-2 py-0.5 rounded bg-white border border-slate-200 font-medium text-slate-800">
                          {inspectingDetails.priority}
                        </span>
                      </div>
                      {inspectingDetails.description && (
                        <div className="pt-1 whitespace-pre-wrap text-slate-800">{inspectingDetails.description}</div>
                      )}
                      {inspectingDetails.acceptanceCriteria && (
                        <div className="space-y-1 pt-2 border-t border-slate-200/60">
                          <div className="font-semibold text-slate-700">Acceptance Criteria:</div>
                          <p className="whitespace-pre-wrap text-slate-600">{inspectingDetails.acceptanceCriteria}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MEETING DETAILS */}
                  {inspectingCitation.sourceType === "MEETING" && (
                    <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                      {inspectingDetails.agenda && (
                        <div>
                          <span className="font-semibold text-slate-700">Agenda:</span>
                          <p className="whitespace-pre-wrap text-slate-800 mt-0.5">{inspectingDetails.agenda}</p>
                        </div>
                      )}
                      {inspectingDetails.notes && (
                        <div className="pt-2 border-t border-slate-200/60">
                          <span className="font-semibold text-slate-700">Notes:</span>
                          <p className="whitespace-pre-wrap text-slate-800 mt-0.5">{inspectingDetails.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* DOCUMENT DETAILS */}
                  {inspectingCitation.sourceType === "DOCUMENT" && (
                    <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="font-semibold text-slate-700">File:</span>
                        <span className="text-slate-800 font-mono">{inspectingDetails.originalFilename || inspectingDetails.title}</span>
                        {inspectingDetails.fileType && (
                          <>
                            <span className="font-semibold text-slate-700 ml-2">Type:</span>
                            <span className="font-mono">{inspectingDetails.fileType}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/60">
              <Link
                href={getSourceLink(
                  inspectingCitation.sourceType,
                  inspectingCitation.title,
                  inspectingCitation.sourceId
                )}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium hover:underline"
              >
                <span>Open in full {inspectingCitation.sourceType.toLowerCase()} module</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>

              <button
                type="button"
                onClick={() => setInspectingCitation(null)}
                className="px-5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
