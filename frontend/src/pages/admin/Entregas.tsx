// src/pages/admin/Entregas.tsx — página completa: listagem, entrada manual auditada, upload XML NF-e
// F11: manual com justificativa obrigatória. F12: XML parseado no frontend → revisão humana.
// D-10: alterar/excluir item EXIGE justificativa (exigência de prestação de contas PNAE).
// D-11: parse no frontend com fast-xml-parser; mesmo fluxo da manual após parse.

import { useEffect, useState } from 'react';
import { ApiError, fetchJson } from '../../api';
import type {
  AcaoEntrega,
  EntregaResumo,
  EntregaDetalhe,
  EntregaItemRequest,
  Item,
} from '../../types';
import { parseNfe } from './nfe';
import './Entregas.css';

interface LinhaEdicao {
  itemId: number | null;
  quantidade: number;
  acao: AcaoEntrega;
  justificativa: string | null;
  descricaoNf?: string;
  unidadeNf?: string;
  removida?: boolean;
}

export default function Entregas() {
  // Listagem
  const [entregas, setEntregas] = useState<EntregaResumo[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Fluxo: 'nenhum' | 'escolha' | 'editando'
  const [fluxo, setFluxo] = useState<'nenhum' | 'escolha' | 'editando'>('nenhum');
  const [linhas, setLinhas] = useState<LinhaEdicao[]>([]);
  const [numeroNota, setNumeroNota] = useState<string | null>(null);
  const [emitente, setEmitente] = useState<string | null>(null);

  // Justificativa
  const [justificativaPendente, setJustificativaPendente] = useState<{
    index: number;
    acao: 'alterado' | 'excluído';
  } | null>(null);
  const [textoJustificativa, setTextoJustificativa] = useState('');

  // Submit
  const [salvando, setSalvando] = useState(false);
  const [erroSubmit, setErroSubmit] = useState<string | null>(null);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  // Detalhe
  const [detalhe, setDetalhe] = useState<EntregaDetalhe | null>(null);

  // Carregar dados iniciais
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchJson<EntregaResumo[]>('/entregas'),
      fetchJson<Item[]>('/itens'),
    ])
      .then(([entregasData, itensData]) => {
        if (!cancelled) {
          setEntregas(entregasData);
          setItens(itensData);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErro(
            err instanceof ApiError
              ? err.message
              : 'Não foi possível carregar os dados. Verifique se o backend está rodando e tente novamente.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setCarregando(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const recarregar = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [entregasData, itensData] = await Promise.all([
        fetchJson<EntregaResumo[]>('/entregas'),
        fetchJson<Item[]>('/itens'),
      ]);
      setEntregas(entregasData);
      setItens(itensData);
    } catch (err) {
      setErro(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível carregar os dados. Verifique se o backend está rodando e tente novamente.',
      );
    } finally {
      setCarregando(false);
    }
  };

  // --- Ações da listagem ---

  const abrirDetalhe = async (id: number) => {
    try {
      const dados = await fetchJson<EntregaDetalhe>(`/entregas/${id}`);
      setDetalhe(dados);
    } catch {
      // Silencioso — o modal não abre
    }
  };

  const abrirEscolha = () => {
    setFluxo('escolha');
    setErroSubmit(null);
    setSucessoMsg(null);
  };

  const iniciarManual = () => {
    setNumeroNota(null);
    setEmitente(null);
    setLinhas([]);
    setFluxo('editando');
    setErroSubmit(null);
    setSucessoMsg(null);
  };

  // --- Editor — manipulação de linhas ---

  const adicionarLinha = () => {
    setLinhas((prev) => [
      ...prev,
      { itemId: null, quantidade: 0, acao: 'recebido', justificativa: null },
    ]);
  };

  const atualizarItemLinha = (index: number, itemId: number) => {
    setLinhas((prev) =>
      prev.map((l, i) => (i === index ? { ...l, itemId } : l)),
    );
  };

  const atualizarQuantidade = (index: number, quantidade: number) => {
    setLinhas((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        // Editar quantidade de linha existente → ação vira 'alterado' + justificativa
        if (l.acao !== 'alterado' && l.quantidade !== quantidade) {
          // Abrir modal de justificativa
          setTextoJustificativa('');
          setJustificativaPendente({ index, acao: 'alterado' });
          return { ...l, quantidade };
        }
        return { ...l, quantidade };
      }),
    );
  };

  const removerLinha = (index: number) => {
    const linha = linhas[index];
    if (!linha) return;

    // Linhas novas (sem itemId e sem descricaoNf da NF) podem ser removidas de verdade
    if (!linha.itemId && !linha.descricaoNf) {
      setLinhas((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    // Linhas com item definido → marcar como removida + 'excluído' + justificativa
    setTextoJustificativa('');
    setJustificativaPendente({ index, acao: 'excluído' });
    setLinhas((prev) =>
      prev.map((l, i) =>
        i === index ? { ...l, removida: true, acao: 'excluído' } : l,
      ),
    );
  };

  const confirmarJustificativa = () => {
    if (!justificativaPendente || textoJustificativa.trim() === '') return;

    const { index } = justificativaPendente;

    // Só grava a justificativa se a linha ainda existe
    setLinhas((prev) =>
      prev.map((l, i) =>
        i === index ? { ...l, justificativa: textoJustificativa.trim() } : l,
      ),
    );
    setJustificativaPendente(null);
    setTextoJustificativa('');
  };

  const cancelarJustificativa = () => {
    if (!justificativaPendente) return;

    const { index, acao } = justificativaPendente;
    setLinhas((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        if (acao === 'excluído') {
          // Reverter remoção
          return { ...l, removida: false, acao: 'recebido' };
        }
        // Reverter alteração — volta ao estado original (recebido)
        return { ...l, acao: 'recebido' };
      }),
    );
    setJustificativaPendente(null);
    setTextoJustificativa('');
  };

  const desfazerRemocao = (index: number) => {
    setLinhas((prev) =>
      prev.map((l, i) =>
        i === index
          ? { ...l, removida: false, acao: 'recebido', justificativa: null }
          : l,
      ),
    );
  };

  // --- Upload XML ---

  const handleUploadXml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    const texto = await arquivo.text();
    try {
      const resultado = parseNfe(texto, itens);
      const novasLinhas: LinhaEdicao[] = resultado.linhas.map((l) => ({
        itemId: l.itemId,
        quantidade: l.quantidade,
        acao: 'recebido' as AcaoEntrega,
        justificativa: null,
        descricaoNf: l.descricao,
        unidadeNf: l.unidadeNf,
      }));
      setLinhas(novasLinhas);
      setNumeroNota(resultado.numeroNota);
      setEmitente(resultado.emitente);
      setFluxo('editando');
      setErroSubmit(null);
      setSucessoMsg(null);
    } catch {
      setErroSubmit(
        'Não foi possível ler o arquivo. Verifique se é um XML de NF-e válido.',
      );
    }

    // Resetar input para permitir re-upload do mesmo arquivo
    e.target.value = '';
  };

  // --- Submit ---

  const handleSubmit = async () => {
    setErroSubmit(null);
    setSucessoMsg(null);

    const ativas = linhas.filter((l) => !l.removida);
    if (ativas.length === 0) return;

    // Guarda de UI: bloquear itens sem seleção ou quantidade inválida
    const invalidas = ativas.filter(
      (l) => l.itemId === null || l.quantidade <= 0,
    );
    if (invalidas.length > 0) {
      setErroSubmit(
        'Verifique as linhas: todos os itens precisam estar selecionados e com quantidade maior que zero.',
      );
      return;
    }

    // Guarda de UI: verificar justificativas pendentes
    const semJustificativa = linhas.filter(
      (l) =>
        (l.acao === 'alterado' || l.acao === 'excluído') &&
        (!l.justificativa || l.justificativa.trim() === ''),
    );
    if (semJustificativa.length > 0) {
      setErroSubmit(
        'Itens alterados ou excluídos exigem justificativa. Verifique as linhas marcadas.',
      );
      return;
    }

    setSalvando(true);

    const payload: { itens: EntregaItemRequest[] } = {
      itens: linhas.map((l) => ({
        item_id: l.itemId!,
        quantidade: l.quantidade,
        acao: l.acao,
        justificativa: l.justificativa?.trim() || null,
      })),
    };

    try {
      const resposta = await fetchJson<{ id: number; mensagem: string }>(
        '/entregas',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );
      setSucessoMsg(resposta.mensagem);
      setFluxo('nenhum');
      setLinhas([]);
      setNumeroNota(null);
      setEmitente(null);
      await recarregar();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setErroSubmit('Sua sessão expirou. Entre novamente.');
        } else {
          setErroSubmit(err.message);
        }
      } else {
        setErroSubmit('Falha ao salvar. Tente novamente.');
      }
    } finally {
      setSalvando(false);
    }
  };

  // --- Helpers de renderização ---

  const podeSubmeter = (): boolean => {
    const ativas = linhas.filter((l) => !l.removida);
    if (ativas.length === 0) return false;
    if (ativas.some((l) => l.itemId === null || l.quantidade <= 0)) return false;
    return true;
  };

  const badgeAcao = (acao: string) => {
    switch (acao) {
      case 'recebido':
        return <span className="badge-acao badge-recebido">Recebido</span>;
      case 'alterado':
        return <span className="badge-acao badge-alterado">Alterado</span>;
      case 'excluído':
        return <span className="badge-acao badge-excluido">Excluído</span>;
      default:
        return <span className="badge-acao">{acao}</span>;
    }
  };

  // =====================================================================
  // Render
  // =====================================================================

  return (
    <div>
      {/* Page header */}
      <div className="pagina-header">
        <h1>Entregas</h1>
        {fluxo === 'nenhum' && (
          <button type="button" className="btn-primario" onClick={abrirEscolha}>
            Nova entrega
          </button>
        )}
      </div>

      {/* Carregando */}
      {carregando && <p className="aviso">Carregando…</p>}

      {/* Erro de carregamento */}
      {!carregando && erro && (
        <p className="aviso aviso-erro" role="alert">
          {erro}
        </p>
      )}

      {/* Listagem de entregas */}
      {!carregando && !erro && fluxo === 'nenhum' && (
        <div className="card">
          <div className="tabela-container">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Data/hora</th>
                  <th>Itens (qtd)</th>
                  <th>Registrado por</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {entregas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="tabela-vazia">
                      <strong>Nenhuma entrega registrada</strong>
                      Registre a primeira entrega manualmente ou importe o XML
                      da nota fiscal.
                    </td>
                  </tr>
                ) : (
                  entregas.map((e) => (
                    <tr key={e.id}>
                      <td>
                        {new Date(e.data_hora).toLocaleString('pt-BR')}
                      </td>
                      <td>{e.qtd_itens}</td>
                      <td>{e.id_usuario}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-acao btn-acao-editar"
                          onClick={() => abrirDetalhe(e.id)}
                        >
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feedback de sucesso */}
      {sucessoMsg && fluxo === 'nenhum' && (
        <p className="feedback-sucesso">{sucessoMsg}</p>
      )}

      {/* ================================================================= */}
      {/* Choice modal — Lançamento manual vs Importar XML                 */}
      {/* ================================================================= */}
      {fluxo === 'escolha' && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Nova entrega</h2>
              <button
                type="button"
                className="btn-fechar"
                onClick={() => {
                  setFluxo('nenhum');
                  setErroSubmit(null);
                }}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="escolha-fluxo">
              <button
                type="button"
                className="btn-primario"
                onClick={iniciarManual}
              >
                Lançamento manual
              </button>
              <button
                type="button"
                className="btn-secundario"
                onClick={() => {
                  // O clique em "Importar XML" abre o file picker
                  document.getElementById('upload-xml')?.click();
                }}
              >
                Importar XML (NF-e)
              </button>
              <input
                id="upload-xml"
                type="file"
                accept=".xml"
                className="upload-input-hidden"
                onChange={handleUploadXml}
              />
            </div>

            <div className="modal-acoes">
              <button
                type="button"
                className="btn-secundario"
                onClick={() => {
                  setFluxo('nenhum');
                  setErroSubmit(null);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Editor — tabela editável (manual + XML)                         */}
      {/* ================================================================= */}
      {fluxo === 'editando' && (
        <div className="card">
          {/* Cabeçalho da NF (XML) */}
          {numeroNota && (
            <div className="nf-header">
              NF nº {numeroNota}{emitente ? ` — ${emitente}` : ''}
            </div>
          )}

          <div className="editor-header">
            <h2 className="editor-titulo">
              {numeroNota ? 'Revisão da nota fiscal' : 'Lançamento manual'}
            </h2>
            <div className="acoes-celula">
              <button
                type="button"
                className="btn-secundario"
                onClick={() => {
                  setFluxo('nenhum');
                  setErroSubmit(null);
                  setLinhas([]);
                  setNumeroNota(null);
                  setEmitente(null);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>

          {/* Tabela editável */}
          <div className="tabela-container tabela-editor">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantidade</th>
                  <th>Ação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha, index) => {
                  const naoReconhecido =
                    linha.descricaoNf && linha.itemId === null;
                  const classeLinha = [
                    linha.removida ? 'linha-removida' : '',
                    naoReconhecido ? 'linha-nao-reconhecida' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <tr key={index} className={classeLinha || undefined}>
                      <td>
                        <select
                          className="form-input"
                          value={linha.itemId ?? ''}
                          onChange={(e) =>
                            atualizarItemLinha(index, Number(e.target.value))
                          }
                          disabled={linha.removida}
                        >
                          <option value="" disabled>
                            -- Selecione o item --
                          </option>
                          {itens.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.nome}
                            </option>
                          ))}
                        </select>
                        {naoReconhecido && (
                          <span className="helper-amarelo">
                            Item não reconhecido — selecione o item
                            correspondente no estoque.
                            {linha.descricaoNf && (
                              <>
                                {' '}
                                (NF: {linha.descricaoNf}
                                {linha.unidadeNf
                                  ? `, ${linha.unidadeNf}`
                                  : ''}
                                )
                              </>
                            )}
                          </span>
                        )}
                        {linha.descricaoNf && linha.itemId !== null && (
                          <span
                            className="nf-descricao-original"
                          >
                            NF: {linha.descricaoNf}
                            {linha.unidadeNf ? ` (${linha.unidadeNf})` : ''}
                          </span>
                        )}
                      </td>
                      <td>
                        <input
                          type="number"
                          className="input-qtd"
                          step="0.1"
                          min="0"
                          value={linha.quantidade}
                          onChange={(e) =>
                            atualizarQuantidade(index, Number(e.target.value))
                          }
                          disabled={linha.removida}
                        />
                      </td>
                      <td>{badgeAcao(linha.acao)}</td>
                      <td>
                        {linha.removida ? (
                          <button
                            type="button"
                            className="btn-acao btn-acao-editar"
                            onClick={() => desfazerRemocao(index)}
                          >
                            Desfazer
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-acao btn-acao-excluir"
                            onClick={() => removerLinha(index)}
                          >
                            Remover
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add item + Submit */}
          <div
            className="editor-acoes"
          >
            <button
              type="button"
              className="btn-secundario"
              onClick={adicionarLinha}
            >
              Adicionar item
            </button>

            {erroSubmit && (
              <p className="alerta-erro" role="alert">
                {erroSubmit}
              </p>
            )}

            <button
              type="button"
              className="btn-primario"
              onClick={handleSubmit}
              disabled={!podeSubmeter() || salvando}
            >
              {salvando ? 'Salvando…' : 'Confirmar recebimento'}
            </button>
          </div>

          {sucessoMsg && fluxo === 'editando' && (
            <p className="feedback-sucesso">{sucessoMsg}</p>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* Modal de justificativa obrigatória (D-10, UI-SPEC 5.7)          */}
      {/* ================================================================= */}
      {justificativaPendente && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Justificativa obrigatória</h2>
              <button
                type="button"
                className="btn-fechar"
                onClick={cancelarJustificativa}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p className="justificativa-corpo">
                Alterar ou excluir um item da nota exige justificativa. Esse
                registro faz parte da prestação de contas do PNAE.
              </p>

              <div className="form-group">
                <label htmlFor="justificativa-texto">Justificativa</label>
                <textarea
                  id="justificativa-texto"
                  className={`form-input campo-auditoria${textoJustificativa.trim() ? ' campo-auditoria-preenchido' : ''}`}
                  rows={4}
                  value={textoJustificativa}
                  onChange={(e) => setTextoJustificativa(e.target.value)}
                  placeholder="Descreva o motivo da alteração ou exclusão..."
                  style={
                    textoJustificativa.trim()
                      ? { border: '1px solid var(--borda)' }
                      : { border: '1px solid var(--amarelo)' }
                  }
                />
              </div>
            </div>

            <div className="modal-acoes">
              <button
                type="button"
                className="btn-secundario"
                onClick={cancelarJustificativa}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primario"
                disabled={textoJustificativa.trim() === ''}
                onClick={confirmarJustificativa}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Modal de detalhe — Entrega #{id}                                */}
      {/* ================================================================= */}
      {detalhe && (
        <div className="modal-overlay">
          <div className="modal-content modal-largo">
            <div className="modal-header">
              <h2>Entrega #{detalhe.id}</h2>
              <button
                type="button"
                className="btn-fechar"
                onClick={() => setDetalhe(null)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p className="detalhe-meta">
                {new Date(detalhe.data_hora).toLocaleString('pt-BR')} — Registrado
                por: {detalhe.id_usuario}
              </p>

              <ul className="detalhe-lista">
                {detalhe.itens.map((item) => (
                  <li key={item.id} className="detalhe-item">
                    <span className="detalhe-item-nome">{item.item_nome}</span>
                    <span className="detalhe-item-qtd">
                      Qtd: {item.quantidade}
                    </span>
                    {badgeAcao(item.acao)}
                    {item.justificativa && (
                      <div className="detalhe-justificativa">
                        {item.justificativa}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="modal-acoes">
              <button
                type="button"
                className="btn-secundario"
                onClick={() => setDetalhe(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}