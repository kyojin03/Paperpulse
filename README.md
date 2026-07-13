# OVPAA PaperPulse

PaperPulse 2.0 is the daily document-status dashboard for the Office of the Vice President for Academic Affairs (OVPAA) at Good Samaritan Colleges. Faculty, employees, department heads, and office staff can see current activity before searching. Only designated OVPAA staff edit the Google Sheet.

## Features

- Partial matching by tracking number or subject
- Keyboard-accessible autocomplete suggestions
- Live counts for Received, For Signature, Signed, and Released documents
- Recently released and in-progress dashboards with client-side filtering
- Clickable, keyboard-accessible record details modal
- Refresh control, timestamp, row counters, skeleton loading, and scroll-to-top control
- Session-cached dashboard records to reduce repeat API calls
- Responsive, accessible vanilla HTML/CSS/JavaScript interface
- Google Apps Script API backed by a private Google Sheet
- GitHub Pages-ready static hosting

## Project structure

```
index.html                  Public application
css/                        Base, motion, and responsive styles
js/                         Configuration, API, dashboard, UI, and search modules
backend/GoogleAppsScript.js Google Apps Script Web App source
backend/appsscript.json     Apps Script deployment manifest
backend/GoogleSheetTemplate.xlsx Import-ready register template
docs/DEPLOYMENT.md          Setup and release procedure
docs/GOOGLE_SHEETS.md       Sheet schema and operating guidance
```

## Quick start

1. Set up the Google Sheet and deploy the Apps Script API using [the deployment guide](docs/DEPLOYMENT.md).
2. Add the deployed Web App URL to `apiUrl` in `js/config.js`.
3. Publish the repository through GitHub Pages.

Do not put the Google Sheet ID or any credentials in the frontend. The Sheet ID is stored only in Apps Script Script Properties.

To begin the register, upload [GoogleSheetTemplate.xlsx](backend/GoogleSheetTemplate.xlsx) to Google Drive and open it with Google Sheets. It includes the exact API headers and a validated Status column.

## Status values

The register accepts `Received`, `For Signature`, `Signed`, and `Released`. Use these exact values so the summary cards remain accurate.

## API actions

The deployed Apps Script Web App keeps the compatible `lookup`, `suggestions`, and `stats` actions. Version 2 adds `list`, which returns complete recent records for the dashboard. The browser loads these records once per short session cache period, then filters them locally.

An admin page can later use the same normalized record contract without changing the public backend. Keep administrative write operations in a separately authenticated future deployment.

## Support

For document concerns, contact the Office of the Vice President for Academic Affairs. For technical maintenance, contact Piolo Bernardino, LMS Associate & Systems Support.

## License

See [LICENSE](LICENSE).
