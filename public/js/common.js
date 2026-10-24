const API = {
  get token() { return localStorage.getItem('token'); },
  async request(url, method = 'GET', body = null) {
    const headers = { 'Authorization': `Bearer ${this.token}` };
    if (body) headers['Content-Type'] = 'application/json';
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
    if (res.status === 401) { localStorage.clear(); window.location.href = 'index.html'; return; }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Khalad ayaa dhacay');
    return data;
  },
  get(url) { return this.request(url); },
  post(url, body) { return this.request(url, 'POST', body); },
  put(url, body) { return this.request(url, 'PUT', body); },
  delete(url) { return this.request(url, 'DELETE'); }
};

// Hubi haddii qofku login sameeyay
if (!API.token && !window.location.pathname.includes('index.html')) {
  window.location.href = 'index.html';
}