import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext"; // Verifique se o caminho está correto
import { 
  LayoutDashboard, 
  Calendar, 
  FileText, 
  Users, 
  UserCog, 
  Settings, 
  LogOut 
} from "lucide-react";
import { supabase } from "../lib/supabase"; // Verifique se o caminho está correto

export default function Sidebar() {
  const location = useLocation();
  const { usuarioLogado } = useAuth();

  const menuItems = [
    { name: "Dashboard", path: "/", icon: <LayoutDashboard size={20} /> },
    { name: "Calendário", path: "/calendario", icon: <Calendar size={20} /> },
    { name: "Solicitações", path: "/solicitacoes", icon: <FileText size={20} /> },
    { name: "Colaboradores", path: "/colaboradores", icon: <Users size={20} /> },
    { name: "Usuários", path: "/usuarios", icon: <UserCog size={20} />, adminOnly: true },
    { name: "Configurações", path: "/configuracoes", icon: <Settings size={20} /> },
  ];

  // Filtra o menu com base no perfil (Já com a correção do nome!)
  const menusPermitidos = menuItems.filter((item) => {
    const p = usuarioLogado?.perfil;
    if (p === "Admin TI" || p === "ADMINISTRADOR (TI)" || p === "Gestão DP") return true;
    if (p === "Coordenador") return !item.adminOnly;
    return false;
  });

  const fazerLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="w-64 h-screen bg-[#111111] text-gray-400 flex flex-col border-r border-[#222]">
      {/* ... (Todo o restante do JSX que estava no App.jsx, do logo ao rodapé) ... */}
      <div className="p-6 flex items-center gap-3">
         <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center text-orange-400 font-bold">MG</div>
         <div>
            <h1 className="text-white font-semibold text-sm">Mendonça Galvão</h1>
            <p className="text-[10px] text-gray-500 tracking-wider">GESTÃO DE FÉRIAS</p>
         </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {menusPermitidos.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.name} to={item.path} className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${isActive ? "bg-orange-500/10 text-orange-400 font-medium" : "hover:bg-[#1a1a1a] hover:text-white"}`}>
              {item.icon}
              <span className="text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {usuarioLogado && (
        <div className="p-4 border-t border-[#222]">
          {/* ... Rodapé com nome e email ... */}
          <div className="flex items-center justify-between px-2">
             <div className="flex items-center gap-2 truncate">
                <div className="w-8 h-8 bg-green-900/40 text-green-500 rounded-full flex items-center justify-center text-sm font-bold border border-green-900 shrink-0">
                   {usuarioLogado.iniciais || "MG"}
                </div>
                <div className="overflow-hidden">
                   <p className="text-sm text-white truncate font-bold">{usuarioLogado.nome}</p>
                   <p className="text-[10px] text-gray-500 truncate">{usuarioLogado.email}</p>
                </div>
             </div>
             <button onClick={fazerLogout} className="text-gray-500 hover:text-red-500 p-2 rounded-lg">
                <LogOut size={16} />
             </button>
          </div>
        </div>
      )}
    </div>
  );
}