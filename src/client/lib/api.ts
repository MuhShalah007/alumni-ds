// Centralized API client for the frontend.
// Handles JWT auth header injection and error normalization.

const API_BASE = "/api";

interface FetchOptions extends Omit<RequestInit, "body"> {
  auth?: boolean;
  jsonBody?: unknown;
  body?: BodyInit | null;
}

function getToken(): string | null {
  return localStorage.getItem("admin_token");
}

export async function apiFetch<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const { auth = false, jsonBody, body, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };

  if (auth) {
    const token = getToken();
    if (token) {
      finalHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  let finalBody: BodyInit | null | undefined = body;
  if (jsonBody !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    finalBody = JSON.stringify(jsonBody);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: finalBody,
  });

  const contentType = res.headers.get("Content-Type") || "";
  const isJson = contentType.includes("application/json");
  const data: unknown = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message = isJson && typeof data === "object" && data !== null && "error" in data
      ? String((data as Record<string, unknown>).error)
      : `HTTP ${res.status}`;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

export class ApiError extends Error {
  status: number;
  details: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

// Auth token management
export function setToken(token: string): void {
  localStorage.setItem("admin_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("admin_token");
}

export function getAlumniToken(): string | null {
  return localStorage.getItem("alumni_token");
}

export function clearAlumniToken(): void {
  localStorage.removeItem("alumni_token");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
