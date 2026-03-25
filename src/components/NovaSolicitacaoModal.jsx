import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { X, Calendar, User } from "lucide-react";

export default function NovaSolicitacaoModal({ isOpen, onClose }) {
  const [colaboradores, setColaboradores] = useState([]);
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [salvando, setSalvando] = useState(false);

  // useEffect cuida de tudo: define a função e já a executa
  useEffect(() => {
    async function buscarColaboradores() {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("colaborador_nome, setor")
        .eq("status", "ativo") // Só traz quem está ativo
        .order("colaborador_nome");

      if (!error && data) {
        setColaboradores(data);
      }
    }

    // Se o modal estiver aberto, ele chama a função que acabou de criar
    if (isOpen) {
      buscarColaboradores();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!colaboradorSelecionado || !dataInicio || !dataFim) {
      return alert("Preencha todos os campos!");
    }

    setSalvando(true);

    // 1. Descobre o setor do colaborador
    const colab = colaboradores.find(
      (c) => c.colaborador_nome === colaboradorSelecionado,
    );

    // 2. Calcula automaticamente o total de dias
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    const diferencaEmTempo = fim.getTime() - inicio.getTime();
    // Converte a diferença de milissegundos para dias e soma 1 (para incluir o dia de início)
    const totalDeDias = Math.ceil(diferencaEmTempo / (1000 * 3600 * 24)) + 1;

    if (totalDeDias <= 0) {
      setSalvando(false);
      return alert("A data de retorno deve ser maior que a data de início!");
    }

    // 3. Salva no banco (agora enviando o total_dias)
    const { error } = await supabase.from("solicitacoes").insert([
      {
        colaborador_nome: colaboradorSelecionado,
        setor: colab?.setor || "Não informado",
        data_inicio: dataInicio,
        data_fim: dataFim,
        status: "pendente",
        total_dias: totalDeDias, // Fim do erro! 🎉
      },
    ]);

    setSalvando(false);

    if (error) {
      alert("Erro ao criar solicitação: " + error.message);
    } else {
      // Limpa tudo e fecha
      setColaboradorSelecionado("");
      setDataInicio("");
      setDataFim("");
      onClose();
    }
  };

  // Se o modal não estiver aberto, não renderiza nada
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200">
        {/* Botão de Fechar */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-6 border-b border-[#222]">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="text-orange-500" /> Nova Solicitação
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Agende o período de férias do colaborador.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 block mb-1">
              COLABORADOR
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-3 text-gray-500" />
              <select
                value={colaboradorSelecionado}
                onChange={(e) => setColaboradorSelecionado(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 pl-10 text-white text-sm focus:border-orange-500 outline-none appearance-none"
              >
                <option value="">Selecione um colaborador...</option>
                {colaboradores.map((c, i) => (
                  <option key={i} value={c.colaborador_nome}>
                    {c.colaborador_nome} ({c.setor})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1">
                DATA DE INÍCIO
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-white text-sm focus:border-orange-500 outline-none [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 block mb-1">
                DATA DE RETORNO
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 text-white text-sm focus:border-orange-500 outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:text-gray-400 text-white font-bold py-3 rounded-lg transition-colors text-sm shadow-lg mt-4"
          >
            {salvando ? "SALVANDO..." : "ENVIAR SOLICITAÇÃO"}
          </button>
        </form>
      </div>
    </div>
  );
}
