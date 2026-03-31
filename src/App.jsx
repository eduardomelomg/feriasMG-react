import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Importe o novo componente Sidebar do arquivo separado
import Sidebar from "./components/Sidebar.jsx";

// Importe as Páginas
import Dashboard from "./pages/Dashboard";
import Solicitacoes from "./pages/Solicitacoes";
import Calendario from "./pages/Calendario";
import Colaboradores from "./pages/Colaboradores";
import Usuarios from "./pages/GestaoUsuarios";
import Configuracoes from "./pages/Configuracoes.jsx";
import Login from "./pages/TelaLogin.jsx";

/**
 * Sub-componente que decide se mostra o Login ou a Estrutura do Sistema
 */
function EstruturaBase() {
  const { usuarioLogado, carregando } = useAuth();

  // Enquanto o Supabase verifica se o usuário está logado,
  // evitamos mostrar a tela de login ou o dashboard vazio.
  if (carregando) {
    return (
      <div className="h-screen w-full bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500"></div>
      </div>
    );
  }

  // Se o utilizador NÃO existir no contexto, mostra apenas o Ecrã de Login
  if (!usuarioLogado) {
    return <Login />;
  }

  // Se existir, mostra o sistema com o Sidebar e as Rotas
  return (
    <Router>
      <div className="flex h-screen bg-[#0a0a0a] font-sans overflow-hidden">
        {/* O Sidebar separado que você criou */}
        <Sidebar />

        {/* Área Principal de Conteúdo */}
        <main className="flex-1 overflow-y-auto relative">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/solicitacoes" element={<Solicitacoes />} />
            <Route path="/colaboradores" element={<Colaboradores />} />

            {/* Rota de Gestão de Usuários (Proteção extra via Rota) */}
            <Route
              path="/usuarios"
              element={
                usuarioLogado.perfil === "Admin TI" ||
                usuarioLogado.perfil === "Administrador (TI)" || // <-- AQUI ESTAVA O ERRO!
                usuarioLogado.perfil === "Gestão DP" ? (
                  <Usuarios />
                ) : (
                  <Navigate to="/" />
                )
              }
            />

            <Route path="/configuracoes" element={<Configuracoes />} />

            {/* Redireciona qualquer rota inexistente para o Início */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

/**
 * Componente Principal (Entry Point)
 */
export default function App() {
  return (
    <AuthProvider>
      <EstruturaBase />
    </AuthProvider>
  );
}
