alert("SIDEBAR CARREGADO COM SUCESSO!");

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const [contagem, setContagem] = useState(0);
  const location = useLocation();

  useEffect(() => {
    console.log("1. Sidebar montado e useEffect iniciado");

    const atualizarContagem = async () => {
      try {
        console.log("2. Tentando buscar contagem no Supabase...");

        // CORREÇÃO AQUI: Adicionado 'error' dentro das chaves
        const { count, error } = await supabase
          .from("solicitacoes")
          .select("*", { count: "exact", head: true })
          .eq("status", "pendente");

        if (error) {
          console.error("3. Erro retornado pelo Supabase:", error.message);
          return;
        }

        console.log("4. Contagem recebida com sucesso:", count);
        setContagem(count || 0);
      } catch (err) {
        console.error("3b. Erro crítico na função atualizarContagem:", err);
      }
    };

    atualizarContagem();

    const canal = supabase
      .channel("sidebar-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "solicitacoes" },
        (payload) => {
          console.log("5. Mudança detectada via Realtime!", payload);
          atualizarContagem();
        },
      )
      .subscribe();

    return () => {
      console.log("Limpando canal de Realtime");
      supabase.removeChannel(canal);
    };
  }, []);

  const menuItems = [
    {
      name: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      path: "/dashboard",
    },
    {
      name: "Pendências",
      icon: <ClipboardList size={20} />,
      path: "/pendencias",
      badge: true,
    },
    {
      name: "Colaboradores",
      icon: <Users size={20} />,
      path: "/colaboradores",
    },
    { name: "Ajustes", icon: <Settings size={20} />, path: "/configuracoes" },
  ];

  return (
    <aside className="w-64 bg-[#0a0a0a] border-r border-[#1a1a1a] flex flex-col h-screen sticky top-0">
      <div className="p-6">
        <h1 className="text-orange-500 font-black text-xl tracking-tighter italic">
          MENDONÇA GALVÃO
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center justify-between p-3 rounded-lg transition-colors group ${
              location.pathname === item.path
                ? "bg-orange-500/10 text-orange-500"
                : "text-gray-500 hover:bg-[#111] hover:text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              <span className="font-medium text-sm">{item.name}</span>
            </div>

            {/* O Badge que pisca quando tem pendência */}
            {item.badge && contagem > 0 && (
              <span className="bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                {contagem}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-[#1a1a1a]">
        <button className="flex items-center gap-3 p-3 w-full text-gray-500 hover:text-red-500 transition-colors text-sm font-medium">
          <LogOut size={18} /> Sair do Sistema
        </button>
      </div>
    </aside>
  );
}
