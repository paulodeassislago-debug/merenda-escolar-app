// src/App.tsx — rotas com autenticação real (Fase 4)
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import PainelCozinha from './pages/PainelCozinha';
import DashboardGestao from './pages/DashboardGestao';
import CardapioPublico from './pages/CardapioPublico';
import Dashboard from './pages/admin/Dashboard';
import Usuarios from './pages/admin/Usuarios';
import Itens from './pages/admin/Itens';
import Cardapio from './pages/admin/Cardapio';
import Receitas from './pages/admin/Receitas';
import Planejamento from './pages/admin/Planejamento';
import Entregas from './pages/admin/Entregas';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Públicas */}
          <Route path="/" element={<Login />} />
          <Route path="/cardapio" element={<CardapioPublico />} />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute perfis={['admin']}>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/usuarios"
            element={
              <ProtectedRoute perfis={['admin']}>
                <Layout>
                  <Usuarios />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/itens"
            element={
              <ProtectedRoute perfis={['admin']}>
                <Layout>
                  <Itens />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/cardapio"
            element={
              <ProtectedRoute perfis={['admin']}>
                <Layout>
                  <Cardapio />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/receitas/:id"
            element={
              <ProtectedRoute perfis={['admin']}>
                <Layout>
                  <Receitas />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/planejamento"
            element={
              <ProtectedRoute perfis={['admin', 'secretaria']}>
                <Layout>
                  <Planejamento />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/entregas"
            element={
              <ProtectedRoute perfis={['admin', 'secretaria']}>
                <Layout>
                  <Entregas />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Cozinheira */}
          <Route
            path="/cozinha"
            element={
              <ProtectedRoute perfis={['cozinheira']}>
                <Layout>
                  <PainelCozinha />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Secretaria */}
          <Route
            path="/gestao"
            element={
              <ProtectedRoute perfis={['secretaria']}>
                <Layout>
                  <DashboardGestao />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
