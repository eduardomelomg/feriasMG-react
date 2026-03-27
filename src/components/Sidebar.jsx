import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext"; // Ajuste o caminho se necessário
import { supabase } from "../lib/supabase"; // Ajuste o caminho se necessário
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Users,
  UserCog,
  Settings,
  LogOut,
} from "lucide-react";

export default function Sidebar() {
  const [contagem, setContagem] = useState(0);
  const location = useLocation();
  const { usuarioLogado } = useAuth();

  // Busca contagem de pendências (Exemplo de funcionalidade que você tinha)
  useEffect(() => {
    const atualizarContagem = async () => {
      try {
        const { count, error } = await supabase
          .from("solicitacoes")
          .select("*", { count: "exact", head: true })
          .eq("status", "pendente");

        if (!error) setContagem(count || 0);
      } catch (err) {
        console.error("Erro ao buscar contagem:", err);
      }
    };

    atualizarContagem();

    // Realtime para atualizar o badge automaticamente
    const canal = supabase
      .channel("sidebar-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "solicitacoes" },
        () => {
          atualizarContagem();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  const menuItems = [
    { name: "Dashboard", path: "/", icon: <LayoutDashboard size={20} /> },
    { name: "Calendário", path: "/calendario", icon: <Calendar size={20} /> },
    {
      name: "Solicitações",
      path: "/solicitacoes",
      icon: <FileText size={20} />,
      badge: true,
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

  // Filtra o menu com base no perfil (Correção para ADMINISTRADOR (TI))
  const menusPermitidos = menuItems.filter((item) => {
    const p = usuarioLogado?.perfil;
    // Admins e RH vêem tudo
    if (p === "Admin TI" || p === "ADMINISTRADOR (TI)" || p === "Gestão DP") {
      return true;
    }
    // Coordenadores não vêem itens de Admin
    if (p === "Coordenador") {
      return !item.adminOnly;
    }
    return false;
  });

  const fazerLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <aside className="w-64 h-screen bg-[#111111] text-gray-400 flex flex-col border-r border-[#222] sticky top-0">
      {/* TOPO: LOGO E NOME DO SISTEMA */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-700 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-orange-500/20 shrink-0">
          MG
        </div>
        <div className="overflow-hidden">
          <h1 className="text-white font-bold text-sm tracking-tight leading-tight uppercase">
            Mendonça Galvão
          </h1>
          <p className="text-[9px] text-orange-500 font-semibold tracking-widest mt-0.5 uppercase opacity-80">
            Gestão de Férias
          </p>
        </div>
      </div>

      {/* NAVEGAÇÃO */}
      <nav className="flex-1 px-4 space-y-1 mt-4">
        {menusPermitidos.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors group ${
                isActive
                  ? "bg-orange-500/10 text-orange-400 font-medium"
                  : "hover:bg-[#1a1a1a] hover:text-white"
              }`}
            >
              <span
                className={
                  isActive
                    ? "text-orange-400"
                    : "text-gray-500 group-hover:text-white"
                }
              >
                {item.icon}
              </span>
              <span className="text-sm">{item.name}</span>

              {/* Badge de Pendências */}
              {item.badge && contagem > 0 && (
                <span className="ml-auto bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  {contagem}
                </span>
              )}

              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* RODAPÉ: PERFIL E LOGOUT */}
      {usuarioLogado && (
        <div className="p-4 border-t border-[#222]">
          <div className="bg-[#1a1a1a] p-2 rounded border border-orange-900/30 flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            <span className="text-orange-400 text-[10px] font-bold uppercase tracking-tighter truncate">
              {usuarioLogado.perfil}
            </span>
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 truncate">
              <div className="w-8 h-8 bg-orange-900/20 text-orange-500 rounded-full flex items-center justify-center text-xs font-bold border border-orange-900/30 shrink-0">
                {usuarioLogado.iniciais || "MG"}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs text-white truncate font-bold">
                  {usuarioLogado.nome || "Usuário"}
                </p>
                <p className="text-[10px] text-gray-600 truncate">
                  {usuarioLogado.email}
                </p>
              </div>
            </div>
            <button
              onClick={fazerLogout}
              className="text-gray-600 hover:text-red-500 transition-colors p-1.5 hover:bg-red-500/10 rounded-md"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}