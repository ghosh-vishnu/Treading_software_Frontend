export function extractApiErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err) {
    const maybeAxios = err as {
      code?: string;
      message?: string;
      response?: { data?: unknown };
    };

    if (maybeAxios.code === "ECONNABORTED") {
      return "Request timed out. Please try again.";
    }

    const data = maybeAxios.response?.data;
    if (typeof data === "string" && data.trim()) {
      return data;
    }

    if (typeof data === "object" && data) {
      const payload = data as {
        detail?: unknown;
        message?: unknown;
        error?: { code?: unknown; message?: unknown } | unknown;
      };

      if (typeof payload.detail === "string" && payload.detail.trim()) {
        return payload.detail;
      }

      if (Array.isArray(payload.detail)) {
        const first = payload.detail[0] as { msg?: unknown } | undefined;
        if (first && typeof first.msg === "string" && first.msg.trim()) {
          return first.msg;
        }
      }

      if (typeof payload.message === "string" && payload.message.trim()) {
        return payload.message;
      }

      if (typeof payload.error === "object" && payload.error) {
        const structured = payload.error as { code?: unknown; message?: unknown };
        if (typeof structured.message === "string" && structured.message.trim()) {
          return structured.message;
        }
        if (typeof structured.code === "string" && structured.code.trim()) {
          return structured.code;
        }
      }
    }

    if (typeof maybeAxios.message === "string" && maybeAxios.message.includes("Network Error")) {
      return "Network error. Please check that the backend server is running.";
    }
  }

  return fallback;
}

