"use client";

import React, { useState } from "react";
import { StoryAlbum, Photo } from "@/lib/types";
import { getPhotoImageUrl, getPhotoFallbackSvg } from "@/lib/api";
import { SparklesIcon, ChevronLeftIcon, ChevronRightIcon } from "./Icons";

interface MemoriesCarouselProps {
  stories: StoryAlbum[];
  onSelectStory?: (story: StoryAlbum) => void;
  onSelectPhoto?: (photo: Photo) => void;
}

export function MemoriesCarousel({
  stories,
  onSelectStory,
  onSelectPhoto,
}: MemoriesCarouselProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [activeStory, setActiveStory] = useState<StoryAlbum | null>(null);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = direction === "left" ? -320 : 320;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  if (!stories || stories.length === 0) {
    return null;
  }

  return (
    <section className="memories-section" aria-label="Memories and Highlights">
      <div className="memories-header">
        <div className="memories-title-group">
          <SparklesIcon size={16} className="sparkle-accent" />
          <span className="memories-heading">Memories</span>
        </div>
        <div className="scroll-buttons">
          <button
            type="button"
            className="scroll-btn"
            onClick={() => handleScroll("left")}
            aria-label="Scroll left"
          >
            <ChevronLeftIcon size={16} />
          </button>
          <button
            type="button"
            className="scroll-btn"
            onClick={() => handleScroll("right")}
            aria-label="Scroll right"
          >
            <ChevronRightIcon size={16} />
          </button>
        </div>
      </div>

      <div className="memories-carousel-track" ref={scrollRef}>
        {stories.map((story) => {
          const cover = story.cover_photo;
          const imageUrl = cover ? getPhotoImageUrl(cover) : "";
          const fallback = cover ? getPhotoFallbackSvg(cover) : "";

          return (
            <div
              key={story.id}
              className="memory-card"
              onClick={() => {
                if (onSelectStory) onSelectStory(story);
                else if (cover && onSelectPhoto) onSelectPhoto(cover);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (onSelectStory) onSelectStory(story);
                  else if (cover && onSelectPhoto) onSelectPhoto(cover);
                }
              }}
            >
              <div className="memory-card-media">
                <img
                  src={imageUrl || fallback}
                  alt={story.title}
                  className="memory-img"
                  onError={(e) => {
                    if (fallback) {
                      (e.target as HTMLImageElement).src = fallback;
                    }
                  }}
                  loading="lazy"
                />
                <div className="memory-gradient-overlay" />
                <div className="memory-card-content">
                  <span className="memory-tag-pill">{story.subtitle || "Memory"}</span>
                  <h4 className="memory-title">{story.title}</h4>
                  <span className="memory-count">{story.photo_count} photos</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .memories-section {
          width: 100%;
          margin-bottom: 24px;
        }

        .memories-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          padding: 0 4px;
        }

        .memories-title-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        :global(.sparkle-accent) {
          color: #fb7185;
        }

        .memories-heading {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--text-secondary);
        }

        .scroll-buttons {
          display: flex;
          gap: 6px;
        }

        .scroll-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .scroll-btn:hover {
          background: rgba(255, 255, 255, 0.18);
          color: #ffffff;
        }

        .memories-carousel-track {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          padding-bottom: 8px;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .memories-carousel-track::-webkit-scrollbar {
          display: none;
        }

        .memory-card {
          flex: 0 0 160px;
          height: 230px;
          border-radius: 20px;
          overflow: hidden;
          position: relative;
          cursor: pointer;
          scroll-snap-align: start;
          transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s ease;
          border: 2px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
        }

        .memory-card:hover {
          transform: translateY(-4px) scale(1.02);
          border-color: rgba(251, 113, 133, 0.5);
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.5), 0 0 18px rgba(244, 63, 94, 0.25);
        }

        .memory-card-media {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .memory-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }

        .memory-card:hover .memory-img {
          transform: scale(1.08);
        }

        .memory-gradient-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(0, 0, 0, 0.2) 0%,
            transparent 40%,
            rgba(0, 0, 0, 0.4) 60%,
            rgba(0, 0, 0, 0.88) 100%
          );
        }

        .memory-card-content {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 14px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          z-index: 2;
        }

        .memory-tag-pill {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #fbcfe8;
          background: rgba(244, 63, 94, 0.35);
          backdrop-filter: blur(8px);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          width: fit-content;
        }

        .memory-title {
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.25;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .memory-count {
          font-size: 11px;
          color: #cbd5e1;
          opacity: 0.85;
        }

        @media (min-width: 768px) {
          .memory-card {
            flex: 0 0 190px;
            height: 270px;
            border-radius: 24px;
          }
          .memory-title {
            font-size: 16px;
          }
        }
      `}</style>
    </section>
  );
}
