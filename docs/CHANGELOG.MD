# Changelog

All notable changes to PaperPulse are documented in this file.

## 2.0.0 - 2026-07-13

- Added an institutional dashboard with recently released and in-progress document registers.
- Added a backward-compatible `list` Apps Script API action for complete recent dashboard records.
- Added short-lived session caching, local table filtering, refresh control, timestamps, row counters, skeleton states, empty states, and scroll-to-top control.
- Added keyboard-accessible row detail modal and responsive sticky table headers.
- Improved the visual hierarchy, institutional styling, mobile layout, and reduced-motion support.
- Updated README, design notes, deployment guide, and release checklist for Version 2.0.
- Refined released-document expansion into an incremental Load More control and labelled the dashboard synchronization time explicitly.

## 1.0.0 - 2026-07-13

- Built the accessible responsive public document-status interface.
- Added modular search, suggestions, result rendering, and live statistics API integration.
- Added the Google Apps Script Web App backend with Sheet validation, partial lookup, suggestions, statistics, and short-lived caching.
- Added Apps Script deployment manifest and Google Sheet operations guidance.
- Added GitHub Pages and Apps Script deployment instructions and release checklist.
- Added JSONP fallback for Apps Script cross-origin compatibility.
- Removed unused zero-byte starter assets and corrected the deployment-ready asset references.
- Replaced the invalid sheet starter file with a formatted, validated Google Sheets import template.
- Completed production review of frontend state handling and responsive styles.
