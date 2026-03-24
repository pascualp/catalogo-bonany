import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Save, Camera, Plus } from 'lucide-react';
import { Product } from '../types';
import { CATEGORIES } from '../constants';

interface ProductFormProps {
  onSave: (product: Product) => void;
  onCancel: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    code: '',
    category: 'frutas',
    description: '',
    isLocal: false,
    isSeasonal: false,
    price: 0,
    rating: 5,
    size: 0,
    image: ''
  });

  const [preview, setPreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreview(base64);
        setFormData(prev => ({ ...prev, image: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category) return;

    const newProduct: Product = {
      id: `manual-${Date.now()}`,
      name: formData.name.toUpperCase(),
      code: formData.code || '',
      category: formData.category as string,
      description: formData.description || 'Producto añadido manualmente.',
      image: formData.image || 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&q=80&w=400',
      price: formData.price || 0,
      rating: formData.rating || 5,
      isLocal: formData.isLocal || false,
      isSeasonal: formData.isSeasonal || false,
      size: formData.size || 0
    };

    onSave(newProduct);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">Añadir Nuevo Producto</h2>
          <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6">
          {/* Image Upload */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-40 h-40 bg-slate-100 rounded-3xl overflow-hidden border-2 border-dashed border-slate-300 flex items-center justify-center relative group">
              {preview ? (
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Camera size={40} className="text-slate-400" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs font-bold">Cambiar Foto</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre del Producto</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: TOMATE CHERRY"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Código (Opcional)</label>
              <input
                type="text"
                value={formData.code}
                onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder="Ej: 101"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
              <select
                value={formData.category}
                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium appearance-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tamaño / Formato</label>
              <input
                type="number"
                value={formData.size || ''}
                onChange={e => setFormData(prev => ({ ...prev, size: parseInt(e.target.value) || 0 }))}
                placeholder="Ej: 250 (ml)"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Descripción</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Breve descripción del producto..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium h-24 resize-none"
            />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.isLocal ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                {formData.isLocal && <Plus size={16} className="text-white" />}
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={formData.isLocal}
                onChange={e => setFormData(prev => ({ ...prev, isLocal: e.target.checked }))}
              />
              <span className="text-sm font-bold text-slate-600">Producto Local</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.isSeasonal ? 'bg-amber-500 border-amber-500' : 'border-slate-300'}`}>
                {formData.isSeasonal && <Plus size={16} className="text-white" />}
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={formData.isSeasonal}
                onChange={e => setFormData(prev => ({ ...prev, isSeasonal: e.target.checked }))}
              />
              <span className="text-sm font-bold text-slate-600">De Temporada</span>
            </label>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all ios-active"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-2 px-6 py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 ios-active"
            >
              <Save size={20} />
              Guardar Producto
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
