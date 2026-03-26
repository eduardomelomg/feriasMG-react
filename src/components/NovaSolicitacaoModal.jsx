import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { X, Calendar, User, AlertTriangle, Clock } from "lucide-react";

export default function NovaSolicitacaoModal({ isOpen, onClose }) {
  const [colaboradores, setColaboradores] = useState([]);
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Busca os colaboradores
  useEffect(() => {
    async function buscarColaboradores() {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("colaborador_nome, setor")
        .eq("status", "ativo")
        .order("colaborador_nome");

      if (!error && data) setColaboradores(data);
    }

    if (isOpen) {
      buscarColaboradores();
    }
  }, [isOpen]);

  // --- CÁLCULO DINÂMICO DE DIAS (Em tempo real) ---
  let totalDiasCalculado = 0;
  if (dataInicio && dataFim) {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    const diferenca = fim.getTime() - inicio.getTime();
    totalDiasCalculado = Math.ceil(diferenca / (1000 * 3600 * 24)) + 1;

    // AQUI ENTRARÃO AS NOVAS REGRAS NO FUTURO
    // Ex: descontar finais de semana, feriados, etc.
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!colaboradorSelecionado || !dataInicio || !dataFim) {
      return alert("Preencha todos os campos!");
    }

    if (totalDiasCalculado <= 0) {
      return alert("A data de retorno deve ser maior que a data de início!");
    }

    setSalvando(true);

    const colab = colaboradores.find(
      (c) => c.colaborador_nome === colaboradorSelecionado,
    );

    const { error } = await supabase.from("solicitacoes").insert([
      {
        colaborador_nome: colaboradorSelecionado,
        setor: colab?.setor || "Não informado",
        data_inicio: dataInicio,
        data_fim: dataFim,
        status: "pendente",
        total_dias: totalDiasCalculado,
      },
    ]);

    setSalvando(false);

    if (error) {
      alert("Erro ao criar solicitação: " + error.message);
    } else {
      setColaboradorSelecionado("");
      setDataInicio("");
      setDataFim("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200">
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
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2.5 pl-10 text-white text-sm focus:border-orange-500 outline-none appearance-none cursor-pointer"
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

          {/* --- LÓGICA DE SALDO DE FÉRIAS --- */}
          {colaboradorSelecionado &&
            (() => {
              const colab = colaboradores.find(
                (c) => c.colaborador_nome === colaboradorSelecionado,
              );
              const diasDireito = colab?.dias_direito ?? 30; // Se não tiver no banco, assume 30
              const diasGozados = colab?.dias_gozados ?? 0;
              const diasAGozar = diasDireito - diasGozados;
              const saldoAposSolicitacao = diasAGozar - totalDiasCalculado;
              const ultrapassouSaldo = totalDiasCalculado > diasAGozar;

              return (
                <div className="pt-2 space-y-3">
                  {/* Info de Saldo Atual */}
                  <div className="flex items-center justify-between text-xs text-gray-400 bg-[#161616] p-3 rounded-lg border border-[#222]">
                    <span>
                      Saldo atual:{" "}
                      <strong className="text-white">{diasAGozar} dias</strong>
                    </span>
                    <span>
                      Após aprovação:{" "}
                      <strong
                        className={
                          saldoAposSolicitacao < 0
                            ? "text-red-500"
                            : "text-white"
                        }
                      >
                        {saldoAposSolicitacao} dias
                      </strong>
                    </span>
                  </div>

                  {/* Badge Dinâmica de Status */}
                  {totalDiasCalculado > 0 ? (
                    ultrapassouSaldo ? (
                      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-500 animate-in fade-in slide-in-from-top-2">
                        <AlertTriangle size={16} />
                        <span className="text-sm font-medium">
                          Saldo insuficiente! O colaborador só possui{" "}
                          {diasAGozar} dias a gozar.
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 text-orange-500">
                          <Clock size={16} />
                          <span className="text-sm font-medium">
                            Dias a descontar do saldo:
                          </span>
                        </div>
                        <span className="text-orange-500 font-bold font-mono text-lg">
                          {totalDiasCalculado}
                        </span>
                      </div>
                    )
                  ) : dataInicio && dataFim ? (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-500 animate-in fade-in slide-in-from-top-2">
                      <AlertTriangle size={16} />
                      <span className="text-sm font-medium">
                        A data de retorno deve ser posterior ao início.
                      </span>
                    </div>
                  ) : null}

                  {/* Botão de Envio com a Nova Trava */}
                  <button
                    type="submit"
                    disabled={
                      salvando ||
                      !dataInicio ||
                      !dataFim ||
                      totalDiasCalculado <= 0 ||
                      ultrapassouSaldo
                    }
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:text-gray-400 text-white font-bold py-3 rounded-lg transition-colors text-sm shadow-lg mt-4 flex justify-center items-center"
                  >
                    {salvando
                      ? "SALVANDO..."
                      : ultrapassouSaldo
                        ? "SALDO EXCEDIDO"
                        : "ENVIAR SOLICITAÇÃO"}
                  </button>
                </div>
              );
            })()}
        </form>
      </div>
    </div>
  );
}
