// src/auth-context.ts — contexto de autenticação (sem JSX)
// Separado do AuthProvider (auth.tsx) para manter o lint react-refresh limpo:
// este arquivo exporta apenas tipos, constantes e o hook useAuth.

import { createContext, useContext } from 'react';
import type { Perfil, Usuario } from './types';

export interface AuthState {
  usuario: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSecretaria: boolean;
  isCozinheira: boolean;
  /** Faz login e retorna o perfil do usuário (para o redirect por perfil). */
  login: (nome: string, senha: string) => Promise<Perfil>;
  logout: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

export const TOKEN_KEY = 'pnae_token';
export const USUARIO_KEY = 'pnae_usuario';

/** Rota inicial de cada perfil após o login (mapa de rotas do .planning/ROADMAP.md). */
export const ROTA_POR_PERFIL: Record<Perfil, string> = {
  admin: '/admin',
  secretaria: '/gestao',
  cozinheira: '/cozinha',
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  }
  return ctx;
}
