// src/pages/admin/Receitas.tsx — editor de ingredientes por prato (/admin/receitas/:id)

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ApiError, fetchJson } from '../../api';
import type { CardapioItem, ReceitaItem, Item } from '../../types';
import './Receitas.css';

export default function Receitas() {
  const { id } = useParams<{ id: string }>();
  const cardapioId = Number(id);
  const navigate = useNavigate();

  const [prato, setPrato] = useState<CardapioItem | null>(null);
  const [ingredientes, setIngredientes] = useState<ReceitaItem[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [itemId, setItemId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [medidaCaseira, setMedidaCaseira] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editQuantidade, setEditQuantidade] = useState('');
  const [editMedidaCaseira, setEditMedidaCaseira] = useState('');

  const [removendo, setRemovendo] = useState<ReceitaItem | null>(null);

  const carregarDados = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [receitas, catalogo, cardapio] = await Promise.all([
        fetchJson<ReceitaItem[]>(`/cardapio/${cardapioId}/receita`),
        fetchJson<Item[]>('/itens'),
        fetchJson<CardapioItem[]>('/cardapio'),
      ]);
      setIngredientes(receitas);
      setItens(catalogo);
      const pratoAtual = cardapio.find((p) => p.id === cardapioId) ?? null;
      setPrato(pratoAtual);
    } catch (err) {
      setErro(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível carregar os dados. Verifique se o backend está rodando.',
      );
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchJson<ReceitaItem[]>(`/cardapio/${cardapioId}/receita`),
      fetchJson<Item[]>('/itens'),
      fetchJson<CardapioItem[]>('/cardapio'),
    ])
      .then(([receitas, catalogo, cardapio]) => {
        if (!cancelled) {
          setIngredientes(receitas);
          setItens(catalogo);
          const pratoAtual = cardapio.find((p) => p.id === cardapioId) ?? null;
          setPrato(pratoAtual);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErro(
            err instanceof ApiError
              ? err.message
              : 'Não foi possível carregar os dados. Verifique se o backend está rodando.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setCarregando(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cardapioId]);

  const nomeItem = (itemId: number): string => {
    const item = itens.find((i) => i.id === itemId);
    return item ? item.nome : '';
  };

  const handleAdicionar = async (e: FormEvent) => {
    e.preventDefault();
    setErroForm(null);
    setSalvando(true);

    try {
      await fetchJson(`/cardapio/${cardapioId}/receita`, {
        method: 'POST',
        body: JSON.stringify({
          item_id: Number(itemId),
          quantidade: Number(quantidade),
          medida_caseira: medidaCaseira.trim(),
        }),
      });
      setItemId('');
      setQuantidade('');
      setMedidaCaseira('');
      await carregarDados();
    } catch (err) {
      setErroForm(
        err instanceof ApiError
          ? err.message
          : 'Falha ao adicionar ingrediente. Tente novamente.',
      );
    } finally {
      setSalvando(false);
    }
  };

  const iniciarEdicao = (ingrediente: ReceitaItem) => {
    setEditandoId(ingrediente.id);
    setEditQuantidade(String(ingrediente.quantidade));
    setEditMedidaCaseira(ingrediente.medida_caseira);
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
  };

  const salvarEdicao = async (receitaId: number) => {
    setSalvando(true);
    try {
      await fetchJson(`/cardapio/${cardapioId}/receita/${receitaId}`, {
        method: 'PUT',
        body: JSON.stringify({
          quantidade: Number(editQuantidade),
          medida_caseira: editMedidaCaseira.trim(),
        }),
      });
      setEditandoId(null);
      await carregarDados();
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

  const confirmarRemocao = async () => {
    if (!removendo) return;
    try {
      await fetchJson(
        `/cardapio/${cardapioId}/receita/${removendo.id}`,
        { method: 'DELETE' },
      );
      setRemovendo(null);
      await carregarDados();
    } catch (err) {
      setErro(
        err instanceof ApiError
          ? err.message
          : 'Falha ao remover. Tente novamente.',
      );
      setRemovendo(null);
    }
  };

  return (
    <div>
      {carregando && <p className="aviso">Carregando…</p>}

      {!carregando && erro && (
        <p className="aviso aviso-erro" role="alert">
          {erro}
        </p>
      )}

      {!carregando && !erro && prato && (
        <>
          <div className="receitas-header">
            <div>
              <h1>Receita: {prato.nome_refeicao}</h1>
              <span className="badge badge-tipo-refeicao">
                {prato.tipo_refeicao}
              </span>
            </div>
            <button
              type="button"
              className="btn-secundario"
              onClick={() => navigate('/admin/cardapio')}
            >
              Voltar ao cardápio
            </button>
          </div>

          {/* Formulário de adição inline */}
          <div className="card receitas-form-card">
            <form className="receitas-form-inline" onSubmit={handleAdicionar}>
              <div className="receitas-form-field receitas-form-field-item">
                <label htmlFor="receita-item">Ingrediente</label>
                <select
                  id="receita-item"
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                  className="form-input"
                  required
                >
                  <option value="" disabled>
                    -- Selecione o item --
                  </option>
                  {itens.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome} ({item.unidade_oficial})
                    </option>
                  ))}
                </select>
              </div>

              <div className="receitas-form-field receitas-form-field-quantidade">
                <label htmlFor="receita-quantidade">Quantidade por aluno</label>
                <input
                  id="receita-quantidade"
                  type="number"
                  step="0.1"
                  min="0"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="receitas-form-field receitas-form-field-medida">
                <label htmlFor="receita-medida">Medida caseira</label>
                <input
                  id="receita-medida"
                  type="text"
                  value={medidaCaseira}
                  onChange={(e) => setMedidaCaseira(e.target.value)}
                  className="form-input"
                  placeholder="ex.: 1 xícara"
                  required
                />
              </div>

              <div className="receitas-form-acoes">
                <button
                  type="submit"
                  className="btn-primario"
                  disabled={salvando}
                >
                  {salvando ? 'Adicionando…' : 'Adicionar ingrediente'}
                </button>
              </div>
            </form>

            {erroForm && (
              <p className="alerta-erro" role="alert">
                {erroForm}
              </p>
            )}
          </div>

          {/* Tabela de ingredientes */}
          <div className="card">
            <div className="tabela-container">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Ingrediente</th>
                    <th>Quantidade</th>
                    <th>Medida caseira</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredientes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="tabela-vazia">
                        <strong>Este prato ainda não tem ingredientes</strong>
                        Adicione ingredientes com a quantidade por aluno em
                        medida caseira (ex.: 1 xícara, 2 colheres).
                      </td>
                    </tr>
                  ) : (
                    ingredientes.map((ing) => (
                      <tr key={ing.id}>
                        {editandoId === ing.id ? (
                          <>
                            <td>{ing.item_nome ?? nomeItem(ing.item_id)}</td>
                            <td>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={editQuantidade}
                                onChange={(e) =>
                                  setEditQuantidade(e.target.value)
                                }
                                className="form-input receitas-edit-input"
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={editMedidaCaseira}
                                onChange={(e) =>
                                  setEditMedidaCaseira(e.target.value)
                                }
                                className="form-input receitas-edit-input"
                              />
                            </td>
                            <td>
                              <div className="acoes-celula">
                                <button
                                  type="button"
                                  className="btn-acao btn-acao-editar"
                                  onClick={() => salvarEdicao(ing.id)}
                                >
                                  Salvar
                                </button>
                                <button
                                  type="button"
                                  className="btn-acao btn-acao-excluir"
                                  onClick={cancelarEdicao}
                                >
                                  Cancelar
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{ing.item_nome ?? nomeItem(ing.item_id)}</td>
                            <td>{ing.quantidade}</td>
                            <td>{ing.medida_caseira}</td>
                            <td>
                              <div className="acoes-celula">
                                <button
                                  type="button"
                                  className="btn-acao btn-acao-editar"
                                  onClick={() => iniciarEdicao(ing)}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="btn-acao btn-acao-excluir"
                                  onClick={() => setRemovendo(ing)}
                                >
                                  Remover
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal destrutivo de remoção */}
      {removendo && (
        <div className="modal-overlay">
          <div className="modal-content modal-destrutivo">
            <p>
              Remover{' '}
              {removendo.item_nome ?? nomeItem(removendo.item_id)} da receita?
              Esta ação não pode ser desfeita.
            </p>
            <div className="modal-acoes">
              <button
                type="button"
                className="btn-secundario"
                onClick={() => setRemovendo(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-perigo"
                onClick={confirmarRemocao}
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}