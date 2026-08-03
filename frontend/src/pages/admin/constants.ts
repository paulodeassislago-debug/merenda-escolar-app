// src/pages/admin/constants.ts — constantes compartilhadas das páginas admin (sem JSX)
// Separado dos componentes para manter o lint react-refresh limpo.

import type { Perfil } from '../../types';

export const TIPOS_REFEICAO = ['Lanche da Manhã', 'Almoço', 'Lanche da Tarde', 'Janta'] as const;

export const UNIDADES_SUGERIDAS = ['KG', 'L', 'Un', 'Pacote', 'Penca', 'Caixa', 'Dúzia', 'Maço'] as const;

// backend: 0=segunda…6=domingo; JS Date.getDay(): 0=domingo — converter com (jsDay + 6) % 7
export const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'] as const;

export const LIMIAR_BAIXO_ESTOQUE = 5.0;

export const PERFIL_ROTULOS: Record<Perfil, string> = {
  admin: 'Admin',
  secretaria: 'Secretaria',
  cozinheira: 'Cozinheira',
};