// src/pages/admin/Dashboard.tsx — dashboard admin com dados reais (F6)

import { useEffect, useState } from 'react';
import { ApiError, fetchJson } from '../../api';
import type { DashboardResponse } from '../../types';
import './Dashboard.css';

export default function Dashboard() {
  const [dados, setDados] = useState<DashboardResponse | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregarDashboard = () => {
    setCarregando(true);
    setErro(null);
    fetchJson<DashboardResponse>('/admin/dashboard')
      .then((res) => setDados(res))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          setErro('Sua sessão expirou. Entre novamente.');
        } else {
          setErro(
            err instanceof ApiError
              ? err.message
              : 'Não foi possível carregar o dashboard.',
          );
        }
      })
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarDashboard();
  }, []);

  return (
    <div>
      <div className="pagina-header">
        <h1>Dashboard</h1>
        <p className="pagina-subtitulo">Visão geral da merenda escolar</p>
      </div>

      {carregando && <p className="aviso">Carregando…</p>}

      {erro && (
        <div className="aviso aviso-erro" role="alert">
          <p>{erro}</p>
          <button type="button" className="btn-secundario" onClick={carregarDashboard}>
            Tentar novamente
          </button>
        </div>
      )}

      {!carregando && !erro && dados && (
        <>
          {/* Metric cards */}
          <div className="dashboard-grid">
            <div className="dashboard-card">
              <p className="dashboard-card-titulo">Itens no estoque</p>
              <p className="dashboard-card-valor">
                {dados.estoque.total_itens}
              </p>
            </div>
            <div className="dashboard-card">
              <p className="dashboard-card-titulo">Itens em baixo estoque</p>
              <p
                className={`dashboard-card-valor ${
                  dados.estoque.baixo_estoque > 0
                    ? 'dashboard-card-alerta'
                    : ''
                }`}
              >
                {dados.estoque.baixo_estoque}
              </p>
            </div>
            <div className="dashboard-card">
              <p className="dashboard-card-titulo">
                Entregas nos últimos 7 dias
              </p>
              <p className="dashboard-card-valor">
                {dados.entregas.ultimos_7_dias}
              </p>
            </div>
            <div className="dashboard-card">
              <p className="dashboard-card-titulo">Alunos hoje</p>
              <p className="dashboard-card-valor">
                {dados.alunos_hoje.total}
              </p>
            </div>
          </div>

          {/* Refeições de hoje (obs #7: contrato por slot — 4 slots) */}
          <section className="dashboard-secao">
            <h2>Refeições de hoje</h2>
            {dados.refeicoes_hoje.map((ref) => (
              <div key={ref.slot} className="refeicao-linha">
                <span className="refeicao-tipo">{ref.slot}</span>
                {ref.prato ? (
                  <span>{ref.prato}</span>
                ) : (
                  <span className="refeicao-prato-null">
                    Prato não definido
                  </span>
                )}
                {ref.status === 'confirmado' ? (
                  <span className="badge badge-confirmado">Confirmado</span>
                ) : (
                  <span className="badge badge-pendente">Pendente</span>
                )}
                {ref.extra && (
                  <span className="badge badge-extra">EXTRA</span>
                )}
                {ref.alunos !== null && <span>{ref.alunos} alunos</span>}
              </div>
            ))}
          </section>

          {/* Itens críticos */}
          <section className="dashboard-secao">
            <h2>Itens críticos</h2>
            {dados.estoque.itens_criticos.length === 0 ? (
              <p className="vazio">Nenhum item em baixo estoque.</p>
            ) : (
              <ul className="dashboard-lista">
                {dados.estoque.itens_criticos.map((item) => (
                  <li key={item.id}>
                    <span className="dashboard-lista-nome">{item.nome}</span>
                    <span className="dashboard-lista-saldo">
                      {item.saldo_atual.toFixed(2)} {item.unidade_oficial}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Entregas */}
          <section className="dashboard-secao">
            <h2>Entregas</h2>
            <div className="dashboard-entregas-grid">
              <div className="dashboard-entregas-item">
                <span className="dashboard-entregas-valor">
                  {dados.entregas.ultimos_7_dias}
                </span>
                <span className="dashboard-entregas-rotulo">
                  últimos 7 dias
                </span>
              </div>
              <div className="dashboard-entregas-item">
                <span className="dashboard-entregas-valor">
                  {dados.entregas.ultimos_30_dias}
                </span>
                <span className="dashboard-entregas-rotulo">
                  últimos 30 dias
                </span>
              </div>
            </div>
            {dados.entregas.ultima_data ? (
              <p className="dashboard-entregas-ultima">
                Última entrega: {dados.entregas.ultima_data}
              </p>
            ) : (
              <p className="dashboard-entregas-ultima">
                Nenhuma entrega registrada ainda.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}