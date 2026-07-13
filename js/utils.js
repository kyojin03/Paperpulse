window.PaperPulseUtils = (() => {
  const STATUS_CLASSES = { Received: 'received', 'For Signature': 'for-signature', Signed: 'signed', Released: 'released' };
  const normalizeQuery = (value) => String(value || '').trim().replace(/\s+/g, ' ');
  const debounce = (callback, delay) => { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => callback(...args), delay); }; };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const formatDate = (value) => { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }).format(date); };
  const statusClass = (status) => STATUS_CLASSES[status] || 'received';
  return { normalizeQuery, debounce, escapeHtml, formatDate, statusClass };
})();
