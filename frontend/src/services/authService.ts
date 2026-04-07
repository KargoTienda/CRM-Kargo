import { apiService } from './api';
import { AuthTokens, User } from '../types';

export interface LoginCredentials {
  username: string;
  password: string;
}

// ─── Usuarios del sistema ─────────────────────────────────
const USUARIOS: Array<{ id: number; username: string; displayName: string; password: string; color: string }> = [
  { id: 1, username: 'tommy',  displayName: 'Tommy', password: 'woodhorse1', color: '#004085' },
  { id: 2, username: 'pollo',  displayName: 'Pollo', password: 'pollo123',   color: '#D35400' },
];

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    const u = USUARIOS.find(
      u => u.username === credentials.username.toLowerCase() && u.password === credentials.password
    );
    if (!u) throw new Error('Usuario o contraseña incorrectos');

    const tokens: AuthTokens = {
      access_token: `kargo-token-${u.username}`,
      token_type: 'bearer',
    };
    apiService.setTokens(tokens);
    // Guardar username en localStorage para restaurar sesión
    localStorage.setItem('kargo_username', u.username);
    return tokens;
  }

  async logout(): Promise<void> {
    apiService.clearTokens();
    localStorage.removeItem('kargo_username');
  }

  getCurrentUser(): User | null {
    const tokens = apiService.getTokens();
    if (!tokens) return null;
    const username = localStorage.getItem('kargo_username');
    const u = USUARIOS.find(u => u.username === username);
    if (!u) return null;
    return {
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      color: u.color,
      tenant_id: 1,
    };
  }

  isAuthenticated(): boolean {
    if (!apiService.getTokens()) return false;
    const username = localStorage.getItem('kargo_username');
    return USUARIOS.some(u => u.username === username);
  }

  getToken(): string | null {
    return apiService.getTokens()?.access_token || null;
  }
}

export const authService = new AuthService();
export default authService;
