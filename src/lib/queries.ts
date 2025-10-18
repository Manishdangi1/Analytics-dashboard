import { api } from "@/lib/api";
import type { components, operations } from "@/types/api";
import axios from "axios";

// Create a separate API client for LiveKit calls that uses LiveKit agent credentials
const livekitApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "",
});

// Add LiveKit agent authentication
livekitApi.interceptors.request.use((config) => {
  const livekitApiKey = process.env.NEXT_PUBLIC_LIVEKIT_AGENT_API_KEY;
  console.log('🔑 LiveKit API Key present:', !!livekitApiKey);
  console.log('🔑 LiveKit API Key length:', livekitApiKey?.length || 0);
  if (livekitApiKey) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${livekitApiKey}`;
  } else {
    console.warn('⚠️ No LiveKit API Key found - LiveKit calls will fail');
  }
  return config;
});

type DashboardGraphListResponse = components["schemas"]["DashboardGraphListResponse"];
type DashboardGraphRegistrationRequest = components["schemas"]["DashboardGraphRegistrationRequest"];
type DashboardGraphRegistrationResponse = components["schemas"]["DashboardGraphRegistrationResponse"];
type DashboardGraphQueryRequest = components["schemas"]["DashboardGraphQueryRequest"];
type DashboardGraphQueryResponse = components["schemas"]["DashboardGraphQueryResponse"];
type QueryRequest = components["schemas"]["QueryRequest"];
type QueryProcessResponse = components["schemas"]["QueryProcessResponse"];
type PendingResultBundle = components["schemas"]["PendingResultBundle"];

export async function listDashboardGraphs(params?: operations["list_dashboard_graphs_dashboard_graphs_get"]["parameters"]["query"]) {
  const { data } = await api.get<DashboardGraphListResponse>("/dashboard/graphs", { params });
  return data;
}

export async function registerDashboardGraph(payload: DashboardGraphRegistrationRequest) {
  const { data } = await api.post<DashboardGraphRegistrationResponse>("/dashboard/graphs", payload);
  
  // Trigger dashboard refresh after successful registration
  if (typeof window !== "undefined" && (window as unknown as { refreshDashboardGraphs?: () => void }).refreshDashboardGraphs) {
    setTimeout(() => {
      (window as unknown as { refreshDashboardGraphs: () => void }).refreshDashboardGraphs();
    }, 100);
  }
  
  return data;
}

export async function queryDashboardGraphs(payload: DashboardGraphQueryRequest) {
  const { data } = await api.post<DashboardGraphQueryResponse>("/dashboard/graphs/query", payload);
  return data;
}

export async function processQuery(payload: QueryRequest) {
  try {
    // Omit null/undefined keys (e.g., transcript_id: null) to avoid backend 500s
    const sanitized = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== null && v !== undefined)
    ) as QueryRequest;
    const { data } = await api.post<QueryProcessResponse>("/process_query", sanitized);
    return data;
  } catch (e) {
    const err = e as { message?: string; response?: { status?: number; statusText?: string; data?: unknown } };
    const status = err?.response?.status;
    const statusText = err?.response?.statusText;
    let dataStr = "";
    try {
      dataStr = JSON.stringify(err?.response?.data);
    } catch {
      dataStr = String(err?.response?.data ?? "");
    }
    console.error(`/process_query failed: ${status ?? ""} ${statusText ?? ""} ${dataStr}`);
    throw e;
  }
}

export async function pollQueryResults() {
  const { data } = await api.get<PendingResultBundle>("/query_results/poll");
  return data;
}

// Query details
export async function getSQL(transcriptId: string, chatId: string) {
  const { data } = await api.get<components["schemas"]["SQLResponse"]>(`/get_sql/${encodeURIComponent(transcriptId)}/${encodeURIComponent(chatId)}`);
  return data;
}

export async function getTables(transcriptId: string, chatId: string) {
  const { data } = await api.get<components["schemas"]["TablesResponse"]>(`/get_tables/${encodeURIComponent(transcriptId)}/${encodeURIComponent(chatId)}`);
  return data;
}

export async function getDescription(transcriptId: string, chatId: string) {
  const { data } = await api.get<components["schemas"]["DescriptionResponse"]>(`/get_description/${encodeURIComponent(transcriptId)}/${encodeURIComponent(chatId)}`);
  return data;
}

export async function getGraphs(transcriptId: string, chatId: string) {
  const { data } = await api.get<components["schemas"]["GraphsResponse"]>(`/get_graph/${encodeURIComponent(transcriptId)}/${encodeURIComponent(chatId)}`);
  return data;
}

// Transcripts
export async function listTranscripts(params?: operations["list_transcripts_transcripts_get"]["parameters"]["query"]) {
  const { data } = await api.get<Record<string, unknown> | Record<string, unknown>[]>("/transcripts", { params });
  const anyData = data as unknown as { items?: unknown[]; transcripts?: unknown[]; results?: unknown[] } | unknown[] | Record<string, unknown>;
  const list: unknown[] = Array.isArray(anyData)
    ? anyData
    : Array.isArray((anyData as Record<string, unknown>)?.items)
    ? (anyData as Record<string, unknown>).items as unknown[]
    : Array.isArray((anyData as Record<string, unknown>)?.transcripts)
    ? (anyData as Record<string, unknown>).transcripts as unknown[]
    : Array.isArray((anyData as Record<string, unknown>)?.results)
    ? (anyData as Record<string, unknown>).results as unknown[]
    : anyData && typeof anyData === "object"
    ? Object.values(anyData as Record<string, unknown>)
    : [];
  return list as Record<string, unknown>[];
}

export async function createTranscript(payload: Record<string, unknown>) {
  const { data } = await api.post<Record<string, unknown>>("/transcripts", payload);
  return data;
}

export async function getTranscript(transcriptId: string) {
  const { data } = await api.get<Record<string, unknown>>(`/transcripts/${encodeURIComponent(transcriptId)}`);
  return data;
}

export async function updateTranscript(transcriptId: string, payload: components["schemas"]["TranscriptUpdatePayload"]) {
  const { data } = await api.patch<Record<string, unknown>>(`/transcripts/${encodeURIComponent(transcriptId)}`, payload);
  return data;
}

export async function deleteTranscript(transcriptId: string) {
  try {
    const { data } = await api.delete<Record<string, unknown>>(`/transcripts/${encodeURIComponent(transcriptId)}`);
    return data;
  } catch (e) {
    const err = e as { response?: { status?: number } };
    if (err?.response?.status === 404) {
      // Treat as idempotent: already deleted or not found
      return { ok: true, ignored: true } as unknown as Record<string, unknown>;
    }
    throw e;
  }
}

export async function getChat(transcriptId: string, chatId: string) {
  const { data } = await api.get<Record<string, unknown>>(`/transcripts/${encodeURIComponent(transcriptId)}/chats/${encodeURIComponent(chatId)}`);
  return data;
}

// Dashboard admin
export async function unregisterDashboardGraph(graphIdentifier: string) {
  const { data } = await api.delete<Record<string, unknown>>(`/dashboard/graphs/${encodeURIComponent(graphIdentifier)}`);
  
  // Trigger dashboard refresh after successful delete
  if (typeof window !== "undefined" && (window as unknown as { refreshDashboardGraphs?: () => void }).refreshDashboardGraphs) {
    setTimeout(() => {
      (window as unknown as { refreshDashboardGraphs: () => void }).refreshDashboardGraphs();
    }, 100);
  }
  
  return data;
}

export async function updateDashboardScope(payload: components["schemas"]["DashboardScopeUpdateRequest"]) {
  const { data } = await api.post<components["schemas"]["DashboardScopeUpdateResponse"]>("/dashboard/graphs/scope", payload);
  return data;
}

export async function putDashboard(payload: components["schemas"]["DashboardGraphsPayload"]) {
  const { data } = await api.put<Record<string, unknown>>("/dashboard", payload);
  return data;
}

export async function getDashboard() {
  const { data } = await api.get<Record<string, unknown>>("/dashboard");
  return data;
}

// Auth
export async function authMe() {
  const { data } = await api.get<Record<string, unknown>>("/auth/me");
  return data;
}

// Utility
export async function rootOverview() {
  const { data } = await api.get<Record<string, unknown>>("/");
  return data;
}

export async function health() {
  const { data } = await api.get<Record<string, unknown>>("/health");
  return data;
}

// LiveKit
export async function livekitCreateSession(payload: components["schemas"]["LiveKitSessionCreateRequest"]) {
  const { data } = await livekitApi.post<components["schemas"]["LiveKitSessionStartResponse"]>("/livekit/session", payload);
  return data;
}

export async function livekitEndSession(sessionId: string) {
  const { data } = await livekitApi.delete<Record<string, unknown>>(`/livekit/session/${encodeURIComponent(sessionId)}`);
  return data;
}

export async function livekitIssueToken(sessionId: string, payload?: components["schemas"]["LiveKitTokenRequest"]) {
  const { data } = await livekitApi.post<components["schemas"]["LiveKitTokenResponse"]>(`/livekit/session/${encodeURIComponent(sessionId)}/token`, payload ?? null);
  return data;
}

export async function livekitMetadata(sessionId: string) {
  const { data } = await livekitApi.get<components["schemas"]["LiveKitSessionMetadataResponse"]>(`/livekit/session/${encodeURIComponent(sessionId)}/metadata`);
  return data;
}

export async function livekitIngestTranscript(sessionId: string, payload: components["schemas"]["LiveKitTranscriptIngest"]) {
  const { data } = await livekitApi.post<Record<string, unknown>>(`/livekit/session/${encodeURIComponent(sessionId)}/transcripts`, payload);
  return data;
}

export async function livekitQuery(sessionId: string, payload: components["schemas"]["LiveKitQueryRequest"]) {
  const { data } = await livekitApi.post<Record<string, unknown>>(`/livekit/session/${encodeURIComponent(sessionId)}/query`, payload);
  return data;
}


