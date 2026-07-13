window.PaperPulseUtils = (() => {
  const STATUS_CLASSES = { Received: 'received', 'For Signature': 'for-signature', Signed: 'signed', Released: 'released' };
  const normalizeQuery = (value) => String(value || '').trim().replace(/\s+/g, ' ');
  const searchableText = (value) => normalizeQuery(value).toLocaleLowerCase();
  const debounce = (callback, delay) => { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => callback(...args), delay); }; };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const formatDate = (value) => { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }).format(date); };
  const formatDateTime = (value) => { if (!value) return '-'; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date); };
  const statusClass = (status) => STATUS_CLASSES[status] || 'received';
  const timestamp = (value) => { const parsed = Date.parse(value); return Number.isNaN(parsed) ? 0 : parsed; };
  const matchesDocument = (record, query) => { const normalized = searchableText(query); return !normalized || searchableText(record.trackingNumber).includes(normalized) || searchableText(record.subject).includes(normalized); };
  return { normalizeQuery, searchableText, debounce, escapeHtml, formatDate, formatDateTime, statusClass, timestamp, matchesDocument };
})();
