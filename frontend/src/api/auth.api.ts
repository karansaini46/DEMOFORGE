import { apiClient } from './client';
import type { User } from '../store/auth.store';

export interface RegisterPayload {
  email: string;
  password: string;
  name?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/**
 * The backend's login/register responses return a "safe user" without
 * `monthlyUsage` — only GET /auth/me includes it.
 */
export type AuthUser = Omit<User, 'monthlyUsage'>;

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export async function register(data: RegisterPayload): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/register', data);
  return res.data;
}

export async function login(data: LoginPayload): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/login', data);
  return res.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function getMe(): Promise<{ user: User }> {
  const res = await apiClient.get<{ user: User }>('/auth/me');
  return res.data;
}

/** Normalize a login/register response into the store's full User shape. */
export function toUser(authUser: AuthUser): User {
  return { ...authUser, monthlyUsage: 0 };
}
