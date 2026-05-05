const BASE_URL = 'https://whisperbox.koyeb.app';

async function request<T>(
  endpoint: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  register: (data: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (username: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getMe: (token: string) => request('/auth/me', { token }),
  refreshToken: (refresh_token: string) =>
    request('/auth/refresh', { method: 'POST', body: JSON.stringify({ refresh_token }) }),
  logout: (token: string, refresh_token: string) =>
    request('/auth/logout', { method: 'POST', token, body: JSON.stringify({ refresh_token }) }),
  getConversations: (token: string) => request('/conversations', { token }),
  getMessages: (token: string, userId: string, before?: string, limit = 50) => {
    let url = `/conversations/${userId}/messages?limit=${limit}`;
    if (before) url += `&before=${encodeURIComponent(before)}`;
    return request(url, { token });
  },
  getUserPublicKey: (token: string, userId: string) => request(`/users/${userId}/public-key`, { token }),
  sendMessageOffline: (token: string, to: string, payload: any) =>
    request('/messages', { method: 'POST', token, body: JSON.stringify({ to, payload }) }),
  searchUsers: (token: string, query: string) =>                     // ← AJOUT
    request(`/users/search?q=${encodeURIComponent(query)}`, { token }),
};