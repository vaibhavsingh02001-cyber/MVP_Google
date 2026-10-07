# How Recall Works — Architecture & Design 1-Pager

> **Product:** Recall (AI-Native Conversational Photo Retrieval Agent for Google Photos)  
> **Target Audience:** Product Managers, Engineering Leadership, Design Partners  
> **Status:** MVP Implemented & Testing Ready  

---

## 1. Executive Summary

Traditional photo search relies on exact keyword matching over OCR text or object classification labels. When users have vague, episodic memories (e.g. *"the coffee shop receipt in Kyoto"* or *"picture after the beach day"*), keyword search returns hundreds of unordered photos or fails entirely.

**Recall** turns photo retrieval into a conversational, episodic detective. Instead of forcing the user to know the right keywords upfront, Recall:
1. Translates fuzzy memories into structured temporal, spatial, and sensory filters.
2. Groups candidate photos into 3–5 coherent life episodes.
3. Asks discriminating narrowing questions to cut search space in half.
4. Allows users to pin temporal landmarks (*timeline anchors*) to pivot search.

---

## 2. The Core Agent Loop

The retrieval workflow follows a closed-loop 6-step cycle:

```
 User Clue ("the coffee shop receipt in Kyoto")
       │
       ▼
 1. parse_clues() ──▶ Claude Haiku extracts structured filters:
                       { location: "Kyoto", object: "receipt", purpose: "document" }
       │
       ▼
 2. search_library() ──▶ SQLite structured query + FTS5 full-text indexing
       │
       ▼
 3. chroma_store.query() ──▶ Multimodal semantic vector similarity (anchor/visual cues)
       │
       ▼
 4. cluster_episodes() ──▶ Claude groups candidates into 3–5 named episodes
       │                   with explicit match reasoning
       ▼
 5. ask_next_question() ──▶ Claude determines the single most discriminating question
       │                   with 3–4 tappable answer chips (max 3 turns)
       ▼
 6. log_turn() ──▶ Turn recorded to SQLite session DB for metrics comparison
```

---

## 3. Strict LLM Boundary & Deterministic Execution

To achieve speed, safety, and predictability, Recall enforces a strict boundary between probabilistic AI reasoning and deterministic data operations:

| Task | Handled By | Why |
|------|------------|-----|
| Intent interpretation | **Claude 3 Haiku** | Understands messy natural language, synonyms, and episodic framing |
| Library filtering | **SQLite + FTS5** | Sub-millisecond execution, zero hallucination of photo IDs |
| Semantic similarity | **ChromaDB** | Vector math on embeddings |
| Episode naming & reasoning | **Claude 3 Haiku** | Synthesizes cluster themes into human-friendly explanations |
| Photo confirmation & state | **FastAPI + React** | Deterministic session lifecycle and metric logging |

> **Key Rule:** The LLM *never* accesses the photo database directly. It receives sanitized metadata schemas and returns structured tool arguments.

---

## 4. Latency Optimization: Progressive SSE Streaming

Waiting for the full agent loop (clue parsing + search + clustering + question generation) to complete before rendering would create unacceptable delay. 

- **Progressive Delivery:** The backend yields Server-Sent Events (`text/event-stream`).
- **Immediate Feedback:** As soon as an individual cluster is enriched, it streams to the browser.
- **Card-by-Card Animation:** Cluster cards appear sequentially using `@keyframes slideUp` as they arrive, maintaining interactive responsiveness under 3 seconds.

---

## 5. Built-in A/B Testing: Baseline Mode Parity

To quantitatively prove that Recall outperforms traditional search, the system includes a parallel **Baseline Mode**:
- **Baseline Engine:** Executes pure SQLite FTS5 keyword indexing over photo captions and metadata without conversational assistance.
- **Identical Session Logging:** Both modes write to the same `sessions` and `turns` tables capturing identical fields:
  - `session_id`, `mode`, `started_at`, `ended_at`, `outcome` (`found`, `skipped`, `abandoned`), `confirmed_photo`, `turn_index`, `raw_clue`, `parsed_filters`, `clusters_shown`, `question_asked`, `answer_given`, `feedback_signal`, `excluded_ids`, `time_elapsed_ms`.
- **Direct Metric Comparison:** Enables side-by-side computation of *Turns to Find*, *Time to Find*, *First-Hit Rate*, and *Abandon Rate*.

---

## 6. Privacy & Safety Architecture

1. **Zero Google Account PII:** The MVP operates entirely on synthetic/Creative Commons demo photo libraries.
2. **PII Sanitization:** The vision pipeline redacts names, faces, addresses, and phone numbers from OCR captions.
3. **Sensitive Category Protection:** Photos tagged as medical (prescriptions, test results) receive generic labels (`purpose_tag: "medical"`).
4. **Automatic 24-Hour Purge:** An asynchronous APScheduler background worker sweeps the upload directory hourly, permanently deleting files and database records older than 24 hours.
5. **On-Demand Purge:** Users can wipe their session data and temporary uploads instantly via the in-app "Reset Data" control.

---

*Recall MVP Documentation · Google Photos Retrieval Agent*
