const API_URL = "https://script.google.com/macros/s/AKfycby85uIXLP0C4nUM_8urWehcF7Lmf-r6cQ8E4bWEF3n8UWCoOlWFohAJI7I-l26LWTY0/exec";

let allDocuments = [];
let searchTimer;
let loaded = false;

const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");
const refreshButton = document.getElementById("refreshButton");

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
  if (!allDocuments.length) return showError("No document data is available to export.");
  if (!window.jspdf?.jsPDF || !window.jspdf.jsPDF.API.autoTable) return showError("PDF export is unavailable. Check the network connection and try again.");

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const generated = new Date();
  const ready = allDocuments.filter(record => text(record.status) === "ready for release").length;
  const signature = allDocuments.filter(record => text(record.status) === "for signature").length;
  const released = allDocuments.filter(record => text(record.status) === "released").length;

  pdf.setTextColor(11, 59, 145);
  pdf.setFontSize(16);
  pdf.text("GOOD SAMARITAN COLLEGES", 40, 38);
  pdf.setFontSize(10);
  pdf.setTextColor(32, 33, 36);
  pdf.text("Office of the Vice President for Academic Affairs", 40, 55);
  pdf.text("PaperPulse Lite", 40, 70);
  pdf.text(`Generated: ${generated.toLocaleDateString("en-PH")} ${generated.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}`, 40, 88);
  pdf.setFontSize(11);
  pdf.text(`Report Summary  |  Ready for Release: ${ready}  |  Documents for Signature: ${signature}  |  Released: ${released}`, 40, 112);
  pdf.autoTable({ startY: 128, head: [["Document Number", "Subject", "Requesting Office", "Requester", "Date Received", "Date Signed", "Status", "Remarks"]], body: allDocuments.map(record => [record.documentNumber, record.subject, record.requestingOffice, record.requester, formatDate(record.dateReceived), formatDate(record.dateSigned), record.status, record.remarks]), styles: { fontSize: 7, cellPadding: 4 }, headStyles: { fillColor: [11, 59, 145] }, margin: { left: 40, right: 40 } });
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
  if (!allDocuments.length) return showError("No document data is available to export.");
  if (!window.XLSX) return showError("Excel export is unavailable. Check the network connection and try again.");
  const rows = allDocuments.map(record => ({ "Document Number": record.documentNumber, Subject: record.subject, "Requesting Office": record.requestingOffice, Requester: record.requester, "Date Received": formatDate(record.dateReceived), "Date Signed": formatDate(record.dateSigned), Status: record.status, Remarks: record.remarks }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  const headers = ["Document Number", "Subject", "Requesting Office", "Requester", "Date Received", "Date Signed", "Status", "Remarks"];
  sheet["!cols"] = [18, 34, 27, 24, 16, 16, 20, 34].map(width => ({ wch: width }));
  headers.forEach((header, index) => {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: index })];
    cell.s = { fill: { fgColor: { rgb: "0B3B91" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, alignment: { horizontal: "center" } };
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Document Report");
  XLSX.writeFile(workbook, "PaperPulse-Lite-Report.xlsx");
}

function setPage(page) {
  document.querySelectorAll(".page").forEach(section => { section.hidden = section.id !== page; section.classList.toggle("is-active", section.id === page); });
  document.querySelectorAll("[data-page]").forEach(link => link.classList.toggle("is-active", link.dataset.page === page));
  window.location.hash = page === "home" ? "" : page;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

searchInput.addEventListener("input", () => { clearSearch.hidden = !searchInput.value.trim(); clearTimeout(searchTimer); searchTimer = setTimeout(render, 100); });
clearSearch.addEventListener("click", () => { searchInput.value = ""; clearSearch.hidden = true; render(); searchInput.focus(); });
refreshButton.addEventListener("click", () => loadDocuments(true));
document.getElementById("exportPdfButton").addEventListener("click", exportPdf);
document.getElementById("exportExcelButton").addEventListener("click", exportExcel);
document.getElementById("printButton").addEventListener("click", () => window.print());
document.querySelectorAll("[data-page]").forEach(link => link.addEventListener("click", event => { event.preventDefault(); setPage(link.dataset.page); }));
document.addEventListener("DOMContentLoaded", () => { setPage(location.hash === "#reports" ? "reports" : location.hash === "#about" ? "about" : "home"); loadDocuments(); });
