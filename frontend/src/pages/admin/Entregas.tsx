// src/pages/admin/Entregas.tsx — página completa: listagem, entrada manual auditada, upload XML NF-e
// F11: manual com justificativa obrigatória. F12: XML parseado no frontend → revisão humana.
// D-10: alterar/excluir item EXIGE justificativa (exigência de prestação de contas PNAE).
// D-11: parse no frontend com fast-xml-parser; mesmo fluxo da manual após parse.

import { useEffect, useState } from 'react';
import { ApiError, fetchJson } from '../../api';
import type {
  AcaoEntrega,
  Conversao,
  EntregaResumo,
  EntregaDetalhe,
  EntregaCreatePayload,
  Item,
  OrigemEntrega,
} from '../../types';
import { UNIDADES_SUGERIDAS } from './constants';
import { parseNfe } from './nfe';
import './Entregas.css';

interface LinhaEdicao {
  itemId: number | null;
  quantidade: number;
  unidade: string;
  fatorConversao: string;
  acao: AcaoEntrega;
  justificativa: string | null;
  descricaoNf?: string;
  unidadeNf?: string;
  removida?: boolean;
}

/** Data de hoje no fuso local (YYYY-MM-DD) — default do campo data da entrega (D-09). */
function dataHojeLocal(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

export default function Entregas() {
  // Listagem
  const [entregas, setEntregas] = useState<EntregaResumo[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [conversoesPorItem, setConversoesPorItem] = useState<Record<number, Conversao[]>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Fluxo: 'nenhum' | 'escolha' | 'editando'
  const [fluxo, setFluxo] = useState<'nenhum' | 'escolha' | 'editando'>('nenhum');
  const [linhas, setLinhas] = useState<LinhaEdicao[]>([]);
  const [emitente, setEmitente] = useState<string | null>(null);

  // Campos novos da entrega (D-05/D-07/D-09)
  const [origem, setOrigem] = useState<OrigemEntrega>('manual');
  const [dataEntrega, setDataEntrega] = useState<string>(dataHojeLocal());
  const [fornecedorId, setFornecedorId] = useState<number | null>(null);
  const [notaNumero, setNotaNumero] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');

  // Justificativa
  const [justificativaPendente, setJustificativaPendente] = useState<{
    index: number;
    acao: 'alterado' | 'excluído';
    quantidadePendente?: number;
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
    setOrigem('manual');
    setDataEntrega(dataHojeLocal());
    setFornecedorId(null);
    setNotaNumero('');
    setObservacoes('');
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
      {
        itemId: null,
        quantidade: 0,
        unidade: '',
        fatorConversao: '',
        acao: 'recebido',
        justificativa: null,
      },
    ]);
  };

  const carregarConversoesItem = async (itemId: number): Promise<Conversao[]> => {
    const armazenadas = conversoesPorItem[itemId];
    if (armazenadas) return armazenadas;

    try {
      const conversoes = await fetchJson<Conversao[]>(`/conversoes?item_id=${itemId}`);
      setConversoesPorItem((prev) => ({ ...prev, [itemId]: conversoes }));
      return conversoes;
    } catch {
      return [];
    }
  };

  const itemTemUnidadeOficial = (item: Item, unidade: string) =>
    unidade.trim().toLocaleUpperCase() === item.unidade_oficial.trim().toLocaleUpperCase();

  const fatorParaUnidade = (item: Item, unidade: string, conversoes: Conversao[]) => {
    if (itemTemUnidadeOficial(item, unidade)) return item.fator_conversao.toString();
    return conversoes.find(
      (conversao) =>
        conversao.medida_caseira.trim().toLocaleUpperCase() === unidade.trim().toLocaleUpperCase(),
    )?.peso_em_kg.toString() ?? '';
  };

  const atualizarItemLinha = async (index: number, itemId: number) => {
    const item = itens.find((entrada) => entrada.id === itemId);
    if (!item) return;

    const linhaAtual = linhas[index];
    const unidade = linhaAtual?.unidadeNf?.trim() || item.unidade_oficial;
    const conversoes = await carregarConversoesItem(itemId);
    setLinhas((prev) =>
      prev.map((l, i) =>
        i === index
          ? {
              ...l,
              itemId,
              unidade,
              fatorConversao: fatorParaUnidade(item, unidade, conversoes),
            }
          : l,
      ),
    );
  };

  const atualizarUnidade = (index: number, unidade: string) => {
    const linha = linhas[index];
    if (!linha || linha.itemId === null) return;
    const item = itens.find((entrada) => entrada.id === linha.itemId);
    if (!item) return;

    const conversoes = conversoesPorItem[item.id] ?? [];
    setLinhas((prev) =>
      prev.map((l, i) =>
        i === index
          ? {
              ...l,
              unidade,
              fatorConversao: fatorParaUnidade(item, unidade, conversoes),
            }
          : l,
      ),
    );
  };

  const atualizarFatorConversao = (index: number, fatorConversao: string) => {
    setLinhas((prev) =>
      prev.map((l, i) => (i === index ? { ...l, fatorConversao } : l)),
    );
  };

  const atualizarQuantidade = (index: number, quantidade: number) => {
    const linha = linhas[index];
    if (!linha) return;

    // Se a linha já está marcada como 'alterado', permite editar livremente
    if (linha.acao === 'alterado') {
      setLinhas((prev) =>
        prev.map((l, i) => (i === index ? { ...l, quantidade } : l)),
      );
      return;
    }

    // Primeira alteração de quantidade: abre modal de justificativa sem aplicar ainda
    if (linha.quantidade !== quantidade) {
      setTextoJustificativa('');
      setJustificativaPendente({ index, acao: 'alterado', quantidadePendente: quantidade });
      return; // NÃO chama setLinhas — quantidade só é aplicada ao confirmar
    }
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

    const { index, acao, quantidadePendente } = justificativaPendente;
    const just = textoJustificativa.trim();

    setLinhas((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        const updates: Partial<LinhaEdicao> = { justificativa: just };
        if (acao === 'alterado') {
          updates.acao = 'alterado';
          if (quantidadePendente !== undefined) {
            updates.quantidade = quantidadePendente;
          }
        }
        if (acao === 'excluído') {
          updates.acao = 'excluído';
          updates.removida = true;
        }
        return { ...l, ...updates };
      }),
    );
    setJustificativaPendente(null);
    setTextoJustificativa('');
  };

  const cancelarJustificativa = () => {
    if (!justificativaPendente) return;

    const { index, acao } = justificativaPendente;
    // Para 'alterado': a quantidade nunca foi aplicada — só fecha o modal
    // Para 'excluído': reverte remoção (removida + acao)
    if (acao === 'excluído') {
      setLinhas((prev) =>
        prev.map((l, i) =>
          i === index ? { ...l, removida: false, acao: 'recebido' } : l,
        ),
      );
    }
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
      const itemIds = resultado.linhas
        .map((linha) => linha.itemId)
        .filter((itemId): itemId is number => itemId !== null);
      const conversoes = await Promise.all(
        [...new Set(itemIds)].map(async (itemId) => [itemId, await carregarConversoesItem(itemId)] as const),
      );
      const conversoesMap = new Map(conversoes);
      const novasLinhas: LinhaEdicao[] = resultado.linhas.map((l) => {
        const item = l.itemId === null
          ? null
          : itens.find((entrada) => entrada.id === l.itemId) ?? null;
        const unidade = l.unidadeNf || item?.unidade_oficial || '';
        return {
          itemId: l.itemId,
          quantidade: l.quantidade,
          unidade,
          fatorConversao: item
            ? fatorParaUnidade(item, unidade, conversoesMap.get(item.id) ?? [])
            : '',
          acao: 'recebido' as AcaoEntrega,
          justificativa: null,
          descricaoNf: l.descricao,
          unidadeNf: l.unidadeNf,
        };
      });
      setLinhas(novasLinhas);
      setOrigem('xml');
      setDataEntrega(resultado.dataEmissao ?? dataHojeLocal());
      setNotaNumero(resultado.numeroNota ?? '');
      setFornecedorId(null);
      setObservacoes('');
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
      (l) => {
        if (l.itemId === null || l.quantidade <= 0) return true;
        const item = itens.find((entrada) => entrada.id === l.itemId);
        return Boolean(
          item &&
          !itemTemUnidadeOficial(item, l.unidade) &&
          (!l.fatorConversao || Number(l.fatorConversao) <= 0),
        );
      },
    );
    if (invalidas.length > 0) {
      setErroSubmit(
        'Verifique as linhas: selecione os itens, informe quantidades válidas e preencha a conversão das unidades diferentes da padrão.',
      );
      return;
    }

    // Guarda de UI: campos do cabeçalho do form (T-08-04 — espelha as 400/422 do backend)
    if (!dataEntrega) {
      setErroSubmit('Informe a data da entrega.');
      return;
    }
    if (fornecedorId === null) {
      setErroSubmit('Selecione o fornecedor da entrega.');
      return;
    }
    if (origem === 'manual' && observacoes.trim() === '') {
      setErroSubmit('Informe as observações da entrega manual.');
      return;
    }
    if (origem === 'xml' && notaNumero.trim() === '') {
      setErroSubmit('Informe o número da nota fiscal.');
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

    const payload: EntregaCreatePayload = {
      origem,
      data_entrega: dataEntrega,
      fornecedor_id: fornecedorId,
      nota_numero: origem === 'xml' ? notaNumero : null,
      observacoes: origem === 'manual' ? observacoes : null,
      itens: linhas.map((l) => ({
        item_id: l.itemId!,
        quantidade: l.quantidade,
        acao: l.acao,
        unidade: l.unidade.trim() || undefined,
        fator_conversao: l.fatorConversao ? Number(l.fatorConversao) : undefined,
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
      setNotaNumero('');
      setEmitente(null);
      setOrigem('manual');
      setDataEntrega(dataHojeLocal());
      setFornecedorId(null);
      setObservacoes('');
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
    if (
      ativas.some((l) => {
        if (l.itemId === null || l.quantidade <= 0) return true;
        const item = itens.find((entrada) => entrada.id === l.itemId);
        return Boolean(
          item &&
          !itemTemUnidadeOficial(item, l.unidade) &&
          (!l.fatorConversao || Number(l.fatorConversao) <= 0),
        );
      })
    ) return false;
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
          {origem === 'xml' && notaNumero && (
            <div className="nf-header">
              NF nº {notaNumero}{emitente ? ` — ${emitente}` : ''}
            </div>
          )}

          <div className="editor-header">
            <h2 className="editor-titulo">
              {origem === 'xml' ? 'Revisão da nota fiscal' : 'Lançamento manual'}
            </h2>
            <div className="acoes-celula">
              <button
                type="button"
                className="btn-secundario"
                onClick={() => {
                  setFluxo('nenhum');
                  setErroSubmit(null);
                  setLinhas([]);
                  setNotaNumero('');
                  setEmitente(null);
                  setOrigem('manual');
                  setDataEntrega(dataHojeLocal());
                  setFornecedorId(null);
                  setObservacoes('');
                }}
              >
                Cancelar
              </button>
            </div>
          </div>

          {/* Campos do cabeçalho do form (D-05/D-07/D-09) */}
          <div className="entrega-campos-form">
            <div className="form-group">
              <label htmlFor="data-entrega">Data da entrega</label>
              <input
                id="data-entrega"
                type="date"
                className="form-input"
                value={dataEntrega}
                onChange={(e) => setDataEntrega(e.target.value)}
                required
              />
            </div>

            {origem === 'xml' && (
              <div className="form-group">
                <label htmlFor="nota-numero">Número da nota</label>
                <input
                  id="nota-numero"
                  type="text"
                  className="form-input"
                  value={notaNumero}
                  onChange={(e) => setNotaNumero(e.target.value)}
                  placeholder="Número da NF-e"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="observacoes">
                Observações{origem === 'manual' ? ' (obrigatório)' : ''}
              </label>
              <textarea
                id="observacoes"
                className="form-input"
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                aria-required={origem === 'manual'}
                placeholder={
                  origem === 'manual'
                    ? 'Descreva a entrega (origem, itens recebidos, notas...)'
                    : 'Observações adicionais (opcional)'
                }
              />
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
                  const itemDaLinha = linha.itemId === null
                    ? null
                    : itens.find((item) => item.id === linha.itemId) ?? null;
                  const unidadeDiferente = Boolean(
                    itemDaLinha && !itemTemUnidadeOficial(itemDaLinha, linha.unidade),
                  );
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
                        {itemDaLinha && (
                          <div className="entrega-unidade-controles">
                            <label htmlFor={`entrega-unidade-${index}`}>Unidade da entrega</label>
                            <input
                              id={`entrega-unidade-${index}`}
                              type="text"
                              list={`entrega-unidades-${index}`}
                              className="form-input"
                              value={linha.unidade}
                              onChange={(e) => atualizarUnidade(index, e.target.value)}
                              disabled={linha.removida}
                            />
                            <datalist id={`entrega-unidades-${index}`}>
                              <option value={itemDaLinha.unidade_oficial} />
                              {UNIDADES_SUGERIDAS.map((unidade) => (
                                <option key={unidade} value={unidade} />
                              ))}
                              {(conversoesPorItem[itemDaLinha.id] ?? []).map((conversao) => (
                                <option key={conversao.id} value={conversao.medida_caseira} />
                              ))}
                            </datalist>
                          </div>
                        )}
                        {itemDaLinha && unidadeDiferente && (
                          <div className="entrega-conversao-inline">
                            <label htmlFor={`entrega-fator-${index}`}>
                              1 {linha.unidade || 'unidade'} equivale a
                            </label>
                            <input
                              id={`entrega-fator-${index}`}
                              type="number"
                              min="0.001"
                              step="0.001"
                              className="form-input"
                              value={linha.fatorConversao}
                              onChange={(e) => atualizarFatorConversao(index, e.target.value)}
                              disabled={linha.removida}
                              required
                            />
                            <span>{itemDaLinha.unidade_interna}</span>
                          </div>
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
                {detalhe.itens.map((item) => {
                  const itemCatalogo = itens.find((entrada) => entrada.id === item.item_id);
                  const unidade = item.unidade ?? itemCatalogo?.unidade_oficial ?? '';
                  const fator = item.fator_conversao ?? itemCatalogo?.fator_conversao;
                  const quantidadeInterna = fator === undefined
                    ? null
                    : item.quantidade * fator;

                  return (
                    <li key={item.id} className="detalhe-item">
                      <span className="detalhe-item-nome">{item.item_nome}</span>
                      <span className="detalhe-item-qtd">
                        Qtd: {item.quantidade} {unidade}
                        {quantidadeInterna !== null && itemCatalogo && (
                          <span className="detalhe-item-conversao">
                            {' '}(= {quantidadeInterna.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}{' '}
                            {itemCatalogo.unidade_interna})
                          </span>
                        )}
                      </span>
                      {badgeAcao(item.acao)}
                      {item.justificativa && (
                        <div className="detalhe-justificativa">
                          {item.justificativa}
                        </div>
                      )}
                    </li>
                  );
                })}
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
