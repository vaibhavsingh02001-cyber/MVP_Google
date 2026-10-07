"use client";

import React from "react";
import {
  PhotosNavIcon,
  BellNavIcon,
  AlbumsNavIcon,
  DocumentsNavIcon,
  ScreenshotsNavIcon,
  FavoritesNavIcon,
  PeopleNavIcon,
  PlacesNavIcon,
  VideosNavIcon,
} from "./Icons";

interface GooglePhotosSidebarProps {
  activeItem: string;
  onSelectItem: (item: string) => void;
  isOpen: boolean;
}

export function GooglePhotosSidebar({
  activeItem,
  onSelectItem,
  isOpen,
}: GooglePhotosSidebarProps) {
  const primaryItems = [
    { id: "photos", label: "Photos", icon: PhotosNavIcon },
    { id: "updates", label: "Updates", icon: BellNavIcon },
  ];

  const collectionsItems = [
    { id: "albums", label: "Albums", icon: AlbumsNavIcon },
    { id: "documents", label: "Documents", icon: DocumentsNavIcon },
    { id: "screenshots", label: "Screenshots & recordings", icon: ScreenshotsNavIcon },
    { id: "favorites", label: "Favorites", icon: FavoritesNavIcon },
    { id: "people", label: "People", icon: PeopleNavIcon },
    { id: "places", label: "Places", icon: PlacesNavIcon },
    { id: "videos", label: "Videos", icon: VideosNavIcon },
  ];

  return (
    <aside className={`gp-sidebar ${isOpen ? "open" : "collapsed"}`} aria-label="Main Navigation">
      <div className="sidebar-content">
        {/* Top Section */}
        <div className="nav-group">
          {primaryItems.map((item) => {
            const IconComp = item.icon;
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-pill-btn ${isActive ? "active" : ""}`}
                onClick={() => onSelectItem(item.id)}
                title={item.label}
              >
                <div className="btn-icon">
                  <IconComp size={20} />
                </div>
                <span className="btn-label">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Collections Section */}
        <div className="collections-group">
          <h4 className="section-title">Collections</h4>
          <div className="collections-list">
            {collectionsItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeItem === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`sidebar-flat-btn ${isActive ? "active" : ""}`}
                  onClick={() => onSelectItem(item.id)}
                  title={item.label}
                >
                  <div className="btn-icon">
                    <IconComp size={20} />
                  </div>
                  <span className="btn-label">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        .gp-sidebar {
          width: 270px;
          height: calc(100vh - 64px);
          position: sticky;
          top: 64px;
          background: #ffffff;
          border-right: 1px solid #e0e2ec;
          display: flex;
          flex-direction: column;
          padding: 12px 14px;
          flex-shrink: 0;
          overflow-y: auto;
          transition: width 0.2s ease, transform 0.2s ease;
          user-select: none;
        }

        .gp-sidebar.collapsed {
          width: 72px;
          padding: 12px 8px;
        }

        .gp-sidebar.collapsed .btn-label,
        .gp-sidebar.collapsed .section-title {
          display: none;
        }

        .sidebar-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .nav-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sidebar-pill-btn {
          display: flex;
          align-items: center;
          gap: 16px;
          height: 48px;
          padding: 0 20px;
          border-radius: 24px;
          background: transparent;
          border: none;
          color: #444746;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          width: 100%;
          text-align: left;
        }

        .sidebar-pill-btn:hover {
          background: #f0f4f9;
          color: #1f1f1f;
        }

        .sidebar-pill-btn.active {
          background: #c2e7ff;
          color: #001d35;
          font-weight: 600;
        }

        .collections-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 8px;
        }

        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #1f1f1f;
          padding: 8px 12px 4px 12px;
          letter-spacing: -0.01em;
        }

        .collections-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sidebar-flat-btn {
          display: flex;
          align-items: center;
          gap: 16px;
          height: 44px;
          padding: 0 16px;
          border-radius: 22px;
          background: transparent;
          border: none;
          color: #444746;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          width: 100%;
          text-align: left;
        }

        .sidebar-flat-btn:hover {
          background: #f0f4f9;
          color: #1f1f1f;
        }

        .sidebar-flat-btn.active {
          background: #e8f0fe;
          color: #1a73e8;
          font-weight: 600;
        }

        .btn-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: inherit;
        }

        .btn-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (max-width: 900px) {
          .gp-sidebar {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
}
