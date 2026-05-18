export type ApiSuccess<T> = {
  success: true;
  data?: T;
  message?: string;
};

export type ApiFailure = {
  success: false;
  error?: string;
  message?: string;
  data?: unknown;
};

type QueryValue = string | number | boolean | null | undefined;

export function buildQuery(params: Record<string, QueryValue | QueryValue[]>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== null && item !== undefined && item !== "") {
          search.append(key, String(item));
        }
      });
      return;
    }

    if (value !== null && value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });

  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => ({}))) as ApiSuccess<T> | ApiFailure;

  if (!response.ok || payload.success === false) {
    const failure = payload as ApiFailure;
    const message =
      failure.message ??
      failure.error ??
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return (payload as ApiSuccess<T>).data as T;
}

export function jsonRequest(method: "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown): RequestInit {
  return {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}
