import { UserRole } from '@sandbox/types';
import { authClient } from './api.service';

export interface LoginResponse {
  accessToken: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    roles: UserRole[];
    craftsmanId: string | null;
  };
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return authClient
    .post<LoginResponse>('/auth/login', { email, password })
    .then((res) => res.data);
}

export function me(): Promise<{
  sub: string;
  email: string;
  roles: UserRole[];
  craftsmanId: string | null;
}> {
  return authClient.get('/auth/me').then((res) => res.data);
}
