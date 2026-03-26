import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  CheckCircle,
  XCircle,
  Clock,
  History,
  Search,
  AlertCircle,
  Plus,
  X,
  User,
  Save,
  BrainCircuit,
  CalendarDays,
  Trash2,
  Edit2,
  Eye,
  MessageSquare
} from "lucide-react";
import { format, parseISO, differenceInDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Solicitacoes() {
  const [pendentes, setPendentes] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [regrasSetor, setRegrasSetor] = useState([]);
  const [feriados, setFeriados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");

  // --- Estados do Modal de Nova Solicitação ---
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [novoColabId, setNovoColabId] = useState("");
  const [novaDataInicio, setNovaDataInicio] = useState("");
  const [novaDataFim, setNovaDataFim] = useState("");
  const [salvandoNova, setSalvandoNova] = useState(false);

  // --- Estados do Modal de ANÁLISE / SUGESTÃO ---
  const [modalAnaliseAberto, setModalAnaliseAberto] = useState(false);
  const [resultadoAnalise, setResultadoAnalise] = useState({ conflitos: [], sugestao: null });

  // --- Estados do Modal de Detalhes / Edição ---
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [solAtual, setSolAtual] = useState(null);
  const [editStatus, setEditStatus] = useState("");
  const [editObs, setEditObs] = useState("");

  // --- 1. BUSCA DE DADOS ---
  async function buscarDados() {
    try {
      setCarregando(true);
      
      const { data: sols } = await supabase
        .from("solicitacoes")
        .select(`*, colaboradores (colaborador_nome, setor)`)
        .order("created_at", { ascending: false });

      setPendentes(sols?.filter((s) => s.status === "Pendente") || []);
      setHistorico(sols?.filter((s) => s.status !== "Pendente") || []);

      const { data: colabs } = await supabase
        .from("colaboradores")
        .select("id, colaborador_nome, setor")
        .eq("status", "ativo")
        .order("colaborador_nome");
      setColaboradores(colabs || []);

      const { data: regras } = await supabase.from("regras_setor").select("*");
      setRegrasSetor(regras || []);

      const { data: feris } = await supabase.from("feriados_coletivas").select("*");
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

  const diasSelecionados = (novaDataInicio && novaDataFim) 
    ? differenceInDays(parseISO(novaDataFim), parseISO(novaDataInicio)) + 1 
    : 0;

  // --- 2. O ALGORITMO DE ANÁLISE ---
  const checarConflitos = (inicio, fim, setor) => {
    let conflitos = [];
    const dInicio = parseISO(inicio);
    const dFim = parseISO(fim);

    // Regra A: Sobreposição com Férias Coletivas ou Feriados
    const conflitoFeriado = feriados.find(f => {
      const fIni = parseISO(f.data_inicio);
      const fFim = parseISO(f.data_fim);
      return (dInicio <= fFim && dFim >= fIni);
    });
    
    if (conflitoFeriado) {
      conflitos.push(`Período cruza com: ${conflitoFeriado.titulo} (${conflitoFeriado.tipo})`);
    }

    // Regra B: Limites do Setor
    const regra = regrasSetor.find(r => r.setor === setor);
    const colabsNoSetor = colaboradores.filter(c => c.setor === setor).length;
    
    if (regra && colabsNoSetor > 0) {
      const limiteAusencia = Math.floor(colabsNoSetor * (regra.limite_ausencia_percentual / 100));
      const aprovadasSetor = historico.filter(h => h.status === 'Aprovada' && h.colaboradores?.setor === setor);
      
      let excedeuRegra = false;
      const diasTotais = differenceInDays(dFim, dInicio) + 1;

      for(let i=0; i < diasTotais; i++) {
        const diaAtual = addDays(dInicio, i);
        const ausentesHoje = aprovadasSetor.filter(a => {
          return diaAtual >= parseISO(a.data_inicio) && diaAtual <= parseISO(a.data_fim);
        }).length;

        if ((ausentesHoje + 1) > limiteAusencia || (colabsNoSetor - (ausentesHoje + 1)) < regra.cobertura_minima) {
          excedeuRegra = true;
          break;
        }
      }

      if (excedeuRegra) {
        conflitos.push(`Limites do setor excedidos (Máx. ausências: ${regra.limite_ausencia_percentual}% | Cobertura Mín: ${regra.cobertura_minima} pessoas). Já existem férias aprovadas neste período.`);
      }
    }

    return conflitos;
  };

  const processarAnalise = (sol) => {
    setSolAtual(sol);
    setModalAnaliseAberto(true);
    
    const conflitosEncontrados = checarConflitos(sol.data_inicio, sol.data_fim, sol.colaboradores?.setor);
    let novaSugestao = null;

    if (conflitosEncontrados.length > 0) {
      let dataTeste = parseISO(sol.data_inicio);
      let tentativas = 0;
      
      while (tentativas < 60) {
        dataTeste = addDays(dataTeste, 1);
        const fimTeste = addDays(dataTeste, sol.total_dias - 1);
        
        const strIni = format(dataTeste, 'yyyy-MM-dd');
        const strFim = format(fimTeste, 'yyyy-MM-dd');
        
        if (checarConflitos(strIni, strFim, sol.colaboradores?.setor).length === 0) {
          novaSugestao = { inicio: strIni, fim: strFim };
          break;
        }
        tentativas++;
      }
    }

    setResultadoAnalise({ conflitos: conflitosEncontrados, sugestao: novaSugestao });
  };

  // --- 3. AÇÕES NO BANCO DE DADOS ---
  const salvarNovaSolicitacao = async (e) => {
    e.preventDefault();
    if (!novoColabId || !novaDataInicio || !novaDataFim) return alert("Preencha todos os campos!");
    setSalvandoNova(true);
    try {
      const colabSelecionado = colaboradores.find((c) => c.id === novoColabId);
      const { error } = await supabase.from("solicitacoes").insert([{
        colaborador_id: novoColabId,
        colaborador_nome: colabSelecionado?.colaborador_nome || "",
        setor: colabSelecionado?.setor || "",
        data_inicio: novaDataInicio, 
        data_fim: novaDataFim, 
        total_dias: diasSelecionados, 
        status: "Pendente",
      }]);
      if (error) throw error;
      alert("Solicitação lançada com sucesso!");
      setModalNovoAberto(false); 
      setNovoColabId(""); setNovaDataInicio(""); setNovaDataFim("");
      buscarDados();
    } catch (error) { 
      alert("Erro ao salvar: " + error.message); 
    } finally { 
      setSalvandoNova(false); 
    }
  };

  const decidirSolicitacao = async (sol, novoStatus, obs = null) => {
    const acaoTexto = novoStatus === 'Sugerida' ? 'enviar sugestão' : novoStatus.toLowerCase();
    if (!confirm(`Deseja ${acaoTexto} para esta solicitação?`)) return;

    try {
      const usuarioLogado = "Gestor (Admin)";
      
      const { error: errUpdate } = await supabase
        .from("solicitacoes")
        .update({ 
          status: novoStatus, 
          observacao: obs, 
          updated_at: new Date().toISOString(), 
          aprovado_por: usuarioLogado 
        })
        .eq("id", sol.id);

      if (errUpdate) throw errUpdate;

      // Gestão do saldo
      if (sol.status === "Aprovada" && novoStatus !== "Aprovada") {
        await supabase.rpc("estornar_saldo_individual", { id_colab: sol.colaborador_id, dias: sol.total_dias });
      } else if (sol.status !== "Aprovada" && novoStatus === "Aprovada") {
        await supabase.rpc("abater_saldo_individual", { id_colab: sol.colaborador_id, dias: sol.total_dias });
      }

      alert(novoStatus === 'Sugerida' ? 'Sugestão enviada com sucesso!' : `Solicitação ${novoStatus}!`);
      setModalAnaliseAberto(false);
      setModalDetalhesAberto(false);
      buscarDados();
    } catch (error) {
      alert("Erro ao processar: " + error.message);
    }
  };

  // --- 4. CRUD DO HISTÓRICO ---
  const abrirDetalhes = (sol) => {
    setSolAtual(sol);
    setEditStatus(sol.status);
    setEditObs(sol.observacao || "");
    setModalDetalhesAberto(true);
  };

  const excluirHistorico = async (sol) => {
    if (!confirm(`CUIDADO: Tem a certeza que deseja excluir o registo de ${sol.colaborador_nome}?`)) return;
    try {
      if (sol.status === "Aprovada") {
        await supabase.rpc("estornar_saldo_individual", { id_colab: sol.colaborador_id, dias: sol.total_dias });
      }
      await supabase.from("solicitacoes").delete().eq("id", sol.id);
      alert("Registo excluído com sucesso!");
      setModalDetalhesAberto(false);
      buscarDados();
    } catch (error) {
      alert("Erro ao excluir: " + error.message);
    }
  };

  const salvarEdicaoHistorico = async () => {
    if (!confirm("Confirmar alterações neste registo?")) return;
    try {
      if (solAtual.status === "Aprovada" && editStatus !== "Aprovada") {
        await supabase.rpc("estornar_saldo_individual", { id_colab: solAtual.colaborador_id, dias: solAtual.total_dias });
      } else if (solAtual.status !== "Aprovada" && editStatus === "Aprovada") {
        await supabase.rpc("abater_saldo_individual", { id_colab: solAtual.colaborador_id, dias: solAtual.total_dias });
      }

      await supabase.from("solicitacoes").update({
        status: editStatus,
        observacao: editObs,
        updated_at: new Date().toISOString()
      }).eq("id", solAtual.id);

      alert("Registo atualizado com sucesso!");
      setModalDetalhesAberto(false);
      buscarDados();
    } catch (error) {
      alert("Erro ao guardar edição: " + error.message);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto text-white">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="text-orange-500" /> Centro de Operações
          </h1>
          <p className="text-gray-500 text-sm tracking-tight">Análise de regras, gestão e aprovações</p>
        </div>

        <button
          onClick={() => setModalNovoAberto(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase px-6 py-3.5 rounded-xl flex items-center gap-2 transition-all shadow-lg active:scale-95"
        >
          <Plus size={18} /> Nova Solicitação
        </button>
      </header>

      {/* PENDÊNCIAS - LISTA COMPACTA */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-yellow-500" size={20} />
            <h2 className="text-lg font-bold uppercase tracking-widest">Pendências ({pendentes.length})</h2>
          </div>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Ações rápidas</span>
        </div>

        {carregando ? (
          <p className="animate-pulse text-gray-500 text-xs font-mono uppercase text-center p-10">A Sincronizar Base de Dados...</p>
        ) : pendentes.length === 0 ? (
          <div className="bg-[#111] border border-dashed border-[#222] p-10 rounded-2xl text-center text-gray-600 text-sm">
            Nenhuma pendência no momento. Tudo em dia!
          </div>
        ) : (
          <div className="space-y-2">
            {pendentes.map((sol) => (
              <div key={sol.id} className="bg-[#111] border border-[#222] p-3 pl-5 rounded-2xl hover:border-orange-500/30 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center text-orange-500 font-bold border border-[#333] shrink-0">
                    {sol.colaboradores?.colaborador_nome?.charAt(0)}
                  </div>
                  <div className="truncate">
                    <h3 className="font-bold text-sm uppercase truncate text-white leading-tight">{sol.colaboradores?.colaborador_nome}</h3>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-tighter">{sol.colaboradores?.setor}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8 px-4 py-2 bg-[#161616] rounded-xl border border-[#222] md:min-w-[300px] justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-500 font-bold uppercase">Período</span>
                    <span className="text-xs font-medium text-gray-300">
                      {format(parseISO(sol.data_inicio), "dd/MM/yy")} — {format(parseISO(sol.data_fim), "dd/MM/yy")}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-gray-500 font-bold uppercase block">Total</span>
                    <span className="text-sm font-black text-orange-500">{sol.total_dias} dias</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => decidirSolicitacao(sol, "Aprovada")} className="h-10 px-4 bg-green-600/10 hover:bg-green-600 text-green-500 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 border border-green-600/20" title="Aprovar">
                    <CheckCircle size={14} /> <span className="hidden sm:inline">Aprovar</span>
                  </button>

                  <button onClick={() => processarAnalise(sol)} className="h-10 px-4 bg-purple-600/10 hover:bg-purple-600 text-purple-500 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 border border-purple-600/20" title="Analisar Regras do Sistema">
                    <BrainCircuit size={14} /> <span className="hidden sm:inline">Analisar</span>
                  </button>

                  <button onClick={() => decidirSolicitacao(sol, "Reprovada")} className="h-10 px-4 bg-red-600/5 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1.5 border border-red-600/10" title="Negar">
                    <XCircle size={14} /> <span className="hidden sm:inline">Negar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* HISTÓRICO */}
      <section>
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <h2 className="text-lg font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2"><History size={20} /> Histórico</h2>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-600" size={16} />
            <input type="text" placeholder="Filtrar histórico..." value={busca} onChange={(e) => setBusca(e.target.value)} className="bg-[#111] border border-[#222] rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none focus:border-orange-500 w-64 transition-all" />
          </div>
        </div>
        
        <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-[#161616] border-b border-[#222] text-[10px] uppercase text-gray-500 tracking-widest">
              <tr>
                <th className="p-4">Colaborador</th>
                <th className="p-4 text-center">Dias</th>
                <th className="p-4 text-center">Data / Resp.</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {historico.filter(h => h.colaboradores?.colaborador_nome?.toLowerCase().includes(busca.toLowerCase())).map((item) => (
                <tr 
                  key={item.id} 
                  onClick={() => abrirDetalhes(item)}
                  className="hover:bg-[#1a1a1a] transition-colors text-sm group cursor-pointer"
                  title="Clique para ver detalhes ou editar"
                >
                  <td className="p-4">
                    <p className="font-bold uppercase leading-none group-hover:text-orange-500 transition-colors flex items-center gap-2">
                      {item.colaboradores?.colaborador_nome} <Eye size={14} className="opacity-0 group-hover:opacity-100 text-orange-500" />
                    </p>
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-tighter mt-1">{item.colaboradores?.setor}</p>
                    {item.observacao && (
                      <p className="text-[10px] text-blue-500/80 mt-2 bg-blue-900/10 p-1.5 rounded inline-block border border-blue-900/30">
                        Obs: {item.observacao}
                      </p>
                    )}
                  </td>
                  <td className="p-4 text-center font-mono text-gray-400">{item.total_dias}d</td>
                  <td className="p-4 text-center">
                    <p className="text-[10px] text-gray-300 font-bold">{item.updated_at ? format(parseISO(item.updated_at), "dd/MM/yy", { locale: ptBR }) : "---"}</p>
                    {item.aprovado_por && <p className="text-[9px] text-gray-600 font-black uppercase tracking-tighter mt-1">Por: {item.aprovado_por}</p>}
                  </td>
                  <td className="p-4 text-right">
                    <span className={`text-[9px] font-black px-2 py-1 rounded border uppercase ${
                      item.status === "Aprovada" ? "border-green-900/50 text-green-500 bg-green-500/5" : 
                      item.status === "Reprovada" ? "border-red-900/50 text-red-500 bg-red-500/5" :
                      "border-blue-900/50 text-blue-500 bg-blue-500/5"
                    }`}>{item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL: NOVA SOLICITAÇÃO */}
      {modalNovoAberto && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-[#222] rounded-3xl w-full max-w-md p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <button onClick={() => setModalNovoAberto(false)} className="absolute right-6 top-6 text-gray-500 hover:text-white"><X size={20} /></button>
            <h2 className="text-xl font-bold mb-1 flex items-center gap-2"><Plus className="text-orange-500" /> Nova Solicitação</h2>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-8">Lançamento manual para aprovação</p>
            
            <form onSubmit={salvarNovaSolicitacao} className="space-y-5">
              <div>
                <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block tracking-widest">Colaborador Ativo</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-3.5 text-gray-600" />
                  <select value={novoColabId} onChange={(e) => setNovoColabId(e.target.value)} className="w-full bg-[#1a1a1a] border border-[#333] p-3.5 pl-10 rounded-xl text-sm outline-none focus:border-orange-500 [color-scheme:dark] appearance-none cursor-pointer">
                    <option value="">Selecione na lista...</option>
                    {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.colaborador_nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block tracking-widest">Início</label>
                  <input type="date" value={novaDataInicio} onChange={(e) => setNovaDataInicio(e.target.value)} className="w-full bg-[#1a1a1a] border border-[#333] p-3.5 rounded-xl text-sm outline-none focus:border-orange-500 [color-scheme:dark]" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block tracking-widest">Fim</label>
                  <input type="date" value={novaDataFim} onChange={(e) => setNovaDataFim(e.target.value)} className="w-full bg-[#1a1a1a] border border-[#333] p-3.5 rounded-xl text-sm outline-none focus:border-orange-500 [color-scheme:dark]" />
                </div>
              </div>
              {diasSelecionados > 0 && <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex justify-between items-center text-orange-500 font-black font-mono"><span>TOTAL CALCULADO:</span> <span>{diasSelecionados} DIAS</span></div>}
              <button type="submit" disabled={salvandoNova} className="w-full bg-orange-600 hover:bg-orange-700 py-4 rounded-2xl font-black uppercase tracking-widest flex justify-center items-center gap-2 mt-2">{salvandoNova ? "A PROCESSAR..." : "CADASTRAR SOLICITAÇÃO"}</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ANÁLISE DO SISTEMA */}
      {modalAnaliseAberto && solAtual && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-[#222] rounded-3xl w-full max-w-lg p-8 relative shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setModalAnaliseAberto(false)} className="absolute right-6 top-6 text-gray-500 hover:text-white"><X size={20} /></button>
            
            <h2 className="text-xl font-bold mb-1 flex items-center gap-2 text-purple-500"><BrainCircuit /> Análise do Sistema</h2>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-6">Verificação de regras e limites do setor</p>

            <div className="bg-[#161616] p-4 rounded-xl border border-[#333] mb-6">
              <p className="text-sm font-bold uppercase">{solAtual.colaboradores?.colaborador_nome}</p>
              <p className="text-xs text-gray-400 mt-1">
                Data Pedida: <span className="text-white font-bold">{format(parseISO(solAtual.data_inicio), "dd/MM/yyyy")}</span> a <span className="text-white font-bold">{format(parseISO(solAtual.data_fim), "dd/MM/yyyy")}</span>
              </p>
            </div>

            {resultadoAnalise.conflitos.length > 0 ? (
              <div>
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-6">
                  <h3 className="text-xs font-black text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2"><AlertCircle size={14} /> Conflitos Encontrados:</h3>
                  <ul className="list-disc list-inside text-xs text-red-200 space-y-1 ml-2">
                    {resultadoAnalise.conflitos.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>

                <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl mb-6">
                  <h3 className="text-xs font-black text-purple-500 uppercase tracking-widest mb-2 flex items-center gap-2"><CalendarDays size={14} /> Sugestão do Sistema:</h3>
                  {resultadoAnalise.sugestao ? (
                    <p className="text-sm text-purple-200">
                      Próxima janela viável de <strong className="text-purple-400">{solAtual.total_dias} dias</strong>: <br/>
                      <span className="text-xl font-black text-purple-400 font-mono mt-1 block">
                        {format(parseISO(resultadoAnalise.sugestao.inicio), "dd/MM/yy")} até {format(parseISO(resultadoAnalise.sugestao.fim), "dd/MM/yy")}
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">Não foi possível encontrar uma janela viável nos próximos 60 dias.</p>
                  )}
                </div>

                {resultadoAnalise.sugestao && (
                  <button 
                    onClick={() => decidirSolicitacao(
                      solAtual, 
                      "Sugerida", 
                      `O sistema sugeriu nova data: ${format(parseISO(resultadoAnalise.sugestao.inicio), "dd/MM/yy")} a ${format(parseISO(resultadoAnalise.sugestao.fim), "dd/MM/yy")} devido a regras do setor.`
                    )}
                    className="w-full bg-purple-600 hover:bg-purple-700 py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-purple-900/40 transition-all flex items-center justify-center gap-2"
                  >
                    <MessageSquare size={16} /> Enviar Sugestão ao Colaborador
                  </button>
                )}
              </div>
            ) : (
              <div>
                <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-xl text-center mb-6">
                  <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
                  <h3 className="text-sm font-black text-green-500 uppercase tracking-widest mb-1">Nenhum Conflito</h3>
                  <p className="text-xs text-green-200">A data atende perfeitamente a todas as regras do setor e não cruza com feriados.</p>
                </div>
                <button 
                  onClick={() => decidirSolicitacao(solAtual, "Aprovada")}
                  className="w-full bg-green-600 hover:bg-green-700 py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-green-900/40 transition-all"
                >
                  Aprovar Imediatamente
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES / EDIÇÃO DO HISTÓRICO */}
      {modalDetalhesAberto && solAtual && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-[#222] rounded-3xl w-full max-w-md p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <button onClick={() => setModalDetalhesAberto(false)} className="absolute right-6 top-6 text-gray-500 hover:text-white"><X size={20} /></button>
            
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><Eye className="text-gray-400" /> Detalhes do Registo</h2>
            </div>

            <div className="bg-[#161616] border border-[#333] rounded-2xl p-5 mb-6 space-y-4">
              <div>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Colaborador</p>
                <p className="font-bold text-sm uppercase">{solAtual.colaboradores?.colaborador_nome}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Período</p>
                  <p className="font-mono text-sm text-gray-300">{format(parseISO(solAtual.data_inicio), "dd/MM/yy")} a {format(parseISO(solAtual.data_fim), "dd/MM/yy")}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Duração</p>
                  <p className="font-mono text-sm text-orange-500 font-bold">{solAtual.total_dias} dias</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Responsável pela Ação</p>
                <p className="font-mono text-sm text-gray-400">{solAtual.aprovado_por || "Sistema / Registo Antigo"}</p>
              </div>
            </div>

            {/* ÁREA DE EDIÇÃO */}
            <div className="space-y-4 border-t border-[#222] pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold uppercase text-gray-400 flex items-center gap-2"><Edit2 size={16} /> Controlos de Edição</p>
                <button 
                  onClick={() => excluirHistorico(solAtual)}
                  className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-white bg-red-500/10 hover:bg-red-500 px-3 py-1.5 rounded-lg border border-red-500/20 transition-all flex items-center gap-1"
                >
                  <Trash2 size={12} /> Excluir Registo
                </button>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block tracking-widest">Alterar Status</label>
                <select 
                  value={editStatus} 
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] p-3 rounded-xl text-sm outline-none focus:border-orange-500 [color-scheme:dark]"
                >
                  <option value="Pendente">Retornar para Pendente</option>
                  <option value="Aprovada">Aprovada</option>
                  <option value="Reprovada">Reprovada</option>
                  <option value="Sugerida">Sugerida</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block tracking-widest">Observações Internas</label>
                <textarea 
                  value={editObs} 
                  onChange={(e) => setEditObs(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] p-3 rounded-xl text-sm outline-none focus:border-orange-500 resize-none"
                  rows="3"
                />
              </div>

              {(editStatus !== solAtual.status || editObs !== (solAtual.observacao || "")) && (
                <button 
                  onClick={salvarEdicaoHistorico}
                  className="w-full bg-orange-600 hover:bg-orange-700 py-3 rounded-xl font-black uppercase tracking-widest shadow-lg transition-all text-xs"
                >
                  Guardar Alterações
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}