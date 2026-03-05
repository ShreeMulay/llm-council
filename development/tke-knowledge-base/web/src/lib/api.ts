import type { ArticleFull, ChatQuery, ChatResponse, CollectionInfo, DomainInfo, LibraryIndexResponse } from "./types";

const API_BASE = "/api";

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

export async function healthCheck(): Promise<{ status: string; service: string }> {
  return fetchJSON("/health");
}

export async function getCollectionInfo(): Promise<{ status: string; collection: CollectionInfo }> {
  return fetchJSON("/info");
}

export async function getDomains(): Promise<{ domains: DomainInfo[] }> {
  return fetchJSON("/domains");
}

export async function chat(query: ChatQuery): Promise<ChatResponse> {
  return fetchJSON<ChatResponse>("/chat", {
    method: "POST",
    body: JSON.stringify(query),
  });
}

// --- Library ---

export async function getLibrary(params?: {
  content_type?: string;
  domain?: string;
  search?: string;
}): Promise<LibraryIndexResponse> {
  const searchParams = new URLSearchParams();
  if (params?.content_type) searchParams.set("content_type", params.content_type);
  if (params?.domain) searchParams.set("domain", params.domain);
  if (params?.search) searchParams.set("search", params.search);
  const qs = searchParams.toString();
  return fetchJSON<LibraryIndexResponse>(`/library${qs ? `?${qs}` : ""}`);
}

export async function getArticle(articleId: string): Promise<ArticleFull> {
  return fetchJSON<ArticleFull>(`/library/${articleId}`);
}
