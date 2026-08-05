"""Migração idempotente do schema para o banco SQLite legado.

A Fase 8 adiciona colunas em tabelas existentes (`itens`, `entregas`) e novas
tabelas (`fornecedores`, `alunos_por_periodo`). As tabelas novas já nascem pelo
`models.Base.metadata.create_all`; este módulo cuida apenas das colunas ausentes
em tabelas existentes, usando `sqlalchemy.inspect` para detectar o que falta
(sem Alembic — decisão de projeto).

Segurança (T-08-01): somente literais fixos do código em SQL — nenhuma string
de usuário entra nas instruções.
"""

from sqlalchemy import inspect, text

# Colunas novas por tabela: (coluna, DDL de adição de coluna com literal fixo)
_ALTERACOES_ITENS = [
    ("limiar", "ALTER TABLE itens ADD COLUMN limiar FLOAT NOT NULL DEFAULT 5.0"),
]

_ALTERACOES_ENTREGAS = [
    ("origem", "ALTER TABLE entregas ADD COLUMN origem VARCHAR NOT NULL DEFAULT 'manual'"),
    ("data_entrega", "ALTER TABLE entregas ADD COLUMN data_entrega DATE"),
    ("fornecedor_id", "ALTER TABLE entregas ADD COLUMN fornecedor_id INTEGER"),
    ("nota_numero", "ALTER TABLE entregas ADD COLUMN nota_numero VARCHAR"),
    ("observacoes", "ALTER TABLE entregas ADD COLUMN observacoes TEXT"),
]

_ALTERACOES_REFEICOES = [
    # obs #7: slot de lançamento — nullable para backfill de legado; lançamentos
    # novos sempre preenchem (main.py grava dados.slot).
    ("slot", "ALTER TABLE refeicoes ADD COLUMN slot VARCHAR"),
]


def _colunas(engine, tabela: str) -> set[str]:
    if not inspect(engine).has_table(tabela):
        return set()
    return {c["name"] for c in inspect(engine).get_columns(tabela)}


def migrar(engine) -> None:
    """Aplica adição de coluna somente nas ausentes e faz o backfill de
    `data_entrega` para entregas legadas (D-10). Idempotente: a 2ª execução
    não altera nada."""
    with engine.begin() as conn:
        # Itens: limiar com default 5.0 (D-01)
        colunas_itens = _colunas(engine, "itens")
        for coluna, ddl in _ALTERACOES_ITENS:
            if coluna not in colunas_itens:
                conn.execute(text(ddl))

        # Entregas: origem/data_entrega/fornecedor_id/nota_numero/observacoes (D-05)
        colunas_entregas = _colunas(engine, "entregas")
        for coluna, ddl in _ALTERACOES_ENTREGAS:
            if coluna not in colunas_entregas:
                conn.execute(text(ddl))

        # Refeições: slot de lançamento (obs #7)
        colunas_refeicoes = _colunas(engine, "refeicoes")
        for coluna, ddl in _ALTERACOES_REFEICOES:
            if coluna not in colunas_refeicoes:
                conn.execute(text(ddl))

        # Backfill idempotente do slot a partir do planejamento vinculado (obs #7):
        # refeições legadas com planejamento_id herdam o tipo_refeicao planejado
        # (que é o slot na Fase 8); avulsas legadas (planejamento_id NULL) seguem
        # com slot NULL — sem como derivar o lanche.
        if "slot" in _colunas(engine, "refeicoes"):
            conn.execute(
                text(
                    "UPDATE refeicoes SET slot = ("
                    "  SELECT tipo_refeicao FROM planejamento "
                    "  WHERE planejamento.id = refeicoes.planejamento_id"
                    ") WHERE slot IS NULL AND planejamento_id IS NOT NULL"
                )
            )

        # Backfill: entregas legadas recebem data_entrega = data(data_hora) (D-10)
        if "data_entrega" in _colunas(engine, "entregas"):
            conn.execute(
                text(
                    "UPDATE entregas SET data_entrega = date(data_hora) "
                    "WHERE data_entrega IS NULL"
                )
            )
