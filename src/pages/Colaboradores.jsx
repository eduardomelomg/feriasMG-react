import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Users,
  UserPlus,
  Trash2,
  Edit2,
  X,
  AlertCircle,
  Timer,
  CheckCircle2,
  Calendar as CalendarIcon,
  Search,
  Filter,
  Mail,
  Briefcase,
  Calculator,
} from "lucide-react";
import { differenceInMonths, parseISO, format } from "date-fns";

export default function Colaboradores() {
  const [colaboradores, setColaboradores] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // --- ESTADOS DE FILTRO ---
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  // --- ESTADOS DE CADASTRO ---
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [setor, setSetor] = useState("Contábil");
  const [dataAdmissao, setDataAdmissao] = useState("");
  const [diasDireito, setDiasDireito] = useState(30);
  const [diasGozados, setDiasGozados] = useState(0);
  const [saldoFerias, setSaldoFerias] = useState(0); // NOVO CAMPO DE SALDO

  // --- ESTADOS DE EDIÇÃO ---
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [colabEmEdicao, setColabEmEdicao] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSetor, setEditSetor] = useState("");
  const [editDataAdmissao, setEditDataAdmissao] = useState("");
  const [editDiasDireito, setEditDiasDireito] = useState(30);
  const [editDiasGozados, setEditDiasGozados] = useState(0);
  const [editSaldoFerias, setEditSaldoFerias] = useState(0); // NOVO CAMPO DE SALDO
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const listaSetores = [
    "Contábil",
    "Departamento Pessoal",
    "Financeiro",
    "Fiscal",
    "Recursos Humanos",
    "Tecnologia da Informação",
  ];

  async function buscarColaboradores() {
    try {
      setCarregando(true);
      const { data, error } = await supabase
        .from("colaboradores")
        .select("*")
        .order("colaborador_nome", { ascending: true });
      if (error) throw error;
      setColaboradores(data || []);
    } catch (error) {
      console.error(error.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    buscarColaboradores();
  }, []);

  const obterStatusFerias = (dataAdm, gozados, direito = 30) => {
    if (!dataAdm) return { label: "S/ DATA", cor: "text-gray-500" };
    const meses = differenceInMonths(new Date(), parseISO(dataAdm));
    const saldo = direito - (gozados || 0);
    if (meses >= 23 && saldo > 0)
      return { label: "VENCIDA (DOBRA)", cor: "text-red-500" };
    if (meses >= 18 && saldo > 0)
      return { label: "EM ALERTA", cor: "text-yellow-500" };
    return { label: "EM DIA", cor: "text-green-500" };
  };

  const obterSigla = (setor) => {
    const siglas = {
      "Tecnologia da Informação": "TI",
      "Departamento Pessoal": "DP",
      Financeiro: "FIN",
      Fiscal: "FISC",
      Contábil: "CONT",
      "Recursos Humanos": "RH",
    };
    return siglas[setor] || setor;
  };

  const cadastrarColaborador = async (e) => {
    e.preventDefault();
    if (!nome || !email || !dataAdmissao)
      return alert("Preencha os campos obrigatórios!");
    const { error } = await supabase.from("colaboradores").insert([
      {
        colaborador_nome: nome,
        email,
        setor,
        data_admissao: dataAdmissao,
        status: "ativo",
        dias_direito: parseInt(diasDireito),
        dias_gozados: parseInt(diasGozados),
        saldo_ferias: parseInt(saldoFerias), // SALVANDO O SALDO NO BANCO
      },
    ]);
    if (error) alert(error.message);
    else {
      setNome("");
      setEmail("");
      setDataAdmissao("");
      setDiasDireito(30);
      setDiasGozados(0);
      setSaldoFerias(0);
      buscarColaboradores();
    }
  };

  const deletarColaborador = async (id) => {
    if (!confirm("Excluir este colaborador?")) return;
    const { error } = await supabase
      .from("colaboradores")
      .delete()
      .eq("id", id);
    if (error) alert(error.message);
    else buscarColaboradores();
  };

  const abrirModalEdicao = (colab) => {
    setColabEmEdicao(colab);
    setEditNome(colab.colaborador_nome);
    setEditEmail(colab.email || "");
    setEditSetor(colab.setor);
    setEditDataAdmissao(colab.data_admissao || "");
    setEditDiasDireito(colab.dias_direito ?? 30);
    setEditDiasGozados(colab.dias_gozados ?? 0);
    setEditSaldoFerias(colab.saldo_ferias ?? 0); // CARREGANDO O SALDO NO MODAL
    setModalEdicaoAberto(true);
  };

  const salvarEdicao = async (e) => {
    e.preventDefault();
    setSalvandoEdicao(true);
    const { error } = await supabase
      .from("colaboradores")
      .update({
        colaborador_nome: editNome,
        email: editEmail,
        setor: editSetor,
        data_admissao: editDataAdmissao,
        dias_direito: parseInt(editDiasDireito),
        dias_gozados: parseInt(editDiasGozados),
        saldo_ferias: parseInt(editSaldoFerias), // ATUALIZANDO O SALDO NO BANCO
      })
      .eq("id", colabEmEdicao.id);
    setSalvandoEdicao(false);
    if (error) alert(error.message);
    else {
      setModalEdicaoAberto(false);
      buscarColaboradores();
    }
  };

  const colaboradoresFiltrados = colaboradores.filter((colab) => {
    const statusInfo = obterStatusFerias(
      colab.data_admissao,
      colab.dias_gozados,
      colab.dias_direito,
    );
    const nomeBate = colab.colaborador_nome
      ?.toLowerCase()
      .includes(busca.toLowerCase());
    const statusBate =
      filtroStatus === "todos" || statusInfo.label === filtroStatus;
    return nomeBate && statusBate;
  });

  const estatisticas = {
    vencidas: colaboradores.filter(
      (c) =>
        obterStatusFerias(c.data_admissao, c.dias_gozados).label ===
        "VENCIDA (DOBRA)",
    ).length,
    alerta: colaboradores.filter(
      (c) =>
        obterStatusFerias(c.data_admissao, c.dias_gozados).label ===
        "EM ALERTA",
    ).length,
    total: colaboradores.length,
  };

  return (
    <div className="p-8 max-w-7xl mx-auto relative text-white">
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="text-orange-500" /> Gestão de Equipe
        </h1>
      </header>

      {/* Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#0e0e0e] border border-[#1a1a1a] p-5 rounded-xl flex items-center gap-5 shadow-sm">
          <div className="bg-red-500/10 p-3.5 rounded-lg text-red-500">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">
              Vencidas
            </p>
            <p className="text-2xl font-bold leading-none">
              {estatisticas.vencidas}
            </p>
          </div>
        </div>
        <div className="bg-[#0e0e0e] border border-[#1a1a1a] p-5 rounded-xl flex items-center gap-5 shadow-sm">
          <div className="bg-yellow-500/10 p-3.5 rounded-lg text-yellow-500">
            <Timer size={24} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">
              Alertas
            </p>
            <p className="text-2xl font-bold leading-none">
              {estatisticas.alerta}
            </p>
          </div>
        </div>
        <div className="bg-[#0e0e0e] border border-[#1a1a1a] p-5 rounded-xl flex items-center gap-5 shadow-sm">
          <div className="bg-green-500/10 p-3.5 rounded-lg text-green-500">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">
              Total Ativos
            </p>
            <p className="text-2xl font-bold leading-none">
              {estatisticas.total}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Cadastro */}
        <div className="lg:col-span-4 bg-[#111] border border-[#222] p-6 rounded-xl h-fit shadow-xl">
          <h2 className="text-white font-semibold mb-6 flex items-center gap-2">
            <UserPlus size={18} className="text-orange-500" /> Novo Cadastro
          </h2>
          <form onSubmit={cadastrarColaborador} className="space-y-4">
            <input
              type="text"
              placeholder="Nome Completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 text-white text-sm outline-none focus:border-orange-500 transition-all"
            />
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 text-white text-sm outline-none focus:border-orange-500 transition-all"
            />
            <div className="grid grid-cols-1 gap-1">
              <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">
                Admissão
              </label>
              <input
                type="date"
                value={dataAdmissao}
                onChange={(e) => setDataAdmissao(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 text-white text-sm outline-none [color-scheme:dark]"
              />
            </div>
            <select
              value={setor}
              onChange={(e) => setSetor(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 text-white text-sm outline-none cursor-pointer"
            >
              {listaSetores.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* GRID DE DIAS E SALDO */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">
                  Dir. CLT
                </label>
                <input
                  type="number"
                  value={diasDireito}
                  onChange={(e) => setDiasDireito(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 text-white text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">
                  Gozados
                </label>
                <input
                  type="number"
                  value={diasGozados}
                  onChange={(e) => setDiasGozados(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 text-white text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-orange-500 font-bold uppercase ml-1 flex items-center gap-1">
                  <Calculator size={10} /> Saldo
                </label>
                <input
                  type="number"
                  value={saldoFerias}
                  onChange={(e) => setSaldoFerias(e.target.value)}
                  className="w-full bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-orange-400 font-black text-sm outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-lg transition-all shadow-lg shadow-orange-950/20 uppercase text-xs mt-2"
            >
              Cadastrar
            </button>
          </form>
        </div>

        {/* Listagem */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          {/* Barra de Filtros */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-3.5 text-gray-500"
              />
              <input
                type="text"
                placeholder="Pesquisar por nome..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-[#111] border border-[#222] rounded-xl p-3.5 pl-10 text-sm outline-none focus:border-orange-500 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 bg-[#111] border border-[#222] rounded-xl px-4">
              <Filter size={16} className="text-gray-500" />
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="bg-transparent text-xs font-black uppercase p-3.5 outline-none cursor-pointer [color-scheme:dark]"
              >
                <option value="todos">Todos Status</option>
                <option value="EM DIA">Em Dia</option>
                <option value="EM ALERTA">Em Alerta</option>
                <option value="VENCIDA (DOBRA)">Vencidas</option>
              </select>
            </div>
          </div>

          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-[#161616] border-b border-[#222]">
              <div className="grid grid-cols-12 gap-4 text-[10px] text-gray-500 font-black uppercase tracking-widest">
                <div className="col-span-4">Colaborador / Detalhes</div>
                <div className="col-span-2 text-center">Status CLT</div>
                <div className="col-span-1 text-center" title="Direito CLT">
                  Dir.
                </div>
                <div className="col-span-1 text-center" title="Gozados CLT">
                  Goz.
                </div>
                <div className="col-span-1 text-center" title="A Gozar CLT">
                  A Goz.
                </div>
                <div className="col-span-2 text-center text-orange-500 border-l border-[#333]">
                  Saldo (Solicit.)
                </div>
                <div className="col-span-1 text-right">Ação</div>
              </div>
            </div>

            <div className="divide-y divide-[#222]">
              {carregando ? (
                <p className="p-10 text-center text-gray-500 uppercase text-xs animate-pulse">
                  Carregando...
                </p>
              ) : colaboradoresFiltrados.length === 0 ? (
                <p className="p-10 text-center text-gray-500 text-sm">
                  Nenhum registro encontrado.
                </p>
              ) : (
                colaboradoresFiltrados.map((colab) => {
                  const status = obterStatusFerias(
                    colab.data_admissao,
                    colab.dias_gozados,
                    colab.dias_direito,
                  );
                  const aGozar =
                    (colab.dias_direito || 30) - (colab.dias_gozados || 0);
                  const saldoAtual = colab.saldo_ferias || 0; // Pegando o saldo real do BD

                  return (
                    <div
                      key={colab.id}
                      className="p-5 hover:bg-[#141414] transition-colors group"
                    >
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-4 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center text-orange-500 font-bold border border-[#333] shrink-0 text-sm">
                            {colab.colaborador_nome.charAt(0)}
                          </div>
                          <div className="truncate">
                            <p className="text-white font-bold text-sm truncate uppercase leading-tight">
                              {colab.colaborador_nome}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                              <p className="text-[10px] text-orange-500/90 font-black flex items-center gap-1 uppercase tracking-tighter">
                                <Briefcase size={12} />{" "}
                                {obterSigla(colab.setor)}
                              </p>
                              <p className="text-[10px] text-gray-500 flex items-center gap-1 font-bold">
                                <CalendarIcon size={12} />{" "}
                                {colab.data_admissao
                                  ? format(
                                      parseISO(colab.data_admissao),
                                      "dd/MM/yy",
                                    )
                                  : "---"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="col-span-2 text-center font-black uppercase text-[10px] tracking-tight">
                          <span
                            className={`${status.cor} bg-black/40 px-2 py-1 rounded`}
                          >
                            {status.label}
                          </span>
                        </div>

                        <div className="col-span-1 text-center text-xs font-mono text-gray-400">
                          {colab.dias_direito}d
                        </div>

                        <div className="col-span-1 text-center text-xs font-mono text-gray-400">
                          {colab.dias_gozados || 0}d
                        </div>

                        <div className="col-span-1 text-center text-xs font-black font-mono">
                          <span
                            className={
                              aGozar < 0 ? "text-red-500" : "text-gray-300"
                            }
                          >
                            {aGozar}d
                          </span>
                        </div>

                        <div className="col-span-2 text-center text-base font-black font-mono border-l border-[#333]">
                          <span className="text-orange-500 bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/20">
                            {saldoAtual}d
                          </span>
                        </div>

                        {/* Ações Visíveis Permanentemente */}
                        <div className="col-span-1 flex items-center justify-end gap-1">
                          <button
                            onClick={() => abrirModalEdicao(colab)}
                            className="p-2 text-gray-500 hover:text-white hover:bg-[#222] rounded-lg transition-all"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => deletarColaborador(colab.id)}
                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Edição */}
      {modalEdicaoAberto && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              onClick={() => setModalEdicaoAberto(false)}
              className="absolute right-4 top-4 text-gray-500 hover:text-white"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <Edit2 className="text-orange-500" /> Editar Ficha
            </h2>
            <form onSubmit={salvarEdicao} className="space-y-4">
              <input
                type="text"
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 text-white text-sm outline-none focus:border-orange-500"
              />
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 text-white text-sm outline-none"
              />
              <input
                type="date"
                value={editDataAdmissao}
                onChange={(e) => setEditDataAdmissao(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 text-white text-sm outline-none [color-scheme:dark]"
              />
              <select
                value={editSetor}
                onChange={(e) => setEditSetor(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 text-white text-sm outline-none"
              >
                {listaSetores.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">
                    Dir. CLT
                  </label>
                  <input
                    type="number"
                    value={editDiasDireito}
                    onChange={(e) => setEditDiasDireito(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 text-white text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">
                    Gozados
                  </label>
                  <input
                    type="number"
                    value={editDiasGozados}
                    onChange={(e) => setEditDiasGozados(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 text-white text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-orange-500 font-bold uppercase ml-1 flex items-center gap-1">
                    <Calculator size={10} /> Saldo
                  </label>
                  <input
                    type="number"
                    value={editSaldoFerias}
                    onChange={(e) => setEditSaldoFerias(e.target.value)}
                    className="w-full bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-orange-400 font-black text-sm outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={salvandoEdicao}
                className="w-full bg-orange-600 py-3.5 rounded-lg text-white font-bold mt-4 shadow-lg shadow-orange-900/20 active:scale-95 transition-all uppercase text-xs tracking-widest"
              >
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
