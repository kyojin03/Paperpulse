# Deployment Guide

## 1. Prepare the Google Sheet

Upload `backend/GoogleSheetTemplate.xlsx` to Google Drive and open it with Google Sheets, or create a Google Sheet owned by OVPAA manually. The template provides a formatted register with the exact required headers and Status validation. The first row must contain the eight column names, in this exact spelling: `Tracking Number`, `Subject`, `Requesting Office`, `Date Received`, `Date Signed`, `Status`, `Remarks`, and `Last Updated`.

Follow the operating rules in [GOOGLE_SHEETS.md](GOOGLE_SHEETS.md). Share the Sheet only with staff who maintain the register; it must not be public.

## 2. Deploy the Apps Script API

1. Open [script.new](https://script.new) while signed in to the OVPAA-maintained Google account.
2. Replace the default script source with `backend/GoogleAppsScript.js`, then add `backend/appsscript.json` as the project manifest. If using clasp, copy those files into the Apps Script project instead.
3. In **Project Settings**, add these Script Properties:
   - `PAPERPULSE_SHEET_ID`: the identifier from the Google Sheet URL.
   - `PAPERPULSE_SHEET_NAME`: the exact worksheet tab name.
4. Select **Deploy → New deployment → Web app**. Execute as the deploying account and set access to **Anyone**. Authorize the requested Google Sheets scope.
5. Copy the Web App URL ending in `/exec`. Never use the editor `/dev` URL for the public site.
6. Test these three endpoints in a browser: append `?action=stats`, `?action=lookup&q=` followed by a known tracking number, and `?action=suggestions&q=` followed by two or more known characters. Every response must contain `"success":true`.

Redeploy after every Apps Script code change. Retain the same deployment when possible so the public URL remains stable.

## 3. Connect the frontend

Open `js/config.js` and set `apiUrl` to the copied `/exec` URL. This is the only frontend deployment setting. Commit the resulting configuration only when the endpoint is intended to be public.

The API URL is expected to be public because the search tool is public. Sheet access is protected because only the Apps Script deployment account can read it.

## 4. Publish with GitHub Pages

1. Push this repository to the approved GitHub organization.
2. In **Settings → Pages**, deploy from the main branch and the repository root.
3. Confirm that the published page loads over HTTPS and search works with a real document.
4. If using a custom domain, configure it in GitHub Pages and update the DNS record before enabling it publicly.

## Release checklist

- The worksheet has the exact headers and no duplicate tracking numbers.
- Script Properties are set and are not committed to Git.
- The `/exec` endpoint returns JSON for all three actions.
- A search works from the GitHub Pages URL on desktop and mobile.
- The four card counts match the sheet.
- Browser console has no JavaScript or network errors.
- OVPAA has an owner for sheet updates and API redeployments.

## Operational notes

PaperPulse caches the sheet data for up to two minutes to reduce Apps Script and Sheets load. Allow that window after a staff member changes a row. Do not record confidential or sensitive data in Subject or Remarks because public search results display those values. The frontend first uses a standard JSON request and transparently falls back to the supported JSONP response when a browser blocks cross-origin Apps Script responses.
