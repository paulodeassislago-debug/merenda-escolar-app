// src/pages/Login.tsx — login real com JWT (Fase 4)
// Visual cerimonial conforme .planning/PROJECT.md: logo 120px, nome da escola em serif.

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROTA_POR_PERFIL } from '../auth-context';
import logoNancy from '../assets/Logo Nancy (Logotipo) (1).jpg';
import './Login.css';

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const perfil = await login(usuario.trim(), senha);
      navigate(ROTA_POR_PERFIL[perfil], { replace: true });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao entrar. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img
            src={logoNancy}
            alt="Brasão do Colégio Estadual do Campo Nancy de Castro Esteves"
            className="login-logo"
          />
          <h1>Sistema da Merenda Escolar</h1>
          <p className="login-escola">
            Colégio Estadual do Campo
            <br />
            Nancy de Castro Esteves
          </p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="login-usuario">Usuário</label>
            <input
              id="login-usuario"
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="form-input"
              placeholder="Digite seu usuário..."
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-senha">Senha</label>
            <input
              id="login-senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="form-input"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {erro && (
            <p className="login-erro" role="alert">
              {erro}
            </p>
          )}

          <button type="submit" className="login-button" disabled={carregando}>
            {carregando ? 'Entrando…' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}
