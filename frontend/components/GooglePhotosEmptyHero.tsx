"use client";

import React from "react";
import { PlusIcon } from "./Icons";

interface GooglePhotosEmptyHeroProps {
  onUploadClick: () => void;
  onExploreDemo?: () => void;
}

export function GooglePhotosEmptyHero({
  onUploadClick,
  onExploreDemo,
}: GooglePhotosEmptyHeroProps) {
  return (
    <div className="gp-empty-state-wrapper">
      {/* Exact Google Photos Hero Illustration matching screenshot */}
      <div className="illustration-container">
        <svg
          viewBox="0 0 760 380"
          className="hero-svg"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Soft shadows */}
            <filter id="laptopShadow" x="-10%" y="-10%" width="120%" height="130%" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000000" floodOpacity="0.08" />
            </filter>
            <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
              <feDropShadow dx="2" dy="6" stdDeviation="8" floodColor="#000000" floodOpacity="0.16" />
            </filter>
            <filter id="cursorShadow" x="-30%" y="-30%" width="160%" height="160%" filterUnits="userSpaceOnUse">
              <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Background Cloud Layer */}
          <g className="clouds-group" opacity="0.95">
            {/* Soft fluffy clouds billowing behind laptop */}
            <circle cx="330" cy="210" r="115" fill="#f1f3f4" />
            <circle cx="260" cy="240" r="85" fill="#f8f9fa" />
            <circle cx="410" cy="225" r="105" fill="#f1f3f4" />
            
            {/* Upper-right cloud puffs */}
            <circle cx="500" cy="170" r="120" fill="#f1f3f4" />
            <circle cx="580" cy="195" r="95" fill="#f8f9fa" />
            <circle cx="640" cy="240" r="75" fill="#f1f3f4" />
          </g>

          {/* Warm Sun rising behind clouds on the upper right */}
          <g className="sun-group">
            <circle cx="560" cy="120" r="38" fill="#FBBC04" />
          </g>

          {/* Foreground Cloud puff overlapping lower sun */}
          <g opacity="0.95">
            <circle cx="595" cy="180" r="70" fill="#f1f3f4" />
            <circle cx="545" cy="215" r="85" fill="#f8f9fa" />
          </g>

          {/* Laptop Base Shadow */}
          <ellipse cx="410" cy="318" rx="195" ry="9" fill="#e0e2ec" opacity="0.75" />

          {/* LAPTOP ASSEMBLY */}
          <g className="laptop-group" filter="url(#laptopShadow)">
            {/* Laptop Screen Outer Lid / Bezel (Dark Charcoal) */}
            <rect
              x="265"
              y="108"
              width="275"
              height="178"
              rx="12"
              fill="#2d3748"
            />
            {/* Inner Display Bezel border highlight */}
            <rect
              x="266"
              y="109"
              width="273"
              height="176"
              rx="11"
              stroke="#3c4043"
              strokeWidth="1.5"
              fill="none"
            />

            {/* Laptop Screen Interior (Clean White Canvas) */}
            <rect
              x="276"
              y="118"
              width="253"
              height="158"
              rx="3"
              fill="#ffffff"
            />

            {/* Laptop Screen Top Header Bar */}
            <rect
              x="276"
              y="118"
              width="253"
              height="18"
              fill="#f8fafd"
            />
            <line x1="276" y1="136" x2="529" y2="136" stroke="#edf2fa" strokeWidth="1" />
            
            {/* Mini Search pill on screen */}
            <rect
              x="325"
              y="122"
              width="105"
              height="9"
              rx="4.5"
              fill="#eef2f6"
            />

            {/* Mini Left Sidebar Dots on screen */}
            <circle cx="284" cy="146" r="2.5" fill="#bdc1c6" />
            <circle cx="284" cy="157" r="2.5" fill="#bdc1c6" />
            <circle cx="284" cy="168" r="2.5" fill="#bdc1c6" />
            <circle cx="284" cy="179" r="2.5" fill="#bdc1c6" />

            {/* GOOGLE PHOTOS PINWHEEL LOGO (Center of Screen) */}
            <g transform="translate(402, 197) scale(1.65)">
              {/* Top: Red petal */}
              <path
                d="M0 -18 a9 9 0 0 0 -9 9 v9 h9 a9 9 0 0 0 9 -9 a9 9 0 0 0 -9 -9 z"
                fill="#EA4335"
              />
              {/* Right: Blue petal */}
              <path
                d="M18 0 a9 9 0 0 0 -9 -9 h-9 v9 a9 9 0 0 0 9 9 a9 9 0 0 0 9 -9 z"
                fill="#4285F4"
              />
              {/* Bottom: Green petal */}
              <path
                d="M0 18 a9 9 0 0 0 9 -9 v-9 h-9 a9 9 0 0 0 -9 9 a9 9 0 0 0 9 9 z"
                fill="#34A853"
              />
              {/* Left: Yellow petal */}
              <path
                d="M-18 0 a9 9 0 0 0 9 9 h9 v-9 a9 9 0 0 0 -9 -9 a9 9 0 0 0 -9 9 z"
                fill="#FBBC04"
              />
            </g>

            {/* Laptop Base (Lower Deck Keyboard Portion) */}
            <path
              d="M220 286 L600 286 L570 300 L250 300 Z"
              fill="#d2d6dc"
            />
            {/* Trackpad Notch on Laptop Base */}
            <rect
              x="385"
              y="287"
              width="60"
              height="3"
              rx="1.5"
              fill="#9aa0a6"
            />
            {/* Front Lip Highlight */}
            <path
              d="M250 300 L570 300 L565 302 L255 302 Z"
              fill="#bdc1c6"
            />
          </g>

          {/* BLUE PHOTO CARDS STACK */}
          {/* Card 3 (Back-most / right-most, Dark Navy Blue) */}
          <rect
            x="538"
            y="185"
            width="82"
            height="95"
            rx="4"
            fill="#174ea6"
            filter="url(#cardShadow)"
          />

          {/* Card 2 (Middle, Medium Google Blue) */}
          <rect
            x="518"
            y="168"
            width="82"
            height="95"
            rx="4"
            fill="#1967d2"
            filter="url(#cardShadow)"
          />

          {/* Card 1 (Front-most / left-most, Vibrant Google Blue) */}
          <rect
            x="498"
            y="150"
            width="82"
            height="95"
            rx="4"
            fill="#1a73e8"
            filter="url(#cardShadow)"
          />

          {/* MOUSE CURSOR POINTER HOVERING OVER TOP-LEFT OF FRONT CARD */}
          <g transform="translate(488, 142)" filter="url(#cursorShadow)">
            {/* Classic Hand Cursor pointing at the blue photo card */}
            <path
              d="M8.5 2.5 C8.5 1.4 9.4 0.5 10.5 0.5 C11.6 0.5 12.5 1.4 12.5 2.5 L12.5 10.5 L13.5 10.5 C14.6 10.5 15.5 11.4 15.5 12.5 L15.5 13 L16 13 C17.1 13 18 13.9 18 15 L18 15.5 L18.5 15.5 C19.6 15.5 20.5 16.4 20.5 17.5 L20.5 22.5 C20.5 26.5 17.5 29.5 13.5 29.5 L10.5 29.5 C7.5 29.5 5 27 5 24 L5 21 C5 19.8 5.6 18.7 6.6 18 L3.5 14.5 C2.7 13.7 2.7 12.4 3.5 11.6 C4.3 10.8 5.6 10.8 6.4 11.6 L8.5 13.8 L8.5 2.5 Z"
              fill="#ffffff"
              stroke="#1f1f1f"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>

      {/* Heading & Subtitle exactly matching screenshot */}
      <div className="hero-content">
        <h1 className="hero-title">Ready to add some photos?</h1>
        <p className="hero-description">
          Upload photos and videos to back them up to your Google Account
        </p>

        <div className="hero-actions">
          <button
            type="button"
            className="gp-primary-upload-btn"
            onClick={onUploadClick}
          >
            <PlusIcon size={18} />
            <span>Upload photos</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .gp-empty-state-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 24px 16px 64px 16px;
          max-width: 900px;
          margin: 0 auto;
          user-select: none;
        }

        .illustration-container {
          width: 100%;
          max-width: 680px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .hero-svg {
          width: 100%;
          height: auto;
          max-height: 380px;
          display: block;
        }

        .hero-content {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .hero-title {
          font-family: var(--font-family);
          font-size: 28px;
          font-weight: 400;
          color: #1f1f1f;
          letter-spacing: -0.015em;
          margin: 0;
          line-height: 1.25;
        }

        .hero-description {
          font-family: var(--font-family);
          font-size: 15px;
          color: #444746;
          margin-top: 10px;
          margin-bottom: 24px;
          font-weight: 400;
          max-width: 520px;
        }

        .hero-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .gp-primary-upload-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #0b57d0;
          color: #ffffff;
          border: none;
          height: 44px;
          padding: 0 24px;
          border-radius: 22px;
          font-family: var(--font-family);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease, box-shadow 0.15s ease;
          box-shadow: 0 1px 3px rgba(11, 87, 208, 0.2);
        }

        .gp-primary-upload-btn:hover {
          background: #0842a0;
          box-shadow: 0 2px 6px rgba(11, 87, 208, 0.3);
        }

        .gp-secondary-demo-btn {
          display: inline-flex;
          align-items: center;
          background: #f0f4f9;
          color: #0b57d0;
          border: 1px solid #d3e3fd;
          height: 44px;
          padding: 0 20px;
          border-radius: 22px;
          font-family: var(--font-family);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .gp-secondary-demo-btn:hover {
          background: #e0e9f8;
        }

        @media (max-width: 600px) {
          .hero-title {
            font-size: 22px;
          }
          .hero-description {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
