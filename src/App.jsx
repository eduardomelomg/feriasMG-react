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

import Dashboard from "./pages/Dashboard";
import Solicitacoes from "./pages/Solicitacoes";
import Calendario from "./pages/Calendario";
import Pendencias from "./pages/pendencias";
import Colaboradores from "./pages/Colaboradores";
import Usuarios from "./pages/GestaoUsuarios";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/configuracoes";

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
    // Colocamos adminOnly nas 3 telas que o Coordenador NÃO pode ver:
    {
      name: "Pendências",
      path: "/pendencias",
      icon: <AlertTriangle size={20} />,
      adminOnly: true,
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
      name: "Relatórios",
      path: "/relatorios",
      icon: <BarChart3 size={20} />,
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
    // Admin TI e Gestão DP veem absolutamente tudo
    if (
      usuarioLogado.perfil === "Admin TI" ||
      usuarioLogado.perfil === "Gestão DP"
    ) {
      return true;
    }

    // Coordenador vê tudo, EXCETO as 3 telas marcadas como adminOnly
    if (usuarioLogado.perfil === "Coordenador") {
      return !item.adminOnly;
    }

    // Qualquer outro perfil não cadastrado não vê a barra lateral
    return false;
  });

  return (
    <div className="w-64 h-screen bg-[#111111] text-gray-400 flex flex-col border-r border-[#222]">
      {/* Logo (mantém igual) */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center text-orange-400 font-bold">
          MG
        </div>
        <div>
          <h1 className="text-white font-semibold text-sm">Mendonça Galvão</h1>
          <p className="text-[10px] text-gray-500 tracking-wider">
            CONTROLE DE FÉRIAS
          </p>
        </div>
      </div>

      {/* Navegação renderizando APENAS os menus permitidos */}
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

      {/* Rodapé dinâmico usando os dados do Contexto! */}
      <div className="p-4 border-t border-[#222]">
        <p className="text-[10px] text-gray-600 font-semibold mb-2 px-2">
          PERFIL ATIVO
        </p>
        <div className="bg-[#1a1a1a] p-2 rounded border border-orange-900/30 flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
          <span className="text-orange-400 text-xs font-medium">
            {usuarioLogado.perfil}
          </span>
        </div>

        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-900/40 text-green-500 rounded-full flex items-center justify-center text-sm font-bold border border-green-900">
              {usuarioLogado.iniciais}
            </div>
            <div className="overflow-hidden w-32">
              <p className="text-sm text-white truncate">
                {usuarioLogado.nome}
              </p>
              <p className="text-[10px] text-gray-500 truncate">
                {usuarioLogado.email}
              </p>
            </div>
          </div>
          <button className="text-gray-500 hover:text-white transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Telas Temporárias para vermos o roteamento funcionarff
const EmConstrucao = ({ titulo }) => (
  <div className="p-8">
    <h1 className="text-2xl text-white font-bold">{titulo}</h1>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="flex h-screen bg-[#0a0a0a] font-sans">
          <Sidebar />

          {/* Área Principal onde o conteúdo das páginas vai renderizar */}
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/calendario" element={<Calendario />} />
              <Route path="/solicitacoes" element={<Solicitacoes />} />
              <Route path="/pendencias" element={<Pendencias />} />
              <Route path="/colaboradores" element={<Colaboradores />} />
              <Route path="/usuarios" element={<Usuarios />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
