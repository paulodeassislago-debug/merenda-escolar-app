import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, fetchJson } from '../api';
import { useAuth } from '../auth-context';
import type { AlunosPorPeriodo, Conversao, Item, PlanejamentoEntrada, ReceitaItem } from '../types';
import { SLOTS_REFEICAO } from './admin/constants';
import './PainelCozinha.css';

type SlotRefeicao = (typeof SLOTS_REFEICAO)[number];
type OrigemIngrediente = 'receita' | 'adicionado';

interface IngredienteRascunho {
  itemId: number;
  nome: string;
  quantidadeBase: number;
  quantidadeEsperada: number;
  quantidadeAtual: number;
  medidaOriginal: string;
  medidaSelecionada: string;
  justificativa: string;
  conversoes: Conversao[];
  origem: OrigemIngrediente;
  removido: boolean;
}

function formatarDataLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function diaSemanaLocal(data: string): number {
  const [ano, mes, dia] = data.split('-').map(Number);
  const referencia = new Date(ano, mes - 1, dia);
  return (referencia.getDay() + 6) % 7;
}

function dataLegivel(data: string): string {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

function normalizarMedida(medida: string): string {
  return medida.trim().toLocaleLowerCase('pt-BR');
}

function mensagemDeErro(erro: unknown, fallback: string): string {
  if (erro instanceof ApiError && erro.status === 401) {
    return 'Sua sessão expirou. Entre novamente.';
  }
  if (erro instanceof ApiError) {
    return erro.message;
  }
  return fallback;
}

function medidaInicial(receita: ReceitaItem, conversoes: Conversao[]): string {
  const equivalente = conversoes.find(
    (conversao) => normalizarMedida(conversao.medida_caseira) === normalizarMedida(receita.medida_caseira),
  );
  return equivalente?.medida_caseira ?? conversoes[0]?.medida_caseira ?? '';
}

function itemTemDivergencia(item: IngredienteRascunho): boolean {
  return item.origem === 'adicionado'
    || item.removido
    || item.quantidadeAtual !== item.quantidadeEsperada;
}

export default function PainelCozinha() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [dataReferencia, setDataReferencia] = useState(() => formatarDataLocal(new Date()));
  const [planejamento, setPlanejamento] = useState<PlanejamentoEntrada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);
  const [entradaSelecionada, setEntradaSelecionada] = useState<PlanejamentoEntrada | null>(null);
  const [ingredientes, setIngredientes] = useState<IngredienteRascunho[]>([]);
  const [alunosConfig, setAlunosConfig] = useState<{ manha: number; tarde: number; noite: number } | null>(null);
  const [carregandoReceita, setCarregandoReceita] = useState(false);
  const [erroReceita, setErroReceita] = useState<string | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [slotConfirmado, setSlotConfirmado] = useState<number | null>(null);
  const [saldos, setSaldos] = useState<Record<number, Item>>({});
  const [itensCatalogo, setItensCatalogo] = useState<Item[]>([]);
  const [itemParaAdicionar, setItemParaAdicionar] = useState('');
  const [carregandoAdicao, setCarregandoAdicao] = useState(false);
  const [receitaCarregada, setReceitaCarregada] = useState(false);
  const [confirmarDescarte, setConfirmarDescarte] = useState(false);
  const receitaRequestId = useRef(0);
  const planejamentoRequestId = useRef(0);
  const releituraRequestId = useRef(0);
  const dataReferenciaAtual = useRef(dataReferencia);
  const entradaSelecionadaAtual = useRef<number | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const botaoFecharRef = useRef<HTMLButtonElement>(null);
  const retornoFocoRef = useRef<HTMLElement | null>(null);

  const carregarPlanejamento = useCallback(async (data: string) => {
    const requestId = planejamentoRequestId.current + 1;
    planejamentoRequestId.current = requestId;
    setCarregando(true);
    setErroCarregamento(null);
    try {
      const dados = await fetchJson<PlanejamentoEntrada[]>(`/planejamento?data=${data}`);
      if (planejamentoRequestId.current === requestId) setPlanejamento(dados);
    } catch (erro) {
      if (planejamentoRequestId.current === requestId) {
        setErroCarregamento(mensagemDeErro(erro, 'Não foi possível carregar os dados. Tente novamente.'));
      }
    } finally {
      if (planejamentoRequestId.current === requestId) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    let cancelado = false;
    const requestId = planejamentoRequestId.current + 1;
    planejamentoRequestId.current = requestId;

    void fetchJson<PlanejamentoEntrada[]>(`/planejamento?data=${dataReferencia}`)
      .then((dados) => {
        if (!cancelado && planejamentoRequestId.current === requestId) setPlanejamento(dados);
      })
      .catch((erro: unknown) => {
        if (!cancelado && planejamentoRequestId.current === requestId) {
          setErroCarregamento(mensagemDeErro(erro, 'Não foi possível carregar os dados. Tente novamente.'));
        }
      })
      .finally(() => {
        if (!cancelado && planejamentoRequestId.current === requestId) setCarregando(false);
      });

    return () => { cancelado = true; };
  }, [dataReferencia]);

  useEffect(() => {
    if (!entradaSelecionada) return;
    const focoInicial = window.setTimeout(() => botaoFecharRef.current?.focus(), 0);
    return () => window.clearTimeout(focoInicial);
  }, [entradaSelecionada]);

  // Configuração de alunos por período (D-14): a cozinheira tem leitura (08-07).
  // 404 (ainda não configurada) ou erro de rede → null = estado explícito (D-19).
  useEffect(() => {
    let cancelado = false;
    void fetchJson<AlunosPorPeriodo>('/alunos-por-periodo')
      .then((dados) => {
        if (!cancelado) {
          setAlunosConfig({ manha: dados.manha, tarde: dados.tarde, noite: dados.noite });
        }
      })
      .catch(() => {
        if (!cancelado) setAlunosConfig(null);
      });
    return () => { cancelado = true; };
  }, []);

  // D-15: total de cada slot derivado dos períodos configurados pelo admin.
  const totalPorSlot = (slot: SlotRefeicao): number | null => {
    if (!alunosConfig) return null;
    if (slot === 'Lanche da Manhã') return alunosConfig.manha;
    if (slot === 'Almoço') return alunosConfig.manha + alunosConfig.tarde;
    if (slot === 'Lanche da Tarde') return alunosConfig.tarde;
    return alunosConfig.noite; // Janta
  };

  const carregarReceita = async (entrada: PlanejamentoEntrada, alunos: number) => {
    const requestId = receitaRequestId.current + 1;
    receitaRequestId.current = requestId;
    entradaSelecionadaAtual.current = entrada.id;
    setEntradaSelecionada(entrada);
    setIngredientes([]);
    setErroReceita(null);
    setErroEnvio(null);
    setCarregandoReceita(true);
    setReceitaCarregada(false);

    try {
      const [receita, catalogo] = await Promise.all([
        fetchJson<ReceitaItem[]>(`/cardapio/${entrada.cardapio_item_id}/receita`),
        fetchJson<Item[]>('/itens'),
      ]);
      const ingredientesComConversao = await Promise.all(
        receita.map(async (item) => {
          const conversoes = await fetchJson<Conversao[]>(`/conversoes?item_id=${item.item_id}`);
          const quantidadeEsperada = item.quantidade * alunos;
          return {
            itemId: item.item_id,
            nome: item.item_nome ?? `Item ${item.item_id}`,
            quantidadeBase: item.quantidade,
            quantidadeEsperada,
            quantidadeAtual: quantidadeEsperada,
            medidaOriginal: item.medida_caseira,
            medidaSelecionada: medidaInicial(item, conversoes),
            justificativa: '',
            conversoes,
            origem: 'receita' as const,
            removido: false,
          } satisfies IngredienteRascunho;
        }),
      );

      if (receitaRequestId.current === requestId) {
        setIngredientes(ingredientesComConversao);
        setItensCatalogo(catalogo);
        setReceitaCarregada(true);
      }
    } catch (erro) {
      if (receitaRequestId.current === requestId) {
        setErroReceita(mensagemDeErro(erro, 'Não foi possível carregar a receita. Tente novamente.'));
      }
    } finally {
      if (receitaRequestId.current === requestId) setCarregandoReceita(false);
    }
  };

  const abrirEditor = (entrada: PlanejamentoEntrada, origem?: HTMLElement) => {
    receitaRequestId.current += 1;
    retornoFocoRef.current = origem ?? null;
    entradaSelecionadaAtual.current = entrada.id;
    setEntradaSelecionada(entrada);
    setIngredientes([]);
    setItemParaAdicionar('');
    setErroReceita(null);
    setErroEnvio(null);
    setReceitaCarregada(false);
    setConfirmarDescarte(false);
    const total = totalPorSlot(entrada.tipo_refeicao as SlotRefeicao);
    if (total !== null) {
      void carregarReceita(entrada, total);
    }
  };

  const rascunhoTemAlteracoes = (): boolean => {
    return ingredientes.length > 0 || itemParaAdicionar !== '';
  };

  const fecharEditorAgora = () => {
    entradaSelecionadaAtual.current = null;
    setEntradaSelecionada(null);
    setIngredientes([]);
    setItemParaAdicionar('');
    setErroReceita(null);
    setErroEnvio(null);
    setReceitaCarregada(false);
    setConfirmarDescarte(false);
    window.setTimeout(() => retornoFocoRef.current?.focus(), 0);
  };

  const fecharEditor = () => {
    if (salvando) return;
    if (rascunhoTemAlteracoes()) {
      setConfirmarDescarte(true);
      return;
    }
    fecharEditorAgora();
  };

  const handleDialogKeyDown = (evento: KeyboardEvent<HTMLElement>) => {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      fecharEditor();
      return;
    }
    if (evento.key !== 'Tab') return;

    const focoPossivel = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
    );
    if (!focoPossivel || focoPossivel.length === 0) return;
    const primeiro = focoPossivel[0];
    const ultimo = focoPossivel[focoPossivel.length - 1];
    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  };

  const atualizarQuantidade = (index: number, valor: string) => {
    const quantidade = valor === '' ? 0 : Number(valor);
    setIngredientes((atuais) => atuais.map((item, itemIndex) => (
      itemIndex === index ? { ...item, quantidadeAtual: quantidade } : item
    )));
  };

  const atualizarMedida = (index: number, evento: ChangeEvent<HTMLSelectElement>) => {
    setIngredientes((atuais) => atuais.map((item, itemIndex) => (
      itemIndex === index ? { ...item, medidaSelecionada: evento.target.value } : item
    )));
  };

  const atualizarJustificativa = (index: number, valor: string) => {
    setIngredientes((atuais) => atuais.map((item, itemIndex) => (
      itemIndex === index ? { ...item, justificativa: valor } : item
    )));
  };

  const alternarRemocao = (index: number) => {
    setIngredientes((atuais) => atuais.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const removido = !item.removido;
      return {
        ...item,
        removido,
        quantidadeAtual: removido ? 0 : item.origem === 'receita' ? item.quantidadeEsperada : 0,
        justificativa: removido ? '' : item.origem === 'adicionado' ? item.justificativa : '',
      };
    }));
  };

  const adicionarIngrediente = async () => {
    const itemId = Number(itemParaAdicionar);
    const item = itensCatalogo.find((catalogoItem) => catalogoItem.id === itemId);
    if (!item || ingredientes.some((ingrediente) => ingrediente.itemId === itemId)) return;

    setCarregandoAdicao(true);
    setErroEnvio(null);
    try {
      const conversoes = await fetchJson<Conversao[]>(`/conversoes?item_id=${item.id}`);
      if (conversoes.length === 0) {
        setErroEnvio(`Não é possível adicionar ${item.nome}: solicite ao admin uma conversão cadastrada antes de incluir o ingrediente.`);
        return;
      }
      setIngredientes((atuais) => ([
        ...atuais,
        {
          itemId: item.id,
          nome: item.nome,
          quantidadeBase: 0,
          quantidadeEsperada: 0,
          quantidadeAtual: 0,
          medidaOriginal: '',
          medidaSelecionada: conversoes[0].medida_caseira,
          justificativa: '',
          conversoes,
          origem: 'adicionado',
          removido: false,
        },
      ]));
      setItemParaAdicionar('');
    } catch (erro) {
      setErroEnvio(mensagemDeErro(erro, 'Não foi possível carregar as conversões deste ingrediente.'));
    } finally {
      setCarregandoAdicao(false);
    }
  };

  const relerDepoisDaTentativa = async (data: string, entradaId: number): Promise<boolean> => {
    const requestId = releituraRequestId.current + 1;
    releituraRequestId.current = requestId;
    try {
      const [novoPlanejamento, novosItens] = await Promise.all([
        fetchJson<PlanejamentoEntrada[]>(`/planejamento?data=${data}`),
        fetchJson<Item[]>('/itens'),
      ]);
      if (
        releituraRequestId.current !== requestId
        || dataReferenciaAtual.current !== data
        || entradaSelecionadaAtual.current !== entradaId
      ) return false;
      setPlanejamento(novoPlanejamento);
      setSaldos(Object.fromEntries(novosItens.map((item) => [item.id, item])));
      return true;
    } catch {
      return false;
    }
  };

  const handleFinalizar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!entradaSelecionada || salvando) return;
    const dataNoEnvio = dataReferencia;
    const entradaIdNoEnvio = entradaSelecionada.id;

    const configValida = totalPorSlot(entradaSelecionada.tipo_refeicao as SlotRefeicao) !== null;
    const ingredientesValidos = ingredientes.length > 0 && ingredientes.every(
      (item) => item.quantidadeAtual >= 0 && Number.isFinite(item.quantidadeAtual)
        && (item.removido || item.origem === 'receita' || item.quantidadeAtual > 0)
        && item.medidaSelecionada !== '' && item.conversoes.length > 0,
    );
    const justificativasValidas = ingredientes.every(
      (item) => !itemTemDivergencia(item) || item.justificativa.trim() !== '',
    );
    if (!configValida || !ingredientesValidos || !justificativasValidas) {
      setErroEnvio(
        !justificativasValidas
          ? 'Informe a justificativa de cada ingrediente com quantidade alterada antes de confirmar.'
          : 'A configuração de alunos por período ainda não foi definida pelo admin.',
      );
      return;
    }

    setSalvando(true);
    setErroEnvio(null);
    try {
      await fetchJson<{ id: number; mensagem: string }>('/refeicoes', {
        method: 'POST',
        body: JSON.stringify({
          slot: entradaSelecionada.tipo_refeicao,
          planejamento_id: entradaSelecionada.id,
          itens: ingredientes.map((item) => ({
            item_id: item.itemId,
            quantidade: item.quantidadeAtual,
            medida_caseira: item.medidaSelecionada,
            justificativa: item.justificativa.trim() || null,
          })),
        }),
      });

      const leituraConcluida = await relerDepoisDaTentativa(dataNoEnvio, entradaIdNoEnvio);
      if (!leituraConcluida) {
        setErroEnvio('Refeição registrada, mas não foi possível atualizar os dados exibidos. Tente novamente.');
        return;
      }

      setSlotConfirmado(entradaSelecionada.id);
      fecharEditorAgora();
    } catch (erro) {
      await relerDepoisDaTentativa(dataNoEnvio, entradaIdNoEnvio);
      setErroEnvio(mensagemDeErro(erro, 'Não foi possível registrar a refeição. O rascunho foi preservado.'));
    } finally {
      setSalvando(false);
    }
  };

  const handleSessaoExpirada = () => {
    logout();
    navigate('/', { replace: true });
  };

  const entradasDoDia = planejamento.filter((entrada) => entrada.dia_semana === diaSemanaLocal(dataReferencia));
  const totalDoSlot = entradaSelecionada
    ? totalPorSlot(entradaSelecionada.tipo_refeicao as SlotRefeicao)
    : null;

  return (
    <div className="cozinha-container">
      <header className="cozinha-header">
        <div>
          <p className="cozinha-eyebrow">Operação diária</p>
          <h1>Painel da cozinha</h1>
          <p>Planejamento vigente, revisão da receita e baixa auditável do estoque.</p>
        </div>
        <div className="cozinha-data-controle">
          <label htmlFor="data-referencia">Data de referência</label>
          <input
            id="data-referencia"
            type="date"
            value={dataReferencia}
            disabled={salvando}
            onChange={(evento) => {
              if (!evento.target.value) return;
              dataReferenciaAtual.current = evento.target.value;
               setCarregando(true);
               setErroCarregamento(null);
               entradaSelecionadaAtual.current = null;
               setEntradaSelecionada(null);
              setIngredientes([]);
              setErroReceita(null);
              setErroEnvio(null);
              setSlotConfirmado(null);
              setDataReferencia(evento.target.value);
            }}
          />
          <button type="button" className="botao-secundario" onClick={() => void carregarPlanejamento(dataReferencia)} disabled={carregando}>
            Atualizar dados
          </button>
        </div>
      </header>

      {carregando && <p className="estado-loading" role="status" aria-live="polite">Carregando dados…</p>}
      {erroCarregamento && (
        <div className="estado-erro" role="alert">
          <p>{erroCarregamento}</p>
          {erroCarregamento === 'Sua sessão expirou. Entre novamente.' ? (
            <button type="button" className="botao-secundario" onClick={handleSessaoExpirada}>Entrar novamente</button>
          ) : (
            <button type="button" className="botao-secundario" onClick={() => void carregarPlanejamento(dataReferencia)}>Tentar novamente</button>
          )}
        </div>
      )}

      {!carregando && !erroCarregamento && entradasDoDia.length === 0 && (
        <section className="estado-vazio" aria-labelledby="vazio-cozinha-titulo">
          <h2 id="vazio-cozinha-titulo">Nenhum planejamento para hoje</h2>
          <p>A secretaria ainda não publicou um prato para este horário. Consulte o planejamento antes de lançar uma refeição.</p>
        </section>
      )}

      <main className="cozinha-main">
        <section aria-labelledby="slots-titulo">
          <div className="secao-titulo">
            <div>
              <p className="cozinha-eyebrow">{dataLegivel(dataReferencia)}</p>
              <h2 id="slots-titulo">Refeições planejadas</h2>
            </div>
            <p className="ajuda-auditoria">Selecione um prato disponível para revisar a receita antes da confirmação.</p>
          </div>
          <div className="slots-grade">
            {SLOTS_REFEICAO.map((slot) => {
              const entrada = entradasDoDia.find((item) => item.tipo_refeicao === slot);
              const confirmado = entrada !== undefined && slotConfirmado === entrada.id;
              return (
                <article key={slot} className={`slot-card ${entrada ? 'slot-disponivel' : 'slot-pendente'} ${confirmado ? 'slot-confirmado' : ''}`}>
                  <div className="slot-card-topo">
                    <span className="slot-label">{slot}</span>
                    <span className="estado-badge">{confirmado ? 'Confirmado' : entrada ? 'Disponível' : 'Pendente'}</span>
                  </div>
                  {entrada ? (
                    <>
                      <h3>{entrada.nome_refeicao}</h3>
                      <p>Vigente desde {dataLegivel(entrada.data_inicio_vigencia)}</p>
                      {confirmado && <p className="mensagem-sucesso">Refeição registrada e estoque atualizado.</p>}
                      <button type="button" className="botao-abrir" onClick={(evento) => abrirEditor(entrada, evento.currentTarget)} disabled={salvando}>
                        Revisar refeição
                      </button>
                    </>
                  ) : (
                    <>
                      <h3>Nenhum prato definido</h3>
                      <p>Nenhum prato definido para este horário.</p>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </main>

      {entradaSelecionada && (
        <div className="modal-overlay">
          <section
            ref={dialogRef}
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="editor-titulo"
            onKeyDown={handleDialogKeyDown}
          >
            <header className="modal-header">
              <div>
                <p className="cozinha-eyebrow">{entradaSelecionada.tipo_refeicao}</p>
                <h2 id="editor-titulo">{entradaSelecionada.tipo_refeicao} — {entradaSelecionada.nome_refeicao}</h2>
              </div>
              <button ref={botaoFecharRef} type="button" className="botao-fechar" onClick={fecharEditor} disabled={salvando}>Fechar</button>
            </header>

            {erroEnvio && (
              <div className="estado-erro-inline" role="alert">
                <p>{erroEnvio}</p>
                {erroEnvio === 'Sua sessão expirou. Entre novamente.' && (
                  <button type="button" className="botao-secundario" onClick={handleSessaoExpirada}>Entrar novamente</button>
                )}
              </div>
            )}

            <form onSubmit={handleFinalizar}>
                {totalDoSlot === null ? (
                  <p className="estado-vazio">
                    A configuração de alunos por período ainda não foi definida pelo admin.
                  </p>
                ) : (
                  <>
                    <p className="ajuda-auditoria">
                      Receita calculada para {totalDoSlot} alunos, conforme a configuração de alunos por período.
                    </p>
                    {carregandoReceita && <p className="estado-loading" role="status" aria-live="polite">Carregando receita…</p>}
                    {erroReceita && (
                      <div className="estado-erro" role="alert">
                        <p>{erroReceita}</p>
                        {erroReceita === 'Sua sessão expirou. Entre novamente.' ? (
                          <button type="button" className="botao-secundario" onClick={handleSessaoExpirada}>Entrar novamente</button>
                        ) : (
                          <button type="button" className="botao-secundario" onClick={() => void carregarReceita(entradaSelecionada, totalDoSlot)}>Tentar novamente</button>
                        )}
                      </div>
                    )}
                    {salvando && <p className="estado-loading" role="status" aria-live="polite">Salvando refeição e atualizando estoque…</p>}
                  </>
                )}

                {totalDoSlot !== null && receitaCarregada && !carregandoReceita && !erroReceita && (
                  <>
                    <p className="ajuda-auditoria">Alterações, inclusões e remoções exigem justificativa por ingrediente para a prestação de contas do PNAE.</p>
                    <div className="adicionar-ingrediente">
                      <label htmlFor="item-para-adicionar">Adicionar ingrediente</label>
                      <div className="adicionar-ingrediente-controles">
                        <select
                          id="item-para-adicionar"
                          value={itemParaAdicionar}
                          onChange={(evento) => setItemParaAdicionar(evento.target.value)}
                          disabled={carregandoAdicao || salvando}
                        >
                          <option value="">Selecione um item cadastrado</option>
                          {itensCatalogo
                            .filter((catalogoItem) => !ingredientes.some((ingrediente) => ingrediente.itemId === catalogoItem.id))
                            .map((catalogoItem) => <option key={catalogoItem.id} value={catalogoItem.id}>{catalogoItem.nome}</option>)}
                        </select>
                        <button type="button" className="botao-secundario" onClick={() => void adicionarIngrediente()} disabled={!itemParaAdicionar || carregandoAdicao || salvando}>
                          {carregandoAdicao ? 'Carregando…' : 'Adicionar'}
                        </button>
                      </div>
                    </div>
                    <div className="lista-ingredientes">
                      {ingredientes.map((item, index) => {
                        const semConversao = item.conversoes.length === 0;
                        const justificativaObrigatoria = itemTemDivergencia(item);
                        return (
                          <div key={`${item.itemId}-${index}`} className={`ingrediente-item ${item.removido ? 'ingrediente-removido' : ''}`}>
                            <div className="ingrediente-detalhe">
                              <div className="ingrediente-titulo-linha">
                                <h3>{item.nome}</h3>
                                {item.removido && <span className="estado-badge">Removido</span>}
                                {item.origem === 'adicionado' && !item.removido && <span className="estado-badge">Adicionado</span>}
                              </div>
                              {item.origem === 'receita' ? (
                                <>
                                  <p>Quantidade-base: {item.quantidadeBase} {item.medidaOriginal}</p>
                                  <p>Esperada para {totalDoSlot} alunos: {item.quantidadeEsperada} {item.medidaOriginal}</p>
                                </>
                              ) : <p>Ingrediente fora da receita planejada.</p>}
                            </div>
                            <div className="ingrediente-controles">
                              <label htmlFor={`quantidade-${item.itemId}`}>Quantidade final</label>
                              <input
                                id={`quantidade-${item.itemId}`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.quantidadeAtual}
                                onChange={(evento) => atualizarQuantidade(index, evento.target.value)}
                                disabled={salvando || item.removido}
                                aria-describedby={`ajuda-quantidade-${item.itemId}`}
                              />
                              <span id={`ajuda-quantidade-${item.itemId}`} className="campo-ajuda">Esta é a quantidade enviada para a baixa.</span>
                              <label htmlFor={`medida-${item.itemId}`}>Medida cadastrada</label>
                              <select
                                id={`medida-${item.itemId}`}
                                value={item.medidaSelecionada}
                                onChange={(evento) => atualizarMedida(index, evento)}
                                disabled={semConversao || salvando}
                                aria-invalid={semConversao || item.medidaSelecionada === ''}
                              >
                                <option value="">Selecione uma medida</option>
                                {item.conversoes.map((conversao) => (
                                  <option key={conversao.id} value={conversao.medida_caseira}>{conversao.medida_caseira}</option>
                                ))}
                              </select>
                              {semConversao && <p className="campo-erro">Nenhuma conversão cadastrada. Solicite ao admin o cadastro em Itens/Conversões.</p>}
                              {justificativaObrigatoria && (
                                <div className="justificativa-controle">
                                  <label htmlFor={`justificativa-${item.itemId}`}>
                                    {item.removido ? 'Justificativa da remoção' : 'Justificativa da alteração'}
                                  </label>
                                  <textarea
                                    id={`justificativa-${item.itemId}`}
                                    value={item.justificativa}
                                    onChange={(evento) => atualizarJustificativa(index, evento.target.value)}
                                    aria-describedby={`ajuda-justificativa-${item.itemId}`}
                                    aria-invalid={item.justificativa.trim() === ''}
                                    rows={3}
                                    placeholder="Explique a divergência desta quantidade"
                                  />
                                  <span id={`ajuda-justificativa-${item.itemId}`} className="campo-ajuda">
                                    Obrigatória para alterações, inclusões e remoções.
                                  </span>
                                </div>
                              )}
                              <button type="button" className="botao-secundario botao-remover" onClick={() => alternarRemocao(index)} disabled={salvando}>
                                {item.removido ? 'Restaurar ingrediente' : 'Remover ingrediente'}
                              </button>
                            </div>
                            {saldos[item.itemId] && <p className="saldo-atual">Saldo após a última leitura: {saldos[item.itemId].saldo_atual} {saldos[item.itemId].unidade_interna}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                <footer className="modal-acoes">
                  <button type="button" className="botao-secundario" onClick={fecharEditor} disabled={salvando}>Fechar</button>
                  <button type="submit" className="botao-primario" disabled={salvando || totalDoSlot === null || !receitaCarregada || ingredientes.length === 0 || ingredientes.some((item) => item.conversoes.length === 0 || item.medidaSelecionada === '' || (itemTemDivergencia(item) && item.justificativa.trim() === ''))}>
                    {salvando ? 'Registrando…' : 'Confirmar refeição e dar baixa'}
                  </button>
                </footer>
              </form>
            {confirmarDescarte && (
              <div className="confirmacao-descarte" role="alertdialog" aria-modal="true" aria-labelledby="descarte-titulo">
                <h3 id="descarte-titulo">Descartar alterações?</h3>
                <p>O rascunho e as justificativas preenchidas serão perdidos.</p>
                <div className="confirmacao-acoes">
                  <button type="button" className="botao-secundario" onClick={() => setConfirmarDescarte(false)}>Continuar editando</button>
                  <button type="button" className="botao-primario" onClick={fecharEditorAgora}>Descartar</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
