import { apiService } from './api';
import { AuthTokens, User } from '../types';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    // Auth local mientras el backend no está corriendo
    if (credentials.username === 'demo' && credentials.password === 'demo123') {
      const tokens: AuthTokens = {
        access_token: 'kargo-demo-token',
        token_type: 'bearer',
      };
      apiService.setTokens(tokens);
      return tokens;
    }
    throw new Error('Usuario o contraseña incorrectos');
  }

  async logout(): Promise<void> {
    // Clear tokens from API service
    apiService.clearTokens();
  }

  getCurrentUser(): User | null {
    const tokens = apiService.getTokens();
    if (!tokens) return null;

    // In a real app, you would decode the JWT token or fetch user info
    // For demo purposes, we'll return a mock user
    return {
      id: 1,
      username: 'demo',
      email: 'demo@example.com',
      tenant_id: 1
    };
  }

  isAuthenticated(): boolean {
    const tokens = apiService.getTokens();
    return tokens !== null;
  }

  getToken(): string | null {
    const tokens = apiService.getTokens();
    return tokens?.access_token || null;
  }
}

export const authService = new AuthService();
export default authService;