"use client";

import React, { useState } from "react";
import { Photo } from "@/lib/types";
import { getPhotoImageUrl, getPhotoFallbackSvg } from "@/lib/api";
import { AnchorIcon, CloseIcon, ClockIcon, MapPinIcon, CheckIcon } from "./Icons";

interface AnchorPickerProps {
  photo: Photo;
  onClose: () => void;
  onSetAnchor: (photo: Photo, relation: "before" | "after" | "same_day") => Promise<void>;
  isLoading?: boolean;
}

export function AnchorPicker({
  photo,
  onClose,
  onSetAnchor,
  isLoading = false,
}: AnchorPickerProps) {
  const [relation, setRelation] = useState<"before" | "after" | "same_day">("same_day");
  const [imgError, setImgError] = useState(false);

  const imageUrl = getPhotoImageUrl(photo);
  const fallbackUrl = getPhotoFallbackSvg(photo);
  const displaySrc = imgError || !imageUrl ? fallbackUrl : imageUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    await onSetAnchor(photo, relation);
  };

  return (
    <div className="anchor-modal-backdrop" onClick={onClose}>
      <div
        className="anchor-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <AnchorIcon size={20} className="modal-anchor-icon" />
            <h3 className="modal-title">Set Timeline Anchor</h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <p className="modal-desc">
          Pin this photo as a temporal landmark to narrow search to photos taken
          before, after, or on the same day.
        </p>

        {/* Selected anchor preview */}
        <div className="anchor-preview-box">
          <img
            src={displaySrc}
            alt={photo.caption || photo.filename}
            className="anchor-thumb"
            onError={() => setImgError(true)}
          />
          <div className="anchor-info">
            <h4 className="anchor-caption">{photo.caption || photo.filename}</h4>
            <div className="anchor-meta-row">
              {photo.location_label && (
                <span className="meta-pill">
                  <MapPinIcon size={12} />
                  <span>{photo.location_label}</span>
                </span>
              )}
              {photo.timestamp && (
                <span className="meta-pill">
                  <ClockIcon size={12} />
                  <span>{photo.timestamp.slice(0, 10)}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Relation selector options */}
        <form onSubmit={handleSubmit} className="relation-form">
          <label className="section-label">Find photos taken:</label>
          <div className="relation-options-grid">
            <label
              className={`relation-option-card ${
                relation === "before" ? "selected" : ""
              }`}
            >
              <input
                type="radio"
                name="relation"
                value="before"
                checked={relation === "before"}
                onChange={() => setRelation("before")}
                disabled={isLoading}
              />
              <span className="option-title">Before this photo</span>
              <span className="option-hint">Within preceding 48 hours</span>
            </label>

            <label
              className={`relation-option-card ${
                relation === "same_day" ? "selected" : ""
              }`}
            >
              <input
                type="radio"
                name="relation"
                value="same_day"
                checked={relation === "same_day"}
                onChange={() => setRelation("same_day")}
                disabled={isLoading}
              />
              <span className="option-title">On the same day</span>
              <span className="option-hint">Same calendar date (00:00 to 23:59)</span>
            </label>

            <label
              className={`relation-option-card ${
                relation === "after" ? "selected" : ""
              }`}
            >
              <input
                type="radio"
                name="relation"
                value="after"
                checked={relation === "after"}
                onChange={() => setRelation("after")}
                disabled={isLoading}
              />
              <span className="option-title">After this photo</span>
              <span className="option-hint">Within subsequent 48 hours</span>
            </label>
          </div>

          <div className="modal-actions-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-apply-anchor"
              disabled={isLoading}
            >
              {isLoading ? (
                <span>Narrowing timeline…</span>
              ) : (
                <>
                  <CheckIcon size={16} />
                  <span>Pin Anchor & Narrow</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .anchor-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
          animation: fadeIn 0.2s ease-out;
        }

        .anchor-modal-card {
          width: 100%;
          max-width: 520px;
          background: rgba(18, 25, 42, 0.95);
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: var(--radius-lg);
          padding: 24px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 189, 248, 0.2);
          animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .modal-title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        :global(.modal-anchor-icon) {
          color: #38bdf8;
        }

        .modal-title {
          font-size: 18px;
          font-weight: 600;
          color: #f8fafc;
        }

        .modal-close-btn {
          background: rgba(255, 255, 255, 0.08);
          border: none;
          color: var(--text-secondary);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .modal-close-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }

        .modal-desc {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.45;
        }

        .anchor-preview-box {
          display: flex;
          align-items: center;
          gap: 14px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 12px;
          border-radius: var(--radius-sm);
        }

        .anchor-thumb {
          width: 72px;
          height: 72px;
          object-fit: cover;
          border-radius: var(--radius-xs);
          flex-shrink: 0;
        }

        .anchor-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow: hidden;
        }

        .anchor-caption {
          font-size: 13px;
          font-weight: 500;
          color: #e2e8f0;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .anchor-meta-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .meta-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-muted);
          font-size: 11px;
          padding: 2px 6px;
          border-radius: var(--radius-full);
        }

        .section-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-bottom: 8px;
          display: block;
        }

        .relation-options-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .relation-option-card {
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
          padding: 10px 14px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .relation-option-card input {
          display: none;
        }

        .relation-option-card:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .relation-option-card.selected {
          background: rgba(56, 189, 248, 0.15);
          border-color: rgba(56, 189, 248, 0.4);
        }

        .option-title {
          font-size: 14px;
          font-weight: 600;
          color: #f8fafc;
        }

        .option-hint {
          font-size: 12px;
          color: var(--text-muted);
        }

        .modal-actions-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 14px;
        }

        .btn-cancel {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: var(--text-secondary);
          padding: 8px 16px;
          border-radius: var(--radius-full);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }

        .btn-cancel:hover {
          color: var(--text-main);
          border-color: rgba(255, 255, 255, 0.25);
        }

        .btn-apply-anchor {
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          border: none;
          color: #ffffff;
          padding: 8px 18px;
          border-radius: var(--radius-full);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-apply-anchor:hover:not(:disabled) {
          background: #0284c7;
          box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);
        }
      `}</style>
    </div>
  );
}
