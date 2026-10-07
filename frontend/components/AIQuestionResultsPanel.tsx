"use client";

import React from "react";
import { Cluster, Question, Photo, FeedbackSignal } from "@/lib/types";
import { SparklesIcon, CheckIcon, AnchorIcon, ClockIcon } from "./Icons";
import { getPhotoImageUrl, getPhotoFallbackSvg } from "@/lib/api";

interface AIQuestionResultsPanelProps {
  query: string;
  question: Question | null;
  clusters: Cluster[];
  allPhotos: Photo[];
  turnsUsed: number;
  maxTurns?: number;
  isLoading: boolean;
  confidence?: string;
  elapsedMs?: number;
  onSelectAnswer: (answer: string) => void;
  onFeedback: (signal: FeedbackSignal, excludedIds: string[], answer?: string) => void;
  onPhotoClick: (photo: Photo) => void;
  onConfirmPhoto: (photo: Photo) => void;
  onAnchorPhoto: (photo: Photo) => void;
  onClose: () => void;
}

export function AIQuestionResultsPanel({
  query,
  question,
  clusters,
  allPhotos,
  turnsUsed,
  maxTurns = 3,
  isLoading,
  confidence,
  elapsedMs,
  onSelectAnswer,
  onFeedback,
  onPhotoClick,
  onConfirmPhoto,
  onAnchorPhoto,
  onClose,
}: AIQuestionResultsPanelProps) {
  const displayQuestion = question?.question_text || "Which context best describes this moment?";
  const displayChips = question?.answer_chips && question.answer_chips.length > 0
    ? question.answer_chips
    : ["☀️ Daytime / Outdoors", "☕ Coffee shop / Indoors", "🧾 With paper receipt / document", "👥 With family & friends"];

  return (
    <section className="ai-question-results-panel" aria-label="Ask Photos AI Assistant">
      {/* Header with Query & Status */}
      <div className="ai-panel-header">
        <div className="ai-badge-group">
          <div className="sparkle-circle">
            <SparklesIcon size={16} />
          </div>
          <div className="ai-header-titles">
            <h3 className="ai-header-title">Ask Photos AI</h3>
            <span className="ai-query-sub">Exploring memories for &quot;{query}&quot;</span>
          </div>
        </div>

        <div className="ai-header-meta">
          {elapsedMs !== undefined && elapsedMs > 0 && (
            <span className="meta-pill">
              <ClockIcon size={12} />
              {elapsedMs}ms
            </span>
          )}
          {confidence && (
            <span className={`meta-pill conf-${confidence}`}>
              {confidence} match
            </span>
          )}
          <button
            type="button"
            className="panel-close-btn"
            onClick={onClose}
            aria-label="Close AI results"
          >
            ✕
          </button>
        </div>
      </div>

      {/* STEP 1: AI Asks Clarifying Question */}
      {turnsUsed <= maxTurns && (
        <div className="ai-question-box">
          <div className="ai-prompt-row">
            <span className="ai-bot-label">✨ Clarifying Question (Turn {turnsUsed}/{maxTurns}):</span>
            <p className="ai-question-text">{displayQuestion}</p>
          </div>

          <div className="ai-chips-grid">
            {displayChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                className="ai-answer-chip"
                onClick={() => onSelectAnswer(chip)}
                disabled={isLoading}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="ai-thinking-row">
          <div className="ai-spinner" />
          <span>Ask Photos AI is searching visual embeddings and chronological episodes…</span>
        </div>
      )}

      {/* STEP 2: Results Display (Episode Clusters / Candidates) */}
      {clusters.length > 0 && (
        <div className="ai-results-body">
          <div className="results-subheading-row">
            <span className="results-found-label">
              Found {clusters.length} Matching Episode{clusters.length > 1 ? "s" : ""} ({allPhotos.length} photos)
            </span>
          </div>

          <div className="clusters-grid">
            {clusters.map((cluster, cIdx) => (
              <div key={`cluster-${cIdx}`} className="cluster-result-card">
                <div className="cluster-info-bar">
                  <h4 className="cluster-title">{cluster.name}</h4>
                  <p className="cluster-reason">{cluster.match_reason}</p>
                </div>

                <div className="cluster-photos-row">
                  {(cluster.photos || []).slice(0, 6).map((photo) => {
                    const imgSrc = getPhotoImageUrl(photo);
                    const fallback = getPhotoFallbackSvg(photo);

                    return (
                      <div
                        key={photo.id}
                        className="photo-match-tile"
                        onClick={() => onPhotoClick(photo)}
                      >
                        <img
                          src={imgSrc || fallback}
                          alt={photo.caption || photo.filename}
                          className="match-img"
                          onError={(e) => {
                            if (fallback) (e.target as HTMLImageElement).src = fallback;
                          }}
                        />

                        {/* Quick Confirm / Anchor Overlay */}
                        <div className="tile-hover-actions">
                          <button
                            type="button"
                            className="hover-action-btn confirm"
                            title="That's it! (Confirm found)"
                            onClick={(e) => {
                              e.stopPropagation();
                              onConfirmPhoto(photo);
                            }}
                          >
                            <CheckIcon size={12} />
                            <span>Found</span>
                          </button>
                          <button
                            type="button"
                            className="hover-action-btn anchor"
                            title="Timeline Anchor"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAnchorPhoto(photo);
                            }}
                          >
                            <AnchorIcon size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Feedback Reactions */}
                <div className="cluster-feedback-actions">
                  <button
                    type="button"
                    className="feedback-btn"
                    onClick={() => onFeedback("not_this", cluster.photo_ids || [])}
                  >
                    ✕ Not this episode
                  </button>
                  <button
                    type="button"
                    className="feedback-btn highlight"
                    onClick={() => onFeedback("more_like_this", [], cluster.name)}
                  >
                    ✦ More like this
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .ai-question-results-panel {
          background: #ffffff;
          border: 1px solid #c2e7ff;
          border-radius: 20px;
          padding: 16px 20px;
          margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 0 0 1px #d3e3fd;
          display: flex;
          flex-direction: column;
          gap: 16px;
          animation: slideUp 0.18s ease-out;
        }

        .ai-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e0e2ec;
          padding-bottom: 12px;
        }

        .ai-badge-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sparkle-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ea4335 0%, #a855f7 50%, #4285f4 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
        }

        .ai-header-titles {
          display: flex;
          flex-direction: column;
        }

        .ai-header-title {
          font-size: 15px;
          font-weight: 700;
          color: #1f1f1f;
        }

        .ai-query-sub {
          font-size: 12px;
          color: #444746;
        }

        .ai-header-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .meta-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 12px;
          background: #f0f4f9;
          color: #444746;
        }

        .meta-pill.conf-high {
          background: #e6f4ea;
          color: #137333;
        }
        .meta-pill.conf-medium {
          background: #fef7e0;
          color: #b06000;
        }
        .meta-pill.conf-low {
          background: #fce8e6;
          color: #c5221f;
        }

        .panel-close-btn {
          background: #f0f4f9;
          border: none;
          color: #444746;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease;
        }

        .panel-close-btn:hover {
          color: #1f1f1f;
          background: #e0e2ec;
        }

        /* Question Box */
        .ai-question-box {
          background: #f3e8fd;
          border: 1px solid #d8b4fe;
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .ai-prompt-row {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .ai-bot-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #7e22ce;
        }

        .ai-question-text {
          font-size: 14px;
          font-weight: 600;
          color: #1f1f1f;
        }

        .ai-chips-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .ai-answer-chip {
          background: #ffffff;
          border: 1px solid #c084fc;
          color: #6b21a8;
          padding: 6px 14px;
          border-radius: 18px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .ai-answer-chip:hover {
          background: #7e22ce;
          color: #ffffff;
          border-color: #7e22ce;
        }

        .ai-thinking-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #7e22ce;
          font-weight: 500;
        }

        .ai-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid #d8b4fe;
          border-top-color: #7e22ce;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        /* Results Body */
        .ai-results-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .results-subheading-row {
          font-size: 13px;
          font-weight: 600;
          color: #444746;
        }

        .clusters-grid {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .cluster-result-card {
          background: #f8fafd;
          border: 1px solid #e0e2ec;
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .cluster-title {
          font-size: 14px;
          font-weight: 700;
          color: #1f1f1f;
        }

        .cluster-reason {
          font-size: 12px;
          color: #444746;
        }

        .cluster-photos-row {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 8px;
        }

        .photo-match-tile {
          position: relative;
          aspect-ratio: 1 / 1;
          border-radius: 10px;
          overflow: hidden;
          background: #e0e2ec;
          cursor: pointer;
        }

        .match-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.25s ease;
        }

        .photo-match-tile:hover .match-img {
          transform: scale(1.06);
        }

        .tile-hover-actions {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          opacity: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: opacity 0.15s ease;
        }

        .photo-match-tile:hover .tile-hover-actions {
          opacity: 1;
        }

        .hover-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: none;
          padding: 5px 10px;
          border-radius: 16px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          color: #ffffff;
        }

        .hover-action-btn.confirm {
          background: #188038;
        }

        .hover-action-btn.anchor {
          background: #1a73e8;
        }

        .cluster-feedback-actions {
          display: flex;
          gap: 8px;
        }

        .feedback-btn {
          background: #ffffff;
          border: 1px solid #d3e3fd;
          color: #444746;
          font-size: 11px;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .feedback-btn:hover {
          background: #f0f4f9;
          color: #1f1f1f;
        }

        .feedback-btn.highlight {
          border-color: #a8c7fa;
          color: #0b57d0;
          background: #e8f0fe;
        }
      `}</style>
    </section>
  );
}
