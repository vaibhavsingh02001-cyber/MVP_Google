"""
backend/evaluate_metrics.py
=============================
Computes the 8 core evaluation metrics from recorded session logs.
Supports reading directly from SQLite (session_db) or an exported CSV/JSON file.

Metrics Computed (per Phase 6.2):
  1. Vague-search success rate: outcome="found" / total sessions
  2. Turns to find: AVG(MAX(turn_index)) per confirmed session
  3. Time to find: AVG(ended_at - started_at) per confirmed session (seconds)
  4. First-hit rate: turn_index=1 AND outcome="found"
  5. Question answer rate: answer_given IS NOT NULL / question_asked IS NOT NULL
  6. Confirm rate: outcome="found" / total sessions
  7. Abandon rate: outcome="abandoned" / total sessions
  8. Turn Latency: AVG(time_elapsed_ms) per turn

Usage:
    python evaluate_metrics.py
    python evaluate_metrics.py --file path/to/sessions.csv
    python evaluate_metrics.py --file path/to/sessions.json
"""

import argparse
import csv
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).parent))


def parse_date(date_str: str):
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(date_str[:19], fmt[:19])
        except ValueError:
            pass
    return None


def compute_metrics_from_records(records: list[dict]) -> dict:
    """Group turns by session_id and calculate all metrics for recall and baseline."""
    sessions: dict[str, dict] = {}

    for row in records:
        sid = row.get("session_id")
        if not sid:
            continue

        if sid not in sessions:
            sessions[sid] = {
                "session_id": sid,
                "mode": row.get("mode", "recall"),
                "outcome": row.get("outcome"),
                "started_at": parse_date(row.get("started_at")),
                "ended_at": parse_date(row.get("ended_at")),
                "turns": [],
            }

        # Keep latest outcome and ended_at
        if row.get("outcome"):
            sessions[sid]["outcome"] = row.get("outcome")
        if row.get("ended_at") and not sessions[sid]["ended_at"]:
            sessions[sid]["ended_at"] = parse_date(row.get("ended_at"))

        sessions[sid]["turns"].append(row)

    # Compute metrics grouped by mode
    results = {}
    for target_mode in ("recall", "baseline"):
        mode_sessions = [s for s in sessions.values() if s["mode"] == target_mode]
        total_sessions = len(mode_sessions)

        if total_sessions == 0:
            results[target_mode] = {
                "total_sessions": 0,
                "success_rate": 0.0,
                "avg_turns_to_find": 0.0,
                "avg_time_to_find_sec": 0.0,
                "first_hit_rate": 0.0,
                "question_answer_rate": 0.0,
                "confirm_rate": 0.0,
                "abandon_rate": 0.0,
                "avg_turn_latency_ms": 0.0,
            }
            continue

        confirmed_sessions = [s for s in mode_sessions if s["outcome"] == "found"]
        abandoned_sessions = [s for s in mode_sessions if s["outcome"] == "abandoned"]

        # 1. Success Rate & Confirm Rate
        confirm_rate = len(confirmed_sessions) / total_sessions
        abandon_rate = len(abandoned_sessions) / total_sessions

        # 2. Turns to find
        turns_counts = []
        first_hits = 0
        durations = []

        for s in confirmed_sessions:
            max_turn = max([int(t.get("turn_index") or 1) for t in s["turns"]] or [1])
            turns_counts.append(max_turn)
            if max_turn == 1:
                first_hits += 1

            if s["started_at"] and s["ended_at"]:
                diff = (s["ended_at"] - s["started_at"]).total_seconds()
                if diff > 0:
                    durations.append(diff)

        avg_turns = sum(turns_counts) / len(turns_counts) if turns_counts else 0.0
        avg_time = sum(durations) / len(durations) if durations else 0.0
        first_hit_rate = first_hits / len(confirmed_sessions) if confirmed_sessions else 0.0

        # 3. Question answer rate
        total_questions = 0
        answered_questions = 0
        all_latencies = []

        for s in mode_sessions:
            for t in s["turns"]:
                if t.get("question_asked"):
                    total_questions += 1
                    if t.get("answer_given"):
                        answered_questions += 1

                lat = t.get("time_elapsed_ms")
                if lat is not None and str(lat).isdigit():
                    all_latencies.append(int(lat))

        q_answer_rate = (answered_questions / total_questions) if total_questions > 0 else 0.0
        avg_latency = (sum(all_latencies) / len(all_latencies)) if all_latencies else 0.0

        results[target_mode] = {
            "total_sessions": total_sessions,
            "confirmed_sessions": len(confirmed_sessions),
            "success_rate": confirm_rate * 100,
            "avg_turns_to_find": round(avg_turns, 2),
            "avg_time_to_find_sec": round(avg_time, 1),
            "first_hit_rate": round(first_hit_rate * 100, 1),
            "question_answer_rate": round(q_answer_rate * 100, 1),
            "confirm_rate": round(confirm_rate * 100, 1),
            "abandon_rate": round(abandon_rate * 100, 1),
            "avg_turn_latency_ms": round(avg_latency, 1),
        }

    return results


def print_evaluation_report(results: dict):
    """Print an executive markdown comparison table."""
    rec = results.get("recall", {})
    base = results.get("baseline", {})

    print("\n" + "=" * 76)
    print("           RECALL MVP — EVALUATION METRICS REPORT (Phase 6)")
    print("=" * 76 + "\n")

    header = f"{'Evaluation Metric':<32} | {'Recall Agent':<18} | {'Baseline Search':<18}"
    sep = "-" * 32 + "-+-" + "-" * 18 + "-+-" + "-" * 18
    print(header)
    print(sep)

    metrics = [
        ("Total Sessions", f"{rec.get('total_sessions', 0)}", f"{base.get('total_sessions', 0)}"),
        ("Confirmed Found", f"{rec.get('confirmed_sessions', 0)}", f"{base.get('confirmed_sessions', 0)}"),
        ("Vague Search Success Rate", f"{rec.get('success_rate', 0):.1f}%", f"{base.get('success_rate', 0):.1f}%"),
        ("Avg Turns to Find (Goal: <=3)", f"{rec.get('avg_turns_to_find', 0):.2f}", f"{base.get('avg_turns_to_find', 0):.2f}"),
        ("Avg Time to Find", f"{rec.get('avg_time_to_find_sec', 0):.1f}s", f"{base.get('avg_time_to_find_sec', 0):.1f}s"),
        ("First-Hit Rate", f"{rec.get('first_hit_rate', 0):.1f}%", f"{base.get('first_hit_rate', 0):.1f}%"),
        ("Question Answer Rate", f"{rec.get('question_answer_rate', 0):.1f}%", "N/A (No Agent)"),
        ("Abandon Rate", f"{rec.get('abandon_rate', 0):.1f}%", f"{base.get('abandon_rate', 0):.1f}%"),
        ("Avg Turn Latency", f"{rec.get('avg_turn_latency_ms', 0):.0f} ms", f"{base.get('avg_turn_latency_ms', 0):.0f} ms"),
    ]

    for label, r_val, b_val in metrics:
        print(f"{label:<32} | {r_val:<18} | {b_val:<18}")

    print(sep + "\n")


def main():
    parser = argparse.ArgumentParser(description="Compute Recall evaluation metrics.")
    parser.add_argument("--file", type=str, help="Path to exported sessions.csv or sessions.json")
    args = parser.parse_args()

    records = []

    if args.file:
        file_path = Path(args.file)
        if not file_path.exists():
            print(f"Error: File not found: {file_path}")
            sys.exit(1)

        if file_path.suffix.lower() == ".csv":
            with open(file_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                records = list(reader)
        else:
            with open(file_path, "r", encoding="utf-8") as f:
                records = json.load(f)
    else:
        # Load directly from storage/session_db
        try:
            from storage import session_db
            records = session_db.get_all_turns()
        except Exception as e:
            print(f"Notice: Could not load from live DB ({e}). Generating sample baseline simulation.")
            records = []

    results = compute_metrics_from_records(records)
    print_evaluation_report(results)


if __name__ == "__main__":
    main()
