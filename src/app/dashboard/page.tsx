"use client";
import { listDashboardGraphs, processQuery, listTranscripts, deleteTranscript, createTranscript, updateTranscript, livekitQuery, authMe } from "@/lib/queries";
import { extractTranscriptId } from "@/lib/ids";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryResultsPoll } from "@/hooks/useQueryResultsPoll";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { HTMLRender } from "@/components/ui/HTMLRender";
import ChartRenderer from "@/components/ui/ChartRenderer";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import ErrorNotification from "@/components/ui/ErrorNotification";
import PinButton from "@/components/PinButton";
import UnpinButton from "@/components/UnpinButton";
import VoiceChat from "@/components/VoiceChat";
import type { components } from "@/types/api";
import { getDashboardTranscriptId, setDashboardTranscriptId, clearDashboardTranscriptId } from "@/lib/dashboardSession";
import { getAccessToken, clearAccessToken } from "@/lib/auth";

type GraphItem = components["schemas"]["GraphItem"];
type DashboardGraph = components["schemas"]["DashboardGraphMetadataModel"];

export default function DashboardPage() {
  const [question, setQuestion] = useState("");
  const [transcriptId, setTranscriptId] = useState<string | null>(getDashboardTranscriptId());
  const [chat, setChat] = useState<Array<{ role: "user" | "assistant"; text?: string; graphs?: GraphItem[]; userQuestion?: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAwaitingAnswer, setIsAwaitingAnswer] = useState(false);
  const [gridCols, setGridCols] = useState<1 | 2 | 3>(2);
  const [expandedGraph, setExpandedGraph] = useState<DashboardGraph | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [lkSessionId] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [notice, setNotice] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const ignoreResponsesRef = useRef(false);
  const scrollLockYRef = useRef(0);
  const [chatKey, setChatKey] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [responseAdded, setResponseAdded] = useState(false);
  const [currentUserQuestion, setCurrentUserQuestion] = useState<string | null>(null);
  
  // Local chat persistence per transcript
  function chatStorageKey(tid: string) { return `chat_history:${tid}`; }
  function loadChatFromStorage(tid: string) {
    try {
      const raw = localStorage.getItem(chatStorageKey(tid));
      if (!raw) return [] as Array<{ role: "user" | "assistant"; text?: string; graphs?: GraphItem[] }>;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as Array<{ role: "user" | "assistant"; text?: string; graphs?: GraphItem[] }>;
      return [];
    } catch {
      return [];
    }
  }
  const saveChatToStorage = useCallback((tid: string, items: Array<{ role: "user" | "assistant"; text?: string; graphs?: GraphItem[] }>) => {
    try {
      localStorage.setItem(chatStorageKey(tid), JSON.stringify(items.slice(-200)));
    } catch {    }
  }, []);


  function showSuccess(text: string) {
    setNotice({ text, type: "success" });
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, 1800);
  }

  // Persist chat for current transcript
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!transcriptId) return;
    saveChatToStorage(transcriptId, chat);
  }, [chat, transcriptId, saveChatToStorage]);


  // Require login for dashboard and fetch user data
  useEffect(() => {
    const token = getAccessToken();
    if (!token && typeof window !== "undefined") {
      window.location.href = "/login";
    } else {
      // Show stored email immediately while API call is in progress
      const storedEmail = localStorage.getItem("user_email");
      if (storedEmail) {
        setUserEmail(storedEmail);
        setUserName(storedEmail);
      }
      
      // Fetch real user data from API with timeout
      const fetchUserData = async () => {
        try {
          
          // Add timeout to prevent infinite loading
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("API timeout")), 3000)
          );
          
          const userData = await Promise.race([authMe(), timeoutPromise]);
          // Extract user information from API response
          // The API returns user data nested under 'user' property
          const user = (userData as any)?.user;
          const email = user?.email;
          const name = user?.name;
          const displayName = user?.display_name;
          
          // Set user data
          if (email) {
            setUserEmail(email);
            // Store email in localStorage for future use
            localStorage.setItem("user_email", email);
          }
          
          // Use display_name, name, or email as the display name
          const finalName = displayName || name || email || "User";
          setUserName(finalName);
          
          // Also set userEmail for consistency
          if (email) {
            setUserEmail(email);
          }
          
        } catch (error) {
          console.error("Failed to fetch user data:", error);
          // If API fails and we don't have stored data, set a fallback
          if (!userName && !userEmail) {
            setUserName("User");
            setUserEmail("user@indus.com");
          }
        } finally {
          setIsLoadingUser(false);
          setIsCheckingAuth(false);
        }
      };
      
      fetchUserData();
    }
  }, []);


  const [isSending, setIsSending] = useState(false);
  const [isFirstQuestion, setIsFirstQuestion] = useState(false);

  // Voice chat handlers
  const handleVoiceTranscript = useCallback((text: string) => {
    if (text.trim()) {
      setQuestion(text);
      setCurrentUserQuestion(text.trim());
      // Auto-send voice transcript
      setTimeout(() => {
        if (text.trim()) {
          setChat((prev) => [...prev, { role: "user", text: text.trim() }]);
          sendQuestion(text.trim());
          setQuestion("");
          setIsAwaitingAnswer(true);
        }
      }, 500);
    }
  }, []);

  const handleVoiceError = useCallback((error: string) => {
    setError(error);
  }, []);

  const toggleVoiceChat = useCallback(() => {
    setIsVoiceEnabled(!isVoiceEnabled);
  }, [isVoiceEnabled]);
  const sendQuestion = useCallback(async (q: string) => {
    ignoreResponsesRef.current = false;
    setIsSending(true);
    
    try {
      const res = await processQuery({ natural_language_query: q, transcript_id: transcriptId ?? undefined });
      if (!transcriptId && res?.transcript_id) {
        const tid = res.transcript_id as string;
        setTranscriptId(tid);
        setDashboardTranscriptId(tid);
      }
      
      // If this is the first question for a new transcript, update the transcript title
      if (isFirstQuestion && res?.transcript_id) {
        const currentTranscriptId = res.transcript_id as string;
        try {
          await updateTranscript(currentTranscriptId, {
            title: q.length > 50 ? q.substring(0, 50) + "..." : q
          });
          // Refresh transcript list to show updated title
          if (typeof window !== "undefined" && (window as unknown as { refreshTranscripts?: () => void }).refreshTranscripts) {
            (window as unknown as { refreshTranscripts: () => void }).refreshTranscripts();
          }
          setIsFirstQuestion(false); // Reset after first question
        } catch (error) {
          console.error("Failed to update transcript title:", error);
        }
      }
    } catch (e) {
      const err = e as { message?: string; response?: { status?: number; statusText?: string; data?: unknown } };
      let message = "Request failed. Please try again.";
      const status = err?.response?.status;
      const statusText = err?.response?.statusText;
      const data = err?.response?.data as unknown;
      const fromDetailArray = Array.isArray((data as Record<string, unknown>)?.detail)
        ? ((data as Record<string, unknown>).detail as Array<{ msg?: string } | string>).map((d) => (typeof d === 'object' ? d?.msg : d) || d).join("; ")
        : null;
      const fromDetail = typeof (data as Record<string, unknown>)?.detail === "string" ? (data as Record<string, unknown>).detail as string : fromDetailArray;
      const fromMessage = (data as Record<string, unknown>)?.message as string | undefined;
      const fromError = (data as Record<string, unknown>)?.error as string | undefined;
      if (fromDetail || fromMessage || fromError) {
        message = fromDetail || fromMessage || fromError || message;
      } else if (status) {
        message = `HTTP ${status}${statusText ? ` ${statusText}` : ""}`;
      } else if (err?.message) {
        message = err.message;
      }
      const notFound = typeof fromDetail === "string" && fromDetail.toLowerCase().includes("transcript not found");
      if (notFound) {
        setTranscriptId(null);
        clearDashboardTranscriptId();
        setChat([]);
        // Don't show error message, just silently start fresh
        return;
      } else if (status === 500 && !fromMessage && !fromDetail && !fromError) {
        message = "Server error (500). Please try again or contact support.";
      }
      console.error("processQuery failed", e);
      setError(message);
      setIsAwaitingAnswer(false);
    } finally {
      setIsSending(false);
    }
  }, [transcriptId, isFirstQuestion]);

  const [graphs, setGraphs] = useState<DashboardGraph[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  async function loadGraphs() {
    setIsFetching(true);
    try {
      const res = await listDashboardGraphs({ active_only: true });
      setGraphs(res?.graphs ?? []);
    } finally {
      setIsFetching(false);
    }
  }
  useEffect(() => {
    loadGraphs();
  }, []);

  async function onAsk(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    if (q.length < 2) {
      setError("Please enter a more descriptive question.");
      return;
    }
    setCurrentUserQuestion(q);
    setChat((prev) => [...prev, { role: "user", text: q }]);
    setError(null);
    sendQuestion(q);
    setQuestion("");
    setIsAwaitingAnswer(true);
  }

  const poll = useQueryResultsPoll();

  useEffect(() => {
    const bundle = poll.lastReady;
    if (!bundle) return;
    if (!transcriptId && bundle.transcript_id) {
      setTranscriptId(bundle.transcript_id);
      setDashboardTranscriptId(bundle.transcript_id);
    }
    if (bundle.transcript_id && transcriptId && bundle.transcript_id !== transcriptId) return;
    if (ignoreResponsesRef.current) {
      console.log('Ignoring response due to ignoreResponsesRef flag');
      return; // user cancelled current wait
    }
    const description = bundle.description?.description;
    const allGraphs = (bundle.graphs?.graphs as GraphItem[] | undefined) ?? [];
    const filteredGraphs = allGraphs.filter((g) => !!g.html || !!g.figure);
    const hasDescription = typeof description === "string" && description.trim().length > 0;
    const hasGraphs = filteredGraphs.length > 0;
    if (hasDescription || hasGraphs) {
      console.log('Adding response to chat:', { hasDescription, hasGraphs, transcriptId });
      // Add response first
      setChat((prev) => [...prev, { role: "assistant", text: hasDescription ? description : undefined, graphs: hasGraphs ? filteredGraphs : undefined, userQuestion: currentUserQuestion || undefined }]);
      // Mark that response was added
      setResponseAdded(true);
      // Clear the current user question
      setCurrentUserQuestion(null);
    } else {
      // No content returned; stop spinner to avoid hanging UI
      setIsAwaitingAnswer(false);
    }
  }, [poll.lastReady, transcriptId]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Prefer scrolling the messages container to the bottom to avoid page scroll on mobile
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat]);

  // Stop loader when response is actually rendered
  useEffect(() => {
    if (responseAdded && isAwaitingAnswer) {
      // Wait for the response to be fully rendered before stopping the loader
      const timer = setTimeout(() => {
        setIsAwaitingAnswer(false);
        setResponseAdded(false);
      }, 500); // Give enough time for complex graphs to render
      
      return () => clearTimeout(timer);
    }
  }, [responseAdded, isAwaitingAnswer]);

  // Audible chime on assistant response
  useEffect(() => {
    if (!isAwaitingAnswer) return;
    // This effect is toggled off in the poll handler when content arrives
  }, [isAwaitingAnswer]);

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="h-screen flex items-center justify-center page-gradient">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-screen page-gradient overflow-hidden flex flex-col lg:flex-row">
      {/* Main Content Area - Left Side */}
      <div className="flex-1 flex flex-col lg:max-w-[calc(100%-600px)]">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {notice && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60]">
              <div className="glass-fade-in inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-200 ring-1 ring-emerald-400/20 shadow">
                <span>✅</span>
                <span>{notice.text}</span>
              </div>
            </div>
          )}
          
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 fade-in-up">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-r from-primary to-accent flex items-center justify-center indus-glow">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-white">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight indus-text-gradient">Analytics Dashboard</h1>
                <p className="text-neutral-400 text-sm hidden sm:block">Real-time insights and data visualizations</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Grid Controls */}
              <div className="hidden sm:flex items-center gap-1 text-xs">
                <span className="text-neutral-400">Layout</span>
                <button
                  type="button"
                  onClick={() => setGridCols(1)}
                  className={
                    "inline-flex items-center justify-center w-9 h-8 rounded-lg border text-xs transition-all " +
                    (gridCols === 1 ? "indus-button-primary" : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-primary/30")
                  }
                  title="1 column"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <rect x="3" y="5" width="14" height="10" rx="2" className="fill-current opacity-90" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setGridCols(2)}
                  className={
                    "inline-flex items-center justify-center w-9 h-8 rounded-lg border text-xs transition-all " +
                    (gridCols === 2 ? "indus-button-primary" : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-primary/30")
                  }
                  title="2 columns"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" className="w-5 h-5">
                    <rect x="3" y="5" width="6" height="10" rx="2" className="fill-current opacity-90" />
                    <rect x="11" y="5" width="6" height="10" rx="2" className="fill-current opacity-60" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setGridCols(3)}
                  className={
                    "inline-flex items-center justify-center w-9 h-8 rounded-lg border text-xs transition-all " +
                    (gridCols === 3 ? "indus-button-primary" : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-primary/30")
                  }
                  title="3 columns"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" className="w-5 h-5">
                    <rect x="2.5" y="5" width="4.5" height="10" rx="1.8" className="fill-current opacity-90" />
                    <rect x="7.75" y="5" width="4.5" height="10" rx="1.8" className="fill-current opacity-75" />
                    <rect x="13" y="5" width="4.5" height="10" rx="1.8" className="fill-current opacity-60" />
                  </svg>
                </button>
              </div>
              
              {/* User Info and Actions */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 indus-card rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-sm text-white font-medium">
                    {isLoadingUser ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border border-white/30 border-t-transparent rounded-full animate-spin" />
                        <span>Loading...</span>
                      </div>
                    ) : (
                      userName || userEmail || "User"
                    )}
                  </span>
                </div>
                <button
                  onClick={() => {
                    clearAccessToken();
                    if (typeof window !== "undefined") window.location.href = "/login";
                  }}
                  className="flex items-center gap-2 px-3 py-2 indus-card rounded-lg hover:bg-white/10 transition-all pressable"
                  title="Logout"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-neutral-400">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-neutral-400">Logout</span>
                </button>
              </div>
            </div>
          </div>


          {/* Dashboard Graphs Grid */}
          <div className="fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Visualizations</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadGraphs}
                  disabled={isFetching}
                  className="flex items-center gap-2 px-3 py-2 text-sm indus-card rounded-lg hover:bg-white/10 transition-all pressable disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`}>
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
            
            {graphs.length === 0 ? (
              <div className="indus-card p-12 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-10 h-10 text-primary">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Visualizations Yet</h3>
                <p className="text-neutral-400 mb-4">Start a conversation to generate charts and insights</p>
                <button
                  onClick={() => {
                    const chatInput = document.querySelector('input[placeholder*="Ask a question"]') as HTMLInputElement;
                    if (chatInput) {
                      chatInput.focus();
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 indus-button-primary rounded-lg pressable"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M18 5.5a2.5 2.5 0 0 0-2.5-2.5h-11A2.5 2.5 0 0 0 2 5.5v6A2.5 2.5 0 0 0 4.5 14H6v2.25c0 .42.47.66.82.42L10.5 14H15.5A2.5 2.5 0 0 0 18 11.5v-6Z" />
                  </svg>
                  Start Chatting
                </button>
              </div>
            ) : (
              <div className={`grid gap-6 ${gridCols === 1 ? 'grid-cols-1' : gridCols === 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'}`}>
                {graphs.map((graph, index) => (
                  <div key={graph.graph_id || index} className="indus-card p-6 hover:bg-white/10 transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-primary">
                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-white group-hover:text-primary transition-colors">
                            {graph.title || `Chart ${index + 1}`}
                          </h3>
                          <p className="text-sm text-neutral-400">
                            {graph.graph_type || 'Visualization'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <UnpinButton
                          graphId={graph.graph_id || ''}
                          onUnpinned={() => {
                            showSuccess("Graph removed from dashboard!");
                            loadGraphs();
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="min-h-[400px] rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                      {graph.html_content ? (
                        <div className="w-full h-full min-h-[400px]">
                          <HTMLRender html={graph.html_content} />
                        </div>
                      ) : (graph as any).data ? (
                        <ChartRenderer 
                          data={(graph as any).data} 
                          type={graph.graph_type || 'bar'} 
                          title={graph.title || undefined}
                          className="w-full h-full p-4"
                        />
                      ) : (
                        <div className="text-center text-neutral-400">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-12 h-12 mx-auto mb-2 opacity-50">
                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                          </svg>
                          <p className="text-sm">No preview available</p>
                        </div>
                      )}
                    </div>
                    
                    {graph.description && (
                      <p className="mt-3 text-sm text-neutral-400 line-clamp-2">
                        {graph.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Right Chat Panel - Full Height */}
      <div className="w-full lg:w-[600px] h-[50vh] lg:h-screen indus-card flex flex-col border-t lg:border-t-0 lg:border-l border-white/10 overflow-hidden">
        <div className="flex-shrink-0 p-6 border-b border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center indus-glow">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white">
                  <path d="M18 5.5a2.5 2.5 0 0 0-2.5-2.5h-11A2.5 2.5 0 0 0 2 5.5v6A2.5 2.5 0 0 0 4.5 14H6v2.25c0 .42.47.66.82.42L10.5 14H15.5A2.5 2.5 0 0 0 18 11.5v-6Z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white indus-text-gradient">AI Chat</h2>
            </div>
            <div className="flex items-center gap-2">
              <ChatHistoryButton
                isOpen={isHistoryOpen}
                onToggle={() => setIsHistoryOpen(!isHistoryOpen)}
              />
              <TranscriptSelect
                activeTranscriptId={transcriptId}
                onSelect={(id) => {
                  setTranscriptId(id);
                  setDashboardTranscriptId(id);
                  const saved = loadChatFromStorage(id);
                  setChat(Array.isArray(saved) ? saved : []);
                  setIsFirstQuestion(false); // Reset first question flag when switching transcripts
                  setChatKey(prev => prev + 1); // Force re-render
                }}
              />
              <NewChatButton onNew={async () => {
                try {
                  // Create a new transcript
                  const newTranscript = await createTranscript({
                    title: "New Chat",
                    metadata: {
                      created_at: new Date().toISOString(),
                      source: 'dashboard'
                    }
                  });
                  
                  // Extract transcript ID from response
                  const newTranscriptId = (newTranscript as { transcript_id?: string; id?: string })?.transcript_id || (newTranscript as { transcript_id?: string; id?: string })?.id;
                  
                  if (newTranscriptId && typeof newTranscriptId === 'string') {
                    // Clear all chat-related state
                    setChat([]);
                    setTranscriptId(newTranscriptId);
                    setDashboardTranscriptId(newTranscriptId);
                    setError(null);
                    ignoreResponsesRef.current = false; // Allow new responses
                    setIsAwaitingAnswer(false);
                    setIsFirstQuestion(true); // Mark as first question for new transcript
                    setChatKey(prev => prev + 1); // Force re-render
                    
                    // Force scroll to top of messages
                    setTimeout(() => {
                      if (messagesRef.current) {
                        messagesRef.current.scrollTop = 0;
                      }
                    }, 0);
                    
                    showSuccess("New chat started");
                    
                    // Refresh transcript list
                    if (typeof window !== "undefined" && (window as unknown as { refreshTranscripts?: () => void }).refreshTranscripts) {
                      (window as unknown as { refreshTranscripts: () => void }).refreshTranscripts();
                    }
                  } else {
                    throw new Error("Failed to create transcript");
                  }
                } catch (error) {
                  console.error("Failed to create new transcript:", error);
                  setError("Failed to create new chat. Please try again.");
                }
              }} />
            </div>
          </div>
        </div>
        
        {/* Chat History Panel */}
        {isHistoryOpen && (
          <div className="px-4 pb-4">
            <ChatHistoryPanel
              activeTranscriptId={transcriptId}
              onSelect={async (id, title) => {
                setTranscriptId(id);
                setDashboardTranscriptId(id);
                const saved = loadChatFromStorage(id);
                setChat(Array.isArray(saved) ? saved : []);
                setIsFirstQuestion(false);
                setChatKey(prev => prev + 1);
                setIsHistoryOpen(false);
              }}
              onDelete={async (id) => {
                try {
                  await deleteTranscript(id);
                  if (transcriptId === id) {
                    // If we're deleting the current transcript, create a new one
                    const newTranscript = await createTranscript({
                      title: "New Chat",
                      metadata: { created_at: new Date().toISOString() },
                    });
                    const newId = extractTranscriptId(newTranscript);
                    if (newId) {
                      setTranscriptId(newId);
                      setDashboardTranscriptId(newId);
                      setChat([]);
                      setIsFirstQuestion(true);
                      setChatKey(prev => prev + 1);
                    }
                  }
                  // Refresh the history panel
                  (window as unknown as { refreshTranscripts?: () => void }).refreshTranscripts?.();
                } catch (error) {
                  console.error("Failed to delete transcript:", error);
                  setError("Failed to delete chat. Please try again.");
                }
              }}
              onClose={() => setIsHistoryOpen(false)}
            />
          </div>
        )}
        
        {/* Chat Messages */}
        <div ref={messagesRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0" key={chatKey}>
          {chat.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6 indus-glow">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-10 h-10 text-primary">
                  <path d="M18 5.5a2.5 2.5 0 0 0-2.5-2.5h-11A2.5 2.5 0 0 0 2 5.5v6A2.5 2.5 0 0 0 4.5 14H6v2.25c0 .42.47.66.82.42L10.5 14H15.5A2.5 2.5 0 0 0 18 11.5v-6Z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Welcome to AI Analytics</h3>
              <p className="text-neutral-400 text-sm max-w-sm leading-relaxed mb-6">
                Ask questions about your data and get instant insights with AI-powered analysis.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1.5 bg-white/5 rounded-lg text-xs text-neutral-300 font-medium">Data Analysis</span>
                <span className="px-3 py-1.5 bg-white/5 rounded-lg text-xs text-neutral-300 font-medium">Charts & Graphs</span>
                <span className="px-3 py-1.5 bg-white/5 rounded-lg text-xs text-neutral-300 font-medium">Real-time Insights</span>
              </div>
            </div>
          ) : (
            chat.map((item, i) => (
              <div key={i} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"} group`}>
                <div className={`max-w-[80%] ${item.role === "user" ? "ml-12" : "mr-12"}`}>
                  {/* User Message */}
                  {item.role === "user" ? (
                    <div className="bg-gradient-to-r from-primary to-accent text-white rounded-2xl px-4 py-3 shadow-lg">
                      <div className="text-sm leading-relaxed">
                        <HTMLRender html={item.text || ""} isTextContent={true} />
                      </div>
                    </div>
                  ) : (
                    /* Assistant Message */
                    <div>
                      {/* Message Content - Only show if there's text content AND no graphs */}
                      {item.text && item.text.trim() && (!item.graphs || item.graphs.length === 0) && (
                        <div className="bg-white/10 border border-white/20 text-white rounded-2xl px-4 py-3 backdrop-blur-sm shadow-sm">
                          <div className="text-sm leading-relaxed text-white">
                            <HTMLRender html={item.text} isTextContent={true} />
                          </div>
                        </div>
                      )}
                      
                      {/* Graphs */}
                      {item.graphs && item.graphs.length > 0 && (
                        <div className="space-y-3">
                          {item.graphs.map((graph, j) => (
                            <div key={j} className="bg-white/10 border border-white/20 rounded-2xl overflow-hidden backdrop-blur-sm shadow-sm">
                              {/* Graph Header */}
                              <div className="flex items-center justify-between p-4 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-primary">
                                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <span className="text-sm font-semibold text-white">
                                      {item.userQuestion || graph.title || `Chart ${j + 1}`}
                                    </span>
                                    <p className="text-xs text-neutral-300 font-medium">
                                      {graph.graph_type || 'Data visualization'}
                                    </p>
                                  </div>
                                </div>
                                <PinButton
                                  title={item.userQuestion || graph.title || `Chart ${j + 1}`}
                                  figure={graph.figure}
                                  html={graph.html}
                                  graph_type={graph.graph_type || "chart"}
                                  onPinned={() => {
                                    showSuccess("Graph pinned to dashboard!");
                                    loadGraphs();
                                  }}
                                />
                              </div>
                              
                              {/* Graph Content */}
                              <div className="p-4">
                                {graph.html && (
                                  <div className="w-full flex items-center justify-center">
                                    <HTMLRender html={graph.html} />
                                  </div>
                                )}
                                {!graph.html && (graph as any).data && (
                                  <div className="w-full">
                                    <ChartRenderer 
                                      data={(graph as any).data} 
                                      type={graph.graph_type || 'bar'} 
                                      title={graph.title || undefined}
                                      className="w-full h-full"
                                    />
                                  </div>
                                )}
                              </div>
                              
                              {/* Graph Insight */}
                              {graph.insight && (
                                <div className="px-4 pb-4">
                                  <div className="p-3 bg-primary/20 rounded-lg border border-primary/30 shadow-sm">
                                    <div className="flex items-start gap-2">
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-primary mt-0.5 flex-shrink-0">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                      </svg>
                                      <p className="text-sm text-white leading-relaxed font-medium">{graph.insight}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {isAwaitingAnswer && (
            <div className="flex justify-start">
              <div className="bg-white/10 border border-white/20 rounded-2xl px-4 py-3 backdrop-blur-sm mr-12 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm text-white font-medium">Analyzing your data...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        
        {/* Voice Chat Controls */}
        <div className="flex-shrink-0 p-4 border-t border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-center">
            <VoiceChat
              onTranscript={handleVoiceTranscript}
              onError={handleVoiceError}
              isEnabled={isVoiceEnabled}
              onToggle={toggleVoiceChat}
            />
          </div>
        </div>

        {/* Chat Input */}
        <div className="flex-shrink-0 p-4 border-t border-white/10 bg-white/5 backdrop-blur-sm">
          <form onSubmit={onAsk} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={question}
                  onChange={(e) => {
                    if (error) setError(null);
                    setQuestion(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onAsk(e);
                    }
                  }}
                  placeholder="Ask a question about your data..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all pr-12 hover:bg-white/15 text-sm resize-none min-h-[48px] max-h-32"
                  rows={1}
                  style={{
                    height: 'auto',
                    minHeight: '48px',
                    maxHeight: '128px'
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                  }}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-neutral-400">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <button
                type="submit"
                disabled={!question.trim() || isAwaitingAnswer}
                className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-r from-primary to-accent disabled:opacity-50 disabled:cursor-not-allowed hover:from-primary-dark hover:to-accent-light transition-all shadow-lg"
              >
                {isAwaitingAnswer ? (
                  <div className="w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                    <path d="M10.894 2.553a1 1 0 0 0-1.788 0l-7 14a1 1 0 0 0 1.169 1.409l5-1.429A1 1 0 0 0 9 15.571V11a1 1 0 1 1 2 0v4.571a1 1 0 0 0 .725.962l5 1.428a1 1 0 0 0 1.17-1.408l-7-14Z" />
                  </svg>
                )}
              </button>
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setQuestion("Show me sales trends for the last quarter")}
                className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg text-neutral-300 hover:text-white transition-all font-medium"
              >
                 Sales Trends
              </button>
              <button
                type="button"
                onClick={() => setQuestion("What are the top performing products?")}
                className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg text-neutral-300 hover:text-white transition-all font-medium"
              >
                 Top Products
              </button>
              <button
                type="button"
                onClick={() => setQuestion("Create a pie chart of customer segments")}
                className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg text-neutral-300 hover:text-white transition-all font-medium"
              >
                Customer Segments
              </button>
              <button
                type="button"
                onClick={() => setQuestion("Show revenue by month")}
                className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg text-neutral-300 hover:text-white transition-all font-medium"
              >
                Revenue Analysis
              </button>
            </div>
          </form>
          
          {error && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-400">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-400 font-medium">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Error Notification */}
      <ErrorNotification 
        error={error} 
        onDismiss={() => setError(null)} 
        type="error" 
      />
      </div>
    </ErrorBoundary>
  );
}

function ChatHistoryPanel({
  activeTranscriptId,
  onSelect,
  onDelete,
  onClose,
}: {
  activeTranscriptId: string | null;
  onSelect: (id: string, title?: string | null) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Array<{ id?: string; title?: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let m = true;
    (async () => {
      try {
        const data = await listTranscripts({});
        if (m) setItems(data);
      } finally {
        if (m) setLoading(false);
      }
    })();
    return () => { m = false; };
  }, []);
  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Chat history</span>
        <button onClick={onClose} className="text-xs text-neutral-400 hover:text-neutral-200">Close</button>
      </div>
      {loading ? (
        <div className="h-8 skeleton rounded" />
      ) : (
        <ul className="max-h-56 overflow-auto space-y-1">
          {(items ?? [])?.map((t, i: number) => {
            const id = extractTranscriptId(t) ?? "";
            const title = (t as { title?: string | null })?.title ?? null;
            if (!id) return null;
            const isActive = activeTranscriptId === id;
            return (
              <li key={id || i} className={"flex items-center justify-between gap-2 px-2 py-1.5 rounded " + (isActive ? "bg-white/10" : "hover:bg-white/5") }>
                <button
                  className="text-left flex-1 truncate"
                  onClick={() => onSelect(id, title)}
                  title={title ?? id}
                >
                  <span className="text-xs text-neutral-400 mr-2">{id.slice(0, 6)}</span>
                  <span className="text-sm">{title ?? "Untitled"}</span>
                </button>
                <button
                  onClick={() => onDelete(id)}
                  className="text-xs text-neutral-400 hover:text-red-400"
                  title="Delete"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}function TranscriptSelect({
  activeTranscriptId,
  onSelect,
}: {
  activeTranscriptId: string | null;
  onSelect: (id: string, title?: string | null) => void | Promise<void>;
}) {
  const [items, setItems] = useState<Array<{ id?: string; title?: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadTranscripts = useCallback(async () => {
    try {
      const data = await listTranscripts({});
      setItems(data);
    } catch (error) {
      console.error("Failed to load transcripts:", error);
    }
  }, []);

  useEffect(() => {
    loadTranscripts().finally(() => setLoading(false));
  }, [loadTranscripts, refreshKey]);

  useEffect(() => {
    // Expose refresh function globally
    (window as unknown as { refreshTranscripts?: () => void }).refreshTranscripts = () => {
      setRefreshKey(prev => prev + 1);
    };
    
    return () => {
      delete (window as unknown as { refreshTranscripts?: () => void }).refreshTranscripts;
    };
  }, []);
  const isEmpty = !activeTranscriptId;
  return (
    <select
      className={
        "inline-block text-sm rounded-full border px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-gray-800 text-white " +
        (isEmpty ? "border-white/50" : "border-white/40")
      }
      style={{ 
        backgroundColor: '#1f2937', 
        color: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)'
      }}
      value={activeTranscriptId ?? "__placeholder__"}
      onChange={(e) => {
        const id = e.target.value;
        if (id === "__placeholder__") return;
        const found = items.find((t) => extractTranscriptId(t) === id);
        const title = (found as { title?: string | null } | undefined)?.title ?? null;
        if (id) onSelect(id, title);
      }}
    >
      <option value="__placeholder__">Select transcript…</option>
      {items.map((t, i) => {
        const id = extractTranscriptId(t) ?? "";
        const title = (t as { title?: string | null })?.title ?? null;
        if (!id) return null;
        return (
          <option key={id || i} value={id}>
            {(title ?? "Untitled").slice(0, 40)}
          </option>
        );
      })}
    </select>
  );
}

function ChatHistoryButton({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium pressable ${
        isOpen 
          ? "bg-white/20 text-white border border-white/30" 
          : "bg-white/10 text-white/80 hover:bg-white/15 border border-white/20"
      }`}
      title="View chat history"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
      </svg>
      <span>History</span>
    </button>
  );
}

function NewChatButton({ onNew }: { onNew: () => void }) {
  return (
    <button
      type="button"
      onClick={onNew}
      className="inline-flex items-center gap-2 rounded-full indus-button-primary px-3 py-1.5 text-xs font-medium pressable"
      title="Start a new chat"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
        <path d="M9 3.5a.75.75 0 0 1 .75.75v4h4a.75.75 0 0 1 0 1.5h-4v4a.75.75 0 0 1-1.5 0v-4h-4a.75.75 0 0 1 0-1.5h4v-4A.75.75 0 0 1 9 3.5Z" />
      </svg>
      <span className="text-white">New chat</span>
    </button>
  );
}



