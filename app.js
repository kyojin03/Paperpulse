const API_URL = "https://script.google.com/macros/s/AKfycby85uIXLP0C4nUM_8urWehcF7Lmf-r6cQ8E4bWEF3n8UWCoOlWFohAJI7I-l26LWTY0/exec";

let allDocuments = [];
let archiveDocuments = [];
let selectedArchiveDocument = null;
let searchTimer;
let loaded = false;

const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");
const refreshButton = document.getElementById("refreshButton");
const releasedSearchInput = document.getElementById("releasedSearchInput");
const newDocumentButton = document.getElementById("newDocumentButton");
const newDocumentDialog = document.getElementById("newDocumentDialog");
const newDocumentForm = document.getElementById("newDocumentForm");
const newDocumentError = document.getElementById("newDocumentError");
const newDocumentSave = document.getElementById("newDocumentSave");
const registrationSuccessDialog = document.getElementById("registrationSuccessDialog");
const registeredDocumentNumber = document.getElementById("registeredDocumentNumber");
const registeredDocumentStatus = document.getElementById("registeredDocumentStatus");
const archiveLoginForm = document.getElementById("archiveLoginForm");
const archivePassword = document.getElementById("archivePassword");
const archiveLoginButton = document.getElementById("archiveLoginButton");
const archiveLoginError = document.getElementById("archiveLoginError");
const archiveContent = document.getElementById("archiveContent");
const archiveRefreshButton = document.getElementById("archiveRefreshButton");
const archiveSearchInput = document.getElementById("archiveSearchInput");
const archiveTableBody = document.getElementById("archiveTableBody");
const archiveTableWrap = document.getElementById("archiveTableWrap");
const archiveEmpty = document.getElementById("archiveEmpty");
const archiveError = document.getElementById("archiveError");
const archiveUploadButton = document.getElementById("archiveUploadButton");
const archiveUploadSuccess = document.getElementById("archiveUploadSuccess");
const archiveUploadDialog = document.getElementById("archiveUploadDialog");
const archiveUploadForm = document.getElementById("archiveUploadForm");
const archiveDocumentSearch = document.getElementById("archiveDocumentSearch");
const archiveDocumentResults = document.getElementById("archiveDocumentResults");
const archiveDocumentEmpty = document.getElementById("archiveDocumentEmpty");
const archiveSelectedDocument = document.getElementById("archiveSelectedDocument");
const archiveSelectedNumber = document.getElementById("archiveSelectedNumber");
const archiveSelectedSubject = document.getElementById("archiveSelectedSubject");
const archiveSelectedOffice = document.getElementById("archiveSelectedOffice");
const archiveSelectedRequester = document.getElementById("archiveSelectedRequester");
const archiveSelectedStatus = document.getElementById("archiveSelectedStatus");
const archiveFile = document.getElementById("archiveFile");
const archiveRemarks = document.getElementById("archiveRemarks");
const archiveUploadError = document.getElementById("archiveUploadError");
const archiveUploadSubmit = document.getElementById("archiveUploadSubmit");

function endpoint(action) {
  const url = new URL(API_URL);
  url.searchParams.set("action", action);
  return url.toString();
}

async function loadDocuments(manual = false) {
  if (manual) setRefreshState("Refreshing...", true);
  hideError();

  try {
    const response = await fetch(endpoint("list"), { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`The document service returned ${response.status}.`);

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error("The document service returned an invalid response.");
    }
    if (payload?.success === false) throw new Error(payload.message || payload.error || "The document service could not complete the request.");

    const records = Array.isArray(payload)
      ? payload
      : [payload?.documents, payload?.data, payload?.records, payload?.results].find(Array.isArray);
    if (!records || !records.every(record => record && typeof record === "object")) {
      throw new Error("The document service returned an invalid response.");
    }
    allDocuments = records.map(normalize);
    searchInput.value = "";
    clearSearch.hidden = true;
    render();
    renderReports();
    loaded = true;
    hideError();
    document.getElementById("lastUpdated").textContent = `Updated ${formatTime(payload.updatedAt || new Date().toISOString())}`;

    if (manual) {
      setRefreshState("Updated", true);
      setTimeout(() => setRefreshState("Refresh", false), 2000);
    }
  } catch (error) {
    showError(error.message);
    if (!loaded) {
      showEmpty("release", "No documents available.");
      showEmpty("signature", "No documents available.");
    }
    if (manual) setRefreshState("Refresh", false);
  }
}

function archiveEndpoint(action, parameters = {}) {
  const url = new URL(API_URL);
  url.searchParams.set("action", action);
  Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

function closeDialog(dialog) {
  if (dialog && typeof dialog.close === "function") dialog.close();
}

function openDialog(dialog) {
  if (dialog && typeof dialog.showModal === "function") dialog.showModal();
}

async function createDocument(event) {
  event.preventDefault();
  if (!newDocumentForm || !newDocumentSave || !newDocumentError) return;

  newDocumentError.hidden = true;
  const form = new URLSearchParams({
    action: "create_document",
    subject: newDocumentForm.elements.subject.value.trim(),
    requestingOffice: newDocumentForm.elements.requestingOffice.value.trim(),
    requester: newDocumentForm.elements.requester.value.trim(),
    remarks: newDocumentForm.elements.remarks.value.trim()
  });

  newDocumentSave.disabled = true;
  newDocumentSave.textContent = "Saving...";

  try {
    const response = await fetch(API_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
  },
  body: form
});
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error("The document service returned an invalid response.");
    }
    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.error || payload?.message || `The document service returned ${response.status}.`);
    }

    const record = payload.document || payload.data || payload.record || payload;
    const documentNumber = record.documentNumber || record.trackingNumber || record["Document Number"] || record["Tracking Number"];
    if (!documentNumber) throw new Error(payload?.error || payload?.message || "The document service returned an invalid response.");

    await loadDocuments();
    closeDialog(newDocumentDialog);
    newDocumentForm.reset();
    registeredDocumentNumber.textContent = documentNumber;
    registeredDocumentStatus.textContent = record.status || record.Status || "For Signature";
    openDialog(registrationSuccessDialog);
  } catch (error) {
    newDocumentError.textContent = error.message;
    newDocumentError.hidden = false;
  } finally {
    newDocumentSave.disabled = false;
    newDocumentSave.textContent = "Save";
  }
}

function archiveMessage(element, message) {
  const textElement = element?.querySelector("p");
  if (textElement) textElement.textContent = message;
  if (element) element.hidden = false;
}

function normalizeArchive(record) {
  return {
    archiveId: String(record.archiveId || record.id || record["Archive ID"] || "").trim(),
    documentNumber: String(record.documentNumber || record.trackingNumber || record["Document Number"] || record["Tracking Number"] || "").trim(),
    subject: String(record.subject || record.Subject || "").trim(),
    requestingOffice: String(record.requestingOffice || record.office || record["Requesting Office"] || "").trim(),
    requester: String(record.requester || record.Requester || "").trim(),
    archiveDate: record.archiveDate || record["Archive Date"] || record.uploadTimestamp || record["Upload Timestamp"] || "",
    driveUrl: String(record.driveUrl || record.fileUrl || record.url || record["Drive URL"] || "").trim()
  };
}

function archiveMatches(record, query) {
  const needle = text(query);
  return !needle || [record.archiveId, record.documentNumber, record.subject, record.requestingOffice, record.requester].some(value => text(value).includes(needle));
}

async function archiveLogin(event) {
  event.preventDefault();
  if (!archivePassword || !archiveLoginButton || !archiveLoginError || !archiveContent) return;

  const password = archivePassword.value;
  archiveLoginError.hidden = true;
  if (!password) return;
  archiveLoginButton.disabled = true;
  archiveLoginButton.textContent = "Unlocking...";

  try {
    const response = await fetch(archiveEndpoint("archive_login", { password }), { headers: { Accept: "application/json" } });
    const payload = await response.json();
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || payload?.message || "Incorrect password.");
    }
    archivePassword.value = "";
    archiveLoginForm.hidden = true;
    archiveContent.hidden = false;
    await loadArchive();
  } catch (error) {
    archivePassword.value = "";
    archiveLoginError.textContent = error.message;
    archiveLoginError.hidden = false;
  } finally {
    archiveLoginButton.disabled = false;
    archiveLoginButton.textContent = "Unlock";
  }
}

async function loadArchive(manual = false) {
  if (!archiveTableBody || !archiveTableWrap || !archiveEmpty) return;
  if (manual && archiveRefreshButton) {
    archiveRefreshButton.disabled = true;
    archiveRefreshButton.querySelector("span").textContent = "Refreshing...";
  }
  if (archiveError) archiveError.hidden = true;

  try {
    const response = await fetch(archiveEndpoint("archive_list"), { headers: { Accept: "application/json" } });
    const payload = await response.json();
    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.error || payload?.message || "The archive service could not complete the request.");
    }
    const records = Array.isArray(payload) ? payload : payload.documents || payload.data || payload.records || payload.results;
    if (!Array.isArray(records) || !records.every(record => record && typeof record === "object")) {
      throw new Error("The archive service returned an invalid response.");
    }
    archiveDocuments = records.map(normalizeArchive).sort((left, right) => (parsedDate(right.archiveDate)?.getTime() || 0) - (parsedDate(left.archiveDate)?.getTime() || 0));
    renderArchive();
  } catch (error) {
    archiveMessage(archiveError, error.message);
  } finally {
    if (manual && archiveRefreshButton) {
      archiveRefreshButton.querySelector("span").textContent = "Updated";
      setTimeout(() => {
        archiveRefreshButton.disabled = false;
        archiveRefreshButton.querySelector("span").textContent = "Refresh";
      }, 1200);
    }
  }
}

function renderArchive() {
  if (!archiveSearchInput || !archiveTableBody || !archiveTableWrap || !archiveEmpty) return;
  const records = archiveDocuments.filter(record => archiveMatches(record, archiveSearchInput.value));
  archiveTableBody.replaceChildren();
  records.forEach(record => {
    const row = document.createElement("tr");
    [record.archiveId, record.documentNumber, record.subject, record.requestingOffice, record.requester, formatDate(record.archiveDate)].forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value || "-";
      row.append(cell);
    });
    const actions = document.createElement("td");
    ["View PDF", "Download PDF", "Print PDF"].forEach(action => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "material-button";
      button.textContent = action;
      button.dataset.archiveAction = action;
      button.dataset.archiveUrl = record.driveUrl;
      button.disabled = !record.driveUrl;
      actions.append(button);
    });
    row.append(actions);
    archiveTableBody.append(row);
  });
  archiveTableWrap.hidden = records.length === 0;
  archiveEmpty.hidden = records.length > 0;
}

function openArchiveDocument(event) {
  const button = event.target.closest("[data-archive-action]");
  if (!button?.dataset.archiveUrl) return;
  window.open(button.dataset.archiveUrl, "_blank", "noopener");
}

async function openArchiveUploadDialog() {
  if (!archiveUploadDialog || !archiveUploadForm) return;
  archiveUploadForm.reset();
  selectedArchiveDocument = null;
  archiveDocumentResults.hidden = true;
  archiveDocumentEmpty.hidden = true;
  archiveSelectedDocument.hidden = true;
  archiveUploadError.hidden = true;
  archiveUploadSuccess.hidden = true;
  archiveUploadSubmit.disabled = true;
  openDialog(archiveUploadDialog);
  await loadDocuments();
  renderArchiveDocumentCandidates();
}

function renderArchiveDocumentCandidates() {
  if (!archiveDocumentSearch || !archiveDocumentResults || !archiveDocumentEmpty) return;
  const query = archiveDocumentSearch.value.trim();
  const records = allDocuments.filter(record => text(record.status) === "released" && matches(record, query));
  const body = archiveDocumentResults.querySelector("tbody");
  if (!body) return;
  body.replaceChildren();
  records.forEach(record => {
    const row = document.createElement("tr");
    [record.documentNumber, record.subject, record.requestingOffice, record.requester].forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value || "-";
      row.append(cell);
    });
    const action = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "material-button";
    button.textContent = "Select";
    button.dataset.documentNumber = record.documentNumber;
    action.append(button);
    row.append(action);
    body.append(row);
  });
  archiveDocumentResults.hidden = records.length === 0;
  archiveDocumentEmpty.hidden = records.length > 0;
}

function selectArchiveDocument(event) {
  const button = event.target.closest("[data-document-number]");
  if (!button) return;
  selectedArchiveDocument = allDocuments.find(record => record.documentNumber === button.dataset.documentNumber && text(record.status) === "released") || null;
  if (!selectedArchiveDocument) return;
  archiveSelectedNumber.textContent = selectedArchiveDocument.documentNumber;
  archiveSelectedSubject.textContent = selectedArchiveDocument.subject || "-";
  archiveSelectedOffice.textContent = selectedArchiveDocument.requestingOffice || "-";
  archiveSelectedRequester.textContent = selectedArchiveDocument.requester || "-";
  archiveSelectedStatus.textContent = selectedArchiveDocument.status || "-";
  archiveSelectedDocument.hidden = false;
  updateArchiveUploadButton();
}

function updateArchiveUploadButton() {
  if (!archiveUploadSubmit) return;
  archiveUploadSubmit.disabled = !selectedArchiveDocument || !archiveFile?.files?.[0];
}

async function uploadArchive(event) {
  event.preventDefault();
  if (!selectedArchiveDocument || !archiveFile || !archiveUploadError || !archiveUploadSubmit) return;
  const file = archiveFile.files[0];
  archiveUploadError.hidden = true;
  if (!file || (file.type && file.type !== "application/pdf") || !/\.pdf$/i.test(file.name)) {
    archiveUploadError.textContent = "Choose a PDF file to upload.";
    archiveUploadError.hidden = false;
    return;
  }

 const fileBase64 = await new Promise((resolve, reject) => {
  const reader = new FileReader();

  reader.onload = () => {
    resolve(reader.result.split(",")[1]);
  };

  reader.onerror = reject;

  reader.readAsDataURL(file);
});

const form = new URLSearchParams();

form.set("action", "archive_upload");
form.set("documentNumber", selectedArchiveDocument.documentNumber);
form.set("subject", selectedArchiveDocument.subject);
form.set("requestingOffice", selectedArchiveDocument.requestingOffice);
form.set("requester", selectedArchiveDocument.requester);
form.set("archiveRemarks", archiveRemarks.value.trim());

form.set("fileName", file.name);
form.set("fileMimeType", file.type);
form.set("fileData", fileBase64);

  archiveUploadSubmit.disabled = true;
  archiveUploadSubmit.textContent = "Uploading...";
  try {
    const response = await fetch(API_URL, { method: "POST", body: form });
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error("The archive service returned an invalid response.");
    }
    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.error || payload?.message || `The archive service returned ${response.status}.`);
    }
    closeDialog(archiveUploadDialog);
    selectedArchiveDocument = null;
    await loadArchive();
    await loadDocuments();
    archiveUploadSuccess.textContent = `Archive ${payload.archiveId} uploaded successfully.`;
    archiveUploadSuccess.hidden = false;
  } catch (error) {
    archiveUploadError.textContent = error.message;
    archiveUploadError.hidden = false;
  } finally {
    archiveUploadSubmit.textContent = "Upload";
    updateArchiveUploadButton();
  }
}

function normalize(record) {
  return {
    documentNumber: String(record.documentNumber || record.trackingNumber || record["Document Number"] || record["Tracking Number"] || "").trim(),
    subject: String(record.subject || record.Subject || "").trim(),
    requestingOffice: String(record.requestingOffice || record.office || record["Requesting Office"] || "").trim(),
    requester: String(record.requester || record.Requester || "").trim(),
    dateReceived: record.dateReceived || record["Date Received"] || "",
    dateSigned: record.dateSigned || record["Date Signed"] || "",
    status: String(record.status || record.Status || "").trim(),
    remarks: String(record.remarks || record.Remarks || "").trim()
  };
}

function text(value) { return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase(); }
function matches(record, query) { const needle = text(query); return !needle || [record.documentNumber, record.subject, record.requestingOffice, record.requester].some(value => text(value).includes(needle)); }
function parsedDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date; }
function formatDate(value) { const date = parsedDate(value); return date ? new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(date) : value || "-"; }
function formatTime(value) { const date = parsedDate(value); return date ? new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" }).format(date) : ""; }

function render() {
  const visible = allDocuments.filter(record => matches(record, searchInput.value));
  renderTable("release", visible.filter(record => text(record.status) === "ready for release"), ["documentNumber", "subject", "requestingOffice", "dateSigned"], "release");
  renderTable("signature", visible.filter(record => text(record.status) === "for signature"), ["documentNumber", "subject", "requestingOffice", "dateReceived"], "signature");
}

function renderTable(kind, rows, columns, statusClass) {
  const body = document.getElementById(`${kind}TableBody`);
  body.replaceChildren();

  rows.forEach(record => {
    const row = document.createElement("tr");
    columns.forEach((column, index) => {
      const cell = document.createElement("td");
      if (index === 0) {
        const number = document.createElement("span");
        number.className = "document-number";
        number.innerHTML = `<span class="status-dot status-dot--${statusClass}" aria-hidden="true"></span>`;
        number.append(document.createTextNode(record[column] || "-"));
        cell.append(number);
      } else {
        cell.textContent = column === "dateReceived" || column === "dateSigned" ? formatDate(record[column]) : record[column] || "-";
      }
      row.append(cell);
    });
    body.append(row);
  });

  document.getElementById(`${kind}TableWrap`).hidden = rows.length === 0;
  document.getElementById(`${kind}Empty`).hidden = rows.length > 0;
  document.getElementById(`${kind}Count`).textContent = `(${rows.length})`;
  if (!rows.length) showEmpty(kind, searchInput.value.trim() ? "No matching documents found." : "No documents available.");
}

function showEmpty(kind, message) {
  document.querySelector(`#${kind}Empty p`).textContent = message;
  document.getElementById(`${kind}Empty`).hidden = false;
  document.getElementById(`${kind}TableWrap`).hidden = true;
}

function setRefreshState(label, disabled) {
  refreshButton.disabled = disabled;
  refreshButton.querySelector("span").textContent = label;
}

function showError(message) { document.getElementById("errorMessage").textContent = message; document.getElementById("errorState").hidden = false; }
function hideError() { document.getElementById("errorState").hidden = true; }

function renderReports() {
  const counts = { ready: 0, signature: 0, released: 0 };
  allDocuments.forEach(record => {
    const status = text(record.status);
    if (status === "ready for release") counts.ready += 1;
    if (status === "for signature") counts.signature += 1;
    if (status === "released") counts.released += 1;
  });
  document.getElementById("reportTotal").textContent = allDocuments.length;
  document.getElementById("reportReady").textContent = counts.ready;
  document.getElementById("reportSignature").textContent = counts.signature;
  document.getElementById("reportReleased").textContent = counts.released;
  renderMonthly();
  renderOffices();
  renderProcessingTime();
  renderAging();
  renderReleasedDocuments();
}

function releasedRecords() {
  return allDocuments.filter(record => text(record.status) === "released");
}

function renderReleasedDocuments() {
  const query = releasedSearchInput.value;
  const rows = releasedRecords().filter(record => matches(record, query));
  const body = document.getElementById("releasedTableBody");
  body.replaceChildren();

  rows.forEach(record => {
    const row = document.createElement("tr");
    [record.documentNumber, record.subject, record.requestingOffice, record.requester, formatDate(record.dateSigned), record.remarks].forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value || "-";
      row.append(cell);
    });
    body.append(row);
  });

  document.getElementById("releasedTableWrap").hidden = rows.length === 0;
  document.getElementById("releasedEmpty").hidden = rows.length > 0;
}

function releasedExportRecords() {
  return releasedRecords().filter(record => matches(record, releasedSearchInput.value));
}

function renderMonthly() {
  const grouped = {};
  allDocuments.forEach(record => {
    const date = parsedDate(record.dateSigned || record.dateReceived);
    if (!date) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    grouped[key] = (grouped[key] || 0) + 1;
  });
  const entries = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).slice(-12);
  const chart = document.getElementById("monthlyChart");
  chart.replaceChildren();
  document.getElementById("monthlyEmpty").hidden = entries.length > 0;
  if (!entries.length) return;
  const maximum = Math.max(...entries.map(([, count]) => count));
  entries.forEach(([key, count]) => {
    const column = document.createElement("div");
    column.className = "bar";
    column.innerHTML = `<strong>${count}</strong><span style="height:${Math.max(8, Math.round(count / maximum * 130))}px"></span><small>${new Intl.DateTimeFormat("en-PH", { month: "short", year: "2-digit" }).format(new Date(`${key}-01T00:00:00`))}</small>`;
    chart.append(column);
  });
}

function renderOffices() {
  const counts = {};
  allDocuments.forEach(record => { if (record.requestingOffice) counts[record.requestingOffice] = (counts[record.requestingOffice] || 0) + 1; });
  const entries = Object.entries(counts).sort(([, left], [, right]) => right - left).slice(0, 10);
  const body = document.getElementById("officesTableBody");
  body.replaceChildren();
  entries.forEach(([office, count], index) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${index + 1}</td><td></td><td>${count}</td>`;
    row.children[1].textContent = office;
    body.append(row);
  });
  document.getElementById("officesEmpty").hidden = entries.length > 0;
}

function renderProcessingTime() {
  const days = allDocuments.map(record => {
    const received = parsedDate(record.dateReceived);
    const signed = parsedDate(record.dateSigned);
    return received && signed && signed >= received ? (signed - received) / 86400000 : null;
  }).filter(value => value !== null);
  document.getElementById("processingTime").textContent = days.length ? `${(days.reduce((total, value) => total + value, 0) / days.length).toFixed(1)} days` : "-";
}

function renderAging() {
  const buckets = { "1-3 Days": 0, "4-7 Days": 0, "8+ Days": 0 };
  allDocuments.forEach(record => {
    if (text(record.status) === "released") return;
    const received = parsedDate(record.dateReceived);
    if (!received) return;
    const age = Math.floor((Date.now() - received.getTime()) / 86400000);
    if (age >= 1 && age <= 3) buckets["1-3 Days"] += 1;
    else if (age >= 4 && age <= 7) buckets["4-7 Days"] += 1;
    else if (age >= 8) buckets["8+ Days"] += 1;
  });
  const list = document.getElementById("agingList");
  list.replaceChildren();
  Object.entries(buckets).forEach(([label, count]) => {
    const item = document.createElement("div");
    item.innerHTML = `<dt>${label}</dt><dd>${count}</dd>`;
    list.append(item);
  });
}

function exportPdf() {
  const records = releasedExportRecords();
  if (!records.length) return showError("No released document data is available to export.");
  if (!window.jspdf?.jsPDF || !window.jspdf.jsPDF.API.autoTable) return showError("PDF export is unavailable. Check the network connection and try again.");

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const generated = new Date();
  const released = records.length;

  pdf.setTextColor(11, 59, 145);
  pdf.setFontSize(16);
  pdf.text("GOOD SAMARITAN COLLEGES", 40, 38);
  pdf.setFontSize(10);
  pdf.setTextColor(32, 33, 36);
  pdf.text("Office of the Vice President for Academic Affairs", 40, 55);
  pdf.text("PaperPulse Lite", 40, 70);
  pdf.text(`Generated: ${generated.toLocaleDateString("en-PH")} ${generated.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}`, 40, 88);
  pdf.setFontSize(11);
  pdf.text(`Released Documents | ${released} record${released === 1 ? "" : "s"}${releasedSearchInput.value.trim() ? " (filtered)" : ""}`, 40, 112);
  pdf.autoTable({ startY: 128, head: [["Document Number", "Subject", "Requesting Office", "Requester", "Date Signed", "Remarks"]], body: records.map(record => [record.documentNumber, record.subject, record.requestingOffice, record.requester, formatDate(record.dateSigned), record.remarks]), styles: { fontSize: 7, cellPadding: 4 }, headStyles: { fillColor: [11, 59, 145] }, margin: { left: 40, right: 40 } });
  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFontSize(8);
    pdf.setTextColor(95, 99, 104);
    pdf.text("Generated by PaperPulse Lite | Developed by Piolo Bernardino, LMS Associate & Systems Support | Good Samaritan Colleges", 40, 575);
    pdf.text(`Page ${page} of ${pageCount}`, 792, 575, { align: "right" });
  }
  pdf.save("PaperPulse-Lite-Report.pdf");
}

function exportExcel() {
  const records = releasedExportRecords();
  if (!records.length) return showError("No released document data is available to export.");
  if (!window.XLSX) return showError("Excel export is unavailable. Check the network connection and try again.");
  const rows = records.map(record => ({ "Document Number": record.documentNumber, Subject: record.subject, "Requesting Office": record.requestingOffice, Requester: record.requester, "Date Signed": formatDate(record.dateSigned), Remarks: record.remarks }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  const headers = ["Document Number", "Subject", "Requesting Office", "Requester", "Date Signed", "Remarks"];
  sheet["!cols"] = [18, 34, 27, 24, 16, 34].map(width => ({ wch: width }));
  headers.forEach((header, index) => {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: index })];
    cell.s = { fill: { fgColor: { rgb: "0B3B91" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, alignment: { horizontal: "center" } };
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Document Report");
  XLSX.writeFile(workbook, "PaperPulse-Lite-Report.xlsx");
}

function escapeHtml(value) {
  return String(value || "-").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[character]));
}

function printReleasedDocuments() {
  const records = releasedExportRecords();
  if (!records.length) return showError("No released document data is available to print.");

  const reportWindow = window.open("", "_blank", "width=1000,height=700");
  if (!reportWindow) return showError("Unable to open the print report. Please allow pop-ups and try again.");

  const generated = new Date();
  const rows = records.map(record => `<tr><td>${escapeHtml(record.documentNumber)}</td><td>${escapeHtml(record.subject)}</td><td>${escapeHtml(record.requestingOffice)}</td><td>${escapeHtml(record.requester)}</td><td>${escapeHtml(formatDate(record.dateSigned))}</td><td>${escapeHtml(record.remarks)}</td></tr>`).join("");
  reportWindow.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>PaperPulse Lite - Released Documents</title><style>body{font:12px Arial,sans-serif;color:#202124;margin:32px}h1{margin:0;color:#0b3b91;font-size:19px}p{margin:5px 0}table{width:100%;border-collapse:collapse;margin-top:22px}th,td{padding:8px;border:1px solid #dadce0;text-align:left;vertical-align:top}th{background:#0b3b91;color:#fff;font-size:10px;text-transform:uppercase}footer{position:fixed;bottom:0;left:32px;right:32px;color:#5f6368;font-size:9px}</style></head><body><h1>GOOD SAMARITAN COLLEGES</h1><p>Office of the Vice President for Academic Affairs</p><p><strong>PaperPulse Lite - Released Documents</strong></p><p>Generated ${escapeHtml(generated.toLocaleString("en-PH"))} | ${records.length} record${records.length === 1 ? "" : "s"}${releasedSearchInput.value.trim() ? " (filtered)" : ""}</p><table><thead><tr><th>Document Number</th><th>Subject</th><th>Requesting Office</th><th>Requester</th><th>Date Signed</th><th>Remarks</th></tr></thead><tbody>${rows}</tbody></table><footer>Generated by PaperPulse Lite | Developed by Piolo Bernardino, LMS Associate &amp; Systems Support | Good Samaritan Colleges</footer></body></html>`);
  reportWindow.document.close();
  reportWindow.focus();
  reportWindow.print();
}

function setPage(page) {
  document.querySelectorAll(".page").forEach(section => { section.hidden = section.id !== page; section.classList.toggle("is-active", section.id === page); });
  document.querySelectorAll("[data-page]").forEach(link => link.classList.toggle("is-active", link.dataset.page === page));
  window.location.hash = page === "home" ? "" : page;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

searchInput.addEventListener("input", () => { clearSearch.hidden = !searchInput.value.trim(); clearTimeout(searchTimer); searchTimer = setTimeout(render, 100); });
releasedSearchInput.addEventListener("input", renderReleasedDocuments);
clearSearch.addEventListener("click", () => { searchInput.value = ""; clearSearch.hidden = true; render(); searchInput.focus(); });
refreshButton.addEventListener("click", () => loadDocuments(true));
document.getElementById("exportPdfButton").addEventListener("click", exportPdf);
document.getElementById("exportExcelButton").addEventListener("click", exportExcel);
document.getElementById("printButton").addEventListener("click", printReleasedDocuments);
document.querySelectorAll("[data-page]").forEach(link => link.addEventListener("click", event => { event.preventDefault(); setPage(link.dataset.page); }));
if (newDocumentButton && newDocumentForm) {
  newDocumentButton.addEventListener("click", () => {
    newDocumentForm.reset();
    newDocumentError.hidden = true;
    openDialog(newDocumentDialog);
  });
  newDocumentForm.addEventListener("submit", createDocument);
}
if (archiveLoginForm) archiveLoginForm.addEventListener("submit", archiveLogin);
if (archiveRefreshButton) archiveRefreshButton.addEventListener("click", () => loadArchive(true));
if (archiveSearchInput) archiveSearchInput.addEventListener("input", renderArchive);
if (archiveTableBody) archiveTableBody.addEventListener("click", openArchiveDocument);
if (archiveUploadButton) archiveUploadButton.addEventListener("click", openArchiveUploadDialog);
if (archiveDocumentSearch) archiveDocumentSearch.addEventListener("input", renderArchiveDocumentCandidates);
if (archiveDocumentResults) archiveDocumentResults.addEventListener("click", selectArchiveDocument);
if (archiveFile) archiveFile.addEventListener("change", updateArchiveUploadButton);
if (archiveUploadForm) archiveUploadForm.addEventListener("submit", uploadArchive);
document.querySelectorAll("[data-close-dialog]").forEach(button => button.addEventListener("click", () => closeDialog(document.getElementById(button.dataset.closeDialog))));
document.addEventListener("DOMContentLoaded", () => { setPage(location.hash === "#reports" ? "reports" : location.hash === "#about" ? "about" : "home"); loadDocuments(); });
