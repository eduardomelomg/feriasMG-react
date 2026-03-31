import {
  Clock,
  CheckCircle2,
  XCircle,
  UserMinus,
  AlertTriangle,
  TrendingUp,
  History,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Dashboard() {
  const [stats, setStats] = useState({
    pendentes: 0,
    aprovadas: 0,
    rejeitadas: 0,
  });
  const [recentes, setRecentes] = useState([]);
  const [setoresData, setSetoresData] = useState([]);

  // 🛡️ ESCUDO TITÂNIO CONTRA DATAS VAZIAS
  const formatarDataSegura = (data) => {
    if (!data) return "---";
    try {
      const dateObj =
        typeof data === "string" ? parseISO(data) : new Date(data);
      return format(dateObj, "dd/MM/yyyy", { locale: ptBR });
    } catch (err) {
      console.warn("Erro ao formatar data no dashboard:", err);
      return "Data Inválida";
    }
  };

  useEffect(() => {
    const carregarDashboard = async () => {
      console.log("Dashboard: Carregando dados iniciais...");

      // 1. Buscar Solicitações
      const { data: solicitacoes, error: errSoli } = await supabase
        .from("solicitacoes")
        .select("status, colaborador_nome, data_inicio, data_fim");

      if (errSoli) {
        console.error("Erro ao carregar solicitações:", errSoli.message);
      } else if (solicitacoes) {
        // Correção das nomenclaturas exatas salvas no banco
        setStats({
          pendentes: solicitacoes.filter((s) => s.status === "Pendente").length,
          aprovadas: solicitacoes.filter((s) => s.status === "Aprovada").length,
          rejeitadas: solicitacoes.filter((s) => s.status === "Reprovada")
            .length,
        });

        const formatados = solicitacoes.map((s) => ({
          nome: s.colaborador_nome || "Desconhecido",
          setor: "Não informado", // Texto fixo enquanto não trouxer do banco
          data_inicio: s.data_inicio,
          data_fim: s.data_fim,
          status: s.status || "Pendente",
        }));

        setRecentes(formatados.slice(-3).reverse());
      }

      // 2. Buscar Colaboradores (Ocupação por Setor)
      const { data: colaboradores, error: errColab } = await supabase
        .from("colaboradores")
        .select("setor, status");

      if (errColab) {
        console.warn("Aviso: Tabela 'colaboradores' não encontrada.");
      } else if (colaboradores) {
        setSetoresData(colaboradores);
      }
    };

    carregarDashboard();

    // --- CONFIGURAÇÃO DO REALTIME ---
    const canal = supabase
      .channel("dashboard-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "solicitacoes" },
        (payload) => {
          console.log("Dashboard: Mudança detectada!", payload);
          carregarDashboard();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  const kpis = [
    {
      titulo: "Pendentes",
      valor: stats.pendentes.toString(),
      icone: <Clock size={20} className="text-yellow-500" />,
    },
    {
      titulo: "Aprovadas",
      valor: stats.aprovadas.toString(),
      icone: <CheckCircle2 size={20} className="text-green-500" />,
    },
    {
      titulo: "Rejeitadas",
      valor: stats.rejeitadas.toString(),
      icone: <XCircle size={20} className="text-red-500" />,
    },
    {
      titulo: "Sem férias",
      valor: "0",
      icone: <UserMinus size={20} className="text-gray-400" />,
    },
    {
      titulo: "Conflitos",
      valor: "0",
      icone: <AlertTriangle size={20} className="text-orange-500" />,
    },
  ];

  const listaSetores = [
    { sigla: "CONT", nome: "Contábil" },
    { sigla: "DP", nome: "Departamento Pessoal" },
    { sigla: "FIN", nome: "Financeiro" },
    { sigla: "FISC", nome: "Fiscal" },
    { sigla: "RH", nome: "Recursos Humanos" },
    { sigla: "TI", nome: "Tecnologia da Informação" },
  ];

  const ocupacaoSetor = listaSetores.map((setor) => {
    const totalNoSetor = setoresData.filter(
      (c) => c.setor === setor.nome,
    ).length;
    const ocupados = setoresData.filter(
      (c) => c.setor === setor.nome && c.status === "ferias",
    ).length;
    return { ...setor, ocupados, total: totalNoSetor };
  });

  // Data atual dinâmica para o cabeçalho
  const dataHoje = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Cabeçalho do Dashboard */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl text-white font-bold mb-1">
            Central de Operações
          </h1>
          <p className="text-sm text-gray-500 capitalize">
            Administrador (TI) • {dataHoje}
          </p>
        </div>
        <div className="bg-[#1a1a1a] border border-gray-800 text-gray-400 px-3 py-1 rounded-full text-xs font-mono tracking-wider">
          SYS:ONLINE • v1.0
        </div>
      </div>

      {/* Cards de KPI */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {kpis.map((kpi, index) => (
          <div
            key={index}
            className="bg-[#111111] border border-[#222] p-5 rounded-xl flex flex-col justify-between h-28"
          >
            <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center mb-2 border border-gray-800">
              {kpi.icone}
            </div>
            <div>
              <p className="text-2xl font-bold text-white leading-none">
                {kpi.valor}
              </p>
              <p className="text-xs text-gray-500 mt-1">{kpi.titulo}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Seção Inferior: Ocupação e Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card: Ocupação por Setor */}
        <div className="bg-[#111111] border border-[#222] rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-white font-semibold flex items-center gap-2 text-sm">
              <TrendingUp size={18} className="text-orange-500" />
              Ocupação por Setor
            </h2>
            <span className="text-xs text-gray-500 font-mono">POR SETOR</span>
          </div>

          <div className="space-y-4">
            {ocupacaoSetor.map((setor) => {
              const porcentagem =
                setor.total === 0
                  ? 0
                  : Math.round((setor.ocupados / setor.total) * 100);
              const txtPorcentagem =
                setor.total === 0 ? "0%" : `${porcentagem}%`;

              return (
                <div key={setor.sigla} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        {setor.sigla}
                      </span>
                      <span className="text-gray-300">{setor.nome}</span>
                    </div>
                    <span className="text-gray-500 font-mono">
                      {setor.ocupados}/{setor.total} ({txtPorcentagem})
                    </span>
                  </div>
                  {/* Barra de progresso */}
                  <div className="w-full bg-[#1a1a1a] rounded-full h-1.5 mt-1">
                    <div
                      className="bg-orange-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${porcentagem}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card: Solicitações Recentes */}
        <div className="bg-[#111111] border border-[#222] rounded-xl p-6">
          <h2 className="text-white font-semibold flex items-center gap-2 text-sm mb-6">
            <History size={18} className="text-orange-500" />
            Solicitações Recentes
          </h2>

          {recentes.length === 0 ? (
            <p className="text-center text-gray-500 text-xs py-4">
              Nenhuma solicitação recente.
            </p>
          ) : (
            recentes.map((solicitacao, index) => {
              // Lógica de cores baseada no nome exato salvo no banco
              let corPill = "border-gray-900 text-gray-500 bg-gray-900/20";
              if (solicitacao.status === "Pendente")
                corPill = "border-yellow-900 text-yellow-500 bg-yellow-900/20";
              if (solicitacao.status === "Aprovada")
                corPill = "border-green-900 text-green-500 bg-green-900/20";
              if (solicitacao.status === "Reprovada")
                corPill = "border-red-900 text-red-500 bg-red-900/20";

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 hover:bg-[#1a1a1a] rounded-lg transition-colors border border-transparent hover:border-[#333] cursor-pointer mb-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold text-sm shrink-0">
                      {solicitacao.nome?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">
                        {solicitacao.nome}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {solicitacao.setor} •{" "}
                        {formatarDataSegura(solicitacao.data_inicio)} —{" "}
                        {formatarDataSegura(solicitacao.data_fim)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-[10px] font-black uppercase border tracking-wider ${corPill}`}
                  >
                    {solicitacao.status}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
