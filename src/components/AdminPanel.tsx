import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Download, Upload, RefreshCcw, Trash2, Plus, ShieldCheck, X, Image as ImageIcon, Sparkles } from 'lucide-react';
import { saveSettings, loadSettings, getIsQuotaExceeded } from '../lib/db';

interface AdminPanelProps {
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRestoreDefaults: () => void;
  onRemoveDuplicates: () => void;
  onClearAll: () => void;
  onAddManual: () => void;
  onSyncFromExternal: () => void;
  onPasteJson: () => void;
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
  onClearAll,
  onAddManual,
  onSyncFromExternal,
  onPasteJson,
  onClose,
  setProducts,
  showToast,
  onUpdateLogo,
  isAdmin
}) => {
  const importInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const optimizeInputRef = useRef<HTMLInputElement>(null);
  const batchImagesInputRef = useRef<HTMLInputElement>(null);
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState('');
  const [cloudinaryUploadPreset, setCloudinaryUploadPreset] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [optimizationMode, setOptimizationMode] = useState<'cloudinary' | 'local'>('local');

  const [showCloudinaryGuide, setShowCloudinaryGuide] = useState(false);

  React.useEffect(() => {
    loadSettings().then(settings => {
      if (settings) {
        setCloudinaryCloudName(settings.cloudinaryCloudName || '');
        setCloudinaryUploadPreset(settings.cloudinaryUploadPreset || '');
        if (settings.optimizationMode) {
          setOptimizationMode(settings.optimizationMode);
        }
      }
    });
  }, []);

  const handleSaveCloudinary = async () => {
    try {
      await saveSettings({
        cloudinaryCloudName,
        cloudinaryUploadPreset,
        useCloudinary: !!(cloudinaryCloudName && cloudinaryUploadPreset),
        optimizationMode
      });
      showToast('Configuración de Cloudinary guardada');
    } catch (error) {
      showToast('Error al guardar configuración');
    }
  };

  const CloudinaryGuide = () => (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden flex flex-col p-8 space-y-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-blue-700">Guía de Configuración</h3>
          <button onClick={() => setShowCloudinaryGuide(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-4 text-sm text-slate-600 leading-relaxed overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <p className="font-bold text-blue-800 mb-2">1. Crea tu cuenta</p>
            <p>Regístrate gratis en <a href="https://cloudinary.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Cloudinary.com</a>.</p>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <p className="font-bold text-blue-800 mb-2">2. Obtén tu "Cloud Name"</p>
            <p>Lo verás en el Dashboard principal. Cópialo y pégalo en el campo <strong>Cloud Name</strong> del panel.</p>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <p className="font-bold text-blue-800 mb-2">3. Crea un "Upload Preset"</p>
            <ol className="list-decimal ml-4 space-y-1 mt-2">
              <li>Ve a <strong>Settings</strong> (engranaje abajo a la izquierda).</li>
              <li>Entra en <strong>Upload</strong>.</li>
              <li>Baja hasta <strong>Upload presets</strong> y haz clic en <strong>Add upload preset</strong>.</li>
              <li>En <strong>Signing Mode</strong>, cámbialo a <strong>Unsigned</strong> (¡Importante!).</li>
              <li>Copia el nombre generado (ej: ml_default) y pégalo en el campo <strong>Upload Preset</strong>.</li>
              <li>Dale a <strong>Save</strong> arriba a la derecha.</li>
            </ol>
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <p className="font-bold text-emerald-800 mb-2">4. Sube tu catálogo</p>
            <p>Ahora selecciona tu archivo JSON y usa el botón azul de <strong>Subir Imágenes a la Nube</strong>. El sistema subirá todas tus fotos PNG automáticamente y te devolverá un archivo optimizado.</p>
          </div>
        </div>

        <button 
          onClick={() => setShowCloudinaryGuide(false)}
          className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          Entendido
        </button>
      </motion.div>
    </div>
  );

  const optimizeAndUpload = async (file?: File) => {
    let jsonStr = '';
    
    if (file) {
      jsonStr = await file.text();
    } else {
      jsonStr = window.prompt('Pega aquí el JSON para optimizarlo:') || '';
    }

    if (!jsonStr) return;

    if (optimizationMode === 'cloudinary' && (!cloudinaryCloudName || !cloudinaryUploadPreset)) {
      showToast('Configura Cloudinary primero o usa Compresión Local');
      return;
    }

    try {
      const data = JSON.parse(jsonStr);
      const products = Array.isArray(data) ? data : (data.products || []);
      
      if (!Array.isArray(products)) {
        showToast('Formato JSON no válido');
        return;
      }

      setIsOptimizing(true);
      setOptimizationProgress(0);
      
      const productsToProcess = [...products];
      const total = productsToProcess.length;
      let completedCount = 0;

      const optimizedProducts = await Promise.all(productsToProcess.map(async (p, index) => {
        let imageUrl = p.image || p.imagen;

        // Skip if already a URL or not base64
        if (imageUrl && imageUrl.startsWith('data:image')) {
          if (optimizationMode === 'cloudinary') {
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount <= maxRetries) {
              try {
                const formData = new FormData();
                formData.append('file', imageUrl);
                formData.append('upload_preset', cloudinaryUploadPreset);
                
                const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, {
                  method: 'POST',
                  body: formData
                });
                
                if (res.ok) {
                  const cloudData = await res.json();
                  imageUrl = cloudData.secure_url;
                  break; // Success
                }
              } catch (e) {
                console.error(`Error en producto ${index}:`, e);
              }
              
              retryCount++;
              if (retryCount <= maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
              }
            }
          } else {
            // Local compression logic
            try {
              const isPng = imageUrl.startsWith('data:image/png');
              imageUrl = await new Promise((resolve) => {
                const img = new Image();
                img.src = imageUrl;
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const size = 600;
                  let width = img.width;
                  let height = img.height;
                  if (width > height) {
                    if (width > size) { height *= size / width; width = size; }
                  } else {
                    if (height > size) { width *= size / height; height = size; }
                  }
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);
                    const format = isPng ? 'image/png' : 'image/jpeg';
                    const quality = isPng ? undefined : 0.8;
                    resolve(canvas.toDataURL(format, quality));
                  } else { resolve(imageUrl); }
                };
                img.onerror = () => resolve(imageUrl);
              });
            } catch (e) { console.error('Error local:', e); }
          }
        }

        completedCount++;
        // Update progress every 10 items to avoid UI lag
        if (completedCount % 10 === 0 || completedCount === total) {
          setOptimizationProgress(Math.round((completedCount / total) * 100));
        }

        return {
          ...p,
          image: imageUrl,
          id: p.id || `opt-${Date.now()}-${index}`
        };
      }));

      const finalJson = {
        version: Date.now(),
        products: optimizedProducts
      };

      const dataStr = JSON.stringify(finalJson); // Minified (no spaces)
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const exportFileDefaultName = `catalog_reducido_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', url);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      URL.revokeObjectURL(url);

      showToast('¡Archivo reducido descargado! Ahora súbelo a GitHub.');
    } catch (err) {
      showToast('Error al procesar el JSON');
    } finally {
      setIsOptimizing(false);
    }
  };

  const uploadMultipleImages = async (files: FileList) => {
    if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
      showToast('Configura Cloudinary primero');
      return;
    }

    setIsOptimizing(true);
    setOptimizationProgress(0);
    
    const fileArray = Array.from(files);
    const total = fileArray.length;
    let completedCount = 0;

    const newProducts = await Promise.all(fileArray.map(async (file, index) => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryUploadPreset);
        
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, {
          method: 'POST',
          body: formData
        });
        
        if (res.ok) {
          const cloudData = await res.json();
          
          // Create a basic product from the image
          const product = {
            id: `img-${Date.now()}-${index}`,
            code: file.name.split('.')[0].substring(0, 10),
            name: file.name.split('.')[0].replace(/[-_]/g, ' ').toUpperCase(),
            category: 'otros',
            image: cloudData.secure_url,
            price: 0,
            rating: 5,
            description: `Producto añadido desde imagen: ${file.name}`,
            isLocal: false,
            isSeasonal: true
          };

          completedCount++;
          if (completedCount % 5 === 0 || completedCount === total) {
            setOptimizationProgress(Math.round((completedCount / total) * 100));
          }
          return product;
        }
      } catch (e) {
        console.error('Error uploading file:', file.name, e);
      }
      completedCount++;
      return null;
    }));

    const validProducts = (newProducts.filter(p => p !== null) as any[]);
    if (validProducts.length > 0) {
      setProducts(prev => [...prev, ...validProducts]);
      showToast(`¡${validProducts.length} imágenes subidas y añadidas!`);
    } else {
      showToast('No se pudo subir ninguna imagen');
    }
    setIsOptimizing(false);
  };

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

        {showCloudinaryGuide && <CloudinaryGuide />}

        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh] no-scrollbar">
          {getIsQuotaExceeded() && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl mb-4">
              <p className="text-xs font-bold text-amber-700 flex items-center gap-2">
                <RefreshCcw size={14} className="animate-spin" />
                Límite de Firebase alcanzado
              </p>
              <p className="text-[10px] text-amber-600 mt-1">
                La base de datos está en modo lectura. Los cambios no se guardarán en la nube hasta mañana, pero puedes seguir usando la app con el catálogo de respaldo.
              </p>
            </div>
          )}
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
                  onClick={onSyncFromExternal}
                  className="flex items-center gap-3 p-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl transition-all border border-indigo-100 group ios-active"
                >
                  <div className="p-2 bg-indigo-500 text-white rounded-xl group-hover:scale-110 transition-transform">
                    <RefreshCcw size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Sincronizar GitHub</p>
                    <p className="text-[10px] opacity-70">Carga el catálogo desde el enlace externo</p>
                  </div>
                </button>

                <button
                  onClick={onPasteJson}
                  className="flex items-center gap-3 p-4 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-2xl transition-all border border-cyan-100 group ios-active"
                >
                  <div className="p-2 bg-cyan-500 text-white rounded-xl group-hover:scale-110 transition-transform">
                    <Plus size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Pegar Catálogo JSON</p>
                    <p className="text-[10px] opacity-70">Pega el contenido del archivo directamente</p>
                  </div>
                </button>

                <button
                  onClick={onClearAll}
                  className="flex items-center gap-3 p-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-2xl transition-all border border-red-100 group ios-active"
                >
                  <div className="p-2 bg-red-500 text-white rounded-xl group-hover:scale-110 transition-transform">
                    <Trash2 size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Borrar Catálogo Completo</p>
                    <p className="text-[10px] opacity-70">Limpia la base de datos para una carga nueva</p>
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
                <div className="flex items-center justify-between mb-3 ml-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configuración de Imágenes (Cloudinary)</p>
                  <button 
                    onClick={() => setShowCloudinaryGuide(true)}
                    className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Sparkles size={10} />
                    ¿Cómo configurar?
                  </button>
                </div>
                <div className="space-y-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <div>
                    <label className="text-[10px] font-bold text-blue-700 uppercase ml-1">Cloud Name</label>
                    <input 
                      type="text" 
                      value={cloudinaryCloudName}
                      onChange={(e) => setCloudinaryCloudName(e.target.value)}
                      placeholder="ej: dxabc123"
                      className="w-full mt-1 p-2 text-sm rounded-xl border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-blue-700 uppercase ml-1">Upload Preset (Unsigned)</label>
                    <input 
                      type="text" 
                      value={cloudinaryUploadPreset}
                      onChange={(e) => setCloudinaryUploadPreset(e.target.value)}
                      placeholder="ej: ml_default"
                      className="w-full mt-1 p-2 text-sm rounded-xl border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={handleSaveCloudinary}
                    className="w-full py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Guardar Configuración
                  </button>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button 
                    onClick={() => {
                      setOptimizationMode('local');
                      saveSettings({ optimizationMode: 'local' });
                    }}
                    className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${optimizationMode === 'local' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500'}`}
                  >
                    Compresión Local
                  </button>
                  <button 
                    onClick={() => {
                      setOptimizationMode('cloudinary');
                      saveSettings({ optimizationMode: 'cloudinary' });
                    }}
                    className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${optimizationMode === 'cloudinary' ? 'bg-white shadow-sm text-cyan-600' : 'text-slate-500'}`}
                  >
                    Nube (Cloudinary)
                  </button>
                </div>

                <input
                  type="file"
                  ref={optimizeInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) optimizeAndUpload(file);
                  }}
                  accept=".json"
                  className="hidden"
                />
                <button
                  onClick={() => optimizeInputRef.current?.click()}
                  disabled={isOptimizing}
                  className={`w-full flex items-center justify-center gap-3 p-4 text-white rounded-2xl shadow-lg transition-all group disabled:opacity-50 ${optimizationMode === 'local' ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-orange-200' : 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-cyan-200'}`}
                >
                  {isOptimizing ? (
                    <div className="flex items-center gap-2">
                      <RefreshCcw size={20} className="animate-spin" />
                      <span className="font-bold">Procesando: {optimizationProgress}%</span>
                    </div>
                  ) : (
                    <>
                      <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
                      <span className="font-bold">
                        {optimizationMode === 'local' ? 'Reducir Tamaño del Archivo' : 'Subir Imágenes a la Nube'}
                      </span>
                    </>
                  )}
                </button>

                {optimizationMode === 'cloudinary' && (
                  <>
                    <input
                      type="file"
                      ref={batchImagesInputRef}
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) uploadMultipleImages(files);
                      }}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                    <button
                      onClick={() => batchImagesInputRef.current?.click()}
                      disabled={isOptimizing}
                      className="w-full flex items-center justify-center gap-3 p-4 bg-white border-2 border-dashed border-cyan-200 text-cyan-600 rounded-2xl hover:bg-cyan-50 transition-all group disabled:opacity-50"
                    >
                      <ImageIcon size={20} className="group-hover:scale-110 transition-transform" />
                      <span className="font-bold text-sm">Subir Carpeta de Imágenes (Lote)</span>
                    </button>
                  </>
                )}
                <p className="text-[10px] text-slate-400 text-center px-4 leading-tight">
                  {optimizationMode === 'local' 
                    ? 'Mantiene el formato PNG si es necesario, pero el archivo JSON puede ser muy grande si tienes muchos productos.' 
                    : 'Saca las fotos del archivo y las guarda en Cloudinary. Es la mejor opción para 3000+ productos con alta calidad.'}
                </p>
                {optimizationMode === 'local' && (
                  <div className="mx-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-[10px] text-amber-700 leading-tight">
                      <strong>Nota sobre PNG:</strong> Si tus imágenes son PNG, las mantendremos así para no perder calidad, pero ten en cuenta que el archivo final será pesado. Si GitHub lo rechaza por tamaño, usa la opción de <strong>Cloudinary</strong>.
                    </p>
                  </div>
                )}
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
