// src/pages/admin/Cardapio.tsx — CRUD de pratos com tipo de refeição restrito + navegação para receita

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, fetchJson } from '../../api';
import type { CardapioItem } from '../../types';
import { TIPOS_REFEICAO } from './constants';
import './Cardapio.css';

export default function Cardapio() {
  const [pratos, setPratos] = useState<CardapioItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<CardapioItem | null>(null);
  const [nomeRefeicao, setNomeRefeicao] = useState('');
  const [tipoRefeicao, setTipoRefeicao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  const [excluindo, setExcluindo] = useState<CardapioItem | null>(null);

  const navigate = useNavigate();

  const carregarPratos = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await fetchJson<CardapioItem[]>('/cardapio');
      setPratos(dados);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setErro('Sua sessão expirou. Entre novamente.');
      } else {
        setErro(
          err instanceof ApiError
            ? err.message
            : 'Não foi possível carregar o cardápio. Verifique se o backend está rodando.',
        );
      }
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetchJson<CardapioItem[]>('/cardapio')
      .then((dados) => {
        if (!cancelled) setPratos(dados);
      })
      .catch((err) => {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 401) {
            setErro('Sua sessão expirou. Entre novamente.');
          } else {
            setErro(
              err instanceof ApiError
                ? err.message
                : 'Não foi possível carregar o cardápio. Verifique se o backend está rodando.',
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
    setNomeRefeicao('');
    setTipoRefeicao('');
    setErroForm(null);
    setModalAberto(true);
  };

  const abrirModalEditar = (prato: CardapioItem) => {
    setEditando(prato);
    setNomeRefeicao(prato.nome_refeicao);
    setTipoRefeicao(prato.tipo_refeicao);
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
        await fetchJson<CardapioItem>(`/cardapio/${editando.id}`, {
          method: 'PUT',
          body: JSON.stringify({ nome_refeicao: nomeRefeicao.trim(), tipo_refeicao: tipoRefeicao }),
        });
      } else {
        await fetchJson<CardapioItem>('/cardapio', {
          method: 'POST',
          body: JSON.stringify({ nome_refeicao: nomeRefeicao.trim(), tipo_refeicao: tipoRefeicao }),
        });
      }
      fecharModal();
      await carregarPratos();
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
      await fetchJson(`/cardapio/${excluindo.id}`, { method: 'DELETE' });
      setExcluindo(null);
      await carregarPratos();
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
        <h1>Cardápio</h1>
        <button type="button" className="btn-primario" onClick={abrirModalNovo}>
          Novo prato
        </button>
      </div>

      {carregando && <p className="aviso">Carregando…</p>}

      {!carregando && erro && (
        <p className="aviso aviso-erro" role="alert">
          {erro}
        </p>
      )}

      {!carregando && !erro && (
        <div className="card">
          <div className="tabela-container">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Prato</th>
                  <th>Tipo</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pratos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="tabela-vazia">
                      <strong>Nenhum prato cadastrado</strong>
                      Cadastre o primeiro prato para montar o planejamento semanal.
                    </td>
                  </tr>
                ) : (
                  pratos.map((prato) => (
                    <tr key={prato.id}>
                      <td>{prato.nome_refeicao}</td>
                      <td>
                        <span className="badge badge-tipo-refeicao">
                          {prato.tipo_refeicao}
                        </span>
                      </td>
                      <td>
                        <div className="acoes-celula">
                          <button
                            type="button"
                            className="btn-acao btn-acao-receita"
                            onClick={() => navigate(`/admin/receitas/${prato.id}`)}
                          >
                            Editar receita
                          </button>
                          <button
                            type="button"
                            className="btn-acao btn-acao-editar"
                            onClick={() => abrirModalEditar(prato)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn-acao btn-acao-excluir"
                            onClick={() => setExcluindo(prato)}
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

      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editando ? 'Editar prato' : 'Novo prato'}</h2>
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
                  <label htmlFor="prato-nome">Nome do prato</label>
                  <input
                    id="prato-nome"
                    type="text"
                    value={nomeRefeicao}
                    onChange={(e) => setNomeRefeicao(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="prato-tipo">Tipo de refeição</label>
                  <select
                    id="prato-tipo"
                    value={tipoRefeicao}
                    onChange={(e) => setTipoRefeicao(e.target.value)}
                    className="form-input"
                    required
                  >
                    <option value="" disabled>
                      -- Selecione o tipo de refeição --
                    </option>
                    {TIPOS_REFEICAO.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
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

      {excluindo && (
        <div className="modal-overlay">
          <div className="modal-content modal-destrutivo">
            <p>
              Excluir o prato {excluindo.nome_refeicao}? Esta ação não pode ser
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