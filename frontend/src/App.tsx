// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import PainelCozinha from './pages/PainelCozinha';
import DashboardGestao from './pages/DashboardGestao';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/cozinha" element={<PainelCozinha />} />
        <Route path="/gestao" element={<DashboardGestao />} />
      </Routes>
    </Router>
  );
}

export default App;