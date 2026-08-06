// src/pages/admin/Alunos.tsx — configuração de alunos por período (D-14/D-15)
// O admin define os grupos manhã/tarde/noite; a cozinheira não acessa esta página.
// A receita da cozinha escala pelo total de cada slot derivado desta configuração.

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, fetchJson } from '../../api';
import type { AlunosPorPeriodo } from '../../types';
import './Alunos.css';

export default function Alunos() {
  const [manha, setManha] = useState('');
  const [tarde, setTarde] = useState('');
  const [noite, setNoite] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [naoConfigurado, setNaoConfigurado] = useState(false);
  const [atualizadoEm, setAtualizadoEm] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [erroForm, setErroForm] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetchJson<AlunosPorPeriodo>('/alunos-por-periodo')
      .then((dados) => {
        if (cancelado) return;
        setManha(String(dados.manha));
        setTarde(String(dados.tarde));
        setNoite(String(dados.noite));
        setAtualizadoEm(dados.updated_at);
        setNaoConfigurado(false);
      })
      .catch((err: unknown) => {
        if (cancelado) return;
        if (err instanceof ApiError && err.status === 404) {
          setNaoConfigurado(true);
        } else if (err instanceof ApiError && err.status === 401) {
          setErro('Sua sessão expirou. Entre novamente.');
        } else {
          setErro(
            err instanceof ApiError
              ? err.message
              : 'Não foi possível carregar a configuração. Verifique se o backend está rodando.',
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => { cancelado = true; };
  }, []);

  const handleSubmit = async (evento: FormEvent) => {
    evento.preventDefault();
    setErroForm(null);
    setSucesso(null);

    const manhaNum = Number(manha);
    const tardeNum = Number(tarde);
    const noiteNum = Number(noite);
    const quantidadeValida = (valor: number) => Number.isInteger(valor) && valor > 0;
    if (!quantidadeValida(manhaNum) || !quantidadeValida(tardeNum) || !quantidadeValida(noiteNum)) {
      setErroForm('Informe uma quantidade inteira e positiva para cada período.');
      return;
    }

    setSalvando(true);
    try {
      const dados = await fetchJson<AlunosPorPeriodo>('/alunos-por-periodo', {
        method: 'PUT',
        body: JSON.stringify({ manha: manhaNum, tarde: tardeNum, noite: noiteNum }),
      });
      setAtualizadoEm(dados.updated_at);
      setNaoConfigurado(false);
      setSucesso('Configuração salva.');
    } catch (err) {
      setErroForm(
        err instanceof ApiError
          ? err.message
          : 'Falha ao salvar a configuração. Tente novamente.',
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div>
      <div className="pagina-header">
        <h1>Alunos por período</h1>
      </div>

      {carregando && <p className="aviso">Carregando…</p>}

      {!carregando && erro && (
        <p className="aviso aviso-erro" role="alert">{erro}</p>
      )}

      {!carregando && !erro && (
        <div className="card">
          {naoConfigurado && (
            <p className="alunos-aviso-vazio" role="status">
              Configure os alunos por período para ativar a projeção.
            </p>
          )}
          {sucesso && (
            <p className="aviso-sucesso" role="status">{sucesso}</p>
          )}
          <form onSubmit={handleSubmit}>
            <div className="alunos-form-grid">
              <div className="form-group">
                <label htmlFor="alunos-manha">Manhã</label>
                <input
                  id="alunos-manha"
                  type="number"
                  min="1"
                  step="1"
                  value={manha}
                  onChange={(evento) => setManha(evento.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="alunos-tarde">Tarde</label>
                <input
                  id="alunos-tarde"
                  type="number"
                  min="1"
                  step="1"
                  value={tarde}
                  onChange={(evento) => setTarde(evento.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="alunos-noite">Noite</label>
                <input
                  id="alunos-noite"
                  type="number"
                  min="1"
                  step="1"
                  value={noite}
                  onChange={(evento) => setNoite(evento.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>
            <p className="campo-ajuda">A receita escala pelo total do período de cada refeição.</p>
            {atualizadoEm && (
              <p className="campo-ajuda alunos-atualizado">
                Atualizado em{' '}
                {new Date(atualizadoEm).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
            {erroForm && (
              <p className="alerta-erro" role="alert">{erroForm}</p>
            )}
            <div className="alunos-acoes">
              <button type="submit" className="btn-primario" disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar configuração'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
