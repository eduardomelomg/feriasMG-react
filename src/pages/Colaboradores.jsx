import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Users,
  UserPlus,
  Trash2,
  Briefcase,
  Mail,
  Edit2,
  X,
  Save,
} from "lucide-react";

export default function Colaboradores() {
  const [colaboradores, setColaboradores] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // --- Estados do Form de CADASTRO ---
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [setor, setSetor] = useState("Contábil");
  const [diasDireito, setDiasDireito] = useState(30);
  const [diasGozados, setDiasGozados] = useState(0);

  // --- Estados do Modal de EDIÇÃO ---
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [colabEmEdicao, setColabEmEdicao] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSetor, setEditSetor] = useState("");
  const [editDiasDireito, setEditDiasDireito] = useState(30);
  const [editDiasGozados, setEditDiasGozados] = useState(0);
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
      console.error("Erro na busca:", error.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    buscarColaboradores();
  }, []);

  // --- CRUD: CREATE ---
  const cadastrarColaborador = async (e) => {
    e.preventDefault();
    if (!nome || !email) return alert("Digite o nome e o e-mail!");

    const { error } = await supabase.from("colaboradores").insert([
      {
        colaborador_nome: nome,
        email: email,
        setor: setor,
        status: "ativo",
        dias_direito: parseInt(diasDireito) || 30,
        dias_gozados: parseInt(diasGozados) || 0,
      },
    ]);

    if (error) {
      alert("Erro ao cadastrar: " + error.message);
    } else {
      // Limpa o form
      setNome("");
      setEmail("");
      setDiasDireito(30);
      setDiasGozados(0);
      buscarColaboradores();
    }
  };

  // --- CRUD: DELETE ---
  const deletarColaborador = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este colaborador?")) return;
    const { error } = await supabase
      .from("colaboradores")
      .delete()
      .eq("id", id);
    if (error) alert(error.message);
    else buscarColaboradores();
  };

  // --- CRUD: PREPARAR UPDATE ---
  const abrirModalEdicao = (colab) => {
    setColabEmEdicao(colab);
    setEditNome(colab.colaborador_nome);
    setEditEmail(colab.email || "");
    setEditSetor(colab.setor);
    setEditDiasDireito(colab.dias_direito ?? 30);
    setEditDiasGozados(colab.dias_gozados ?? 0);
    setModalEdicaoAberto(true);
  };

  // --- CRUD: SALVAR UPDATE ---
  const salvarEdicao = async (e) => {
    e.preventDefault();
    if (!editNome || !editEmail)
      return alert("Nome e e-mail são obrigatórios!");

    setSalvandoEdicao(true);
    const { error } = await supabase
      .from("colaboradores")
      .update({
        colaborador_nome: editNome,
        email: editEmail,
        setor: editSetor,
        dias_direito: parseInt(editDiasDireito) || 0,
        dias_gozados: parseInt(editDiasGozados) || 0,
      })
      .eq("id", colabEmEdicao.id);

    setSalvandoEdicao(false);

    if (error) {
      alert("Erro ao atualizar: " + error.message);
    } else {
      setModalEdicaoAberto(false);
      buscarColaboradores();
    }
  };

  // Função auxiliar matemática
  const calcularDias = (direito = 30, gozados = 0) => ({
    direito,
    gozados,
    aGozar: direito - gozados,
  });

  const obterSigla = (setor) => {
    const siglas = {
      "Tecnologia da Informação": "TI",
      "Departamento Pessoal": "DP",
      Financeiro: "FIN",
      Fiscal: "FISC",
      Contábil: "CONT",
      "Recursos Humanos": "RH",
      Societário: "SOC",
    };
    return siglas[setor] || setor; // Retorna a sigla ou o nome original se não encontrar
  };

  return (
    <div className="p-8 max-w-7xl mx-auto relative">
      <h1 className="text-2xl text-white font-bold mb-8 flex items-center gap-2">
        <Users className="text-orange-500" /> Gestão de Colaboradores
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* --- FORMULÁRIO DE CADASTRO (Lateral) --- */}
        <div className="lg:col-span-4 bg-[#111] border border-[#222] p-6 rounded-xl h-fit">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <UserPlus size={18} className="text-orange-500" /> Novo Cadastro
          </h2>
          <form onSubmit={cadastrarColaborador} className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                NOME COMPLETO
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-white text-sm focus:border-orange-500 outline-none transition-all"
                placeholder="Ex: João Silva"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">
                E-MAIL PROFISSIONAL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-white text-sm focus:border-orange-500 outline-none transition-all"
                placeholder="joao@empresa.com"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">SETOR</label>
              <select
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-white text-sm focus:border-orange-500 outline-none appearance-none cursor-pointer"
              >
                {listaSetores.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  DIAS DE DIREITO
                </label>
                <input
                  type="number"
                  min="0"
                  value={diasDireito}
                  onChange={(e) => setDiasDireito(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-white text-sm focus:border-orange-500 outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  DIAS GOZADOS
                </label>
                <input
                  type="number"
                  min="0"
                  value={diasGozados}
                  onChange={(e) => setDiasGozados(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-white text-sm focus:border-orange-500 outline-none font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg transition-colors text-sm shadow-lg shadow-orange-900/20 mt-2"
            >
              CADASTRAR COLABORADOR
            </button>
          </form>
        </div>

        {/* --- LISTAGEM DE COLABORADORES --- */}
        <div className="lg:col-span-8 bg-[#111] border border-[#222] rounded-xl overflow-hidden shadow-xl h-fit">
          <div className="p-4 border-b border-[#222] bg-[#161616]">
            <h2 className="text-white font-semibold text-sm">
              Equipe Cadastrada e Saldos
            </h2>
          </div>
          <div className="divide-y divide-[#222] max-h-[700px] overflow-y-auto custom-scrollbar">
            {carregando ? (
              <p className="p-10 text-center text-gray-500 font-mono text-sm">
                Carregando dados...
              </p>
            ) : colaboradores.length === 0 ? (
              <p className="p-10 text-gray-500 text-center text-sm">
                Nenhum colaborador encontrado.
              </p>
            ) : (
              colaboradores.map((colab) => {
                const dias = calcularDias(
                  colab.dias_direito,
                  colab.dias_gozados,
                );
                return (
                  <div
                    key={colab.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#161616] transition-colors group"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center text-orange-500 font-bold border border-[#333]">
                        {colab.colaborador_nome.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm truncate">
                          {colab.colaborador_nome}
                        </p>
                        {/* Onde estava {colab.setor}, coloque assim: */}
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                          <Briefcase size={12} className="shrink-0" />
                          <span className="truncate">
                            {obterSigla(colab.setor)}
                          </span>
                          <span className="text-gray-700 mx-1">•</span>
                          <Mail size={12} className="shrink-0" />
                          <span className="truncate">
                            {colab.email || "Sem e-mail"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-5 bg-[#1a1a1a] px-4 py-2 rounded-lg border border-[#222]">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-0.5">
                          Direito
                        </p>
                        <p className="text-sm font-mono text-gray-300">
                          {dias.direito}
                        </p>
                      </div>
                      <div className="w-px h-6 bg-[#333]"></div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-0.5">
                          Gozados
                        </p>
                        <p className="text-sm font-mono text-gray-300">
                          {dias.gozados}
                        </p>
                      </div>
                      <div className="w-px h-6 bg-[#333]"></div>
                      <div className="text-center">
                        <p className="text-[10px] text-orange-500 uppercase font-bold mb-0.5">
                          A Gozar
                        </p>
                        <p className="text-base font-bold font-mono text-white leading-none mt-1">
                          {dias.aGozar}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-20 justify-end opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => abrirModalEdicao(colab)}
                        className="text-gray-500 hover:text-white hover:bg-[#222] rounded p-1.5 transition-all"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deletarColaborador(colab.id)}
                        className="text-gray-500 hover:text-red-500 hover:bg-red-950/30 rounded p-1.5 transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* --- MODAL DE EDIÇÃO --- */}
      {modalEdicaoAberto && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl relative p-6">
            <button
              onClick={() => setModalEdicaoAberto(false)}
              className="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <Edit2 className="text-orange-500" size={20} /> Editar Colaborador
            </h2>

            <form onSubmit={salvarEdicao} className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  NOME COMPLETO
                </label>
                <input
                  type="text"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-white text-sm focus:border-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  E-MAIL
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-white text-sm focus:border-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  SETOR
                </label>
                <select
                  value={editSetor}
                  onChange={(e) => setEditSetor(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-white text-sm focus:border-orange-500 outline-none appearance-none"
                >
                  {listaSetores.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-[#161616] p-4 rounded-xl border border-[#222] mt-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-1 font-bold">
                    DIAS DE DIREITO
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editDiasDireito}
                    onChange={(e) => setEditDiasDireito(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-white text-sm focus:border-orange-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1 font-bold">
                    DIAS GOZADOS
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editDiasGozados}
                    onChange={(e) => setEditDiasGozados(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-white text-sm focus:border-orange-500 outline-none font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={salvandoEdicao}
                className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors text-sm shadow-lg mt-6"
              >
                <Save size={18} />{" "}
                {salvandoEdicao ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
