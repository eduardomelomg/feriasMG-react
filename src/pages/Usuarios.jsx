//página de usuários
import { Plus, Edit, Trash2, Clock } from "lucide-react";

export default function Usuarios() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl text-white font-bold">Gestão de Usuários</h1>
          <p className="text-sm text-gray-500 mt-1">3 usuários cadastrados</p>
        </div>
        <button className="bg-orange-500/10 text-orange-500 border border-orange-500/50 hover:bg-orange-500 hover:text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <Plus size={16} /> Pré-cadastrar Usuário
        </button>
      </div>

      {/* Tabela de Usuários Ativos */}
      <div className="bg-[#111111] border border-[#222] rounded-xl overflow-hidden mb-8">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#1a1a1a] border-b border-[#222]">
            <tr>
              <th className="p-4 text-xs font-semibold text-gray-500">
                USUÁRIO
              </th>
              <th className="p-4 text-xs font-semibold text-gray-500">
                E-MAIL
              </th>
              <th className="p-4 text-xs font-semibold text-gray-500">
                PERFIL
              </th>
              <th className="p-4 text-xs font-semibold text-gray-500 text-center">
                SETOR
              </th>
              <th className="p-4 text-xs font-semibold text-gray-500">
                STATUS
              </th>
              <th className="p-4 text-xs font-semibold text-gray-500"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222]">
            {/* Exemplo de linha. Vamos iterar isso depois */}
            <tr className="hover:bg-[#151515]">
              <td className="p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-900 text-orange-200 flex items-center justify-center font-bold text-xs">
                  E
                </div>
                <span className="text-white text-sm font-medium">
                  Eduardo Melo Pereira
                </span>
              </td>
              <td className="p-4 text-gray-400 text-sm">
                eduardo.melo@mendonca...
              </td>
              <td className="p-4">
                <span className="border border-orange-900/50 text-orange-400 px-2 py-1 rounded text-xs flex w-max items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  Admin TI
                </span>
              </td>
              <td className="p-4 text-center">
                <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs font-bold">
                  TI
                </span>
              </td>
              <td className="p-4">
                <span className="text-green-500 text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  Ativo
                </span>
              </td>
              <td className="p-4 text-right">
                <button className="text-gray-500 hover:text-white">
                  <Edit size={16} />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Seção Aguardando Login */}
      <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
        <Clock size={16} className="text-gray-400" /> Aguardando Primeiro Login{" "}
        <span className="text-gray-500 font-normal">(4)</span>
      </h2>
      <div className="bg-[#111111] border border-[#222] rounded-xl overflow-hidden">
        {/* Tabela simplificada para ilustrar */}
        <div className="p-4 flex items-center justify-between border-b border-[#222] hover:bg-[#1a1a1a]">
          <div className="flex items-center gap-3 w-1/4">
            <div className="w-8 h-8 rounded bg-gray-800 text-gray-400 flex items-center justify-center text-xs">
              C
            </div>
            <span className="text-gray-300 text-sm">Ciro Costa</span>
          </div>
          <div className="text-gray-500 text-sm w-1/3">
            ciro.costa@mendonca...
          </div>
          <div className="text-gray-500 text-sm">Coordenador DP</div>
          <div className="text-gray-500 text-xs font-bold bg-[#1a1a1a] px-2 py-1 rounded">
            DP
          </div>
          <button className="text-red-900 hover:text-red-500">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
