// src/pages/admin/matching.ts — motor determinístico de correspondência de nomes
// Arquivo .ts puro (sem JSX) — separado do componente para manter o lint react-refresh limpo.
// D-21: normalização local determinística (caixa, acentos, pontuação, espaços, tokens)
//       + dicionário curto de abreviações + score explicável ("3 de 4 palavras batem").
// D-22: sugestões assistivas e confirmáveis — este módulo NUNCA vincula, seleciona ou
//       funde; a associação é sempre decisão explícita da UI/usuário.
// D-24: persistência de aliases adiada — módulo sem efeitos de rede nem armazenamento local.

import type { Fornecedor } from '../../types';

/**
 * Normaliza texto para casamento de nomes — extensão determinística de `normalizarTexto`
 * (nfe.ts): lowercase + trim, remoção de acentos (NFD), pontuação não alfanumérica → espaço
 * e colapso de espaços repetidos.
 * Ex.: "  MÚSCULO  BOVINO, T1!!  " → "musculo bovino t1"
 */
export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Divide o texto normalizado em tokens (palavras), sem entradas vazias.
 * Ex.: "musculo bovino t1" → ["musculo", "bovino", "t1"]
 */
export function tokenizar(s: string): string[] {
  return normalizar(s).split(' ').filter(Boolean);
}

/**
 * Dicionário curto de abreviações de merenda escolar e fornecedores (D-21).
 * Chaves e valores já normalizados (formato `normalizado: expandido`); a expansão é
 * livre e pode crescer sem mudar o contrato.
 */
export const ABREVIACOES: Record<string, string> = {
  // Carnes e cortes
  musc: 'musculo',
  musculos: 'musculo',
  bov: 'bovino',
  bovina: 'bovino',
  bovinos: 'bovino',
  suino: 'suino',
  suina: 'suina',
  suinos: 'suino',
  frango: 'frango',
  // Estado de conservação
  cong: 'congelado',
  congelada: 'congelado',
  congelados: 'congelado',
  resf: 'resfriado',
  // Unidades e embalagens
  kg: 'kg',
  g: 'g',
  l: 'l',
  ml: 'ml',
  cx: 'caixa',
  pct: 'pacote',
  pac: 'pacote',
  un: 'unidade',
  dz: 'duzia',
  pc: 'peca',
  // Pessoas jurídicas (fornecedores)
  ltda: 'limitada',
  distr: 'distribuidora',
  com: 'comercio',
  ind: 'industria',
};

/**
 * Mapeia cada token via ABREVIACOES quando existir; retorna o token original caso contrário.
 * Ex.: ["musc", "bov", "t1"] → ["musculo", "bovino", "t1"]
 */
export function expandirTokens(tokens: string[]): string[] {
  return tokens.map((t) => ABREVIACOES[t] ?? t);
}

export interface ScoreSimilaridade {
  score: number;
  motivo: string;
}

/**
 * Score explicável de similaridade entre dois nomes (D-21, R-6):
 * tokeniza ambos, expande abreviações e calcula (tokens comuns) / (maior lado).
 * Determinístico: mesma entrada → mesmo score. Score 0 se qualquer lado vazio.
 */
export function similaridade(a: string, b: string): ScoreSimilaridade {
  const tokensA = expandirTokens(tokenizar(a));
  const tokensB = expandirTokens(tokenizar(b));

  if (tokensA.length === 0 || tokensB.length === 0) {
    return { score: 0, motivo: 'Nenhuma palavra coincide' };
  }

  const comuns = tokensA.filter((t) => tokensB.includes(t)).length;
  const maior = Math.max(tokensA.length, tokensB.length);
  const score = comuns / maior;

  let motivo: string;
  if (comuns === maior) {
    motivo = `Todas as ${maior} palavras batem`;
  } else if (comuns > 0) {
    motivo = `${comuns} de ${maior} palavras batem`;
  } else {
    motivo = 'Nenhuma palavra coincide';
  }

  return { score, motivo };
}

export interface SugestaoCandidato<T extends { id: number; nome: string }> {
  candidato: T;
  confianca: number;
  motivo: string;
}

/** Sugestão especializada para fornecedores (consumida pela 08-05). */
export type SugestaoFornecedor = SugestaoCandidato<Fornecedor>;

/**
 * Sugestões assistivas de candidatos para um texto (D-22): calcula `similaridade` para
 * cada candidato, mantém apenas score > 0, ordena por confiança decrescente (desempate
 * por nome asc) e corta no limite. Retorna apenas candidatos — nunca vincula, seleciona
 * ou funde nada: a associação fica sempre com a UI/usuário.
 */
export function sugerirCandidatos<T extends { id: number; nome: string }>(
  texto: string,
  candidatos: T[],
  limite = 3,
): SugestaoCandidato<T>[] {
  return candidatos
    .map((candidato) => {
      const { score, motivo } = similaridade(texto, candidato.nome);
      return { candidato, confianca: Math.round(score * 100) / 100, motivo };
    })
    .filter((s) => s.confianca > 0)
    .sort(
      (x, y) =>
        y.confianca - x.confianca || x.candidato.nome.localeCompare(y.candidato.nome),
    )
    .slice(0, limite);
}
