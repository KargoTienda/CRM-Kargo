import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthState, User } from '../types';
import { authService } from '../services/authService';
import { getUsuarioPerfil, saveUsuarioPerfil } from '../utils/db';

interface AuthAction {
  type: 'LOGIN_START' | 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'RESTORE_SESSION' | 'UPDATE_PERFIL';
  payload?: any;
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true };
    case 'LOGIN_SUCCESS':
      return { ...state, user: action.payload.user, tokens: action.payload.tokens, isAuthenticated: true, isLoading: false };
    case 'LOGIN_FAILURE':
      return { ...state, user: null, tokens: null, isAuthenticated: false, isLoading: false };
    case 'LOGOUT':
      return { ...state, user: null, tokens: null, isAuthenticated: false, isLoading: false };
    case 'RESTORE_SESSION':
      return { ...state, user: action.payload.user, tokens: action.payload.tokens, isAuthenticated: action.payload.isAuthenticated, isLoading: false };
    case 'UPDATE_PERFIL':
      return { ...state, user: state.user ? { ...state.user, ...action.payload } : state.user };
    default:
      return state;
  }
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updatePerfil: (displayName: string, avatar: string | null, color: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

async function cargarPerfil(user: User): Promise<User> {
  try {
    const perfil = await getUsuarioPerfil(user.username);
    if (perfil) return { ...user, displayName: perfil.displayName || user.displayName, avatar: perfil.avatar, color: perfil.color || user.color };
  } catch {}
  return user;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const isAuthenticated = authService.isAuthenticated();
        let user = authService.getCurrentUser();
        const tokens = authService.getToken() ? { access_token: authService.getToken()!, token_type: 'bearer' } : null;
        if (isAuthenticated && user) user = await cargarPerfil(user);
        dispatch({ type: 'RESTORE_SESSION', payload: { user: isAuthenticated ? user : null, tokens: isAuthenticated ? tokens : null, isAuthenticated } });
      } catch {
        dispatch({ type: 'RESTORE_SESSION', payload: { user: null, tokens: null, isAuthenticated: false } });
      }
    };
    restoreSession();
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const tokens = await authService.login({ username, password });
      let user = authService.getCurrentUser()!;
      user = await cargarPerfil(user);
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user, tokens } });
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try { await authService.logout(); } catch {}
    dispatch({ type: 'LOGOUT' });
  };

  const updatePerfil = async (displayName: string, avatar: string | null, color: string): Promise<void> => {
    if (!state.user) return;
    await saveUsuarioPerfil(state.user.username, { displayName, avatar, color });
    dispatch({ type: 'UPDATE_PERFIL', payload: { displayName, avatar, color } });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updatePerfil }}>
      {children}
    </AuthContext.Provider>
  );
};
