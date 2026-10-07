/**
 * frontend/lib/api.ts
 * ====================
 * Client library for communicating with the Recall FastAPI backend.
 * Supports progressive SSE streaming, feedback reactions, anchor pins, and confirmation.
 */

import {
  Mode,
  Photo,
  Cluster,
  Question,
  AgentResponse,
  FeedbackSignal,
  SSEEvent,
  AnchorResult,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Returns the browser-accessible URL for an image.
 */
export function getPhotoImageUrl(photo: Photo | { filename: string; session_id?: string }): string {
  if ("url" in photo && photo.url) {
    return photo.url;
  }
  const filename = photo.filename;
  if (!filename) return "";
  
  if ("session_id" in photo && photo.session_id) {
    return `${BASE}/uploads/${photo.session_id}/${filename}`;
  }
  return `${BASE}/images/${filename}`;
}

/**
 * Generate a visual placeholder SVG data URL based on photo caption/mood
 * for when the physical image file is not yet downloaded.
 */
export function getPhotoFallbackSvg(photo: Photo): string {
  const title = encodeURIComponent(photo.caption || photo.filename || "Photo");
  const loc = encodeURIComponent(photo.location_label || "Moments");
  const date = encodeURIComponent(photo.timestamp ? photo.timestamp.slice(0, 10) : "");
  
  // Choose an aesthetically pleasing gradient based on episode or hash
  const colors = [
    ["#1e293b", "#0f172a", "#38bdf8"],
    ["#1e1b4b", "#0f172a", "#818cf8"],
    ["#14532d", "#052e16", "#4ade80"],
    ["#701a75", "#4a044e", "#f472b6"],
    ["#7c2d12", "#431407", "#fb923c"],
  ];
  const charCode = (photo.episode_label || photo.id || "a").charCodeAt(0);
  const [c1, c2, accent] = colors[charCode % colors.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}" />
        <stop offset="100%" stop-color="${c2}" />
      </linearGradient>
    </defs>
    <rect width="600" height="400" fill="url(#g)" />
    <circle cx="500" cy="100" r="140" fill="${accent}" fill-opacity="0.12" />
    <circle cx="100" cy="320" r="160" fill="${accent}" fill-opacity="0.08" />
    <g transform="translate(40, 60)">
      <rect x="0" y="0" width="48" height="48" rx="12" fill="${accent}" fill-opacity="0.2" />
      <path d="M16 32l6-8 5 6 7-10 8 12H16z" fill="${accent}" />
      <circle cx="21" cy="20" r="3" fill="${accent}" />
      <text x="64" y="24" fill="${accent}" font-family="system-ui, sans-serif" font-weight="600" font-size="14" letter-spacing="1">PHOTO MEMORY</text>
      <text x="64" y="42" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">${loc} • ${date}</text>
    </g>
    <foreignObject x="40" y="180" width="520" height="180">
      <div xmlns="http://www.w3.org/1999/xhtml" style="color:#e2e8f0;font-family:system-ui,sans-serif;font-size:18px;font-weight:500;line-height:1.4;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;">
        ${photo.caption || "A captured moment in time"}
      </div>
    </foreignObject>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Initiates a search session.
 * For Recall mode, reads and yields SSE stream events.
 * For Baseline mode, handles plain JSON response and yields a synthetic done event with photos.
 */
export async function* startSession(
  clue: string,
  mode: Mode,
  sessionId: string,
  signal?: AbortSignal
): AsyncGenerator<SSEEvent> {
  const res = await fetch(`${BASE}/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clue, mode, session_id: sessionId }),
    signal,
  });

  if (!res.ok) {
    let errorMsg = `Server error (${res.status})`;
    try {
      const errJson = await res.json();
      errorMsg = errJson.detail || errorMsg;
    } catch {
      // ignore
    }
    yield { type: "error", message: errorMsg, session_id: sessionId };
    return;
  }

  // Baseline mode returns plain JSON
  if (mode === "baseline") {
    const data = await res.json();
    const photos: Photo[] = data.photos || [];
    // Yield a synthetic cluster to reuse the cluster/photo viewer, or as done event
    const singleCluster: Cluster = {
      name: `Search results for "${clue}"`,
      photo_ids: photos.map((p) => p.id),
      match_reason: `Found ${photos.length} matching photos via keyword index`,
      photos,
    };
    yield { type: "cluster", cluster: singleCluster };
    yield {
      type: "done",
      elapsed_ms: 120,
      confidence: "high",
      skip_to_all: true,
      session_id: sessionId,
      photos,
    };
    return;
  }

  // Recall mode: SSE stream
  if (!res.body) {
    yield { type: "error", message: "Response body stream is unavailable", session_id: sessionId };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const block of lines) {
        const trimmed = block.trim();
        if (!trimmed) continue;

        for (const line of trimmed.split("\n")) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            try {
              const event: SSEEvent = JSON.parse(jsonStr);
              yield event;
            } catch (err) {
              console.warn("Failed to parse SSE event chunk:", jsonStr, err);
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Send user reaction or feedback signal to refine clusters.
 */
export async function sendFeedback(
  sessionId: string,
  feedback: FeedbackSignal,
  excludedIds: string[] = [],
  answer?: string,
  freeText?: string
): Promise<AgentResponse> {
  const res = await fetch(`${BASE}/session/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      feedback,
      excluded_ids: excludedIds,
      answer: answer || null,
      free_text: freeText || null,
    }),
  });

  if (!res.ok) {
    throw new Error(`Feedback failed with status ${res.status}`);
  }

  return res.json();
}

/**
 * Confirm a photo was found, skipped, or abandoned.
 */
export async function confirmPhoto(
  sessionId: string,
  photoId?: string,
  outcome: "found" | "skipped" | "abandoned" = "found"
): Promise<{ status: string; outcome: string }> {
  const res = await fetch(`${BASE}/session/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      photo_id: photoId || null,
      outcome,
    }),
  });

  if (!res.ok) {
    throw new Error(`Confirm failed with status ${res.status}`);
  }

  return res.json();
}

/**
 * Anchor a photo as a timeline reference point.
 */
export async function setAnchor(
  sessionId: string,
  photoId: string,
  relation: "before" | "after" | "same_day"
): Promise<AnchorResult> {
  const res = await fetch(`${BASE}/session/anchor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      photo_id: photoId,
      relation,
    }),
  });

  if (!res.ok) {
    throw new Error(`Anchor resolution failed with status ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch individual photo metadata.
 */
export async function getPhoto(photoId: string): Promise<Photo> {
  const res = await fetch(`${BASE}/photos/${photoId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch photo metadata for ${photoId}`);
  }
  return res.json();
}

/**
 * Upload a new photo to the temporary session library.
 */
export async function uploadPhoto(file: File, sessionId: string): Promise<Photo> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("session_id", sessionId);

  const res = await fetch(`${BASE}/photos/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Photo upload failed with status ${res.status}`);
  }

  return res.json();
}

/**
 * Delete an uploaded photo.
 */
export async function deleteUpload(photoId: string): Promise<{ status: string }> {
  const res = await fetch(`${BASE}/photos/upload/${photoId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error(`Failed to delete upload ${photoId}`);
  }

  return res.json();
}

/**
 * Fetch Google Photos main feed (stories, recent timeline, photo array).
 */
export async function fetchPhotoFeed(): Promise<{
  photos: Photo[];
  stories: import("./types").StoryAlbum[];
  total: number;
}> {
  const res = await fetch(`${BASE}/photos/feed`);
  if (!res.ok) {
    throw new Error(`Failed to load photo feed: ${res.status}`);
  }
  return res.json();
}

/**
 * Check backend health status.
 */
export async function checkHealth(): Promise<{
  status: string;
  db_photos: number;
  chroma_vectors: number;
}> {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`);
  }
  return res.json();
}
