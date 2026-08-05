// src/pages/CardapioPublico.tsx — cardápio do dia, acesso público (sem login)
// Página cerimonial (.planning/PROJECT.md): logo, nome da escola em serif, sem navegação autenticada.

import { useEffect, useState } from 'react';
import { fetchJson } from '../api';
import { SLOTS_REFEICAO } from './admin/constants';
import type { RefeicaoPublica } from '../types';
import logoNancy from '../assets/Logo Nancy (Logotipo) (1).jpg';
import './CardapioPublico.css';

function formatarDataHoje(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// 08-11: agrupa a resposta (lista, sem deduplicar) pelos quatro slots na ordem
// operacional fixa (D-07-05, D-07-06): slots omitidos pela API viram lista vazia
// → cartão "A definir"; planejada e extra do mesmo slot ficam juntas no cartão.
function entradasPorSlot(resposta: RefeicaoPublica[]): Map<string, RefeicaoPublica[]> {
  const porSlot = new Map<string, RefeicaoPublica[]>();
  for (const slot of SLOTS_REFEICAO) {
    porSlot.set(slot, []);
  }
  // Guarda de formato: payload não-array (ex.: {"detail": ...} com 200) não pode
  // derrubar o render — vira grid completo de slots "A definir" (WR-02).
  if (!Array.isArray(resposta)) {
    return porSlot;
  }
  for (const refeicao of resposta) {
    const lista = porSlot.get(refeicao.slot) ?? porSlot.get(refeicao.tipo_refeicao);
    if (lista) {
      lista.push(refeicao);
    }
  }
  return porSlot;
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

  const aoAlternarIngredientes = (chave: string, aberto: boolean) => {
    setIngredientesAbertos((anterior) => ({ ...anterior, [chave]: aberto }));
  };

  const entradas = entradasPorSlot(refeicoes);

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
              {SLOTS_REFEICAO.map((slot, indice) => {
                const refeicoesDoSlot = entradas.get(slot) ?? [];
                return (
                  <section
                    key={slot}
                    className="publico-card"
                    aria-labelledby={refeicoesDoSlot.length > 0
                      ? `publico-prato-${indice}-0`
                      : `publico-prato-${indice}`}
                  >
                    <p className="publico-tipo">{slot}</p>
                    {refeicoesDoSlot.length === 0 ? (
                      <h2 className="publico-prato" id={`publico-prato-${indice}`}>
                        A definir
                      </h2>
                    ) : (
                      <div className="publico-entradas">
                        {refeicoesDoSlot.map((refeicao, entradaIdx) => {
                          const chave = `${slot}-${entradaIdx}`;
                          return (
                            <div
                              key={chave}
                              className={`publico-entrada ${refeicao.extra ? 'publico-entrada-extra' : ''}`}
                            >
                              <h2
                                className="publico-prato"
                                id={`publico-prato-${indice}-${entradaIdx}`}
                              >
                                {refeicao.nome_refeicao ?? (refeicao.extra ? 'Refeição extraordinária' : 'A definir')}
                              </h2>
                              {refeicao.extra && <span className="publico-tag-extra">EXTRA</span>}
                              {refeicao.ingredientes.length === 0 ? (
                                <p className="publico-sem-receita">Ingredientes não informados.</p>
                              ) : (
                                <details
                                  className="publico-disclosure"
                                  onToggle={(evento) =>
                                    aoAlternarIngredientes(chave, evento.currentTarget.open)
                                  }
                                >
                                  <summary>
                                    {ingredientesAbertos[chave]
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
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
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
