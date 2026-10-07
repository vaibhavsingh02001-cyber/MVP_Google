# 🔍 "Recall" — AI-Native Retrieval Agent MVP for Google Photos

> **Project Type:** MVP · **Team:** Core Experience, Google Photos · **Stage:** Discovery → Build

---

## 📋 Role & Context

I am a **Product Manager on the Core Experience team at Google Photos**.

Users accumulate thousands of photos, videos, screenshots, and documents. When they *remember* a photo exists but cannot describe it precisely — no date, no place, no exact keywords — retrieval breaks down.

**Business Goal:** Increase the percentage of users who successfully retrieve a photo they remember but cannot precisely describe when they start searching.

### 🔬 Research Findings

Discovery-engine data and user interviews identify **two weak stages** in the retrieval journey:

| Stage | Label | Problem |
|-------|-------|---------|
| **(c)** | **JUDGE** | Results appear, but the user cannot tell which one is right |
| **(d)** | **REFINE** | The search misses, and the user has no way to narrow it |

> **Note:** Users don't lack memory. They remember a **moment**, a **purpose**, a **mood**, or a **neighbouring event** — but search only accepts date, place, and object keywords.

---

## 💡 The Solution: "Recall"

**Recall** is a conversational, clue-based retrieval agent that sits inside a Google Photos-style search experience. It activates when:
- A search is **weak**, or
- The user taps **"Can't find it? Help me remember."**

---

## ✅ Core Behaviours *(all required)*

### 1. 🗣️ Fuzzy Clue Input
Accept messy, natural-language memory dumps. Examples:
- *"Small cafe from our Goa trip, I think it was raining, maybe 2023?"*
- *"The medicine I took when I was sick last year."*

Extract clues of the following types:

| Clue Type | Example |
|-----------|---------|
| **Moment / Event** | "Goa trip", "when I was sick" |
| **Mood or Look** | "rainy", "dim", "crowded", "cozy" |
| **Timeline Anchor** | "before the Goa trip", "the day after this photo" |
| **Purpose** | "a receipt", "something I saved for a reason" |
| **People / Objects / Place / Rough Dates** | "my cousin", "beach", "around 2023" |

---

### 2. 🔎 Search First, Ask Second
- **Never interrogate before showing something.**
- Run a search immediately from the clues given and show results at once.

---

### 3. 🗂️ Named Clusters With a Reason
- Group candidates into **3–5 named clusters** (e.g., *"Cafe in Panjim, Nov 2023, rainy — 12 photos"*) instead of a flat grid.
- Each cluster must show a **one-line reason it matched**, tied to the user's own clues.
- **Addresses:** JUDGE failure — users can recognise the right group fast.

---

### 4. ❓ One Narrowing Question
- After showing clusters, ask **exactly one question** chosen to split remaining candidates most evenly.
  - *Example: "Was there food on the table, or was it the outside of the cafe?"*
- Offer **tappable answer chips** plus free text.
- **Cap: 3 questions per session.**

---

### 5. 🚫 "Not This" Feedback
- Let the user mark a photo or cluster as **"not this"**, or say *"earlier"*, *"later"*, *"more like this"*.
- Each reaction must **visibly update** the candidates.
- **Addresses:** REFINE failure.

---

### 6. 📌 Anchor-Based Search
- Let the user pick a photo they **do** remember and say *"it was near this one"* (before/after/same day).
- Use it as a **timeline pin** for narrowing results.

---

### 7. ✅ Confirm and Close
- **"That's it"** button confirms the find, logs success, and offers to save to a *"Found"* album.
- A permanent **"Skip to all results"** link must always be visible — the agent must never trap the user.

---

## 🧠 Where Intelligence Is Actually Needed

> **Important:** Use an LLM (Claude via API, or Gemini) **ONLY** for the following tasks. Keep everything else simple.

| Use LLM ✅ | Use Plain Code ❌ |
|-----------|-----------------|
| Parsing fuzzy clues into structured filters (time range, place, objects, mood, anchors, purpose) | Filtering by date |
| Resolving relative anchors ("before the Goa trip") against the library | Sorting |
| Naming clusters and writing one-line match reasons | Chips & timeline UI |
| Choosing the most discriminating next question | Album save |
| Interpreting "not this" feedback | Session logging |

---

## 📸 Data for the MVP

- Real Google Photos data is **not accessible** — build a standalone prototype on a **demo library of 150–300 sample images**.
- Use **royalty-free images** (Unsplash/Pexels or a public dataset). Include screenshots, receipts, and document-like images — not only scenic photos.
- Give each image **realistic metadata**: timestamp, location, and optional people tags.
- Build the demo library so it contains clear **"episodes"** (a trip, a sick week, a wedding, a move) so cluster naming is testable.
- Run a **vision model ONCE per image at build time** to generate:
  - Caption
  - Objects
  - Dominant colours
  - Mood tags
  - Purpose tags (`receipt`, `reminder`, `proof`, `memory`)
  - Store as **JSON** and reuse — do **not** call vision models on every search.
- Support **user-uploaded photos** so testers can try their own memories (with a clear privacy note).

---

## 🛠️ Suggested Stack

> **Tip:** Flexible — pick what is most reliable.

| Layer | Technology |
|-------|-----------|
| **Front End** | React or Next.js, styled as a Google Photos-like shell (search bar, photo grid, side agent panel with chips) |
| **Back End** | Small API (Node or Python/FastAPI) exposing tool-style functions: `search_library(filters)`, `cluster_episodes()`, `ask_next_question()`, `exclude_similar()`, `set_anchor()` |
| **Agent** | Claude API with tool calling and structured JSON outputs |
| **Storage** | JSON or SQLite for photo metadata; optional embeddings (e.g. Chroma) for similarity and "more like this" |
| **Hosting** | Vercel / Netlify / Render — **public URL, no login required**. API keys must live server-side only. |

---

## 📐 Functional Requirements

- **End-to-end flow:** clue in → clusters out → one question → reaction → narrowed results → confirm.
- **Latency target:** first result under **3 seconds**; use cached metadata and stream clusters as soon as they are ready.
- Show a visible **"why this matched"** line for every cluster.
- **Session logging** must capture:
  - Clues entered
  - Queries parsed
  - Number of turns
  - Questions asked and answered
  - "Not this" count
  - Time to find
  - Outcome: `found` / `skipped` / `abandoned`
- **Export** logs as CSV/JSON for computing success metrics.
- **Baseline mode toggle:** plain single-shot keyword search over the same library — to compare Recall vs. basic search in user tests (same task, both modes).
- **Mobile-friendly layout** — testers will use phones.

---

## 📊 Success Metrics the MVP Must Measure

| Metric | Definition |
|--------|-----------|
| **Vague-search success rate** | Confirmed finds / vague-search sessions |
| **Turns to find** | Number of conversational turns until confirmation |
| **Time to find** | Elapsed time from first clue to confirmation |
| **First-hit rate** | Confirmed photo appears in the first clusters shown |
| **Question answer rate** | Questions answered / questions asked |
| **Confirm rate** | "That's it" taps / sessions started |
| **Abandon rate** *(guardrail)* | Sessions abandoned without a find |
| **Wrong-confirm rate** *(guardrail)* | Find later undone by user |
| **Latency** *(guardrail)* | Time to first result |

---

## ⚠️ Constraints & Safeguards

> **Caution:** The following constraints are non-negotiable for the MVP.

- **Accuracy:** Only show photos that exist in the library. **Never invent photo details.** If confidence is low, say so and show fewer, clearer clusters.
- **Session cap:** Questions capped at **3 per session**; always allow "Skip to all results."
- **Privacy (user uploads):**
  - State plainly what is stored, for how long.
  - Provide a **"Delete my data"** button.
  - Do **not** train on or share uploads.
  - Keep API keys **out of the client**.
- **Sensitive images:** Handle medical/document images carefully — no reading out personal details in cluster names; use generic labels like *"Medicine photo"* or *"Receipt."*
- **Disclaimer:** This is a prototype, not the production Google Photos. Do not claim it integrates with the real product.

---

## 🧪 Test Tasks to Support

> Build the demo library so all five of these tasks work end-to-end.

| # | Test Task |
|---|-----------|
| 1 | *"The small cafe from our trip, I think it was raining."* |
| 2 | *"The photo of the medicine from when I was sick last year."* |
| 3 | *"A screenshot I saved for a reason, I think around the time I changed jobs."* |
| 4 | *"A photo from the wedding, my cousin was in it."* |
| 5 | *"The picture taken right after the beach day."* |

---

## 📦 Deliverables

1. ✅ A **deployed, publicly accessible MVP URL** (no login required).
2. ✅ **Source code** in a repository with a `README` covering setup, env vars, and how to swap in a different photo library.
3. ✅ The **demo library** with metadata JSON and the build-time tagging script.
4. ✅ **Session logging** with a CSV/JSON export.
5. ✅ A short **"how it works" note** (agent loop, tools, prompts) that can be turned into a slide.

---

## 🏁 Definition of Done

- [ ] A stranger can open the link, type a vague memory, get named clusters with reasons, answer one question, say "not this," and confirm a find — **without any instructions**.
- [ ] All **five test tasks** can be completed in **3 turns or fewer** on the demo library.
- [ ] **Baseline mode** and **Recall mode** both work on the same library and both log sessions.
- [ ] The **log export** gives all the fields needed to compute the metrics above.

---

*Document generated from [`Problemstatement.txt`](./Problemstatement.txt)*
