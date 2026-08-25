const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333/api";

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("finance-token");
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.message ?? "Não foi possível concluir a operação", response.status);
  return body as T;
}

export async function apiFile(path: string) {
  const token = localStorage.getItem("finance-token");
  const response = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new ApiError(body.message ?? "Não foi possível baixar o arquivo", response.status); }
  return response.blob();
}
