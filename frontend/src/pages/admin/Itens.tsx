// src/pages/admin/Itens.tsx — CRUD de itens do estoque com destaque de baixo estoque

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, fetchJson } from '../../api';
import type { Item, Conversao } from '../../types';
import { LIMIAR_BAIXO_ESTOQUE, UNIDADES_SUGERIDAS } from './constants';
import './Itens.css';

type ItemPayload = { nome: string; unidade_oficial: string; saldo_atual: number; unidade_interna?: string; fator_conversao?: number };

export default function Itens() {
  const [itens, setItens] = useState<Item[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Item | null>(null);
  const [nome, setNome] = useState('');
  const [unidadeOficial, setUnidadeOficial] = useState('KG');
  const [unidadeInterna, setUnidadeInterna] = useState('KG');
  const [fatorConversao, setFatorConversao] = useState('1');
  const [saldoAtual, setSaldoAtual] = useState('0');
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  const [excluindo, setExcluindo] = useState<Item | null>(null);

  // Conversões
  const [conversoesDe, setConversoesDe] = useState<Item | null>(null);
  const [conversoes, setConversoes] = useState<Conversao[]>([]);
  const [carregandoConversoes, setCarregandoConversoes] = useState(false);
  const [medidaCaseira, setMedidaCaseira] = useState('');
  const [pesoEmKg, setPesoEmKg] = useState('');
  const [salvandoConversao, setSalvandoConversao] = useState(false);
  const [erroConversao, setErroConversao] = useState<string | null>(null);
  const [excluindoConversao, setExcluindoConversao] = useState<Conversao | null>(null);

  const carregarItens = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await fetchJson<Item[]>('/itens');
      setItens(dados);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setErro('Sua sessão expirou. Entre novamente.');
      } else {
        setErro(
          err instanceof ApiError
            ? err.message
            : 'Não foi possível carregar os itens. Verifique se o backend está rodando.',
        );
      }
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetchJson<Item[]>('/itens')
      .then((dados) => {
        if (!cancelled) setItens(dados);
      })
      .catch((err) => {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 401) {
            setErro('Sua sessão expirou. Entre novamente.');
          } else {
            setErro(
              err instanceof ApiError
                ? err.message
                : 'Não foi possível carregar os itens. Verifique se o backend está rodando.',
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
    setUnidadeOficial('KG');
    setUnidadeInterna('KG');
    setFatorConversao('1');
    setSaldoAtual('0');
    setErroForm(null);
    setModalAberto(true);
  };

  const abrirModalEditar = (item: Item) => {
    setEditando(item);
    setNome(item.nome);
    setUnidadeOficial(item.unidade_oficial);
    setUnidadeInterna(item.unidade_interna);
    setFatorConversao(item.fator_conversao.toString());
    setSaldoAtual(item.saldo_atual.toString());
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
      const payload: ItemPayload = {
        nome: nome.trim(),
        unidade_oficial: unidadeOficial,
        saldo_atual: Number(saldoAtual) || 0,
      };

      // Incluir conversão se unidade não for KG nem L
      const uNorm = unidadeOficial.toUpperCase();
      if (uNorm !== 'KG' && uNorm !== 'L') {
        payload.unidade_interna = unidadeInterna;
        payload.fator_conversao = Number(fatorConversao) || 1;
      }

      if (editando) {
        await fetchJson<Item>(`/itens/${editando.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchJson<Item>('/itens', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      fecharModal();
      await carregarItens();
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
      await fetchJson(`/itens/${excluindo.id}`, { method: 'DELETE' });
      setExcluindo(null);
      await carregarItens();
    } catch (err) {
      setErro(
        err instanceof ApiError
          ? err.message
          : 'Falha ao excluir. Tente novamente.',
      );
      setExcluindo(null);
    }
  };

  // --- Conversões ---
  const carregarConversoesHandler = async (item: Item) => {
    setCarregandoConversoes(true);
    setErroConversao(null);
    try {
      const dados = await fetchJson<Conversao[]>(
        `/conversoes?item_id=${item.id}`,
      );
      setConversoes(dados);
    } catch (err) {
      setErroConversao(
        err instanceof ApiError
          ? err.message
          : 'Falha ao carregar as conversões.',
      );
    } finally {
      setCarregandoConversoes(false);
    }
  };

  const abrirConversoes = (item: Item) => {
    setConversoesDe(item);
    setMedidaCaseira('');
    setPesoEmKg('');
    setErroConversao(null);
    setExcluindoConversao(null);
    carregarConversoesHandler(item);
  };

  const fecharConversoes = () => {
    setConversoesDe(null);
    setConversoes([]);
    setMedidaCaseira('');
    setPesoEmKg('');
    setErroConversao(null);
    setExcluindoConversao(null);
  };

  const adicionarConversao = async (e: FormEvent) => {
    e.preventDefault();
    if (!conversoesDe) return;
    setErroConversao(null);
    setSalvandoConversao(true);

    try {
      await fetchJson('/conversoes', {
        method: 'POST',
        body: JSON.stringify({
          item_id: conversoesDe.id,
          medida_caseira: medidaCaseira.trim(),
          peso_em_kg: Number(pesoEmKg) || 0,
        }),
      });
      setMedidaCaseira('');
      setPesoEmKg('');
      await carregarConversoesHandler(conversoesDe);
    } catch (err) {
      setErroConversao(
        err instanceof ApiError
          ? err.message
          : 'Falha ao adicionar conversão.',
      );
    } finally {
      setSalvandoConversao(false);
    }
  };

  const confirmarExclusaoConversao = async () => {
    if (!excluindoConversao) return;
    try {
      await fetchJson(`/conversoes/${excluindoConversao.id}`, {
        method: 'DELETE',
      });
      setExcluindoConversao(null);
      if (conversoesDe) await carregarConversoesHandler(conversoesDe);
    } catch (err) {
      setErroConversao(
        err instanceof ApiError
          ? err.message
          : 'Falha ao remover conversão.',
      );
      setExcluindoConversao(null);
    }
  };

  return (
    <div>
      <div className="pagina-header">
        <h1>Itens / Estoque</h1>
        <button type="button" className="btn-primario" onClick={abrirModalNovo}>
          Novo item
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
                  <th>Unidade</th>
                  <th>Saldo</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="tabela-vazia">
                      <strong>Nenhum item no estoque</strong>
                      Cadastre o primeiro item para começar o controle de
                      estoque.
                    </td>
                  </tr>
                ) : (
                  itens.map((item) => (
                    <tr key={item.id}>
                      <td>{item.nome}</td>
                      <td>{item.unidade_oficial}</td>
                      <td
                        className={
                          item.saldo_atual < LIMIAR_BAIXO_ESTOQUE
                            ? 'saldo-baixo'
                            : ''
                        }
                      >
                        {item.unidade_oficial === 'KG' || item.unidade_oficial === 'L'
                          ? item.saldo_atual.toFixed(2)
                          : (item.saldo_atual / item.fator_conversao).toFixed(2)}{' '}
                        {item.unidade_oficial}
                      </td>
                      <td>
                        {item.saldo_atual < LIMIAR_BAIXO_ESTOQUE ? (
                          <span className="status-alerta">Baixo estoque</span>
                        ) : (
                          <span className="status-ok">OK</span>
                        )}
                      </td>
                      <td>
                        <div className="acoes-celula">
                          <button
                            type="button"
                            className="btn-acao btn-acao-editar"
                            onClick={() => abrirModalEditar(item)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn-acao btn-acao-conversoes"
                            onClick={() => abrirConversoes(item)}
                          >
                            Conversões
                          </button>
                          <button
                            type="button"
                            className="btn-acao btn-acao-excluir"
                            onClick={() => setExcluindo(item)}
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
              <h2>{editando ? 'Editar item' : 'Novo item'}</h2>
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
                  <label htmlFor="item-nome">Nome</label>
                  <input
                    id="item-nome"
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="item-unidade">Unidade oficial</label>
                  <input
                    id="item-unidade"
                    type="text"
                    list="unidades-sugeridas"
                    value={unidadeOficial}
                    onChange={(e) => setUnidadeOficial(e.target.value)}
                    className="form-input"
                    required
                  />
                  <datalist id="unidades-sugeridas">
                    {UNIDADES_SUGERIDAS.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>

                {unidadeOficial !== 'KG' && unidadeOficial !== 'L' && (
                  <>
                    <div className="form-group">
                      <label>Unidade interna do estoque</label>
                      <div className="radio-group">
                        <label className="radio-label">
                          <input
                            type="radio"
                            name="unidade-interna"
                            value="KG"
                            checked={unidadeInterna === 'KG'}
                            onChange={() => setUnidadeInterna('KG')}
                          />
                          KG
                        </label>
                        <label className="radio-label">
                          <input
                            type="radio"
                            name="unidade-interna"
                            value="L"
                            checked={unidadeInterna === 'L'}
                            onChange={() => setUnidadeInterna('L')}
                          />
                          L
                        </label>
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="item-fator">
                        Fator de conversão — 1 {unidadeOficial || 'unidade'} equivale a X {unidadeInterna}
                      </label>
                      <input
                        id="item-fator"
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={fatorConversao}
                        onChange={(e) => setFatorConversao(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label htmlFor="item-saldo">Saldo atual</label>
                  <input
                    id="item-saldo"
                    type="number"
                    step="0.1"
                    value={saldoAtual}
                    onChange={(e) => setSaldoAtual(e.target.value)}
                    className="form-input"
                  />
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
              Excluir o item {excluindo.nome}? Esta ação não pode ser desfeita.
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

      {/* Modal de conversões */}
      {conversoesDe && (
        <div className="modal-overlay">
          <div className="modal-content modal-conversoes">
            <div className="modal-header">
              <h2>Conversões de {conversoesDe.nome}</h2>
              <button
                type="button"
                className="btn-fechar"
                onClick={fecharConversoes}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {carregandoConversoes && (
                <p className="aviso">Carregando…</p>
              )}

              {!carregandoConversoes && (
                <>
                  {/* Tabela de conversões */}
                  <div className="tabela-container">
                    <table className="tabela">
                      <thead>
                        <tr>
                          <th>Medida caseira</th>
                          <th>
                            Peso em kg
                          </th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conversoes.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="tabela-vazia">
                              <strong>
                                Nenhuma conversão cadastrada
                              </strong>
                              Sem conversão, o lançamento de refeições com
                              medidas caseiras falha.
                            </td>
                          </tr>
                        ) : (
                          conversoes.map((c) => (
                            <tr key={c.id}>
                              <td>{c.medida_caseira}</td>
                              <td>{c.peso_em_kg.toFixed(3)}</td>
                              <td>
                                <button
                                  type="button"
                                  className="btn-acao btn-acao-excluir"
                                  onClick={() =>
                                    setExcluindoConversao(c)
                                  }
                                >
                                  Remover
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Formulário inline de adição */}
                  <form
                    onSubmit={adicionarConversao}
                    className="conversoes-form"
                  >
                    <div className="form-group">
                      <label htmlFor="conv-medida">
                        Medida caseira
                      </label>
                      <input
                        id="conv-medida"
                        type="text"
                        value={medidaCaseira}
                        onChange={(e) =>
                          setMedidaCaseira(e.target.value)
                        }
                        className="form-input"
                        placeholder="ex.: xícara"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="conv-peso">
                        Peso em kg
                      </label>
                      <input
                        id="conv-peso"
                        type="number"
                        step="0.001"
                        value={pesoEmKg}
                        onChange={(e) =>
                          setPesoEmKg(e.target.value)
                        }
                        className="form-input"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn-primario"
                      disabled={salvandoConversao}
                    >
                      {salvandoConversao
                        ? 'Salvando…'
                        : 'Adicionar conversão'}
                    </button>
                  </form>

                  {erroConversao && (
                    <p className="alerta-erro" role="alert">
                      {erroConversao}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal destrutivo de exclusão de conversão */}
      {excluindoConversao && (
        <div className="modal-overlay">
          <div className="modal-content modal-destrutivo">
            <p>
              Excluir a conversão {excluindoConversao.medida_caseira}
              ? Esta ação não pode ser desfeita.
            </p>
            <div className="modal-acoes">
              <button
                type="button"
                className="btn-secundario"
                onClick={() => setExcluindoConversao(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-perigo"
                onClick={confirmarExclusaoConversao}
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