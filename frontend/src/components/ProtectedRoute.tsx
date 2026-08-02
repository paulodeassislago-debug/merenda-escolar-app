// src/components/ProtectedRoute.tsx
// Exige autenticação e, opcionalmente, um conjunto de perfis permitidos.

import { Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useAuth, ROTA_POR_PERFIL } from '../auth-context';
import type { Perfil } from '../types';

interface ProtectedRouteProps {
  children: ReactElement;
  /** Se omitido, qualquer perfil autenticado acessa. */
  perfis?: Perfil[];
}

export default function ProtectedRoute({ children, perfis }: ProtectedRouteProps) {
  const { isAuthenticated, usuario } = useAuth();

  if (!isAuthenticated || !usuario) {
    return <Navigate to="/" replace />;
  }

  if (perfis && !perfis.includes(usuario.perfil)) {
    // Perfil autenticado mas sem acesso: manda para a home do próprio perfil
    return <Navigate to={ROTA_POR_PERFIL[usuario.perfil]} replace />;
  }

  return children;
}
