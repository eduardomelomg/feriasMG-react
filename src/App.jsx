//Dashboard principal com sidemenu escuro
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  AlertTriangle,
  Users,
  UserCog,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";

import { supabase } from "./lib/supabase"; // Importe o supabase para a função de logout

// Importe as Páginas
import Dashboard from "./pages/Dashboard";
import Solicitacoes from "./pages/Solicitacoes";
import Calendario from "./pages/Calendario";
import Colaboradores from "./pages/Colaboradores";
import Usuarios from "./pages/GestaoUsuarios";
import Configuracoes from "./pages/Configuracoes.jsx";
import Login from "./pages/TelaLogin.jsx";

// Componente da Barra Lateral (Sidebar)
function Sidebar() {
  const location = useLocation();
  const { usuarioLogado } = useAuth();

  const menuItems = [
    { name: "Dashboard", path: "/", icon: <LayoutDashboard size={20} /> },
    { name: "Calendário", path: "/calendario", icon: <Calendar size={20} /> },
    {
      name: "Solicitações",
      path: "/solicitacoes",
      icon: <FileText size={20} />,
    },
    {
      name: "Colaboradores",
      path: "/colaboradores",
      icon: <Users size={20} />,
    },
    {
      name: "Usuários",
      path: "/usuarios",
      icon: <UserCog size={20} />,
      adminOnly: true,
    },
    {
      name: "Configurações",
      path: "/configuracoes",
      icon: <Settings size={20} />,
    },
  ];

  // Filtra o menu com base no perfil do usuário
  const menusPermitidos = menuItems.filter((item) => {
    if (
      usuarioLogado?.perfil === "Admin TI" ||
      usuarioLogado?.perfil === "Gestão DP"
    ) {
      return true;
    }

    if (usuarioLogado?.perfil === "Coordenador") {
      return !item.adminOnly;
    }

    return false;
  });

  // Função para deslogar do Supabase
  const fazerLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="w-64 h-screen bg-[#111111] text-gray-400 flex flex-col border-r border-[#222]">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center text-orange-400 font-bold">
          MG
        </div>
        <div>
          <h1 className="text-white font-semibold text-sm">Mendonça Galvão</h1>
          <p className="text-[10px] text-gray-500 tracking-wider">
            CONTROLO DE FÉRIAS
          </p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {menusPermitidos.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${isActive ? "bg-orange-500/10 text-orange-400 font-medium" : "hover:bg-[#1a1a1a] hover:text-white"}`}
            >
              {item.icon}
              <span className="text-sm">{item.name}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Rodapé dinâmico usando os dados do Contexto */}
      {usuarioLogado && (
        <div className="p-4 border-t border-[#222]">
          <p className="text-[10px] text-gray-600 font-semibold mb-2 px-2 uppercase">
            Perfil Ativo
          </p>
          <div className="bg-[#1a1a1a] p-2 rounded border border-orange-900/30 flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            <span className="text-orange-400 text-xs font-medium uppercase tracking-tighter">
              {usuarioLogado.perfil}
            </span>
          </div>

          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 truncate">
              <div className="w-8 h-8 bg-green-900/40 text-green-500 rounded-full flex items-center justify-center text-sm font-bold border border-green-900 shrink-0">
                {usuarioLogado.iniciais || "MG"}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm text-white truncate font-bold">
                  {usuarioLogado.nome || "Usuário"}
                </p>
                <p className="text-[10px] text-gray-500 truncate">
                  {usuarioLogado.email || "email@empresa.com"}
                </p>
              </div>
            </div>
            {/* O botão LogOut agora funciona */}
            <button
              onClick={fazerLogout}
              className="text-gray-500 hover:text-red-500 transition-colors p-2 hover:bg-red-500/10 rounded-lg shrink-0"
              title="Sair do Sistema"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-componente que decide se mostra o Login ou as Rotas
function EstruturaBase() {
  const { usuarioLogado } = useAuth(); // O seu contexto que monitoriza o utilizador

  // Se o utilizador não existir no contexto, mostra o Ecrã de Login inteiro!
  if (!usuarioLogado) {
    return <Login />;
  }

  // Se existir, mostra o sistema normal
  return (
    <Router>
      <div className="flex h-screen bg-[#0a0a0a] font-sans">
        <Sidebar />

        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/solicitacoes" element={<Solicitacoes />} />
            <Route path="/colaboradores" element={<Colaboradores />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

// O App principal que serve de Contentor
export default function App() {
  return (
    <AuthProvider>
      <EstruturaBase />
    </AuthProvider>
  );
}
