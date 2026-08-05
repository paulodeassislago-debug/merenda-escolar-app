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
  limiar: number;
}

export interface AlunosPorPeriodo {
  manha: number;
  tarde: number;
  noite: number;
  updated_at: string | null;
  updated_by: number | null;
}

export interface Fornecedor {
  id: number;
  nome: string;
  cnpj: string | null;
}

export type OrigemEntrega = 'xml' | 'manual';

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

// --- Projeção cumulativa da semana (D-17: contrato de GET /planejamento/projecao) ---

export interface ProjecaoRuptura {
  item_id: number;
  nome: string;
  faltando: number;
  unidade_oficial: string;
}

export interface ProjecaoSlot {
  slot: string;
  rupturas: ProjecaoRuptura[];
}

export interface ProjecaoDia {
  dia: string;
  dia_semana: number;
  slots: ProjecaoSlot[];
}

export interface ProjecaoItem {
  item_id: number;
  nome: string;
  unidade_oficial: string;
  saldo_atual: number;
  consumo_semana: number | null;
  saldo_projetado: number | null;
  primeiro_dia_ruptura: number | null;
  avaliavel: boolean;
}

export interface ProjecaoSemana {
  configurado: boolean;
  data_ref: string;
  dias: ProjecaoDia[];
  itens: ProjecaoItem[];
  resumo: { itens_com_ruptura: number; itens_nao_avaliaveis: number };
}

// Avisos aditivos do POST /planejamento (D-18 — nunca bloqueiam; unidade vem da projeção)
export interface PlanejamentoAviso {
  item_id: number;
  nome: string;
  faltando: number;
}

export interface ItemEntrega {
  id: number;
  item_id: number;
  item_nome: string;
  quantidade: number;
  unidade?: string | null;
  fator_conversao?: number | null;
  acao: string;
  justificativa: string | null;
}

export interface EntregaResumo {
  id: number;
  data_hora: string;
  id_usuario: number;
  id_usuario_nome: string | null;
  origem: OrigemEntrega;
  data_entrega: string;
  fornecedor_nome: string | null;
  observacoes: string | null;
  qtd_itens: number;
}

export interface EntregaDetalhe {
  id: number;
  data_hora: string;
  id_usuario: number;
  id_usuario_nome: string | null;
  origem: OrigemEntrega;
  data_entrega: string;
  fornecedor_id: number | null;
  fornecedor_nome: string | null;
  nota_numero: string | null;
  observacoes: string | null;
  itens: ItemEntrega[];
}

export interface EntregaItemRequest {
  item_id: number;
  quantidade: number;
  acao: AcaoEntrega;
  unidade?: string;
  fator_conversao?: number;
  justificativa?: string | null;
}

export interface EntregaCreatePayload {
  origem: OrigemEntrega;
  data_entrega: string;
  fornecedor_id: number;
  nota_numero?: string | null;
  observacoes?: string | null;
  itens: EntregaItemRequest[];
}

export interface DashboardItemCritico {
  id: number;
  nome: string;
  saldo_atual: number;
  unidade_oficial: string;
  fator_conversao: number;
  limiar: number;
}

export interface DashboardEstoque {
  total_itens: number;
  baixo_estoque: number;
  itens_criticos: DashboardItemCritico[];
}

export interface DashboardRefeicaoHoje {
  // obs #7: /admin/dashboard refeicoes_hoje segue o contrato por slot
  slot: string;
  status: string;
  extra: boolean;
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

export interface RefeicaoItemHistorico {
  item_id: number;
  item_nome: string | null;
  quantidade_original: number;
  quantidade_ajustada: number;
  medida_caseira: string;
  justificativa: string | null;
}

export interface RefeicaoHistorico {
  id: number;
  data_hora: string;
  tipo_refeicao: string;
  // obs #7: slot de lançamento persistido + flag de refeição avulsa
  slot: string | null;
  extra: boolean;
  // 08-11: nome exibido (nome_extra em avulsas; prato do planejamento em
  // planejadas) e o nome extra persistido (null em planejadas/legado)
  nome_refeicao: string | null;
  nome_extra: string | null;
  qtd_alunos: number;
  id_usuario: number;
  planejamento_id: number | null;
  itens: RefeicaoItemHistorico[];
}

// obs #7: contrato de GET /refeicoes/hoje — status por slot (4 slots)
export interface StatusSlotRefeicao {
  slot: string;
  status: 'confirmado' | 'pendente';
  extra: boolean;
  prato: string | null;
  alunos: number | null;
}

// 08-11: entrada do cardápio público (GET /publico/cardapio) — lista, sem
// deduplicar por slot: planejadas e extras do mesmo slot coexistem.
export interface IngredientePublico {
  item_nome: string | null;
  quantidade: number;
  medida_caseira: string;
}

export interface RefeicaoPublica {
  tipo_refeicao: string;
  nome_refeicao: string | null;
  slot: string;
  extra: boolean;
  ingredientes: IngredientePublico[];
}

// --- Lançamento de refeição (D-16b/R-5: payload por slot, sem tipo/qtd do cliente) ---

export interface RefeicaoItemRequest {
  item_id: number;
  quantidade: number;
  medida_caseira: string;
  justificativa?: string | null;
}

export interface RefeicaoCreatePayload {
  slot: string;
  planejamento_id?: number | null;
  // 08-11: nome da refeição extraordinária (obrigatório em avulsas)
  nome_extra?: string | null;
  itens: RefeicaoItemRequest[];
}
