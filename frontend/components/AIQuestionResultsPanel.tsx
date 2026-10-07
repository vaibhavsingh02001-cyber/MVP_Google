"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  DEMO_PHOTOS,
  DemoPhoto,
  ScoredCluster,
  scoreAndRankClusters,
} from "@/data/demo-photos";
import { getPhotoImageUrl } from "@/lib/api";
import {
  SparklesIcon,
  CheckIcon,
  CloseIcon,
  RefreshCwIcon,
} from "./Icons";

interface Message {
  id: string;
  sender: "agent" | "user";
  text: string;
  chips?: string[];
  step?: number;
  clusters?: ScoredCluster[];
  narrowingQuestion?: string;
  narrowingChips?: string[];
  foundPhoto?: DemoPhoto;
}

interface AIQuestionResultsPanelProps {
  onClose: () => void;
  onSelectFoundPhoto: (photo: DemoPhoto) => void;
  onHighlightPhoto?: (photoId: string | null) => void;
  initialQuery?: string;
}

function formatMonthYear(dateIso: string): string {
  try {
    const d = new Date(dateIso);
    if (!isNaN(d.getTime())) {
      const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];
      return `${months[d.getMonth()]} ${d.getFullYear()}`;
    }
  } catch {
    // fallback
  }
  return "Recently";
}

export function AIQuestionResultsPanel({
  onClose,
  onSelectFoundPhoto,
  onHighlightPhoto,
  initialQuery,
}: AIQuestionResultsPanelProps) {
  // Current conversational step: 1 (mood), 2 (timeline), 3 (clues), 4 (clusters & narrowing), 6 (found)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(true);
  const [inputText, setInputText] = useState<string>("");

  // Answers recorded across steps
  const [moodAnswer, setMoodAnswer] = useState<string>("");
  const [timelineAnswer, setTimelineAnswer] = useState<string>("");
  const [clueAnswer, setClueAnswer] = useState<string>("");
  const [narrowingAnswer, setNarrowingAnswer] = useState<string>("");

  // Cluster state & exclusions
  const [excludedClusterIds, setExcludedClusterIds] = useState<string[]>([]);
  const [activeClusters, setActiveClusters] = useState<ScoredCluster[]>([]);
  const [activeNarrowingQ, setActiveNarrowingQ] = useState<string>("");
  const [foundPhoto, setFoundPhoto] = useState<DemoPhoto | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Initial step 1 prompt with typing delay (750ms)
  useEffect(() => {
    setIsTyping(true);
    const timer = setTimeout(() => {
      setMessages([
        {
          id: "m-step-1",
          sender: "agent",
          step: 1,
          text: "Tell me anything you remember about the photo, even if it's fuzzy. Was it more of a happy, calm, or busy moment?",
          chips: [
            "Happy and loud",
            "Calm and quiet",
            "Busy and chaotic",
            "Not sure",
          ],
        },
      ]);
      setIsTyping(false);
    }, 750);
    return () => clearTimeout(timer);
  }, []);

  // Compute and update ranked clusters
  const refreshClusters = (
    nextMood = moodAnswer,
    nextTimeline = timelineAnswer,
    nextClue = clueAnswer,
    nextNarrow = narrowingAnswer,
    nextExcluded = excludedClusterIds
  ) => {
    const scored = scoreAndRankClusters(
      {
        moodAnswer: nextMood,
        timelineAnswer: nextTimeline,
        clueAnswer: nextClue,
        narrowingAnswer: nextNarrow,
      },
      nextExcluded
    );
    const top3 = scored.slice(0, 3);
    setActiveClusters(top3);

    // Pick narrowing question from top candidate
    if (top3.length > 0 && top3[0].narrowingClue) {
      setActiveNarrowingQ(top3[0].narrowingClue);
    } else {
      setActiveNarrowingQ("Was there water or snow in the background?");
    }
    return top3;
  };

  // Transition to next conversational step with typing simulation
  const handleUserAnswer = (answer: string) => {
    if (!answer.trim() || isTyping) return;

    const trimmed = answer.trim();
    const userMsgId = `user-${Date.now()}`;
    const nextMsgs: Message[] = [
      ...messages,
      { id: userMsgId, sender: "user", text: trimmed },
    ];
    setMessages(nextMsgs);
    setInputText("");
    setIsTyping(true);

    // STEP 1 -> STEP 2
    if (currentStep === 1) {
      setMoodAnswer(trimmed);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `agent-step-2`,
            sender: "agent",
            step: 2,
            text: "Got it. Roughly when was it? This year, last year, or a while ago?",
            chips: ["This year", "Last year", "A while ago", "No idea"],
          },
        ]);
        setCurrentStep(2);
        setIsTyping(false);
      }, 750);
    }
    // STEP 2 -> STEP 3
    else if (currentStep === 2) {
      setTimelineAnswer(trimmed);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `agent-step-3`,
            sender: "agent",
            step: 3,
            text: "What was around you? People, food, nature, or somewhere indoors?",
            chips: ["People", "Food", "Nature", "Indoors"],
          },
        ]);
        setCurrentStep(3);
        setIsTyping(false);
      }, 800);
    }
    // STEP 3 -> STEP 4 (Show clusters & Step 5 Narrowing Question)
    else if (currentStep === 3) {
      setClueAnswer(trimmed);
      setTimeout(() => {
        const topClusters = refreshClusters(moodAnswer, timelineAnswer, trimmed, "");
        const narrowingQ =
          topClusters.length > 0 && topClusters[0].narrowingClue
            ? topClusters[0].narrowingClue
            : "Was there water or snow in the background?";

        setMessages((prev) => [
          ...prev,
          {
            id: `agent-step-4`,
            sender: "agent",
            step: 4,
            text: "Based on what you shared, I grouped your memories into 3 likely moments. Which one feels closest?",
            clusters: topClusters,
            narrowingQuestion: narrowingQ,
            narrowingChips: [
              "Yes, definitely",
              "No, something else",
              "Not sure",
            ],
          },
        ]);
        setCurrentStep(4);
        setIsTyping(false);
      }, 900);
    }
    // STEP 5 Narrowing Answer
    else if (currentStep === 4) {
      setNarrowingAnswer(trimmed);
      setTimeout(() => {
        const updated = refreshClusters(
          moodAnswer,
          timelineAnswer,
          clueAnswer,
          trimmed,
          excludedClusterIds
        );
        setMessages((prev) => [
          ...prev,
          {
            id: `agent-narrowed-${Date.now()}`,
            sender: "agent",
            step: 4,
            text: "Updated recommendations based on your answer:",
            clusters: updated,
          },
        ]);
        setIsTyping(false);
      }, 700);
    }
  };

  // STEP 5 "Not this" handler: removes that group and reveals next-best one
  const handleNotThis = (clusterId: string) => {
    const nextExcluded = [...excludedClusterIds, clusterId];
    setExcludedClusterIds(nextExcluded);
    const updated = refreshClusters(
      moodAnswer,
      timelineAnswer,
      clueAnswer,
      narrowingAnswer,
      nextExcluded
    );

    setMessages((prev) => [
      ...prev,
      {
        id: `agent-not-this-${Date.now()}`,
        sender: "agent",
        step: 4,
        text: "Removed that group. Here is the next closest match:",
        clusters: updated,
      },
    ]);
  };

  // STEP 6 "This looks right" handler: highlights in gallery, opens lightbox, shows found message
  const handleThisLooksRight = (cluster: ScoredCluster) => {
    const targetPhoto = cluster.photos[0] || DEMO_PHOTOS[0];
    setFoundPhoto(targetPhoto);
    setCurrentStep(6);
    setIsTyping(true);

    if (onHighlightPhoto) {
      onHighlightPhoto(targetPhoto.id);
    }

    setTimeout(() => {
      const monthYear = formatMonthYear(targetPhoto.date);
      const foundText = `Found it. This looks like ${targetPhoto.title}, ${targetPhoto.place}, ${monthYear}.`;

      setMessages((prev) => [
        ...prev,
        {
          id: `agent-found-${Date.now()}`,
          sender: "agent",
          step: 6,
          text: foundText,
          foundPhoto: targetPhoto,
        },
      ]);
      setIsTyping(false);

      // Open in lightbox
      onSelectFoundPhoto(targetPhoto);
    }, 700);
  };

  // "Start over" button handler
  const handleStartOver = () => {
    setCurrentStep(1);
    setMoodAnswer("");
    setTimelineAnswer("");
    setClueAnswer("");
    setNarrowingAnswer("");
    setExcludedClusterIds([]);
    setActiveClusters([]);
    setFoundPhoto(null);
    if (onHighlightPhoto) {
      onHighlightPhoto(null);
    }

    setIsTyping(true);
    setTimeout(() => {
      setMessages([
        {
          id: `restart-${Date.now()}`,
          sender: "agent",
          step: 1,
          text: "Tell me anything you remember about the photo, even if it's fuzzy. Was it more of a happy, calm, or busy moment?",
          chips: [
            "Happy and loud",
            "Calm and quiet",
            "Busy and chaotic",
            "Not sure",
          ],
        },
      ]);
      setIsTyping(false);
    }, 600);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      handleUserAnswer(inputText.trim());
    }
  };

  return (
    <section className="recall-agent-panel" aria-label="Recall AI Conversational Assistant">
      {/* Top Header */}
      <div className="agent-header">
        <div className="agent-header-left">
          <div className="sparkle-avatar">
            <SparklesIcon size={18} />
          </div>
          <div className="agent-title-col">
            <div className="title-row">
              <h3 className="agent-title">Recall AI</h3>
              <span className="live-chip">Conversational Retrieval</span>
            </div>
            <p className="agent-subtitle">
              Finding photos from fuzzy human memories — no keywords required
            </p>
          </div>
        </div>

        <div className="agent-header-actions">
          <button
            type="button"
            className="header-icon-btn"
            onClick={handleStartOver}
            title="Start over"
          >
            <RefreshCwIcon size={15} />
            <span className="btn-label-text">Restart</span>
          </button>
          <button
            type="button"
            className="header-close-btn"
            onClick={onClose}
            aria-label="Close Recall AI panel"
          >
            <CloseIcon size={18} />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="chat-messages-container">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message-row ${msg.sender}`}>
            {msg.sender === "agent" && (
              <div className="message-avatar">
                <SparklesIcon size={14} />
              </div>
            )}

            <div className={`chat-bubble ${msg.sender}`}>
              <p className="bubble-text">{msg.text}</p>

              {/* Tappable Suggestion Chips */}
              {msg.chips && msg.chips.length > 0 && currentStep === msg.step && !isTyping && (
                <div className="chips-wrapper">
                  {msg.chips.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="suggestion-chip"
                      onClick={() => handleUserAnswer(chip)}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              {/* Step 4 & 5: Ranked Groups Display */}
              {msg.clusters && msg.clusters.length > 0 && (
                <div className="clusters-container">
                  {msg.clusters.map((cluster) => (
                    <div key={cluster.id} className="cluster-item-card">
                      <div className="cluster-header-line">
                        <div className="cluster-meta">
                          <h4 className="cluster-name">{cluster.name}</h4>
                          <p className="cluster-reason">{cluster.reason}</p>
                        </div>
                      </div>

                      {/* Photo Thumbnail Strip */}
                      <div className="cluster-thumbnails-row">
                        {cluster.photos.map((photo) => (
                          <div
                            key={photo.id}
                            className="thumb-wrapper"
                            onClick={() => onSelectFoundPhoto(photo)}
                            title={`Click to preview: ${photo.title}`}
                          >
                            <img
                              src={photo.src || (photo as any).url || ""}
                              alt={photo.title}
                              className="thumb-image"
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Cluster Decision Action Buttons */}
                      <div className="cluster-actions-row">
                        <button
                          type="button"
                          className="btn-not-this"
                          onClick={() => handleNotThis(cluster.id)}
                        >
                          ✕ Not this
                        </button>
                        <button
                          type="button"
                          className="btn-this-looks-right"
                          onClick={() => handleThisLooksRight(cluster)}
                        >
                          <CheckIcon size={14} />
                          This looks right
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Step 5 Narrowing Question inside cluster card message */}
                  {msg.narrowingQuestion && currentStep === 4 && !isTyping && (
                    <div className="narrowing-question-box">
                      <div className="narrowing-prompt-row">
                        <span className="narrow-badge">Narrowing clue:</span>
                        <p className="narrow-text">{msg.narrowingQuestion}</p>
                      </div>
                      {msg.narrowingChips && (
                        <div className="narrow-chips-list">
                          {msg.narrowingChips.map((chip, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="suggestion-chip narrow"
                              onClick={() => handleUserAnswer(chip)}
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 6 Found Photo Card & Start Over */}
              {msg.foundPhoto && (
                <div className="found-photo-preview-card">
                  <div
                    className="found-photo-thumb"
                    onClick={() => onSelectFoundPhoto(msg.foundPhoto!)}
                  >
                    <img
                      src={msg.foundPhoto.src || (msg.foundPhoto as any).url || ""}
                      alt={msg.foundPhoto.title}
                      className="found-img"
                    />
                    <div className="found-tag-badge">
                      <span>✓ Best Match Highlighted</span>
                    </div>
                  </div>
                  <div className="found-card-details">
                    <h5 className="found-card-title">{msg.foundPhoto.title}</h5>
                    <p className="found-card-meta">
                      📍 {msg.foundPhoto.place} • 📅 {formatMonthYear(msg.foundPhoto.date)}
                    </p>
                    <div className="found-btn-row">
                      <button
                        type="button"
                        className="btn-open-lightbox"
                        onClick={() => onSelectFoundPhoto(msg.foundPhoto!)}
                      >
                        Open Fullscreen Lightbox
                      </button>
                      <button
                        type="button"
                        className="btn-restart-search"
                        onClick={handleStartOver}
                      >
                        Start over
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator (600-900ms) */}
        {isTyping && (
          <div className="chat-message-row agent typing-row">
            <div className="message-avatar">
              <SparklesIcon size={14} />
            </div>
            <div className="chat-bubble agent typing-bubble">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Free-Text Input Bar at Bottom */}
      <form onSubmit={handleFormSubmit} className="chat-input-bar">
        <input
          ref={inputRef}
          type="text"
          className="chat-text-input"
          placeholder={
            currentStep === 1
              ? "e.g. 'calm sunset', 'busy party with lots of music'..."
              : currentStep === 2
              ? "e.g. 'about last year', 'two years ago'..."
              : currentStep === 3
              ? "e.g. 'we were eating hot momos and chai outdoors'..."
              : "Type any other memory clue..."
          }
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isTyping}
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={!inputText.trim() || isTyping}
          aria-label="Send answer"
        >
          <span>Send</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>

      <style jsx>{`
        .recall-agent-panel {
          background: #ffffff;
          border: 1px solid #d3e3fd;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: all 0.25s ease;
        }

        /* Header */
        .agent-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          background: #f0f4f9;
          border-bottom: 1px solid #e0e2ec;
        }

        .agent-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sparkle-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1a73e8, #7c3aed);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(26, 115, 232, 0.3);
        }

        .agent-title-col {
          display: flex;
          flex-direction: column;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .agent-title {
          font-size: 16px;
          font-weight: 600;
          color: #1f1f1f;
          margin: 0;
        }

        .live-chip {
          font-size: 11px;
          font-weight: 500;
          color: #0b57d0;
          background: #c2e7ff;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .agent-subtitle {
          font-size: 12px;
          color: #444746;
          margin: 2px 0 0 0;
        }

        .agent-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-icon-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #ffffff;
          border: 1px solid #c4c7c5;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 500;
          color: #1f1f1f;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .header-icon-btn:hover {
          background: #e9eef6;
        }

        .header-close-btn {
          width: 32px;
          height: 32px;
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

        .header-close-btn:hover {
          background: #e0e2ec;
          color: #1f1f1f;
        }

        /* Messages Container */
        .chat-messages-container {
          padding: 20px;
          max-height: 440px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: #ffffff;
        }

        .chat-message-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          width: 100%;
        }

        .chat-message-row.user {
          justify-content: flex-end;
        }

        .message-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #e8f0fe;
          color: #1a73e8;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 4px;
        }

        .chat-bubble {
          max-width: 85%;
          padding: 12px 16px;
          border-radius: 18px;
          font-size: 14px;
          line-height: 1.5;
        }

        .chat-bubble.agent {
          background: #f0f4f9;
          color: #1f1f1f;
          border-top-left-radius: 4px;
        }

        .chat-bubble.user {
          background: #c2e7ff;
          color: #001d35;
          border-top-right-radius: 4px;
          font-weight: 500;
        }

        .bubble-text {
          margin: 0;
        }

        /* Suggestion Chips */
        .chips-wrapper {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .suggestion-chip {
          padding: 7px 14px;
          background: #ffffff;
          border: 1px solid #747775;
          color: #1f1f1f;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          user-select: none;
        }

        .suggestion-chip:hover {
          background: #e8f0fe;
          border-color: #0b57d0;
          color: #0b57d0;
          transform: translateY(-1px);
        }

        /* Typing Bubble */
        .typing-bubble {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 12px 18px;
          width: fit-content;
        }

        .typing-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #0b57d0;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .typing-dot:nth-child(1) {
          animation-delay: -0.32s;
        }
        .typing-dot:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.4;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        /* Clusters Container */
        .clusters-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 14px;
          width: 100%;
        }

        .cluster-item-card {
          background: #ffffff;
          border: 1px solid #c4c7c5;
          border-radius: 14px;
          padding: 14px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
          transition: border-color 0.15s ease;
        }

        .cluster-item-card:hover {
          border-color: #0b57d0;
        }

        .cluster-header-line {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .cluster-name {
          font-size: 15px;
          font-weight: 600;
          color: #1f1f1f;
          margin: 0;
        }

        .cluster-reason {
          font-size: 12px;
          color: #444746;
          margin: 2px 0 0 0;
        }

        .cluster-thumbnails-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 6px;
        }

        .thumb-wrapper {
          position: relative;
          width: 72px;
          height: 72px;
          border-radius: 8px;
          overflow: hidden;
          flex-shrink: 0;
          cursor: pointer;
          background: #e0e2ec;
          border: 1px solid rgba(0, 0, 0, 0.06);
          transition: transform 0.15s ease;
        }

        .thumb-wrapper:hover {
          transform: scale(1.05);
        }

        .thumb-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cluster-actions-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px solid #f0f4f9;
        }

        .btn-not-this {
          padding: 6px 12px;
          background: transparent;
          border: 1px solid #747775;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 500;
          color: #444746;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-not-this:hover {
          background: #fde8e8;
          border-color: #ba1a1a;
          color: #ba1a1a;
        }

        .btn-this-looks-right {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: #0b57d0;
          border: none;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 500;
          color: #ffffff;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .btn-this-looks-right:hover {
          background: #0842a0;
        }

        /* Narrowing Question Box */
        .narrowing-question-box {
          background: #e8f0fe;
          border-radius: 12px;
          padding: 12px 14px;
          margin-top: 6px;
        }

        .narrowing-prompt-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .narrow-badge {
          font-size: 11px;
          font-weight: 600;
          color: #0b57d0;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .narrow-text {
          font-size: 13px;
          font-weight: 500;
          color: #1f1f1f;
          margin: 0;
        }

        .narrow-chips-list {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        /* Found Photo Preview Card */
        .found-photo-preview-card {
          margin-top: 14px;
          background: #ffffff;
          border: 2px solid #0b57d0;
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 16px rgba(11, 87, 208, 0.18);
        }

        .found-photo-thumb {
          position: relative;
          width: 100%;
          height: 180px;
          cursor: pointer;
          background: #1e1f20;
        }

        .found-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .found-tag-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          background: #0b57d0;
          color: #ffffff;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 12px;
        }

        .found-card-details {
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .found-card-title {
          font-size: 16px;
          font-weight: 600;
          color: #1f1f1f;
          margin: 0;
        }

        .found-card-meta {
          font-size: 13px;
          color: #444746;
          margin: 0;
        }

        .found-btn-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 10px;
        }

        .btn-open-lightbox {
          flex: 1;
          padding: 8px 14px;
          background: #0b57d0;
          color: #ffffff;
          border: none;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .btn-open-lightbox:hover {
          background: #0842a0;
        }

        .btn-restart-search {
          padding: 8px 16px;
          background: transparent;
          border: 1px solid #747775;
          color: #1f1f1f;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .btn-restart-search:hover {
          background: #f0f4f9;
        }

        /* Bottom Free-Text Input Bar */
        .chat-input-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #f0f4f9;
          border-top: 1px solid #e0e2ec;
        }

        .chat-text-input {
          flex: 1;
          height: 42px;
          padding: 0 16px;
          border-radius: 24px;
          border: 1px solid #c4c7c5;
          background: #ffffff;
          font-size: 14px;
          color: #1f1f1f;
          outline: none;
          transition: border-color 0.15s ease;
        }

        .chat-text-input:focus {
          border-color: #0b57d0;
          box-shadow: 0 0 0 1px #0b57d0;
        }

        .chat-send-btn {
          height: 42px;
          padding: 0 16px;
          border-radius: 24px;
          background: #0b57d0;
          border: none;
          color: #ffffff;
          font-size: 13px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: background 0.15s ease, opacity 0.15s ease;
        }

        .chat-send-btn:hover:not(:disabled) {
          background: #0842a0;
        }

        .chat-send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Responsive Mobile Styles */
        @media (max-width: 640px) {
          .recall-agent-panel {
            border-radius: 14px;
            margin-bottom: 16px;
          }

          .agent-header {
            padding: 10px 14px;
          }

          .agent-subtitle {
            display: none;
          }

          .chat-messages-container {
            padding: 14px;
            max-height: 380px;
          }

          .chat-bubble {
            max-width: 95%;
            font-size: 13px;
          }

          .btn-label-text {
            display: none;
          }

          .cluster-item-card {
            padding: 10px;
          }

          .found-photo-thumb {
            height: 140px;
          }

          .found-btn-row {
            flex-direction: column;
            width: 100%;
          }

          .btn-open-lightbox, .btn-restart-search {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </section>
  );
}
