import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Clipboard, CheckCircle2, AlertCircle } from 'lucide-react';

interface JsonPasteModalProps {
  onSave: (json: string) => void;
  onClose: () => void;
}

export const JsonPasteModal: React.FC<JsonPasteModalProps> = ({ onSave, onClose }) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!jsonText.trim()) {
      setError('Por favor, pega el contenido JSON');
      return;
    }

    try {
      // Basic validation
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        setError('El JSON debe ser una lista [] de productos');
        return;
      }
      onSave(jsonText);
    } catch (err) {
      setError('El formato JSON no es válido. Revisa que no falten comas o llaves.');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-cyan-50/50">
          <div className="flex items-center gap-2 text-cyan-700">
            <Clipboard size={20} />
            <h2 className="text-lg font-bold">Pegar Catálogo Completo</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-cyan-100 rounded-full transition-colors text-cyan-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-4">
          <p className="text-sm text-slate-500 leading-relaxed">
            Copia el contenido de tu archivo <code className="bg-slate-100 px-1 rounded">productos.json</code> y pégalo en el cuadro de abajo. 
            Esto reemplazará o actualizará los productos existentes.
          </p>

          <div className="relative flex-1 min-h-[300px] flex flex-col">
            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setError(null);
              }}
              placeholder='[{"id": "1", "name": "Tomate", ...}, ...]'
              className="w-full h-full min-h-[300px] p-4 font-mono text-xs bg-slate-900 text-cyan-400 rounded-2xl border-2 border-slate-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 outline-none transition-all resize-none"
              spellCheck={false}
            />
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-3 bg-rose-50 text-rose-600 rounded-xl flex items-center gap-2 text-sm border border-rose-100"
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </motion.div>
            )}
          </div>

          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
            <p className="text-xs text-amber-700 leading-tight">
              <strong>Nota:</strong> Si el archivo es muy grande (3000+ productos), el proceso de guardado puede tardar unos segundos. No cierres la aplicación hasta recibir la confirmación.
            </p>
          </div>
        </div>

        <div className="p-6 bg-slate-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-white text-slate-600 font-bold rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all ios-active"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-[2] py-4 bg-cyan-500 text-white font-bold rounded-2xl shadow-lg shadow-cyan-200 hover:bg-cyan-600 transition-all flex items-center justify-center gap-2 ios-active"
          >
            <CheckCircle2 size={20} />
            Procesar y Guardar
          </button>
        </div>
      </motion.div>
    </div>
  );
};
