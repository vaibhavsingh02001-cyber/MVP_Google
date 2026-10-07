"use client";

import React from "react";
import { SparklesIcon, CloseIcon, CheckIcon, LayersIcon, AnchorIcon } from "./Icons";

interface HowItWorksModalProps {
  onClose: () => void;
  onSelectSampleClue: (clue: string) => void;
}

const TEST_SCENARIOS = [
  {
    title: "The Kyoto Coffee Receipt",
    clue: "The coffee shop receipt in Kyoto",
    goal: "Locate paper receipt on wooden table among trip memories",
    expected: "Episode: Kyoto Cafes & Receipts (Nov 2023)",
  },
  {
    title: "Sick Week Medicine",
    clue: "Medicine from when I was sick",
    goal: "Find prescription box / cough syrup on bedside table",
    expected: "Episode: Sick Week & Pharmacy (Jan 2024)",
  },
  {
    title: "Resignation Screenshot",
    clue: "Screenshot around when I changed jobs",
    goal: "Find email draft or offer letter screenshot on laptop",
    expected: "Episode: Job Change & Resignation (Mar 2023)",
  },
  {
    title: "Cousin's Wedding Cake",
    clue: "Mom cutting cake under fairy lights",
    goal: "Find evening celebration photo with string lights",
    expected: "Episode: Cousin's Wedding Celebration (Dec 2023)",
  },
  {
    title: "Post-Beach Dinner",
    clue: "Picture after the beach day",
    goal: "Find seafood dinner photo taken at dusk right after beach",
    expected: "Episode: Beach Day Sunset & Seafood Patio",
  },
];

export function HowItWorksModal({ onClose, onSelectSampleClue }: HowItWorksModalProps) {
  const handleTryTask = (clue: string) => {
    onSelectSampleClue(clue);
    onClose();
  };

  return (
    <div className="how-modal-backdrop" onClick={onClose}>
      <div className="how-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="title-row">
            <SparklesIcon size={20} className="sparkle-icon" />
            <h3 className="modal-title">How Recall Works</h3>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close">
            <CloseIcon size={16} />
          </button>
        </div>

        <p className="modal-intro">
          Recall is an AI conversational detective for Google Photos. When you can&apos;t remember exact keywords, it uses chronological episodes and discriminating questions to pinpoint your photo in 3 turns or fewer.
        </p>

        {/* 3 Step Flow */}
        <div className="steps-grid">
          <div className="step-card">
            <span className="step-num">1</span>
            <h4 className="step-title">Describe Naturally</h4>
            <p className="step-desc">
              Type fuzzy temporal, spatial, or sensory clues like <em>&quot;rainy cafe in Kyoto&quot;</em> or <em>&quot;dinner after beach&quot;</em>.
            </p>
          </div>

          <div className="step-card">
            <span className="step-num">2</span>
            <h4 className="step-title">Episode Clusters</h4>
            <p className="step-desc">
              Candidates are grouped into 3–5 coherent life episodes with AI match reasoning explaining why they match.
            </p>
          </div>

          <div className="step-card">
            <span className="step-num">3</span>
            <h4 className="step-title">Narrow & Pivot</h4>
            <p className="step-desc">
              Answer quick chip questions, tap <strong>&quot;Not this&quot;</strong> to eliminate episodes, or set a photo as a <strong>Timeline Anchor</strong>.
            </p>
          </div>
        </div>

        {/* Evaluation Tasks */}
        <div className="tasks-section">
          <h4 className="section-title">5 Evaluation Tasks to Test (One-Click)</h4>
          <div className="tasks-list">
            {TEST_SCENARIOS.map((t, idx) => (
              <div key={idx} className="task-row">
                <div className="task-info">
                  <span className="task-name">{t.title}</span>
                  <span className="task-goal">{t.goal}</span>
                  <span className="task-expected">{t.expected}</span>
                </div>
                <button
                  type="button"
                  className="btn-try-clue"
                  onClick={() => handleTryTask(t.clue)}
                >
                  <span>Test Task {idx + 1}</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <span className="footer-notice">
            Research prototype built for Google Photos retrieval evaluation.
          </span>
          <button type="button" className="btn-got-it" onClick={onClose}>
            <CheckIcon size={16} />
            <span>Got It, Let&apos;s Search</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .how-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.82);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
          animation: fadeIn 0.25s ease-out;
        }

        .how-modal-card {
          width: 100%;
          max-width: 640px;
          max-height: 90vh;
          overflow-y: auto;
          background: rgba(18, 25, 42, 0.96);
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: var(--radius-lg);
          padding: 26px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.75);
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        :global(.sparkle-icon) {
          color: #38bdf8;
        }

        .modal-title {
          font-size: 19px;
          font-weight: 700;
          color: #f8fafc;
        }

        .btn-close {
          background: rgba(255, 255, 255, 0.08);
          border: none;
          color: var(--text-secondary);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .modal-intro {
          font-size: 13.5px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .step-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .step-num {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(56, 189, 248, 0.15);
          color: #38bdf8;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .step-title {
          font-size: 13px;
          font-weight: 600;
          color: #f8fafc;
        }

        .step-desc {
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .tasks-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .section-title {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #94a3b8;
        }

        .tasks-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .task-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
          gap: 12px;
        }

        .task-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow: hidden;
        }

        .task-name {
          font-size: 13px;
          font-weight: 600;
          color: #e2e8f0;
        }

        .task-goal {
          font-size: 11px;
          color: var(--text-secondary);
        }

        .task-expected {
          font-size: 10px;
          color: #38bdf8;
        }

        .btn-try-clue {
          background: rgba(56, 189, 248, 0.12);
          border: 1px solid rgba(56, 189, 248, 0.3);
          color: #7dd3fc;
          padding: 6px 12px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all var(--transition-fast);
        }

        .btn-try-clue:hover {
          background: #0284c7;
          color: #ffffff;
        }

        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          gap: 12px;
          flex-wrap: wrap;
        }

        .footer-notice {
          font-size: 11px;
          color: var(--text-muted);
        }

        .btn-got-it {
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          border: none;
          color: #ffffff;
          padding: 8px 18px;
          border-radius: var(--radius-full);
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }

        @media (max-width: 640px) {
          .steps-grid {
            grid-template-columns: 1fr;
          }
          .task-row {
            flex-direction: column;
            align-items: flex-start;
          }
          .btn-try-clue {
            align-self: flex-end;
          }
        }
      `}</style>
    </div>
  );
}
