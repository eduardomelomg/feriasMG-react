import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  FileText,
  Search,
  Filter,
  Edit2,
  Trash2,
  PlusCircle,
  X,
  Save,
  Brain,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import NovaSolicitacaoModal from "../components/NovaSolicitacaoModal";
import ModalSugestao from "../components/ModalSugestao";

export default function Solicitacoes() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Estados para os filtros
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  // Estados para controle dos MODAIS
  const [modalCriacaoAberto, setModalCriacaoAberto] = useState(false);
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [solicitacaoEmEdicao, setSolicitacaoEmEdicao] = useState(null);

  // Estados para os campos de EDIÇÃO
  const [dataInicioEdit, setDataInicioEdit] = useState("");
  const [dataFimEdit, setDataFimEdit] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const [modalSugestaoAberto, setModalSugestaoAberto] = useState(false);
  const [solicitacaoParaSugestao, setSolicitacaoParaSugestao] = useState(null);

  function abrirModalSugestao(item) {
    setSolicitacaoParaSugestao(item);
    setModalSugestaoAberto(true);
  }

  // --- 1. BUSCA INICIAL DE DADOS ---
  async function buscarTodasSolicitacoes() {
    try {
      setCarregando(true);
      const { data, error } = await supabase
        .from("solicitacoes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSolicitacoes(data || []);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    buscarTodasSolicitacoes();
  }, []);

  // --- 2. LÓGICA DE FILTRAGEM ---
  const solicitacoesFiltradas = solicitacoes.filter((item) => {
    const nomeBate = item.colaborador_nome
      ?.toLowerCase()
      .includes(busca.toLowerCase());

    // Normalização para comparação de status
    const statusItem = item.status?.trim().toLowerCase();
    const statusFiltro = filtroStatus.toLowerCase();
    const statusBate = filtroStatus === "todos" || statusItem === statusFiltro;

    return nomeBate && statusBate;
  });

  // --- 3. CRUD: EXCLUSÃO ---
  async function deletarSolicitacao(id) {
    if (
      !confirm(
        "Tem certeza que deseja excluir esta solicitação? Se ela estiver aprovada, o saldo do colaborador será devolvido.",
      )
    )
      return;

    try {
      // 1. Antes de excluir, precisamos saber de quem é e se estava aprovada
      const { data: item, error: erroBusca } = await supabase
        .from("solicitacoes")
        .select("*")
        .eq("id", id)
        .single();

      if (erroBusca) throw erroBusca;

      // 2. Se o status for "aprovado", precisamos estornar os dias no cadastro do colaborador
      if (item.status?.trim().toLowerCase() === "aprovado") {
        const { data: colab } = await supabase
          .from("colaboradores")
          .select("*")
          .ilike("colaborador_nome", item.colaborador_nome?.trim())
          .maybeSingle();

        if (colab) {
          // Subtrai os dias gozados (devolve ao saldo disponível)
          const novosGozados = Math.max(
            0,
            (colab.dias_gozados || 0) - item.total_dias,
          );

          await supabase
            .from("colaboradores")
            .update({ dias_gozados: novosGozados })
            .eq("id", colab.id);
        }
      }

      // 3. Agora sim, exclui a solicitação do banco
      const { error: erroDelete } = await supabase
        .from("solicitacoes")
        .delete()
        .eq("id", id);

      if (erroDelete) throw erroDelete;

      // 4. Atualiza a interface
      setSolicitacoes(solicitacoes.filter((s) => s.id !== id));
      alert("Solicitação excluída e saldo atualizado!");
    } catch (error) {
      console.error(error);
      alert("Erro ao processar exclusão: " + error.message);
    }
  }

  // --- 4. GESTÃO DE STATUS E SALDO ---
  async function aprovarSolicitacao(item) {
    const nomeBusca = item.colaborador_nome?.trim();
    if (!confirm(`Aprovar férias de ${nomeBusca}?`)) return;

    try {
      // 1. Busca colaborador para pegar o saldo atual
      const { data: colab, error: erroBusca } = await supabase
        .from("colaboradores")
        .select("*")
        .ilike("colaborador_nome", nomeBusca)
        .maybeSingle();

      if (erroBusca) throw erroBusca;
      if (!colab)
        return alert(
          `Colaborador ${nomeBusca} não encontrado para atualizar saldo.`,
        );

      // 2. Atualiza status da solicitação
      const { error: erroUpdate } = await supabase
        .from("solicitacoes")
        .update({ status: "aprovado" })
        .eq("id", item.id);

      // 3. Atualiza dias gozados do colaborador
      const { error: erroSaldo } = await supabase
        .from("colaboradores")
        .update({
          dias_gozados: (colab.dias_gozados || 0) + item.total_dias,
        })
        .eq("id", colab.id);

      if (erroUpdate || erroSaldo)
        throw new Error("Erro ao salvar no banco de dados.");

      alert("Férias aprovadas e saldo de dias gozados atualizado!");
      buscarTodasSolicitacoes();
    } catch (error) {
      alert("Erro na aprovação: " + error.message);
    }
  }

  async function rejeitarSolicitacao(id) {
    if (!confirm("Deseja realmente recusar esta solicitação?")) return;
    try {
      const { error } = await supabase
        .from("solicitacoes")
        .update({ status: "recusado" })
        .eq("id", id);
      if (error) throw error;
      buscarTodasSolicitacoes();
    } catch (error) {
      alert("Erro ao recusar: " + error.message);
    }
  }

  async function revogarStatus(item) {
    const statusAtual = item.status?.trim().toLowerCase();
    if (statusAtual === "pendente") return;

    if (
      !confirm(
        `Revogar status "${item.status}"? Se estava aprovado, os dias gozados serão estornados.`,
      )
    )
      return;

    try {
      // Se estava aprovado, precisamos devolver os dias (subtrair dos gozados)
      if (statusAtual === "aprovado") {
        const { data: colab } = await supabase
          .from("colaboradores")
          .select("*")
          .ilike("colaborador_nome", item.colaborador_nome?.trim())
          .maybeSingle();

        if (colab) {
          await supabase
            .from("colaboradores")
            .update({
              dias_gozados: Math.max(
                0,
                (colab.dias_gozados || 0) - item.total_dias,
              ),
            })
            .eq("id", colab.id);
        }
      }

      const { error } = await supabase
        .from("solicitacoes")
        .update({ status: "pendente" })
        .eq("id", item.id);
      if (error) throw error;

      alert("Solicitação voltou para o status Pendente.");
      buscarTodasSolicitacoes();
    } catch (error) {
      alert("Erro ao revogar: " + error.message);
    }
  }

  // --- 5. CRUD: EDIÇÃO ---
  function abrirModalEdicao(solicitacao) {
    setSolicitacaoEmEdicao(solicitacao);
    setDataInicioEdit(solicitacao.data_inicio);
    setDataFimEdit(solicitacao.data_fim);
    setModalEdicaoAberto(true);
  }

  async function salvarEdicao() {
    if (!dataInicioEdit || !dataFimEdit) return alert("Preencha as datas!");
    try {
      setSalvandoEdicao(true);
      const inicio = new Date(dataInicioEdit);
      const fim = new Date(dataFimEdit);
      const totalDeDias =
        Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 3600 * 24)) + 1;

      if (totalDeDias <= 0)
        throw new Error("A data de retorno deve ser maior que o início.");

      const { error } = await supabase
        .from("solicitacoes")
        .update({
          data_inicio: dataInicioEdit,
          data_fim: dataFimEdit,
          total_dias: totalDeDias,
        })
        .eq("id", solicitacaoEmEdicao.id);

      if (error) throw error;
      alert("Solicitação atualizada!");
      buscarTodasSolicitacoes();
      setModalEdicaoAberto(false);
    } catch (error) {
      alert(error.message);
    } finally {
      setSalvandoEdicao(false);
    }
  }

  // --- FUNÇÕES AUXILIARES ---
  const corBolinhaStatus = (status) => {
    switch (status?.trim().toLowerCase()) {
      case "aprovado":
        return "bg-green-500";
      case "recusado":
      case "rejeitado":
        return "bg-red-500";
      case "cancelado":
        return "bg-gray-500";
      default:
        return "bg-yellow-500";
    }
  };

  const formatarData = (dataString) => {
    if (!dataString) return "—";
    const [ano, mes, dia] = dataString.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto relative">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500/10 p-2 rounded-lg">
            <FileText className="text-orange-500" size={24} />
          </div>
          <div>
            <h1 className="text-2xl text-white font-bold">
              Histórico de Solicitações
            </h1>
            <p className="text-gray-500 text-sm">
              Consulte e gerencie todos os pedidos de férias
            </p>
          </div>
        </div>
        <button
          onClick={() => setModalCriacaoAberto(true)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-all shadow-lg shadow-orange-950/30"
        >
          <PlusCircle size={18} /> NOVA SOLICITAÇÃO
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-[#111] border border-[#222] p-4 rounded-xl mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 pl-10 text-white text-sm outline-none focus:border-orange-500"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-white text-sm outline-none cursor-pointer"
        >
          <option value="todos">Todos os Status</option>
          <option value="pendente">Apenas Pendentes</option>
          <option value="aprovado">Apenas Aprovados</option>
          <option value="recusado">Apenas Recusados</option>
        </select>
      </div>

      {/* Tabela Principal */}
      <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-[#222] text-xs font-bold text-gray-500 uppercase bg-[#161616]">
          <div className="col-span-3">Colaborador</div>
          <div className="col-span-1">Setor</div>
          <div className="col-span-3">Período</div>
          <div className="col-span-1">Dias</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-3 text-right">Ações</div>
        </div>

        {carregando ? (
          <div className="p-10 text-center text-gray-500 font-mono text-sm">
            CARREGANDO...
          </div>
        ) : solicitacoesFiltradas.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            Nenhuma solicitação encontrada.
          </div>
        ) : (
          <div className="divide-y divide-[#222]">
            {solicitacoesFiltradas.map((item) => {
              const ehPendente =
                item.status?.trim().toLowerCase() === "pendente";

              return (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-[#161616] transition-colors"
                >
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#2a2a2a] text-orange-500 flex items-center justify-center font-bold text-xs border border-[#333]">
                      {item.colaborador_nome?.charAt(0)}
                    </div>
                    <span className="text-white font-medium text-sm truncate">
                      {item.colaborador_nome}
                    </span>
                  </div>
                  <div className="col-span-1">
                    <span className="bg-[#222] text-gray-400 px-2 py-1 rounded text-[10px] font-bold">
                      {item.setor === "Tecnologia da Informação"
                        ? "TI"
                        : item.setor || "N/A"}
                    </span>
                  </div>
                  <div className="col-span-3 text-gray-400 text-sm">
                    {formatarData(item.data_inicio)} —{" "}
                    {formatarData(item.data_fim)}
                  </div>
                  <div className="col-span-1 text-white font-bold text-sm">
                    {item.total_dias || "—"}
                  </div>
                  <div className="col-span-1">
                    <span className="flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-[#1a1a1a] border border-[#333] text-gray-400">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${corBolinhaStatus(item.status)}`}
                      ></div>
                      {item.status}
                    </span>
                  </div>

                  <div className="col-span-3 flex items-center justify-end gap-2">
                    {ehPendente && (
                      <div className="flex items-center gap-1 pr-2 border-r border-[#333]">
                        <button
                          onClick={() => aprovarSolicitacao(item)}
                          className="p-1.5 text-gray-500 hover:text-green-500 transition-colors"
                          title="Aprovar"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                        <button
                          onClick={() => rejeitarSolicitacao(item.id)}
                          className="p-1.5 text-gray-500 hover:text-red-500 transition-colors"
                          title="Recusar"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => ehPendente && abrirModalSugestao(item)}
                      disabled={!ehPendente}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${ehPendente ? "text-orange-500 border border-orange-500/20 hover:bg-orange-500/10" : "opacity-30 grayscale cursor-not-allowed"}`}
                    >
                      <Brain size={14} /> Sugerir
                    </button>

                    <div className="flex items-center gap-1 ml-1 border-l border-[#333] pl-2">
                      <button
                        onClick={() => abrirModalEdicao(item)}
                        className="p-1.5 text-gray-500 hover:text-white"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => revogarStatus(item)}
                        className="p-1.5 text-gray-500 hover:text-yellow-500"
                        title="Revogar"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button
                        onClick={() => deletarSolicitacao(item.id)}
                        className="p-1.5 text-gray-500 hover:text-red-500"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- MODAIS --- */}
      <NovaSolicitacaoModal
        isOpen={modalCriacaoAberto}
        onClose={() => {
          setModalCriacaoAberto(false);
          buscarTodasSolicitacoes();
        }}
      />

      <ModalSugestao
        aberto={modalSugestaoAberto}
        fechar={() => setModalSugestaoAberto(false)}
        colaborador={solicitacaoParaSugestao}
        dataBase={solicitacaoParaSugestao?.data_inicio}
        diasBase={solicitacaoParaSugestao?.total_dias}
        aoSugerir={async (inicio, fim, totalDias) => {
          try {
            const { error } = await supabase
              .from("solicitacoes")
              .update({
                data_inicio: inicio,
                data_fim: fim,
                total_dias: totalDias,
              })
              .eq("id", solicitacaoParaSugestao.id);
            if (error) throw error;
            alert("Solicitação atualizada!");
            setModalSugestaoAberto(false);
            buscarTodasSolicitacoes();
          } catch (error) {
            alert("Erro: " + error.message);
          }
        }}
      />

      {modalEdicaoAberto && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setModalEdicaoAberto(false)}
              className="absolute right-4 top-4 text-gray-500 hover:text-white"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <Edit2 className="text-orange-500" size={20} /> Editar Datas
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1 uppercase">
                  Início
                </label>
                <input
                  type="date"
                  value={dataInicioEdit}
                  onChange={(e) => setDataInicioEdit(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-white text-sm outline-none focus:border-orange-500 [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1 uppercase">
                  Retorno
                </label>
                <input
                  type="date"
                  value={dataFimEdit}
                  onChange={(e) => setDataFimEdit(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-white text-sm outline-none focus:border-orange-500 [color-scheme:dark]"
                />
              </div>
            </div>
            <button
              onClick={salvarEdicao}
              disabled={salvandoEdicao}
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-colors"
            >
              {salvandoEdicao ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
