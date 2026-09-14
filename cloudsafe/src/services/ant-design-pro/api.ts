// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

const BASE = '/api';

// ── Auth ──────────────────────────────────────────────────────────

export async function login(body: API.LoginParams, options?: Record<string, any>) {
  return request<{ status: string; type: string; currentAuthority: string; token: string }>(
    `${BASE}/login/account`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, data: body, ...(options || {}) },
  );
}

export async function outLogin(options?: Record<string, any>) {
  return request<Record<string, any>>(`${BASE}/login/outLogin`, { method: 'POST', ...(options || {}) });
}

export async function register(body: { username: string; email: string; password: string; name?: string }) {
  return request<{ success: boolean; token: string; userId: string }>(
    `${BASE}/register/account`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, data: body },
  );
}

// ── User ──────────────────────────────────────────────────────────

export async function currentUser(options?: Record<string, any>) {
  return request<{ data: API.CurrentUser }>(`${BASE}/currentUser`, { method: 'GET', ...(options || {}) });
}

export async function updateCurrentUser(body: Partial<API.CurrentUser>) {
  return request<{ success: boolean }>(`${BASE}/currentUser`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, data: body,
  });
}

// ── Notices ───────────────────────────────────────────────────────

export async function getNotices(options?: Record<string, any>) {
  return request<API.NoticeIconList>(`${BASE}/notices`, { method: 'GET', ...(options || {}) });
}

export async function markNoticeRead(id: string) {
  return request(`${BASE}/notices/${id}/read`, { method: 'PATCH' });
}

export async function markAllNoticesRead() {
  return request(`${BASE}/notices/read-all`, { method: 'PATCH' });
}

// ── Files ─────────────────────────────────────────────────────────

export async function uploadEncryptedFile(formData: FormData) {
  return request<{ success: boolean; data: API.FileItem }>(`${BASE}/files/upload`, {
    method: 'POST', data: formData,
    // do NOT set Content-Type — browser sets multipart boundary automatically
  });
}

export async function getFiles(params: {
  current?: number;
  pageSize?: number;
  name?: string;
  status?: number;
}) {
  return request<{ data: API.FileItem[]; total: number; success: boolean }>(`${BASE}/files`, {
    method: 'GET', params,
  });
}

export async function getFileMetadata(id: string) {
  return request<{ data: API.FileMetadata }>(`${BASE}/files/${id}/metadata`, { method: 'GET' });
}

export async function downloadEncryptedFile(id: string): Promise<Blob> {
  const resp = await fetch(`${BASE}/files/${id}/download`, {
    credentials: 'include',
    headers: { Authorization: `Bearer ${localStorage.getItem('cloudsafe_token') ?? ''}` },
  });
  if (!resp.ok) throw new Error('Tải về thất bại');
  return resp.blob();
}

export async function deleteFile(id: string) {
  return request<{ success: boolean }>(`${BASE}/files/${id}`, { method: 'DELETE' });
}

export async function shareFile(body: {
  fileId: string;
  sharedWithUserId: string;
  reEncryptedAesKey: string;
  expiresAt?: string;
}) {
  return request<{ success: boolean }>(`${BASE}/files/share`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, data: body,
  });
}

export async function getSharedWithMe(params: { current?: number; pageSize?: number }) {
  return request<{ data: API.FileItem[]; total: number; success: boolean }>(`${BASE}/files/shared-with-me`, {
    method: 'GET', params,
  });
}

// ── RSA Keys ──────────────────────────────────────────────────────

export async function getKeys() {
  return request<{ data: API.KeyPair[]; success: boolean }>(`${BASE}/keys`, { method: 'GET' });
}

export async function registerKey(body: {
  publicKeyPem: string;
  publicKeyFingerprint: string;
  name?: string;
  keySize?: number;
}) {
  return request<{ success: boolean; data: API.KeyPair }>(`${BASE}/keys`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, data: body,
  });
}

export async function getUserActiveKey(userId: string) {
  return request<{ data: { id: string; publicKeyPem: string; publicKeyFingerprint: string } }>(
    `${BASE}/keys/user/${userId}/active`, { method: 'GET' },
  );
}

export async function revokeKey(id: string) {
  return request<{ success: boolean }>(`${BASE}/keys/${id}/revoke`, { method: 'PATCH' });
}

export async function renameKey(id: string, name: string) {
  return request<{ success: boolean }>(`${BASE}/keys/${id}/rename`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, data: { name },
  });
}

// ── Dashboard ─────────────────────────────────────────────────────

export async function getDashboardStats() {
  return request<{ data: API.DashboardStats }>(`${BASE}/dashboard/stats`, { method: 'GET' });
}

export async function getAnalysisChartData() {
  return request(`${BASE}/dashboard/fake_analysis_chart_data`, { method: 'GET' });
}

export async function getWorkplaceChartData() {
  return request(`${BASE}/dashboard/fake_workplace_chart_data`, { method: 'GET' });
}

export async function getProjectNotice() {
  return request(`${BASE}/dashboard/project/notice`, { method: 'GET' });
}

export async function getActivities() {
  return request(`${BASE}/dashboard/activities`, { method: 'GET' });
}

// ── Table / Rule ──────────────────────────────────────────────────

export async function rule(params: { current?: number; pageSize?: number }, options?: Record<string, any>) {
  return request<API.RuleList>(`${BASE}/rule`, { method: 'GET', params, ...(options || {}) });
}

export async function addRule(options?: Record<string, any>) {
  return request<API.RuleListItem>(`${BASE}/rule`, {
    method: 'POST', data: { method: 'post', ...(options || {}) },
  });
}

export async function updateRule(options?: Record<string, any>) {
  return request<API.RuleListItem>(`${BASE}/rule`, {
    method: 'POST', data: { method: 'update', ...(options || {}) },
  });
}

export async function removeRule(options?: Record<string, any>) {
  return request<Record<string, any>>(`${BASE}/rule`, {
    method: 'POST', data: { method: 'delete', ...(options || {}) },
  });
}
