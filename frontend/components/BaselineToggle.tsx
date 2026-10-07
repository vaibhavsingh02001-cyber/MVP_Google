"use client";

import React from "react";
import { SparklesIcon, SearchIcon } from "./Icons";
import { Mode } from "@/lib/types";

interface BaselineToggleProps {
  mode: Mode;
  onChange: (newMode: Mode) => void;
  disabled?: boolean;
}

export function BaselineToggle({ mode, onChange, disabled = false }: BaselineToggleProps) {
  return (
    <div className="toggle-container">
      <div className="toggle-pill">
        <button
          type="button"
          className={`toggle-option ${mode === "recall" ? "active recall" : ""}`}
          onClick={() => onChange("recall")}
          disabled={disabled}
        >
          <SparklesIcon size={16} />
          <span>Recall Agent</span>
          <span className="badge-ai">AI-Native</span>
        </button>

        <button
          type="button"
          className={`toggle-option ${mode === "baseline" ? "active baseline" : ""}`}
          onClick={() => onChange("baseline")}
          disabled={disabled}
        >
          <SearchIcon size={16} />
          <span>Baseline Search</span>
          <span className="badge-mode">FTS5</span>
        </button>
      </div>

      <style jsx>{`
        .toggle-container {
          display: inline-flex;
          align-items: center;
        }

        .toggle-pill {
          display: flex;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-full);
          padding: 4px;
          backdrop-filter: blur(16px);
          gap: 4px;
        }

        .toggle-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: all var(--transition-normal);
        }

        .toggle-option:hover:not(:disabled) {
          color: var(--text-main);
        }

        .toggle-option.active.recall {
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(14, 165, 233, 0.15) 100%);
          border: 1px solid rgba(56, 189, 248, 0.35);
          color: #38bdf8;
          box-shadow: 0 2px 10px rgba(56, 189, 248, 0.2);
        }

        .toggle-option.active.baseline {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        .toggle-option:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .badge-ai {
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 6px;
          background: rgba(56, 189, 248, 0.2);
          color: #7dd3fc;
          letter-spacing: 0.05em;
        }

        .badge-mode {
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
