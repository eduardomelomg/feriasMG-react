import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Users, UserPlus, Trash2, Briefcase } from "lucide-react";

export default function Colaboradores() {
  const [colaboradores, setColaboradores] = useState([]);
  const [nome, setNome] = useState("");
  const [setor, setSetor] = useState("Contábil");
  const [carregando, setCarregando] = useState(true);

  const listaSetores = [
    "Contábil",
    "Departamento Pessoal",
    "Financeiro",
    "Fiscal",
    "Recursos Humanos",
    "Tecnologia da Informação",
  ];

  // --- 1. PRIMEIRO: DEFINE A FUNÇÃO ---
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

  // 2. O useEffect vem LOGO ABAIXO da função
  useEffect(() => {
    buscarColaboradores();
  }, []);

  // --- 3. TERCEIRO: OUTRAS FUNÇÕES (CADASTRAR E DELETAR) ---
  const cadastrarColaborador = async (e) => {
    e.preventDefault();
    if (!nome) return alert("Digite o nome!");

    const { error } = await supabase
      .from("colaboradores")
      .insert([{ colaborador_nome: nome, setor: setor, status: "ativo" }]);

    if (error) {
      alert("Erro ao cadastrar: " + error.message);
    } else {
      setNome("");
      buscarColaboradores();
    }
  };

  const deletarColaborador = async (id) => {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    const { error } = await supabase
      .from("colaboradores")
      .delete()
      .eq("id", id);
    if (error) alert(error.message);
    else buscarColaboradores();
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl text-white font-bold mb-8 flex items-center gap-2">
        <Users className="text-orange-500" /> Gestão de Colaboradores
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário de Cadastro */}
        <div className="bg-[#111] border border-[#222] p-6 rounded-xl h-fit">
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
              <label className="text-xs text-gray-500 block mb-1">SETOR</label>
              <select
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-white text-sm focus:border-orange-500 outline-none appearance-none"
              >
                {listaSetores.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-lg transition-colors text-sm shadow-lg shadow-orange-900/20"
            >
              CADASTRAR
            </button>
          </form>
        </div>

        {/* Listagem */}
        <div className="lg:col-span-2 bg-[#111] border border-[#222] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#222] bg-[#161616]">
            <h2 className="text-white font-semibold text-sm">
              Equipe Cadastrada
            </h2>
          </div>
          <div className="divide-y divide-[#222]">
            {carregando ? (
              <p className="p-6 text-gray-500">Carregando...</p>
            ) : colaboradores.length === 0 ? (
              <p className="p-6 text-gray-500 text-center text-sm">
                Nenhum colaborador encontrado.
              </p>
            ) : (
              colaboradores.map((colab) => (
                <div
                  key={colab.id}
                  className="p-4 flex items-center justify-between hover:bg-[#161616] transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center text-orange-500 font-bold border border-[#333]">
                      {colab.colaborador_nome.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">
                        {colab.colaborador_nome}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                        <Briefcase size={12} /> {colab.setor}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                        colab.status === "ferias"
                          ? "border-blue-900 text-blue-500 bg-blue-900/10"
                          : "border-green-900 text-green-500 bg-green-900/10"
                      }`}
                    >
                      {colab.status}
                    </span>
                    <button
                      onClick={() => deletarColaborador(colab.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-500 transition-all p-1"
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
  );
}
