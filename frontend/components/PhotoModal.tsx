"use client";

import React, { useEffect, useState } from "react";
import { Photo, FeedbackSignal } from "@/lib/types";
import { getPhotoImageUrl, getPhotoFallbackSvg } from "@/lib/api";
import {
  CloseIcon,
  CheckIcon,
  AnchorIcon,
  ClockIcon,
  MapPinIcon,
  TagIcon,
  LayersIcon,
  SparklesIcon,
} from "./Icons";

interface PhotoModalProps {
  photo: Photo;
  onClose: () => void;
  onConfirm: (photo: Photo) => void;
  onOpenAnchor: (photo: Photo) => void;
  onFeedback?: (signal: FeedbackSignal, excludedIds: string[]) => void;
  isConfirming?: boolean;
}

export function PhotoModal({
  photo,
  onClose,
  onConfirm,
  onOpenAnchor,
  onFeedback,
  isConfirming = false,
}: PhotoModalProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const imageUrl = getPhotoImageUrl(photo);
  const fallbackUrl = getPhotoFallbackSvg(photo);
  const displaySrc = imgError || !imageUrl ? fallbackUrl : imageUrl;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="close-floating-btn"
          onClick={onClose}
          aria-label="Close photo view"
        >
          <CloseIcon size={20} />
        </button>

        <div className="modal-content-split">
          {/* Left media pane */}
          <div className="modal-media-pane">
            <img
              src={displaySrc}
              alt={photo.caption || photo.filename}
              className="modal-image"
              onError={() => setImgError(true)}
            />
          </div>

          {/* Right metadata & actions pane */}
          <div className="modal-details-pane">
            <div className="details-header">
              <span className="episode-badge">
                <LayersIcon size={12} />
                <span>{photo.episode_label || "Episode"}</span>
              </span>
              {photo.purpose_tag && (
                <span className="purpose-badge">
                  <TagIcon size={12} />
                  <span>{photo.purpose_tag}</span>
                </span>
              )}
            </div>

            <div className="details-body">
              <h2 className="photo-title">
                {photo.caption || photo.filename}
              </h2>

              <div className="meta-list">
                {photo.timestamp && (
                  <div className="meta-item">
                    <ClockIcon size={16} className="meta-icon" />
                    <div className="meta-text">
                      <span className="meta-label">Timestamp</span>
                      <span className="meta-value">{photo.timestamp.replace("T", " ")}</span>
                    </div>
                  </div>
                )}

                {photo.location_label && (
                  <div className="meta-item">
                    <MapPinIcon size={16} className="meta-icon" />
                    <div className="meta-text">
                      <span className="meta-label">Location</span>
                      <span className="meta-value">{photo.location_label}</span>
                    </div>
                  </div>
                )}
              </div>

              {photo.objects && photo.objects.length > 0 && (
                <div className="tag-group">
                  <span className="tag-group-label">Detected Objects</span>
                  <div className="tag-chips">
                    {photo.objects.map((obj, i) => (
                      <span key={i} className="detail-chip">
                        {obj}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {photo.mood_tags && photo.mood_tags.length > 0 && (
                <div className="tag-group">
                  <span className="tag-group-label">Vibe & Mood</span>
                  <div className="tag-chips">
                    {photo.mood_tags.map((mood, i) => (
                      <span key={i} className="detail-chip mood">
                        <SparklesIcon size={11} />
                        <span>{mood}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons footer */}
            <div className="modal-footer-actions">
              <button
                type="button"
                className="btn-confirm-found"
                onClick={() => onConfirm(photo)}
                disabled={isConfirming}
              >
                <CheckIcon size={18} />
                <span>That&apos;s It! (I found it)</span>
              </button>

              <div className="secondary-actions-row">
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={() => onOpenAnchor(photo)}
                  title="Use this photo's date as a pivot to find earlier/later moments"
                >
                  <AnchorIcon size={16} />
                  <span>Set Timeline Anchor</span>
                </button>

                {onFeedback && (
                  <button
                    type="button"
                    className="btn-secondary-action not-this"
                    onClick={() => {
                      onFeedback("not_this", [photo.id]);
                      onClose();
                    }}
                    title="Remove this photo and similar ones from results"
                  >
                    <CloseIcon size={14} />
                    <span>Not This</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.82);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 900;
          padding: 24px;
          animation: fadeIn 0.2s ease-out;
        }

        .modal-container {
          position: relative;
          width: 100%;
          max-width: 960px;
          max-height: 90vh;
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
          animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
        }

        .close-floating-btn {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 10;
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: all var(--transition-fast);
        }

        .close-floating-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }

        .modal-content-split {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          height: 100%;
          max-height: 90vh;
          overflow: hidden;
        }

        .modal-media-pane {
          background: #020617;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 16px;
        }

        .modal-image {
          max-width: 100%;
          max-height: 78vh;
          object-fit: contain;
          border-radius: var(--radius-sm);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6);
        }

        .modal-details-pane {
          display: flex;
          flex-direction: column;
          padding: 28px;
          overflow-y: auto;
          gap: 20px;
          background: rgba(18, 25, 42, 0.9);
        }

        .details-header {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .episode-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(56, 189, 248, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.3);
          color: #38bdf8;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          text-transform: uppercase;
        }

        .purpose-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          font-size: 11px;
          padding: 4px 10px;
          border-radius: var(--radius-full);
        }

        .details-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
          flex: 1;
        }

        .photo-title {
          font-size: 19px;
          font-weight: 600;
          color: #f8fafc;
          line-height: 1.35;
        }

        .meta-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 12px;
          border-radius: var(--radius-sm);
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        :global(.meta-icon) {
          color: var(--accent-primary);
          flex-shrink: 0;
        }

        .meta-text {
          display: flex;
          flex-direction: column;
        }

        .meta-label {
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .meta-value {
          font-size: 13px;
          color: #cbd5e1;
        }

        .tag-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .tag-group-label {
          font-size: 11px;
          text-transform: uppercase;
          font-weight: 600;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }

        .tag-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .detail-chip {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          font-size: 12px;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .detail-chip.mood {
          background: rgba(168, 85, 247, 0.12);
          border-color: rgba(168, 85, 247, 0.3);
          color: #d8b4fe;
        }

        .modal-footer-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: auto;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .btn-confirm-found {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          color: #ffffff;
          padding: 12px 20px;
          border-radius: var(--radius-full);
          font-size: 15px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 4px 18px rgba(16, 185, 129, 0.35);
          transition: all var(--transition-fast);
        }

        .btn-confirm-found:hover:not(:disabled) {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          box-shadow: 0 6px 24px rgba(16, 185, 129, 0.5);
          transform: translateY(-1px);
        }

        .secondary-actions-row {
          display: flex;
          gap: 8px;
        }

        .btn-secondary-action {
          flex: 1;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: var(--text-secondary);
          padding: 8px 12px;
          border-radius: var(--radius-full);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all var(--transition-fast);
        }

        .btn-secondary-action:hover {
          color: var(--text-main);
          background: rgba(255, 255, 255, 0.12);
        }

        .btn-secondary-action.not-this:hover {
          background: rgba(244, 63, 94, 0.15);
          color: #fb7185;
          border-color: rgba(244, 63, 94, 0.3);
        }

        @media (max-width: 768px) {
          .modal-content-split {
            grid-template-columns: 1fr;
            max-height: 85vh;
            overflow-y: auto;
          }
          .modal-media-pane {
            max-height: 40vh;
          }
          .modal-details-pane {
            padding: 18px;
          }
        }
      `}</style>
    </div>
  );
}
