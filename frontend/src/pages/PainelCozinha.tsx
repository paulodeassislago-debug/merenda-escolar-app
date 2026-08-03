// src/pages/PainelCozinha.tsx
import { useState } from 'react';
import './PainelCozinha.css';
import type { Ingrediente, PratoPadrao } from '../types';

// Nosso cardápio base predefinido (no futuro virá do banco de dados)
const cardapiosPadrao: Record<string, PratoPadrao> = {
  "Lanche": {
    prato: "Cuscuz Nordestino com Ovos",
    ingredientes: [
      { nome: "Flocão de Milho", qtd: 5, medida: "pacotes" },
      { nome: "Ovos Brancos", qtd: 40, medida: "unidades" },
      { nome: "Sal Refinado", qtd: 2, medida: "colheres de sopa" }
    ]
  },
  "Almoço": {
    prato: "Músculo de Panela com Batatinha",
    ingredientes: [
      { nome: "Arroz Parboilizado", qtd: 9, medida: "pacotes" },
      { nome: "Feijão Carioca", qtd: 5, medida: "pacotes" },
      { nome: "Músculo Bovino", qtd: 10, medida: "kg" },
      { nome: "Batatinha", qtd: 9.6, medida: "kg" },
      { nome: "Sal Refinado", qtd: 10, medida: "colheres de sopa" }
    ]
  },
  "Janta": {
    prato: "Sopa Forte de Músculo e Legumes",
    ingredientes: [
      { nome: "Macarrão Parafuso", qtd: 5, medida: "pacotes" },
      { nome: "Músculo Bovino", qtd: 3, medida: "kg" },
      { nome: "Batatinha", qtd: 4, medida: "kg" }
    ]
  }
};

export default function PainelCozinha() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tipoRefeicao, setTipoRefeicao] = useState('');
  const [pratoAtual, setPratoAtual] = useState('');
  const [alunos, setAlunos] = useState(200);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);

  // Quando escolhe a refeição, carrega o prato e a lista de ingredientes correspondente
  const handleSelecionarRefeicao = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tipo = e.target.value;
    setTipoRefeicao(tipo);
    
    if (cardapiosPadrao[tipo]) {
      setPratoAtual(cardapiosPadrao[tipo].prato);
      // Criamos uma cópia da lista para que a cozinheira possa editar
      setIngredientes([...cardapiosPadrao[tipo].ingredientes]);
      
      // Ajusta uma média de alunos baseada no tipo de refeição
      if (tipo === "Almoço") setAlunos(200);
      else setAlunos(100);
    }
  };

  const atualizarQuantidade = (index: number, novaQtd: string) => {
    const novosIngredientes = [...ingredientes];
    novosIngredientes[index].qtd = Number(novaQtd);
    setIngredientes(novosIngredientes);
  };

  const handleFinalizar = async () => {
    if (!tipoRefeicao) {
      alert("Por favor, selecione qual é a refeição antes de confirmar.");
      return;
    }

    try {
      const pacoteDados = {
        qtd_alunos_atendidos: alunos,
        id_usuario: 1, 
        ingredientes: ingredientes.map(ing => ({
          nome: ing.nome,
          quantidade: ing.qtd,
          medida: ing.medida
        }))
      };

      const resposta = await fetch('http://127.0.0.1:8000/refeicoes/lancar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pacoteDados)
      });

      const resultado = await resposta.json();

      if (resposta.ok && !resultado.erro) {
        alert(`✅ Sucesso: ${resultado.mensagem}`);
        setIsModalOpen(false);
        setTipoRefeicao('');
        setPratoAtual('');
      } else {
        alert("⚠️ Atenção: " + (resultado.erro || "Erro ao processar a refeição"));
      }
    } catch {
      alert("❌ Erro de conexão! O servidor Backend está ligado?");
    }
  };

  return (
    <div className="cozinha-container">
      <header className="cozinha-header">
        <h1>👩‍🍳 Painel da Cozinha</h1>
        <p>Controle Diário de Refeições</p>
      </header>

      {/* PAINEL INICIAL */}
      {!isModalOpen && (
        <main className="dashboard-inicial">
          <h2>Pronta para iniciar os lançamentos de hoje?</h2>
          <button className="btn-novo" onClick={() => setIsModalOpen(true)}>
            + Adicionar Nova Refeição
          </button>
        </main>
      )}

      {/* MODAL DE LANÇAMENTO DE REFEIÇÃO */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>📝 Lançar Refeição</h2>
              <button className="btn-fechar" onClick={() => setIsModalOpen(false)}>✖</button>
            </div>

            <select 
              className="select-refeicao"
              value={tipoRefeicao}
              onChange={handleSelecionarRefeicao}
            >
              <option value="" disabled>-- Selecione o tipo de refeição --</option>
              <option value="Lanche">🍽️ Lanche</option>
              <option value="Almoço">🍽️ Almoço</option>
              <option value="Janta">🍲 Janta</option>
            </select>

            {tipoRefeicao && (
              <>
                {/* CAIXA DO CARDÁPIO ATUAL */}
                <div className="cardapio-info">
                  <div>
                    <h3 className="prato-titulo">Cardápio do Dia: {pratoAtual}</h3>
                    <p className="prato-subtitulo">Planejamento Nutricional Oficial</p>
                  </div>
                  <button 
                    className="btn-mudar" 
                    onClick={() => alert("Em breve: Módulo de alteração de cardápio exigirá preenchimento de justificativa formal.")}
                  >
                    🔄 Mudar cardápio do dia
                  </button>
                </div>

                <div className="secao-alunos">
                  <label>Quantos alunos comeram?</label>
                  <input 
                    type="number" 
                    value={alunos} 
                    onChange={(e) => setAlunos(Number(e.target.value))}
                    className="input-grande"
                  />
                </div>

                <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontWeight: 500 }}>
                  Ajuste as quantidades utilizadas caso tenha sido necessário:
                </p>

                <div className="lista-ingredientes">
                  {ingredientes.map((ing, index) => (
                    <div key={index} className="ingrediente-item">
                      <span className="ingrediente-nome">{ing.nome}</span>
                      <div className="ingrediente-controles">
                        <input 
                          type="number" 
                          value={ing.qtd}
                          onChange={(e) => atualizarQuantidade(index, e.target.value)}
                          className="input-qtd"
                          step="0.1"
                        />
                        <span className="ingrediente-medida">{ing.medida}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={handleFinalizar} className="btn-finalizar">
                  ✅ Confirmar e Dar Baixa
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}