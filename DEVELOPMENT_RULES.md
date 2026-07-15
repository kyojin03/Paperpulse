# PaperPulse Development Rules

## Architecture

Google Sheets is the ONLY database.

Google Drive is the ONLY file storage.

Google Apps Script is the ONLY backend.

Frontend must NEVER generate data.

Backend is the single source of truth.

---

## Never

- Never generate sample data.
- Never generate placeholder rows.
- Never create mock arrays.
- Never fake API responses.
- Never hardcode documents.
- Never replace working backend endpoints.

If the backend returns no data,

display an empty state.

---

## Git Workflow

One feature per branch.

One feature per commit.

Test before committing.

Never modify unrelated modules.

---

## UI

Google Workspace inspired.

Minimal.

Professional.

Fast.

Responsive.

No clutter.

---

## Goal

Build a production-ready Document Tracking & Archive Management System for the Office of the Vice President for Academic Affairs.