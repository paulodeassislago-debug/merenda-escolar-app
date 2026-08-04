// src/pages/CardapioPublico.tsx — cardápio do dia, acesso público (sem login)
// Página cerimonial (.planning/PROJECT.md): logo, nome da escola em serif, sem navegação autenticada.

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../api';
import logoNancy from '../assets/Logo Nancy (Logotipo) (1).jpg';
import './CardapioPublico.css';

interface IngredientePublico {
  item_nome: string | null;
  quantidade: number;
  medida_caseira: string;
}

interface RefeicaoPublica {
  tipo_refeicao: string;
  nome_refeicao: string | null;
  ingredientes: IngredientePublico[];
}

function formatarDataHoje(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function CardapioPublico() {
  const [refeicoes, setRefeicoes] = useState<RefeicaoPublica[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/publico/cardapio`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<RefeicaoPublica[]>;
      })
      .then(setRefeicoes)
      .catch(() => setErro('Não foi possível carregar o cardápio de hoje.'))
      .finally(() => setCarregando(false));
  }, []);

  return (
    <div className="publico-container">
      <header className="publico-header">
        <img
          src={logoNancy}
          alt="Brasão do Colégio Estadual do Campo Nancy de Castro Esteves"
          className="publico-logo"
        />
        <h1>Colégio Estadual do Campo Nancy de Castro Esteves</h1>
        <p className="publico-data">Cardápio de {formatarDataHoje()}</p>
      </header>

      <main className="publico-conteudo">
        {carregando && <p className="publico-aviso">Carregando cardápio…</p>}

        {erro && (
          <p className="publico-aviso publico-erro" role="alert">
            {erro}
          </p>
        )}

        {!carregando && !erro && refeicoes.length === 0 && (
          <p className="publico-aviso">Nenhum cardápio planejado para hoje.</p>
        )}

        {!carregando && !erro && refeicoes.length > 0 && (
          <div className="publico-grid">
            {refeicoes.map((refeicao) => (
              <section key={refeicao.tipo_refeicao} className="publico-card">
                <h2 className="publico-tipo">{refeicao.tipo_refeicao}</h2>
                <p className="publico-prato">{refeicao.nome_refeicao ?? 'A definir'}</p>
                {refeicao.ingredientes.length > 0 && (
                  <ul className="publico-ingredientes">
                    {refeicao.ingredientes.map((ing, idx) => (
                      <li key={idx}>
                        {ing.item_nome ?? 'Item'} — {ing.quantidade} {ing.medida_caseira}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </main>

      <footer className="publico-footer">
        Merenda escolar em conformidade com o PNAE
      </footer>
    </div>
  );
}
