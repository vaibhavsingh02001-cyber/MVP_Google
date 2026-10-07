"use client";

import React from "react";
import { Photo } from "@/lib/types";
import { getPhotoImageUrl, getPhotoFallbackSvg } from "@/lib/api";
import { CheckIcon, SparklesIcon, RefreshCwIcon, MapPinIcon, ClockIcon } from "./Icons";

interface SuccessOverlayProps {
  photo: Photo;
  turnsUsed: number;
  elapsedMs?: number;
  onReset: () => void;
}

export function SuccessOverlay({
  photo,
  turnsUsed,
  elapsedMs,
  onReset,
}: SuccessOverlayProps) {
  const imageUrl = getPhotoImageUrl(photo);
  const fallbackUrl = getPhotoFallbackSvg(photo);

  return (
    <div className="success-backdrop">
      <div className="success-card">
        <div className="success-glow" />

        <div className="badge-found">
          <CheckIcon size={18} />
          <span>Memory Found & Confirmed!</span>
        </div>

        <div className="media-container">
          <img
            src={imageUrl || fallbackUrl}
            alt={photo.caption || photo.filename}
            className="success-img"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = fallbackUrl;
            }}
          />
        </div>

        <div className="success-details">
          <h2 className="success-caption">{photo.caption || photo.filename}</h2>

          <div className="success-stats-row">
            <div className="stat-box">
              <span className="stat-label">Turns Needed</span>
              <span className="stat-value">{turnsUsed}</span>
            </div>

            {elapsedMs !== undefined && (
              <div className="stat-box">
                <span className="stat-label">Retrieval Time</span>
                <span className="stat-value">{elapsedMs} ms</span>
              </div>
            )}

            <div className="stat-box">
              <span className="stat-label">Outcome</span>
              <span className="stat-value emerald">Found</span>
            </div>
          </div>

          <div className="meta-pills-row">
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
            {photo.episode_label && (
              <span className="meta-pill episode">
                <SparklesIcon size={12} />
                <span>{photo.episode_label}</span>
              </span>
            )}
          </div>
        </div>

        <button type="button" className="btn-search-again" onClick={onReset}>
          <RefreshCwIcon size={16} />
          <span>Search Another Memory</span>
        </button>
      </div>

      <style jsx>{`
        .success-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(4, 7, 15, 0.88);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 24px;
          animation: fadeIn 0.3s ease-out;
        }

        .success-card {
          position: relative;
          width: 100%;
          max-width: 580px;
          background: rgba(18, 25, 42, 0.95);
          border: 1px solid rgba(16, 185, 129, 0.4);
          border-radius: var(--radius-lg);
          padding: 32px 28px;
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.8), 0 0 40px rgba(16, 185, 129, 0.25);
          animation: popIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 20px;
          overflow: hidden;
        }

        .success-glow {
          position: absolute;
          top: -120px;
          width: 250px;
          height: 250px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, transparent 70%);
          pointer-events: none;
        }

        .badge-found {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(16, 185, 129, 0.2);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #34d399;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 6px 16px;
          border-radius: var(--radius-full);
        }

        .media-container {
          width: 100%;
          max-width: 440px;
          aspect-ratio: 4 / 3;
          border-radius: var(--radius-md);
          overflow: hidden;
          background: #0f172a;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .success-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .success-details {
          display: flex;
          flex-direction: column;
          gap: 14px;
          width: 100%;
        }

        .success-caption {
          font-size: 18px;
          font-weight: 600;
          color: #f8fafc;
          line-height: 1.4;
        }

        .success-stats-row {
          display: flex;
          justify-content: center;
          gap: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: var(--radius-sm);
          padding: 12px;
          width: 100%;
        }

        .stat-box {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }

        .stat-label {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-size: 16px;
          font-weight: 700;
          color: #e2e8f0;
        }

        .stat-value.emerald {
          color: #10b981;
        }

        .meta-pills-row {
          display: flex;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .meta-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-secondary);
          font-size: 11px;
          padding: 3px 9px;
          border-radius: var(--radius-full);
        }

        .meta-pill.episode {
          background: rgba(56, 189, 248, 0.12);
          color: #7dd3fc;
          border: 1px solid rgba(56, 189, 248, 0.25);
        }

        .btn-search-again {
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          border: none;
          color: #ffffff;
          padding: 12px 28px;
          border-radius: var(--radius-full);
          font-size: 14px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 4px 18px rgba(2, 132, 199, 0.4);
          transition: all var(--transition-fast);
        }

        .btn-search-again:hover {
          background: #0284c7;
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(2, 132, 199, 0.6);
        }
      `}</style>
    </div>
  );
}
