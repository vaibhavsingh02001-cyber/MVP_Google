"use client";

import React, { useState } from "react";
import { uploadPhoto } from "@/lib/api";
import { Photo } from "@/lib/types";
import { UploadCloudIcon, CloseIcon, CheckIcon } from "./Icons";

interface UploadModalProps {
  sessionId: string;
  onClose: () => void;
  onUploadSuccess: (photo: Photo) => void;
}

export function UploadModal({ sessionId, onClose, onUploadSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || isUploading) return;

    setIsUploading(true);
    setError(null);

    try {
      const photo = await uploadPhoto(file, sessionId);
      onUploadSuccess(photo);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to upload image. Ensure backend is running.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="upload-modal-backdrop" onClick={onClose}>
      <div className="upload-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <UploadCloudIcon size={20} className="upload-icon" />
            <h3 className="modal-title">Add Demo Photo</h3>
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
          Upload a test photo into your current session. The AI vision tagger
          will extract caption, objects, and mood tags automatically.
        </p>

        <form onSubmit={handleSubmit} className="upload-form">
          <label className="file-drop-zone">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            {file ? (
              <div className="file-selected-box">
                <CheckIcon size={20} className="check-icon" />
                <span className="file-name">{file.name}</span>
                <span className="file-size">
                  ({Math.round(file.size / 1024)} KB)
                </span>
              </div>
            ) : (
              <div className="drop-hint-box">
                <UploadCloudIcon size={32} />
                <span className="drop-title">Select a JPEG or PNG photo</span>
                <span className="drop-sub">Drag and drop or browse file</span>
              </div>
            )}
          </label>

          {error && <div className="error-box">{error}</div>}

          <div className="modal-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit-upload"
              disabled={!file || isUploading}
            >
              {isUploading ? (
                <span>Tagging & Indexing…</span>
              ) : (
                <span>Upload to Session</span>
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .upload-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.78);
          backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .upload-card {
          width: 100%;
          max-width: 480px;
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

        .modal-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        :global(.upload-icon) {
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
          line-height: 1.4;
        }

        .upload-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .file-drop-zone {
          border: 2px dashed rgba(56, 189, 248, 0.35);
          background: rgba(56, 189, 248, 0.05);
          border-radius: var(--radius-md);
          padding: 28px 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .file-drop-zone:hover {
          border-color: rgba(56, 189, 248, 0.6);
          background: rgba(56, 189, 248, 0.1);
        }

        .file-drop-zone input {
          display: none;
        }

        .drop-hint-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          color: #94a3b8;
        }

        .drop-title {
          font-size: 14px;
          font-weight: 500;
          color: #f8fafc;
        }

        .drop-sub {
          font-size: 12px;
          color: var(--text-muted);
        }

        .file-selected-box {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #38bdf8;
        }

        :global(.check-icon) {
          color: #10b981;
        }

        .file-name {
          font-size: 14px;
          font-weight: 500;
          color: #f8fafc;
        }

        .file-size {
          font-size: 12px;
          color: var(--text-muted);
        }

        .error-box {
          background: rgba(244, 63, 94, 0.15);
          border: 1px solid rgba(244, 63, 94, 0.3);
          color: #fb7185;
          padding: 8px 12px;
          border-radius: var(--radius-xs);
          font-size: 12px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .btn-cancel {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: var(--text-secondary);
          padding: 8px 16px;
          border-radius: var(--radius-full);
          font-size: 13px;
          cursor: pointer;
        }

        .btn-submit-upload {
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          border: none;
          color: #ffffff;
          padding: 8px 18px;
          border-radius: var(--radius-full);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-submit-upload:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
