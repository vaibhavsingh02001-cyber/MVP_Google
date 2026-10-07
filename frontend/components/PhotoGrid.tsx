"use client";

import React from "react";
import { Photo } from "@/lib/types";
import { PhotoThumbnail } from "./PhotoThumbnail";

interface PhotoGridProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo) => void;
  onConfirm?: (photo: Photo) => void;
  onAnchor?: (photo: Photo) => void;
  emptyMessage?: string;
  columns?: "normal" | "compact";
}

export function PhotoGrid({
  photos,
  onPhotoClick,
  onConfirm,
  onAnchor,
  emptyMessage = "No photos match your query.",
  columns = "normal",
}: PhotoGridProps) {
  if (photos.length === 0) {
    return (
      <div className="grid-empty-state">
        <p className="empty-title">{emptyMessage}</p>
        <p className="empty-sub">Try adjusting your clue or browsing other timeframes.</p>
        <style jsx>{`
          .grid-empty-state {
            padding: 48px 24px;
            text-align: center;
            background: rgba(15, 23, 42, 0.4);
            border: 1px dashed rgba(255, 255, 255, 0.1);
            border-radius: var(--radius-md);
          }
          .empty-title {
            color: var(--text-main);
            font-size: 15px;
            font-weight: 500;
          }
          .empty-sub {
            color: var(--text-muted);
            font-size: 13px;
            margin-top: 6px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`photo-grid-container ${columns}`}>
      {photos.map((photo) => (
        <PhotoThumbnail
          key={photo.id}
          photo={photo}
          onClick={onPhotoClick}
          onConfirm={onConfirm}
          onAnchor={onAnchor}
        />
      ))}

      <style jsx>{`
        .photo-grid-container {
          display: grid;
          gap: 16px;
          width: 100%;
        }

        .photo-grid-container.normal {
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        }

        .photo-grid-container.compact {
          grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
          gap: 12px;
        }

        @media (max-width: 640px) {
          .photo-grid-container.normal {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
}
