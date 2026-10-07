"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Mode,
  Photo,
  Cluster,
  Question,
  FeedbackSignal,
  UIState,
  StoryAlbum,
} from "@/lib/types";
import {
  startSession,
  sendFeedback,
  confirmPhoto,
  setAnchor,
  fetchPhotoFeed,
} from "@/lib/api";
import { SearchBar } from "@/components/SearchBar";
import { GooglePhotosSidebar } from "@/components/GooglePhotosSidebar";
import { MemoriesCarousel } from "@/components/MemoriesCarousel";
import { GooglePhotosFeed } from "@/components/GooglePhotosFeed";
import { AIQuestionResultsPanel } from "@/components/AIQuestionResultsPanel";
import { PhotoGrid } from "@/components/PhotoGrid";
import { PhotoModal } from "@/components/PhotoModal";
import { AnchorPicker } from "@/components/AnchorPicker";
import { SuccessOverlay } from "@/components/SuccessOverlay";
import { UploadModal } from "@/components/UploadModal";
import { ExportModal } from "@/components/ExportModal";
import { HowItWorksModal } from "@/components/HowItWorksModal";
import { SessionLogger } from "@/components/SessionLogger";
import { BottomNavBar } from "@/components/BottomNavBar";
import { GooglePhotosEmptyHero } from "@/components/GooglePhotosEmptyHero";
import {
  GooglePhotosLogo,
  PlusIcon,
  HelpCircleIcon,
  SettingsIcon,
  GridAppsIcon,
  UserAvatarIcon,
  SparklesIcon,
  BannerSparkleIcon,
  CloseIcon,
} from "@/components/Icons";
import { DEMO_PHOTOS, DEMO_STORY_ALBUMS } from "@/data/demo-photos";

// Seed demo library photos (24 items across 8 themes)
const INITIAL_DEMO_PHOTOS: Photo[] = DEMO_PHOTOS as unknown as Photo[];
const INITIAL_DEMO_STORIES: StoryAlbum[] = DEMO_STORY_ALBUMS as unknown as StoryAlbum[];

export default function RecallApp() {
  // Session Identity & Mode
  const [sessionId, setSessionId] = useState<string>(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `sess-${Date.now()}`
  );
  const [mode, setMode] = useState<Mode>("recall");
  const [uiState, setUiState] = useState<UIState>("idle");
  const [activeSidebarItem, setActiveSidebarItem] = useState<string>("photos");
  const [showPersonalizedBanner, setShowPersonalizedBanner] = useState<boolean>(true);
  const [showEmptyHero, setShowEmptyHero] = useState<boolean>(false);

  // Recall Agent Modal / Inline Panel & Highlight
  const [isAgentOpen, setIsAgentOpen] = useState<boolean>(false);
  const [highlightedPhotoId, setHighlightedPhotoId] = useState<string | null>(null);

  // Gallery Feed State (Seeded with 24 demo photos)
  const [feedPhotos, setFeedPhotos] = useState<Photo[]>(INITIAL_DEMO_PHOTOS);
  const [feedStories, setFeedStories] = useState<StoryAlbum[]>(INITIAL_DEMO_STORIES);

  // Retrieval & Agent State
  const [lastClue, setLastClue] = useState<string>("");
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [turnsUsed, setTurnsUsed] = useState<number>(0);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [confidence, setConfidence] = useState<string>("medium");
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Modals & Overlays
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [anchorTargetPhoto, setAnchorTargetPhoto] = useState<Photo | null>(null);
  const [confirmedPhoto, setConfirmedPhoto] = useState<Photo | null>(null);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showHowModal, setShowHowModal] = useState<boolean>(false);
  const [isAnchorLoading, setIsAnchorLoading] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  // Excluded Photo IDs accumulated across turns
  const [excludedIds, setExcludedIds] = useState<string[]>([]);

  // Fetch initial Google Photos feed from backend
  useEffect(() => {
    let isMounted = true;
    fetchPhotoFeed()
      .then((data) => {
        if (!isMounted) return;
        if (data.photos && data.photos.length > 0) {
          setFeedPhotos(data.photos);
        }
        if (data.stories && data.stories.length > 0) {
          setFeedStories(data.stories);
        }
      })
      .catch((err) => {
        console.warn("Using fallback demo library:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Collect all unique photos across all clusters
  const allUniquePhotos = useMemo(() => {
    const map = new Map<string, Photo>();
    for (const cluster of clusters) {
      for (const p of cluster.photos || []) {
        if (!map.has(p.id)) {
          map.set(p.id, p);
        }
      }
    }
    return Array.from(map.values());
  }, [clusters]);

  // Reset current session
  const handleReset = useCallback(() => {
    const newId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `sess-${Date.now()}`;
    setSessionId(newId);
    setUiState("idle");
    setLastClue("");
    setClusters([]);
    setQuestion(null);
    setTurnsUsed(0);
    setIsStreaming(false);
    setConfidence("medium");
    setElapsedMs(0);
    setErrorMessage("");
    setSelectedPhoto(null);
    setAnchorTargetPhoto(null);
    setConfirmedPhoto(null);
    setExcludedIds([]);
    setActiveSidebarItem("photos");
    setShowEmptyHero(false);
    setIsAgentOpen(false);
    setHighlightedPhotoId(null);
  }, []);

  // Handle Search / Retrieval Session
  const handleSearch = useCallback(
    async (clue: string) => {
      setLastClue(clue);
      setUiState("searching");
      setShowEmptyHero(false);
      setIsStreaming(true);
      setClusters([]);
      setQuestion(null);
      setTurnsUsed(1);
      setErrorMessage("");

      try {
        const stream = startSession(clue, mode, sessionId);
        let foundAny = false;

        for await (const event of stream) {
          if (event.type === "error") {
            setErrorMessage(event.message || "Retrieval error occurred.");
            setUiState("error");
            setIsStreaming(false);
            return;
          }

          if (event.type === "cluster" && event.cluster) {
            foundAny = true;
            setClusters((prev) => [...prev, event.cluster!]);
            setUiState("clusters_shown");
          }

          if (event.type === "question" && event.question) {
            setQuestion(event.question);
          }

          if (event.type === "done") {
            if (event.elapsed_ms) setElapsedMs(event.elapsed_ms);
            if (event.confidence) setConfidence(event.confidence);
            setIsStreaming(false);
            setUiState("clusters_shown");
          }
        }

        if (!foundAny && mode === "recall") {
          setIsStreaming(false);
          setUiState("clusters_shown");
        }
      } catch (err: any) {
        setErrorMessage(
          err?.message ||
            "Failed to connect to Recall backend at " +
              (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
        );
        setUiState("error");
        setIsStreaming(false);
      }
    },
    [mode, sessionId]
  );

  // Handle User Feedback Reaction / Answer Chip Selection
  const handleFeedback = useCallback(
    async (signal: FeedbackSignal, idsToExclude: string[], answer?: string) => {
      setUiState("refining");
      const nextExcluded = Array.from(new Set([...excludedIds, ...idsToExclude]));
      setExcludedIds(nextExcluded);

      try {
        const result = await sendFeedback(
          sessionId,
          signal,
          nextExcluded,
          answer,
          ""
        );

        setClusters(result.clusters || []);
        const nextTurns = turnsUsed + 1;
        setTurnsUsed(nextTurns);
        if (nextTurns < 3) {
          setQuestion(result.question || null);
        } else {
          setQuestion(null);
        }

        setUiState("clusters_shown");
      } catch (err: any) {
        console.error("Feedback failed:", err);
        setUiState("clusters_shown");
      }
    },
    [sessionId, excludedIds, turnsUsed]
  );

  const handleSelectAnswer = useCallback(
    async (answerText: string) => {
      await handleFeedback("more_like_this", [], answerText);
    },
    [handleFeedback]
  );

  // Handle Timeline Anchor Selection
  const handleApplyAnchor = useCallback(
    async (photo: Photo, relation: "before" | "after" | "same_day") => {
      setIsAnchorLoading(true);
      try {
        await setAnchor(sessionId, photo.id, relation);
        setAnchorTargetPhoto(null);
        await handleFeedback(
          "more_like_this",
          [],
          `Timeline anchor: ${relation} ${photo.caption || photo.filename}`
        );
      } catch (err: any) {
        console.error("Anchor setting error:", err);
      } finally {
        setIsAnchorLoading(false);
      }
    },
    [sessionId, handleFeedback]
  );

  // Handle Confirmation ("That's it!")
  const handleConfirm = useCallback(
    async (photo: Photo) => {
      setIsConfirming(true);
      try {
        await confirmPhoto(sessionId, photo.id, "found");
        setConfirmedPhoto(photo);
        setUiState("confirmed");
        setSelectedPhoto(null);
      } catch (err: any) {
        console.error("Confirmation error:", err);
        setConfirmedPhoto(photo);
        setUiState("confirmed");
      } finally {
        setIsConfirming(false);
      }
    },
    [sessionId]
  );

  return (
    <div className="google-photos-app">
      {/* Telemetry Logger */}
      <SessionLogger
        sessionId={sessionId}
        isConfirmed={uiState === "confirmed"}
      />

      {/* Top Google Photos Header */}
      <header className="gp-app-header">
        <div className="gp-header-left">
          <div
            className="gp-brand"
            onClick={handleReset}
            role="button"
            tabIndex={0}
          >
            <GooglePhotosLogo size={32} />
            <span className="gp-brand-title">Google Photos</span>
          </div>
        </div>

        {/* Center: Search Bar with AI Option ON THE RIGHT */}
        <div className="gp-header-center">
          <SearchBar
            onSearch={(clue) => {
              setIsAgentOpen(true);
              handleSearch(clue);
            }}
            onOpenAgent={() => {
              setIsAgentOpen(true);
            }}
            isLoading={uiState === "searching" || uiState === "refining"}
            mode={mode}
            onModeChange={(newMode) => setMode(newMode)}
            value={lastClue}
          />
        </div>

        {/* Right Header Icons: +, ?, Settings, Apps, Avatar */}
        <div className="gp-header-right">
          <button
            type="button"
            className="gp-round-icon-btn"
            onClick={() => setShowUploadModal(true)}
            title="Upload or create"
          >
            <PlusIcon size={20} />
          </button>

          <button
            type="button"
            className="gp-round-icon-btn"
            onClick={() => setShowHowModal(true)}
            title="Help & Feedback"
          >
            <HelpCircleIcon size={20} />
          </button>

          <button
            type="button"
            className="gp-round-icon-btn"
            onClick={() => setShowExportModal(true)}
            title="Export evaluation session logs"
          >
            <SettingsIcon size={20} />
          </button>

          <button
            type="button"
            className="gp-round-icon-btn hide-mobile"
            title="Google apps"
          >
            <GridAppsIcon size={20} />
          </button>

          <div className="gp-avatar-wrap" title="Google Account">
            <UserAvatarIcon size={32} />
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar + Feed */}
      <div className="gp-body-layout">
        {/* Left Sidebar matching screenshot */}
        <GooglePhotosSidebar
          activeItem={activeSidebarItem}
          onSelectItem={(item) => {
            setActiveSidebarItem(item);
            if (item === "photos") {
              setUiState("idle");
              setShowEmptyHero(true);
            }
          }}
          isOpen={true}
        />

        {/* Main Content Area */}
        <main className="gp-main-view">
          {/* Personalized Banner (shown in screenshot) */}
          {showPersonalizedBanner && uiState === "idle" && (
            <div className="personalized-banner">
              <div className="banner-left">
                <BannerSparkleIcon size={18} className="banner-sparkle" />
                <span className="banner-text">
                  Your Photos experience is now more personalized.{" "}
                  <button
                    type="button"
                    className="banner-link"
                    onClick={() => setShowHowModal(true)}
                  >
                    Manage settings.
                  </button>
                </span>
              </div>
              <button
                type="button"
                className="banner-close"
                onClick={() => setShowPersonalizedBanner(false)}
                aria-label="Dismiss banner"
              >
                <CloseIcon size={18} />
              </button>
            </div>
          )}

          {/* Exact Google Photos Empty Hero State (optional) */}
          {activeSidebarItem === "photos" && uiState === "idle" && showEmptyHero && (
            <GooglePhotosEmptyHero
              onUploadClick={() => setShowUploadModal(true)}
              onExploreDemo={() => setShowEmptyHero(false)}
            />
          )}

          {/* RECALL AI: Scripted, Deterministic Conversational Agent Panel */}
          {isAgentOpen && (
            <AIQuestionResultsPanel
              onClose={() => setIsAgentOpen(false)}
              onSelectFoundPhoto={(photo) => {
                setHighlightedPhotoId(photo.id);
                setSelectedPhoto(photo as unknown as Photo);
              }}
              onHighlightPhoto={(photoId) => setHighlightedPhotoId(photoId)}
              initialQuery={lastClue}
            />
          )}

          {/* Gallery View: Stories Carousel + Chronological Photo Feed (Seeded with 24 photos) */}
          {activeSidebarItem === "photos" && !showEmptyHero && (
            <div className="gp-feed-container">
              {/* Return to welcome/empty screen toggle */}
              <div className="feed-header-toolbar">
                <button
                  type="button"
                  className="btn-return-welcome"
                  onClick={() => setShowEmptyHero(true)}
                >
                  ← Show welcome empty state
                </button>
              </div>

              {/* Top Stories / Memories Carousel */}
              <MemoriesCarousel
                stories={feedStories}
                onSelectStory={(story) => {
                  if (story.photos && story.photos.length > 0) {
                    setSelectedPhoto(story.photos[0]);
                  }
                }}
                onSelectPhoto={(photo) => setSelectedPhoto(photo)}
              />

              {/* Photos Gallery Feed */}
              <GooglePhotosFeed
                photos={feedPhotos}
                onPhotoClick={(p) => setSelectedPhoto(p)}
                onConfirm={handleConfirm}
                onAnchor={(p) => setAnchorTargetPhoto(p)}
                highlightedPhotoId={highlightedPhotoId}
              />
            </div>
          )}

          {/* Collections / Albums view */}
          {activeSidebarItem !== "photos" && (
            <div className="collections-view">
              <h2 className="collections-title">{activeSidebarItem.toUpperCase()}</h2>
              <div className="collections-grid">
                {feedStories.map((story) => (
                  <div
                    key={story.id}
                    className="collection-card"
                    onClick={() => {
                      if (story.photos && story.photos.length > 0) {
                        setSelectedPhoto(story.photos[0]);
                      }
                    }}
                  >
                    <div className="collection-thumb">
                      <img
                        src={story.cover_photo.url || "/images/" + story.cover_photo.filename}
                        alt={story.title}
                        className="collection-img"
                      />
                    </div>
                    <h4 className="collection-name">{story.title}</h4>
                    <span className="collection-sub">{story.photo_count} photos</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Bottom Mobile Navigation */}
      <BottomNavBar
        activeTab={activeSidebarItem}
        onTabChange={(tab) => {
          setActiveSidebarItem(tab);
          if (tab === "photos") setUiState("idle");
        }}
        onOpenRecallAI={() => {
          setMode("recall");
          setIsAgentOpen(true);
          const searchInput = document.getElementById("google-photos-search-input");
          searchInput?.focus();
        }}
        isAIActive={mode === "recall"}
      />

      {/* Lightbox Photo View Modal */}
      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onConfirm={handleConfirm}
          onOpenAnchor={(p) => {
            setSelectedPhoto(null);
            setAnchorTargetPhoto(p);
          }}
          onFeedback={handleFeedback}
          isConfirming={isConfirming}
        />
      )}

      {/* Anchor Selection Modal */}
      {anchorTargetPhoto && (
        <AnchorPicker
          photo={anchorTargetPhoto}
          onClose={() => setAnchorTargetPhoto(null)}
          onSetAnchor={handleApplyAnchor}
          isLoading={isAnchorLoading}
        />
      )}

      {/* Success Confirmed Celebration Overlay */}
      {confirmedPhoto && uiState === "confirmed" && (
        <SuccessOverlay
          photo={confirmedPhoto}
          turnsUsed={turnsUsed}
          elapsedMs={elapsedMs}
          onReset={handleReset}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          sessionId={sessionId}
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={(photo) => {
            setSelectedPhoto(photo);
            setShowEmptyHero(false);
            setFeedPhotos((prev) => [photo, ...prev]);
          }}
        />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          sessionId={sessionId}
          onClose={() => setShowExportModal(false)}
          onClearSession={handleReset}
        />
      )}

      {/* How It Works Modal */}
      {showHowModal && (
        <HowItWorksModal
          onClose={() => setShowHowModal(false)}
          onSelectSampleClue={(clue) => handleSearch(clue)}
        />
      )}

      <style jsx>{`
        .google-photos-app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #ffffff;
          color: #1f1f1f;
        }

        /* Top Google Photos Header */
        .gp-app-header {
          position: sticky;
          top: 0;
          z-index: 100;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          background: #ffffff;
          border-bottom: 1px solid #e0e2ec;
          gap: 16px;
        }

        .gp-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 220px;
        }

        .gp-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          user-select: none;
        }

        .gp-brand-title {
          font-size: 20px;
          font-weight: 500;
          color: #1f1f1f;
          letter-spacing: -0.01em;
        }

        .gp-header-center {
          flex: 1;
          display: flex;
          justify-content: center;
          max-width: 820px;
        }

        .gp-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 220px;
          justify-content: flex-end;
        }

        .gp-round-icon-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: transparent;
          border: none;
          color: #444746;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .gp-round-icon-btn:hover {
          background: #f0f4f9;
          color: #1f1f1f;
        }

        .gp-avatar-wrap {
          cursor: pointer;
          display: flex;
          align-items: center;
          margin-left: 4px;
        }

        /* Body Layout */
        .gp-body-layout {
          display: flex;
          flex: 1;
          min-height: calc(100vh - 64px);
        }

        .gp-main-view {
          flex: 1;
          padding: 16px 24px 84px 24px;
          overflow-y: auto;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        /* Top Personalized Banner */
        .personalized-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #d3e3fd;
          border-radius: 28px;
          padding: 12px 20px;
          margin-bottom: 20px;
          color: #041e49;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          animation: slideUp 0.2s ease-out;
        }

        .banner-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        :global(.banner-sparkle) {
          color: #041e49;
        }

        .banner-text {
          font-size: 14px;
          font-weight: 500;
        }

        .banner-link {
          background: none;
          border: none;
          color: #0b57d0;
          font-weight: 600;
          text-decoration: underline;
          cursor: pointer;
          font-size: 14px;
          padding: 0;
        }

        .banner-close {
          background: none;
          border: none;
          color: #041e49;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .banner-close:hover {
          background: rgba(0, 0, 0, 0.08);
        }

        .gp-feed-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .feed-header-toolbar {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          margin-bottom: 4px;
        }

        .btn-return-welcome {
          background: #f0f4f9;
          border: 1px solid #d3e3fd;
          color: #0b57d0;
          padding: 6px 14px;
          border-radius: 16px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-return-welcome:hover {
          background: #e2ecfd;
        }

        .gp-error-box {
          background: #fce8e6;
          border: 1px solid #f28b82;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 20px;
        }

        .error-title {
          color: #c5221f;
          font-size: 15px;
          font-weight: 600;
        }

        .error-desc {
          color: #374151;
          font-size: 13px;
        }

        .btn-retry-search {
          background: #d93025;
          border: none;
          color: #ffffff;
          padding: 6px 14px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          width: fit-content;
        }

        .collections-view {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .collections-title {
          font-size: 20px;
          font-weight: 600;
          color: #1f1f1f;
        }

        .collections-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
          gap: 16px;
        }

        .collection-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
          cursor: pointer;
        }

        .collection-thumb {
          aspect-ratio: 1 / 1;
          border-radius: 16px;
          overflow: hidden;
          background: #e0e2ec;
        }

        .collection-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s ease;
        }

        .collection-card:hover .collection-img {
          transform: scale(1.04);
        }

        .collection-name {
          font-size: 14px;
          font-weight: 500;
          color: #1f1f1f;
        }

        .collection-sub {
          font-size: 12px;
          color: #747775;
        }

        @media (max-width: 768px) {
          .gp-main-view {
            padding: 12px 12px 90px 12px;
          }
          .hide-mobile {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
