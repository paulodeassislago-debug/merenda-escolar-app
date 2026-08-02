// src/auth.tsx — AuthProvider (componente)
// O contexto, o hook useAuth e as constantes ficam em auth-context.ts.

import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { API_BASE_URL, fetchWithAuth } from './api';
import { AuthContext, TOKEN_KEY, USUARIO_KEY } from './auth-context';
import type { AuthState } from './auth-context';
import type { LoginResponse, Perfil, Usuario } from './types';

function lerUsuarioSalvo(): Usuario | null {
  try {
    const salvo = localStorage.getItem(USUARIO_KEY);
    return salvo ? (JSON.parse(salvo) as Usuario) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [usuario, setUsuario] = useState<Usuario | null>(lerUsuarioSalvo);

  const login = useCallback(async (nome: string, senha: string): Promise<Perfil> => {
    const resposta = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, senha }),
    });

    if (!resposta.ok) {
      const corpo = (await resposta.json().catch(() => null)) as { detail?: string } | null;
      throw new Error(corpo?.detail ?? 'Nome de usuário ou senha inválidos');
    }

    const dados = (await resposta.json()) as LoginResponse;

    // Persiste o token antes de buscar os dados do usuário (fetchWithAuth lê do localStorage)
    localStorage.setItem(TOKEN_KEY, dados.access_token);
    setToken(dados.access_token);

    const meResp = await fetchWithAuth('/auth/me');
    if (!meResp.ok) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      throw new Error('Login realizado, mas falha ao carregar os dados do usuário');
    }
    const me = (await meResp.json()) as Usuario;

    localStorage.setItem(USUARIO_KEY, JSON.stringify(me));
    setUsuario(me);
    return me.perfil;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    setToken(null);
    setUsuario(null);
  }, []);

  // useMemo evita re-renders desnecessários em toda a árvore (guideline react: memoize context value)
  const valor = useMemo<AuthState>(() => ({
    usuario,
    token,
    isAuthenticated: token !== null,
    isAdmin: usuario?.perfil === 'admin',
    isSecretaria: usuario?.perfil === 'secretaria',
    isCozinheira: usuario?.perfil === 'cozinheira',
    login,
    logout,
  }), [usuario, token, login, logout]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
