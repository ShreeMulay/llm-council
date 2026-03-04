import type { ChatQuery, ChatResponse, CollectionInfo, DomainInfo } from "./types";

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
