import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, fetchJson } from '../api';
import { useAuth } from '../auth-context';
import type { Conversao, Item, PlanejamentoEntrada, ReceitaItem } from '../types';
import { SLOTS_REFEICAO } from './admin/constants';
import './PainelCozinha.css';

type SlotRefeicao = (typeof SLOTS_REFEICAO)[number];

interface IngredienteRascunho {
  itemId: number;
  nome: string;
  quantidadeOriginal: number;
  quantidadeAtual: number;
  medidaOriginal: string;
  medidaSelecionada: string;
  conversoes: Conversao[];
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

function tipoParaLancamento(slot: SlotRefeicao): 'Lanche' | 'Almoço' | 'Janta' {
  if (slot === 'Lanche da Manhã' || slot === 'Lanche da Tarde') return 'Lanche';
  return slot;
}

function medidaInicial(receita: ReceitaItem, conversoes: Conversao[]): string {
  const equivalente = conversoes.find(
    (conversao) => normalizarMedida(conversao.medida_caseira) === normalizarMedida(receita.medida_caseira),
  );
  return equivalente?.medida_caseira ?? conversoes[0]?.medida_caseira ?? '';
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
  const [qtdAlunos, setQtdAlunos] = useState(0);
  const [carregandoReceita, setCarregandoReceita] = useState(false);
  const [erroReceita, setErroReceita] = useState<string | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [slotConfirmado, setSlotConfirmado] = useState<number | null>(null);
  const [saldos, setSaldos] = useState<Record<number, Item>>({});
  const receitaRequestId = useRef(0);

  const carregarPlanejamento = useCallback(async (data: string) => {
    setCarregando(true);
    setErroCarregamento(null);
    try {
      const dados = await fetchJson<PlanejamentoEntrada[]>(`/planejamento?data=${data}`);
      setPlanejamento(dados);
    } catch (erro) {
      setErroCarregamento(mensagemDeErro(erro, 'Não foi possível carregar os dados. Tente novamente.'));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    let cancelado = false;

    void fetchJson<PlanejamentoEntrada[]>(`/planejamento?data=${dataReferencia}`)
      .then((dados) => {
        if (!cancelado) setPlanejamento(dados);
      })
      .catch((erro: unknown) => {
        if (!cancelado) setErroCarregamento(mensagemDeErro(erro, 'Não foi possível carregar os dados. Tente novamente.'));
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => { cancelado = true; };
  }, [dataReferencia]);

  const abrirReceita = async (entrada: PlanejamentoEntrada) => {
    const requestId = receitaRequestId.current + 1;
    receitaRequestId.current = requestId;
    setEntradaSelecionada(entrada);
    setIngredientes([]);
    setQtdAlunos(0);
    setErroReceita(null);
    setErroEnvio(null);
    setCarregandoReceita(true);

    try {
      const receita = await fetchJson<ReceitaItem[]>(`/cardapio/${entrada.cardapio_item_id}/receita`);
      const ingredientesComConversao = await Promise.all(
        receita.map(async (item) => {
          const conversoes = await fetchJson<Conversao[]>(`/conversoes?item_id=${item.item_id}`);
          return {
            itemId: item.item_id,
            nome: item.item_nome ?? `Item ${item.item_id}`,
            quantidadeOriginal: item.quantidade,
            quantidadeAtual: item.quantidade,
            medidaOriginal: item.medida_caseira,
            medidaSelecionada: medidaInicial(item, conversoes),
            conversoes,
          } satisfies IngredienteRascunho;
        }),
      );

      if (receitaRequestId.current === requestId) setIngredientes(ingredientesComConversao);
    } catch (erro) {
      if (receitaRequestId.current === requestId) {
        setErroReceita(mensagemDeErro(erro, 'Não foi possível carregar a receita. Tente novamente.'));
      }
    } finally {
      if (receitaRequestId.current === requestId) setCarregandoReceita(false);
    }
  };

  const fecharEditor = () => {
    if (!salvando) {
      setEntradaSelecionada(null);
      setErroEnvio(null);
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

  const relerDepoisDaTentativa = async (): Promise<boolean> => {
    try {
      const [novoPlanejamento, novosItens] = await Promise.all([
        fetchJson<PlanejamentoEntrada[]>(`/planejamento?data=${dataReferencia}`),
        fetchJson<Item[]>('/itens'),
      ]);
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

    const qtdValida = Number.isInteger(qtdAlunos) && qtdAlunos > 0;
    const ingredientesValidos = ingredientes.length > 0 && ingredientes.every(
      (item) => item.quantidadeAtual >= 0 && Number.isFinite(item.quantidadeAtual)
        && item.medidaSelecionada !== '' && item.conversoes.length > 0,
    );
    if (!qtdValida || !ingredientesValidos) {
      setErroEnvio('Informe uma quantidade inteira e positiva de alunos e escolha uma conversão cadastrada para cada ingrediente.');
      return;
    }

    setSalvando(true);
    setErroEnvio(null);
    try {
      await fetchJson<{ id: number; mensagem: string }>('/refeicoes', {
        method: 'POST',
        body: JSON.stringify({
          planejamento_id: entradaSelecionada.id,
          tipo_refeicao: tipoParaLancamento(entradaSelecionada.tipo_refeicao as SlotRefeicao),
          qtd_alunos: qtdAlunos,
          itens: ingredientes.map((item) => ({
            item_id: item.itemId,
            quantidade: item.quantidadeAtual,
            medida_caseira: item.medidaSelecionada,
          })),
        }),
      });

      const leituraConcluida = await relerDepoisDaTentativa();
      if (!leituraConcluida) {
        setErroEnvio('Refeição registrada, mas não foi possível atualizar os dados exibidos. Tente novamente.');
        return;
      }

      setSlotConfirmado(entradaSelecionada.id);
      setEntradaSelecionada(null);
      setIngredientes([]);
    } catch (erro) {
      await relerDepoisDaTentativa();
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
            onChange={(evento) => {
              if (!evento.target.value) return;
              setCarregando(true);
              setErroCarregamento(null);
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
                      <button type="button" className="botao-abrir" onClick={() => void abrirReceita(entrada)} disabled={salvando}>
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
          <section className="modal-content" role="dialog" aria-modal="true" aria-labelledby="editor-titulo">
            <header className="modal-header">
              <div>
                <p className="cozinha-eyebrow">{entradaSelecionada.tipo_refeicao}</p>
                <h2 id="editor-titulo">{entradaSelecionada.tipo_refeicao} — {entradaSelecionada.nome_refeicao}</h2>
              </div>
              <button type="button" className="botao-fechar" onClick={fecharEditor} disabled={salvando}>Fechar</button>
            </header>

            {carregandoReceita && <p className="estado-loading" role="status" aria-live="polite">Carregando receita…</p>}
            {erroReceita && (
              <div className="estado-erro" role="alert">
                <p>{erroReceita}</p>
                <button type="button" className="botao-secundario" onClick={() => void abrirReceita(entradaSelecionada)}>Tentar novamente</button>
              </div>
            )}
            {erroEnvio && <p className="estado-erro-inline" role="alert">{erroEnvio}</p>}

            {!carregandoReceita && !erroReceita && (
              <form onSubmit={handleFinalizar}>
                <div className="form-grid">
                  <div className="campo-formulario campo-alunos">
                    <label htmlFor="qtd-alunos">Quantos alunos foram atendidos?</label>
                    <input
                      id="qtd-alunos"
                      type="number"
                      min="1"
                      step="1"
                      value={qtdAlunos || ''}
                      onChange={(evento) => setQtdAlunos(Number(evento.target.value))}
                      aria-describedby="ajuda-alunos"
                    />
                    <span id="ajuda-alunos" className="campo-ajuda">Informe um número inteiro positivo.</span>
                  </div>
                </div>

                <p className="ajuda-auditoria">Alterações, inclusões e remoções exigem justificativa por ingrediente para a prestação de contas do PNAE.</p>
                <div className="lista-ingredientes">
                  {ingredientes.map((item, index) => {
                    const semConversao = item.conversoes.length === 0;
                    return (
                      <div key={`${item.itemId}-${index}`} className="ingrediente-item">
                        <div className="ingrediente-detalhe">
                          <h3>{item.nome}</h3>
                          <p>Receita original: {item.quantidadeOriginal} {item.medidaOriginal}</p>
                        </div>
                        <div className="ingrediente-controles">
                          <label htmlFor={`quantidade-${item.itemId}`}>Quantidade atual</label>
                          <input
                            id={`quantidade-${item.itemId}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantidadeAtual}
                            onChange={(evento) => atualizarQuantidade(index, evento.target.value)}
                          />
                          <label htmlFor={`medida-${item.itemId}`}>Medida cadastrada</label>
                          <select
                            id={`medida-${item.itemId}`}
                            value={item.medidaSelecionada}
                            onChange={(evento) => atualizarMedida(index, evento)}
                            disabled={semConversao}
                            aria-invalid={semConversao || item.medidaSelecionada === ''}
                          >
                            <option value="">Selecione uma medida</option>
                            {item.conversoes.map((conversao) => (
                              <option key={conversao.id} value={conversao.medida_caseira}>{conversao.medida_caseira}</option>
                            ))}
                          </select>
                          {semConversao && <p className="campo-erro">Nenhuma conversão cadastrada. Solicite ao admin o cadastro em Itens/Conversões.</p>}
                        </div>
                        {saldos[item.itemId] && <p className="saldo-atual">Saldo após a última leitura: {saldos[item.itemId].saldo_atual} {saldos[item.itemId].unidade_interna}</p>}
                      </div>
                    );
                  })}
                </div>

                <footer className="modal-acoes">
                  <button type="button" className="botao-secundario" onClick={fecharEditor} disabled={salvando}>Fechar</button>
                  <button type="submit" className="botao-primario" disabled={salvando || ingredientes.length === 0 || ingredientes.some((item) => item.conversoes.length === 0 || item.medidaSelecionada === '')}>
                    {salvando ? 'Registrando…' : 'Confirmar refeição e dar baixa'}
                  </button>
                </footer>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
