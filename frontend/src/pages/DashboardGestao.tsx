import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, fetchJson } from '../api';
import { useAuth } from '../auth-context';
import type { EntregaResumo, Item, PlanejamentoEntrada, RefeicaoHistorico } from '../types';
import { SLOTS_REFEICAO } from './admin/constants';
import './DashboardGestao.css';

type SectionKey = 'estoque' | 'refeicoes' | 'planejamento' | 'entregas';

function dataLocalHoje(): string {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function diaSemanaLocal(data: string): number {
  const [ano, mes, dia] = data.split('-').map(Number);
  return (new Date(ano, mes - 1, dia).getDay() + 6) % 7;
}

function saldoExibicao(item: Item): number {
  const fator = item.fator_conversao > 0 ? item.fator_conversao : 1;
  return item.saldo_atual / fator;
}

function mensagemErro(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) {
    return 'Sua sessão expirou. Entre novamente.';
  }
  return error instanceof ApiError
    ? error.message
    : 'Não foi possível carregar os dados. Tente novamente.';
}

function dataHoraLegivel(dataHora: string): string {
  const data = new Date(dataHora);
  return Number.isNaN(data.getTime()) ? dataHora : data.toLocaleString('pt-BR');
}

function temAjuste(item: RefeicaoHistorico['itens'][number]): boolean {
  return item.quantidade_original !== item.quantidade_ajustada || Boolean(item.justificativa);
}

function valorResumo(carregando: boolean, erro: string | null, valor: number): string {
  if (carregando) return '…';
  if (erro) return '—';
  return String(valor);
}

interface ErroSecaoProps {
  erro: string | null;
  onRetry: () => void;
  onSessionExpired: () => void;
}

function ErroSecao({ erro, onRetry, onSessionExpired }: ErroSecaoProps) {
  if (!erro) return null;
  return (
    <div className="gestao-estado gestao-estado-erro" role="alert">
      <p>{erro}</p>
      <div className="gestao-estado-acoes">
        <button type="button" className="gestao-botao gestao-botao-secundario" onClick={onRetry}>
          Tentar novamente
        </button>
        {erro === 'Sua sessão expirou. Entre novamente.' && (
          <button type="button" className="gestao-botao gestao-botao-secundario" onClick={onSessionExpired}>
            Entrar novamente
          </button>
        )}
      </div>
    </div>
  );
}

export default function DashboardGestao() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [dataReferencia, setDataReferencia] = useState(dataLocalHoje);
  const [itens, setItens] = useState<Item[]>([]);
  const [refeicoes, setRefeicoes] = useState<RefeicaoHistorico[]>([]);
  const [planejamento, setPlanejamento] = useState<PlanejamentoEntrada[]>([]);
  const [entregas, setEntregas] = useState<EntregaResumo[]>([]);
  const [carregandoEstoque, setCarregandoEstoque] = useState(true);
  const [carregandoRefeicoes, setCarregandoRefeicoes] = useState(true);
  const [carregandoPlanejamento, setCarregandoPlanejamento] = useState(true);
  const [carregandoEntregas, setCarregandoEntregas] = useState(true);
  const [erroEstoque, setErroEstoque] = useState<string | null>(null);
  const [erroRefeicoes, setErroRefeicoes] = useState<string | null>(null);
  const [erroPlanejamento, setErroPlanejamento] = useState<string | null>(null);
  const [erroEntregas, setErroEntregas] = useState<string | null>(null);
  const requestIds = useRef<Record<SectionKey, number>>({
    estoque: 0,
    refeicoes: 0,
    planejamento: 0,
    entregas: 0,
  });

  const carregarEstoque = useCallback(() => {
    const requestId = requestIds.current.estoque + 1;
    requestIds.current.estoque = requestId;
    setCarregandoEstoque(true);
    setErroEstoque(null);

    void fetchJson<Item[]>('/itens')
      .then((resposta) => {
        if (requestIds.current.estoque === requestId) setItens(resposta);
      })
      .catch((error: unknown) => {
        if (requestIds.current.estoque === requestId) setErroEstoque(mensagemErro(error));
      })
      .finally(() => {
        if (requestIds.current.estoque === requestId) setCarregandoEstoque(false);
      });
  }, []);

  const carregarRefeicoes = useCallback((data: string) => {
    const requestId = requestIds.current.refeicoes + 1;
    requestIds.current.refeicoes = requestId;
    setCarregandoRefeicoes(true);
    setErroRefeicoes(null);

    void fetchJson<RefeicaoHistorico[]>(`/refeicoes?data=${encodeURIComponent(data)}`)
      .then((resposta) => {
        if (requestIds.current.refeicoes === requestId) setRefeicoes(resposta);
      })
      .catch((error: unknown) => {
        if (requestIds.current.refeicoes === requestId) setErroRefeicoes(mensagemErro(error));
      })
      .finally(() => {
        if (requestIds.current.refeicoes === requestId) setCarregandoRefeicoes(false);
      });
  }, []);

  const carregarPlanejamento = useCallback((data: string) => {
    const requestId = requestIds.current.planejamento + 1;
    requestIds.current.planejamento = requestId;
    setCarregandoPlanejamento(true);
    setErroPlanejamento(null);

    void fetchJson<PlanejamentoEntrada[]>(`/planejamento?data=${encodeURIComponent(data)}`)
      .then((resposta) => {
        if (requestIds.current.planejamento === requestId) {
          setPlanejamento(resposta.filter((entrada) => entrada.dia_semana === diaSemanaLocal(data)));
        }
      })
      .catch((error: unknown) => {
        if (requestIds.current.planejamento === requestId) setErroPlanejamento(mensagemErro(error));
      })
      .finally(() => {
        if (requestIds.current.planejamento === requestId) setCarregandoPlanejamento(false);
      });
  }, []);

  const carregarEntregas = useCallback((data: string) => {
    const requestId = requestIds.current.entregas + 1;
    requestIds.current.entregas = requestId;
    setCarregandoEntregas(true);
    setErroEntregas(null);

    void fetchJson<EntregaResumo[]>(`/entregas?data=${encodeURIComponent(data)}`)
      .then((resposta) => {
        if (requestIds.current.entregas === requestId) setEntregas(resposta);
      })
      .catch((error: unknown) => {
        if (requestIds.current.entregas === requestId) setErroEntregas(mensagemErro(error));
      })
      .finally(() => {
        if (requestIds.current.entregas === requestId) setCarregandoEntregas(false);
      });
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      carregarEstoque();
      carregarRefeicoes(dataReferencia);
      carregarPlanejamento(dataReferencia);
      carregarEntregas(dataReferencia);
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [carregarEntregas, carregarEstoque, carregarPlanejamento, carregarRefeicoes, dataReferencia]);

  const handleSessaoExpirada = () => {
    logout();
    navigate('/', { replace: true });
  };

  const itensBaixoEstoque = itens.filter((item) => saldoExibicao(item) < item.limiar);

  return (
    <div className="gestao-page">
      <header className="gestao-header">
        <div>
          <p className="gestao-kicker">Secretaria</p>
          <h1>Gestão da merenda</h1>
          <p className="gestao-subtitulo">Acompanhe o estoque e os registros operacionais da escola.</p>
        </div>
        <div className="gestao-acoes-header">
          <label htmlFor="gestao-data">Data de referência</label>
          <input
            id="gestao-data"
            type="date"
            value={dataReferencia}
            onChange={(event) => setDataReferencia(event.target.value)}
          />
          <button type="button" className="gestao-botao gestao-botao-secundario" onClick={() => {
            carregarEstoque();
            carregarRefeicoes(dataReferencia);
            carregarPlanejamento(dataReferencia);
            carregarEntregas(dataReferencia);
          }}>
            Atualizar dados
          </button>
        </div>
      </header>

      <section className="gestao-resumo" aria-labelledby="gestao-resumo-titulo">
        <div className="gestao-section-heading">
          <div>
            <p className="gestao-kicker">Visão rápida</p>
            <h2 id="gestao-resumo-titulo">Resumo da operação</h2>
          </div>
          <nav className="gestao-navegacao" aria-label="Atalhos da gestão">
            <Link className="gestao-botao gestao-botao-primario" to="/admin/planejamento">Abrir planejamento</Link>
            <Link className="gestao-botao gestao-botao-secundario" to="/admin/entregas">Ver entregas</Link>
          </nav>
        </div>
        <div className="gestao-metricas">
          <article className="gestao-metrica"><span>Itens cadastrados</span><strong>{valorResumo(carregandoEstoque, erroEstoque, itens.length)}</strong></article>
          <article className="gestao-metrica gestao-metrica-alerta"><span>Itens em baixo estoque</span><strong>{valorResumo(carregandoEstoque, erroEstoque, itensBaixoEstoque.length)}</strong></article>
          <article className="gestao-metrica"><span>Refeições na data</span><strong>{valorResumo(carregandoRefeicoes, erroRefeicoes, refeicoes.length)}</strong></article>
          <article className="gestao-metrica"><span>Entregas na data</span><strong>{valorResumo(carregandoEntregas, erroEntregas, entregas.length)}</strong></article>
        </div>
      </section>

      <section className="gestao-secao" aria-labelledby="gestao-estoque-titulo">
        <div className="gestao-section-heading">
          <div><p className="gestao-kicker">Saldo atual</p><h2 id="gestao-estoque-titulo">Estoque</h2></div>
          <p className="gestao-ajuda">O alerta considera o limiar configurado de cada item na unidade de exibição.</p>
        </div>
        {carregandoEstoque && <p className="gestao-status" role="status" aria-live="polite">Carregando estoque…</p>}
        <ErroSecao erro={erroEstoque} onRetry={() => carregarEstoque()} onSessionExpired={handleSessaoExpirada} />
        {!carregandoEstoque && !erroEstoque && itens.length === 0 && <div className="gestao-estado"><h3>Nenhum item cadastrado</h3><p>O estoque não possui itens para exibir nesta visão.</p></div>}
        {itens.length > 0 && (
          <div className="gestao-tabela-container">
            <table className="gestao-tabela">
              <caption className="gestao-visualmente-oculto">Saldo atual dos itens de estoque</caption>
              <thead><tr><th scope="col">Código</th><th scope="col">Item</th><th scope="col">Unidade</th><th scope="col">Saldo</th><th scope="col">Status</th></tr></thead>
              <tbody>{itens.map((item) => {
                const saldo = saldoExibicao(item);
                const baixoEstoque = saldo < item.limiar;
                return <tr key={item.id}><td>#{item.id}</td><td className="gestao-texto-longo">{item.nome}</td><td>{item.unidade_oficial}</td><td>{saldo.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td><td><span className={baixoEstoque ? 'gestao-status-badge gestao-status-badge-alerta' : 'gestao-status-badge'}>{baixoEstoque ? 'Baixo estoque' : 'Estável'}</span></td></tr>;
              })}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className="gestao-secao" aria-labelledby="gestao-refeicoes-titulo">
        <div className="gestao-section-heading"><div><p className="gestao-kicker">Histórico auditável</p><h2 id="gestao-refeicoes-titulo">Refeições na data</h2></div><p className="gestao-ajuda">Ajustes e justificativas são exibidos conforme registrados pela cozinha.</p></div>
        {carregandoRefeicoes && <p className="gestao-status" role="status" aria-live="polite">Carregando refeições…</p>}
        <ErroSecao erro={erroRefeicoes} onRetry={() => carregarRefeicoes(dataReferencia)} onSessionExpired={handleSessaoExpirada} />
        {!carregandoRefeicoes && !erroRefeicoes && refeicoes.length === 0 && <div className="gestao-estado"><h3>Nenhuma refeição registrada</h3><p>Não há lançamentos para a data selecionada.</p></div>}
        {refeicoes.length > 0 && <div className="gestao-tabela-container"><table className="gestao-tabela gestao-tabela-historico"><caption className="gestao-visualmente-oculto">Refeições registradas na data selecionada</caption><thead><tr><th scope="col">ID</th><th scope="col">Data e hora</th><th scope="col">Tipo</th><th scope="col">Alunos</th><th scope="col">Usuário</th><th scope="col">Planejamento</th><th scope="col">Itens e justificativas</th></tr></thead><tbody>{refeicoes.map((refeicao) => <tr key={refeicao.id}><td>#{refeicao.id}</td><td>{dataHoraLegivel(refeicao.data_hora)}</td><td>{refeicao.tipo_refeicao}</td><td>{refeicao.qtd_alunos}</td><td>#{refeicao.id_usuario}</td><td>{refeicao.planejamento_id ? `#${refeicao.planejamento_id}` : 'Avulsa'}</td><td><ul className="gestao-lista-detalhes">{refeicao.itens.map((item) => <li key={`${refeicao.id}-${item.item_id}`} className={temAjuste(item) ? 'gestao-item-ajustado' : ''}><span>{item.item_nome ?? 'Item'} (#{item.item_id}): {item.quantidade_ajustada} {item.medida_caseira}; esperado {item.quantidade_original}</span>{temAjuste(item) && <span>Justificativa: {item.justificativa ?? 'não informada'}</span>}</li>)}</ul></td></tr>)}</tbody></table></div>}
      </section>

      <section className="gestao-secao" aria-labelledby="gestao-planejamento-titulo">
        <div className="gestao-section-heading"><div><p className="gestao-kicker">Programação vigente</p><h2 id="gestao-planejamento-titulo">Planejamento do dia</h2></div><p className="gestao-ajuda">Os quatro slots são apresentados mesmo quando não há prato publicado.</p></div>
        {carregandoPlanejamento && <p className="gestao-status" role="status" aria-live="polite">Carregando planejamento…</p>}
        <ErroSecao erro={erroPlanejamento} onRetry={() => carregarPlanejamento(dataReferencia)} onSessionExpired={handleSessaoExpirada} />
        {!carregandoPlanejamento && !erroPlanejamento && planejamento.length === 0 && <div className="gestao-estado"><h3>Nenhum prato publicado</h3><p>Não há entradas vigentes para a data selecionada.</p></div>}
        <div className="gestao-slots">{SLOTS_REFEICAO.map((slot) => { const entrada = planejamento.find((item) => item.tipo_refeicao === slot); return <article className={`gestao-slot ${entrada ? '' : 'gestao-slot-pendente'}`} key={slot}><div className="gestao-slot-cabecalho"><h3>{slot}</h3><span className="gestao-status-badge">{entrada ? 'Disponível' : 'Pendente'}</span></div><p>{entrada?.nome_refeicao ?? 'Nenhum prato definido para este horário.'}</p>{entrada && <span className="gestao-texto-suave">Vigente desde {entrada.data_inicio_vigencia}</span>}</article>; })}</div>
      </section>

      <section className="gestao-secao" aria-labelledby="gestao-entregas-titulo">
        <div className="gestao-section-heading"><div><p className="gestao-kicker">Recebimentos</p><h2 id="gestao-entregas-titulo">Entregas na data</h2></div><Link className="gestao-botao gestao-botao-secundario" to="/admin/entregas">Ver detalhes de entregas</Link></div>
        {carregandoEntregas && <p className="gestao-status" role="status" aria-live="polite">Carregando entregas…</p>}
        <ErroSecao erro={erroEntregas} onRetry={() => carregarEntregas(dataReferencia)} onSessionExpired={handleSessaoExpirada} />
        {!carregandoEntregas && !erroEntregas && entregas.length === 0 && <div className="gestao-estado"><h3>Nenhuma entrega registrada</h3><p>Não há recebimentos para a data selecionada.</p></div>}
        {entregas.length > 0 && <div className="gestao-tabela-container"><table className="gestao-tabela"><caption className="gestao-visualmente-oculto">Entregas registradas na data selecionada</caption><thead><tr><th scope="col">ID</th><th scope="col">Data e hora</th><th scope="col">Fornecedor</th><th scope="col">Observações</th><th scope="col">Itens</th></tr></thead><tbody>{entregas.map((entrega) => <tr key={entrega.id}><td>#{entrega.id}</td><td>{dataHoraLegivel(entrega.data_hora)}</td><td>{entrega.fornecedor_nome ?? '—'}</td><td>{entrega.observacoes ?? '—'}</td><td>{entrega.qtd_itens}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
