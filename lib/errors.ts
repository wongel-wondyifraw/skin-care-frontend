/** Maps raw API / runtime errors into safe, user-facing copy. */

const SAFE_BY_STATUS: Record<number, string> = {
  400: "The request could not be completed. Please check your input and try again.",
  401: "Your session has expired. Please sign in again.",
  403: "You do not have permission to perform this action.",
  404: "The requested item could not be found.",
  409: "This item already exists.",
  413: "The file is too large to upload.",
  422: "Some of the submitted data is invalid.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "Something went wrong on our side. Please try again later.",
  502: "The server is temporarily unavailable. Please try again later.",
  503: "The service is temporarily unavailable. Please try again later.",
};

const SENSITIVE =
  /password|token|secret|sql|stack|exception|econn|errno|postgres|typeorm|at\s+\w+\s+\(|internal server|query failed|connection refused|enotfound/i;

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 500, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (error instanceof ApiError) {
    return error.status === 0 || error.code === "NETWORK";
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("network request failed") ||
      msg.includes("load failed") ||
      msg.includes("unable to reach the server")
    );
  }
  return false;
}

export function sanitizeErrorMessage(
  raw: unknown,
  status?: number,
): string {
  if (status === 0 || isNetworkError(raw)) {
    return "Connection lost. Trying to reconnect…";
  }

  const fallback =
    (status && SAFE_BY_STATUS[status]) ||
    "Something went wrong. Please try again.";

  let message = "";
  if (raw instanceof Error) message = raw.message;
  else if (typeof raw === "string") message = raw;
  else if (raw && typeof raw === "object" && "message" in raw) {
    const m = (raw as { message: unknown }).message;
    message = Array.isArray(m) ? m.join(", ") : String(m ?? "");
  }

  message = message.trim();
  if (!message) return fallback;
  if (SENSITIVE.test(message)) return fallback;
  if (message.length > 180) return fallback;

  // Prefer known conflict guidance when present
  if (status === 409 && message) return message;
  if (status && status >= 500) return SAFE_BY_STATUS[status] ?? fallback;

  return message;
}
