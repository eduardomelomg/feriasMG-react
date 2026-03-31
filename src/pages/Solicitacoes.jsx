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
  Edit,
  Trash2,
  Calculator,
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

  // Modais
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [modalAnaliseAberto, setModalAnaliseAberto] = useState(false);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);

  // Estados de Criação
  const [novoColabId, setNovoColabId] = useState("");
  const [novaDataInicio, setNovaDataInicio] = useState("");
  const [novaDataFim, setNovaDataFim] = useState("");
  const [salvandoNova, setSalvandoNova] = useState(false);

  // Estados de Edição
  const [solAtual, setSolAtual] = useState(null);
  const [editDataInicio, setEditDataInicio] = useState("");
  const [editDataFim, setEditDataFim] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const [resultadoAnalise, setResultadoAnalise] = useState({
    conflitos: [],
    sugestao: null,
  });

  // ==========================================
  // LÓGICA DO MODAL (Usando a sua regra: Direito - Gozados)
  // ==========================================
  const colabSelecionado = colaboradores.find((c) => c.id === novoColabId);
  const diasDireito = colabSelecionado?.dias_direito ?? 30;
  const diasGozados = colabSelecionado?.dias_gozados ?? 0;
  const saldoDisponivel = diasDireito - diasGozados;

  let diasCalculados = 0;
  if (novaDataInicio && novaDataFim) {
    diasCalculados =
      differenceInDays(parseISO(novaDataFim), parseISO(novaDataInicio)) + 1;
  }
  const datasInvertidas = diasCalculados <= 0 && novaDataInicio && novaDataFim;
  const saldoInsuficiente = diasCalculados > saldoDisponivel;

  // 🛡️ ESCUDO TITÂNIO
  const formatarDataSegura = (data, formato = "dd/MM/yy") => {
    if (!data) return "---";
    try {
      const dateObj =
        typeof data === "string" ? parseISO(data) : new Date(data);
      return format(dateObj, formato, { locale: ptBR });
    } catch (err) {
      console.warn("Erro ao formatar data:", err);
      return "Data Inválida";
    }
  };

  const enviarEmailNotificacao = (sol, novoStatus, obs) => {
    const emailDestino = sol.colaboradores?.email;
    if (!emailDestino) {
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
    setCarregando(true);

    // 1. Busca Solicitações
    try {
      const { data: sols, error: errSols } = await supabase
        .from("solicitacoes")
        .select(`*, colaboradores (colaborador_nome, setor, email)`)
        .order("created_at", { ascending: false });

      if (!errSols) {
        setPendentes(sols?.filter((s) => s.status === "Pendente") || []);
        setHistorico(sols?.filter((s) => s.status !== "Pendente") || []);
      }
    } catch (error) {
      console.error("Erro fatal nas solicitações:", error);
    }

    // 2. Busca Colaboradores (trazendo sua coluna dias_direito e dias_gozados)
    try {
      const { data: colabs, error: errColabs } = await supabase
        .from("colaboradores")
        .select("*");

      if (!errColabs) {
        setColaboradores(colabs || []);
      }
    } catch (error) {
      console.error("Erro fatal nos colaboradores:", error);
    }

    // 3. Busca Regras e Feriados
    try {
      const { data: regras } = await supabase.from("regras_setor").select("*");
      setRegrasSetor(regras || []);

      const { data: feris } = await supabase
        .from("feriados_coletivas")
        .select("*");
      setFeriados(feris || []);
    } catch (error) {
      console.error("Erro nas regras/feriados:", error);
    }

    setCarregando(false);
  }

  useEffect(() => {
    buscarDados();
  }, []);

  // ==========================================
  // FUNÇÕES DO CRUD
  // ==========================================

  const salvarNovaSolicitacao = async (e) => {
    e.preventDefault();
    if (!novoColabId || !novaDataInicio || !novaDataFim)
      return alert("Preencha tudo!");
    if (datasInvertidas)
      return alert("A data de fim não pode ser antes do início!");

    setSalvandoNova(true);

    try {
      const { error } = await supabase.from("solicitacoes").insert([
        {
          colaborador_id: novoColabId,
          colaborador_nome: colabSelecionado?.colaborador_nome || "",
          setor: colabSelecionado?.setor || "",
          data_inicio: novaDataInicio,
          data_fim: novaDataFim,
          total_dias: diasCalculados,
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
      alert("Erro ao criar: " + error.message);
    } finally {
      setSalvandoNova(false);
    }
  };

  const abrirModalEditar = (sol) => {
    setSolAtual(sol);
    setEditDataInicio(sol.data_inicio || "");
    setEditDataFim(sol.data_fim || "");
    setEditStatus(sol.status || "Pendente");
    setModalEditarAberto(true);
  };

  const salvarEdicao = async (e) => {
    e.preventDefault();
    if (!editDataInicio || !editDataFim)
      return alert("As datas não podem ficar vazias!");
    setSalvandoEdicao(true);
    const dias =
      differenceInDays(parseISO(editDataFim), parseISO(editDataInicio)) + 1;

    try {
      // Ajuste Inteligente: Soma ou diminui dos dias_gozados se o status mudar
      if (editStatus !== solAtual.status) {
        const { data: colab } = await supabase
          .from("colaboradores")
          .select("dias_gozados")
          .eq("id", solAtual.colaborador_id)
          .single();
        if (colab) {
          let novosGozados = colab.dias_gozados || 0;
          if (editStatus === "Aprovada") novosGozados += dias; // Vai gozar esses dias
          if (solAtual.status === "Aprovada" && editStatus !== "Aprovada")
            novosGozados -= solAtual.total_dias; // Estorna os dias

          await supabase
            .from("colaboradores")
            .update({ dias_gozados: novosGozados })
            .eq("id", solAtual.colaborador_id);
        }
      }

      const { error } = await supabase
        .from("solicitacoes")
        .update({
          data_inicio: editDataInicio,
          data_fim: editDataFim,
          total_dias: dias,
          status: editStatus,
          updated_at: new Date().toISOString(),
          aprovado_por: usuarioLogado?.nome || "Sistema",
        })
        .eq("id", solAtual.id);

      if (error) throw error;

      if (editStatus !== solAtual.status && editStatus !== "Pendente") {
        enviarEmailNotificacao(
          solAtual,
          editStatus,
          "Solicitação alterada manualmente.",
        );
      }

      alert("Solicitação atualizada com sucesso!");
      setModalEditarAberto(false);
      buscarDados();
    } catch (error) {
      alert("Erro ao editar: " + error.message);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const excluirSolicitacao = async (id, status, colabId, totalDias) => {
    if (
      !confirm(
        "Tem certeza que deseja EXCLUIR esta solicitação? Esta ação não pode ser desfeita.",
      )
    )
      return;
    try {
      // Estorna os dias_gozados se for excluída e estava aprovada
      if (status === "Aprovada") {
        const { data: colab } = await supabase
          .from("colaboradores")
          .select("dias_gozados")
          .eq("id", colabId)
          .single();
        if (colab) {
          const gozadosDevolvidos = (colab.dias_gozados || 0) - totalDias;
          await supabase
            .from("colaboradores")
            .update({ dias_gozados: gozadosDevolvidos })
            .eq("id", colabId);
        }
      }

      const { error } = await supabase
        .from("solicitacoes")
        .delete()
        .eq("id", id);
      if (error) throw error;
      buscarDados();
    } catch (error) {
      alert("Erro ao excluir: " + error.message);
    }
  };

  const decidirSolicitacao = async (sol, novoStatus, obs = null) => {
    if (!confirm(`Deseja aplicar o status: ${novoStatus}?`)) return;

    try {
      // Atualizando os "dias_gozados" diretamente
      const { data: colab } = await supabase
        .from("colaboradores")
        .select("dias_gozados")
        .eq("id", sol.colaborador_id)
        .single();

      if (colab) {
        let novosGozados = colab.dias_gozados || 0;

        // Se aprovou, acrescenta os dias no saldo de gozados
        if (novoStatus === "Aprovada" && sol.status !== "Aprovada") {
          novosGozados += sol.total_dias;
        }
        // Se estava aprovada e agora foi reprovada (ESTORNO de gozados)
        else if (sol.status === "Aprovada" && novoStatus !== "Aprovada") {
          novosGozados -= sol.total_dias;
        }

        await supabase
          .from("colaboradores")
          .update({ dias_gozados: novosGozados })
          .eq("id", sol.colaborador_id);
      }

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

      alert(`Sucesso! Status atualizado para ${novoStatus}.`);
      setModalAnaliseAberto(false);
      buscarDados();
    } catch (error) {
      alert("Erro ao processar: " + error.message);
    }
  };

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
          className="bg-orange-600 px-6 py-3 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-orange-500 transition-colors"
        >
          <Plus size={18} className="inline mr-2" /> Nova Solicitação
        </button>
      </header>

      {/* PENDÊNCIAS */}
      <section className="mb-12">
        <h2 className="text-lg font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
          <AlertCircle className="text-yellow-500" /> Pendências (
          {pendentes.length})
        </h2>
        {carregando ? (
          <p className="text-center p-10 text-gray-500 animate-pulse font-black uppercase text-xs">
            Sincronizando Banco...
          </p>
        ) : pendentes.length === 0 ? (
          <p className="text-center p-10 text-gray-500 font-bold uppercase text-xs">
            Nenhuma pendência no momento.
          </p>
        ) : (
          <div className="space-y-3">
            {pendentes.map((sol) => (
              <div
                key={sol.id}
                className="bg-[#111] border border-[#222] p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
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

                <div className="flex items-center gap-6 px-4 py-2 bg-[#161616] rounded-xl border border-[#222]">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-500 font-bold uppercase">
                      Período
                    </span>
                    <span className="text-xs font-medium text-gray-300">
                      {formatarDataSegura(sol.data_inicio)} —{" "}
                      {formatarDataSegura(sol.data_fim)}
                    </span>
                  </div>
                  <div className="text-right border-l border-[#333] pl-4">
                    <span className="text-[9px] text-gray-500 font-bold uppercase block">
                      Total
                    </span>
                    <span className="text-sm font-black text-orange-500">
                      {sol.total_dias || 0}d
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                  <button
                    onClick={() => decidirSolicitacao(sol, "Aprovada")}
                    title="Aprovar"
                    className="h-10 px-4 bg-green-600/10 text-green-500 hover:bg-green-600/20 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-colors"
                  >
                    <CheckCircle size={14} /> Aprovar
                  </button>
                  <button
                    onClick={() => processarAnalise(sol)}
                    title="Analisar IA"
                    className="h-10 px-4 bg-purple-600/10 text-purple-500 hover:bg-purple-600/20 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-colors"
                  >
                    <BrainCircuit size={14} /> Analisar
                  </button>
                  <button
                    onClick={() => decidirSolicitacao(sol, "Reprovada")}
                    title="Reprovar"
                    className="h-10 px-4 bg-red-600/5 text-red-500 hover:bg-red-600/20 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-colors"
                  >
                    <XCircle size={14} /> Negar
                  </button>

                  <div className="w-px h-8 bg-[#333] mx-1"></div>

                  <button
                    onClick={() => abrirModalEditar(sol)}
                    title="Alterar/Editar"
                    className="h-10 w-10 flex items-center justify-center bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 rounded-xl transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() =>
                      excluirSolicitacao(
                        sol.id,
                        sol.status,
                        sol.colaborador_id,
                        sol.total_dias,
                      )
                    }
                    title="Excluir"
                    className="h-10 w-10 flex items-center justify-center bg-gray-800 text-gray-500 hover:bg-red-900/40 hover:text-red-500 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* HISTÓRICO */}
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
              placeholder="Buscar no histórico..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-[#111] border border-[#222] rounded-xl py-2 pl-10 pr-4 text-xs outline-none w-64 focus:border-orange-500 transition-colors"
            />
          </div>
        </div>
        <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#161616] border-b border-[#222] text-[10px] uppercase text-gray-500">
              <tr>
                <th className="p-4">Colaborador</th>
                <th className="p-4 text-center">Dias / Período</th>
                <th className="p-4 text-center">Decisão em / Por</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Ação</th>
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
                    className="hover:bg-[#141414] text-sm group transition-colors"
                  >
                    <td className="p-4">
                      <p className="font-bold uppercase leading-none">
                        {item.colaboradores?.colaborador_nome || "Desconhecido"}
                      </p>
                      <p className="text-[10px] text-gray-600 font-bold uppercase mt-1">
                        {item.colaboradores?.setor || "-"}
                      </p>
                    </td>
                    <td className="p-4 text-center">
                      <p className="font-mono text-gray-300 font-bold">
                        {item.total_dias || 0}d
                      </p>
                      <p className="text-[9px] text-gray-600 font-bold tracking-wider mt-1">
                        {formatarDataSegura(item.data_inicio)} à{" "}
                        {formatarDataSegura(item.data_fim)}
                      </p>
                    </td>
                    <td className="p-4 text-center">
                      <p className="text-[10px] text-gray-300 font-bold">
                        {formatarDataSegura(item.updated_at, "dd/MM/yy HH:mm")}
                      </p>
                      <p className="text-[9px] text-orange-500 font-black uppercase mt-1">
                        {item.aprovado_por || "SISTEMA"}
                      </p>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`text-[9px] font-black px-2 py-1 rounded border uppercase tracking-widest ${item.status === "Aprovada" ? "border-green-900/50 text-green-500 bg-green-900/10" : "border-red-900/50 text-red-500 bg-red-900/10"}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => abrirModalEditar(item)}
                        className="p-2 text-gray-600 hover:text-blue-500 transition-colors inline-block mr-2"
                        title="Alterar Solicitação"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() =>
                          excluirSolicitacao(
                            item.id,
                            item.status,
                            item.colaborador_id,
                            item.total_dias,
                          )
                        }
                        className="p-2 text-gray-600 hover:text-red-500 transition-colors inline-block"
                        title="Apagar Registro e Estornar Dias Gozados"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {historico.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-xs font-bold uppercase tracking-widest">
              Nenhum histórico encontrado.
            </div>
          )}
        </div>
      </section>

      {/* ========================================== */}
      {/* MODAL NOVA SOLICITAÇÃO (Com a sua lógica de dias) */}
      {/* ========================================== */}
      {modalNovoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="bg-[#111] border border-[#222] rounded-3xl w-full max-w-md p-8 relative">
            <button
              onClick={() => setModalNovoAberto(false)}
              className="absolute right-6 top-6 text-gray-500 hover:text-white transition-colors"
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
                className="w-full bg-[#1a1a1a] border border-[#333] p-3 rounded-xl text-sm outline-none focus:border-orange-500 transition-colors"
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
                  className="w-full bg-[#1a1a1a] border border-[#333] p-3 rounded-xl text-sm [color-scheme:dark] outline-none focus:border-orange-500"
                />
                <input
                  type="date"
                  value={novaDataFim}
                  onChange={(e) => setNovaDataFim(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] p-3 rounded-xl text-sm [color-scheme:dark] outline-none focus:border-orange-500"
                />
              </div>

              {/* PAINEL INTELIGENTE (Usa Direito - Gozados) */}
              {novoColabId && novaDataInicio && novaDataFim && (
                <div
                  className={`p-4 rounded-xl border ${saldoInsuficiente || datasInvertidas ? "bg-red-900/10 border-red-900/50" : "bg-[#161616] border-[#333]"}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">
                      Direito ({diasDireito}) - Gozados ({diasGozados})
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">
                      A Pedir
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-black text-white">
                      {saldoDisponivel}{" "}
                      <span className="text-xs text-gray-500">restantes</span>
                    </span>
                    <span
                      className={`text-lg font-black ${saldoInsuficiente || datasInvertidas ? "text-red-500" : "text-orange-500"}`}
                    >
                      {diasCalculados}{" "}
                      <span className="text-xs opacity-50">dias</span>
                    </span>
                  </div>

                  {datasInvertidas && (
                    <p className="text-[10px] text-red-500 font-bold uppercase flex items-center gap-1 mt-3">
                      <AlertCircle size={14} /> Datas incorretas!
                    </p>
                  )}
                  {saldoInsuficiente && !datasInvertidas && (
                    <p className="text-[10px] text-yellow-500 font-bold uppercase flex items-center gap-1 mt-3">
                      <AlertCircle size={14} /> Atenção: Pedido excede os dias a
                      gozar!
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={salvandoNova || datasInvertidas}
                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-colors mt-2 ${datasInvertidas ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-orange-600 hover:bg-orange-500 text-white"}`}
              >
                {salvandoNova ? "Salvando..." : "Criar Solicitação"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar/Alterar Solicitação */}
      {modalEditarAberto && solAtual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="bg-[#111] border border-[#222] rounded-3xl w-full max-w-md p-8 relative shadow-2xl shadow-blue-900/10">
            <button
              onClick={() => setModalEditarAberto(false)}
              className="absolute right-6 top-6 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-blue-500">
              <Edit size={20} /> Alterar Solicitação
            </h2>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-6">
              Colaborador:{" "}
              <span className="text-gray-300">
                {solAtual.colaboradores?.colaborador_nome}
              </span>
            </p>

            <form onSubmit={salvarEdicao} className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase ml-1 block mb-1">
                  Status Atual
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] p-3 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Aprovada">Aprovada</option>
                  <option value="Reprovada">Reprovada</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase ml-1 block mb-1">
                    Data Início
                  </label>
                  <input
                    type="date"
                    value={editDataInicio}
                    onChange={(e) => setEditDataInicio(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] p-3 rounded-xl text-sm [color-scheme:dark] outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase ml-1 block mb-1">
                    Data Fim
                  </label>
                  <input
                    type="date"
                    value={editDataFim}
                    onChange={(e) => setEditDataFim(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] p-3 rounded-xl text-sm [color-scheme:dark] outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={salvandoEdicao}
                className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-black uppercase tracking-widest mt-2 transition-colors text-white"
              >
                {salvandoEdicao ? "Atualizando..." : "Salvar Alterações"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Análise IA */}
      {modalAnaliseAberto && solAtual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="bg-[#111] border border-[#222] rounded-3xl w-full max-w-lg p-8 relative shadow-2xl shadow-purple-900/10">
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
                  <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl text-center mt-4">
                    <p className="text-xs text-purple-300 font-bold uppercase mb-2">
                      Datas Sugeridas (Sem conflitos):
                    </p>
                    <p className="text-lg font-black text-purple-400">
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
                      className="w-full bg-purple-600 hover:bg-purple-500 mt-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-colors text-white"
                    >
                      Enviar Sugestão
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle
                  size={56}
                  className="text-green-500 mx-auto mb-4"
                />
                <p className="text-green-200 mb-8 font-bold text-lg">
                  Nenhum conflito encontrado!
                </p>
                <button
                  onClick={() => decidirSolicitacao(solAtual, "Aprovada")}
                  className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-xl font-black uppercase tracking-widest transition-colors text-white"
                >
                  Aprovar Solicitação
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
