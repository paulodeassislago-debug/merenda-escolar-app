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