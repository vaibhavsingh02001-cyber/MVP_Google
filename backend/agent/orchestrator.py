"""
backend/agent/orchestrator.py
================================
Main agent loop for the Recall photo retrieval agent.

Implements the 6-step retrieval flow:
  1. parse_clues()        → LLM extracts structured filters from user clue
  2. search_library()     → SQLite search using extracted filters
  3. chroma_store.query() → optional semantic similarity (anchor / more-like-this)
  4. cluster_episodes()   → LLM groups candidates into 3-5 named clusters
  5. ask_next_question()  → LLM picks the most discriminating question
  6. log_turn()           → session turn persisted to SQLite

Also implements:
  - apply_feedback()  → interpret user reaction and re-run the loop
  - set_anchor()      → resolve a photo as a timeline pin
  - baseline_search() → FTS5 keyword search (Baseline mode, no LLM)

All LLM calls are synchronous (run in a thread pool via FastAPI's run_in_executor
when called from async endpoints).
"""

import json
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import AsyncGenerator

from agent.claude_client import run_tool_loop, extract_json
from agent.prompts import (
    SYSTEM_PROMPT,
    PARSE_CLUES_PROMPT,
    CLUSTER_PROMPT,
    QUESTION_PROMPT,
    FEEDBACK_PROMPT,
)
from agent.tools import TOOLS
from storage import metadata_db, session_db, chroma_store

log = logging.getLogger("recall.orchestrator")

MAX_CANDIDATES  = 100   # cap passed to SQLite search
MAX_CLUSTERS    = 5
MIN_CLUSTERS    = 3
MAX_QUESTIONS   = 3


# ─────────────────────────────────────────────────────────────────────────────
# Session state (in-memory, keyed by session_id)
# In production this would be Redis; for MVP a module-level dict is sufficient.
# ─────────────────────────────────────────────────────────────────────────────
_sessions: dict[str, dict] = {}


def _get_session(session_id: str) -> dict:
    if session_id not in _sessions:
        _sessions[session_id] = {
            "clue":           "",
            "filters":        {},
            "excluded_ids":   [],
            "anchor":         None,      # { photo_id, timestamp, relation }
            "turn_count":     0,
            "asked_questions": [],
            "clusters":       [],
            "last_candidates": [],
        }
    return _sessions[session_id]


# ─────────────────────────────────────────────────────────────────────────────
# Tool handler — called by claude_client.run_tool_loop for each tool_use block
# ─────────────────────────────────────────────────────────────────────────────

def _make_tool_handler(session_id: str):
    state = _get_session(session_id)

    def handle(tool_name: str, tool_input: dict):
        if tool_name == "search_library":
            return _tool_search_library(state, tool_input)
        elif tool_name == "cluster_episodes":
            return _tool_cluster_episodes(state, tool_input)
        elif tool_name == "ask_next_question":
            return _tool_ask_next_question(state, tool_input)
        elif tool_name == "exclude_similar":
            return _tool_exclude_similar(state, tool_input)
        elif tool_name == "set_anchor":
            return _tool_set_anchor(state, tool_input)
        else:
            log.warning("Unknown tool called: %s", tool_name)
            return {"error": f"Unknown tool: {tool_name}"}

    return handle


# ─────────────────────────────────────────────────────────────────────────────
# Individual tool implementations
# ─────────────────────────────────────────────────────────────────────────────

def _tool_search_library(state: dict, filters: dict) -> dict:
    """Execute structured search and cache results in session state."""
    state["filters"] = filters

    # Apply anchor time window if set
    if anchor := state.get("anchor"):
        anchor_filters = _anchor_to_time_range(anchor)
        if anchor_filters and not filters.get("time_range"):
            filters["time_range"] = anchor_filters

    candidates = metadata_db.search(
        filters,
        limit=MAX_CANDIDATES,
        exclude_ids=state["excluded_ids"],
    )

    # Fallback: progressively relax filters if zero results
    if not candidates:
        log.info("Zero results — relaxing filters progressively")
        relaxed = dict(filters)
        for key in ("people", "mood_tags", "objects", "locations", "time_range"):
            if key in relaxed:
                del relaxed[key]
                candidates = metadata_db.search(
                    relaxed, limit=MAX_CANDIDATES, exclude_ids=state["excluded_ids"]
                )
                if candidates:
                    log.info("Relaxed '%s' — got %d results", key, len(candidates))
                    break

        if not candidates and state.get("clue"):
            candidates = metadata_db.fts_search(
                state["clue"], limit=MAX_CANDIDATES, exclude_ids=state["excluded_ids"]
            )
            if candidates:
                log.info("FTS fallback retrieved %d results for clue", len(candidates))

    # Optional: augment with Chroma similarity if anchor embedding available
    if state.get("anchor") and chroma_store._available:
        anchor_id = state["anchor"]["photo_id"]
        similar_ids = chroma_store.query_by_photo_id(
            anchor_id, top_k=30, exclude_ids=state["excluded_ids"]
        )
        existing_ids = {c.id for c in candidates}
        extra = [
            p for pid in similar_ids
            if pid not in existing_ids
            and (p := metadata_db.get_photo(pid)) is not None
        ]
        candidates = candidates + extra

    state["last_candidates"] = candidates

    # Return lightweight summary for Claude (not full metadata — saves tokens)
    return {
        "count": len(candidates),
        "candidates": [
            {
                "id":             c.id,
                "timestamp":      c.timestamp,
                "location":       c.location_label,
                "episode":        c.episode_label,
                "caption":        c.caption[:120],
                "objects":        c.objects[:6],
                "mood_tags":      c.mood_tags[:4],
                "purpose_tag":    c.purpose_tag,
                "people_tags":    c.people_tags,
            }
            for c in candidates[:MAX_CANDIDATES]
        ],
        "message": "No photos found." if not candidates else f"{len(candidates)} photos found.",
    }


def _tool_cluster_episodes(state: dict, tool_input: dict) -> dict:
    """
    Claude calls this after search_library.
    We use the photo_ids from Claude's input to look up full metadata,
    then ask Claude to name the clusters via a separate non-tool prompt call.
    """
    photo_ids  = tool_input.get("photo_ids", [])
    user_clue  = tool_input.get("user_clue", state.get("clue", ""))

    # Validate IDs against actual candidates
    valid_ids = {c.id for c in state["last_candidates"]}
    photo_ids = [pid for pid in photo_ids if pid in valid_ids]

    if not photo_ids:
        photo_ids = [c.id for c in state["last_candidates"][:50]]

    photos = [p for pid in photo_ids if (p := metadata_db.get_photo(pid)) is not None]

    candidates_summary = [
        {
            "id":        p.id,
            "timestamp": p.timestamp,
            "location":  p.location_label,
            "episode":   p.episode_label,
            "caption":   p.caption[:100],
            "mood_tags": p.mood_tags[:3],
            "purpose":   p.purpose_tag,
        }
        for p in photos[:50]
    ]

    prompt = CLUSTER_PROMPT.format(
        count=len(photos),
        clue=user_clue,
        candidates_json=json.dumps(candidates_summary, indent=2),
    )

    try:
        from agent.claude_client import _make_client, extract_json
        client = _make_client()
        resp = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text if resp.content else "{}"
        result = extract_json(text)
        clusters = result.get("clusters", [])
    except Exception as e:
        log.info("Claude clustering unavailable (%s); using deterministic episode clustering", e)
        clusters = []

    # Enforce count limits
    if len(clusters) > MAX_CLUSTERS:
        clusters = clusters[:MAX_CLUSTERS]
    if len(clusters) < 1:
        # Fallback: one cluster per episode
        from collections import defaultdict
        by_episode: dict = defaultdict(list)
        for p in photos:
            by_episode[p.episode_label].append(p.id)
        clusters = [
            {
                "name":         ep[:50],
                "photo_ids":    ids[:20],
                "match_reason": f"Photos from '{ep}' that matched your search",
            }
            for ep, ids in list(by_episode.items())[:MAX_CLUSTERS]
        ]

    state["clusters"] = clusters
    return {"clusters": clusters}


def _tool_ask_next_question(state: dict, tool_input: dict) -> dict:
    """Generate the next narrowing question unless turn cap is reached."""
    turns_used      = tool_input.get("turns_used", state["turn_count"])
    clusters        = tool_input.get("clusters", state["clusters"])
    asked_questions = tool_input.get("asked_questions", state["asked_questions"])

    if turns_used >= MAX_QUESTIONS:
        return {"question": None}

    prompt = QUESTION_PROMPT.format(
        clusters_json=json.dumps(clusters, indent=2),
        clue=state.get("clue", ""),
        turns_used=turns_used,
        asked_questions=json.dumps(asked_questions),
    )

    try:
        from agent.claude_client import _make_client, extract_json
        client = _make_client()
        resp = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text.strip() if resp.content else "null"

        if text.lower() in ("null", "none", ""):
            return {"question": None}

        q = extract_json(text)
        chips = q.get("answer_chips", [])
        if len(chips) >= 2:
            q["answer_chips"] = chips[:4]
            if q.get("question_text"):
                state["asked_questions"].append(q["question_text"])
            return {"question": q}
    except Exception as e:
        log.info("Claude question generation unavailable (%s); using heuristic question generator", e)

    # Heuristic question fallback based on clue intent
    clue_lower = state.get("clue", "").lower()
    if "receipt" in clue_lower or "coffee" in clue_lower:
        q = {
            "question_text": "Are you looking for the paper receipt or the cafe setting?",
            "answer_chips": ["Paper receipt on table", "Latte art in mug", "Cafe exterior", "Not sure"]
        }
    elif "sick" in clue_lower or "medicine" in clue_lower:
        q = {
            "question_text": "Was it a prescription box or the thermometer reading?",
            "answer_chips": ["Prescription box", "Thermometer with tea", "Bedside recovery", "Not sure"]
        }
    elif "job" in clue_lower or "resignation" in clue_lower:
        q = {
            "question_text": "Are you looking for the resignation email draft or the team farewell?",
            "answer_chips": ["Resignation email", "Clean office desk", "Team celebration", "Not sure"]
        }
    elif "cake" in clue_lower or "wedding" in clue_lower:
        q = {
            "question_text": "Do you remember if it was the cake cutting moment or the wedding palace decor?",
            "answer_chips": ["Mom cutting cake under lights", "Palace marigold decor", "Stage family portrait", "Not sure"]
        }
    elif "beach" in clue_lower:
        q = {
            "question_text": "Was it the seafood dinner right after or the sunset ocean waves?",
            "answer_chips": ["Seafood dinner platter", "Sunset over waves", "Coconut cart", "Not sure"]
        }
    elif "iceland" in clue_lower or "tire" in clue_lower:
        q = {
            "question_text": "Was it the flat tire by the gravel road or the repair invoice paperwork?",
            "answer_chips": ["Flat tire on SUV", "Lifting car with jack", "Repair invoice on wheel", "Not sure"]
        }
    else:
        q = {
            "question_text": "Which detail best matches what you're trying to locate?",
            "answer_chips": ["Specific document / note", "Outdoor scenic shot", "Indoor cozy setting", "Not sure"]
        }

    state["asked_questions"].append(q["question_text"])
    return {"question": q}


def _tool_exclude_similar(state: dict, tool_input: dict) -> dict:
    """Update excluded IDs and return refined filters based on feedback signal."""
    excluded  = tool_input.get("excluded_ids", [])
    signal    = tool_input.get("signal", "not_this")
    free_text = tool_input.get("free_text", "")

    state["excluded_ids"].extend(excluded)
    state["excluded_ids"] = list(set(state["excluded_ids"]))

    current_filters = dict(state.get("filters", {}))

    prompt = FEEDBACK_PROMPT.format(
        clue=state.get("clue", ""),
        current_filters_json=json.dumps(current_filters, indent=2),
        signal=signal,
        excluded_ids_json=json.dumps(excluded),
        free_text=free_text or "",
    )

    try:
        from agent.claude_client import _make_client, extract_json
        client = _make_client()
        resp = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text if resp.content else "{}"
        updated_filters = extract_json(text)
        state["filters"] = updated_filters
        return {"updated_filters": updated_filters, "excluded_ids": state["excluded_ids"]}
    except Exception as e:
        log.info("Claude filter refinement unavailable (%s); applying heuristic refinement", e)
        updated_filters = dict(current_filters)
        if signal == "not_this":
            pass  # excluded_ids already updated in state
        elif signal == "earlier":
            if state.get("last_candidates"):
                earliest = min(c.timestamp for c in state["last_candidates"])
                updated_filters["time_range"] = {"to": earliest[:10]}
        elif signal == "later":
            if state.get("last_candidates"):
                latest = max(c.timestamp for c in state["last_candidates"])
                updated_filters["time_range"] = {"from": latest[:10]}
        state["filters"] = updated_filters
        return {"updated_filters": updated_filters, "excluded_ids": state["excluded_ids"]}


def _tool_set_anchor(state: dict, tool_input: dict) -> dict:
    """Resolve an anchor photo into a time window for relative search."""
    anchor_photo_id = tool_input.get("anchor_photo_id", "")
    relation        = tool_input.get("relation", "before")

    photo = metadata_db.get_photo(anchor_photo_id)
    if not photo:
        return {"error": f"Anchor photo {anchor_photo_id} not found"}

    state["anchor"] = {
        "photo_id":  anchor_photo_id,
        "timestamp": photo.timestamp,
        "relation":  relation,
    }

    time_range = _anchor_to_time_range(state["anchor"])
    return {"anchor_set": True, "photo_id": anchor_photo_id,
            "timestamp": photo.timestamp, "time_range": time_range}


def _anchor_to_time_range(anchor: dict) -> dict | None:
    """Convert an anchor + relation into a from/to time_range dict."""
    if not anchor:
        return None
    try:
        ts_str   = anchor["timestamp"]
        relation = anchor["relation"]
        # Parse ISO datetime (handle both with and without timezone)
        ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))

        WINDOW_DAYS = 14  # search within 14 days of anchor

        if relation == "before":
            return {"from": (ts - timedelta(days=WINDOW_DAYS)).strftime("%Y-%m-%d"),
                    "to":   ts.strftime("%Y-%m-%d")}
        elif relation == "after":
            return {"from": ts.strftime("%Y-%m-%d"),
                    "to":   (ts + timedelta(days=WINDOW_DAYS)).strftime("%Y-%m-%d")}
        elif relation == "same_day":
            return {"from": ts.strftime("%Y-%m-%d"),
                    "to":   ts.strftime("%Y-%m-%d")}
    except Exception as e:
        log.warning("Anchor time range error: %s", e)
    return None


def _heuristic_parse_clue(clue: str) -> dict:
    """Deterministic fallback clue parser for offline / local mode."""
    clue_lower = clue.lower()
    filters = {}
    
    locations = []
    if "kyoto" in clue_lower or "japan" in clue_lower:
        locations.append("Kyoto")
    if "mumbai" in clue_lower or "bandra" in clue_lower:
        locations.append("Mumbai")
    if "jaipur" in clue_lower or "rajasthan" in clue_lower:
        locations.append("Jaipur")
    if any(k in clue_lower for k in ["bengaluru", "bangalore", "koramangala", "indiranagar"]):
        locations.append("Bengaluru")
    if "iceland" in clue_lower or "reykjavik" in clue_lower:
        locations.append("Iceland")
    if "goa" in clue_lower or "panjim" in clue_lower:
        locations.append("Goa")
    if locations:
        filters["locations"] = locations

    objs = []
    for candidate_obj in [
        "receipt", "bill", "coffee", "cup", "cake", "medicine", "prescription",
        "thermometer", "laptop", "screenshot", "offer letter", "seafood", "sunset",
        "flat tire", "jack", "dog", "frisbee", "sticky note", "wifi", "ramen", "sketchbook"
    ]:
        if candidate_obj in clue_lower:
            objs.append(candidate_obj)
    if objs:
        filters["objects"] = objs

    purpose_tags = []
    if any(k in clue_lower for k in ["receipt", "bill", "invoice"]):
        purpose_tags.append("receipt")
    if any(k in clue_lower for k in ["screenshot", "draft"]):
        purpose_tags.append("screenshot")
    if any(k in clue_lower for k in ["medicine", "prescription", "wifi", "note", "password"]):
        purpose_tags.append("reminder")
    if purpose_tags:
        filters["purpose_tags"] = purpose_tags

    people = []
    if any(k in clue_lower for k in ["mom", "mother"]):
        people.append("mom")
    if any(k in clue_lower for k in ["family", "cousin"]):
        people.append("family")
    if any(k in clue_lower for k in ["bride", "groom"]):
        people.append("bride")
    if people:
        filters["people"] = people

    if "kyoto" in clue_lower:
        filters["episode"] = "Kyoto Cafes & Receipts"
    elif "sick" in clue_lower or "pharmacy" in clue_lower or "medicine" in clue_lower:
        filters["episode"] = "Sick Week & Pharmacy"
    elif "job" in clue_lower or "resignation" in clue_lower or "office" in clue_lower:
        filters["episode"] = "Job Change & Resignation"
    elif "wedding" in clue_lower or "cake" in clue_lower:
        filters["episode"] = "Cousin's Wedding Celebration"
    elif "beach" in clue_lower:
        filters["episode"] = "Beach Day & Sunset Dinner"
    elif "iceland" in clue_lower or "tire" in clue_lower:
        filters["episode"] = "Iceland Road Trip"

    return filters


# ─────────────────────────────────────────────────────────────────────────────
# Main entry points
# ─────────────────────────────────────────────────────────────────────────────

async def run_recall_session(
    clue: str,
    session_id: str,
    answer: str = None,
) -> AsyncGenerator[dict, None]:
    """
    Run the main Recall agent loop and yield clusters as they are produced.

    Yields dicts with either:
      { type: "cluster", cluster: {...} }
      { type: "question", question: {...} }
      { type: "done", elapsed_ms: int }
      { type: "error", message: str }
    """
    t0    = time.time()
    state = _get_session(session_id)
    state["clue"] = clue

    # Build episode list for the clue-parsing prompt
    episodes = metadata_db.get_all_episodes()
    episode_list = "\n".join(
        f'- "{ep["label"]}" ({ep["date_from"][:10]} to {ep["date_to"][:10]}, {ep["count"]} photos)'
        for ep in episodes
    )

    today = datetime.now().strftime("%Y-%m-%d")
    parse_prompt = PARSE_CLUES_PROMPT.format(
        episode_list=episode_list,
        today=today,
        clue=clue,
    )

    # ── Step 1: parse clue into filters ──────────────────────────────────────
    try:
        from agent.claude_client import _make_client
        client = _make_client()
        parse_resp = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=512,
            messages=[{"role": "user", "content": parse_prompt}],
        )
        filters_text = parse_resp.content[0].text if parse_resp.content else "{}"
        try:
            filters = extract_json(filters_text)
        except ValueError:
            log.warning("Clue parse failed, using heuristic fallback")
            filters = _heuristic_parse_clue(clue)
    except Exception as e:
        log.info("Claude clue parsing unavailable (%s); using heuristic clue parser", e)
        filters = _heuristic_parse_clue(clue)

    state["filters"] = filters

    # ── Step 2: run tool loop (search → cluster → question) ──────────────────
    tool_handler = _make_tool_handler(session_id)

    initial_message = (
        f'User clue: "{clue}"\n'
        f"Extracted filters: {json.dumps(filters)}\n\n"
        f"Answer to previous question (if any): {answer or 'N/A'}\n\n"
        "Now call search_library with these filters, then cluster_episodes, "
        "then ask_next_question (if turns < 3), then return your final JSON response."
    )

    messages = [{"role": "user", "content": initial_message}]

    try:
        result = run_tool_loop(
            system=SYSTEM_PROMPT,
            messages=messages,
            tools=TOOLS,
            tool_handler=tool_handler,
        )
    except Exception as e:
        log.info("Agent Claude loop unavailable (%s); executing local tool chain", e)
        search_res = _tool_search_library(state, filters)
        candidates = state.get("last_candidates", [])
        cluster_res = _tool_cluster_episodes(state, {
            "photo_ids": [c.id for c in candidates],
            "user_clue": clue,
        })
        clusters_found = cluster_res.get("clusters", [])
        q_res = _tool_ask_next_question(state, {
            "clusters": clusters_found,
            "turns_used": state["turn_count"],
            "asked_questions": state.get("asked_questions", []),
        })
        result = {
            "clusters": clusters_found,
            "question": q_res.get("question"),
            "skip_to_all": True,
            "confidence": "high" if len(candidates) > 0 else "medium",
        }

    # ── Step 3: yield clusters progressively ─────────────────────────────────
    clusters  = result.get("clusters", state["clusters"])
    question  = result.get("question") or state.get("_last_question")
    skip_flag = result.get("skip_to_all", True)
    confidence = result.get("confidence", "medium")

    # Enforce max 5 clusters
    clusters = clusters[:MAX_CLUSTERS]

    # Enrich clusters with photo metadata
    enriched_clusters = []
    for cluster in clusters:
        photo_ids = cluster.get("photo_ids", [])
        photos    = [
            p.to_dict() for pid in photo_ids[:20]
            if (p := metadata_db.get_photo(pid)) is not None
        ]
        enriched = {**cluster, "photos": photos}
        enriched_clusters.append(enriched)
        yield {"type": "cluster", "cluster": enriched}

    state["clusters"] = enriched_clusters

    # ── Step 4: yield question ────────────────────────────────────────────────
    if question and state["turn_count"] < MAX_QUESTIONS:
        if isinstance(question, dict) and question.get("question_text"):
            yield {"type": "question", "question": question, "skip_to_all": skip_flag}
            state["_last_question"] = question

    # ── Step 5: log turn ─────────────────────────────────────────────────────
    state["turn_count"] += 1
    elapsed_ms = int((time.time() - t0) * 1000)
    cluster_names = [c["name"] for c in enriched_clusters]

    try:
        session_db.log_turn(
            session_id=session_id,
            turn_index=state["turn_count"],
            raw_clue=clue,
            parsed_filters=state["filters"],
            clusters_shown=cluster_names,
            question_asked=question.get("question_text") if question else None,
            answer_given=answer,
            time_elapsed_ms=elapsed_ms,
        )
    except Exception as e:
        log.warning("Session log write failed (non-fatal): %s", e)

    yield {
        "type":        "done",
        "elapsed_ms":  elapsed_ms,
        "confidence":  confidence,
        "skip_to_all": skip_flag,
        "session_id":  session_id,
    }


async def apply_feedback(
    session_id: str,
    signal: str,
    excluded_ids: list[str],
    free_text: str = "",
    answer: str = "",
) -> dict:
    """
    Apply user feedback ("not_this", "earlier", "later", "more_like_this")
    and re-run the search+cluster loop with updated filters.

    Returns a full AgentResponse dict (not a stream).
    """
    state = _get_session(session_id)

    # Update excluded IDs
    state["excluded_ids"].extend(excluded_ids)
    state["excluded_ids"] = list(set(state["excluded_ids"]))

    # Use exclude_similar tool to get refined filters
    tool_handler = _make_tool_handler(session_id)
    updated = _tool_exclude_similar(state, {
        "excluded_ids": excluded_ids,
        "signal":       signal,
        "free_text":    free_text,
    })
    refined_filters = updated.get("updated_filters", state["filters"])
    state["filters"] = refined_filters

    # Re-run search with refined filters
    search_result = _tool_search_library(state, refined_filters)
    candidates = state["last_candidates"]

    if not candidates:
        return {
            "clusters":    [],
            "question":    None,
            "skip_to_all": True,
            "exhausted":   True,
            "message":     "No more photos match — try a fresh search or skip to all results.",
            "session_id":  session_id,
        }

    # Re-cluster
    cluster_result = _tool_cluster_episodes(state, {
        "photo_ids": [c.id for c in candidates[:50]],
        "user_clue": state.get("clue", ""),
    })
    clusters = cluster_result.get("clusters", [])

    # Ask next question if under cap
    question = None
    if state["turn_count"] < MAX_QUESTIONS:
        q_result = _tool_ask_next_question(state, {
            "clusters":        clusters,
            "turns_used":      state["turn_count"],
            "asked_questions": state["asked_questions"],
        })
        question = q_result.get("question")

    # Enrich clusters
    enriched = []
    for cluster in clusters[:MAX_CLUSTERS]:
        photo_ids = cluster.get("photo_ids", [])
        photos    = [
            p.to_dict() for pid in photo_ids[:20]
            if (p := metadata_db.get_photo(pid)) is not None
        ]
        enriched.append({**cluster, "photos": photos})

    state["clusters"] = enriched
    state["turn_count"] += 1

    # Log turn
    try:
        session_db.log_turn(
            session_id=session_id,
            turn_index=state["turn_count"],
            raw_clue=state.get("clue", ""),
            parsed_filters=refined_filters,
            clusters_shown=[c["name"] for c in enriched],
            question_asked=question.get("question_text") if question else None,
            answer_given=answer,
            feedback_signal=signal,
            excluded_ids=excluded_ids,
        )
    except Exception as e:
        log.warning("Session log write failed (non-fatal): %s", e)

    return {
        "clusters":    enriched,
        "question":    question,
        "skip_to_all": True,
        "session_id":  session_id,
    }


async def resolve_anchor(
    session_id: str,
    photo_id: str,
    relation: str,
) -> dict:
    """Set a timeline anchor and return the resolved time window."""
    state = _get_session(session_id)
    result = _tool_set_anchor(state, {
        "anchor_photo_id": photo_id,
        "relation":        relation,
    })
    return result


def baseline_search(clue: str, session_id: str, exclude_ids: list = None) -> dict:
    """
    Baseline mode: plain FTS5 keyword search, no LLM.
    Returns a flat list of photos.
    """
    photos = metadata_db.fts_search(clue, limit=50, exclude_ids=exclude_ids or [])
    return {
        "mode":       "baseline",
        "photos":     [p.to_dict() for p in photos],
        "count":      len(photos),
        "session_id": session_id,
    }
