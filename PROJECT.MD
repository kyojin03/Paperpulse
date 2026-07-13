# PaperPulse Project Specification

## Project Name

PaperPulse

## System Name

OVPAA PaperPulse

## Client

Office of the Vice President for Academic Affairs

Good Samaritan Colleges

## Developed By

Piolo Bernardino

LMS Associate & Systems Support

Good Samaritan Colleges

---

# Objective

PaperPulse is a web-based document status monitoring system that allows faculty and employees to check the status of documents submitted to OVPAA.

The goal is to reduce unnecessary office visits by allowing users to know whether their documents have already been signed.

No user authentication is required.

The system is public for searching only.

Only OVPAA staff update the Google Sheet.

---

# Technology Stack

Frontend

- HTML5
- CSS3
- Vanilla JavaScript

Backend

- Google Apps Script

Database

- Google Sheets

Hosting

- GitHub Pages

Icons

- Font Awesome

Typography

- Google Fonts - Poppins

---

# Folder Structure

PaperPulse/

index.html

README.md

PROJECT.md

LICENSE

css/

style.css

animations.css

responsive.css

js/

config.js

utils.js

ui.js

search.js

api.js

app.js

assets/

images/

logo.png

favicon.ico

icons/

backend/

GoogleAppsScript.js

docs/

CHANGELOG.md

---

# Google Sheet Columns

Tracking Number

Subject

Requesting Office

Date Received

Date Signed

Status

Remarks

Last Updated

---

# Status Values

Received

For Signature

Signed

Released

---

# Search

Search by Tracking Number.

Search by Subject.

Support partial matching.

Support autocomplete suggestions.

---

# Home Page

Display:

School Logo

Good Samaritan Colleges

Office of the Vice President for Academic Affairs

OVPAA PaperPulse

Document Status Monitoring System

Search Bar

Summary Cards

Search Result Card

Footer

---

# Summary Cards

Received

For Signature

Signed

Released

---

# Result Card

Tracking Number

Subject

Requesting Office

Date Received

Date Signed

Status

Remarks

Last Updated

---

# Google Apps Script

The backend must provide:

doGet()

Lookup endpoint

Suggestions endpoint

Statistics endpoint

JSON responses

Validation

Error handling

CORS support

---

# API

?action=lookup

?action=suggestions

?action=stats

---

# Design

Use the official Good Samaritan Colleges logo.

Use blue, gold and white branding.

Modern UI.

Responsive.

Professional.

Accessible.

---

# Footer

OVPAA PaperPulse

Office of the Vice President for Academic Affairs

Good Samaritan Colleges

Designed & Developed by

Piolo Bernardino

LMS Associate & Systems Support

---

# Deliverables

Complete production-ready application.

Complete Google Apps Script backend.

Complete documentation.

GitHub Pages ready.

Google Sheets ready.

Production ready.