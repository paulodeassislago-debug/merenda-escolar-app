import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, fetchJson } from '../api';
import type { Item } from '../types';
import { LIMIAR_BAIXO_ESTOQUE } from './admin/constants';
import './DashboardGestao.css';

function dataLocalHoje(): string {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
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

export default function DashboardGestao() {
  const [dataReferencia, setDataReferencia] = useState(dataLocalHoje);
  const [itens, setItens] = useState<Item[]>([]);
  const [carregandoEstoque, setCarregandoEstoque] = useState(true);
  const [erroEstoque, setErroEstoque] = useState<string | null>(null);

  const carregarEstoque = useCallback(async () => {
    setCarregandoEstoque(true);
    setErroEstoque(null);

    try {
      const resposta = await fetchJson<Item[]>('/itens');
      setItens(resposta);
    } catch (error) {
      setErroEstoque(mensagemErro(error));
    } finally {
      setCarregandoEstoque(false);
    }
  }, []);

  useEffect(() => {
    let cancelada = false;

    void fetchJson<Item[]>('/itens')
      .then((resposta) => {
        if (!cancelada) {
          setItens(resposta);
          setCarregandoEstoque(false);
        }
      })
      .catch((error: unknown) => {
        if (!cancelada) {
          setErroEstoque(mensagemErro(error));
          setCarregandoEstoque(false);
        }
      });

    return () => {
      cancelada = true;
    };
  }, []);

  const itensBaixoEstoque = itens.filter(
    (item) => saldoExibicao(item) < LIMIAR_BAIXO_ESTOQUE,
  );

  return (
    <div className="gestao-page">
      <header className="gestao-header">
        <div>
          <p className="gestao-kicker">Secretaria</p>
          <h1>Gestão da merenda</h1>
          <p className="gestao-subtitulo">
            Acompanhe o estoque e os registros operacionais da escola.
          </p>
        </div>
        <div className="gestao-acoes-header">
          <label htmlFor="gestao-data">Data de referência</label>
          <input
            id="gestao-data"
            type="date"
            value={dataReferencia}
            onChange={(event) => setDataReferencia(event.target.value)}
          />
          <button
            type="button"
            className="gestao-botao gestao-botao-secundario"
            onClick={() => void carregarEstoque()}
            disabled={carregandoEstoque}
          >
            {carregandoEstoque ? 'Atualizando…' : 'Atualizar dados'}
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
            <Link className="gestao-botao gestao-botao-primario" to="/admin/planejamento">
              Abrir planejamento
            </Link>
            <Link className="gestao-botao gestao-botao-secundario" to="/admin/entregas">
              Ver entregas
            </Link>
          </nav>
        </div>
        <div className="gestao-metricas">
          <article className="gestao-metrica">
            <span>Itens cadastrados</span>
            <strong>{itens.length}</strong>
          </article>
          <article className="gestao-metrica gestao-metrica-alerta">
            <span>Itens em baixo estoque</span>
            <strong>{itensBaixoEstoque.length}</strong>
          </article>
          <article className="gestao-metrica">
            <span>Refeições na data</span>
            <strong aria-label="Dados ainda não carregados">—</strong>
          </article>
          <article className="gestao-metrica">
            <span>Entregas na data</span>
            <strong aria-label="Dados ainda não carregados">—</strong>
          </article>
        </div>
      </section>

      <section className="gestao-secao" aria-labelledby="gestao-estoque-titulo">
        <div className="gestao-section-heading">
          <div>
            <p className="gestao-kicker">Saldo atual</p>
            <h2 id="gestao-estoque-titulo">Estoque</h2>
          </div>
          <p className="gestao-ajuda">
            O alerta considera o limiar de {LIMIAR_BAIXO_ESTOQUE} unidades na unidade de exibição.
          </p>
        </div>

        {carregandoEstoque && (
          <p className="gestao-status" role="status" aria-live="polite">
            Carregando dados…
          </p>
        )}

        {!carregandoEstoque && erroEstoque && (
          <div className="gestao-estado gestao-estado-erro" role="alert">
            <p>{erroEstoque}</p>
            <button
              type="button"
              className="gestao-botao gestao-botao-secundario"
              onClick={() => void carregarEstoque()}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!carregandoEstoque && !erroEstoque && itens.length === 0 && (
          <div className="gestao-estado">
            <h3>Nenhum item cadastrado</h3>
            <p>O estoque não possui itens para exibir nesta visão.</p>
          </div>
        )}

        {!carregandoEstoque && !erroEstoque && itens.length > 0 && (
          <div className="gestao-tabela-container">
            <table className="gestao-tabela">
              <caption className="gestao-visualmente-oculto">Saldo atual dos itens de estoque</caption>
              <thead>
                <tr>
                  <th scope="col">Código</th>
                  <th scope="col">Item</th>
                  <th scope="col">Unidade</th>
                  <th scope="col">Saldo</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => {
                  const saldo = saldoExibicao(item);
                  const baixoEstoque = saldo < LIMIAR_BAIXO_ESTOQUE;

                  return (
                    <tr key={item.id}>
                      <td>#{item.id}</td>
                      <td className="gestao-texto-longo">{item.nome}</td>
                      <td>{item.unidade_oficial}</td>
                      <td>{saldo.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                      <td>
                        <span className={baixoEstoque ? 'gestao-status-badge gestao-status-badge-alerta' : 'gestao-status-badge'}>
                          {baixoEstoque ? 'Baixo estoque' : 'Estável'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
