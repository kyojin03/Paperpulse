/**
 * OVPAA PaperPulse Google Apps Script API.
 * Configure PAPERPULSE_SHEET_ID and PAPERPULSE_SHEET_NAME in Script Properties.
 */
const PAPERPULSE = Object.freeze({
  REQUIRED_HEADERS: ['Tracking Number', 'Subject', 'Requesting Office', 'Date Received', 'Date Signed', 'Status', 'Remarks', 'Last Updated'],
  STATUSES: ['Received', 'For Signature', 'Signed', 'Released'],
  MAX_QUERY_LENGTH: 120,
  MAX_SUGGESTIONS: 6,
  MAX_LIST_RECORDS: 100,
  CACHE_SECONDS: 120,
  TIME_ZONE: 'Asia/Manila'
});

/** Handles public API calls made to the deployed Web App. */
function doGet(event) {
  const parameters = (event && event.parameter) || {};
  const callback = validCallback_(parameters.callback);
  try {
    const action = String(parameters.action || '').toLowerCase();
    let payload;
    if (action === 'lookup') payload = lookup_(parameters.q);
    else if (action === 'suggestions') payload = suggestions_(parameters.q);
    else if (action === 'stats') payload = statistics_();
    else if (action === 'list') payload = list_(parameters.limit);
    else return json_({ success: false, error: 'Unsupported action. Use lookup, suggestions, stats, or list.' }, callback);
    return json_({ success: true, data: payload, updatedAt: new Date().toISOString() }, callback);
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return json_({ success: false, error: 'The document register is temporarily unavailable. Please try again later.' }, callback);
  }
}

/** Returns full records that partially match a tracking number or subject. */
function lookup_(query) {
  const search = validateQuery_(query).toLowerCase();
  return readRecords_().filter((record) =>
    record.trackingNumber.toLowerCase().includes(search) || record.subject.toLowerCase().includes(search)
  ).slice(0, 20);
}

/** Returns compact records for autocomplete without exposing document details. */
function suggestions_(query) {
  const search = validateQuery_(query).toLowerCase();
  return readRecords_().filter((record) =>
    record.trackingNumber.toLowerCase().includes(search) || record.subject.toLowerCase().includes(search)
  ).slice(0, PAPERPULSE.MAX_SUGGESTIONS).map((record) => ({
    trackingNumber: record.trackingNumber,
    subject: record.subject
  }));
}

/** Produces counts for the four official document statuses. */
function statistics_() {
  const counts = PAPERPULSE.STATUSES.reduce((result, status) => { result[status] = 0; return result; }, {});
  readRecords_().forEach((record) => { if (Object.prototype.hasOwnProperty.call(counts, record.status)) counts[record.status] += 1; });
  return counts;
}

/** Returns newest complete records for the public dashboard without changing existing endpoints. */
function list_(limit) {
  const requested = Number(limit || PAPERPULSE.MAX_LIST_RECORDS);
  const maximum = Number.isFinite(requested) ? Math.min(Math.max(Math.floor(requested), 1), PAPERPULSE.MAX_LIST_RECORDS) : PAPERPULSE.MAX_LIST_RECORDS;
  return readRecords_().sort((left, right) => sortTimestamp_(right.lastUpdated) - sortTimestamp_(left.lastUpdated)).slice(0, maximum);
}

/** Reads, validates, and normalizes the configured sheet. Results are cached briefly. */
function readRecords_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('paperpulse-records-v1');
  if (cached) return JSON.parse(cached);
  const properties = PropertiesService.getScriptProperties();
  const sheetId = properties.getProperty('PAPERPULSE_SHEET_ID');
  const sheetName = properties.getProperty('PAPERPULSE_SHEET_NAME');
  if (!sheetId || !sheetName) throw new Error('PaperPulse sheet properties have not been configured.');
  const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);
  if (!sheet) throw new Error('The configured PaperPulse sheet was not found.');
  const values = sheet.getDataRange().getValues();
  if (!values.length) return [];
  const headers = values[0].map((value) => String(value).trim());
  PAPERPULSE.REQUIRED_HEADERS.forEach((header) => { if (headers.indexOf(header) === -1) throw new Error(`Required column missing: ${header}`); });
  const records = values.slice(1).filter((row) => row.some((value) => value !== '')).map((row) => normalizeRecord_(headers, row));
  cache.put('paperpulse-records-v1', JSON.stringify(records), PAPERPULSE.CACHE_SECONDS);
  return records;
}

function normalizeRecord_(headers, row) {
  const source = headers.reduce((result, header, index) => { result[header] = row[index]; return result; }, {});
  return {
    trackingNumber: text_(source['Tracking Number']), subject: text_(source.Subject), requestingOffice: text_(source['Requesting Office']),
    dateReceived: date_(source['Date Received']), dateSigned: date_(source['Date Signed']), status: text_(source.Status),
    remarks: text_(source.Remarks), lastUpdated: dateTime_(source['Last Updated'])
  };
}

function validateQuery_(query) {
  const cleaned = String(query || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) throw new Error('Enter a tracking number or document subject.');
  if (cleaned.length > PAPERPULSE.MAX_QUERY_LENGTH) throw new Error('Search text is too long.');
  return cleaned;
}

function text_(value) { return String(value === null || value === undefined ? '' : value).trim(); }
function date_(value) { return value instanceof Date ? Utilities.formatDate(value, PAPERPULSE.TIME_ZONE, 'yyyy-MM-dd') : text_(value); }
function dateTime_(value) { return value instanceof Date ? Utilities.formatDate(value, PAPERPULSE.TIME_ZONE, "yyyy-MM-dd'T'HH:mm:ss") : text_(value); }
function sortTimestamp_(value) { const timestamp = Date.parse(value); return Number.isNaN(timestamp) ? 0 : timestamp; }
function validCallback_(value) { return /^[A-Za-z_$][0-9A-Za-z_$]{0,80}$/.test(String(value || '')) ? String(value) : ''; }
function json_(payload, callback) {
  const body = JSON.stringify(payload);
  return ContentService.createTextOutput(callback ? `${callback}(${body});` : body)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}
