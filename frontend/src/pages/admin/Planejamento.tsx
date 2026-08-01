// src/pages/admin/Planejamento.tsx — grade semanal com upsert (F10, D-09)

import { useEffect, useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import { ApiError, fetchJson } from '../../api';
import type { PlanejamentoEntrada, CardapioItem } from '../../types';
import { DIAS_SEMANA, TIPOS_REFEICAO } from './constants';
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
    for (const tipo of TIPOS_REFEICAO) {
      mapa[chaveSlot(dia, tipo)] = null;
    }
  }
  for (const e of entradasData) {
    mapa[chaveSlot(e.dia_semana, e.tipo_refeicao)] = e.cardapio_item_id;
  }
  return mapa;
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

  const segunda = segundaDaSemana(semanaRef);
  const domingo = new Date(segunda);
  domingo.setDate(segunda.getDate() + 6);

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
      setSelecoes(buildSelecoes(entradasData));
      setSucesso(false);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar os dados. Verifique se o backend está rodando e tente novamente.');
    } finally {
      setCarregando(false);
    }
  }, [semanaRef]);

  // Efeito: fetch inicial e ao trocar de semana — inline com cancelled flag
  useEffect(() => {
    let cancelled = false;
    const seg = segundaDaSemana(semanaRef);

    void (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const [entradasData, pratosData] = await Promise.all([
          fetchJson<PlanejamentoEntrada[]>('/planejamento?data=' + formatISO(seg)),
          fetchJson<CardapioItem[]>('/cardapio'),
        ]);

        if (!cancelled) {
          setEntradas(entradasData);
          setPratos(pratosData);
          setSelecoes(buildSelecoes(entradasData));
          setSucesso(false);
          setCarregando(false);
        }
      } catch (e) {
        if (!cancelled) {
          setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar os dados. Verifique se o backend está rodando e tente novamente.');
          setCarregando(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [semanaRef]);

  /** Salva o planejamento (task 2): upsert por slot alterado, DELETE ao limpar. */
  const handleSalvar = async (e: FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    setSucesso(false);

    // Constrói mapa vigente atual para comparação
    const mapaVigente: Record<string, PlanejamentoEntrada> = {};
    for (const ent of entradas) {
      mapaVigente[chaveSlot(ent.dia_semana, ent.tipo_refeicao)] = ent;
    }

    try {
      for (let dia = 0; dia < 7; dia++) {
        for (const tipo of TIPOS_REFEICAO) {
          const chave = chaveSlot(dia, tipo);
          const novoValor = selecoes[chave];
          const entradaVigente = mapaVigente[chave];

          if (novoValor === entradaVigente?.cardapio_item_id) {
            continue; // sem alteração
          }

          if (novoValor !== null && novoValor !== undefined) {
            // Upsert: POST /planejamento
            await fetchJson('/planejamento', {
              method: 'POST',
              body: JSON.stringify({
                cardapio_item_id: novoValor,
                tipo_refeicao: tipo,
                dia_semana: dia,
                data_inicio_vigencia: formatISO(segundaDaSemana(semanaRef)),
              }),
            });
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
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao salvar o planejamento. Tente novamente.');
    } finally {
      setSalvando(false);
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
                  {TIPOS_REFEICAO.map((tipo) => (
                    <th key={tipo}>{tipo}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DIAS_SEMANA.map((dia, diaIdx) => (
                  <tr key={diaIdx}>
                    <td className="planejamento-dia-col">{dia}</td>
                    {TIPOS_REFEICAO.map((tipoRefeicao) => {
                      const chave = chaveSlot(diaIdx, tipoRefeicao);
                      const valorAtual = selecoes[chave] ?? '';
                      const pratosFiltrados = pratos.filter(
                        (p) => p.tipo_refeicao === tipoRefeicao,
                      );

                      return (
                        <td key={tipoRefeicao} className="planejamento-celula">
                          <select
                            className={`form-input planejamento-select ${!valorAtual ? 'celula-vazia' : ''}`}
                            value={String(valorAtual)}
                            onChange={(e) => {
                              const v = e.target.value;
                              setSelecoes((prev) => ({
                                ...prev,
                                [chave]: v === '' ? null : Number(v),
                              }));
                              setSucesso(false);
                            }}
                          >
                            <option value="">— A definir —</option>
                            {pratosFiltrados.map((prato) => (
                              <option key={prato.id} value={prato.id}>
                                {prato.nome_refeicao}
                              </option>
                            ))}
                          </select>
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