import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  FileText,
  Search,
  Filter,
  CalendarDays,
  Edit2,
  Trash2,
  PlusCircle,
  X,
  Save,
  Brain,
  Zap,
  RotateCcw,
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

  // Crie também essa funçãozinha rápida:
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

  // --- 2. LÓGICA DE FILTRAGEM (Front-end) ---
  const solicitacoesFiltradas = solicitacoes.filter((item) => {
    const nomeBate = item.colaborador_nome
      ?.toLowerCase()
      .includes(busca.toLowerCase());
    const statusBate = filtroStatus === "todos" || item.status === filtroStatus;
    return nomeBate && statusBate;
  });

  // --- 3. CRUD: EXCLUSÃO ---
  async function deletarSolicitacao(id) {
    if (
      !confirm(
        "Tem certeza que deseja excluir esta solicitação permanentemente?",
      )
    )
      return;

    try {
      const { error } = await supabase
        .from("solicitacoes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setSolicitacoes(solicitacoes.filter((s) => s.id !== id));
      alert("Solicitação excluída com sucesso.");
    } catch (error) {
      alert("Erro ao excluir: " + error.message);
    }
  }

  // --- 4. CRUD: PREPARAÇÃO PARA EDIÇÃO ---
  function abrirModalEdicao(solicitacao) {
    setSolicitacaoEmEdicao(solicitacao);
    setDataInicioEdit(solicitacao.data_inicio);
    setDataFimEdit(solicitacao.data_fim);
    setModalEdicaoAberto(true);
  }

  // --- 5. CRUD: SALVAR EDIÇÃO ---
  async function salvarEdicao() {
    if (!dataInicioEdit || !dataFimEdit) return alert("Preencha as datas!");

    try {
      setSalvandoEdicao(true);

      const inicio = new Date(dataInicioEdit);
      const fim = new Date(dataFimEdit);
      const diferencaEmTempo = fim.getTime() - inicio.getTime();
      const totalDeDias = Math.ceil(diferencaEmTempo / (1000 * 3600 * 24)) + 1;

      if (totalDeDias <= 0)
        throw new Error(
          "A data de retorno deve ser maior que a data de início.",
        );

      const { error } = await supabase
        .from("solicitacoes")
        .update({
          data_inicio: dataInicioEdit,
          data_fim: dataFimEdit,
          total_dias: totalDeDias,
        })
        .eq("id", solicitacaoEmEdicao.id);

      if (error) throw error;

      alert("Solicitação atualizada com sucesso!");
      buscarTodasSolicitacoes();
      setModalEdicaoAberto(false);
      setSolicitacaoEmEdicao(null);
    } catch (error) {
      alert("Erro ao atualizar: " + error.message);
    } finally {
      setSalvandoEdicao(false);
    }
  }

  // --- NOVA FUNÇÃO DE COR (Substituiu a corDoStatus antiga) ---
  const corBolinhaStatus = (status) => {
    switch (status?.toLowerCase()) {
      case "aprovado":
        return "bg-green-500";
      case "recusado":
      case "rejeitado":
        return "bg-red-500";
      case "cancelado":
        return "bg-gray-500";
      default:
        return "bg-yellow-500"; // Pendente
    }
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
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-colors shadow-lg shadow-orange-950/30"
        >
          <PlusCircle size={18} /> NOVA SOLICITAÇÃO
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-[#111] border border-[#222] p-4 rounded-xl mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3 top-3 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nome do colaborador..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 pl-10 text-white text-sm focus:border-orange-500 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={16} className="text-gray-500" />
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-white text-sm focus:border-orange-500 outline-none appearance-none cursor-pointer"
          >
            <option value="todos">Todos os Status</option>
            <option value="pendente">Apenas Pendentes</option>
            <option value="aprovado">Apenas Aprovados</option>
            <option value="recusado">Apenas Recusados/Cancelados</option>
          </select>
        </div>
      </div>

      {/* Tabela Principal */}
      <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
        {/* Cabeçalho da Tabela */}
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-[#222] text-xs font-bold text-gray-500 uppercase tracking-wider bg-[#161616]">
          <div className="col-span-3">Colaborador</div>
          <div className="col-span-1">Setor</div>
          <div className="col-span-3">Período</div>
          <div className="col-span-1">Dias</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-3 text-right">Ações</div>
        </div>

        {carregando ? (
          <div className="p-10 text-center text-gray-500 font-mono text-sm">
            CARREGANDO DADOS...
          </div>
        ) : solicitacoesFiltradas.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            Nenhuma solicitação encontrada para este filtro.
          </div>
        ) : (
          <div className="divide-y divide-[#222]">
            {solicitacoesFiltradas.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-[#161616] transition-colors group"
              >
                {/* 1. Colaborador */}
                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#2a2a2a] text-orange-500 flex items-center justify-center font-bold text-xs border border-[#333]">
                    {item.colaborador_nome?.charAt(0)}
                  </div>
                  <span className="text-white font-medium text-sm truncate">
                    {item.colaborador_nome}
                  </span>
                </div>

                {/* 2. Setor */}
                <div className="col-span-1">
                  <span className="bg-[#222] text-gray-400 px-2 py-1 rounded text-xs font-mono whitespace-nowrap">
                    {item.setor === "Tecnologia da Informação"
                      ? "TI"
                      : item.setor || "N/A"}
                  </span>
                </div>

                {/* 3. Período */}
                <div className="col-span-3 text-gray-400 text-sm whitespace-nowrap">
                  {new Date(item.data_inicio).toLocaleDateString()} —{" "}
                  {new Date(item.data_fim).toLocaleDateString()}
                </div>

                {/* 4. Dias */}
                <div className="col-span-1 text-white font-bold text-sm">
                  {item.total_dias || "—"}
                </div>

                {/* 5. Status (Bolinha) */}
                <div className="col-span-1 flex items-center">
                  <span className="flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-[#1a1a1a] border border-[#333] text-gray-400 whitespace-nowrap">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${corBolinhaStatus(item.status)}`}
                    ></div>
                    {item.status}
                  </span>
                </div>

                {/* 6. Ações */}
                <div className="col-span-3 flex items-center justify-end gap-2">
                  <button
                    onClick={() => abrirModalSugestao(item)} // <--- MUDOU AQUI
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-orange-900/50 text-orange-500 rounded-lg hover:bg-orange-900/20 transition-colors text-xs font-medium"
                  >
                    <Brain size={14} /> Sugerir
                  </button>

                  <div className="flex items-center gap-1 ml-2 border-l border-[#333] pl-2">
                    <button
                      onClick={() => abrirModalEdicao(item)}
                      className="p-1.5 text-gray-500 hover:text-white transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="p-1.5 text-gray-500 hover:text-white transition-colors"
                      title="Revogar/Voltar Status"
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button
                      onClick={() => deletarSolicitacao(item.id)}
                      className="p-1.5 text-gray-500 hover:text-red-500 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
        isOpen={modalSugestaoAberto}
        onClose={() => setModalSugestaoAberto(false)}
        solicitacao={solicitacaoParaSugestao}
        onAccept={() => {
          setModalSugestaoAberto(false);
          buscarTodasSolicitacoes(); // Atualiza a lista na hora!
        }}
      />

      {modalEdicaoAberto && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl relative p-6">
            <button
              onClick={() => setModalEdicaoAberto(false)}
              className="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
              <Edit2 className="text-orange-500" size={20} /> Editar Datas
            </h2>
            <p className="text-xs text-gray-500 mb-6">
              Colaborador:{" "}
              <span className="text-white font-medium">
                {solicitacaoEmEdicao?.colaborador_nome}
              </span>
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  DATA DE INÍCIO
                </label>
                <input
                  type="date"
                  value={dataInicioEdit}
                  onChange={(e) => setDataInicioEdit(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-white text-sm focus:border-orange-500 outline-none [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  DATA DE RETORNO
                </label>
                <input
                  type="date"
                  value={dataFimEdit}
                  onChange={(e) => setDataFimEdit(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-white text-sm focus:border-orange-500 outline-none [color-scheme:dark]"
                />
              </div>
            </div>

            <button
              onClick={salvarEdicao}
              disabled={salvandoEdicao}
              className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:text-gray-400 text-white font-bold py-3 rounded-lg transition-colors text-sm shadow-lg shadow-orange-950/20"
            >
              <Save size={18} />{" "}
              {salvandoEdicao ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
