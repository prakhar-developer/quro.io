const BASE_URL = (import.meta.env.VITE_BACKEND_API ?? 'http://localhost:8000/').replace(/\/$/, '');

function getToken(): string | null {
  return localStorage.getItem('token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    if (data.detail === "EMAIL_NOT_VERIFIED") {
      throw new Error("EMAIL_NOT_VERIFIED");
    }
    throw new Error(data.detail || 'Login failed');
  }
  // Backend returns {status: "otp_sent", message: "...", email: "..."}
  return data as { status: string; message: string; email: string };
}

export async function registerUser(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Registration failed');
  // Returns verification pending status
  return data as { status: string; message: string; email: string };
}

export async function verifyOtp(email: string, otp: string) {
  const res = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Verification failed');
  return data as { access_token: string; token_type: string; user: UserProfile };
}

export async function resendOtp(email: string, purpose: 'signup' | 'login') {
  const res = await fetch(`${BASE_URL}/api/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, purpose }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to resend code');
  return data;
}

export async function requestLoginOtp(email: string) {
  const res = await fetch(`${BASE_URL}/api/auth/login-otp-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to request login code');
  return data;
}

export async function verifyLoginOtp(email: string, otp: string) {
  const res = await fetch(`${BASE_URL}/api/auth/login-otp-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Invalid login code');
  return data as { access_token: string; token_type: string; user: UserProfile };
}

export async function forgotPassword(email: string) {
  const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to process request');
  return data;
}

export async function resetPassword(email: string, otp: string, new_password: string) {
  const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, new_password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to reset password');
  return data;
}

export async function googleLogin(token: string) {
  const res = await fetch(`${BASE_URL}/api/auth/google/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Google Login failed');
  return data as { access_token: string; token_type: string; user: UserProfile };
}

export async function requestMobileOtp(phone_number: string) {
  const res = await fetch(`${BASE_URL}/api/auth/mobile/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to send OTP to mobile number');
  return data as { message: string; phone_number: string; mode: string };
}

export async function verifyMobileOtp(phone_number: string, otp: string) {
  const res = await fetch(`${BASE_URL}/api/auth/mobile/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number, otp }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Invalid OTP code');
  return data as { access_token: string; token_type: string; user: UserProfile };
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: authHeaders(),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function fetchAdminStats() {
  const res = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch admin stats');
  return data;
}

export async function fetchAdminUsers(skip = 0, limit = 100) {
  const res = await fetch(`${BASE_URL}/api/admin/users?skip=${skip}&limit=${limit}`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch users');
  return data;
}

export async function toggleAdminStatus(userId: string) {
  const res = await fetch(`${BASE_URL}/api/admin/users/${userId}/toggle-admin`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to toggle admin status');
  return data;
}

export async function deleteUser(userId: string) {
  const res = await fetch(`${BASE_URL}/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to delete user');
  return data;
}

export async function sendBroadcastEmail(subject: string, htmlContent: string) {
  const res = await fetch(`${BASE_URL}/api/admin/broadcast`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, html_content: htmlContent }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to send broadcast');
  return data;
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function fetchSessions(skip = 0, limit = 50) {
  const res = await fetch(`${BASE_URL}/api/sessions/?skip=${skip}&limit=${limit}`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch sessions');
  return data as { sessions: PastSession[]; total: number };
}

export async function fetchSession(sessionId: string) {
  const res = await fetch(`${BASE_URL}/api/sessions/${sessionId}`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Session not found');
  return data as SessionDetail;
}

export async function deleteSession(sessionId: string) {
  const res = await fetch(`${BASE_URL}/api/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.detail || 'Delete failed');
  }
  return true;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  api_key: string;
  is_admin: boolean;
  is_verified: boolean;
}

export interface PastSession {
  id: string;
  created_at: string;
  document_count: number;
  filenames: string[];
  message_count: number;
  title: string;
  db_ids: string[];
}

export interface SessionDetailDocument {
  id: string;
  filename: string;
  file_size: number;
  summary: Record<string, string | number | boolean | null>;
}

export interface SessionDetail {
  id: string;
  created_at: string;
  qdrant_session_id: string;
  documents: SessionDetailDocument[];
  messages: ChatMessageRecord[];
}

export interface ChatMessageRecord {
  id: string;
  role: 'user' | 'ai';
  content: string;
  created_at: string;
}
