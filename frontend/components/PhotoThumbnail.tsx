"use client";

import React, { useState } from "react";
import { Photo } from "@/lib/types";
import { getPhotoImageUrl, getPhotoFallbackSvg } from "@/lib/api";
import { CheckIcon, AnchorIcon, MapPinIcon, ClockIcon } from "./Icons";

interface PhotoThumbnailProps {
  photo: Photo;
  onClick: (photo: Photo) => void;
  onConfirm?: (photo: Photo) => void;
  onAnchor?: (photo: Photo) => void;
  isSelected?: boolean;
  showActions?: boolean;
}

export function PhotoThumbnail({
  photo,
  onClick,
  onConfirm,
  onAnchor,
  isSelected = false,
  showActions = true,
}: PhotoThumbnailProps) {
  const [imgError, setImgError] = useState(false);
  const imageUrl = getPhotoImageUrl(photo);
  const fallbackUrl = getPhotoFallbackSvg(photo);

  const displaySrc = imgError || !imageUrl ? fallbackUrl : imageUrl;

  const dateStr = photo.timestamp ? photo.timestamp.slice(0, 10) : "";
  const locationStr = photo.location_label || "";

  return (
    <div
      className={`photo-card ${isSelected ? "selected" : ""}`}
      onClick={() => onClick(photo)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(photo);
        }
      }}
    >
      <div className="photo-media">
        <img
          src={displaySrc}
          alt={photo.caption || photo.filename}
          loading="lazy"
          onError={() => setImgError(true)}
          className="photo-img"
        />
        <div className="photo-overlay">
          {showActions && (
            <div className="quick-actions" onClick={(e) => e.stopPropagation()}>
              {onConfirm && (
                <button
                  type="button"
                  className="quick-btn confirm-btn"
                  title="That's it! (Confirm photo found)"
                  onClick={() => onConfirm(photo)}
                >
                  <CheckIcon size={14} />
                  <span>That&apos;s it</span>
                </button>
              )}
              {onAnchor && (
                <button
                  type="button"
                  className="quick-btn anchor-btn"
                  title="Set as timeline anchor"
                  onClick={() => onAnchor(photo)}
                >
                  <AnchorIcon size={14} />
                  <span>Anchor</span>
                </button>
              )}
            </div>
          )}

          <div className="photo-meta-bottom">
            {locationStr && (
              <span className="meta-tag">
                <MapPinIcon size={12} />
                <span className="truncate">{locationStr}</span>
              </span>
            )}
            {dateStr && (
              <span className="meta-tag">
                <ClockIcon size={12} />
                <span>{dateStr}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {photo.caption && (
        <div className="photo-caption-strip">
          <p className="caption-text">{photo.caption}</p>
        </div>
      )}

      <style jsx>{`
        .photo-card {
          position: relative;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          cursor: pointer;
          transition: all var(--transition-normal);
          display: flex;
          flex-direction: column;
        }

        .photo-card:hover {
          transform: translateY(-3px);
          border-color: rgba(56, 189, 248, 0.4);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5), 0 0 16px rgba(56, 189, 248, 0.2);
        }

        .photo-card.selected {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 2px var(--accent-primary);
        }

        .photo-media {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          background: #0f172a;
          overflow: hidden;
        }

        .photo-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .photo-card:hover .photo-img {
          transform: scale(1.05);
        }

        .photo-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(0, 0, 0, 0.4) 0%,
            transparent 35%,
            transparent 60%,
            rgba(0, 0, 0, 0.8) 100%
          );
          opacity: 0.85;
          transition: opacity var(--transition-normal);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 8px;
        }

        .photo-card:hover .photo-overlay {
          opacity: 1;
        }

        .quick-actions {
          display: flex;
          gap: 6px;
          opacity: 0;
          transform: translateY(-4px);
          transition: all var(--transition-fast);
        }

        .photo-card:hover .quick-actions {
          opacity: 1;
          transform: translateY(0);
        }

        .quick-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: none;
          border-radius: var(--radius-full);
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          backdrop-filter: blur(12px);
          transition: all var(--transition-fast);
        }

        .confirm-btn {
          background: rgba(16, 185, 129, 0.85);
          color: #ffffff;
        }
        .confirm-btn:hover {
          background: #10b981;
          transform: scale(1.04);
        }

        .anchor-btn {
          background: rgba(56, 189, 248, 0.85);
          color: #ffffff;
        }
        .anchor-btn:hover {
          background: #38bdf8;
          transform: scale(1.04);
        }

        .photo-meta-bottom {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .meta-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(8px);
          color: #cbd5e1;
          font-size: 10px;
          padding: 2px 7px;
          border-radius: var(--radius-full);
        }

        .truncate {
          max-width: 90px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .photo-caption-strip {
          padding: 8px 10px;
          background: rgba(15, 23, 42, 0.9);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .caption-text {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
