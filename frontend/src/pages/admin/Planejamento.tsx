// src/pages/admin/Planejamento.tsx — grade semanal com upsert (F10, D-09) + projeção (D-17/D-19)

import { useEffect, useState, useCallback, useRef } from 'react';
import type { FormEvent } from 'react';
import { ApiError, fetchJson } from '../../api';
import type {
  PlanejamentoEntrada,
  CardapioItem,
  ProjecaoSemana,
  PlanejamentoAviso,
} from '../../types';
import { DIAS_SEMANA, SLOTS_REFEICAO } from './constants';
import './Planejamento.css';

// --- Helpers locais (não exportados — regra react-refresh) ---

/** Calcula a segunda-feira da semana contendo `d`. */
function segundaDaSemana(d: Date): Date {
  const diff = (d.getDay() + 6) % 7; // JS 0=domingo → backend 0=segunda
  const seg = new Date(d);
  seg.setDate(d.getDate() - diff);
  return seg;
}

/** Formata Date como YYYY-MM-DD usando componentes locais (não UTC). */
function formatISO(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/** Formata Date como dd/mm (local) para o caption. */
function formatDiaMes(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Chave de slot: `${dia_semana}|${tipo_refeicao}` */
function chaveSlot(diaSemana: number, tipoRefeicao: string): string {
  return `${diaSemana}|${tipoRefeicao}`;
}

/** Inicializa selecoes a partir de entradas no formato 7×4. */
function buildSelecoes(entradasData: PlanejamentoEntrada[]): Record<string, number | null> {
  const mapa: Record<string, number | null> = {};
  for (let dia = 0; dia < 7; dia++) {
    for (const slot of SLOTS_REFEICAO) {
      mapa[chaveSlot(dia, slot)] = null;
    }
  }
  for (const e of entradasData) {
    mapa[chaveSlot(e.dia_semana, e.tipo_refeicao)] = e.cardapio_item_id;
  }
  return mapa;
}

/** Formata número pt-BR com até 2 casas (projeção — D-19). */
function fmtNumero(v: number | null): string {
  if (v === null) return '—';
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

/** Avisos derivados da projeção da semana — fallback quando o POST não retorna avisos (D-18/D-19). */
function derivarAvisos(proj: ProjecaoSemana | null): PlanejamentoAviso[] {
  if (!proj?.configurado) return [];
  const avisos: PlanejamentoAviso[] = [];
  for (const item of proj.itens) {
    if (!item.avaliavel || item.saldo_projetado === null) continue;
    if (item.saldo_projetado < 0) {
      avisos.push({ item_id: item.item_id, nome: item.nome, faltando: -item.saldo_projetado });
    }
  }
  return avisos;
}

/** Monta o rascunho completo da grade: `dia|slot|cardapio_item_id`. */
function montarRascunho(selecoesAtuais: Record<string, number | null>): string[] {
  const rascunho: string[] = [];
  for (let dia = 0; dia < 7; dia++) {
    for (const slot of SLOTS_REFEICAO) {
      const id = selecoesAtuais[chaveSlot(dia, slot)];
      if (id !== null && id !== undefined) {
        rascunho.push(`${dia}|${slot}|${id}`);
      }
    }
  }
  return rascunho;
}

// --- Componente ---

export default function Planejamento() {
  const [semanaRef, setSemanaRef] = useState<Date>(new Date());
  const [entradas, setEntradas] = useState<PlanejamentoEntrada[]>([]);
  const [pratos, setPratos] = useState<CardapioItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selecoes, setSelecoes] = useState<Record<string, number | null>>({});
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  // Projeção cumulativa da semana (D-17/D-19) — falha isolada nunca derruba a grade
  const [projecao, setProjecao] = useState<ProjecaoSemana | null>(null);
  const [erroProjecao, setErroProjecao] = useState(false);
  const [carregandoProjecao, setCarregandoProjecao] = useState(false);
  const [avisos, setAvisos] = useState<PlanejamentoAviso[]>([]);
  const projecaoRef = useRef<ProjecaoSemana | null>(null);
  const painelRef = useRef<HTMLDetailsElement>(null);
  // obs #4: debounce do refetch da projeção ao alterar selects da grade (~300ms)
  const debounceProjecaoRef = useRef<number | null>(null);
  const geracaoProjecaoRef = useRef(0);
  const abortProjecaoRef = useRef<AbortController | null>(null);

  const segunda = segundaDaSemana(semanaRef);
  const domingo = new Date(segunda);
  domingo.setDate(segunda.getDate() + 6);

  /**
   * Busca a projeção da semana (D-17). Falha isolada: a grade segue funcional.
   * `rascunho` (obs #4): pré-visualização das células alteradas no formato
   * `dia|slot|cardapio_item_id` — o backend ignora entradas inválidas (T-08-14).
   */
  const carregarProjecao = useCallback(async (seg: Date, rascunho: string[] = []) => {
    const geracao = ++geracaoProjecaoRef.current;
    abortProjecaoRef.current?.abort();
    const controller = new AbortController();
    abortProjecaoRef.current = controller;
    setCarregandoProjecao(true);
    setErroProjecao(false);
    projecaoRef.current = null;
    setProjecao(null);

    try {
      const params = new URLSearchParams({ data: formatISO(seg) });
      for (const r of rascunho) params.append('rascunho', r);
      const proj = await fetchJson<ProjecaoSemana>(
        '/planejamento/projecao?' + params.toString(),
        { signal: controller.signal },
      );
      if (
        geracao !== geracaoProjecaoRef.current
        || formatISO(seg) !== formatISO(segundaDaSemana(semanaRef))
      ) return; // semana mudou ou uma resposta mais nova já foi solicitada
      projecaoRef.current = proj;
      setProjecao(proj);
      setErroProjecao(false);
    } catch {
      if (
        controller.signal.aborted
        || geracao !== geracaoProjecaoRef.current
        || formatISO(seg) !== formatISO(segundaDaSemana(semanaRef))
      ) return;
      projecaoRef.current = null;
      setProjecao(null);
      setErroProjecao(true);
    } finally {
      if (geracao === geracaoProjecaoRef.current) {
        setCarregandoProjecao(false);
        if (abortProjecaoRef.current === controller) {
          abortProjecaoRef.current = null;
        }
      }
    }
  }, [semanaRef]);

  /** Invalida a projeção visível enquanto o rascunho mais recente aguarda resposta. */
  const invalidarProjecao = () => {
    geracaoProjecaoRef.current += 1;
    abortProjecaoRef.current?.abort();
    abortProjecaoRef.current = null;
    projecaoRef.current = null;
    setProjecao(null);
    setErroProjecao(false);
    setCarregandoProjecao(true);
  };

  /**
   * obs #4: reagenda o refetch da projeção com o rascunho das células alteradas,
   * cancelando o agendamento anterior (debounce ~300ms) — sem salvar.
   */
  const agendarRefetchProjecao = (selecoesAtuais: Record<string, number | null>) => {
    if (debounceProjecaoRef.current !== null) {
      window.clearTimeout(debounceProjecaoRef.current);
    }
    invalidarProjecao();
    debounceProjecaoRef.current = window.setTimeout(() => {
      void carregarProjecao(segundaDaSemana(semanaRef), montarRascunho(selecoesAtuais));
    }, 300);
  };

  // Limpa o timer pendente ao desmontar
  useEffect(() => {
    return () => {
      if (debounceProjecaoRef.current !== null) {
        window.clearTimeout(debounceProjecaoRef.current);
      }
      abortProjecaoRef.current?.abort();
      geracaoProjecaoRef.current += 1;
    };
  }, []);

  /** Refetch após salvar — dependente de semanaRef para usar a semana correta. */
  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const seg = segundaDaSemana(semanaRef);
      const [entradasData, pratosData] = await Promise.all([
        fetchJson<PlanejamentoEntrada[]>('/planejamento?data=' + formatISO(seg)),
        fetchJson<CardapioItem[]>('/cardapio'),
      ]);

      setEntradas(entradasData);
      setPratos(pratosData);
      const selecoesIniciais = buildSelecoes(entradasData);
      setSelecoes(selecoesIniciais);
      setSucesso(false);
      await carregarProjecao(seg, montarRascunho(selecoesIniciais)); // falha não derruba a grade
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setErro('Sua sessão expirou. Entre novamente.');
      } else {
        setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar os dados. Verifique se o backend está rodando e tente novamente.');
      }
    } finally {
      setCarregando(false);
    }
  }, [semanaRef, carregarProjecao]);

  // Efeito: fetch inicial e ao trocar de semana — inline com cancelled flag
  useEffect(() => {
    let cancelled = false;
    const seg = segundaDaSemana(semanaRef);
    let rascunhoInicial: string[] = [];
    let dadosCarregados = false;

    void (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const [entradasData, pratosData] = await Promise.all([
          fetchJson<PlanejamentoEntrada[]>('/planejamento?data=' + formatISO(seg)),
          fetchJson<CardapioItem[]>('/cardapio'),
        ]);
        const selecoesIniciais = buildSelecoes(entradasData);
        rascunhoInicial = montarRascunho(selecoesIniciais);
        dadosCarregados = true;

        if (!cancelled) {
          setEntradas(entradasData);
          setPratos(pratosData);
          setSelecoes(selecoesIniciais);
          setSucesso(false);
          setAvisos([]); // avisos são do save da semana corrente (D-18/D-19)
          setCarregando(false);
        }
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiError && e.status === 401) {
            setErro('Sua sessão expirou. Entre novamente.');
          } else {
            setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar os dados. Verifique se o backend está rodando e tente novamente.');
          }
          setCarregando(false);
        }
      }

      // Projeção em paralelo — falha isolada, nunca derruba a grade (D-19)
      if (!cancelled && dadosCarregados) {
        void carregarProjecao(seg, rascunhoInicial);
      }
    })();

    return () => { cancelled = true; };
  }, [semanaRef, carregarProjecao]);

  /** Salva o planejamento (task 2): upsert por slot alterado, DELETE ao limpar. */
  const handleSalvar = async (e: FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    setSucesso(false);
    setAvisos([]);

    // Avisos aditivos do POST /planejamento (D-18) — não bloqueiam o save
    const avisosColetados: PlanejamentoAviso[] = [];

    // Constrói mapa vigente atual para comparação
    const mapaVigente: Record<string, PlanejamentoEntrada> = {};
    for (const ent of entradas) {
      mapaVigente[chaveSlot(ent.dia_semana, ent.tipo_refeicao)] = ent;
    }

    try {
      for (let dia = 0; dia < 7; dia++) {
        for (const slot of SLOTS_REFEICAO) {
          const chave = chaveSlot(dia, slot);
          const novoValor = selecoes[chave];
          const entradaVigente = mapaVigente[chave];

          if (novoValor === entradaVigente?.cardapio_item_id) {
            continue; // sem alteração
          }

          if (novoValor !== null && novoValor !== undefined) {
            // Upsert: POST /planejamento
            const resposta = await fetchJson<{ avisos?: PlanejamentoAviso[] }>('/planejamento', {
              method: 'POST',
              body: JSON.stringify({
                cardapio_item_id: novoValor,
                tipo_refeicao: slot,
                dia_semana: dia,
                data_inicio_vigencia: formatISO(segundaDaSemana(semanaRef)),
              }),
            });
            if (resposta.avisos && resposta.avisos.length > 0) {
              avisosColetados.push(...resposta.avisos);
            }
          } else if (entradaVigente) {
            // Limpar slot: DELETE /planejamento/{id}
            await fetchJson(`/planejamento/${entradaVigente.id}`, {
              method: 'DELETE',
            });
          }
        }
      }

      // Sucesso: refetch para provar persistência
      await carregarDados();
      setSucesso(true);
      setAvisos(avisosColetados.length > 0 ? avisosColetados : derivarAvisos(projecaoRef.current));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao salvar o planejamento. Tente novamente.');
      // Refetch para sincronizar estado após falha parcial (slots já salvos)
      await carregarDados();
    } finally {
      setSalvando(false);
    }
  };

  /** Unidade oficial do item para os avisos (o POST não a retorna — D-18). */
  const unidadeDoItem = (itemId: number): string =>
    projecao?.itens.find((i) => i.item_id === itemId)?.unidade_oficial ?? '';

  /** Abre o painel de projeção e rola até ele (D-19). */
  const abrirProjecao = () => {
    if (painelRef.current) {
      painelRef.current.open = true;
      painelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="planejamento-page">
      <div className="pagina-header">
        <div>
          <h1>Planejamento semanal</h1>
        </div>
      </div>

      {/* Navegação de semana */}
      <nav className="planejamento-nav">
        <button
          type="button"
          className="btn-secundario"
          onClick={() => {
            const nova = new Date(segunda);
            nova.setDate(nova.getDate() - 7);
            setSemanaRef(nova);
          }}
        >
          ‹ Semana anterior
        </button>

        <div className="planejamento-data">
          <label htmlFor="semana-ref" className="planejamento-data-label">
            Semana de referência
          </label>
          <input
            id="semana-ref"
            type="date"
            className="form-input planejamento-date-input"
            value={formatISO(segunda)}
            onChange={(e) => {
              if (e.target.value) {
                setSemanaRef(new Date(e.target.value + 'T00:00:00'));
              }
            }}
          />
        </div>

        <button
          type="button"
          className="btn-secundario"
          onClick={() => {
            const nova = new Date(segunda);
            nova.setDate(nova.getDate() + 7);
            setSemanaRef(nova);
          }}
        >
          Próxima semana ›
        </button>
      </nav>

      <p className="planejamento-caption">
        Semana de {formatDiaMes(segunda)} a {formatDiaMes(domingo)}
      </p>

      {carregandoProjecao && (
        <p className="planejamento-projecao-status" role="status" aria-live="polite">
          <span className="planejamento-projecao-spinner" aria-hidden="true" />
          Atualizando a projeção…
        </p>
      )}

      {!carregandoProjecao && erroProjecao && (
        <p className="planejamento-projecao-status planejamento-projecao-status-erro" role="alert">
          Não foi possível atualizar a projeção. O planejamento continua editável.
          <button
            type="button"
            className="btn-secundario"
            onClick={() => {
              void carregarProjecao(segunda, montarRascunho(selecoes));
            }}
          >
            Tentar novamente
          </button>
        </p>
      )}

      {/* Estados */}
      {carregando && <p className="aviso">Carregando…</p>}

      {erro && (
        <p className="alerta-erro" role="alert">
          {erro}
        </p>
      )}

      {/* Grade semanal */}
      {!carregando && !erro && (
        <form onSubmit={handleSalvar}>
          <div className="planejamento-grade-container">
            <table className="planejamento-grade tabela">
              <thead>
                <tr>
                  <th className="planejamento-dia-col" />
                  {SLOTS_REFEICAO.map((slot) => (
                    <th key={slot}>{slot}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DIAS_SEMANA.map((dia, diaIdx) => (
                  <tr key={diaIdx}>
                    <td className="planejamento-dia-col">{dia}</td>
                    {SLOTS_REFEICAO.map((slot) => {
                      const chave = chaveSlot(diaIdx, slot);
                      const valorAtual = selecoes[chave] ?? '';

                      // Mapeamento: slots de lanche filtram pratos tipo "Lanche"
                      const tipoParaFiltro =
                        slot === 'Lanche da Manhã' || slot === 'Lanche da Tarde'
                          ? 'Lanche'
                          : slot;
                      const pratosFiltrados = pratos.filter(
                        (p) => p.tipo_refeicao === tipoParaFiltro,
                      );

                      // Projeção (D-19): badge de déficit projetado por SLOT (obs #5).
                      // WR-01: o backend só emite dias COM consumo (dias esparso) — o
                      // lookup é por `dia_semana`, nunca posicional (dias[diaIdx]);
                      // dentro do dia, o aviso aponta apenas o slot afetado.
                      const diaProjecao = projecao?.configurado
                        ? projecao.dias.find((d) => d.dia_semana === diaIdx)
                        : undefined;
                      const slotProjecao = diaProjecao
                        ? diaProjecao.slots.find((s) => s.slot === slot)
                        : undefined;
                      const rupturasSlot = carregandoProjecao ? [] : slotProjecao?.rupturas ?? [];

                      return (
                        <td key={slot} className="planejamento-celula">
                          <div className="planejamento-celula-conteudo">
                            <select
                              className={`form-input planejamento-select ${!valorAtual ? 'celula-vazia' : ''}`}
                              value={String(valorAtual)}
                              onChange={(e) => {
                                const v = e.target.value;
                                const novasSelecoes = {
                                  ...selecoes,
                                  [chave]: v === '' ? null : Number(v),
                                };
                                setSelecoes(novasSelecoes);
                                setSucesso(false);
                                // obs #4: pré-visualiza a projeção sem salvar (debounce)
                                agendarRefetchProjecao(novasSelecoes);
                              }}
                            >
                              <option value="">— A definir —</option>
                              {pratosFiltrados.map((prato) => (
                                <option key={prato.id} value={prato.id}>
                                  {prato.nome_refeicao}
                                </option>
                              ))}
                            </select>
                            {/* 08-11: área de aviso com altura reservada em TODAS
                                as células (badge ou placeholder vazio) — uma célula
                                com ruptura não desalinha selects/badges das demais. */}
                            <span className="planejamento-celula-aviso">
                              {rupturasSlot.length > 0 && (
                                <span
                                  className="badge-ruptura"
                                  title={rupturasSlot
                                    .map(
                                      (r) =>
                                        `${r.nome} −${r.faltando.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${r.unidade_oficial}`,
                                    )
                                    .join('\n')}
                                >
                                  ⚠ {rupturasSlot.length}{' '}
                                  {rupturasSlot.length === 1 ? 'item faltando' : 'itens faltando'}
                                </span>
                              )}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Feedback de sucesso */}
          {sucesso && <p className="planejamento-sucesso">Planejamento salvo.</p>}

          {/* Avisos não-bloqueantes do save (D-18/D-19) */}
          {avisos.length > 0 && (
            <div className="banner-aviso" role="status">
              <p className="banner-aviso-titulo">
                Atenção: {avisos.length}{' '}
                {avisos.length === 1
                  ? 'item pode faltar nas refeições planejadas.'
                  : 'itens podem faltar nas refeições planejadas.'}
              </p>
              <ul className="banner-aviso-lista">
                {avisos.map((a) => (
                  <li key={a.item_id}>
                    {a.nome} −
                    {[fmtNumero(a.faltando), unidadeDoItem(a.item_id)].filter(Boolean).join(' ')}
                  </li>
                ))}
              </ul>
              <div className="banner-aviso-acoes">
                <button type="button" className="btn-secundario" onClick={abrirProjecao}>
                  Ver projeção
                </button>
              </div>
            </div>
          )}

            {/* Projeção da semana (D-19): painel colapsável, nunca bloqueia */}
          <details className="painel-projecao" ref={painelRef}>
            <summary>Projeção da semana</summary>
            {carregandoProjecao ? (
              <div className="painel-projecao-corpo">
                <p className="painel-projecao-aviso">Atualizando a projeção com o rascunho atual…</p>
              </div>
            ) : erroProjecao ? (
              <div className="painel-projecao-corpo">
                <p className="painel-projecao-aviso">
                  Não foi possível carregar a projeção.{' '}
                  <button
                    type="button"
                    className="btn-secundario"
                    onClick={() => {
                      void carregarProjecao(segunda, montarRascunho(selecoes));
                    }}
                  >
                    Tentar novamente
                  </button>
                </p>
              </div>
            ) : !projecao?.configurado ? (
              <div className="painel-projecao-corpo">
                <p className="painel-projecao-aviso">
                  Configure os alunos por período para ativar a projeção.
                </p>
              </div>
            ) : (
              <div className="painel-projecao-corpo">
                <p className="painel-projecao-resumo">
                  {projecao.resumo.itens_com_ruptura}{' '}
                  {projecao.resumo.itens_com_ruptura === 1
                    ? 'item com ruptura prevista'
                    : 'itens com ruptura prevista'}
                  {projecao.resumo.itens_nao_avaliaveis > 0 && (
                    <>
                      {' · '}
                      {projecao.resumo.itens_nao_avaliaveis}{' '}
                      {projecao.resumo.itens_nao_avaliaveis === 1
                        ? 'item sem conversão cadastrada'
                        : 'itens sem conversão cadastrada'}
                    </>
                  )}
                </p>
                <div className="painel-projecao-tabela-container">
                  <table className="painel-projecao-tabela">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Saldo atual</th>
                        <th>Consumo projetado</th>
                        <th>Saldo projetado final</th>
                        <th>1º dia de ruptura</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projecao.itens.map((item) => (
                        <tr
                          key={item.item_id}
                          className={
                            item.avaliavel
                              ? item.primeiro_dia_ruptura !== null
                                ? 'linha-ruptura'
                                : 'linha-sobra'
                              : 'linha-nao-avaliavel'
                          }
                        >
                          <td>{item.nome}</td>
                          <td>
                            {fmtNumero(item.saldo_atual)} {item.unidade_oficial}
                          </td>
                          <td>
                            {item.avaliavel
                              ? `${fmtNumero(item.consumo_semana)} ${item.unidade_oficial}`
                              : 'não avaliável'}
                          </td>
                          <td>
                            {item.avaliavel
                              ? `${fmtNumero(item.saldo_projetado)} ${item.unidade_oficial}`
                              : 'não avaliável'}
                          </td>
                          <td>
                            {item.avaliavel && item.primeiro_dia_ruptura !== null
                              ? DIAS_SEMANA[item.primeiro_dia_ruptura]
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </details>

          {/* CTA de salvar */}
          <div className="planejamento-acoes">
            <button
              type="submit"
              className="btn-primario"
              disabled={salvando}
            >
              {salvando ? 'Salvando…' : 'Salvar planejamento'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
