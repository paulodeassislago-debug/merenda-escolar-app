// src/pages/admin/Usuarios.tsx — CRUD de usuários (template para as páginas CRUD da fase)

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, fetchJson } from '../../api';
import type { Usuario, Perfil } from '../../types';
import { PERFIL_ROTULOS } from './constants';
import './Usuarios.css';

type UsuarioPayload = { nome: string; senha?: string; perfil: Perfil };

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState<Perfil>('cozinheira');
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  const [excluindo, setExcluindo] = useState<Usuario | null>(null);

  const carregarUsuarios = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await fetchJson<Usuario[]>('/usuarios');
      setUsuarios(dados);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setErro('Sua sessão expirou. Entre novamente.');
      } else {
        setErro(
          err instanceof ApiError
            ? err.message
            : 'Não foi possível carregar os usuários. Verifique se o backend está rodando.',
        );
      }
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetchJson<Usuario[]>('/usuarios')
      .then((dados) => {
        if (!cancelled) setUsuarios(dados);
      })
      .catch((err) => {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 401) {
            setErro('Sua sessão expirou. Entre novamente.');
          } else {
            setErro(
              err instanceof ApiError
                ? err.message
                : 'Não foi possível carregar os usuários. Verifique se o backend está rodando.',
            );
          }
        }
      })
      .finally(() => {
        if (!cancelled) setCarregando(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const abrirModalNovo = () => {
    setEditando(null);
    setNome('');
    setSenha('');
    setPerfil('cozinheira');
    setErroForm(null);
    setModalAberto(true);
  };

  const abrirModalEditar = (u: Usuario) => {
    setEditando(u);
    setNome(u.nome);
    setSenha('');
    setPerfil(u.perfil);
    setErroForm(null);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEditando(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErroForm(null);
    setSalvando(true);

    try {
      if (editando) {
        // PUT: omite senha se vazia
        const payload: Partial<UsuarioPayload> = { nome: nome.trim() };
        if (editando.perfil !== perfil) {
          payload.perfil = perfil;
        }
        if (senha.trim()) {
          payload.senha = senha;
        }
        await fetchJson<Usuario>(`/usuarios/${editando.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        // POST
        await fetchJson<Usuario>('/usuarios', {
          method: 'POST',
          body: JSON.stringify({ nome: nome.trim(), senha, perfil }),
        });
      }
      fecharModal();
      await carregarUsuarios();
    } catch (err) {
      setErroForm(
        err instanceof ApiError
          ? err.message
          : 'Falha ao salvar. Tente novamente.',
      );
    } finally {
      setSalvando(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!excluindo) return;
    try {
      await fetchJson(`/usuarios/${excluindo.id}`, { method: 'DELETE' });
      setExcluindo(null);
      await carregarUsuarios();
    } catch (err) {
      setErro(
        err instanceof ApiError
          ? err.message
          : 'Falha ao excluir. Tente novamente.',
      );
      setExcluindo(null);
    }
  };

  return (
    <div>
      <div className="pagina-header">
        <h1>Usuários</h1>
        <button type="button" className="btn-primario" onClick={abrirModalNovo}>
          Novo usuário
        </button>
      </div>

      {/* Carregando */}
      {carregando && <p className="aviso">Carregando…</p>}

      {/* Erro de carregamento */}
      {!carregando && erro && (
        <p className="aviso aviso-erro" role="alert">
          {erro}
        </p>
      )}

      {/* Tabela */}
      {!carregando && !erro && (
        <div className="card">
          <div className="tabela-container">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Perfil</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="tabela-vazia">
                      <strong>Nenhum usuário cadastrado</strong>
                      Crie usuários para controlar quem acessa o sistema.
                    </td>
                  </tr>
                ) : (
                  usuarios.map((u) => (
                    <tr key={u.id}>
                      <td>{u.nome}</td>
                      <td>
                        <span className={`badge badge-perfil-${u.perfil}`}>
                          {PERFIL_ROTULOS[u.perfil]}
                        </span>
                      </td>
                      <td>
                        <div className="acoes-celula">
                          <button
                            type="button"
                            className="btn-acao btn-acao-editar"
                            onClick={() => abrirModalEditar(u)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn-acao btn-acao-excluir"
                            onClick={() => setExcluindo(u)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal criar/editar */}
      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editando ? 'Editar usuário' : 'Novo usuário'}</h2>
              <button
                type="button"
                className="btn-fechar"
                onClick={fecharModal}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="usuario-nome">Nome</label>
                  <input
                    id="usuario-nome"
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="usuario-senha">
                    {editando
                      ? 'Nova senha (deixe em branco para manter a atual)'
                      : 'Senha'}
                  </label>
                  <input
                    id="usuario-senha"
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="form-input"
                    required={!editando}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="usuario-perfil">Perfil</label>
                  <select
                    id="usuario-perfil"
                    value={perfil}
                    onChange={(e) => setPerfil(e.target.value as Perfil)}
                    className="form-input"
                    required
                  >
                    {Object.entries(PERFIL_ROTULOS).map(([valor, rotulo]) => (
                      <option key={valor} value={valor}>
                        {rotulo}
                      </option>
                    ))}
                  </select>
                </div>

                {erroForm && (
                  <p className="alerta-erro" role="alert">
                    {erroForm}
                  </p>
                )}
              </div>

              <div className="modal-acoes">
                <button
                  type="button"
                  className="btn-secundario"
                  onClick={fecharModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primario"
                  disabled={salvando}
                >
                  {salvando ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal destrutivo de exclusão */}
      {excluindo && (
        <div className="modal-overlay">
          <div className="modal-content modal-destrutivo">
            <p>
              Excluir usuário {excluindo.nome}? Esta ação não pode ser
              desfeita.
            </p>
            <div className="modal-acoes">
              <button
                type="button"
                className="btn-secundario"
                onClick={() => setExcluindo(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-perigo"
                onClick={confirmarExclusao}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}