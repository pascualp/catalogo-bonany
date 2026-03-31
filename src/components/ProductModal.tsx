import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Calendar, Star, Shield, Truck, Share2, LayoutGrid, Ruler } from 'lucide-react';
import { Product } from '../types';
import { CATEGORIES } from '../constants';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  isAdminMode?: boolean;
  onUpdateCategory?: (id: string, newCategory: string) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ 
  product, 
  onClose, 
  isAdminMode, 
  onUpdateCategory 
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [product?.image]);

  const fallback = product ? `https://picsum.photos/seed/${product.id}/800/800` : undefined;
  const imgSrc = imgError ? fallback : (product?.image || fallback);

  return (
    <AnimatePresence>
      {product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop - iOS Style */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          />

          {/* Modal Content - iOS Sheet Style */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row"
          >
            {/* Close Button - iOS Style */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 bg-black/5 hover:bg-black/10 rounded-full text-slate-600 transition-all ios-active"
            >
              <X size={20} />
            </button>

            {/* Image Section */}
            <div className="w-full md:w-1/2 h-64 md:h-auto min-h-[300px] bg-slate-50 relative overflow-hidden flex items-center justify-center p-8">
              {/* Blurred Background for premium feel */}
              <div 
                className="absolute inset-0 opacity-40 blur-3xl scale-125 bg-center bg-cover transition-all duration-500"
                style={{ backgroundImage: `url(${imgSrc})` }}
              />
              
              {/* Main Image - Constrained size to prevent pixelation */}
              <div className="relative z-10 w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
                <img
                  src={imgSrc || undefined}
                  alt={product.name}
                  className="max-w-full max-h-full object-contain drop-shadow-2xl transition-transform duration-500 hover:scale-105"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                />
              </div>
              
              <div className="absolute top-6 left-6 flex flex-col gap-2 z-20">
                {product.isLocal && (
                  <div className="bg-emerald-500/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5">
                    <MapPin size={12} />
                    <span>PRODUCTO LOCAL</span>
                  </div>
                )}
                {product.isSeasonal && (
                  <div className="bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5">
                    <Calendar size={12} />
                    <span>TEMPORADA</span>
                  </div>
                )}
              </div>
            </div>

            {/* Info Section */}
            <div className="w-full md:w-1/2 p-6 md:p-10 overflow-y-auto no-scrollbar flex flex-col">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">
                      {CATEGORIES.find(c => c.id === product.category)?.name || product.category}
                    </span>
                    {product.code && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold">
                        #{product.code}
                      </span>
                    )}
                    {product.size && product.size > 0 && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[10px] font-bold flex items-center gap-1">
                        <Ruler size={10} />
                        {product.size >= 1000 ? `${product.size / 1000}L` : `${product.size}ml`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star size={16} fill="currentColor" />
                    <span className="text-sm font-bold text-black">{product.rating}</span>
                  </div>
                </div>

                <h2 className="text-3xl font-bold text-black leading-tight mb-6">
                  {product.name}
                </h2>

                <p className="text-[15px] text-slate-500 leading-relaxed mb-8 font-medium">
                  {product.description}
                </p>

                {/* Admin Category Selector */}
                {isAdminMode && onUpdateCategory && (
                  <div className="mb-8 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <h4 className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-3">Cambiar Categoría (Admin)</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => onUpdateCategory(product.id, cat.id)}
                          className={`px-3 py-2 rounded-xl text-[10px] font-bold transition-all ${
                            product.category === cat.id 
                              ? 'bg-amber-500 text-white shadow-md' 
                              : 'bg-white text-amber-700 hover:bg-amber-100 border border-amber-200'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technical Details Grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-[#f2f2f7] rounded-2xl">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Shield size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Calidad</span>
                    </div>
                    <p className="text-sm font-bold text-black">Premium A+</p>
                  </div>
                  <div className="p-4 bg-[#f2f2f7] rounded-2xl">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Truck size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Entrega</span>
                    </div>
                    <p className="text-sm font-bold text-black">24h Mallorca</p>
                  </div>
                </div>

                {/* Formats and Uses Section */}
                <div className="space-y-4 mb-8">
                  <div className="p-4 border border-black/5 rounded-2xl bg-emerald-50/30">
                    <div className="flex items-center gap-2 mb-2">
                      <LayoutGrid size={14} className="text-emerald-600" />
                      <h4 className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Formatos Disponibles</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {product.formats ? (
                        product.formats.map((f, i) => (
                          <span key={i} className="px-3 py-1 bg-white border border-emerald-100 rounded-full text-xs font-bold text-emerald-700">
                            {f}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-slate-600 font-medium leading-relaxed">
                          {product.format || 'Consultar disponibilidad'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="p-4 border border-black/5 rounded-2xl bg-amber-50/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Star size={14} className="text-amber-600" />
                      <h4 className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Usos Recomendados</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {product.uses ? (
                        product.uses.map((u, i) => (
                          <span key={i} className="px-3 py-1 bg-white border border-amber-100 rounded-full text-xs font-bold text-amber-700">
                            {u}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-slate-600 font-medium leading-relaxed">
                          {product.useCase || 'Ideal para todo tipo de preparaciones culinarias.'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t border-black/5">
                <button className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-bold text-[15px] shadow-lg shadow-emerald-500/20 ios-active">
                  Solicitar Información
                </button>
                <button className="p-4 bg-[#f2f2f7] text-black rounded-2xl ios-active">
                  <Share2 size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
