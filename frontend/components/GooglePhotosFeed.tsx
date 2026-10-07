"use client";

import React, { useMemo, useState } from "react";
import { Photo } from "@/lib/types";
import { getPhotoImageUrl, getPhotoFallbackSvg } from "@/lib/api";
import { CheckIcon, AnchorIcon, PlayCircleIcon, MapPinIcon } from "./Icons";

interface GooglePhotosFeedProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo) => void;
  onConfirm?: (photo: Photo) => void;
  onAnchor?: (photo: Photo) => void;
}

interface DateGroup {
  dateLabel: string;
  locationLabel: string;
  photos: Photo[];
}

export function GooglePhotosFeed({
  photos,
  onPhotoClick,
  onConfirm,
  onAnchor,
}: GooglePhotosFeedProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Group photos chronologically by date and location
  const dateGroups = useMemo<DateGroup[]>(() => {
    const groupsMap = new Map<string, { dateLabel: string; locationLabel: string; photos: Photo[] }>();

    for (const photo of photos) {
      let dateKey = "Recent";
      let dateLabel = "Today";
      let location = photo.location_label || photo.episode_label || "";

      if (photo.timestamp) {
        try {
          const d = new Date(photo.timestamp);
          if (!isNaN(d.getTime())) {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            dateLabel = `${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}`;
            dateKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
          }
        } catch {
          // fallback
        }
      }

      const key = `${dateKey}_${location}`;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          dateLabel,
          locationLabel: location,
          photos: [],
        });
      }
      groupsMap.get(key)!.photos.push(photo);
    }

    return Array.from(groupsMap.values());
  }, [photos]);

  if (photos.length === 0) {
    return (
      <div className="feed-empty">
        <p className="feed-empty-title">No photos loaded</p>
        <p className="feed-empty-sub">Add photos or trigger a search to see results.</p>
        <style jsx>{`
          .feed-empty {
            text-align: center;
            padding: 48px 16px;
            background: #131314;
            border-radius: 16px;
            border: 1px dashed rgba(255, 255, 255, 0.1);
          }
          .feed-empty-title {
            font-size: 16px;
            font-weight: 500;
            color: #e3e3e3;
          }
          .feed-empty-sub {
            font-size: 13px;
            color: #8e918f;
            margin-top: 4px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="google-photos-feed">
      {dateGroups.map((group, groupIdx) => (
        <section key={`group-${groupIdx}`} className="date-section">
          {/* Section Date Header */}
          <div className="section-header">
            <h3 className="date-heading">{group.dateLabel}</h3>
            {group.locationLabel && (
              <span className="location-heading">
                <MapPinIcon size={13} className="loc-pin" />
                {group.locationLabel}
              </span>
            )}
          </div>

          {/* Clean Google Photos Dense Grid */}
          <div className="photo-grid-row">
            {group.photos.map((photo, pIdx) => {
              const imageUrl = getPhotoImageUrl(photo);
              const fallbackUrl = getPhotoFallbackSvg(photo);
              const isVideo = pIdx % 4 === 1;
              const videoDuration = pIdx % 2 === 0 ? "00:06" : "00:13";
              const isSelected = selectedIds.has(photo.id);

              return (
                <div
                  key={photo.id}
                  className={`photo-tile ${isSelected ? "selected" : ""}`}
                  onClick={() => onPhotoClick(photo)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onPhotoClick(photo);
                    }
                  }}
                >
                  <div className="tile-aspect">
                    <img
                      src={imageUrl || fallbackUrl}
                      alt={photo.caption || photo.filename}
                      className="tile-img"
                      loading="lazy"
                      onError={(e) => {
                        if (fallbackUrl) {
                          (e.target as HTMLImageElement).src = fallbackUrl;
                        }
                      }}
                    />

                    {/* Google Photos Selection Check Circle */}
                    <button
                      type="button"
                      className={`select-check-btn ${isSelected ? "checked" : ""}`}
                      onClick={(e) => toggleSelect(e, photo.id)}
                      aria-label="Select photo"
                    >
                      {isSelected ? <CheckIcon size={12} /> : null}
                    </button>

                    {/* Video Duration Badge */}
                    {isVideo && (
                      <div className="video-pill">
                        <span>{videoDuration}</span>
                        <PlayCircleIcon size={13} />
                      </div>
                    )}

                    {/* Hover Quick Actions */}
                    <div className="tile-overlay">
                      <div className="tile-actions" onClick={(e) => e.stopPropagation()}>
                        {onConfirm && (
                          <button
                            type="button"
                            className="tile-btn confirm-btn"
                            title="That's it! (Confirm found)"
                            onClick={() => onConfirm(photo)}
                          >
                            <CheckIcon size={12} />
                            <span>Found</span>
                          </button>
                        )}
                        {onAnchor && (
                          <button
                            type="button"
                            className="tile-btn anchor-btn"
                            title="Timeline Anchor"
                            onClick={() => onAnchor(photo)}
                          >
                            <AnchorIcon size={12} />
                            <span>Anchor</span>
                          </button>
                        )}
                      </div>

                      {photo.caption && (
                        <p className="tile-caption">{photo.caption}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <style jsx>{`
        .google-photos-feed {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .date-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .section-header {
          display: flex;
          align-items: baseline;
          gap: 10px;
          padding: 0 2px;
        }

        .date-heading {
          font-size: 15px;
          font-weight: 500;
          color: #e3e3e3;
          letter-spacing: -0.01em;
        }

        .location-heading {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #8e918f;
          font-weight: 400;
        }

        :global(.loc-pin) {
          color: #8ab4f8;
        }

        .photo-grid-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
        }

        @media (min-width: 600px) {
          .photo-grid-row {
            grid-template-columns: repeat(4, 1fr);
            gap: 4px;
          }
        }

        @media (min-width: 1024px) {
          .photo-grid-row {
            grid-template-columns: repeat(5, 1fr);
            gap: 4px;
          }
        }

        .photo-tile {
          position: relative;
          background: #1e1f20;
          cursor: pointer;
          overflow: hidden;
          transition: transform 0.15s ease;
        }

        .photo-tile.selected {
          outline: 3px solid #8ab4f8;
          outline-offset: -3px;
        }

        .tile-aspect {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          overflow: hidden;
        }

        .tile-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.25s ease;
        }

        .photo-tile:hover .tile-img {
          transform: scale(1.04);
        }

        /* Selection Check Circle */
        .select-check-btn {
          position: absolute;
          top: 8px;
          left: 8px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.4);
          border: 2px solid rgba(255, 255, 255, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 5;
          opacity: 0;
          transition: opacity 0.15s ease, background 0.15s ease;
          color: #ffffff;
        }

        .photo-tile:hover .select-check-btn,
        .select-check-btn.checked {
          opacity: 1;
        }

        .select-check-btn.checked {
          background: #1a73e8;
          border-color: #1a73e8;
        }

        /* Video duration */
        .video-pill {
          position: absolute;
          bottom: 8px;
          right: 8px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(4px);
          color: #ffffff;
          font-size: 11px;
          font-weight: 500;
          padding: 2px 6px;
          border-radius: 4px;
          z-index: 2;
        }

        .tile-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(0, 0, 0, 0.3) 0%,
            transparent 40%,
            rgba(0, 0, 0, 0.8) 100%
          );
          opacity: 0;
          transition: opacity 0.15s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 8px;
          z-index: 3;
        }

        .photo-tile:hover .tile-overlay {
          opacity: 1;
        }

        .tile-actions {
          display: flex;
          gap: 6px;
          align-self: flex-end;
        }

        .tile-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: none;
          border-radius: var(--radius-pill);
          padding: 4px 8px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: transform 0.15s ease;
        }

        .confirm-btn {
          background: #34a853;
          color: #ffffff;
        }
        .confirm-btn:hover {
          transform: scale(1.05);
        }

        .anchor-btn {
          background: #4285f4;
          color: #ffffff;
        }
        .anchor-btn:hover {
          transform: scale(1.05);
        }

        .tile-caption {
          font-size: 11px;
          color: #f1f5f9;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
        }
      `}</style>
    </div>
  );
}
