import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import emailjs from "@emailjs/browser";
import {
  CheckCircle,
  XCircle,
  Clock,
  History,
  Search,
  AlertCircle,
  Plus,
  X,
  BrainCircuit,
  CalendarDays,
} from "lucide-react";
import { format, parseISO, differenceInDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Solicitacoes() {
  const { usuarioLogado } = useAuth();

  // Estados de Dados
  const [pendentes, setPendentes] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [regrasSetor, setRegrasSetor] = useState([]);
  const [feriados, setFeriados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");

  // Estados do Modal de Nova Solicitação
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [novoColabId, setNovoColabId] = useState("");
  const [novaDataInicio, setNovaDataInicio] = useState("");
  const [novaDataFim, setNovaDataFim] = useState("");
  const [salvandoNova, setSalvandoNova] = useState(false);

  // Estados do Modal de Análise
  const [modalAnaliseAberto, setModalAnaliseAberto] = useState(false);
  const [solAtual, setSolAtual] = useState(null);
  const [resultadoAnalise, setResultadoAnalise] = useState({
    conflitos: [],
    sugestao: null,
  });

  // --- 1. FUNÇÃO DE ENVIO DE E-MAIL ---
  const enviarEmailNotificacao = (sol, novoStatus, obs) => {
    const emailDestino = sol.colaboradores?.email;
    if (!emailDestino) return console.warn("E-mail não encontrado.");

    const templateParams = {
      nome_colaborador: sol.colaboradores?.colaborador_nome,
      to_email: emailDestino,
      status: novoStatus.toUpperCase(),
      data_inicio: format(parseISO(sol.data_inicio), "dd/MM/yyyy"),
      data_fim: format(parseISO(sol.data_fim), "dd/MM/yyyy"),
      observacao: obs || "Sem observações adicionais.",
      gestor: usuarioLogado?.nome || "Administração Mendonça Galvão",
    };

    // SUBSTITUA PELOS SEUS IDS DO EMAILJS
    emailjs
      .send("service_id", "template_id", templateParams, "public_key")
      .then(() => console.log("Notificação enviada com sucesso!"))
      .catch((err) => console.error("Erro ao enviar e-mail:", err));
  };

  // --- 2. BUSCA DE DADOS ---
  async function buscarDados() {
    try {
      setCarregando(true);
      const { data: sols, error: errSols } = await supabase
        .from("solicitacoes")
        .select(`*, colaboradores (colaborador_nome, setor, email)`)
        .order("created_at", { ascending: false });
      if (errSols) throw errSols;

      setPendentes(sols?.filter((s) => s.status === "Pendente") || []);
      setHistorico(sols?.filter((s) => s.status !== "Pendente") || []);

      const { data: colabs } = await supabase
        .from("colaboradores")
        .select("id, colaborador_nome, setor, email")
        .eq("status", "ativo")
        .order("colaborador_nome");
      setColaboradores(colabs || []);

      const { data: regras } = await supabase.from("regras_setor").select("*");
      setRegrasSetor(regras || []);

      const { data: feris } = await supabase
        .from("feriados_coletivas")
        .select("*");
      setFeriados(feris || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    buscarDados();
  }, []);

  const diasSelecionados =
    novaDataInicio && novaDataFim
      ? differenceInDays(parseISO(novaDataFim), parseISO(novaDataInicio)) + 1
      : 0;

  // --- 3. ALGORITMO DE ANÁLISE ---
  const checarConflitos = (inicio, fim, setor) => {
    let conflitos = [];
    const dInicio = parseISO(inicio);
    const dFim = parseISO(fim);

    const conflitoFeriado = feriados.find((f) => {
      const fIni = parseISO(f.data_inicio);
      const fFim = parseISO(f.data_fim);
      return dInicio <= fFim && dFim >= fIni;
    });
    if (conflitoFeriado)
      conflitos.push(`Período cruza com: ${conflitoFeriado.titulo}`);

    const regra = regrasSetor.find((r) => r.setor === setor);
    const colabsNoSetor = colaboradores.filter((c) => c.setor === setor).length;

    if (regra && colabsNoSetor > 0) {
      const limiteAusencia = Math.floor(
        colabsNoSetor * (regra.limite_ausencia_percentual / 100),
      );
      const aprovadasSetor = historico.filter(
        (h) => h.status === "Aprovada" && h.colaboradores?.setor === setor,
      );
      let excedeuRegra = false;
      for (let i = 0; i < differenceInDays(dFim, dInicio) + 1; i++) {
        const diaAtual = addDays(dInicio, i);
        const ausentesHoje = aprovadasSetor.filter(
          (a) =>
            diaAtual >= parseISO(a.data_inicio) &&
            diaAtual <= parseISO(a.data_fim),
        ).length;
        if (
          ausentesHoje + 1 > limiteAusencia ||
          colabsNoSetor - (ausentesHoje + 1) < regra.cobertura_minima
        ) {
          excedeuRegra = true;
          break;
        }
      }
      if (excedeuRegra)
        conflitos.push(`Limites de cobertura do setor atingidos.`);
    }
    return conflitos;
  };

  const processarAnalise = (sol) => {
    setSolAtual(sol);
    setModalAnaliseAberto(true);
    const conflitosEncontrados = checarConflitos(
      sol.data_inicio,
      sol.data_fim,
      sol.colaboradores.setor,
    );
    let novaSugestao = null;

    if (conflitosEncontrados.length > 0) {
      let dataTeste = parseISO(sol.data_inicio);
      for (let t = 0; t < 60; t++) {
        dataTeste = addDays(dataTeste, 1);
        const fimTeste = addDays(dataTeste, sol.total_dias - 1);
        if (
          checarConflitos(
            format(dataTeste, "yyyy-MM-dd"),
            format(fimTeste, "yyyy-MM-dd"),
            sol.colaboradores.setor,
          ).length === 0
        ) {
          novaSugestao = {
            inicio: format(dataTeste, "yyyy-MM-dd"),
            fim: format(fimTeste, "yyyy-MM-dd"),
          };
          break;
        }
      }
    }
    setResultadoAnalise({
      conflitos: conflitosEncontrados,
      sugestao: novaSugestao,
    });
  };

  // --- 4. AÇÕES NO BANCO DE DADOS ---
  const decidirSolicitacao = async (sol, novoStatus, obs = null) => {
    const acaoTexto =
      novoStatus === "Sugerida" ? "enviar sugestão" : novoStatus.toLowerCase();
    if (!confirm(`Deseja ${acaoTexto} para esta solicitação?`)) return;

    try {
      const dadosUpdate = {
        status: novoStatus,
        observacao: obs,
        updated_at: new Date().toISOString(),
        aprovado_por: usuarioLogado?.nome || "Sistema",
        user_id: usuarioLogado?.id || null,
      };

      const { error: errUpdate } = await supabase
        .from("solicitacoes")
        .update(dadosUpdate)
        .eq("id", sol.id);

      if (errUpdate) throw errUpdate;

      enviarEmailNotificacao(sol, novoStatus, obs);

      if (novoStatus === "Aprovada") {
        await supabase.rpc("abater_saldo_individual", {
          id_colab: sol.colaborador_id,
          dias: sol.total_dias,
        });
      }

      alert(`Sucesso! Colaborador notificado.`);
      setModalAnaliseAberto(false);
      buscarDados();
    } catch (error) {
      alert("Erro ao processar: " + error.message);
    }
  };

  const salvarNovaSolicitacao = async (e) => {
    e.preventDefault();
    if (!novoColabId || !novaDataInicio || !novaDataFim)
      return alert("Preencha tudo!");
    setSalvandoNova(true);
    try {
      const colab = colaboradores.find((c) => c.id === novoColabId);
      const { error } = await supabase.from("solicitacoes").insert([
        {
          colaborador_id: novoColabId,
          colaborador_nome: colab?.colaborador_nome || "",
          setor: colab?.setor || "",
          data_inicio: novaDataInicio,
          data_fim: novaDataFim,
          total_dias: diasSelecionados,
          status: "Pendente",
          created_at: new Date().toISOString(),
        },
      ]);
      if (error) throw error;
      setModalNovoAberto(false);
      setNovoColabId("");
      setNovaDataInicio("");
      setNovaDataFim("");
      buscarDados();
    } catch (error) {
      alert(error.message);
    } finally {
      setSalvandoNova(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto text-white">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="text-orange-500" /> Centro de Operações
          </h1>
          <p className="text-gray-500 text-sm tracking-tight leading-tight uppercase opacity-80">
            Mendonça Galvão — Gestão de Férias
          </p>
        </div>

        <button
          onClick={() => setModalNovoAberto(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase px-6 py-3.5 rounded-xl flex items-center gap-2 transition-all shadow-lg active:scale-95"
        >
          <Plus size={18} /> Nova Solicitação
        </button>
      </header>

      {/* PENDÊNCIAS */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <AlertCircle className="text-yellow-500" size={20} />
          <h2 className="text-lg font-bold uppercase tracking-widest">
            Pendências ({pendentes.length})
          </h2>
        </div>

        {carregando ? (
          <p className="text-center p-10 text-gray-500 animate-pulse uppercase text-[10px] font-black">
            Sincronizando Banco...
          </p>
        ) : (
          <div className="space-y-2">
            {pendentes.map((sol) => (
              <div
                key={sol.id}
                className="bg-[#111] border border-[#222] p-3 pl-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-orange-500/30 transition-all"
              >
                <div className="flex items-center gap-4 flex-1 truncate">
                  <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center text-orange-500 font-bold border border-[#333] shrink-0">
                    {sol.colaboradores?.colaborador_nome?.charAt(0)}
                  </div>
                  <div className="truncate">
                    <h3 className="font-bold text-sm uppercase text-white truncate">
                      {sol.colaboradores?.colaborador_nome}
                    </h3>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-tighter">
                      {sol.colaboradores?.setor}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-8 px-4 py-2 bg-[#161616] rounded-xl border border-[#222] md:min-w-[300px] justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-500 font-bold uppercase">
                      Período
                    </span>
                    <span className="text-xs font-medium text-gray-300">
                      {format(parseISO(sol.data_inicio), "dd/MM/yy")} —{" "}
                      {format(parseISO(sol.data_fim), "dd/MM/yy")}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-gray-500 font-bold uppercase block">
                      Total
                    </span>
                    <span className="text-sm font-black text-orange-500">
                      {sol.total_dias} dias
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => decidirSolicitacao(sol, "Aprovada")}
                    className="h-10 px-4 bg-green-600/10 hover:bg-green-600 text-green-500 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 border border-green-600/20"
                  >
                    <CheckCircle size={14} /> Aprovar
                  </button>
                  <button
                    onClick={() => processarAnalise(sol)}
                    className="h-10 px-4 bg-purple-600/10 hover:bg-purple-600 text-purple-500 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 border border-purple-600/20"
                  >
                    <BrainCircuit size={14} /> Analisar
                  </button>
                  <button
                    onClick={() => decidirSolicitacao(sol, "Reprovada")}
                    className="h-10 px-4 bg-red-600/5 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 border border-red-600/10"
                  >
                    <XCircle size={14} /> Negar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* HISTÓRICO */}
      <section>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <h2 className="text-lg font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <History size={20} /> Histórico
          </h2>
          <div className="relative">
            <Search
              className="absolute left-3 top-2.5 text-gray-600"
              size={16}
            />
            <input
              type="text"
              placeholder="Buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-[#111] border border-[#222] rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none focus:border-orange-500 w-64 transition-all"
            />
          </div>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#161616] border-b border-[#222] text-[10px] uppercase text-gray-500">
              <tr>
                <th className="p-4">Colaborador</th>
                <th className="p-4 text-center">Dias</th>
                <th className="p-4 text-center">Decisão em / Por</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {historico
                .filter((h) =>
                  h.colaboradores?.colaborador_nome
                    ?.toLowerCase()
                    .includes(busca.toLowerCase()),
                )
                .map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[#141414] transition-colors text-sm group"
                  >
                    <td className="p-4">
                      <p className="font-bold uppercase leading-none">
                        {item.colaboradores?.colaborador_nome}
                      </p>
                      <p className="text-[10px] text-gray-600 font-bold uppercase mt-1 tracking-tighter">
                        {item.colaboradores?.setor}
                      </p>
                    </td>
                    <td className="p-4 text-center font-mono text-gray-400">
                      {item.total_dias}d
                    </td>
                    <td className="p-4 text-center">
                      <p className="text-[10px] text-gray-300 font-bold">
                        {item.updated_at
                          ? format(
                              parseISO(item.updated_at),
                              "dd/MM/yy HH:mm",
                              { locale: ptBR },
                            )
                          : "---"}
                      </p>
                      <p className="text-[9px] text-orange-500 font-black uppercase tracking-tighter mt-1">
                        {item.aprovado_por
                          ? `POR: ${item.aprovado_por}`
                          : "SISTEMA"}
                      </p>
                    </td>
                    <td className="p-4 text-right">
                      <span
                        className={`text-[9px] font-black px-2 py-1 rounded border uppercase ${
                          item.status === "Aprovada"
                            ? "border-green-900/50 text-green-500 bg-green-500/5"
                            : "border-red-900/50 text-red-500 bg-red-500/5"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL NOVA SOLICITAÇÃO */}
      {modalNovoAberto && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-[#111] border border-[#222] rounded-3xl w-full max-w-md p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setModalNovoAberto(false)}
              className="absolute right-6 top-6 text-gray-500 hover:text-white"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Plus className="text-orange-500" /> Nova Solicitação
            </h2>
            <form onSubmit={salvarNovaSolicitacao} className="space-y-5">
              <div>
                <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block tracking-widest">
                  Colaborador
                </label>
                <select
                  value={novoColabId}
                  onChange={(e) => setNovoColabId(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] p-3.5 rounded-xl text-sm outline-none focus:border-orange-500 [color-scheme:dark]"
                >
                  <option value="">Selecione...</option>
                  {colaboradores.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.colaborador_nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block tracking-widest">
                    Início
                  </label>
                  <input
                    type="date"
                    value={novaDataInicio}
                    onChange={(e) => setNovaDataInicio(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] p-3.5 rounded-xl text-sm outline-none focus:border-orange-500 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block tracking-widest">
                    Fim
                  </label>
                  <input
                    type="date"
                    value={novaDataFim}
                    onChange={(e) => setNovaDataFim(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] p-3.5 rounded-xl text-sm outline-none focus:border-orange-500 [color-scheme:dark]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={salvandoNova}
                className="w-full bg-orange-600 hover:bg-orange-700 py-4 rounded-2xl font-black uppercase tracking-widest transition-all"
              >
                {salvandoNova ? "LANÇANDO..." : "CRIAR SOLICITAÇÃO"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ANÁLISE */}
      {modalAnaliseAberto && solAtual && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#111] border border-[#222] rounded-3xl w-full max-w-lg p-8 relative shadow-2xl">
            <button
              onClick={() => setModalAnaliseAberto(false)}
              className="absolute right-6 top-6 text-gray-500 hover:text-white"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-purple-500">
              <BrainCircuit /> Análise IA
            </h2>

            {resultadoAnalise.conflitos.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                  <h3 className="text-xs font-black text-red-500 uppercase mb-2">
                    Conflitos Encontrados:
                  </h3>
                  <ul className="text-xs text-red-200 list-disc ml-4">
                    {resultadoAnalise.conflitos.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
                {resultadoAnalise.sugestao && (
                  <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl text-center">
                    <h3 className="text-xs font-black text-purple-500 uppercase mb-2 flex items-center justify-center gap-2">
                      <CalendarDays size={14} /> Sugestão Viável:
                    </h3>
                    <p className="text-lg font-black text-purple-400 font-mono">
                      {format(
                        parseISO(resultadoAnalise.sugestao.inicio),
                        "dd/MM/yy",
                      )}{" "}
                      —{" "}
                      {format(
                        parseISO(resultadoAnalise.sugestao.fim),
                        "dd/MM/yy",
                      )}
                    </p>
                    <button
                      onClick={() =>
                        decidirSolicitacao(
                          solAtual,
                          "Sugerida",
                          `Sugestão automática: ${resultadoAnalise.sugestao.inicio}`,
                        )
                      }
                      className="w-full bg-purple-600 hover:bg-purple-700 mt-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-purple-900/40 transition-all"
                    >
                      Enviar Sugestão
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <CheckCircle
                  size={48}
                  className="text-green-500 mx-auto mb-4"
                />
                <p className="text-green-200 mb-6 font-bold">
                  Solicitação aprovada pelas regras do sistema!
                </p>
                <button
                  onClick={() => decidirSolicitacao(solAtual, "Aprovada")}
                  className="w-full bg-green-600 hover:bg-green-700 py-4 rounded-xl font-black uppercase tracking-widest transition-all"
                >
                  Aprovar Agora
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
