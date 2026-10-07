"use client";

import React, { useState } from "react";
import { Question } from "@/lib/types";
import { SparklesIcon, ChevronRightIcon } from "./Icons";

interface AnswerChipsProps {
  question: Question;
  turnCount: number;
  maxTurns?: number;
  onSelectAnswer: (answer: string) => void;
  disabled?: boolean;
}

export function AnswerChips({
  question,
  turnCount,
  maxTurns = 3,
  onSelectAnswer,
  disabled = false,
}: AnswerChipsProps) {
  const [customText, setCustomText] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const handleChipClick = (chip: string) => {
    if (disabled) return;
    onSelectAnswer(chip);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim() || disabled) return;
    onSelectAnswer(customText.trim());
    setCustomText("");
  };

  return (
    <div className="question-panel-card">
      <div className="question-header">
        <div className="turn-pill">
          <SparklesIcon size={14} className="question-sparkle" />
          <span>Narrowing Question</span>
          <span className="turn-counter">
            {turnCount} / {maxTurns}
          </span>
        </div>
      </div>

      <div className="question-prompt-box">
        <h4 className="question-text">{question.question_text}</h4>
      </div>

      <div className="chips-container">
        {question.answer_chips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            className="answer-chip"
            onClick={() => handleChipClick(chip)}
            disabled={disabled}
          >
            <span>{chip}</span>
          </button>
        ))}

        {!showCustom && (
          <button
            type="button"
            className="answer-chip custom-chip"
            onClick={() => setShowCustom(true)}
            disabled={disabled}
          >
            <span>+ Type custom answer...</span>
          </button>
        )}
      </div>

      {showCustom && (
        <form onSubmit={handleCustomSubmit} className="custom-answer-form">
          <input
            type="text"
            className="custom-answer-input"
            placeholder="Type your clarification..."
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            disabled={disabled}
            autoFocus
          />
          <button
            type="submit"
            className="custom-submit-btn"
            disabled={!customText.trim() || disabled}
          >
            <span>Answer</span>
            <ChevronRightIcon size={14} />
          </button>
        </form>
      )}

      <style jsx>{`
        .question-panel-card {
          background: linear-gradient(
            135deg,
            rgba(30, 41, 69, 0.85) 0%,
            rgba(20, 29, 48, 0.9) 100%
          );
          border: 1px solid rgba(56, 189, 248, 0.35);
          border-radius: var(--radius-md);
          padding: 20px 22px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.15);
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .question-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .turn-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(56, 189, 248, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.3);
          color: #7dd3fc;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 4px 10px;
          border-radius: var(--radius-full);
        }

        :global(.question-sparkle) {
          color: #38bdf8;
        }

        .turn-counter {
          color: var(--text-muted);
          font-size: 10px;
          border-left: 1px solid rgba(56, 189, 248, 0.3);
          padding-left: 6px;
          margin-left: 2px;
        }

        .question-prompt-box {
          padding-right: 12px;
        }

        .question-text {
          font-size: 18px;
          font-weight: 600;
          color: #f8fafc;
          line-height: 1.35;
          letter-spacing: -0.01em;
        }

        .chips-container {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }

        .answer-chip {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #e2e8f0;
          border-radius: var(--radius-full);
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .answer-chip:hover:not(:disabled) {
          background: rgba(56, 189, 248, 0.2);
          border-color: rgba(56, 189, 248, 0.5);
          color: #38bdf8;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(56, 189, 248, 0.25);
        }

        .answer-chip:active:not(:disabled) {
          transform: scale(0.96);
        }

        .answer-chip:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .custom-chip {
          border-style: dashed;
          color: var(--text-secondary);
        }

        .custom-answer-form {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }

        .custom-answer-input {
          flex: 1;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(56, 189, 248, 0.4);
          border-radius: var(--radius-full);
          padding: 8px 16px;
          font-size: 13px;
          color: var(--text-main);
          font-family: inherit;
          outline: none;
        }

        .custom-answer-input:focus {
          box-shadow: 0 0 12px rgba(56, 189, 248, 0.3);
        }

        .custom-submit-btn {
          background: #0284c7;
          border: none;
          color: #ffffff;
          padding: 8px 16px;
          border-radius: var(--radius-full);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .custom-submit-btn:hover:not(:disabled) {
          background: #0369a1;
        }
      `}</style>
    </div>
  );
}
