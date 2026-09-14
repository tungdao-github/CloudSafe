// @ts-ignore
/* eslint-disable */

declare namespace API {
  type CurrentUser = {
    userId?: string;
    name?: string;
    avatar?: string;
    email?: string;
    signature?: string;
    title?: string;
    group?: string;
    address?: string;
    phone?: string;
    access?: string;  // "admin" | "user"
    notifyCount?: number;
    unreadCount?: number;
  };

  type LoginResult = {
    status?: string;
    type?: string;
    currentAuthority?: string;
    token?: string;
  };

  type LoginParams = {
    username?: string;
    password?: string;
    autoLogin?: boolean;
    type?: string;
  };

  type PageParams = {
    current?: number;
    pageSize?: number;
  };

  // ── File ────────────────────────────────────────────────────────

  type FileItem = {
    id: string;
    originalName: string;
    fileSizeBytes: number;
    mimeType: string;
    algorithm: string;
    encryptedAesKey: string;
    iv: string;
    authTag: string;
    keyPairId: string;
    status: string;       // "Encrypted" | "Shared" | "Deleted"
    owner: string;
    createdAt: string;
    updatedAt: string;
  };

  type FileMetadata = {
    id: string;
    originalName: string;
    mimeType: string;
    algorithm: string;
    encryptedAesKey: string;
    iv: string;
    authTag: string;
    fileSizeBytes: number;
  };

  // ── RSA Key ──────────────────────────────────────────────────────

  type KeyPair = {
    id: string;
    name: string;
    algorithm: string;
    keySize: number;
    publicKeyFingerprint: string;
    status: string;         // "Active" | "Revoked" | "Expired"
    usageCount: number;
    createdAt: string;
    revokedAt?: string;
  };

  // ── Dashboard ─────────────────────────────────────────────────────

  type DashboardStats = {
    totalFiles: number;
    sharedFiles: number;
    activeKeys: number;
    totalSizeBytes: number;
    securityScore: number;
  };

  // ── Notice ────────────────────────────────────────────────────────

  type NoticeIconItemType = 'notification' | 'message' | 'event';

  type NoticeIconItem = {
    id?: string;
    extra?: string;
    key?: string;
    read?: boolean;
    avatar?: string;
    title?: string;
    status?: string;
    datetime?: string;
    description?: string;
    type?: NoticeIconItemType;
  };

  type NoticeIconList = {
    data?: NoticeIconItem[];
    total?: number;
    success?: boolean;
  };

  // ── Table / Rule ──────────────────────────────────────────────────

  type RuleListItem = {
    key?: number;
    disabled?: boolean;
    name?: string;
    owner?: string;
    desc?: string;
    callNo?: number;
    status?: number;
    updatedAt?: string;
    createdAt?: string;
    progress?: number;
  };

  type RuleList = {
    data?: RuleListItem[];
    total?: number;
    success?: boolean;
  };

  type ErrorResponse = {
    errorCode: string;
    errorMessage?: string;
    success?: boolean;
  };
}
