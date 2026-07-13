window.PaperPulseApi = (() => {
  const { apiUrl, requestTimeoutMs } = window.PaperPulseConfig;
  function endpoint(action, parameters = {}) {
    if (!apiUrl) throw new Error('PaperPulse is not configured yet. Please add the deployed Apps Script URL in js/config.js.');
    const url = new URL(apiUrl);
    url.searchParams.set('action', action);
    Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
    return url;
  }
  async function request(action, parameters) {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await fetch(endpoint(action, parameters), { method: 'GET', signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`The status service returned ${response.status}.`);
      const payload = await response.json();
      if (!payload || payload.success !== true) throw new Error(payload?.error || 'The status service returned an invalid response.');
      return payload;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('The request timed out. Please try again.');
      if (error instanceof TypeError) return jsonp(action, parameters);
      throw error;
    } finally { clearTimeout(timeout); }
  }
  function jsonp(action, parameters) {
    return new Promise((resolve, reject) => {
      const callback = `paperPulseCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement('script'); const timeout = setTimeout(cleanup, requestTimeoutMs);
      function cleanup(error) { clearTimeout(timeout); delete window[callback]; script.remove(); if (error) reject(error); }
      window[callback] = (payload) => { cleanup(); if (payload?.success === true) resolve(payload); else reject(new Error(payload?.error || 'The status service returned an invalid response.')); };
      try { const url = endpoint(action, parameters); url.searchParams.set('callback', callback); script.src = url.toString(); script.async = true; script.onerror = () => cleanup(new Error('The status service could not be reached.')); document.head.append(script); } catch (error) { cleanup(error); }
    });
  }
  return { lookup: (query) => request('lookup', { q: query }), suggestions: (query) => request('suggestions', { q: query }), stats: () => request('stats') };
})();
