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

  const [pendentes, setPendentes] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [regrasSetor, setRegrasSetor] = useState([]);
  const [feriados, setFeriados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");

  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [novoColabId, setNovoColabId] = useState("");
  const [novaDataInicio, setNovaDataInicio] = useState("");
  const [novaDataFim, setNovaDataFim] = useState("");
  const [salvandoNova, setSalvandoNova] = useState(false);

  const [modalAnaliseAberto, setModalAnaliseAberto] = useState(false);
  const [solAtual, setSolAtual] = useState(null);
  const [resultadoAnalise, setResultadoAnalise] = useState({
    conflitos: [],
    sugestao: null,
  });

  // 🛡️ ESCUDO TITÂNIO CONTRA O ERRO 'SPLIT' (SEM AVISOS NO VS CODE)
  const formatarDataSegura = (data, formato = "dd/MM/yy") => {
    if (!data) return "---";
    try {
      // Verifica se é texto ou objeto Date para não bugar o parseISO
      const dateObj =
        typeof data === "string" ? parseISO(data) : new Date(data);
      return format(dateObj, formato, { locale: ptBR });
    } catch (err) {
      console.warn("Erro ao formatar data (ignorado):", err); // Variável usada! O linter não vai travar.
      return "Data Inválida";
    }
  };

  const enviarEmailNotificacao = (sol, novoStatus, obs) => {
    const emailDestino = sol.colaboradores?.email;
    if (!emailDestino) {
      console.warn("E-mail não encontrado. Pulando envio.");
      return;
    }

    const templateParams = {
      nome_colaborador: sol.colaboradores?.colaborador_nome || "Colaborador",
      to_email: emailDestino,
      status: novoStatus.toUpperCase(),
      data_inicio: formatarDataSegura(sol.data_inicio, "dd/MM/yyyy"),
      data_fimm: formatarDataSegura(sol.data_fim, "dd/MM/yyyy"),
      observacao: obs || "Sem observações adicionais.",
      gestor_nome: usuarioLogado?.nome || "Gestão",
    };

    emailjs
      .send(
        "service_11757ik",
        "template_rh69u4f",
        templateParams,
        "fsICO4HR_P76kh5R5",
      )
      .then(() => console.log("Notificação enviada com sucesso!"))
      .catch((err) => console.error("Erro EmailJS:", err));
  };

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
        .select("*")
        .eq("status", "ativo");
      setColaboradores(colabs || []);

      const { data: regras } = await supabase.from("regras_setor").select("*");
      setRegrasSetor(regras || []);

      const { data: feris } = await supabase
        .from("feriados_coletivas")
        .select("*");
      setFeriados(feris || []);
    } catch (error) {
      console.error("Erro ao buscar dados:", error.message);
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

  const checarConflitos = (inicio, fim, setor) => {
    if (!inicio || !fim) return ["Datas da solicitação estão vazias."];

    let conflitos = [];
    const dInicio =
      typeof inicio === "string" ? parseISO(inicio) : new Date(inicio);
    const dFim = typeof fim === "string" ? parseISO(fim) : new Date(fim);

    const conflitoFeriado = feriados.find((f) => {
      if (!f.data_inicio || !f.data_fim) return false;
      return dInicio <= parseISO(f.data_fim) && dFim >= parseISO(f.data_inicio);
    });
    if (conflitoFeriado) conflitos.push(`Cruza com: ${conflitoFeriado.titulo}`);

    const regra = regrasSetor.find((r) => r.setor === setor);
    if (regra) {
      const colabsNoSetor = colaboradores.filter(
        (c) => c.setor === setor,
      ).length;
      const limite = Math.floor(
        colabsNoSetor * (regra.limite_ausencia_percentual / 100),
      );
      const aprovadas = historico.filter(
        (h) => h.status === "Aprovada" && h.colaboradores?.setor === setor,
      );
      let excedeu = false;
      for (let i = 0; i < differenceInDays(dFim, dInicio) + 1; i++) {
        const dia = addDays(dInicio, i);
        const ausentes = aprovadas.filter((a) => {
          if (!a.data_inicio || !a.data_fim) return false;
          return dia >= parseISO(a.data_inicio) && dia <= parseISO(a.data_fim);
        }).length;
        if (ausentes + 1 > limite) {
          excedeu = true;
          break;
        }
      }
      if (excedeu) conflitos.push(`Limite de cobertura do setor atingido.`);
    }
    return conflitos;
  };

  const processarAnalise = (sol) => {
    setSolAtual(sol);
    setModalAnaliseAberto(true);
    const conflitos = checarConflitos(
      sol.data_inicio,
      sol.data_fim,
      sol.colaboradores?.setor,
    );
    let sugestao = null;

    if (conflitos.length > 0 && sol.data_inicio) {
      let dataTeste =
        typeof sol.data_inicio === "string"
          ? parseISO(sol.data_inicio)
          : new Date(sol.data_inicio);
      for (let t = 0; t < 60; t++) {
        dataTeste = addDays(dataTeste, 1);
        const fimTeste = addDays(dataTeste, sol.total_dias - 1);
        if (
          checarConflitos(
            format(dataTeste, "yyyy-MM-dd"),
            format(fimTeste, "yyyy-MM-dd"),
            sol.colaboradores?.setor,
          ).length === 0
        ) {
          sugestao = {
            inicio: format(dataTeste, "yyyy-MM-dd"),
            fim: format(fimTeste, "yyyy-MM-dd"),
          };
          break;
        }
      }
    }
    setResultadoAnalise({ conflitos, sugestao });
  };

  const decidirSolicitacao = async (sol, novoStatus, obs = null) => {
    if (!confirm(`Deseja aplicar o status: ${novoStatus}?`)) return;

    try {
      const { error } = await supabase
        .from("solicitacoes")
        .update({
          status: novoStatus,
          observacao: obs,
          updated_at: new Date().toISOString(),
          aprovado_por: usuarioLogado?.nome || "Sistema",
          user_id: usuarioLogado?.id || null,
        })
        .eq("id", sol.id);

      if (error) throw error;

      enviarEmailNotificacao(sol, novoStatus, obs);

      if (novoStatus === "Aprovada") {
        await supabase.rpc("abater_saldo_individual", {
          id_colab: sol.colaborador_id,
          dias: sol.total_dias,
        });
      }

      alert(`Sucesso! Status atualizado para ${novoStatus}.`);
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
      buscarDados();
    } catch (error) {
      alert("Erro: " + error.message);
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
        </div>
        <button
          onClick={() => setModalNovoAberto(true)}
          className="bg-orange-600 px-6 py-3 rounded-xl font-black text-xs uppercase shadow-lg"
        >
          <Plus size={18} className="inline mr-2" /> Nova Solicitação
        </button>
      </header>

      <section className="mb-12">
        <h2 className="text-lg font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
          <AlertCircle className="text-yellow-500" /> Pendências (
          {pendentes.length})
        </h2>
        {carregando ? (
          <p className="text-center p-10 text-gray-500 animate-pulse font-black uppercase text-xs">
            Sincronizando Banco...
          </p>
        ) : (
          <div className="space-y-2">
            {pendentes.map((sol) => (
              <div
                key={sol.id}
                className="bg-[#111] border border-[#222] p-3 pl-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center text-orange-500 font-bold border border-[#333]">
                    {sol.colaboradores?.colaborador_nome?.charAt(0) || "-"}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm uppercase text-white">
                      {sol.colaboradores?.colaborador_nome || "Desconhecido"}
                    </h3>
                    <p className="text-[10px] text-gray-500 font-black uppercase">
                      {sol.colaboradores?.setor || "Sem Setor"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-8 px-4 py-2 bg-[#161616] rounded-xl border border-[#222]">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-500 font-bold uppercase">
                      Período
                    </span>
                    <span className="text-xs font-medium text-gray-300">
                      {formatarDataSegura(sol.data_inicio)} —{" "}
                      {formatarDataSegura(sol.data_fim)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-gray-500 font-bold uppercase block">
                      Total
                    </span>
                    <span className="text-sm font-black text-orange-500">
                      {sol.total_dias || 0} dias
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => decidirSolicitacao(sol, "Aprovada")}
                    className="h-10 px-4 bg-green-600/10 text-green-500 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5"
                  >
                    <CheckCircle size={14} /> Aprovar
                  </button>
                  <button
                    onClick={() => processarAnalise(sol)}
                    className="h-10 px-4 bg-purple-600/10 text-purple-500 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5"
                  >
                    <BrainCircuit size={14} /> Analisar
                  </button>
                  <button
                    onClick={() => decidirSolicitacao(sol, "Reprovada")}
                    className="h-10 px-4 bg-red-600/5 text-red-500 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5"
                  >
                    <XCircle size={14} /> Negar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
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
              className="bg-[#111] border border-[#222] rounded-xl py-2 pl-10 pr-4 text-xs outline-none w-64"
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
                    className="hover:bg-[#141414] text-sm group"
                  >
                    <td className="p-4">
                      <p className="font-bold uppercase leading-none">
                        {item.colaboradores?.colaborador_nome || "Desconhecido"}
                      </p>
                      <p className="text-[10px] text-gray-600 font-bold uppercase mt-1">
                        {item.colaboradores?.setor || "-"}
                      </p>
                    </td>
                    <td className="p-4 text-center font-mono text-gray-400">
                      {item.total_dias || 0}d
                    </td>
                    <td className="p-4 text-center">
                      <p className="text-[10px] text-gray-300 font-bold">
                        {formatarDataSegura(item.updated_at, "dd/MM/yy HH:mm")}
                      </p>
                      <p className="text-[9px] text-orange-500 font-black uppercase mt-1">
                        {item.aprovado_por || "SISTEMA"}
                      </p>
                    </td>
                    <td className="p-4 text-right">
                      <span
                        className={`text-[9px] font-black px-2 py-1 rounded border uppercase ${item.status === "Aprovada" ? "border-green-900/50 text-green-500" : "border-red-900/50 text-red-500"}`}
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

      {/* Modais */}
      {modalNovoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="bg-[#111] border border-[#222] rounded-3xl w-full max-w-md p-8 relative">
            <button
              onClick={() => setModalNovoAberto(false)}
              className="absolute right-6 top-6 text-gray-500"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Plus className="text-orange-500" /> Nova Solicitação
            </h2>
            <form onSubmit={salvarNovaSolicitacao} className="space-y-4">
              <select
                value={novoColabId}
                onChange={(e) => setNovoColabId(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] p-3 rounded-xl text-sm"
              >
                <option value="">Selecione o Colaborador...</option>
                {colaboradores.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.colaborador_nome}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  value={novaDataInicio}
                  onChange={(e) => setNovaDataInicio(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] p-3 rounded-xl text-sm [color-scheme:dark]"
                />
                <input
                  type="date"
                  value={novaDataFim}
                  onChange={(e) => setNovaDataFim(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] p-3 rounded-xl text-sm [color-scheme:dark]"
                />
              </div>
              <button
                type="submit"
                disabled={salvandoNova}
                className="w-full bg-orange-600 py-4 rounded-xl font-black uppercase"
              >
                {salvandoNova ? "Salvando..." : "Criar Solicitação"}
              </button>
            </form>
          </div>
        </div>
      )}

      {modalAnaliseAberto && solAtual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="bg-[#111] border border-[#222] rounded-3xl w-full max-w-lg p-8 relative">
            <button
              onClick={() => setModalAnaliseAberto(false)}
              className="absolute right-6 top-6 text-gray-500"
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
                    Conflitos:
                  </h3>
                  <ul className="text-xs text-red-200 list-disc ml-4">
                    {resultadoAnalise.conflitos.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
                {resultadoAnalise.sugestao && (
                  <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl text-center">
                    <p className="text-sm font-black text-purple-400">
                      {formatarDataSegura(resultadoAnalise.sugestao.inicio)} —{" "}
                      {formatarDataSegura(resultadoAnalise.sugestao.fim)}
                    </p>
                    <button
                      onClick={() =>
                        decidirSolicitacao(
                          solAtual,
                          "Sugerida",
                          "Sugestão automática",
                        )
                      }
                      className="w-full bg-purple-600 mt-4 py-3 rounded-xl font-black text-xs uppercase"
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
                  Solicitação aprovada!
                </p>
                <button
                  onClick={() => decidirSolicitacao(solAtual, "Aprovada")}
                  className="w-full bg-green-600 py-4 rounded-xl font-black uppercase"
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
