import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { Download, Upload, RefreshCcw, Trash2, Plus, ShieldCheck, X } from 'lucide-react';

interface AdminPanelProps {
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRestoreDefaults: () => void;
  onRemoveDuplicates: () => void;
  onAddManual: () => void;
  onClose: () => void;
  setProducts: React.Dispatch<React.SetStateAction<any[]>>;
  showToast: (msg: string) => void;
  onUpdateLogo: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isAdmin: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onExport,
  onImport,
  onRestoreDefaults,
  onRemoveDuplicates,
  onAddManual,
  onClose,
  setProducts,
  showToast,
  onUpdateLogo,
  isAdmin
}) => {
  const importInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-2 text-amber-700">
            <ShieldCheck size={20} />
            <h2 className="text-lg font-bold">Panel de Administración</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-amber-100 rounded-full transition-colors text-amber-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh] no-scrollbar">
          {!isAdmin ? (
            <div className="text-center py-8">
              <p className="text-rose-500 font-bold mb-2">Acceso Denegado</p>
              <p className="text-slate-500 text-sm">No tienes permisos de administrador.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-2xl transition-all border border-purple-100 group ios-active"
                >
                  <div className="p-2 bg-purple-500 text-white rounded-xl group-hover:scale-110 transition-transform">
                    <Upload size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Cambiar Logo</p>
                    <p className="text-[10px] opacity-70">Sube un nuevo logo para la app</p>
                    <input
                      type="file"
                      ref={logoInputRef}
                      onChange={onUpdateLogo}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </button>

                <button
                  onClick={onAddManual}
                  className="flex items-center gap-3 p-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl transition-all border border-emerald-100 group ios-active"
                >
                  <div className="p-2 bg-emerald-500 text-white rounded-xl group-hover:scale-110 transition-transform">
                    <Plus size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Añadir Manualmente</p>
                    <p className="text-[10px] opacity-70">Crea un producto paso a paso</p>
                  </div>
                </button>

                <button
                  onClick={onRemoveDuplicates}
                  className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl transition-all border border-blue-100 group ios-active"
                >
                  <div className="p-2 bg-blue-500 text-white rounded-xl group-hover:scale-110 transition-transform">
                    <Trash2 size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Limpiar Duplicados</p>
                    <p className="text-[10px] opacity-70">Elimina productos con el mismo nombre</p>
                  </div>
                </button>

                <button
                  onClick={onRestoreDefaults}
                  className="flex items-center gap-3 p-4 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-2xl transition-all border border-amber-100 group ios-active"
                >
                  <div className="p-2 bg-amber-500 text-white rounded-xl group-hover:scale-110 transition-transform">
                    <RefreshCcw size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Restaurar Básicos</p>
                    <p className="text-[10px] opacity-70">Añade los productos iniciales</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    if (window.confirm('¿Estás seguro de que quieres borrar TODOS los productos? Esta acción no se puede deshacer.')) {
                      setProducts([]);
                      showToast('Todos los productos han sido eliminados');
                    }
                  }}
                  className="flex items-center gap-3 p-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-2xl transition-all border border-red-100 group ios-active"
                >
                  <div className="p-2 bg-red-500 text-white rounded-xl group-hover:scale-110 transition-transform">
                    <Trash2 size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Borrar Todo</p>
                    <p className="text-[10px] opacity-70">Elimina permanentemente todos los datos</p>
                  </div>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Copia de Seguridad</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={onExport}
                    className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl transition-all border border-slate-200 ios-active"
                  >
                    <Download size={20} />
                    <span className="text-xs font-bold">Exportar JSON</span>
                  </button>

                  <button
                    onClick={() => importInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl transition-all border border-slate-200 ios-active"
                  >
                    <Upload size={20} />
                    <span className="text-xs font-bold">Importar JSON</span>
                    <input
                      type="file"
                      ref={importInputRef}
                      onChange={onImport}
                      accept=".json"
                      className="hidden"
                    />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 bg-slate-50 text-center">
          <p className="text-[10px] text-slate-400 font-medium">
            Fruites Bonany Admin Tools v2.0
          </p>
        </div>
      </motion.div>
    </div>
  );
};
