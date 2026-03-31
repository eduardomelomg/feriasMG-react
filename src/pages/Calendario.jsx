import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  PlaneTakeoff,
  Flag,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Calendario() {
  const [mesAtual, setMesAtual] = useState(new Date());
  const [eventos, setEventos] = useState([]);
  const [feriados, setFeriados] = useState([]);

  // ESTADO DO MODAL
  const [diaSelecionado, setDiaSelecionado] = useState(null);

  // 🛡️ ESCUDO CONTRA DATAS QUEBRADAS
  const parseDataSegura = (data) => {
    if (!data) return null;
    try {
      return typeof data === "string" ? parseISO(data) : new Date(data);
    } catch (err) {
      console.warn("Data inválida ignorada.", err);
      return null;
    }
  };

  const formatarDataSegura = (data, formato = "dd/MM/yyyy") => {
    const dataParseada = parseDataSegura(data);
    if (!dataParseada) return "---";
    return format(dataParseada, formato, { locale: ptBR });
  };

  useEffect(() => {
    async function carregarDados() {
      try {
        // 1. Buscar Solicitações Aprovadas
        const { data: sols, error: errSols } = await supabase
          .from("solicitacoes")
          .select("*, colaboradores(colaborador_nome, setor)")
          .eq("status", "Aprovada");

        if (errSols) {
          console.error("Erro Sols:", errSols.message);
        } else {
          setEventos(sols || []);
        }

        // 2. Buscar Feriados e Coletivas
        const { data: feri, error: errFeri } = await supabase
          .from("feriados_coletivas")
          .select("*");

        if (errFeri) {
          console.error("Erro Feri:", errFeri.message);
        } else {
          setFeriados(feri || []);
        }
      } catch (error) {
        console.error("Erro geral no calendário:", error);
      }
    }

    carregarDados();
  }, []);

  // Lógica para gerar os dias do grid
  const primeiroDiaMes = startOfMonth(mesAtual);
  const ultimoDiaMes = endOfMonth(primeiroDiaMes);
  const dataInicio = startOfWeek(primeiroDiaMes, { weekStartsOn: 0 });
  const dataFim = endOfWeek(ultimoDiaMes, { weekStartsOn: 0 });

  const dias = eachDayOfInterval({ start: dataInicio, end: dataFim });

  // Lógica para o Modal (Filtra quem está de férias no dia clicado)
  const eventosNoDiaSelecionado = diaSelecionado
    ? eventos.filter((ev) => {
        const inicio = parseDataSegura(ev.data_inicio);
        const fim = parseDataSegura(ev.data_fim);
        return (
          inicio && fim && diaSelecionado >= inicio && diaSelecionado <= fim
        );
      })
    : [];

  const feriadoNoDiaSelecionado = diaSelecionado
    ? feriados.filter((f) => {
        const fInicio = parseDataSegura(f.data_inicio);
        const fFim = parseDataSegura(f.data_fim);
        return (
          fInicio && fFim && diaSelecionado >= fInicio && diaSelecionado <= fFim
        );
      })
    : [];

  return (
    <div className="p-8 max-w-7xl mx-auto text-white relative">
      {/* Cabeçalho */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500/20 p-2 rounded-xl">
            <CalendarIcon className="text-orange-500" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Calendário de Ausências</h1>
            <p className="text-xs text-gray-500 uppercase font-black tracking-widest">
              Visualização Geral de Férias
            </p>
          </div>
        </div>

        <div className="flex items-center bg-[#111] border border-[#222] rounded-2xl p-1">
          <button
            onClick={() => setMesAtual(subMonths(mesAtual, 1))}
            className="p-2 hover:bg-[#1a1a1a] rounded-xl transition-colors text-gray-400"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="px-6 font-bold text-sm uppercase min-w-[150px] text-center">
            {format(mesAtual, "MMMM yyyy", { locale: ptBR })}
          </span>
          <button
            onClick={() => setMesAtual(addMonths(mesAtual, 1))}
            className="p-2 hover:bg-[#1a1a1a] rounded-xl transition-colors text-gray-400"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      {/* Grid do Calendário */}
      <div className="bg-[#111] border border-[#222] rounded-3xl overflow-hidden shadow-2xl">
        {/* Dias da Semana */}
        <div className="grid grid-cols-7 border-b border-[#222] bg-[#161616]">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((dia) => (
            <div
              key={dia}
              className="p-4 text-center text-[10px] font-black uppercase text-gray-500 tracking-tighter"
            >
              {dia}
            </div>
          ))}
        </div>

        {/* Dias do Mês */}
        <div className="grid grid-cols-7">
          {dias.map((dia, i) => {
            const eventosNoDia = eventos.filter((ev) => {
              const inicio = parseDataSegura(ev.data_inicio);
              const fim = parseDataSegura(ev.data_fim);
              return inicio && fim && dia >= inicio && dia <= fim;
            });

            const feriadoNoDia = feriados.find((f) => {
              const fInicio = parseDataSegura(f.data_inicio);
              const fFim = parseDataSegura(f.data_fim);
              return fInicio && fFim && dia >= fInicio && dia <= fFim;
            });

            // Se tem evento ou feriado, deixa o cursor como pointer
            const temAlgoNoDia = eventosNoDia.length > 0 || feriadoNoDia;

            return (
              <div
                key={i}
                onClick={() => setDiaSelecionado(dia)}
                className={`min-h-[120px] p-2 border-b border-r border-[#222] transition-colors ${
                  temAlgoNoDia ? "cursor-pointer" : ""
                } ${
                  !isSameMonth(dia, mesAtual)
                    ? "bg-[#0a0a0a]/50 opacity-30"
                    : "hover:bg-[#141414]"
                }`}
              >
                <span
                  className={`text-xs font-bold ${isSameDay(dia, new Date()) ? "bg-orange-500 text-black w-6 h-6 flex items-center justify-center rounded-full" : "text-gray-500"}`}
                >
                  {format(dia, "d")}
                </span>

                <div className="mt-2 space-y-1">
                  {/* Feriados */}
                  {feriadoNoDia && (
                    <div className="bg-red-500/10 border border-red-500/20 p-1 rounded text-[9px] text-red-500 font-bold truncate">
                      🚩 {feriadoNoDia.titulo}
                    </div>
                  )}

                  {/* Férias */}
                  {eventosNoDia.map((ev, idx) => (
                    <div
                      key={idx}
                      className="bg-orange-500/10 border border-orange-500/20 p-1 rounded text-[9px] text-orange-400 font-medium truncate"
                    >
                      ✈️ {ev.colaboradores?.colaborador_nome?.split(" ")[0]}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legenda */}
      <footer className="mt-6 flex gap-6 text-[10px] font-bold uppercase text-gray-500 tracking-widest justify-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-orange-500/20 border border-orange-500/40"></div>
          Férias Aprovadas
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/40"></div>
          Feriados / Coletivas
        </div>
      </footer>

      {/* ========================================== */}
      {/* MODAL DE DETALHES DO DIA */}
      {/* ========================================== */}
      {diaSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="bg-[#111] border border-[#222] rounded-3xl w-full max-w-md p-8 relative shadow-2xl">
            <button
              onClick={() => setDiaSelecionado(null)}
              className="absolute right-6 top-6 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-white">
              <CalendarIcon className="text-orange-500" size={20} />
              Detalhes do Dia
            </h2>
            <p className="text-xs text-gray-500 uppercase font-black tracking-widest mb-6 pb-4 border-b border-[#222] capitalize">
              {format(diaSelecionado, "EEEE, dd 'de' MMMM 'de' yyyy", {
                locale: ptBR,
              })}
            </p>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {/* Se não houver nada */}
              {eventosNoDiaSelecionado.length === 0 &&
                feriadoNoDiaSelecionado.length === 0 && (
                  <p className="text-center text-gray-600 font-bold uppercase text-xs py-8">
                    Nenhum registro para este dia.
                  </p>
                )}

              {/* Lista de Feriados */}
              {feriadoNoDiaSelecionado.map((f, idx) => (
                <div
                  key={`f-${idx}`}
                  className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl flex items-start gap-3"
                >
                  <div className="p-2 bg-red-500/10 rounded-lg text-red-500 mt-1">
                    <Flag size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-red-400 uppercase">
                      {f.titulo}
                    </h3>
                    <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase">
                      Feriado / Recesso
                    </p>
                  </div>
                </div>
              ))}

              {/* Lista de Férias */}
              {eventosNoDiaSelecionado.map((ev, idx) => (
                <div
                  key={`ev-${idx}`}
                  className="bg-[#161616] border border-[#222] p-4 rounded-xl flex items-start gap-3"
                >
                  <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500 mt-1">
                    <PlaneTakeoff size={16} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-white uppercase">
                      {ev.colaboradores?.colaborador_nome || "Desconhecido"}
                    </h3>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[9px] bg-[#222] text-gray-400 px-2 py-1 rounded uppercase font-black">
                        {ev.colaboradores?.setor || "Sem Setor"}
                      </span>
                      <span className="text-[10px] text-gray-500 font-bold tracking-widest">
                        {formatarDataSegura(ev.data_inicio)} —{" "}
                        {formatarDataSegura(ev.data_fim)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setDiaSelecionado(null)}
              className="w-full mt-6 bg-[#1a1a1a] hover:bg-[#222] text-gray-300 py-3 rounded-xl font-black uppercase tracking-widest transition-colors text-xs border border-[#333]"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
