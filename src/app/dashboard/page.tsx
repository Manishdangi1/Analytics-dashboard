"use client";
import { listDashboardGraphs, processQuery, listTranscripts, deleteTranscript, livekitCreateSession, livekitEndSession, livekitQuery } from "@/lib/queries";
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
  const [lkSessionId, setLkSessionId] = useState<string | null>(null);
  const [lkDisplayName, setLkDisplayName] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [hasSpeechApi, setHasSpeechApi] = useState(false);
  const speechRef = useRef<SpeechRecognition | null>(null);
  const endAfterStopRef = useRef(false);
  const speechTextRef = useRef<string>("");

  // Require login for dashboard
  useEffect(() => {
    const token = getAccessToken();
    if (!token && typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }, []);

  // Simple beep for UX
  function playBeep(frequency = 880, durationMs = 120, volume = 0.06) {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.value = volume;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => { osc.stop(); ctx.close(); }, durationMs);
    } catch {}
  }

  const [isSending, setIsSending] = useState(false);
  const sendQuestion = useCallback(async (q: string) => {
    setIsSending(true);
    try {
      const res = await processQuery({ natural_language_query: q, transcript_id: transcriptId ?? undefined });
      if (!transcriptId && res?.transcript_id) {
        const tid = res.transcript_id as string;
        setTranscriptId(tid);
        setDashboardTranscriptId(tid);
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
        message = "Previous chat was removed. Starting a new session—please resend your question.";
      } else if (status === 500 && !fromMessage && !fromDetail && !fromError) {
        message = "Server error (500). Please try again or contact support.";
      }
      console.error("processQuery failed", e);
      setError(message);
      setIsAwaitingAnswer(false);
    } finally {
      setIsSending(false);
    }
  }, [transcriptId]);

  // Initialize SpeechRecognition if available
  useEffect(() => {
    const SR: typeof window.SpeechRecognition | undefined = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      setHasSpeechApi(true);
      const rec = new SR();
      rec.continuous = false;
      rec.lang = "en-US";
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        let finalText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalText += transcript;
          else interim += transcript;
        }
        const combined = (finalText || interim).trim();
        speechTextRef.current = combined;
        setQuestion(combined);
      };
      rec.onend = async () => {
        setIsRecording(false);
        playBeep(520, 110);
        const q = (speechTextRef.current || question).trim();
        if (q) {
          // Auto-send recognized question
          if (lkSessionId) {
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
          } else {
            // simulate form submit
            setChat((prev) => [...prev, { role: "user", text: q }]);
            setError(null);
            sendQuestion(q);
            setQuestion("");
            setIsAwaitingAnswer(true);
          }
        }
        speechTextRef.current = "";
        // If user explicitly stopped via mic toggle, end session after sending
        if (endAfterStopRef.current && lkSessionId) {
          try { await livekitEndSession(lkSessionId); } catch {}
          setLkSessionId(null);
          endAfterStopRef.current = false;
        }
      };
      speechRef.current = rec;
    }
  }, [lkSessionId, question, sendQuestion]);
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
    if (transcriptId && bundle.transcript_id && bundle.transcript_id !== transcriptId) return;
    if (!transcriptId && bundle.transcript_id) {
      setTranscriptId(bundle.transcript_id);
      setDashboardTranscriptId(bundle.transcript_id);
    }
    const description = bundle.description?.description;
    const allGraphs = (bundle.graphs?.graphs as GraphItem[] | undefined) ?? [];
    const filteredGraphs = allGraphs.filter((g) => !!g.html || !!g.figure);
    const hasDescription = typeof description === "string" && description.trim().length > 0;
    const hasGraphs = filteredGraphs.length > 0;
    if (hasDescription || hasGraphs) {
      setChat((prev) => [...prev, { role: "assistant", text: hasDescription ? description : undefined, graphs: hasGraphs ? filteredGraphs : undefined }]);
      setIsAwaitingAnswer(false);
    }
  }, [poll.lastReady, transcriptId]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // Audible chime on assistant response
  useEffect(() => {
    if (!isAwaitingAnswer) return;
    // This effect is toggled off in the poll handler when content arrives
  }, [isAwaitingAnswer]);


  return (
    <div className="min-h-screen p-6 space-y-6 page-gradient">
      <div className="flex items-center justify-between gap-4 fade-in-up">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 text-xs">
            <span className="text-neutral-400">Grid</span>
            <button
              type="button"
              onClick={() => setGridCols(1)}
              className={
                "inline-flex items-center justify-center w-9 h-8 rounded border text-xs " +
                (gridCols === 1 ? "bg-white/10 border-white/20" : "bg-white/5 border-white/10 hover:bg-white/10")
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
                "inline-flex items-center justify-center w-9 h-8 rounded border text-xs " +
                (gridCols === 2 ? "bg-white/10 border-white/20" : "bg-white/5 border-white/10 hover:bg-white/10")
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
                "inline-flex items-center justify-center w-9 h-8 rounded border text-xs " +
                (gridCols === 3 ? "bg-white/10 border-white/20" : "bg-white/5 border-white/10 hover:bg-white/10")
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
        <div className="fixed bottom-6 right-6 z-50">
          <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-violet-500/30 to-fuchsia-500/30 blur-lg animate-pulse" />
          <button
            type="button"
            onClick={() => setIsChatOpen(true)}
            aria-label="Open chat"
            title="Open chat"
            className="relative inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 ring-1 ring-white/20 shadow-xl hover:from-violet-500 hover:to-fuchsia-500 pressable btn-gradient-animate"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-white">
              <path d="M18 5.5a2.5 2.5 0 0 0-2.5-2.5h-11A2.5 2.5 0 0 0 2 5.5v6A2.5 2.5 0 0 0 4.5 14H6v2.25c0 .42.47.66.82.42L10.5 14H15.5A2.5 2.5 0 0 0 18 11.5v-6Z" />
            </svg>
          </button>
      </div>
      )}

      {/* Chat Popup Modal */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setIsChatOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm modal-overlay-fade" />
          <div className="absolute bottom-6 right-6 w-[94vw] max-w-4xl chat-pop" onClick={(e) => e.stopPropagation()}>
            <Card className="bg-neutral-900 border border-white/10 shadow-2xl rounded-2xl">
              <CardHeader className="bg-white/5">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3 w-full">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-violet-600 text-white shadow">
                      💬
                    </span>
                    <span className="font-semibold text-lg tracking-tight">Chat</span>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsHistoryOpen((v) => !v)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs hover:bg-white/12 pressable"
                        title="Chat history"
                      >
                        History
                      </button>
                      <LiveKitControls
                        sessionId={lkSessionId}
                        displayName={lkDisplayName}
                        onDisplayNameChange={setLkDisplayName}
                        onStart={async () => {
                          const res = await livekitCreateSession({ display_name: lkDisplayName || null, transcript_id: transcriptId ?? null });
                          setLkSessionId(res.session_id);
                        }}
                        onEnd={async () => {
                          if (!lkSessionId) return;
                          await livekitEndSession(lkSessionId);
                          setLkSessionId(null);
                        }}
                      />
                      <TranscriptSelect
                        activeTranscriptId={transcriptId}
                        onSelect={(id) => {
                          setTranscriptId(id);
                          setDashboardTranscriptId(id);
                          setChat([]);
                        }}
                      />
                      <NewChatButton onNew={() => {
                        setChat([]);
                        setTranscriptId(null);
                        clearDashboardTranscriptId();
                        setError(null);
                      }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
        <CardContent>
                {isHistoryOpen && (
                  <ChatHistoryPanel
                    onClose={() => setIsHistoryOpen(false)}
                    activeTranscriptId={transcriptId}
                    onSelect={async (id) => {
                      setTranscriptId(id);
                      setDashboardTranscriptId(id);
                      setChat([]);
                      setIsHistoryOpen(false);
                    }}
                    onDelete={async (id) => {
                      await deleteTranscript(id);
                      if (transcriptId === id) {
                        setTranscriptId(null);
                        clearDashboardTranscriptId();
                        setChat([]);
                      }
                    }}
                  />
                )}
                <div className="space-y-4 max-h-[70vh] overflow-auto pr-1 text-[15px] leading-6 sm:leading-7">
                  {chat.length === 0 && (
                    <p className="text-neutral-300">Start by asking a question about your data.</p>
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
                          <PinButton title={g.title ?? null} figure={g.figure} html={g.html ?? null} graph_type={g.graph_type ?? null} />
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
                    <div className="text-left">
                      <div className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 bg-neutral-900 text-neutral-100 ring-1 ring-white/10 shadow-xl">
                        <span className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span>Thinking…</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
          </div>
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
                }} className="mt-4 flex items-center gap-2">
                  <input
                    value={question}
                    onChange={(e) => {
                      if (error) setError(null);
                      setQuestion(e.target.value);
                    }}
                    placeholder="Ask a question about your data..."
                    className="flex-1 rounded-full border border-white/15 bg-white/8 px-4 py-2 backdrop-blur text-neutral-100 placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-violet-600/50 shadow-inner"
                    disabled={isSending}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!hasSpeechApi || !speechRef.current) return;
                      (async () => {
                        if (isRecording) {
                          endAfterStopRef.current = true;
                          try { speechRef.current!.stop(); } catch {}
                          setIsRecording(false);
                          return;
                        }
                        try {
                          // Ensure a LiveKit session exists when starting mic
                          if (!lkSessionId) {
                            const res = await livekitCreateSession({ display_name: lkDisplayName || null, transcript_id: transcriptId ?? null });
                            setLkSessionId(res.session_id);
                          }
                          playBeep(880, 110);
                          setQuestion("");
                          setIsRecording(true);
                          speechRef.current!.start();
                        } catch (err) {
                          const msg = (err as { message?: string })?.message || "Could not start voice. Please try again.";
                          setError(msg);
                          setIsRecording(false);
                        }
                      })();
                    }}
                    className={"inline-flex items-center justify-center w-10 h-10 rounded-full border " + (isRecording ? "border-rose-400 bg-rose-500/20 animate-pulse" : "border-white/15 bg-white/8 hover:bg-white/12")}
                    title={hasSpeechApi ? (isRecording ? "Stop voice" : "Speak your question") : "Voice not supported in this browser"}
                    disabled={!hasSpeechApi}
                  >
                    {isRecording ? (
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-400" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M10 3a2 2 0 00-2 2v5a2 2 0 104 0V5a2 2 0 00-2-2z" />
                        <path d="M5 10a5 5 0 0010 0h-1.5a3.5 3.5 0 11-7 0H5z" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-60 disabled:cursor-not-allowed px-5 py-2 font-medium shadow pressable btn-gradient-animate"
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
                  {g.graph_id && <UnpinButton graphId={g.graph_id} />}
                </div>
              </div>
              {typeof g.row_count === "number" && g.row_count > 0 && (
                <span className="text-xs text-neutral-400">{g.row_count} rows</span>
              )}
            </CardHeader>
            <CardContent>
              {!g.graph_id && (
                <div className="flex items-center justify-end mb-2">
                  <PinButton title={g.title} figure={g.figure as unknown} html={g.html_content ?? null} graph_type={g.graph_type ?? null} />
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
        <p className="text-sm text-neutral-400">No graphs to display yet.</p>
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
  useEffect(() => {
    let m = true;
    (async () => {
      try {
        const data = (await listTranscripts({ limit: 100 })) as Array<Record<string, unknown>>;
        if (m) setItems(data);
      } catch {}
    })();
    return () => { m = false; };
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

function LiveKitControls({
  sessionId,
  displayName,
  onDisplayNameChange,
  onStart,
  onEnd,
}: {
  sessionId: string | null;
  displayName: string;
  onDisplayNameChange: (v: string) => void;
  onStart: () => void | Promise<void>;
  onEnd: () => void | Promise<void>;
}) {
  return (
    <div className="hidden md:flex items-center gap-2">
      <input
        value={displayName}
        onChange={(e) => onDisplayNameChange(e.target.value)}
        placeholder="Display name"
        className="w-36 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-violet-600/50"
      />
      <button
        type="button"
        onClick={onStart}
        disabled={!!sessionId}
        className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1.5 text-xs hover:bg-emerald-500/30 disabled:opacity-60"
        title="Start LiveKit session"
      >
        Start
      </button>
      <button
        type="button"
        onClick={onEnd}
        disabled={!sessionId}
        className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/20 px-3 py-1.5 text-xs hover:bg-red-500/30 disabled:opacity-60"
        title="End LiveKit session"
      >
        End
      </button>
    </div>
  );
}


