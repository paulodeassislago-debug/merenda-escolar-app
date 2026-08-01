// src/pages/admin/Receitas.tsx — scaffolding (substituído pelo plano 05-04)

import { useParams } from 'react-router-dom';

export default function Receitas() {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <h1>Receitas — Prato #{id}</h1>
    </div>
  );
}