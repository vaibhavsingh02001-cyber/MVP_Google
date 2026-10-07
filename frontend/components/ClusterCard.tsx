"use client";

import React, { useState } from "react";
import { Cluster, Photo, FeedbackSignal } from "@/lib/types";
import { PhotoThumbnail } from "./PhotoThumbnail";
import {
  SparklesIcon,
  CloseIcon,
  ClockIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  LayersIcon,
} from "./Icons";

interface ClusterCardProps {
  cluster: Cluster;
  index: number;
  onPhotoClick: (photo: Photo) => void;
  onConfirmPhoto: (photo: Photo) => void;
  onAnchorPhoto: (photo: Photo) => void;
  onFeedback: (signal: FeedbackSignal, excludedIds: string[]) => void;
  disabled?: boolean;
}

export function ClusterCard({
  cluster,
  index,
  onPhotoClick,
  onConfirmPhoto,
  onAnchorPhoto,
  onFeedback,
  disabled = false,
}: ClusterCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExcluding, setIsExcluding] = useState(false);

  const photos = cluster.photos || [];
  const displayPhotos = isExpanded ? photos : photos.slice(0, 5);

  const handleNotThis = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || isExcluding) return;
    setIsExcluding(true);
    // Give ripple animation 150ms before firing feedback
    setTimeout(() => {
      onFeedback("not_this", cluster.photo_ids);
    }, 150);
  };

  const handleEarlier = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onFeedback("earlier", []);
  };

  const handleLater = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onFeedback("later", []);
  };

  return (
    <div
      className={`cluster-card ${isExcluding ? "excluding" : ""}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="cluster-header">
        <div className="cluster-title-row">
          <div className="cluster-title-wrap">
            <span className="cluster-index-badge">{index + 1}</span>
            <h3 className="cluster-name">{cluster.name}</h3>
          </div>
          <div className="cluster-count-badge">
            <LayersIcon size={13} />
            <span>{photos.length} photos</span>
          </div>
        </div>

        {cluster.match_reason && (
          <div className="match-reason-box">
            <SparklesIcon size={14} className="reason-sparkle" />
            <p className="match-reason-text">{cluster.match_reason}</p>
          </div>
        )}
      </div>

      {/* Photo carousel / strip */}
      <div className="cluster-photos-wrapper">
        <div className={`cluster-photos-grid ${isExpanded ? "expanded" : ""}`}>
          {displayPhotos.map((photo) => (
            <PhotoThumbnail
              key={photo.id}
              photo={photo}
              onClick={onPhotoClick}
              onConfirm={onConfirmPhoto}
              onAnchor={onAnchorPhoto}
            />
          ))}
        </div>

        {photos.length > 5 && (
          <button
            type="button"
            className="expand-toggle-btn"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded
              ? `Show fewer photos`
              : `+${photos.length - 5} more photos in this cluster`}
          </button>
        )}
      </div>

      {/* Feedback Bar per cluster */}
      <div className="cluster-actions-bar">
        <button
          type="button"
          className="action-pill-btn not-this-btn"
          onClick={handleNotThis}
          disabled={disabled || isExcluding}
          title="Exclude this entire cluster"
        >
          <CloseIcon size={14} />
          <span>Not this</span>
        </button>

        <div className="timeline-pills-group">
          <button
            type="button"
            className="action-pill-btn timeline-btn"
            onClick={handleEarlier}
            disabled={disabled}
            title="Search earlier in time"
          >
            <ArrowLeftIcon size={14} />
            <span>Earlier</span>
          </button>

          <button
            type="button"
            className="action-pill-btn timeline-btn"
            onClick={handleLater}
            disabled={disabled}
            title="Search later in time"
          >
            <span>Later</span>
            <ArrowRightIcon size={14} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .cluster-card {
          background: rgba(18, 25, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: var(--radius-md);
          padding: 18px 20px;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
          animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
          transition: transform 0.25s ease, opacity 0.25s ease, border-color 0.25s ease;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .cluster-card:hover {
          border-color: rgba(255, 255, 255, 0.16);
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);
        }

        .cluster-card.excluding {
          opacity: 0.3;
          transform: scale(0.97);
          pointer-events: none;
        }

        .cluster-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .cluster-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .cluster-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .cluster-index-badge {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(56, 189, 248, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.3);
          color: var(--accent-primary);
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .cluster-name {
          font-size: 17px;
          font-weight: 600;
          color: var(--text-main);
          letter-spacing: -0.01em;
        }

        .cluster-count-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 500;
          padding: 3px 9px;
          border-radius: var(--radius-full);
          white-space: nowrap;
        }

        .match-reason-box {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: rgba(56, 189, 248, 0.06);
          border-left: 2px solid #38bdf8;
          padding: 6px 10px;
          border-radius: 0 var(--radius-xs) var(--radius-xs) 0;
        }

        :global(.reason-sparkle) {
          color: #38bdf8;
          margin-top: 2px;
          flex-shrink: 0;
        }

        .match-reason-text {
          font-size: 13px;
          color: #93c5fd;
          line-height: 1.4;
        }

        .cluster-photos-wrapper {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .cluster-photos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 10px;
        }

        .expand-toggle-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px dashed rgba(255, 255, 255, 0.15);
          color: var(--accent-primary);
          padding: 8px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .expand-toggle-btn:hover {
          background: rgba(56, 189, 248, 0.1);
          border-color: rgba(56, 189, 248, 0.3);
        }

        .cluster-actions-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          flex-wrap: wrap;
          gap: 8px;
        }

        .action-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          border-radius: var(--radius-full);
          padding: 5px 12px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .action-pill-btn:hover:not(:disabled) {
          color: var(--text-main);
          border-color: rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.12);
        }

        .not-this-btn:hover:not(:disabled) {
          background: rgba(244, 63, 94, 0.15);
          border-color: rgba(244, 63, 94, 0.35);
          color: #fb7185;
        }

        .timeline-pills-group {
          display: flex;
          gap: 6px;
        }

        .timeline-btn:hover:not(:disabled) {
          background: rgba(56, 189, 248, 0.12);
          border-color: rgba(56, 189, 248, 0.3);
          color: #38bdf8;
        }

        @media (max-width: 640px) {
          .cluster-photos-grid {
            grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
            gap: 8px;
          }
          .cluster-actions-bar {
            flex-direction: column;
            align-items: stretch;
          }
          .timeline-pills-group {
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
}
