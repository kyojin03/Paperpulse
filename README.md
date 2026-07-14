# PaperPulse Lite Version 2.1

PaperPulse Lite is an internal document tracking and reporting system for the Office of the Vice President for Academic Affairs at Good Samaritan Colleges.

## Behavior

- Loads the existing `?action=list` endpoint and caches all returned documents locally.
- Filters cached documents locally; search never sends a network request.
- Refresh is the only action that reloads the existing Apps Script data.
- Provides in-page Home, Reports, and About navigation.
- Generates local PDF, Excel, and print-ready reports without backend changes.

## Exports

- **Export PDF** generates a paginated institutional report with generated date/time, status summary, and complete document register.
- **Export Excel** creates a formatted workbook with document number, subject, requesting office, requester, dates, status, and remarks.
- **Print** uses the browser print dialog with a clean report layout.

## Configuration

The deployed Apps Script URL is configured in the existing `API_URL` constant in `app.js`. Keep this value set to the approved `/exec` URL for deployment.

## Files

- `index.html`
- `style.css`
- `app.js`
- `README.md`

Designed and developed by Piolo Bernardino, LMS Associate & Systems Support, Good Samaritan Colleges.
