import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Settings,
  Edit2,
  Trash2,
  PlusCircle,
  X,
  ChevronDown,
  ChevronUp,
  Shield,
  Calendar,
  CalendarX,
  Save,
} from "lucide-react";

export default function Configuracoes() {
  const [carregando, setCarregando] = useState(true);

  // --- Estados de Regras e Accordion ---
  const [regras, setRegras] = useState([]);
  const [setorExpandido, setSetorExpandido] = useState(null);
  const [modalRegraAberto, setModalRegraAberto] = useState(false);
  const [regraEmEdicao, setRegraEmEdicao] = useState(null);

  // --- Estados de Feriados ---
  const [eventos, setEventos] = useState([]);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("Férias Coletivas");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [descontaSaldo, setDescontaSaldo] = useState(false);

  useEffect(() => {
    buscarDados();
  }, []);

  async function buscarDados() {
    setCarregando(true);
    try {
      const { data: dataRegras, error: errRegras } = await supabase
        .from("regras_setor")
        .select("*")
        .order("setor");
      if (errRegras) throw errRegras;
      setRegras(dataRegras || []);

      const { data: dataEventos, error: errEventos } = await supabase
        .from("feriados_coletivas")
        .select("*")
        .order("data_inicio");
      if (errEventos) throw errEventos;
      setEventos(dataEventos || []);
    } catch (error) {
      console.error("Erro ao buscar configurações:", error.message);
    } finally {
      setCarregando(false);
    }
  }

  const toggleExpand = (id) => {
    setSetorExpandido((prev) => (prev === id ? null : id));
  };

  // --- CRUD: REGRAS ---
  const abrirEdicaoRegra = (regra) => {
    setRegraEmEdicao({ ...regra });
    setModalRegraAberto(true);
  };

  const salvarRegra = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from("regras_setor")
      .update({
        limite_ausencia_percentual: regraEmEdicao.limite_ausencia_percentual,
        cobertura_minima: regraEmEdicao.cobertura_minima,
        dias_criticos_inicio: regraEmEdicao.dias_criticos_inicio || null,
        dias_criticos_fim: regraEmEdicao.dias_criticos_fim || null,
      })
      .eq("id", regraEmEdicao.id);

    if (error) alert("Erro: " + error.message);
    else {
      setModalRegraAberto(false);
      buscarDados();
    }
  };

  // --- CRUD: EVENTOS (FERIADOS/COLETIVAS) ---
  const cadastrarEvento = async (e) => {
    e.preventDefault();
    if (!titulo || !dataInicio || !dataFim)
      return alert("Preencha título e datas!");

    const { error } = await supabase.from("feriados_coletivas").insert([
      {
        titulo,
        tipo,
        data_inicio: dataInicio,
        data_fim: dataFim,
        desconta_saldo: descontaSaldo,
      },
    ]);

    if (error) alert("Erro: " + error.message);
    else {
      setTitulo("");
      setDataInicio("");
      setDataFim("");
      setDescontaSaldo(false);
      setTipo("Férias Coletivas");
      buscarDados();
    }
  };

  const deletarEvento = async (id) => {
    if (!confirm("Excluir este evento do calendário?")) return;
    const { error } = await supabase
      .from("feriados_coletivas")
      .delete()
      .eq("id", id);
    if (!error) buscarDados();
  };

  // Funções Utilitárias de Data
  const formatarData = (dataString) => {
    if (!dataString) return "";
    const [ano, mes, dia] = dataString.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const calcularDias = (inicio, fim) => {
    const diff = new Date(fim).getTime() - new Date(inicio).getTime();
    return Math.ceil(diff / (1000 * 3600 * 24)) + 1;
  };

  return (
    <div className="p-8 max-w-5xl mx-auto relative">
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-10">
        <div className="bg-orange-500/10 p-2 rounded-lg">
          <Settings className="text-orange-500" size={28} />
        </div>
        <div>
          <h1 className="text-2xl text-white font-bold">Configurações</h1>
          <p className="text-gray-500 text-sm">
            Regras por setor, períodos críticos e férias coletivas
          </p>
        </div>
      </div>

      {carregando ? (
        <div className="p-10 text-center text-gray-500 font-mono">
          Carregando configurações...
        </div>
      ) : (
        <>
          {/* =========================================
              SEÇÃO 1: REGRAS POR SETOR (ACCORDION)
             ========================================= */}
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="text-orange-500" size={18} />
              <h2 className="text-white font-bold">Regras por Setor</h2>
            </div>

            <div className="space-y-3">
              {regras.map((regra) => {
                const isExpanded = setorExpandido === regra.id;

                return (
                  <div
                    key={regra.id}
                    className={`border rounded-xl transition-all ${isExpanded ? "border-orange-900/50 bg-[#111]" : "border-[#222] bg-[#111] hover:border-[#333]"}`}
                  >
                    <div
                      className="p-4 flex items-center justify-between cursor-pointer"
                      onClick={() => toggleExpand(regra.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-1 rounded-md ${isExpanded ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" : "bg-[#1a1a1a] text-gray-500 border border-[#333]"}`}
                        >
                          {regra.setor.substring(0, 4).toUpperCase()}
                        </span>
                        <span className="text-white font-medium text-sm">
                          {regra.setor}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Limite: {regra.limite_ausencia_percentual}%</span>
                        {isExpanded && (
                          <span className="hidden sm:inline">
                            Cob. mín: {regra.cobertura_minima}
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp size={16} className="text-white" />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-5 border-t border-[#222] flex flex-col gap-5 animate-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-[#1a1a1a] border border-[#333] p-5 rounded-xl">
                            <p className="text-xs text-gray-500 mb-2">
                              Limite de ausência simultânea
                            </p>
                            <p className="text-3xl font-bold text-orange-500">
                              {regra.limite_ausencia_percentual}%
                            </p>
                          </div>
                          <div className="bg-[#1a1a1a] border border-[#333] p-5 rounded-xl">
                            <p className="text-xs text-gray-500 mb-2">
                              Cobertura mínima obrigatória
                            </p>
                            <p className="text-3xl font-bold text-orange-500">
                              {regra.cobertura_minima}
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirEdicaoRegra(regra);
                            }}
                            className="flex items-center gap-2 bg-[#222] hover:bg-[#333] text-white px-4 py-2.5 rounded-lg text-sm transition-colors border border-[#333]"
                          >
                            <Edit2 size={16} className="text-orange-500" />{" "}
                            Editar Regras deste Setor
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* =========================================
              SEÇÃO 2: FÉRIAS COLETIVAS E FERIADOS (NOVO LAYOUT)
             ========================================= */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="text-orange-500" size={18} />
              <h2 className="text-white font-bold">
                Férias Coletivas e Feriados
              </h2>
            </div>

            <div className="flex flex-col gap-6 animate-in fade-in duration-300">
              {/* FORMULÁRIO SUPERIOR (Largura Total) */}
              <div className="w-full bg-[#111] border border-[#222] p-6 rounded-2xl shadow-lg relative overflow-hidden group">
                <div className="absolute -inset-px bg-gradient-to-r from-orange-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"></div>

                <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2.5 relative z-10">
                  <PlusCircle size={20} className="text-orange-500" />
                  Novo Período
                </h2>

                <form onSubmit={cadastrarEvento} className="relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-5">
                    <div className="md:col-span-5">
                      <label className="text-xs text-gray-400 font-semibold mb-1.5 block uppercase tracking-wider">
                        Título / Motivo
                      </label>
                      <input
                        type="text"
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        placeholder="Ex: Férias Coletivas Natal"
                        className="w-full bg-[#161616] border border-[#333] rounded-xl p-3 text-white text-sm focus:border-orange-500 outline-none transition-all placeholder:text-gray-600"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="text-xs text-gray-400 font-semibold mb-1.5 block uppercase tracking-wider">
                        Tipo de Evento
                      </label>
                      <select
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value)}
                        className="w-full bg-[#161616] border border-[#333] rounded-xl p-3 text-white text-sm focus:border-orange-500 outline-none transition-all appearance-none cursor-pointer"
                      >
                        <option value="Férias Coletivas">
                          Férias Coletivas
                        </option>
                        <option value="Feriado">
                          Feriado Nacional / Regional
                        </option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-400 font-semibold mb-1.5 block uppercase tracking-wider">
                        Início
                      </label>
                      <input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        className="w-full bg-[#161616] border border-[#333] rounded-xl p-3 text-white text-sm focus:border-orange-500 outline-none transition-all [color-scheme:dark]"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-400 font-semibold mb-1.5 block uppercase tracking-wider">
                        Fim
                      </label>
                      <input
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        className="w-full bg-[#161616] border border-[#333] rounded-xl p-3 text-white text-sm focus:border-orange-500 outline-none transition-all [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-[#222]">
                    <label className="flex items-center gap-3.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={descontaSaldo}
                        onChange={(e) => setDescontaSaldo(e.target.checked)}
                        className="w-5 h-5 accent-orange-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-sm text-white font-semibold block transition-colors group-hover:text-orange-400">
                          Desconta do saldo?
                        </span>
                        <span className="text-[11px] text-gray-500 block leading-tight mt-0.5">
                          Se marcado, abaterá os dias de Direito a Férias de
                          todos os colaboradores.
                        </span>
                      </div>
                    </label>

                    <button
                      type="submit"
                      className="w-full sm:w-auto px-8 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-lg shadow-orange-950/30 flex justify-center items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Save size={16} />
                      ADICIONAR PERÍODO
                    </button>
                  </div>
                </form>
              </div>

              {/* LISTA INFERIOR (Largura Total) */}
              <div className="w-full bg-[#111] border border-[#222] rounded-2xl shadow-xl overflow-hidden h-fit">
                <div className="p-5 border-b border-[#222] bg-[#161616] flex justify-between items-center">
                  <h2 className="text-base font-semibold text-white">
                    Períodos Cadastrados no Sistema
                  </h2>
                  <span className="text-xs font-mono text-gray-500 bg-[#222] px-2.5 py-1 rounded-md">
                    Total: {eventos.length}
                  </span>
                </div>

                <div className="divide-y divide-[#222]">
                  {eventos.length === 0 ? (
                    <div className="p-16 text-center text-gray-600 flex flex-col items-center gap-4">
                      <div className="bg-[#1a1a1a] p-4 rounded-full border border-[#222]">
                        <CalendarX size={32} className="text-gray-700" />
                      </div>
                      <p className="text-sm max-w-xs leading-relaxed">
                        Nenhum período de férias coletivas ou feriados com
                        desconto cadastrado no momento.
                      </p>
                    </div>
                  ) : (
                    eventos.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-5 flex items-center justify-between hover:bg-[#141414] transition-colors group gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate">
                            {ev.titulo}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                            <Calendar size={13} className="text-gray-600" />
                            <span>
                              {formatarData(ev.data_inicio)} —{" "}
                              {formatarData(ev.data_fim)}
                            </span>
                            <span className="text-gray-700">•</span>
                            <span className="font-mono text-orange-500/80">
                              {calcularDias(ev.data_inicio, ev.data_fim)} dias
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          {ev.desconta_saldo && (
                            <span className="text-[10px] bg-red-950/20 text-red-500 px-2 py-1 rounded-md border border-red-900/30 font-bold tracking-wider">
                              ABATE SALDO
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${ev.tipo === "Feriado" ? "border-blue-900 text-blue-500 bg-blue-900/10" : "border-purple-900 text-purple-400 bg-purple-900/10"}`}
                          >
                            {ev.tipo}
                          </span>

                          <button
                            onClick={() => deletarEvento(ev.id)}
                            className="text-gray-600 hover:text-red-500 hover:bg-red-950/30 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Excluir Período"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* --- MODAL DE EDIÇÃO DE REGRAS --- */}
      {modalRegraAberto && regraEmEdicao && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-sm shadow-2xl relative p-6">
            <button
              onClick={() => setModalRegraAberto(false)}
              className="absolute right-4 top-4 text-gray-500 hover:text-white"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
              <Edit2 className="text-orange-500" size={20} /> Editar Limites
            </h2>
            <p className="text-xs text-gray-500 mb-6 uppercase tracking-wider">
              Setor:{" "}
              <strong className="text-white">{regraEmEdicao.setor}</strong>
            </p>

            <form onSubmit={salvarRegra} className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  LIMITE DE AUSÊNCIA SIMULTÂNEA (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={regraEmEdicao.limite_ausencia_percentual}
                  onChange={(e) =>
                    setRegraEmEdicao({
                      ...regraEmEdicao,
                      limite_ausencia_percentual: e.target.value,
                    })
                  }
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-white text-sm outline-none font-bold text-orange-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  COBERTURA MÍNIMA (Nº de Pessoas)
                </label>
                <input
                  type="number"
                  min="0"
                  value={regraEmEdicao.cobertura_minima}
                  onChange={(e) =>
                    setRegraEmEdicao({
                      ...regraEmEdicao,
                      cobertura_minima: e.target.value,
                    })
                  }
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-white text-sm outline-none font-bold text-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#333] mt-2">
                <div className="col-span-2">
                  <label className="text-xs text-red-400 block font-bold">
                    PERÍODO DE FECHAMENTO
                  </label>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">
                    Dia Início
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={regraEmEdicao.dias_criticos_inicio || ""}
                    onChange={(e) =>
                      setRegraEmEdicao({
                        ...regraEmEdicao,
                        dias_criticos_inicio: e.target.value,
                      })
                    }
                    placeholder="Ex: 1"
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-white text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">
                    Dia Fim
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={regraEmEdicao.dias_criticos_fim || ""}
                    onChange={(e) =>
                      setRegraEmEdicao({
                        ...regraEmEdicao,
                        dias_criticos_fim: e.target.value,
                      })
                    }
                    placeholder="Ex: 10"
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-white text-sm outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg text-sm mt-4 shadow-lg shadow-orange-900/20 transition-colors"
              >
                SALVAR REGRAS
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
