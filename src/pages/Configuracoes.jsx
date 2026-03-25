//página de configuraç~eos
import { Shield, CalendarDays, Trash2, ChevronDown } from "lucide-react";

export default function Configuracoes() {
  const setores = [
    "Contábil",
    "Departamento Pessoal",
    "Financeiro",
    "Fiscal",
    "Recursos Humanos",
    "Societário",
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl text-white font-bold">Configurações</h1>
        <p className="text-sm text-gray-500 mt-1">
          Regras por setor, períodos críticos e férias coletivas
        </p>
      </div>

      <h2 className="text-sm font-semibold text-orange-400 flex items-center gap-2 mb-4">
        <Shield size={16} /> Regras por Setor
      </h2>
      <div className="space-y-3 mb-10">
        {setores.map((setor) => (
          <div
            key={setor}
            className="bg-[#111111] border border-[#222] p-4 rounded-xl flex items-center justify-between cursor-pointer hover:border-gray-700"
          >
            <div className="flex items-center gap-3">
              <span className="bg-gray-800 text-gray-400 text-[10px] font-bold px-2 py-1 rounded uppercase">
                {setor.substring(0, 4)}
              </span>
              <span className="text-gray-300 font-medium text-sm">
                {setor}{" "}
                <span className="text-gray-600 text-xs font-normal">
                  0 colab.
                </span>
              </span>
            </div>
            <div className="flex items-center gap-4 text-gray-500 text-sm">
              <span>Limite: 10%</span>
              <ChevronDown size={16} />
            </div>
          </div>
        ))}
        {/* Card do TI Expandido */}
        <div className="bg-[#111111] border border-orange-500/30 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="bg-orange-900/30 text-orange-500 text-[10px] font-bold px-2 py-1 rounded">
                TI
              </span>
              <span className="text-white font-medium text-sm">
                Tecnologia da Informação{" "}
                <span className="text-gray-500 text-xs font-normal">
                  3 colab.
                </span>
              </span>
            </div>
            <div className="flex items-center gap-4 text-gray-400 text-sm">
              <span>Limite: 75%</span>
              <span>Cob. mín: 1</span>
              <ChevronDown size={16} className="rotate-180 text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#333]">
              <p className="text-gray-500 text-xs mb-1">
                Limite de ausência simultânea
              </p>
              <p className="text-orange-400 text-xl font-bold">75%</p>
            </div>
            <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#333]">
              <p className="text-gray-500 text-xs mb-1">
                Cobertura mínima obrigatória
              </p>
              <p className="text-orange-400 text-xl font-bold">1</p>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-4">
        <CalendarDays size={16} /> Férias Coletivas
      </h2>
      <div className="bg-[#111111] border border-[#222] p-4 rounded-xl flex items-center justify-between mb-2">
        <div>
          <p className="text-white text-sm font-medium">
            Férias coletivas natal
          </p>
          <p className="text-gray-500 text-xs">
            22/12/2026 — 03/01/2027 • 13 dias
          </p>
        </div>
        <button className="text-gray-600 hover:text-red-500">
          <Trash2 size={16} />
        </button>
      </div>
      <button className="w-full py-3 border border-dashed border-[#333] text-gray-500 hover:text-white hover:border-gray-500 rounded-xl text-sm transition-colors">
        + Registrar Férias Coletivas
      </button>
    </div>
  );
}
