import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Star, MapPin, Calendar, Trash2, Ruler, Edit3, ChevronRight } from 'lucide-react';
import { Product } from '../types';
import { CATEGORIES } from '../constants';

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
  isAdminMode?: boolean;
  onDelete?: (id: string) => void;
  onToggleLocal?: (id: string) => void;
  onToggleSeasonal?: (id: string) => void;
  onUpdateCategory?: (id: string, newCategory: string) => void;
  viewMode?: 'grid' | 'list';
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({ 
  product, 
  onClick, 
  isAdminMode, 
  onDelete, 
  onToggleLocal, 
  onToggleSeasonal,
  viewMode = 'grid'
}) => {
  const [imgError, setImgError] = useState(false);

  // Reset error state if the image prop changes
  React.useEffect(() => {
    setImgError(false);
  }, [product.image]);

  const fallback = `https://picsum.photos/seed/${product.id}/500/500`;
  const imgSrc = imgError ? fallback : (product.image || fallback);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={!isAdminMode ? { scale: 0.96 } : {}}
      onClick={() => !isAdminMode && onClick(product)}
      draggable={isAdminMode}
      onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
        if (isAdminMode) {
          e.dataTransfer.setData('productId', product.id);
          e.dataTransfer.effectAllowed = 'move';
        } else {
          e.preventDefault();
        }
      }}
      className={`group bg-white rounded-[24px] overflow-hidden shadow-sm border border-black/5 relative transition-all duration-300 ${
        viewMode === 'list' 
          ? 'flex flex-row items-center p-3 gap-4 hover:bg-slate-50' 
          : 'flex flex-col h-full hover:shadow-md'
      } ${
        !isAdminMode ? 'ios-active cursor-pointer' : 'cursor-grab active:cursor-grabbing'
      }`}
    >
      {/* Product Code Tag - Only in Grid Mode */}
      {product.code && viewMode === 'grid' && (
        <div className="absolute top-0 right-0 z-10 bg-emerald-500 text-white px-3 py-1 rounded-bl-2xl font-bold text-[11px] shadow-sm">
          #{product.code}
        </div>
      )}

      {/* Admin Controls Overlay */}
      {isAdminMode && (
        <div className={`absolute z-20 flex gap-2 bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-lg border border-black/10 ${viewMode === 'list' ? 'right-4 top-1/2 -translate-y-1/2 flex-row' : 'bottom-2 right-2 flex-row'}`}>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete?.(product.id); }}
            className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
            title="Eliminar producto"
          >
            <Trash2 size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleLocal?.(product.id); }}
            className={`p-2 rounded-full transition-colors ${product.isLocal ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
            title="Alternar Local"
          >
            <MapPin size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleSeasonal?.(product.id); }}
            className={`p-2 rounded-full transition-colors ${product.isSeasonal ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
            title="Alternar Temporada"
          >
            <Calendar size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onClick(product); }}
            className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
            title="Editar detalles / Categoría"
          >
            <Edit3 size={16} />
          </button>
        </div>
      )}

      {/* Image Container */}
      <div className={`relative overflow-hidden bg-white flex-shrink-0 transition-all duration-300 ${viewMode === 'list' ? 'w-16 h-16 sm:w-20 sm:h-20 rounded-xl' : 'aspect-square p-4'}`}>
        <img
          src={imgSrc || undefined}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
        
        {/* Status Badges - iOS Style - Hidden in list mode to avoid clutter */}
        {viewMode === 'grid' && (
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.isLocal && (
              <div className="bg-emerald-500/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                <MapPin size={10} />
                <span>LOCAL</span>
              </div>
            )}
            {product.isSeasonal && (
              <div className="bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                <Calendar size={10} />
                <span>TEMPORADA</span>
              </div>
            )}
          </div>
        )}

        {/* Size Badge - Bottom Right of Image */}
        {product.size && product.size > 0 && (
          <div className={`absolute bottom-2 right-2 z-10 bg-blue-500/90 backdrop-blur-md text-white px-2 py-0.5 rounded-full font-bold text-[9px] shadow-sm flex items-center gap-1 ${viewMode === 'list' ? 'scale-90' : ''}`}>
            <Ruler size={9} />
            {product.size >= 1000 ? `${product.size / 1000}L` : `${product.size}ml`}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`flex flex-1 ${viewMode === 'list' ? 'flex-row items-center justify-between' : 'flex-col p-4'}`}>
        <div className={`${viewMode === 'list' ? 'flex-1 min-w-0' : 'flex-1'}`}>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
              {CATEGORIES.find(c => c.id === product.category)?.name || product.category}
            </p>
            {viewMode === 'list' && product.code && (
              <span className="text-[10px] font-bold text-slate-400">#{product.code}</span>
            )}
          </div>
          <h3 className={`font-bold text-black leading-tight group-hover:text-emerald-600 transition-colors ${viewMode === 'list' ? 'text-[15px] truncate' : 'text-[17px] mb-1'}`}>
            {product.name}
          </h3>
          {viewMode === 'grid' && (
            <p className="text-sm text-slate-500 font-medium leading-snug line-clamp-2">
              {product.description}
            </p>
          )}
        </div>
        
        <div className={`flex items-center gap-4 ${viewMode === 'list' ? 'ml-4' : 'mt-4 pt-3 border-t border-black/5 justify-between'}`}>
          {/* Badges in List Mode */}
          {viewMode === 'list' && (
            <div className="hidden sm:flex gap-2">
              {product.isLocal && <MapPin size={14} className="text-emerald-500" />}
              {product.isSeasonal && <Calendar size={14} className="text-amber-500" />}
            </div>
          )}
          
          <div className="flex items-center gap-1 text-amber-500">
            <Star size={14} fill="currentColor" />
            <span className="text-xs font-bold text-black">{product.rating}</span>
          </div>
          
          {viewMode === 'grid' && (
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Ver Ficha
            </div>
          )}
          
          {viewMode === 'list' && (
            <div className="p-2 text-slate-300 group-hover:text-emerald-500 transition-colors">
              <ChevronRight size={20} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

ProductCard.displayName = 'ProductCard';
