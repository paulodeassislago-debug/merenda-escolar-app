// src/pages/admin/nfe.ts — parser NF-e (XML → linhas da tabela editável)
// Arquivo .ts puro (sem JSX) — separado do componente para manter o lint react-refresh limpo.
// D-11: parse no frontend com fast-xml-parser; revisão humana obrigatória antes do submit.
// Armadilhas documentadas em 05-RESEARCH.md: det objeto|array, raiz nfeProc|NFe, uCom ≠ unidade oficial.

import { XMLParser } from 'fast-xml-parser';
import type { Item } from '../../types';

const parser = new XMLParser({ ignoreAttributes: false });

export interface LinhaNfe {
  codigo: string;
  descricao: string;
  quantidade: number;
  unidadeNf: string;
  valorUnitario: number | null;
  /** null = não reconhecido → seleção manual obrigatória */
  itemId: number | null;
}

export interface NfeParseResult {
  linhas: LinhaNfe[];
  numeroNota: string | null;
  emitente: string | null;
  /** Data de emissão da NF (ide.dhEmi, YYYY-MM-DD) — pré-preenche data_entrega (D-09). */
  dataEmissao: string | null;
}

/**
 * Normaliza texto para casamento de descrições (lowercase, trim, sem acentos).
 * Ex.: "Arroz Parboilizado T1" → "arroz parboilizado t1"
 */
export function normalizarTexto(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Parseia um XML de NF-e (texto) e retorna as linhas da nota,
 * casando cada produto com um item do catálogo por descrição normalizada.
 *
 * @param xmlText — conteúdo do arquivo .xml como string
 * @param itens — catálogo de itens do estoque (GET /itens)
 * @throws Error se o XML for malformado ou sem estrutura de NF-e
 */
export function parseNfe(xmlText: string, itens: Item[]): NfeParseResult {
  const doc = parser.parse(xmlText);

  // Raiz tolerante: nfeProc (NF-e autorizada) ou NFe direta
  const nfe = (doc as Record<string, unknown>).nfeProc as Record<string, unknown> | undefined;
  const infNFe =
    (nfe?.NFe as Record<string, unknown> | undefined)?.infNFe ??
    ((doc as Record<string, unknown>).NFe as Record<string, unknown> | undefined)?.infNFe;

  if (!infNFe) {
    throw new Error('XML sem estrutura de NF-e');
  }

  // Armadilha #1: det vem como objeto único (1 item) ou array (N itens) — normalizar
  const rawDet = (infNFe as Record<string, unknown>).det;
  const dets = Array.isArray(rawDet) ? rawDet : [rawDet];

  // Cabeçalho
  const ide = (infNFe as Record<string, unknown>).ide as Record<string, unknown> | undefined;
  const emit = (infNFe as Record<string, unknown>).emit as Record<string, unknown> | undefined;
  const numeroNota = (ide?.nNF as string | undefined) ?? null;
  const emitente = (emit?.xNome as string | undefined) ?? null;

  // Data de emissão (ide.dhEmi, ISO 8601) — primeiro segmento é a data YYYY-MM-DD.
  // D-09: pré-preenche data_entrega; o usuário permanece com o campo editável (confirmável).
  const dhEmi = String(ide?.dhEmi ?? '');
  const fatiaData = dhEmi.slice(0, 10);
  const dataEmissao =
    /^\d{4}-\d{2}-\d{2}$/.test(fatiaData) && !Number.isNaN(new Date(fatiaData).getTime())
      ? fatiaData
      : null;

  const linhas: LinhaNfe[] = [];

  for (const det of dets) {
    if (!det || typeof det !== 'object') continue;
    const prod = (det as Record<string, unknown>).prod as Record<string, unknown> | undefined;
    if (!prod) continue;

    const cProd = String(prod.cProd ?? '');
    const xProd = String(prod.xProd ?? '');
    const qCom = Number(prod.qCom);
    const uCom = String(prod.uCom ?? '');
    const vUnCom = prod.vUnCom != null ? Number(prod.vUnCom) : null;

    // Match de item por descrição normalizada
    const nomeNormalizado = normalizarTexto(xProd);
    const itemEncontrado = itens.find(
      (i) => normalizarTexto(i.nome) === nomeNormalizado,
    );

    linhas.push({
      codigo: cProd,
      descricao: xProd,
      quantidade: isNaN(qCom) ? 0 : qCom,
      unidadeNf: uCom,
      valorUnitario: vUnCom != null && !isNaN(vUnCom) ? vUnCom : null,
      itemId: itemEncontrado ? itemEncontrado.id : null,
    });
  }

  return { linhas, numeroNota, emitente, dataEmissao };
}