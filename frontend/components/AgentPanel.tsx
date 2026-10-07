"use client";

import React from "react";
import { Cluster, Question, Photo, FeedbackSignal } from "@/lib/types";
import { ClusterCard } from "./ClusterCard";
import { AnswerChips } from "./AnswerChips";
import { SparklesIcon, LayersIcon, ClockIcon } from "./Icons";

interface AgentPanelProps {
  clusters: Cluster[];
  question: Question | null;
  turnCount: number;
  maxTurns?: number;
  isStreaming: boolean;
  confidence?: string;
  elapsedMs?: number;
  onPhotoClick: (photo: Photo) => void;
  onConfirmPhoto: (photo: Photo) => void;
  onAnchorPhoto: (photo: Photo) => void;
  onFeedback: (signal: FeedbackSignal, excludedIds: string[]) => void;
  onSelectAnswer: (answer: string) => void;
  onSkipToAll: () => void;
  disabled?: boolean;
}

export function AgentPanel({
  clusters,
  question,
  turnCount,
  maxTurns = 3,
  isStreaming,
  confidence,
  elapsedMs,
  onPhotoClick,
  onConfirmPhoto,
  onAnchorPhoto,
  onFeedback,
  onSelectAnswer,
  onSkipToAll,
  disabled = false,
}: AgentPanelProps) {
  const showQuestion = question && turnCount <= maxTurns;

  return (
    <div className="agent-panel-container">
      {/* Top status bar: confidence, turn count, skip link */}
      <div className="agent-status-bar">
        <div className="status-left">
          <div className="status-badge live">
            <span className="live-dot" />
            <span>AI Reasoning Flow</span>
          </div>

          {elapsedMs !== undefined && elapsedMs > 0 && (
            <div className="status-badge neutral">
              <ClockIcon size={12} />
              <span>{elapsedMs} ms</span>
            </div>
          )}

          {confidence && (
            <div className={`status-badge conf-${confidence}`}>
              <span>Confidence: {confidence}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="skip-to-all-btn"
          onClick={onSkipToAll}
          title="Bypass episode clustering and view all matching candidates in a flat grid"
        >
          <LayersIcon size={14} />
          <span>Skip to all results →</span>
        </button>
      </div>

      {/* Narrowing question prompt at top if available */}
      {showQuestion && (
        <div className="question-slot">
          <AnswerChips
            question={question}
            turnCount={turnCount}
            maxTurns={maxTurns}
            onSelectAnswer={onSelectAnswer}
            disabled={disabled || isStreaming}
          />
        </div>
      )}

      {/* Cluster cards stream */}
      <div className="clusters-list">
        {clusters.map((cluster, idx) => (
          <ClusterCard
            key={`${cluster.name}-${idx}`}
            cluster={cluster}
            index={idx}
            onPhotoClick={onPhotoClick}
            onConfirmPhoto={onConfirmPhoto}
            onAnchorPhoto={onAnchorPhoto}
            onFeedback={onFeedback}
            disabled={disabled || isStreaming}
          />
        ))}

        {isStreaming && (
          <div className="streaming-cluster-skeleton">
            <div className="skeleton-spinner">
              <SparklesIcon size={18} className="skeleton-sparkle" />
            </div>
            <div className="skeleton-text">
              <span className="skeleton-title">Agent is discovering more memory episodes…</span>
              <span className="skeleton-sub">Analyzing timeline clusters, objects, and geotags</span>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .agent-panel-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
        }

        .agent-status-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: var(--radius-sm);
          backdrop-filter: blur(12px);
          flex-wrap: wrap;
          gap: 10px;
        }

        .status-left {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 500;
          padding: 3px 8px;
          border-radius: var(--radius-full);
        }

        .status-badge.live {
          background: rgba(56, 189, 248, 0.15);
          color: #38bdf8;
          border: 1px solid rgba(56, 189, 248, 0.3);
        }

        .live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #38bdf8;
          box-shadow: 0 0 8px #38bdf8;
          animation: pulseGlow 1.5s infinite;
        }

        .status-badge.neutral {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
        }

        .status-badge.conf-high {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .status-badge.conf-medium {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .status-badge.conf-low {
          background: rgba(244, 63, 94, 0.15);
          color: #fb7185;
          border: 1px solid rgba(244, 63, 94, 0.3);
        }

        .skip-to-all-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: 1px dashed rgba(255, 255, 255, 0.18);
          color: #94a3b8;
          font-size: 12px;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .skip-to-all-btn:hover {
          color: var(--text-main);
          border-color: rgba(56, 189, 248, 0.5);
          background: rgba(56, 189, 248, 0.08);
        }

        .question-slot {
          width: 100%;
        }

        .clusters-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }

        .streaming-cluster-skeleton {
          display: flex;
          align-items: center;
          gap: 14px;
          background: rgba(15, 23, 42, 0.4);
          border: 1px dashed rgba(56, 189, 248, 0.25);
          border-radius: var(--radius-md);
          padding: 16px 20px;
        }

        .skeleton-spinner {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(56, 189, 248, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        :global(.skeleton-sparkle) {
          color: #38bdf8;
          animation: spin 3s linear infinite;
        }

        .skeleton-text {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .skeleton-title {
          font-size: 13px;
          font-weight: 500;
          color: #e2e8f0;
        }

        .skeleton-sub {
          font-size: 11px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
