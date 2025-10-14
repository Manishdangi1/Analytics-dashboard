"use client";
import { listDashboardGraphs, processQuery, listTranscripts, deleteTranscript, createTranscript, updateTranscript, livekitQuery } from "@/lib/queries";
import { extractTranscriptId } from "@/lib/ids";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryResultsPoll } from "@/hooks/useQueryResultsPoll";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { HTMLRender } from "@/components/ui/HTMLRender";
import PinButton from "@/components/PinButton";
import UnpinButton from "@/components/UnpinButton";
import type { components } from "@/types/api";
import { getDashboardTranscriptId, setDashboardTranscriptId, clearDashboardTranscriptId } from "@/lib/dashboardSession";
import { getAccessToken } from "@/lib/auth";

type GraphItem = components["schemas"]["GraphItem"];
type DashboardGraph = components["schemas"]["DashboardGraphMetadataModel"];

export default function DashboardPage() {
  const [question, setQuestion] = useState("");
  const [transcriptId, setTranscriptId] = useState<string | null>(getDashboardTranscriptId());
  const [chat, setChat] = useState<Array<{ role: "user" | "assistant"; text?: string; graphs?: GraphItem[] }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
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
    } catch {}
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

  // Prevent background scroll when chat is open (mobile fix)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const body = document.body as HTMLBodyElement;
    const html = document.documentElement as HTMLElement;
    if (isChatOpen) {
      scrollLockYRef.current = window.scrollY || window.pageYOffset || 0;
      html.style.overscrollBehavior = "none";
      html.style.overflow = "hidden";
      body.style.position = "fixed";
      body.style.top = `-${scrollLockYRef.current}px`;
      body.style.width = "100%";
      body.style.overflow = "hidden";
    } else {
      html.style.overflow = "";
      html.style.overscrollBehavior = "";
      const y = Math.abs(parseInt(body.style.top || "0", 10)) || 0;
      body.style.position = "";
      body.style.top = "";
      body.style.width = "";
      body.style.overflow = "";
      if (y) window.scrollTo(0, y);
    }
    return () => {
      html.style.overflow = "";
      html.style.overscrollBehavior = "";
      const y = Math.abs(parseInt(body.style.top || "0", 10)) || 0;
      body.style.position = "";
      body.style.top = "";
      body.style.width = "";
      body.style.overflow = "";
      if (y) window.scrollTo(0, y);
    };
  }, [isChatOpen]);

  // Require login for dashboard
  useEffect(() => {
    const token = getAccessToken();
    if (!token && typeof window !== "undefined") {
      window.location.href = "/login";
    } else {
      setIsCheckingAuth(false);
    }
  }, []);


  const [isSending, setIsSending] = useState(false);
  const [isFirstQuestion, setIsFirstQuestion] = useState(false);
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
      // Stop loader first
      setIsAwaitingAnswer(false);
      // Add response with a small delay to show loader stopping before response
      setTimeout(() => {
        setChat((prev) => [...prev, { role: "assistant", text: hasDescription ? description : undefined, graphs: hasGraphs ? filteredGraphs : undefined }]);
      }, 100);
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
    <div className="h-screen page-gradient overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {notice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60]">
          <div className="glass-fade-in inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-200 ring-1 ring-emerald-400/20 shadow">
            <span>✅</span>
            <span>{notice.text}</span>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-4 fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight indus-text-gradient">Dashboard</h1>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 text-xs">
            <span className="text-neutral-400">Grid</span>
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
        </div>
      </div>

      {/* Floating Chat Button */}
      {!isChatOpen && (
        <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50">
          <div className="absolute -inset-1 md:-inset-2 rounded-full bg-gradient-to-r from-primary/30 to-accent/30 blur-md md:blur-lg animate-pulse" />
          <button
            type="button"
            onClick={() => setIsChatOpen(true)}
            aria-label="Open chat"
            title="Open chat"
            className="relative inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full indus-button-primary ring-1 ring-white/20 shadow-xl pressable indus-glow"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 md:w-6 md:h-6 text-white">
              <path d="M18 5.5a2.5 2.5 0 0 0-2.5-2.5h-11A2.5 2.5 0 0 0 2 5.5v6A2.5 2.5 0 0 0 4.5 14H6v2.25c0 .42.47.66.82.42L10.5 14H15.5A2.5 2.5 0 0 0 18 11.5v-6Z" />
            </svg>
          </button>
      </div>
      )}

      {/* Chat Popup Modal */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setIsChatOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm modal-overlay-fade" />
          <div className="absolute inset-0 md:inset-auto md:bottom-6 md:right-6 md:left-auto md:w-[94vw] md:max-w-4xl chat-pop flex items-end md:block" onClick={(e) => e.stopPropagation()}>
            <Card className="bg-neutral-900 border border-white/10 shadow-2xl rounded-t-2xl md:rounded-2xl h-[95dvh] md:h-auto md:max-h-[90vh] overflow-hidden flex flex-col w-full mt-2">
              <CardHeader className="bg-white/5 sticky top-0 z-10">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3 w-full">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full indus-button-primary text-white shadow indus-glow">
                      💬
                    </span>
                    <span className="font-semibold text-lg tracking-tight indus-text-gradient">Chat</span>
                    <div className="ml-auto hidden md:flex items-center gap-2">
                      <TranscriptSelect
                        activeTranscriptId={transcriptId}
                        onSelect={(id) => {
                          setTranscriptId(id);
                          setDashboardTranscriptId(id);
                          const saved = loadChatFromStorage(id);
                          setChat(Array.isArray(saved) ? saved : []);
                          setIsFirstQuestion(false); // Reset first question flag when switching transcripts
                          setChatKey(prev => prev + 1); // Force re-render
                          setIsChatOpen(true);
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
                  <div className="flex items-center gap-2">
                    {/* History toggle */}
                    <button
                      type="button"
                      onClick={() => setIsHistoryOpen((v) => !v)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs hover:bg-white/12 pressable"
                      title="Chat history"
                    >
                      History
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsChatOpen(false)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded border border-white/10 hover:bg-white/10"
                      aria-label="Close chat"
                    >
                      ✕
                    </button>
                  </div>
                </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0">
                {isHistoryOpen && (
                  <ChatHistoryPanel
                    onClose={() => setIsHistoryOpen(false)}
                    activeTranscriptId={transcriptId}
                    onSelect={async (id) => {
                      setTranscriptId(id);
                      setDashboardTranscriptId(id);
                      const saved = loadChatFromStorage(id);
                      setChat(Array.isArray(saved) ? saved : []);
                      setIsFirstQuestion(false); // Reset first question flag when switching transcripts
                      setChatKey(prev => prev + 1); // Force re-render
                      setIsHistoryOpen(false);
                      setIsChatOpen(true);
                    }}
                    onDelete={async (id) => {
                      await deleteTranscript(id);
                      if (transcriptId === id) {
                        setTranscriptId(null);
                        clearDashboardTranscriptId();
                        setChat([]);
                      }
                      // Refresh dropdown after deletion
                      if (typeof window !== "undefined" && (window as unknown as { refreshTranscripts?: () => void }).refreshTranscripts) {
                        (window as unknown as { refreshTranscripts: () => void }).refreshTranscripts();
                      }
                    }}
                  />
                )}
                <div key={chatKey} ref={messagesRef} className="flex-1 space-y-4 overflow-y-auto pr-1 text-[15px] leading-6 sm:leading-7 min-h-0">
                  {chat.length === 0 && (
                    <div className="space-y-3">
                      <p className="text-neutral-300">Start by asking a question about your data.</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const q = "what is the employee distribution across departments";
                            setChat((prev) => [...prev, { role: "user", text: q }]);
                            setError(null);
                            sendQuestion(q);
                            setQuestion("");
                            setIsAwaitingAnswer(true);
                          }}
                          className="pressable inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 hover:bg-white/12 px-3 py-1.5 text-sm"
                        >
                          What is the employee distribution across departments
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const q = "what were the sales this year";
                            setChat((prev) => [...prev, { role: "user", text: q }]);
                            setError(null);
                            sendQuestion(q);
                            setQuestion("");
                            setIsAwaitingAnswer(true);
                          }}
                          className="pressable inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 hover:bg-white/12 px-3 py-1.5 text-sm"
                        >
                          What were the sales this year
                        </button>
                      </div>
                    </div>
                  )}
            {chat.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                {m.text && (
                        <div className={
                          "inline-block max-w-[80ch] md:max-w-[65ch] rounded-2xl px-4 py-2 shadow whitespace-pre-wrap leading-7 break-words " +
                          (m.role === "user"
                            ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white ring-1 ring-white/10"
                            : "bg-slate-900 text-slate-100 ring-1 ring-slate-300/15 shadow-xl"
                          )}>
                          {m.text}
                        </div>
                )}
                {m.graphs && m.graphs.length > 0 && (
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                          {m.graphs
                            .filter((g) => g.html || g.figure)
                            .map((g, gi) => (
                              <div key={gi} className="rounded-xl border border-sky-400/20 bg-sky-950/40 p-3 space-y-2 shadow ring-1 ring-sky-400/10">
                        <div className="flex items-center justify-end">
                          <PinButton
                            title={g.title ?? null}
                            figure={g.figure}
                            html={g.html ?? null}
                            graph_type={g.graph_type ?? null}
                            onPinned={() => {
                              // Reload graphs list without full page refresh
                              (async () => {
                                try {
                                  const res = await listDashboardGraphs({ active_only: true });
                                  setGraphs(res?.graphs ?? []);
                                } catch {}
                              })();
                              showSuccess("Pinned to dashboard");
                            }}
                          />
                        </div>
                        {g.html ? (
                                  <HTMLRender html={g.html} height={480} className="border-sky-400/20" />
                        ) : (
                                  <p className="text-sm text-sky-200/80">Visualization available.</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
                  {isAwaitingAnswer && (
                    <div className="flex items-center gap-3">
                      <div className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 bg-neutral-900 text-neutral-100 ring-1 ring-white/10 shadow-xl">
                        <span className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span>Thinking…</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          ignoreResponsesRef.current = true;
                          setIsAwaitingAnswer(false);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 hover:bg-white/12 px-3 py-1.5 text-sm"
                        title="Stop waiting for this response"
                      >
                        Stop
                      </button>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                {/* Sticky input form at bottom */}
                <div className="sticky bottom-0 bg-neutral-900 border-t border-white/10 p-4 -mx-4 -mb-4">
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (lkSessionId) {
                      const q = question.trim();
                      if (!q) return;
                      setChat((prev) => [...prev, { role: "user", text: q }]);
                      setQuestion("");
                      try {
                        setIsAwaitingAnswer(true);
                        await livekitQuery(lkSessionId, { question: q, context: null });
                      } catch (err) {
                        const msg = (err as { message?: string })?.message || "Voice query failed.";
                        setError(msg);
                        setIsAwaitingAnswer(false);
                      }
                      return;
                    }
                    await onAsk(e);
                  }} className="flex items-center gap-2">
                  <input
                    value={question}
                    onChange={(e) => {
                      if (error) setError(null);
                      setQuestion(e.target.value);
                    }}
                    placeholder="Ask a question about your data..."
                    className="flex-1 rounded-full border border-white/15 bg-white/8 px-4 py-3 md:py-2 backdrop-blur text-neutral-100 placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-inner indus-border-glow"
                    disabled={isSending}
                  />
                  {/* Mic button removed on mobile for simplicity/responsiveness */}
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-full indus-button-primary disabled:opacity-60 disabled:cursor-not-allowed px-5 py-3 md:py-2 font-medium shadow pressable"
                      disabled={isSending || !question.trim()}
                    >
                    {isSending ? (
                      <>
                        <span className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.125a.563.563 0 01.71-.71L12 6l8.021-3.585a.563.563 0 01.71.71L18 12l2.731 8.875a.563.563 0 01-.71.71L12 18l-8.021 3.585a.563.563 0 01-.71-.71L6 12z" />
                        </svg>
                        Ask
                      </>
                    )}
                  </button>
                  </form>
                  {/* New chat (mobile quick reset) */}
                  <div className="mt-2 md:hidden">
                    <button
                      type="button"
                      onClick={async () => {
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
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 hover:bg-white/12 px-4 py-2 text-sm"
                      title="Start a new chat"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M9 3.5a.75.75 0 0 1 .75.75v4h4a.75.75 0 0 1 0 1.5h-4v4a.75.75 0 0 1-1.5 0v-4h-4a.75.75 0 0 1 0-1.5h4v-4A.75.75 0 0 1 9 3.5Z" />
                      </svg>
                      New chat
                    </button>
                  </div>
                </div>
                {error && (
                  <div className="mt-2 text-sm text-red-400">{error}</div>
                )}
        </CardContent>
      </Card>
          </div>
        </div>
      )}

      <div className={"grid gap-6 fade-in-up " + (gridCols === 1 ? "grid-cols-1" : gridCols === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3") }>
        {((graphs ?? []).filter((g) => g?.html_content || g?.figure || g?.description) as DashboardGraph[]).map((g, idx) => (
          <Card key={idx} className="glass-fade-in hover:shadow-[0_10px_40px_rgba(0,0,0,0.25)] transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <h2 className="font-medium tracking-tight">{g.title ?? g.graph_type ?? "Graph"}</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedGraph(g)}
                    className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
                    title="Expand"
                  >
                    View
                  </button>
                  {g.graph_id && (
                    <UnpinButton
                      graphId={g.graph_id}
                      onUnpinned={() => {
                        setGraphs((prev) => prev.filter((x) => x.graph_id !== g.graph_id));
                        showSuccess("Unpinned from dashboard");
                      }}
                    />
                  )}
                </div>
              </div>
              {typeof g.row_count === "number" && g.row_count > 0 && (
                <span className="text-xs text-neutral-400">{g.row_count} rows</span>
              )}
            </CardHeader>
            <CardContent>
              {!g.graph_id && (
                <div className="flex items-center justify-end mb-2">
                  <PinButton
                    title={g.title}
                    figure={g.figure as unknown}
                    html={g.html_content ?? null}
                    graph_type={g.graph_type ?? null}
                    onPinned={async () => {
                      try {
                        const res = await listDashboardGraphs({ active_only: true });
                        setGraphs(res?.graphs ?? []);
                      } catch {}
                      showSuccess("Pinned to dashboard");
                    }}
                  />
                </div>
              )}
              {g.html_content ? (
                <HTMLRender html={g.html_content} height={gridCols === 1 ? 640 : 360} />
              ) : g.figure ? (
                <p className="text-sm text-neutral-300">Visualization available.</p>
              ) : null}
              {g.description && (
                <p className="text-neutral-300 text-sm mt-2">{g.description}</p>
              )}
              {g.graph_id && (
                <div className="mt-2 text-xs text-neutral-400 space-y-1">
                  {g.data_source && (
                    <div><span className="text-neutral-500">Source:</span> {g.data_source}</div>
                  )}
                  {Array.isArray(g.fields) && g.fields.length > 0 && (
                    <div>
                      <span className="text-neutral-500">Fields:</span> {g.fields.slice(0, 5).join(", ")}
                      {g.fields.length > 5 ? ` +${g.fields.length - 5} more` : ""}
                    </div>
                  )}
                  {g.summary && (
                    <div>
                      <span className="text-neutral-500">Summary:</span> {typeof g.summary === "string" ? g.summary : Object.keys(g.summary as Record<string, unknown>).slice(0, 5).join(", ")}
                    </div>
                  )}
                  {g.last_synced_at && (
                    <div><span className="text-neutral-500">Last synced:</span> {g.last_synced_at}</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {((graphs ?? []).filter((g) => g?.html_content || g?.figure || g?.description).length ?? 0) === 0 && (
        <div className="glass-fade-in rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow ring-1 ring-white/20">📌</div>
          <h3 className="text-lg font-medium tracking-tight">No pinned insights yet</h3>
          <p className="mt-1 text-sm text-neutral-300">Ask a question and pin your favorite results to build your dashboard.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="pressable btn-gradient-animate inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400 hover:from-violet-500 hover:via-fuchsia-400 hover:to-cyan-300 px-4 py-2 text-sm font-medium text-black"
              title="Open chat"
            >
              Open chat
            </button>
            <button
              type="button"
              onClick={() => {
                const q = "what is the employee distribution across departments";
                setChat((prev) => [...prev, { role: "user", text: q }]);
                setError(null);
                sendQuestion(q);
                setQuestion("");
                setIsAwaitingAnswer(true);
                setIsChatOpen(true);
              }}
              className="pressable inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 hover:bg-white/12 px-3 py-1.5 text-sm"
            >
              What is the employee distribution across departments
            </button>
            <button
              type="button"
              onClick={() => {
                const q = "what were the sales this year";
                setChat((prev) => [...prev, { role: "user", text: q }]);
                setError(null);
                sendQuestion(q);
                setQuestion("");
                setIsAwaitingAnswer(true);
                setIsChatOpen(true);
              }}
              className="pressable inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 hover:bg-white/12 px-3 py-1.5 text-sm"
            >
              What were the sales this year
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        {isFetching && <p className="text-sm text-neutral-400">Refreshing…</p>}
        {poll.isPolling && <p className="text-sm text-neutral-400">Polling results…</p>}
      </div>

      {/* Expanded Graph Modal */}
      {expandedGraph && (
        <div className="fixed inset-0 z-50" onClick={() => setExpandedGraph(null)}>
          <div className="absolute inset-0 bg-black/60 modal-overlay-fade" />
          <div className="absolute inset-0 p-6 fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto max-w-6xl">
              <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
                    <div>
                      <h3 className="font-medium">{expandedGraph.title ?? expandedGraph.graph_type ?? "Graph"}</h3>
                      {typeof expandedGraph.row_count === "number" && expandedGraph.row_count > 0 && (
                        <span className="text-xs text-neutral-400">{expandedGraph.row_count} rows</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedGraph(null)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded border border-white/10 hover:bg-white/10"
                        aria-label="Close"
                      >
                        ✕
                      </button>
                    </div>
            </div>
          </CardHeader>
          <CardContent>
                  {expandedGraph.html_content ? (
                    <HTMLRender html={expandedGraph.html_content} height={760} />
                  ) : expandedGraph.figure ? (
                      <p className="text-sm text-neutral-300">Visualization available.</p>
                    ) : (
                    <p className="text-neutral-400 text-sm">No visualization available.</p>
                  )}
                  {expandedGraph.description && (
                    <p className="text-neutral-300 text-sm mt-2">{expandedGraph.description}</p>
                  )}
                  {expandedGraph.graph_id && (
                    <div className="mt-2 text-xs text-neutral-400 space-y-1">
                      {expandedGraph.data_source && (
                        <div><span className="text-neutral-500">Source:</span> {expandedGraph.data_source}</div>
                      )}
                      {Array.isArray(expandedGraph.fields) && expandedGraph.fields.length > 0 && (
                        <div>
                          <span className="text-neutral-500">Fields:</span> {expandedGraph.fields.slice(0, 8).join(", ")}
                          {expandedGraph.fields.length > 8 ? ` +${expandedGraph.fields.length - 8} more` : ""}
                        </div>
                      )}
                      {expandedGraph.summary && (
                        <div>
                          <span className="text-neutral-500">Summary:</span> {typeof expandedGraph.summary === "string" ? expandedGraph.summary : Object.keys(expandedGraph.summary as Record<string, unknown>).slice(0, 8).join(", ")}
                        </div>
                      )}
                      {expandedGraph.last_synced_at && (
                        <div><span className="text-neutral-500">Last synced:</span> {expandedGraph.last_synced_at}</div>
                    )}
                  </div>
            )}
          </CardContent>
        </Card>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
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
  const [items, setItems] = useState<Array<Record<string, unknown>> | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let m = true;
    (async () => {
      try {
        const data = (await listTranscripts({ limit: 100 })) as Array<Record<string, unknown>>;
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
            const id = extractTranscriptId(t);
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
                  className="text-xs text-red-400 hover:text-red-300"
                  onClick={async () => {
                    await onDelete(id);
                    // Refresh list
                    try {
                      const data = (await listTranscripts({ limit: 100 })) as Array<Record<string, unknown>>;
                      setItems(data);
                    } catch {}
                    // Also refresh the dropdown
                    if (typeof window !== "undefined" && (window as unknown as { refreshTranscripts?: () => void }).refreshTranscripts) {
                      (window as unknown as { refreshTranscripts: () => void }).refreshTranscripts();
                    }
                  }}
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TranscriptSelect({ activeTranscriptId, onSelect }: { activeTranscriptId: string | null; onSelect: (id: string, title?: string | null) => void }) {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const loadTranscripts = useCallback(async () => {
    try {
      const data = (await listTranscripts({ limit: 100 })) as Array<Record<string, unknown>>;
      setItems(data);
    } catch (error) {
      console.error("Failed to load transcripts:", error);
    }
  }, []);
  
  useEffect(() => {
    loadTranscripts();
  }, [loadTranscripts, refreshKey]);
  
  // Expose refresh function globally for new chat creation
  useEffect(() => {
    (window as unknown as { refreshTranscripts?: () => void }).refreshTranscripts = () => setRefreshKey(prev => prev + 1);
    return () => {
      delete (window as unknown as { refreshTranscripts?: () => void }).refreshTranscripts;
    };
  }, []);
  const isEmpty = !activeTranscriptId;
  return (
    <select
      className={
        "inline-block text-sm rounded-full border px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-600/50 bg-neutral-900/95 text-white " +
        (isEmpty ? "border-white/50" : "border-white/40")
      }
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

function NewChatButton({ onNew }: { onNew: () => void }) {
  return (
    <button
      type="button"
      onClick={onNew}
      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-xs font-medium ring-1 ring-white/15 hover:from-violet-500 hover:to-fuchsia-500 pressable"
      title="Start a new chat"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
        <path d="M9 3.5a.75.75 0 0 1 .75.75v4h4a.75.75 0 0 1 0 1.5h-4v4a.75.75 0 0 1-1.5 0v-4h-4a.75.75 0 0 1 0-1.5h4v-4A.75.75 0 0 1 9 3.5Z" />
      </svg>
      <span className="text-white">New chat</span>
    </button>
  );
}



