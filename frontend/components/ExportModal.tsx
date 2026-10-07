"use client";

import React, { useState } from "react";
import { CloseIcon, TagIcon, LayersIcon, CheckIcon } from "./Icons";

interface ExportModalProps {
  sessionId: string;
  onClose: () => void;
  onClearSession: () => void;
}

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function ExportModal({
  sessionId,
  onClose,
  onClearSession,
}: ExportModalProps) {
  const [token, setToken] = useState("");
  const [exportScope, setExportScope] = useState<"current" | "all">("current");
  const [isDeleting, setIsDeleting] = useState(false);
  const [dataCleared, setDataCleared] = useState(false);

  const getExportUrl = (format: "csv" | "json") => {
    const params = new URLSearchParams();
    params.set("format", format);
    if (exportScope === "current" && sessionId) {
      params.set("session_id", sessionId);
    }
    if (token.trim()) {
      params.set("token", token.trim());
    }
    return `${BASE}/session/export?${params.toString()}`;
  };

  const handleDownload = (format: "csv" | "json") => {
    const url = getExportUrl(format);
    window.open(url, "_blank");
  };

  const handleClearData = async () => {
    setIsDeleting(true);
    try {
      // Clear current session from local state
      onClearSession();
      setDataCleared(true);
      setTimeout(() => {
        setDataCleared(false);
      }, 3000);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="export-modal-backdrop" onClick={onClose}>
      <div className="export-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="title-wrap">
            <LayersIcon size={20} className="export-icon" />
            <h3 className="modal-title">Export Session Logs & Privacy</h3>
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <p className="modal-desc">
          Export anonymized evaluation metrics comparing Recall Agent against
          Baseline Search as defined in the evaluation framework.
        </p>

        {/* Scope selector */}
        <div className="scope-selection">
          <label className="section-label">Export Scope:</label>
          <div className="scope-buttons">
            <button
              type="button"
              className={`scope-btn ${exportScope === "current" ? "active" : ""}`}
              onClick={() => setExportScope("current")}
            >
              Current Session Only
            </button>
            <button
              type="button"
              className={`scope-btn ${exportScope === "all" ? "active" : ""}`}
              onClick={() => setExportScope("all")}
            >
              All Recorded Sessions
            </button>
          </div>
        </div>

        {/* Optional Auth Token */}
        <div className="token-field">
          <label className="section-label">
            Export Auth Token <span className="label-sub">(if set in backend)</span>:
          </label>
          <input
            type="password"
            className="token-input"
            placeholder="Enter X-Export-Token..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>

        {/* Download Buttons */}
        <div className="download-actions">
          <button
            type="button"
            className="btn-download csv"
            onClick={() => handleDownload("csv")}
          >
            <TagIcon size={15} />
            <span>Download CSV (Evaluation Table)</span>
          </button>

          <button
            type="button"
            className="btn-download json"
            onClick={() => handleDownload("json")}
          >
            <LayersIcon size={15} />
            <span>Download JSON</span>
          </button>
        </div>

        {/* Privacy & Data deletion */}
        <div className="privacy-section">
          <div className="privacy-header">
            <span className="privacy-title">Data Privacy & Research Compliance</span>
          </div>
          <p className="privacy-text">
            No personal Google account data is stored or accessed. Uploaded
            photos expire automatically after 24 hours. You can clear your
            current session and temporary uploads immediately below.
          </p>
          <button
            type="button"
            className="btn-clear-data"
            onClick={handleClearData}
            disabled={isDeleting || dataCleared}
          >
            {dataCleared ? (
              <>
                <CheckIcon size={14} />
                <span>Session Data Cleared</span>
              </>
            ) : (
              <span>Clear Current Session & Temporary Data</span>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .export-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
          animation: fadeIn 0.2s ease-out;
        }

        .export-modal-card {
          width: 100%;
          max-width: 520px;
          background: rgba(18, 25, 42, 0.95);
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: var(--radius-lg);
          padding: 24px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        :global(.export-icon) {
          color: #38bdf8;
        }

        .modal-title {
          font-size: 18px;
          font-weight: 600;
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

        .modal-desc {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.45;
        }

        .section-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          display: block;
          margin-bottom: 6px;
        }

        .label-sub {
          text-transform: none;
          font-weight: 400;
          color: var(--text-dim);
        }

        .scope-buttons {
          display: flex;
          gap: 8px;
        }

        .scope-btn {
          flex: 1;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .scope-btn.active {
          background: rgba(56, 189, 248, 0.15);
          border-color: rgba(56, 189, 248, 0.4);
          color: #38bdf8;
          font-weight: 600;
        }

        .token-input {
          width: 100%;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: var(--radius-sm);
          padding: 8px 14px;
          font-size: 13px;
          color: var(--text-main);
          outline: none;
        }

        .token-input:focus {
          border-color: #38bdf8;
        }

        .download-actions {
          display: flex;
          gap: 10px;
        }

        .btn-download {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: var(--radius-full);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          border: none;
        }

        .btn-download.csv {
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          color: #ffffff;
        }

        .btn-download.csv:hover {
          background: #0284c7;
          box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);
        }

        .btn-download.json {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }

        .btn-download.json:hover {
          background: rgba(255, 255, 255, 0.14);
        }

        .privacy-section {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: var(--radius-sm);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .privacy-title {
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
        }

        .privacy-text {
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .btn-clear-data {
          align-self: flex-start;
          background: transparent;
          border: 1px solid rgba(244, 63, 94, 0.3);
          color: #fb7185;
          padding: 5px 12px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all var(--transition-fast);
        }

        .btn-clear-data:hover:not(:disabled) {
          background: rgba(244, 63, 94, 0.12);
        }
      `}</style>
    </div>
  );
}
