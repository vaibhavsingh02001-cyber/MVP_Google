"use client";

import { useEffect } from "react";

interface SessionLoggerProps {
  sessionId: string;
  isConfirmed: boolean;
}

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * SessionLogger is a silent component that attaches window unload/visibilitychange
 * listeners to ensure abandoned sessions are reported to the backend via sendBeacon.
 */
export function SessionLogger({ sessionId, isConfirmed }: SessionLoggerProps) {
  useEffect(() => {
    if (!sessionId) return;

    const handleBeforeUnload = () => {
      if (!isConfirmed && sessionId) {
        const payload = JSON.stringify({
          session_id: sessionId,
          outcome: "abandoned",
        });
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(`${BASE}/session/confirm`, blob);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [sessionId, isConfirmed]);

  return null;
}
