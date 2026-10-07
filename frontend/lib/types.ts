/**
 * frontend/lib/types.ts
 * =====================
 * Shared TypeScript type definitions for the Recall photo retrieval agent frontend.
 */

export type Mode = "recall" | "baseline";

export interface Photo {
  id: string;
  filename: string;
  timestamp: string;
  location_label: string;
  caption: string;
  objects: string[];
  mood_tags: string[];
  purpose_tag: string;
  episode_label: string;
  similarity?: number;
  url?: string;
  session_id?: string;
}

export interface StoryAlbum {
  id: string;
  title: string;
  subtitle: string;
  date_from?: string;
  date_to?: string;
  photo_count: number;
  cover_photo: Photo;
  photos: Photo[];
}

export interface PhotoFeedResponse {
  photos: Photo[];
  stories: StoryAlbum[];
  total: number;
}

export interface Cluster {
  name: string;
  photo_ids: string[];
  match_reason: string;
  photos: Photo[];
}

export interface Question {
  question_text: string;
  answer_chips: string[];
}

export interface AgentResponse {
  clusters: Cluster[];
  question: Question | null;
  skip_to_all: boolean;
  session_id: string;
  photos?: Photo[];
  confidence?: string;
  elapsed_ms?: number;
}

export type FeedbackSignal = "not_this" | "earlier" | "later" | "more_like_this";

export type UIState = 
  | "idle" 
  | "searching" 
  | "clusters_shown" 
  | "refining" 
  | "confirmed" 
  | "error";

export interface SSEEvent {
  type: "cluster" | "question" | "done" | "error";
  cluster?: Cluster;
  question?: Question;
  skip_to_all?: boolean;
  elapsed_ms?: number;
  confidence?: string;
  session_id?: string;
  message?: string;
  photos?: Photo[];
}

export interface AnchorResult {
  anchor_photo_id: string;
  relation: "before" | "after" | "same_day";
  window_start: string;
  window_end: string;
  status: string;
}
