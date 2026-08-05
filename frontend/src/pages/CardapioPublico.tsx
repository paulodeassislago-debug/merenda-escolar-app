// src/pages/CardapioPublico.tsx — cardápio do dia, acesso público (sem login)
// Página cerimonial (.planning/PROJECT.md): logo, nome da escola em serif, sem navegação autenticada.

import { useEffect, useState } from 'react';
import { fetchJson } from '../api';
import { SLOTS_REFEICAO } from './admin/constants';
import logoNancy from '../assets/Logo Nancy (Logotipo) (1).jpg';
import './CardapioPublico.css';

// Tipo de transporte: quantidade e medida_caseira existem apenas para desserializar
// a resposta do endpoint; nunca chegam ao JSX (D-07-02, D-07-04).
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

// Normaliza a resposta esparsa para os quatro slots na ordem operacional fixa
// (D-07-05, D-07-06): slots omitidos pela API viram prato nulo com ingredientes vazios.
function normalizarQuatroSlots(resposta: RefeicaoPublica[]): RefeicaoPublica[] {
  // Guarda de formato: payload não-array (ex.: {"detail": ...} com 200) não pode
  // derrubar o render — vira grid completo de slots "A definir" (WR-02).
  if (!Array.isArray(resposta)) {
    return SLOTS_REFEICAO.map((slot) => ({
      tipo_refeicao: slot,
      nome_refeicao: null,
      ingredientes: [],
    }));
  }
  const porTipo = new Map(resposta.map((refeicao) => [refeicao.tipo_refeicao, refeicao]));
  return SLOTS_REFEICAO.map((slot) => {
    const encontrada = porTipo.get(slot);
    return (
      encontrada ?? { tipo_refeicao: slot, nome_refeicao: null, ingredientes: [] }
    );
  });
}

export default function CardapioPublico() {
  const [refeicoes, setRefeicoes] = useState<RefeicaoPublica[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ingredientesAbertos, setIngredientesAbertos] = useState<Record<string, boolean>>({});

  const carregarCardapio = () => {
    setCarregando(true);
    setErro(null);
    setRefeicoes([]);
    // Redefine o espelho do <details> nativo: após erro + retry, os elementos
    // re-montam fechados e o rótulo precisa voltar a "Ver ingredientes" (WR-03).
    setIngredientesAbertos({});
    fetchJson<RefeicaoPublica[]>('/publico/cardapio')
      .then((resposta) => setRefeicoes(Array.isArray(resposta) ? resposta : []))
      .catch(() => setErro('Não foi possível carregar o cardápio de hoje. Tente novamente.'))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarCardapio();
  }, []);

  const aoAlternarIngredientes = (slot: string, aberto: boolean) => {
    setIngredientesAbertos((anterior) => ({ ...anterior, [slot]: aberto }));
  };

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
          <div className="publico-erro" role="alert">
            <p className="publico-erro-texto">{erro}</p>
            <button type="button" className="publico-botao-retry" onClick={carregarCardapio}>
              Tentar novamente
            </button>
          </div>
        )}

        {!carregando && !erro && (
          <>
            {refeicoes.length === 0 && (
              <div className="publico-vazio">
                <h2 className="publico-vazio-titulo">Nenhum cardápio planejado para hoje.</h2>
                <p className="publico-vazio-texto">
                  Os quatro momentos do serviço permanecem visíveis e aparecem como “A definir”
                  quando não há planejamento.
                </p>
              </div>
            )}

            <div className="publico-grid">
              {normalizarQuatroSlots(refeicoes).map((refeicao, indice) => (
              <section
                key={refeicao.tipo_refeicao}
                className="publico-card"
                aria-labelledby={`publico-prato-${indice}`}
              >
                <p className="publico-tipo">{refeicao.tipo_refeicao}</p>
                <h2 className="publico-prato" id={`publico-prato-${indice}`}>
                  {refeicao.nome_refeicao ?? 'A definir'}
                </h2>
                {refeicao.ingredientes.length === 0 ? (
                  <p className="publico-sem-receita">Ingredientes não informados.</p>
                ) : (
                  <details
                    className="publico-disclosure"
                    onToggle={(evento) =>
                      aoAlternarIngredientes(refeicao.tipo_refeicao, evento.currentTarget.open)
                    }
                  >
                    <summary>
                      {ingredientesAbertos[refeicao.tipo_refeicao]
                        ? 'Ocultar ingredientes'
                        : 'Ver ingredientes'}
                    </summary>
                    <ul className="publico-ingredientes">
                      {refeicao.ingredientes.map((ingrediente, idx) => (
                        <li key={idx}>
                          {ingrediente.item_nome ?? 'Ingrediente não informado'}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </section>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="publico-footer">
        Merenda escolar em conformidade com o PNAE
      </footer>
    </div>
  );
}
