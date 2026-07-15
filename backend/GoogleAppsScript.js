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

const ARCHIVE_UPLOAD = Object.freeze({
  ARCHIVE_SHEET_PROPERTY: 'ARCHIVE_SHEET_NAME',
  ARCHIVE_FOLDER_PROPERTY: 'ARCHIVE_FOLDER_ID',
  SCANNED_BY_PROPERTY: 'ARCHIVE_SCANNED_BY',
  REQUIRED_ARCHIVE_HEADERS: ['Archive ID', 'Document Number', 'File Name', 'Drive File ID', 'Drive URL', 'Archive Date', 'Upload Timestamp', 'Scanned By', 'Archive Remarks'],
  REQUIRED_DOCUMENT_HEADERS: ['Archive Status', 'Archive Date']
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

/** Handles only archive_upload POST requests. Existing GET actions remain unchanged. */
function doPost(event) {
  try {
    const request = postRequest_(event);
    if (String(request.action || '').toLowerCase() !== 'archive_upload') {
      return json_({ success: false, error: 'Unsupported POST action.' });
    }
    return json_(archiveUpload_(request, event));
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return json_({ success: false, error: error && error.message ? error.message : 'The archive upload could not be completed.' });
  }
}

function archiveUpload_(request, event) {
  const documentNumber = requiredArchiveValue_(request.documentNumber, 'Document Number');
  const subject = requiredArchiveValue_(request.subject, 'Subject');
  const requestingOffice = requiredArchiveValue_(request.requestingOffice, 'Requesting Office');
  const requester = requiredArchiveValue_(request.requester, 'Requester');
  const archiveRemarks = text_(request.archiveRemarks);
  const upload = archivePdf_(request, event);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  let file;
  let archiveSheet;
  let archiveRowIndex;
  try {
    const configuration = archiveConfiguration_();
    const spreadsheet = SpreadsheetApp.openById(configuration.sheetId);
    archiveSheet = spreadsheet.getSheetByName(configuration.archiveSheetName);
    const documentsSheet = spreadsheet.getSheetByName(configuration.documentsSheetName);
    if (!archiveSheet) throw new Error('The configured Archive sheet was not found.');
    if (!documentsSheet) throw new Error('The configured Documents sheet was not found.');

    const archiveHeaders = sheetHeaders_(archiveSheet, ARCHIVE_UPLOAD.REQUIRED_ARCHIVE_HEADERS, 'Archive');
    const documentHeaders = sheetHeaders_(documentsSheet, ARCHIVE_UPLOAD.REQUIRED_DOCUMENT_HEADERS, 'Documents');
    const archiveId = nextArchiveId_(archiveSheet, archiveHeaders['Archive ID']);
    const now = new Date();
    const archiveDate = Utilities.formatDate(now, PAPERPULSE.TIME_ZONE, 'yyyy-MM-dd');
    const fileName = safeFileName_(upload.fileName || `${documentNumber}.pdf`);
    file = DriveApp.getFolderById(configuration.archiveFolderId).createFile(upload.blob.setName(fileName));
    const driveUrl = file.getUrl();

    const archiveRow = [];
    archiveRow[archiveHeaders['Archive ID']] = archiveId;
    archiveRow[archiveHeaders['Document Number']] = documentNumber;
    archiveRow[archiveHeaders['File Name']] = file.getName();
    archiveRow[archiveHeaders['Drive File ID']] = file.getId();
    archiveRow[archiveHeaders['Drive URL']] = driveUrl;
    archiveRow[archiveHeaders['Archive Date']] = archiveDate;
    archiveRow[archiveHeaders['Upload Timestamp']] = now;
    archiveRow[archiveHeaders['Scanned By']] = archiveScannedBy_(configuration.scannedBy);
    archiveRow[archiveHeaders['Archive Remarks']] = archiveRemarks;
    archiveSheet.appendRow(archiveRow);
    archiveRowIndex = archiveSheet.getLastRow();

    updateDocumentArchiveStatus_(documentsSheet, documentHeaders, documentNumber, archiveDate);
    CacheService.getScriptCache().remove('paperpulse-records-v1');
    return { success: true, archiveId: archiveId, driveUrl: driveUrl, documentNumber: documentNumber };
  } catch (error) {
    if (archiveSheet && archiveRowIndex) archiveSheet.deleteRow(archiveRowIndex);
    if (file) file.setTrashed(true);
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function postRequest_(event) {
  const parameters = Object.assign({}, (event && event.parameter) || {});
  const postData = event && event.postData;
  if (!postData || !postData.contents) return parameters;
  const type = String(postData.type || '');
  if (type.indexOf('application/json') !== -1) {
    const body = JSON.parse(postData.contents);
    return Object.assign({}, body, parameters);
  }
  if (type.indexOf('multipart/form-data') !== -1) {
    return Object.assign({}, multipartFields_(event), parameters);
  }
  return parameters;
}

function archiveConfiguration_() {
  const properties = PropertiesService.getScriptProperties();
  const sheetId = properties.getProperty('PAPERPULSE_SHEET_ID');
  const documentsSheetName = properties.getProperty('PAPERPULSE_SHEET_NAME');
  const archiveSheetName = properties.getProperty(ARCHIVE_UPLOAD.ARCHIVE_SHEET_PROPERTY) || properties.getProperty('PAPERPULSE_ARCHIVE_SHEET_NAME') || 'Archive';
  const archiveFolderId = properties.getProperty(ARCHIVE_UPLOAD.ARCHIVE_FOLDER_PROPERTY) || properties.getProperty('PAPERPULSE_ARCHIVE_FOLDER_ID') || properties.getProperty('ARCHIVE_DRIVE_FOLDER_ID');
  if (!sheetId || !documentsSheetName || !archiveFolderId) {
    throw new Error('Archive upload settings are incomplete. Configure PAPERPULSE_SHEET_ID, PAPERPULSE_SHEET_NAME, and ARCHIVE_FOLDER_ID.');
  }
  return { sheetId: sheetId, documentsSheetName: documentsSheetName, archiveSheetName: archiveSheetName, archiveFolderId: archiveFolderId, scannedBy: properties.getProperty(ARCHIVE_UPLOAD.SCANNED_BY_PROPERTY) };
}

function archivePdf_(request, event) {
  const encoded = String(request.pdfBase64 || request.fileBase64 || request.pdf || request.file || '').replace(/^data:application\/pdf;base64,/i, '');
  if (encoded) {
    const blob = Utilities.newBlob(Utilities.base64Decode(encoded), 'application/pdf', String(request.fileName || 'archive.pdf'));
    validatePdf_(blob);
    return { blob: blob, fileName: String(request.fileName || '') };
  }
  const upload = multipartPdf_(event);
  if (!upload) throw new Error('A PDF file is required.');
  validatePdf_(upload.blob);
  return upload;
}

function multipartPdf_(event) {
  const postData = event && event.postData;
  const type = String((postData && postData.type) || '');
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(type);
  if (!boundaryMatch || !postData || !postData.contents) return null;
  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const parts = postData.contents.split(`--${boundary}`);
  for (let index = 0; index < parts.length; index += 1) {
    const separator = parts[index].indexOf('\r\n\r\n');
    if (separator === -1) continue;
    const headers = parts[index].slice(0, separator);
    const fileNameMatch = /filename="([^"]+)"/i.exec(headers);
    if (!fileNameMatch) continue;
    const content = parts[index].slice(separator + 4).replace(/\r\n$/, '');
    return { blob: Utilities.newBlob(content, 'application/pdf', fileNameMatch[1]), fileName: fileNameMatch[1] };
  }
  return null;
}

function multipartFields_(event) {
  const postData = event && event.postData;
  const type = String((postData && postData.type) || '');
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(type);
  if (!boundaryMatch || !postData || !postData.contents) return {};
  const boundary = boundaryMatch[1] || boundaryMatch[2];
  return postData.contents.split(`--${boundary}`).reduce((result, part) => {
    const separator = part.indexOf('\r\n\r\n');
    if (separator === -1 || /filename="/i.test(part.slice(0, separator))) return result;
    const nameMatch = /name="([^"]+)"/i.exec(part.slice(0, separator));
    if (nameMatch) result[nameMatch[1]] = part.slice(separator + 4).replace(/\r\n$/, '');
    return result;
  }, {});
}

function validatePdf_(blob) {
  if (!blob || !blob.getBytes || blob.getBytes().length < 5) throw new Error('A valid PDF file is required.');
  const bytes = blob.getBytes();
  if (bytes[0] !== 37 || bytes[1] !== 80 || bytes[2] !== 68 || bytes[3] !== 70 || bytes[4] !== 45) {
    throw new Error('The uploaded file must be a PDF.');
  }
}

function requiredArchiveValue_(value, label) {
  const cleaned = text_(value);
  if (!cleaned) throw new Error(`${label} is required.`);
  return cleaned;
}

function sheetHeaders_(sheet, requiredHeaders, label) {
  const values = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headers = values.reduce((result, value, index) => { result[String(value).trim()] = index; return result; }, {});
  requiredHeaders.forEach(header => { if (!Object.prototype.hasOwnProperty.call(headers, header)) throw new Error(`${label} sheet is missing the ${header} column.`); });
  return headers;
}

function nextArchiveId_(sheet, archiveIdColumn) {
  const year = Utilities.formatDate(new Date(), PAPERPULSE.TIME_ZONE, 'yyyy');
  const prefix = `ARC-${year}-`;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return `${prefix}000001`;
  const values = sheet.getRange(2, archiveIdColumn + 1, lastRow - 1, 1).getValues();
  const largest = values.reduce((maximum, row) => {
    const match = new RegExp(`^${prefix}(\\d{6})$`).exec(String(row[0] || '').trim());
    return match ? Math.max(maximum, Number(match[1])) : maximum;
  }, 0);
  return `${prefix}${String(largest + 1).padStart(6, '0')}`;
}

function archiveScannedBy_(configuredValue) {
  const scannedBy = text_(configuredValue) || text_(Session.getActiveUser().getEmail()) || text_(Session.getEffectiveUser().getEmail());
  if (!scannedBy) throw new Error('Configure ARCHIVE_SCANNED_BY for archive uploads.');
  return scannedBy;
}

function safeFileName_(fileName) {
  const cleaned = String(fileName || '').replace(/[\\/:*?"<>|]/g, '_').trim();
  if (!cleaned) throw new Error('The uploaded PDF must have a file name.');
  return /\.pdf$/i.test(cleaned) ? cleaned : `${cleaned}.pdf`;
}

function updateDocumentArchiveStatus_(sheet, headers, documentNumber, archiveDate) {
  const values = sheet.getDataRange().getValues();
  const documentColumn = headers['Tracking Number'] !== undefined ? headers['Tracking Number'] : headers['Document Number'];
  if (documentColumn === undefined) throw new Error('Documents sheet is missing the Tracking Number or Document Number column.');
  const rowIndex = values.slice(1).findIndex(row => text_(row[documentColumn]) === documentNumber);
  if (rowIndex === -1) throw new Error('The document number was not found in the Documents sheet.');
  const row = rowIndex + 2;
  sheet.getRange(row, headers['Archive Status'] + 1).setValue('Archived');
  sheet.getRange(row, headers['Archive Date'] + 1).setValue(archiveDate);
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
