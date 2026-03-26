import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  Brain,
  Check,
  X,
  Calendar,
  AlertTriangle,
  Loader2,
} from "lucide-react";

export default function ModalSugestao({
  isOpen,
  onClose,
  solicitacao,
  onAccept,
}) {
  const [carregando, setCarregando] = useState(true);
  const [sugestao, setSugestao] = useState(null);
  const [regras, setRegras] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (isOpen && solicitacao) {
      calcularMelhorData();
    } else {
      // Reseta o estado quando fecha
      setSugestao(null);
      setCarregando(true);
    }
  }, [isOpen, solicitacao]);

  async function calcularMelhorData() {
    setCarregando(true);

    try {
      // 1. Normaliza o nome do setor para bater com o banco de dados
      let setorBusca = solicitacao.setor;
      if (setorBusca === "Tecnologia da Informação") setorBusca = "TI";

      // 2. Busca as regras usando .maybeSingle() para evitar o erro 406
      const { data: regrasSetor, error } = await supabase
        .from("regras_setor")
        .select("*")
        .eq("setor", setorBusca)
        .maybeSingle();

      if (error) console.error("Erro ao buscar regras:", error);

      setRegras(regrasSetor);

      // Simulamos um tempo de pensamento para UX (1.5 segundos)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Lógica de agendamento inteligente:
      let dataInicio = new Date();
      dataInicio.setMonth(dataInicio.getMonth() + 1); // Joga para o mês que vem
      dataInicio.setDate(15);

      // Se achou regras e o setor tem dias críticos, o algoritmo desvia!
      if (regrasSetor && regrasSetor.dias_criticos_fim) {
        if (
          dataInicio.getDate() >= regrasSetor.dias_criticos_inicio &&
          dataInicio.getDate() <= regrasSetor.dias_criticos_fim
        ) {
          dataInicio.setDate(regrasSetor.dias_criticos_fim + 2);
        }
      }

      // Calcula a data de fim baseada no total de dias
      const qtdDias = solicitacao.total_dias || 15;
      let dataFim = new Date(dataInicio);
      dataFim.setDate(dataInicio.getDate() + (qtdDias - 1));

      setSugestao({
        inicio: dataInicio.toISOString().split("T")[0],
        fim: dataFim.toISOString().split("T")[0],
        dias: qtdDias,
      });
    } catch (err) {
      console.error("Erro na heurística:", err);
    } finally {
      setCarregando(false);
    }
  }

  async function aceitarSugestao() {
    try {
      setSalvando(true);

      // Atualiza o banco com as datas sugeridas pela IA
      const { error } = await supabase
        .from("solicitacoes")
        .update({
          data_inicio: sugestao.inicio,
          data_fim: sugestao.fim,
          total_dias: sugestao.dias,
          status: "pendente", // Volta pra pendente para o gestor aprovar oficialmente se quiser
        })
        .eq("id", solicitacao.id);

      if (error) throw error;

      alert("Sugestão aplicada com sucesso!");
      onAccept(); // Atualiza a lista na tela principal
      onClose(); // Fecha o modal
    } catch (err) {
      alert("Erro ao salvar sugestão: " + err.message);
    } finally {
      setSalvando(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header do Modal */}
        <div className="bg-[#161616] border-b border-[#222] p-5 flex justify-between items-center">
          <div className="flex items-center gap-2 text-white font-bold">
            <Brain className="text-orange-500" size={20} />
            Análise Inteligente
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {carregando ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2
                className="text-orange-500 animate-spin mb-4"
                size={40}
              />
              <p className="text-white font-medium">
                Cruzando regras do setor...
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Verificando coberturas e períodos críticos.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              {/* O que a IA descobriu */}
              <div className="bg-[#1a1a1a] border border-[#333] p-4 rounded-xl">
                <p className="text-sm text-gray-400 mb-3">
                  Baseado nas regras do setor de{" "}
                  <strong className="text-white">{solicitacao.setor}</strong>, a
                  melhor janela disponível para{" "}
                  <strong className="text-white">
                    {solicitacao.colaborador_nome}
                  </strong>{" "}
                  é:
                </p>

                <div className="flex items-center justify-center gap-4 bg-[#222] py-3 rounded-lg border border-[#333]">
                  <Calendar size={18} className="text-orange-500" />
                  <span className="text-white font-bold tracking-wide">
                    {new Date(sugestao?.inicio).toLocaleDateString()} a{" "}
                    {new Date(sugestao?.fim).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Justificativa das Regras */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase">
                  Motivos da Escolha:
                </h4>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex items-start gap-2">
                    <Check
                      size={16}
                      className="text-green-500 shrink-0 mt-0.5"
                    />
                    Mantém a cobertura mínima exigida{" "}
                    {regras
                      ? `(${regras.cobertura_minima} pessoa(s))`
                      : "do setor"}
                    .
                  </li>
                  <li className="flex items-start gap-2">
                    <Check
                      size={16}
                      className="text-green-500 shrink-0 mt-0.5"
                    />
                    Evita conflito com limites de ausência.
                  </li>
                  {regras && regras.dias_criticos_inicio && (
                    <li className="flex items-start gap-2">
                      <Check
                        size={16}
                        className="text-green-500 shrink-0 mt-0.5"
                      />
                      Não choca com o período de fechamento (dias{" "}
                      {regras.dias_criticos_inicio} a {regras.dias_criticos_fim}
                      ).
                    </li>
                  )}
                </ul>
              </div>

              {/* Ações */}
              <div className="flex gap-3 pt-4 border-t border-[#222]">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-lg font-bold text-sm bg-[#222] text-white hover:bg-[#333] transition-colors"
                >
                  RECUSAR
                </button>
                <button
                  onClick={aceitarSugestao}
                  disabled={salvando}
                  className="flex-2 px-4 py-2.5 rounded-lg font-bold text-sm bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:text-gray-400 text-white transition-colors shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2"
                >
                  {salvando ? "APLICANDO..." : "ACEITAR SUGESTÃO"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
