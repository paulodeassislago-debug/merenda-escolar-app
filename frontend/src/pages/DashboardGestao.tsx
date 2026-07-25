// src/pages/DashboardGestao.tsx
import { useState, useEffect } from 'react';
import './DashboardGestao.css';
import type { ItemEstoque } from '../types';

export default function DashboardGestao() {
  const [estoque, setEstoque] = useState<ItemEstoque[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Busca os dados no servidor assim que o painel é aberto
  useEffect(() => {
    const buscarEstoque = async () => {
      try {
        const resposta = await fetch('http://127.0.0.1:8000/estoque');
        if (!resposta.ok) {
          throw new Error('Falha ao carregar o estoque');
        }
        const dados = await resposta.json();
        setEstoque(dados);
      } catch (err) {
        console.error(err);
        setErro('Não foi possível conectar ao servidor. Verifique se o Backend está rodando.');
      } finally {
        setCarregando(false);
      }
    };

    buscarEstoque();
  }, []);

  return (
    <div className="gestao-container">
      <header className="gestao-header">
        <div>
          <h1>📊 Painel Gerencial PNAE</h1>
          <p>Visão Geral do Estoque de Alimentos</p>
        </div>
        <div style={{ color: 'white', fontWeight: 'bold' }}>
          Gestão Escolar
        </div>
      </header>

      {/* Cartão de Resumo */}
      <div className="cartao-metricas">
        <h2 style={{ margin: '0 0 1rem 0', color: '#1f2937' }}>Resumo Rápido</h2>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div>
            <span style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem' }}>Itens Cadastrados</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>{estoque.length}</span>
          </div>
          <div>
            <span style={{ display: 'block', color: '#6b7280', fontSize: '0.875rem' }}>Itens em Alerta (Baixo Estoque)</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>
              {estoque.filter(item => item.saldo_atual < 5).length}
            </span>
          </div>
        </div>
      </div>

      {/* Tabela de Dados */}
      {carregando ? (
        <p style={{ textAlign: 'center', color: '#6b7280' }}>Carregando dados do servidor...</p>
      ) : erro ? (
        <div style={{ backgroundColor: '#fee2e2', padding: '1rem', borderRadius: '0.5rem', color: '#b91c1c', textAlign: 'center' }}>
          {erro}
        </div>
      ) : (
        <div className="tabela-container">
          <table className="tabela-estoque">
            <thead>
              <tr>
                <th>Cód</th>
                <th>Ingrediente</th>
                <th>Unidade</th>
                <th>Saldo Atual</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {estoque.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                    O estoque está vazio. Nenhum ingrediente cadastrado ainda.
                  </td>
                </tr>
              ) : (
                estoque.map((item) => (
                  <tr key={item.id}>
                    <td style={{ color: '#6b7280' }}>#{item.id}</td>
                    <td style={{ fontWeight: 500 }}>{item.nome_ingrediente}</td>
                    <td>{item.unidade_medida_oficial}</td>
                    <td style={{ fontWeight: 'bold' }}>{item.saldo_atual.toFixed(2)}</td>
                    <td>
                      {/* Lógica simples: se o saldo for menor que 5, emite um alerta visual */}
                      {item.saldo_atual < 5 ? (
                        <span className="status-alerta">BAIXO ESTOQUE</span>
                      ) : (
                        <span className="status-ok">ESTÁVEL</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}