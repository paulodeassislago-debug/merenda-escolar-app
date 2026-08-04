// src/components/Layout.tsx
// Sidebar condicional por perfil + header com usuário e logout.
// Visual conforme .planning/PROJECT.md: sidebar verde-escuro, logo em container branco.

import { NavLink, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../auth-context';
import type { Perfil } from '../types';
import logoNancy from '../assets/Logo Nancy (Logotipo) (1).jpg';
import './Layout.css';

interface NavItem {
  para: string;
  rotulo: string;
  end?: boolean;
}

const NAV_POR_PERFIL: Record<Perfil, NavItem[]> = {
  admin: [
    { para: '/admin', rotulo: 'Dashboard', end: true },
    { para: '/admin/usuarios', rotulo: 'Usuários' },
    { para: '/admin/itens', rotulo: 'Itens / Estoque' },
    { para: '/admin/cardapio', rotulo: 'Cardápio' },
    { para: '/admin/planejamento', rotulo: 'Planejamento' },
    { para: '/admin/entregas', rotulo: 'Entregas' },
  ],
  secretaria: [
    { para: '/gestao', rotulo: 'Gestão', end: true },
    { para: '/admin/planejamento', rotulo: 'Planejamento' },
    { para: '/admin/entregas', rotulo: 'Entregas' },
  ],
  cozinheira: [
    { para: '/cozinha', rotulo: 'Painel da Cozinha', end: true },
  ],
};

const ROTULO_PERFIL: Record<Perfil, string> = {
  admin: 'Admin',
  secretaria: 'Secretaria',
  cozinheira: 'Cozinheira',
};

export default function Layout({ children }: { children: ReactNode }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const navItens = usuario ? NAV_POR_PERFIL[usuario.perfil] : [];

  return (
    <div className="layout">
      <aside className="layout-sidebar">
        <div className="layout-marca">
          <span className="layout-logo-container">
            <img
              src={logoNancy}
              alt="Brasão do Colégio Estadual do Campo Nancy de Castro Esteves"
              className="layout-logo"
            />
          </span>
          <span className="layout-escola">Colégio Nancy de Castro Esteves</span>
        </div>

        <nav className="layout-nav">
          {navItens.map((item) => (
            <NavLink
              key={item.para}
              to={item.para}
              end={item.end}
              className={({ isActive }) =>
                isActive ? 'layout-link layout-link-ativo' : 'layout-link'
              }
            >
              {item.rotulo}
            </NavLink>
          ))}
        </nav>

        <a className="layout-link layout-link-publico" href="/cardapio" target="_blank" rel="noreferrer">
          Cardápio Público ↗
        </a>
      </aside>

      <div className="layout-corpo">
        <header className="layout-header">
          <span className="layout-header-titulo">Sistema da Merenda Escolar — PNAE</span>
          {usuario && (
            <div className="layout-usuario">
              <span className={`layout-badge layout-badge-${usuario.perfil}`}>
                {ROTULO_PERFIL[usuario.perfil]}
              </span>
              <span className="layout-usuario-nome">{usuario.nome}</span>
              <button type="button" className="layout-logout" onClick={handleLogout}>
                Sair
              </button>
            </div>
          )}
        </header>

        <main className="layout-conteudo">{children}</main>
      </div>
    </div>
  );
}
