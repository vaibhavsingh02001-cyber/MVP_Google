"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mode,
  Photo,
  Cluster,
  Question,
  FeedbackSignal,
} from "@/lib/types";
import {
  ChatBubbleIcon,
  SparklesIcon,
  CloseIcon,
  SearchIcon,
  CheckIcon,
  AnchorIcon,
  ClockIcon,
  RefreshCwIcon,
  LayersIcon,
} from "./Icons";
import { AnswerChips } from "./AnswerChips";
import { BaselineToggle } from "./BaselineToggle";
import { getPhotoImageUrl, getPhotoFallbackSvg } from "@/lib/api";

interface RecallAIBotWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSearch: (clue: string) => void;
  isLoading: boolean;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  lastClue: string;
  clusters: Cluster[];
  question: Question | null;
  turnsUsed: number;
  maxTurns?: number;
  confidence?: string;
  elapsedMs?: number;
  onSelectAnswer: (answer: string) => void;
  onFeedback: (signal: FeedbackSignal, idsToExclude: string[], answer?: string) => void;
  onPhotoClick: (photo: Photo) => void;
  onConfirmPhoto: (photo: Photo) => void;
  onAnchorPhoto: (photo: Photo) => void;
  onReset: () => void;
}

const SAMPLE_QUICK_CLUES = [
  "The coffee shop receipt in Kyoto",
  "Mom cutting cake under fairy lights",
  "Rental car flat tire in Iceland",
  "White dog catching red frisbee",
  "Sticky note with WiFi password",
];

export function RecallAIBotWidget({
  isOpen,
  onToggle,
  onClose,
  onSearch,
  isLoading,
  mode,
  onModeChange,
  lastClue,
  clusters,
  question,
  turnsUsed,
  maxTurns = 3,
  confidence,
  elapsedMs,
  onSelectAnswer,
  onFeedback,
  onPhotoClick,
  onConfirmPhoto,
  onAnchorPhoto,
  onReset,
}: RecallAIBotWidgetProps) {
  const [inputText, setInputText] = useState("");
  const [showBubbleTip, setShowBubbleTip] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input text with lastClue if changed
  useEffect(() => {
    if (lastClue && !inputText) {
      setInputText(lastClue);
    }
  }, [lastClue]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSearch(inputText.trim());
  };

  const handleQuickChip = (clue: string) => {
    setInputText(clue);
    onSearch(clue);
  };

  return (
    <div className="recall-bot-widget-root">
      {/* Proactive Speech Bubble (shown when bot is closed) */}
      {!isOpen && showBubbleTip && (
        <div className="proactive-speech-bubble" onClick={onToggle}>
          <div className="bubble-content">
            <span className="bubble-sparkle">✨</span>
            <div className="bubble-text-group">
              <p className="bubble-main">Still looking for photos?</p>
              <p className="bubble-sub">Try the Recall conversational search</p>
            </div>
            <button
              type="button"
              className="bubble-close"
              onClick={(e) => {
                e.stopPropagation();
                setShowBubbleTip(false);
              }}
              aria-label="Dismiss suggestion"
            >
              <CloseIcon size={12} />
            </button>
          </div>
          <div className="bubble-arrow" />
        </div>
      )}

      {/* Floating Circular AI Bot Button (Matching Image 2) */}
      <button
        type="button"
        id="recall-ai-bot-button"
        className={`floating-bot-btn ${isOpen ? "open" : ""}`}
        onClick={onToggle}
        aria-label="Toggle Recall AI Photo Search Assistant"
        title="Still looking for photos? Open Recall AI Assistant"
      >
        <div className="bot-pulse-ring" />
        <div className="bot-icon-wrapper">
          {isOpen ? (
            <CloseIcon size={22} className="bot-icon-close" />
          ) : (
            <ChatBubbleIcon size={24} className="bot-icon-chat" />
          )}
        </div>
      </button>

      {/* Conversational AI Assistant Drawer / Popup */}
      {isOpen && (
        <div className={`bot-chat-drawer ${isMinimized ? "minimized" : ""}`}>
          {/* Header */}
          <div className="drawer-header">
            <div className="header-left">
              <div className="bot-avatar-badge">
                <SparklesIcon size={16} />
              </div>
              <div className="bot-title-group">
                <h3 className="bot-name">Recall Assistant</h3>
                <span className="bot-status-text">
                  {isLoading
                    ? "Searching memory episodes…"
                    : clusters.length > 0
                    ? `${clusters.length} episodes found`
                    : "Ready to find your memory"}
                </span>
              </div>
            </div>

            <div className="header-actions">
              <button
                type="button"
                className="hdr-btn"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? "□" : "—"}
              </button>
              <button
                type="button"
                className="hdr-btn"
                onClick={onReset}
                title="Reset conversation"
              >
                <RefreshCwIcon size={14} />
              </button>
              <button
                type="button"
                className="hdr-btn close"
                onClick={onClose}
                title="Close assistant"
              >
                <CloseIcon size={16} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <div className="drawer-body">
              {/* Mode Switcher */}
              <div className="drawer-mode-bar">
                <BaselineToggle
                  mode={mode}
                  onChange={onModeChange}
                  disabled={isLoading}
                />
                {elapsedMs !== undefined && elapsedMs > 0 && (
                  <span className="elapsed-badge">
                    <ClockIcon size={11} />
                    {elapsedMs}ms
                  </span>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSubmit} className="bot-search-form">
                <div className="input-box">
                  <SparklesIcon size={16} className="input-sparkle" />
                  <input
                    ref={inputRef}
                    type="text"
                    className="bot-input"
                    placeholder="Describe what you recall... (e.g. 'coffee shop in Kyoto')"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={isLoading}
                  />
                  {inputText && !isLoading && (
                    <button
                      type="button"
                      className="input-clear-btn"
                      onClick={() => setInputText("")}
                    >
                      <CloseIcon size={14} />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="bot-send-btn"
                    disabled={!inputText.trim() || isLoading}
                    aria-label="Send query"
                  >
                    <SearchIcon size={16} />
                  </button>
                </div>
              </form>

              {/* Sample Clues Quick Carousel */}
              {clusters.length === 0 && !isLoading && (
                <div className="sample-chips-section">
                  <span className="chips-label">Try asking about:</span>
                  <div className="chips-list">
                    {SAMPLE_QUICK_CLUES.map((clue, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="quick-chip"
                        onClick={() => handleQuickChip(clue)}
                      >
                        {clue}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="bot-loading-box">
                  <div className="pulse-spinner" />
                  <p className="loading-text">
                    Recall AI is reasoning across your photo timeline…
                  </p>
                </div>
              )}

              {/* Narrowing Question from Agent */}
              {question && turnsUsed <= maxTurns && !isLoading && (
                <div className="bot-question-box">
                  <div className="q-badge">
                    <SparklesIcon size={13} />
                    <span>Clarifying Question (Turn {turnsUsed}/{maxTurns})</span>
                  </div>
                  <p className="q-text">{question.question_text}</p>
                  <div className="q-chips">
                    {question.answer_chips.map((chip, cIdx) => (
                      <button
                        key={cIdx}
                        type="button"
                        className="answer-btn"
                        onClick={() => onSelectAnswer(chip)}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Episode Clusters Display */}
              {clusters.length > 0 && !isLoading && (
                <div className="bot-clusters-area">
                  <div className="clusters-hdr">
                    <span className="episodes-count">
                      Episode Candidates ({clusters.length})
                    </span>
                    {confidence && (
                      <span className={`conf-tag conf-${confidence}`}>
                        {confidence} match
                      </span>
                    )}
                  </div>

                  <div className="clusters-scroll">
                    {clusters.map((cluster, cIdx) => (
                      <div key={`cluster-${cIdx}`} className="bot-cluster-item">
                        <div className="cluster-meta-top">
                          <h4 className="cluster-name">{cluster.name}</h4>
                          <span className="match-reason">{cluster.match_reason}</span>
                        </div>

                        {/* Cluster Photos Grid */}
                        <div className="cluster-mini-grid">
                          {(cluster.photos || []).slice(0, 4).map((p) => {
                            const imgSrc = getPhotoImageUrl(p);
                            const fallback = getPhotoFallbackSvg(p);
                            return (
                              <div
                                key={p.id}
                                className="mini-photo-card"
                                onClick={() => onPhotoClick(p)}
                              >
                                <img
                                  src={imgSrc || fallback}
                                  alt={p.caption || p.filename}
                                  className="mini-img"
                                  onError={(e) => {
                                    if (fallback) (e.target as HTMLImageElement).src = fallback;
                                  }}
                                />
                                <div className="mini-actions">
                                  <button
                                    type="button"
                                    className="mini-btn confirm"
                                    title="That's it! (Confirm photo found)"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onConfirmPhoto(p);
                                    }}
                                  >
                                    <CheckIcon size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    className="mini-btn anchor"
                                    title="Set timeline anchor"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAnchorPhoto(p);
                                    }}
                                  >
                                    <AnchorIcon size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Cluster feedback reaction */}
                        <div className="cluster-reactions">
                          <button
                            type="button"
                            className="react-btn"
                            onClick={() =>
                              onFeedback("not_this", cluster.photo_ids || [])
                            }
                          >
                            ✕ Not this episode
                          </button>
                          <button
                            type="button"
                            className="react-btn highlight"
                            onClick={() =>
                              onFeedback("more_like_this", [], cluster.name)
                            }
                          >
                            ✦ More like this
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .recall-bot-widget-root {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 12px;
          pointer-events: none;
        }

        @media (max-width: 1023px) {
          .recall-bot-widget-root {
            bottom: 84px; /* Above mobile bottom nav */
            right: 16px;
          }
        }

        /* Proactive Speech Bubble */
        .proactive-speech-bubble {
          pointer-events: auto;
          position: relative;
          background: rgba(22, 33, 56, 0.95);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(244, 63, 94, 0.4);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45), 0 0 20px rgba(244, 63, 94, 0.25);
          border-radius: 18px;
          padding: 10px 14px;
          cursor: pointer;
          max-width: 280px;
          animation: slideUp 0.3s ease-out, pulseGlow 3s infinite;
          transition: transform 0.2s ease;
        }

        .proactive-speech-bubble:hover {
          transform: translateY(-2px);
          border-color: rgba(244, 63, 94, 0.7);
        }

        .bubble-content {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .bubble-sparkle {
          font-size: 18px;
          flex-shrink: 0;
        }

        .bubble-text-group {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .bubble-main {
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
        }

        .bubble-sub {
          font-size: 11px;
          color: #fbcfe8;
        }

        .bubble-close {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 2px;
          margin-left: 4px;
          border-radius: 50%;
        }

        .bubble-close:hover {
          color: #ffffff;
        }

        .bubble-arrow {
          position: absolute;
          bottom: -7px;
          right: 28px;
          width: 14px;
          height: 14px;
          background: rgba(22, 33, 56, 0.95);
          border-right: 1px solid rgba(244, 63, 94, 0.4);
          border-bottom: 1px solid rgba(244, 63, 94, 0.4);
          transform: rotate(45deg);
        }

        /* Floating Bot Button */
        .floating-bot-btn {
          pointer-events: auto;
          width: 58px;
          height: 58px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #e11d48 0%, #ec4899 50%, #8b5cf6 100%);
          color: #ffffff;
          box-shadow: 0 10px 28px rgba(225, 29, 72, 0.4), 0 0 20px rgba(236, 72, 153, 0.3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;
        }

        .floating-bot-btn:hover {
          transform: scale(1.08) translateY(-2px);
          box-shadow: 0 14px 34px rgba(225, 29, 72, 0.55), 0 0 28px rgba(236, 72, 153, 0.45);
        }

        .floating-bot-btn.open {
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
        }

        .bot-pulse-ring {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid rgba(244, 63, 94, 0.4);
          animation: ripple 2.5s infinite;
        }

        .floating-bot-btn.open .bot-pulse-ring {
          display: none;
        }

        .bot-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Conversational AI Drawer / Modal */
        .bot-chat-drawer {
          pointer-events: auto;
          width: 380px;
          max-width: calc(100vw - 32px);
          max-height: 580px;
          background: rgba(13, 20, 36, 0.94);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(244, 63, 94, 0.35);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(244, 63, 94, 0.2);
          border-radius: 24px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .bot-chat-drawer.minimized {
          max-height: fit-content;
        }

        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          background: rgba(18, 27, 48, 0.85);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .bot-avatar-badge {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #e11d48 0%, #a855f7 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
        }

        .bot-title-group {
          display: flex;
          flex-direction: column;
        }

        .bot-name {
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
        }

        .bot-status-text {
          font-size: 11px;
          color: #cbd5e1;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .hdr-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          border: none;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 13px;
          transition: all var(--transition-fast);
        }

        .hdr-btn:hover {
          background: rgba(255, 255, 255, 0.18);
          color: #ffffff;
        }

        .hdr-btn.close:hover {
          background: rgba(244, 63, 94, 0.25);
          color: #fb7185;
        }

        .drawer-body {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 14px;
          overflow-y: auto;
          max-height: 500px;
        }

        .drawer-mode-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 4px;
        }

        .elapsed-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--text-muted);
        }

        .bot-search-form {
          width: 100%;
        }

        .input-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: var(--radius-full);
          padding: 6px 10px 6px 14px;
          transition: border-color 0.2s ease;
        }

        .input-box:focus-within {
          border-color: #f43f5e;
          box-shadow: 0 0 12px rgba(244, 63, 94, 0.25);
        }

        :global(.input-sparkle) {
          color: #f43f5e;
          flex-shrink: 0;
        }

        .bot-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #ffffff;
          font-size: 13px;
        }

        .bot-input::placeholder {
          color: var(--text-muted);
          font-size: 12px;
        }

        .input-clear-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 2px;
        }

        .bot-send-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #e11d48 0%, #ec4899 100%);
          border: none;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: opacity 0.2s ease, transform 0.15s ease;
        }

        .bot-send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .bot-send-btn:not(:disabled):hover {
          transform: scale(1.06);
        }

        .sample-chips-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .chips-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .chips-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .quick-chip {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #e2e8f0;
          font-size: 11px;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .quick-chip:hover {
          background: rgba(244, 63, 94, 0.2);
          border-color: rgba(244, 63, 94, 0.4);
          color: #ffffff;
        }

        .bot-loading-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 24px 12px;
          background: rgba(244, 63, 94, 0.05);
          border-radius: var(--radius-md);
          border: 1px dashed rgba(244, 63, 94, 0.3);
        }

        .pulse-spinner {
          width: 24px;
          height: 24px;
          border: 2.5px solid rgba(244, 63, 94, 0.2);
          border-top-color: #f43f5e;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .loading-text {
          font-size: 12px;
          color: #fbcfe8;
          text-align: center;
        }

        /* Narrowing Question */
        .bot-question-box {
          background: rgba(168, 85, 247, 0.12);
          border: 1px solid rgba(168, 85, 247, 0.3);
          border-radius: var(--radius-md);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .q-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          color: #d8b4fe;
        }

        .q-text {
          font-size: 13px;
          color: #ffffff;
          font-weight: 500;
          line-height: 1.35;
        }

        .q-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 2px;
        }

        .answer-btn {
          background: rgba(168, 85, 247, 0.2);
          border: 1px solid rgba(168, 85, 247, 0.4);
          color: #f3e8ff;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .answer-btn:hover {
          background: #a855f7;
          color: #ffffff;
        }

        /* Clusters Area */
        .bot-clusters-area {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .clusters-hdr {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .episodes-count {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .conf-tag {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 2px 7px;
          border-radius: var(--radius-full);
        }

        .conf-high {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .conf-medium {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .conf-low {
          background: rgba(244, 63, 94, 0.2);
          color: #fb7185;
          border: 1px solid rgba(244, 63, 94, 0.3);
        }

        .clusters-scroll {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .bot-cluster-item {
          background: rgba(22, 33, 56, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .cluster-meta-top {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .cluster-name {
          font-size: 13px;
          font-weight: 700;
          color: #f8fafc;
        }

        .match-reason {
          font-size: 11px;
          color: var(--text-muted);
        }

        .cluster-mini-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }

        .mini-photo-card {
          position: relative;
          aspect-ratio: 1 / 1;
          border-radius: 8px;
          overflow: hidden;
          background: #0f172a;
          cursor: pointer;
        }

        .mini-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s ease;
        }

        .mini-photo-card:hover .mini-img {
          transform: scale(1.1);
        }

        .mini-actions {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          opacity: 0;
          transition: opacity 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .mini-photo-card:hover .mini-actions {
          opacity: 1;
        }

        .mini-btn {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #ffffff;
        }

        .mini-btn.confirm {
          background: #10b981;
        }
        .mini-btn.anchor {
          background: #38bdf8;
        }

        .cluster-reactions {
          display: flex;
          gap: 6px;
          margin-top: 4px;
        }

        .react-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          font-size: 10px;
          padding: 3px 8px;
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .react-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }

        .react-btn.highlight {
          border-color: rgba(56, 189, 248, 0.3);
          color: #7dd3fc;
        }
      `}</style>
    </div>
  );
}
