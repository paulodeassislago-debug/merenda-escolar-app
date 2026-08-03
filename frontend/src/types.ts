// src/types.ts

export interface Ingrediente {
  nome: string;
  qtd: number;
  medida: string;
}

export interface PratoPadrao {
  prato: string;
  ingredientes: Ingrediente[];
}


export interface ItemEstoque {
  id: number;
  nome_ingrediente: string;
  unidade_medida_oficial: string;
  saldo_atual: number;
}

// --- Autenticação (espelha os schemas do backend) ---

export type Perfil = 'admin' | 'secretaria' | 'cozinheira';

export interface Usuario {
  id: number;
  nome: string;
  perfil: Perfil;
}

export interface LoginResponse {
  access_token: string;
  perfil: Perfil;
}

// --- Admin (espelha os schemas do backend) ---

export type AcaoEntrega = 'recebido' | 'alterado' | 'excluído';

export interface Item {
  id: number;
  nome: string;
  unidade_oficial: string;
  saldo_atual: number;
  unidade_interna: string;
  fator_conversao: number;
}

export interface Conversao {
  id: number;
  item_id: number;
  medida_caseira: string;
  peso_em_kg: number;
}

export interface CardapioItem {
  id: number;
  nome_refeicao: string;
  tipo_refeicao: string;
}

export interface ReceitaItem {
  id: number;
  cardapio_item_id: number;
  item_id: number;
  item_nome?: string;
  quantidade: number;
  medida_caseira: string;
}

export interface PlanejamentoEntrada {
  id: number;
  dia_semana: number;
  tipo_refeicao: string;
  cardapio_item_id: number;
  nome_refeicao: string;
  data_inicio_vigencia: string;
}

export interface ItemEntrega {
  id: number;
  item_id: number;
  item_nome: string;
  quantidade: number;
  acao: string;
  justificativa: string | null;
}

export interface EntregaResumo {
  id: number;
  data_hora: string;
  id_usuario: number;
  qtd_itens: number;
}

export interface EntregaDetalhe {
  id: number;
  data_hora: string;
  id_usuario: number;
  itens: ItemEntrega[];
}

export interface EntregaItemRequest {
  item_id: number;
  quantidade: number;
  acao: AcaoEntrega;
  justificativa?: string | null;
}

export interface DashboardItemCritico {
  id: number;
  nome: string;
  saldo_atual: number;
  unidade_oficial: string;
  fator_conversao: number;
}

export interface DashboardEstoque {
  total_itens: number;
  baixo_estoque: number;
  itens_criticos: DashboardItemCritico[];
}

export interface DashboardRefeicaoHoje {
  tipo_refeicao: string;
  status: string;
  prato: string | null;
  alunos: number | null;
}

export interface DashboardEntregas {
  ultimos_7_dias: number;
  ultimos_30_dias: number;
  ultima_data: string | null;
}

export interface DashboardAlunosHoje {
  total: number;
  por_tipo: Record<string, number>;
}

export interface DashboardResponse {
  estoque: DashboardEstoque;
  refeicoes_hoje: DashboardRefeicaoHoje[];
  entregas: DashboardEntregas;
  alunos_hoje: DashboardAlunosHoje;
}