import { Download } from 'lucide-react';

export default function Relatorios() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
         <div>
            <h1 className="text-2xl text-white font-bold">Relatórios</h1>
            <p className="text-sm text-gray-500 mt-1">1 solicitações no sistema</p>
         </div>
         <button className="bg-orange-500/10 text-orange-500 border border-orange-500/50 hover:bg-orange-500 hover:text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <Download size={16} /> Exportar CSV
        </button>
      </div>
      <div className="h-[400px] border border-[#222] rounded-xl flex items-center justify-center bg-[#111111]">
         <p className="text-gray-600">Gráficos e Tabela de Relatórios aqui</p>
      </div>
    </div>
  );
}