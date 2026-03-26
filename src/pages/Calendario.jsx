import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Users,
  X,
  Info,
} from "lucide-react";

export default function Calendario() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [dataAtual, setDataAtual] = useState(new Date());

  // Estados do Modal de Detalhes do Dia
  const [modalAberto, setModalAberto] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [detalhesDoDia, setDetalhesDoDia] = useState([]);

  const diasDaSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  useEffect(() => {
    async function buscarFerias() {
      setCarregando(true);
      const { data, error } = await supabase
        .from("solicitacoes")
        .select(
          "colaborador_nome, setor, data_inicio, data_fim, status, total_dias",
        )
        .in("status", ["aprovado", "pendente"]);

      if (error) console.error("Erro ao buscar férias:", error.message);
      else setSolicitacoes(data || []);

      setCarregando(false);
    }

    buscarFerias();
  }, []);

  const mesAnterior = () =>
    setDataAtual(
      new Date(dataAtual.getFullYear(), dataAtual.getMonth() - 1, 1),
    );
  const proximoMes = () =>
    setDataAtual(
      new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 1),
    );
  const irParaHoje = () => setDataAtual(new Date());

  // --- MATEMÁTICA DO CALENDÁRIO ---
  const ano = dataAtual.getFullYear();
  const mes = dataAtual.getMonth();

  const primeiroDiaDoMes = new Date(ano, mes, 1).getDay();
  const totalDiasNoMes = new Date(ano, mes + 1, 0).getDate();
  const totalCelulas = primeiroDiaDoMes + totalDiasNoMes;
  const diasFaltandoNoFinal =
    totalCelulas % 7 === 0 ? 0 : 7 - (totalCelulas % 7);

  // Array com os últimos dias do mês ANTERIOR
  const diasMesAnterior = Array.from({ length: primeiroDiaDoMes }, (_, i) => {
    const totalDiasMesPassado = new Date(ano, mes, 0).getDate();
    return totalDiasMesPassado - primeiroDiaDoMes + i + 1;
  });

  // Array com os dias do mês ATUAL
  const diasDoMes = Array.from({ length: totalDiasNoMes }, (_, i) => i + 1);

  // Array com os primeiros dias do PRÓXIMO mês
  const diasProximoMes = Array.from(
    { length: diasFaltandoNoFinal },
    (_, i) => i + 1,
  );

  // --- LÓGICA DE FÉRIAS ---
  const verificarFeriasNoDia = (dia, mesAlvo, anoAlvo) => {
    const dataVerificacao = new Date(anoAlvo, mesAlvo, dia, 12, 0, 0);

    return solicitacoes.filter((sol) => {
      const [sAno, sMes, sDia] = sol.data_inicio.split("-");
      const inicio = new Date(sAno, sMes - 1, sDia, 12, 0, 0);

      const [eAno, eMes, eDia] = sol.data_fim.split("-");
      const fim = new Date(eAno, eMes - 1, eDia, 12, 0, 0);

      return dataVerificacao >= inicio && dataVerificacao <= fim;
    });
  };

  // Abre o modal ao clicar no dia
  const abrirDetalhes = (dia, ferias) => {
    if (ferias.length === 0) return; // Só abre se tiver alguém de férias
    setDiaSelecionado(new Date(ano, mes, dia));
    setDetalhesDoDia(ferias);
    setModalAberto(true);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500/10 p-2 rounded-lg">
            <CalendarIcon className="text-orange-500" size={24} />
          </div>
          <div>
            <h1 className="text-2xl text-white font-bold">
              Visão do Calendário
            </h1>
            <p className="text-gray-500 text-sm">
              Acompanhe o período de férias da equipe de forma visual
            </p>
          </div>
        </div>

        <div className="flex items-center bg-[#111] border border-[#222] rounded-lg p-1 shadow-lg">
          <button
            onClick={mesAnterior}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#222] rounded transition-colors"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="w-48 text-center font-bold text-white text-sm uppercase tracking-wider">
            {meses[mes]} {ano}
          </div>

          <button
            onClick={proximoMes}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#222] rounded transition-colors"
          >
            <ChevronRight size={20} />
          </button>

          <div className="w-px h-6 bg-[#333] mx-2"></div>

          <button
            onClick={irParaHoje}
            className="px-4 py-1.5 text-xs font-bold text-orange-500 hover:bg-orange-500/10 rounded transition-colors"
          >
            HOJE
          </button>
        </div>
      </div>

      <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden shadow-2xl">
        <div className="grid grid-cols-7 bg-[#161616] border-b border-[#222]">
          {diasDaSemana.map((dia) => (
            <div
              key={dia}
              className="py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-widest border-r border-[#222] last:border-0"
            >
              {dia}
            </div>
          ))}
        </div>

        {carregando && (
          <div className="p-20 text-center text-gray-500 font-mono text-sm">
            CARREGANDO FÉRIAS...
          </div>
        )}

        {!carregando && (
          <div className="grid grid-cols-7 auto-rows-[minmax(120px,auto)] bg-[#222] gap-px">
            {/* Dias do mês ANTERIOR */}
            {diasMesAnterior.map((dia, i) => (
              <div key={`prev-${i}`} className="bg-[#111] p-2 opacity-40">
                <span className="text-gray-600 font-bold text-sm">{dia}</span>
              </div>
            ))}

            {/* Dias do mês ATUAL */}
            {diasDoMes.map((dia) => {
              const feriasNoDia = verificarFeriasNoDia(dia, mes, ano);
              const ehHoje =
                dia === new Date().getDate() &&
                mes === new Date().getMonth() &&
                ano === new Date().getFullYear();
              const temFerias = feriasNoDia.length > 0;

              return (
                <div
                  key={dia}
                  onClick={() => abrirDetalhes(dia, feriasNoDia)}
                  className={`bg-[#111] p-2 flex flex-col transition-colors group ${temFerias ? "cursor-pointer hover:bg-[#161616]" : ""}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold transition-all ${
                        ehHoje
                          ? "bg-orange-600 text-white shadow-md shadow-orange-900/50"
                          : "text-gray-400 group-hover:text-white"
                      }`}
                    >
                      {dia}
                    </span>
                    {temFerias && (
                      <span className="text-[10px] text-gray-500 bg-[#222] px-1.5 py-0.5 rounded flex items-center gap-1 font-mono border border-[#333]">
                        <Users size={10} className="text-orange-500" />{" "}
                        {feriasNoDia.length}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col gap-1 overflow-y-auto mt-1 no-scrollbar">
                    {feriasNoDia.slice(0, 3).map((sol, index) => (
                      <div
                        key={index}
                        className={`text-[10px] font-bold px-2 py-1 rounded-md truncate border ${
                          sol.status === "aprovado"
                            ? "bg-green-900/20 text-green-500 border-green-900/30"
                            : "bg-yellow-900/20 text-yellow-500 border-yellow-900/30"
                        }`}
                      >
                        {sol.colaborador_nome.split(" ")[0]}
                      </div>
                    ))}
                    {feriasNoDia.length > 3 && (
                      <div className="text-[10px] text-gray-500 font-medium pl-1 mt-0.5">
                        + {feriasNoDia.length - 3} pessoa(s)...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Dias do PRÓXIMO mês */}
            {diasProximoMes.map((dia, i) => (
              <div key={`next-${i}`} className="bg-[#111] p-2 opacity-40">
                <span className="text-gray-600 font-bold text-sm">{dia}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-6 mt-6 ml-2">
        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium uppercase">
          <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
          Férias Aprovadas
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium uppercase">
          <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
          Aguardando Aprovação
        </div>
      </div>

      {/* --- MODAL DE DETALHES DO DIA --- */}
      {modalAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-lg shadow-2xl relative">
            <div className="p-5 border-b border-[#222] flex items-center justify-between bg-[#161616] rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Info className="text-orange-500" size={20} />
                  Calendário de Férias
                </h2>
                <p className="text-xs text-gray-400 mt-1 capitalize">
                  {diaSelecionado?.toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                className="text-gray-500 hover:text-white transition-colors bg-[#222] p-2 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                {detalhesDoDia.map((sol, index) => (
                  <div
                    key={index}
                    className="bg-[#1a1a1a] border border-[#333] p-4 rounded-xl flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#222] text-orange-500 flex items-center justify-center font-bold text-xs border border-[#333]">
                          {sol.colaborador_nome?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">
                            {sol.colaborador_nome}
                          </p>
                          <p className="text-xs text-gray-500">
                            {sol.setor || "Não informado"}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-1 rounded text-[10px] uppercase font-bold border ${
                          sol.status === "aprovado"
                            ? "bg-green-900/10 text-green-500 border-green-900/50"
                            : "bg-yellow-900/10 text-yellow-500 border-yellow-900/50"
                        }`}
                      >
                        {sol.status}
                      </span>
                    </div>

                    <div className="bg-[#222] rounded-lg p-2.5 flex items-center justify-between text-xs border border-[#333]">
                      <div className="text-gray-400">
                        Período:{" "}
                        <span className="text-white ml-1">
                          {new Date(sol.data_inicio).toLocaleDateString()} a{" "}
                          {new Date(sol.data_fim).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-orange-500 font-mono font-bold bg-orange-500/10 px-2 py-0.5 rounded">
                        {sol.total_dias || "—"} dias
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
