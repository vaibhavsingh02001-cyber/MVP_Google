"use client";

import React, { useState, useEffect, useRef } from "react";
import { SearchIcon, SparklesIcon, CloseIcon } from "./Icons";
import { Mode } from "@/lib/types";

interface SearchBarProps {
  onSearch: (clue: string) => void;
  isLoading: boolean;
  mode: Mode;
  onModeChange?: (mode: Mode) => void;
  onOpenAgent?: () => void;
  value?: string;
  disabled?: boolean;
}

const SAMPLE_AI_PROMPTS = [
  "Find the coffee shop receipt in Kyoto",
  "Mom cutting cake under fairy lights",
  "Rental car flat tire in Iceland",
  "White dog catching red frisbee at sunset",
  "Semester grades and course marks table",
  "Selfie with sunglasses in Goa",
];

export function SearchBar({
  onSearch,
  isLoading,
  mode,
  onModeChange,
  onOpenAgent,
  value,
  disabled = false,
}: SearchBarProps) {
  const [query, setQuery] = useState(value || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== undefined) {
      setQuery(value);
    }
  }, [value]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading || disabled) return;
    setShowSuggestions(false);
    onSearch(query.trim());
  };

  const handleSelectSample = (clue: string) => {
    setQuery(clue);
    setShowSuggestions(false);
    onSearch(clue);
  };

  const toggleAIMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onModeChange) {
      onModeChange(mode === "recall" ? "baseline" : "recall");
    }
  };

  return (
    <div className="search-bar-outer" ref={containerRef}>
      <div className="search-bar-row">
        <form onSubmit={handleSubmit} className={`google-search-pill ${mode === "recall" ? "ai-active" : ""}`}>
          {/* Search Icon */}
          <div className="search-lead-icon">
            <SearchIcon size={20} className="search-icon-svg" />
          </div>

          {/* Input */}
          <input
            id="google-photos-search-input"
            type="text"
            className="search-text-input"
            placeholder={
              mode === "recall"
                ? "Ask Photos... (e.g. 'coffee shop in Kyoto')"
                : "Search your photos and albums"
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (mode === "recall" && !showSuggestions) setShowSuggestions(true);
            }}
            onFocus={() => {
              if (mode === "recall") setShowSuggestions(true);
            }}
            disabled={isLoading || disabled}
          />

          {/* Clear Button */}
          {query && !isLoading && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <CloseIcon size={16} />
            </button>
          )}
        </form>

        {/* Small Icon Beside Search Bar: Try Recall AI */}
        <button
          type="button"
          id="btn-try-recall-ai"
          className={`try-recall-ai-btn ${mode === "recall" ? "active" : ""}`}
          onClick={(e) => {
            toggleAIMode(e);
            if (onOpenAgent) {
              onOpenAgent();
            }
            setShowSuggestions(true);
            const input = document.getElementById("google-photos-search-input");
            input?.focus();
          }}
          title={
            mode === "recall"
              ? "Recall AI is active — Click to switch to keyword search"
              : "Try Recall AI (Conversational memory retrieval)"
          }
        >
          <SparklesIcon size={15} className="recall-sparkle" />
          <span className="recall-btn-text">Try Recall AI</span>
        </button>
      </div>

      {/* Suggested memory queries dropdown */}
      {showSuggestions && mode === "recall" && (
        <div className="ai-dropdown-suggestions">
          <div className="dropdown-title">
            <SparklesIcon size={13} className="sparkle-tint" />
            <span>Try searching memory clues with Ask Photos AI</span>
          </div>
          <div className="dropdown-chips-list">
            {SAMPLE_AI_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                className="dropdown-chip"
                onClick={() => handleSelectSample(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .search-bar-outer {
          position: relative;
          width: 100%;
          max-width: 780px;
        }

        .search-bar-row {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
        }

        .google-search-pill {
          flex: 1;
          display: flex;
          align-items: center;
          height: 48px;
          background: #edf2fa;
          border-radius: 28px;
          padding: 0 16px;
          transition: all 0.15s ease;
          border: 1px solid transparent;
        }

        .google-search-pill:hover {
          background: #e9eef6;
        }

        .google-search-pill:focus-within {
          background: #ffffff;
          border-color: #c2e7ff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .google-search-pill.ai-active:focus-within {
          border-color: #a8c7fa;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(11, 87, 208, 0.15);
        }

        .search-lead-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #444746;
          margin-right: 14px;
          flex-shrink: 0;
        }

        .search-text-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #1f1f1f;
          font-size: 15px;
          font-weight: 400;
          font-family: inherit;
        }

        .search-text-input::placeholder {
          color: #444746;
          font-weight: 400;
        }

        .search-clear-btn {
          background: none;
          border: none;
          color: #444746;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          margin-right: 4px;
          transition: background 0.15s ease;
        }

        .search-clear-btn:hover {
          background: rgba(0, 0, 0, 0.08);
          color: #1f1f1f;
        }

        /* Try Recall AI button beside search bar */
        .try-recall-ai-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 38px;
          padding: 0 14px;
          border-radius: 19px;
          background: #ffffff;
          border: 1px solid #d3e3fd;
          color: #0b57d0;
          font-family: var(--font-family);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          user-select: none;
          flex-shrink: 0;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          white-space: nowrap;
        }

        .try-recall-ai-btn:hover {
          background: #f0f4f9;
          border-color: #a8c7fa;
          box-shadow: 0 2px 5px rgba(11, 87, 208, 0.12);
        }

        .try-recall-ai-btn.active {
          background: linear-gradient(135deg, #e8f0fe 0%, #f3e8fd 100%);
          border-color: #c2e7ff;
          color: #041e49;
          font-weight: 600;
          box-shadow: 0 2px 6px rgba(11, 87, 208, 0.18);
        }

        :global(.recall-sparkle) {
          color: #0b57d0;
          transition: transform 0.2s ease;
        }

        .try-recall-ai-btn:hover :global(.recall-sparkle) {
          transform: rotate(12deg) scale(1.1);
        }

        .recall-btn-text {
          letter-spacing: -0.01em;
        }

        /* Suggestions Dropdown */
        .ai-dropdown-suggestions {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: #ffffff;
          border: 1px solid #e0e2ec;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          border-radius: 16px;
          padding: 14px 16px;
          z-index: 150;
          display: flex;
          flex-direction: column;
          gap: 10px;
          animation: slideUp 0.15s ease-out;
        }

        .dropdown-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: #444746;
        }

        :global(.sparkle-tint) {
          color: #c2185b;
        }

        .dropdown-chips-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .dropdown-chip {
          background: #f0f4f9;
          border: 1px solid #d3e3fd;
          color: #1f1f1f;
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }

        .dropdown-chip:hover {
          background: #e8f0fe;
          border-color: #a8c7fa;
          color: #1a73e8;
        }
      `}</style>
    </div>
  );
}
