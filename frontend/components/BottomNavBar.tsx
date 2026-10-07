"use client";

import React from "react";
import { PhotosNavIcon, FolderIcon, SparklesIcon, LayersIcon } from "./Icons";

export type NavTab = "photos" | "collections" | "create";

interface BottomNavBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenRecallAI: () => void;
  isAIActive?: boolean;
}

export function BottomNavBar({
  activeTab,
  onTabChange,
  onOpenRecallAI,
  isAIActive = false,
}: BottomNavBarProps) {
  return (
    <nav className="gp-bottom-nav" aria-label="Google Photos Navigation">
      <div className="nav-container">
        {/* Photos Tab (Pill Active State) */}
        <button
          type="button"
          className={`gp-nav-pill-btn ${activeTab === "photos" ? "active" : ""}`}
          onClick={() => onTabChange("photos")}
        >
          <PhotosNavIcon size={18} />
          <span className="pill-label">Photos</span>
        </button>

        {/* Collections Tab */}
        <button
          type="button"
          className={`gp-nav-item ${activeTab === "collections" ? "active" : ""}`}
          onClick={() => onTabChange("collections")}
        >
          <FolderIcon size={20} />
          <span className="item-label">Collections</span>
        </button>

        {/* Create Tab */}
        <button
          type="button"
          className={`gp-nav-item ${activeTab === "create" ? "active" : ""}`}
          onClick={() => onTabChange("create")}
        >
          <LayersIcon size={20} />
          <span className="item-label">Create</span>
        </button>

        {/* Dedicated Gemini / Recall AI Sparkle Action Button */}
        <button
          type="button"
          className={`gp-ai-sparkle-btn ${isAIActive ? "active" : ""}`}
          onClick={onOpenRecallAI}
          title="Ask Photos with Recall AI"
          aria-label="Ask Photos AI"
        >
          <SparklesIcon size={20} className="ai-btn-sparkle" />
        </button>
      </div>

      <style jsx>{`
        .gp-bottom-nav {
          position: fixed;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 95;
          width: calc(100% - 32px);
          max-width: 440px;
          background: rgba(26, 29, 36, 0.92);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 36px;
          padding: 6px 10px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
        }

        .nav-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }

        .gp-nav-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: none;
          color: #94a3b8;
          padding: 8px 16px;
          border-radius: 24px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .gp-nav-pill-btn.active {
          background: #1a73e8;
          color: #ffffff;
          font-weight: 600;
        }

        .pill-label {
          font-size: 13px;
        }

        .gp-nav-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: #94a3b8;
          padding: 8px 12px;
          border-radius: 20px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .gp-nav-item.active {
          color: #ffffff;
          font-weight: 600;
        }

        .gp-nav-item:hover {
          color: #ffffff;
        }

        .item-label {
          font-size: 13px;
        }

        /* AI Sparkle Action Button on right */
        .gp-ai-sparkle-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .gp-ai-sparkle-btn:hover {
          background: rgba(255, 255, 255, 0.16);
          transform: scale(1.05);
        }

        .gp-ai-sparkle-btn.active {
          background: linear-gradient(135deg, #f43f5e 0%, #a855f7 100%);
          border-color: rgba(244, 63, 94, 0.6);
          box-shadow: 0 0 14px rgba(244, 63, 94, 0.5);
        }

        :global(.ai-btn-sparkle) {
          color: #ffffff;
        }

        @media (min-width: 1024px) {
          .gp-bottom-nav {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
}
