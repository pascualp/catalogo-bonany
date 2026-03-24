/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, ChangeEvent, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Leaf, MapPin, Calendar, Menu, X, ChevronRight, LayoutGrid, Trash2, ArrowLeft, CupSoda, List as ListIcon, Grid as GridIcon, ArrowDownAZ, ArrowUpZA, Clock, Ruler, LogIn, LogOut } from 'lucide-react';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { ProductForm } from './components/ProductForm';
import { AdminPanel } from './components/AdminPanel';
import { CATEGORIES, PRODUCTS } from './constants';
import { Product } from './types';
import { db, auth } from './lib/firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = error => reject(error);
    };
    reader.onerror = error => reject(error);
  });
};

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [appSection, setAppSection] = useState<'home' | 'produce' | 'juices'>('home');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [filterLocal, setFilterLocal] = useState(false);
  const [filterSeasonal, setFilterSeasonal] = useState(false);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortMode, setSortMode] = useState<'az' | 'za' | 'newest' | 'size'>('az');

  // Hidden feature state
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastOpenedRef = useRef<number>(0);

  const showToast = (message: string, duration = 3000) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), duration);
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Listener
  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => doc.data() as Product);
      if (productsData.length > 0) {
        setProducts(productsData);
      } else {
        // Fallback to constants if Firestore is empty
        setProducts(PRODUCTS);
      }
      setIsLoaded(true);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      showToast('Sesión iniciada correctamente');
    } catch (error) {
      console.error('Login error:', error);
      showToast('Error al iniciar sesión');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast('Sesión cerrada');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastOpenedRef.current < 2000) return;

    setLogoClicks(prev => {
      const newCount = prev + 1;
      if (newCount > 0 && newCount < 5) {
        showToast(`Faltan ${5 - newCount} clics para herramientas admin`);
      }
      if (newCount >= 5) {
        setIsAdminPanelOpen(true);
        setIsAdminMode(true);
        lastOpenedRef.current = Date.now();
        return 0;
      }
      return newCount;
    });
  };

  const handleDeleteProduct = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      showToast('Producto eliminado');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
      showToast('Error al eliminar: Permisos insuficientes');
    }
  }, []);

  const handleToggleLocal = useCallback(async (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    try {
      await setDoc(doc(db, 'products', id), { ...product, isLocal: !product.isLocal });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${id}`);
      showToast('Error al actualizar: Permisos insuficientes');
    }
  }, [products]);

  const handleToggleSeasonal = useCallback(async (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    try {
      await setDoc(doc(db, 'products', id), { ...product, isSeasonal: !product.isSeasonal });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${id}`);
      showToast('Error al actualizar: Permisos insuficientes');
    }
  }, [products]);

  const handleUpdateProductCategory = useCallback(async (id: string, newCategory: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    try {
      await setDoc(doc(db, 'products', id), { ...product, category: newCategory });
      showToast('Categoría actualizada');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${id}`);
      showToast('Error al actualizar: Permisos insuficientes');
    }
  }, [products]);

  const handleDragOver = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    setDragOverCategory(categoryId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCategory(null);
  };

  const handleDrop = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    setDragOverCategory(null);
    const productId = e.dataTransfer.getData('productId');
    if (productId) {
      handleUpdateProductCategory(productId, categoryId);
    }
  };

  const handleRemoveDuplicates = async () => {
    const seen = new Set();
    const duplicates = products.filter(p => {
      const key = p.name.toLowerCase().trim();
      if (seen.has(key)) return true;
      seen.add(key);
      return false;
    });

    if (duplicates.length === 0) {
      showToast('No se encontraron duplicados');
      return;
    }

    if (!window.confirm(`Se eliminarán ${duplicates.length} duplicados. ¿Continuar?`)) return;

    const batch = writeBatch(db);
    duplicates.forEach(p => {
      batch.delete(doc(db, 'products', p.id));
    });

    try {
      await batch.commit();
      showToast(`${duplicates.length} duplicados eliminados`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'products');
      showToast('Error: Permisos insuficientes');
    }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(products, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `productos_fruites_bonany_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showToast('Copia de seguridad descargada');
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedProducts = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedProducts)) {
          const batch = writeBatch(db);
          importedProducts.forEach(p => {
            batch.set(doc(db, 'products', p.id), p);
          });
          await batch.commit();
          showToast(`Importados ${importedProducts.length} productos`);
        }
      } catch (err) {
        showToast('Error al importar el archivo');
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreDefaults = async () => {
    if (window.confirm('¿Estás seguro de que quieres restaurar los productos por defecto? Esto no borrará tus productos actuales, solo añadirá los básicos si faltan.')) {
      const batch = writeBatch(db);
      PRODUCTS.forEach(product => {
        const docRef = doc(db, 'products', product.id);
        batch.set(docRef, product);
      });
      
      try {
        await batch.commit();
        showToast('Productos básicos restaurados');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'products');
        showToast('Error: Permisos insuficientes');
      }
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('¿BORRAR TODO EL CATÁLOGO? Esta acción no se puede deshacer.')) return;
    
    const batch = writeBatch(db);
    products.forEach(p => {
      batch.delete(doc(db, 'products', p.id));
    });

    try {
      await batch.commit();
      showToast('Catálogo vaciado');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'products');
      showToast('Error: Permisos insuficientes');
    }
  };

  const handleAddManualProduct = (newProduct: Product) => {
    setDoc(doc(db, 'products', newProduct.id), newProduct)
      .then(() => {
        showToast('Producto añadido correctamente');
        setIsAddingProduct(false);
      })
      .catch(error => {
        handleFirestoreError(error, OperationType.WRITE, `products/${newProduct.id}`);
        showToast('Error: Permisos insuficientes');
      });
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setToastMessage(`Procesando ${files.length} imágenes...`);

    const newProductsPromises: Promise<Product>[] = Array.from(files as Iterable<File>).map(async (file: File): Promise<Product> => {
      const base64Image = await fileToBase64(file);
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      
      const codeMatch = nameWithoutExt.match(/^(\d+)/);
      const code = codeMatch ? codeMatch[1] : '';
      
      let cleanName = nameWithoutExt;
      if (code) {
        cleanName = cleanName.substring(code.length);
      }
      cleanName = cleanName.replace(/^[-_\s]+/, '').replace(/[-_]/g, ' ').trim();
      
      if (!cleanName) {
        cleanName = 'PRODUCTO';
      }

      const isLocal = cleanName.toLowerCase().includes('mallorca');

      let category = 'otros';
      const nameLower = cleanName.toLowerCase();
      
      if (nameLower.includes('zumo') || nameLower.includes('jugo') || nameLower.includes('licuado') || nameLower.includes('batido')) {
        category = 'zumos-naturales';
      } else if (nameLower.includes('patata') || nameLower.includes('papa')) {
        category = 'patatas';
      } else if (nameLower.includes('cebolla') || nameLower.includes('ajo')) {
        category = 'cebollas';
      } else if (nameLower.includes('germinado')) {
        category = 'germinados';
      } else if (nameLower.includes('lechuga')) {
        category = 'lechugas';
      } else if (nameLower.includes('hierba')) {
        category = 'hierbas';
      } else if (nameLower.includes('manzana') || nameLower.includes('pera') || nameLower.includes('naranja')) {
        category = 'frutas';
      } else if (nameLower.includes('tomate') || nameLower.includes('pimiento')) {
        category = 'hortalizas';
      }

      const product: Product = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        code,
        name: cleanName.toUpperCase(),
        category,
        image: base64Image,
        price: 0,
        rating: 5.0,
        description: 'Producto añadido desde imagen.',
        isLocal,
        isSeasonal: true,
      };

      return product;
    });

    try {
      const results = await Promise.allSettled(newProductsPromises);
      const newProducts = results
        .filter((result): result is PromiseFulfilledResult<Product> => result.status === 'fulfilled')
        .map(result => result.value);

      if (newProducts.length > 0) {
        const batch = writeBatch(db);
        newProducts.forEach(p => {
          batch.set(doc(db, 'products', p.id), p);
        });
        await batch.commit();
        showToast(`¡Éxito! ${newProducts.length} productos subidos`);
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      showToast("Error al procesar las imágenes");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const productCategory = CATEGORIES.find(c => c.id === product.category);
      const sectionMatch = appSection === 'home' || 
                           productCategory?.section === appSection || 
                           (appSection === 'produce' && productCategory?.section === 'other');
      if (!sectionMatch) return false;

      const matchesCategory = selectedCategory ? product.category === selectedCategory : true;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            product.id.includes(searchQuery);
      const matchesLocal = filterLocal ? product.isLocal : true;
      const matchesSeasonal = filterSeasonal ? product.isSeasonal : true;
      
      return matchesCategory && matchesSearch && matchesLocal && matchesSeasonal;
    });

    // Apply sorting
    result.sort((a, b) => {
      if (sortMode === 'az') return a.name.localeCompare(b.name);
      if (sortMode === 'za') return b.name.localeCompare(a.name);
      if (sortMode === 'size') return (a.size || 0) - (b.size || 0);
      return products.indexOf(a) - products.indexOf(b);
    });

    return result;
  }, [products, selectedCategory, searchQuery, filterLocal, filterSeasonal, appSection, sortMode]);

  // Update selected product if its image changes
  useEffect(() => {
    if (selectedProduct) {
      const updatedProduct = products.find(p => p.id === selectedProduct.id);
      if (updatedProduct && updatedProduct.image !== selectedProduct.image) {
        setSelectedProduct(updatedProduct);
      }
    }
  }, [products, selectedProduct]);

  if (appSection === 'home') {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex flex-col items-center justify-center p-6 font-sans">
        <div className="text-center mb-12">
           <img 
             src="/LOGO.png" 
             alt="BonAny Logo" 
             className="h-24 mx-auto mb-6 object-contain"
             onError={(e) => {
               e.currentTarget.style.display = 'none';
               const fallback = document.getElementById('home-fallback-logo');
               if (fallback) fallback.style.display = 'flex';
               const fallbackText = document.getElementById('home-fallback-text');
               if (fallbackText) fallbackText.style.display = 'block';
             }}
           />
           <div id="home-fallback-logo" className="w-20 h-20 bg-emerald-500 rounded-3xl hidden items-center justify-center text-white shadow-lg mx-auto mb-6">
             <Leaf size={40} />
           </div>
           <h1 id="home-fallback-text" className="text-4xl font-bold tracking-tight text-slate-900 mb-2 hidden">Bonany</h1>
           <p className="text-lg text-slate-500">Selecciona el catálogo a presentar</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
           <button 
             onClick={() => setAppSection('produce')}
             className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-md transition-all border border-black/5 flex flex-col items-center text-center group"
           >
             <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
               <Leaf size={48} />
             </div>
             <h2 className="text-2xl font-bold text-slate-900 mb-2">Frutas y Verduras</h2>
             <p className="text-slate-500">Catálogo completo de productos frescos, hortalizas, setas y más.</p>
           </button>

           <button 
             onClick={() => setAppSection('juices')}
             className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-md transition-all border border-black/5 flex flex-col items-center text-center group"
           >
             <div className="w-24 h-24 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
               <CupSoda size={48} />
             </div>
             <h2 className="text-2xl font-bold text-slate-900 mb-2">Zumos</h2>
             <p className="text-slate-500">Catálogo exclusivo de zumos, jugos, licuados y batidos.</p>
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f2f2f7] text-black overflow-hidden relative font-sans">
      {/* Hidden feature toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium z-50 shadow-lg whitespace-nowrap"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay for mobile/tablet sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/10 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - iPadOS Style */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? 300 : 0,
          x: isSidebarOpen ? 0 : -300
        }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="fixed lg:relative h-full ios-sidebar-glass border-r border-black/5 flex flex-col z-40 shadow-sm lg:shadow-none"
      >
        {/* Sidebar Header */}
        <div className="p-6 md:p-8 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={handleLogoClick}>
            <img 
              src="/LOGO.png" 
              alt="BonAny Logo" 
              className="h-10 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallbackIcon = document.getElementById('sidebar-fallback-icon');
                if (fallbackIcon) fallbackIcon.style.display = 'flex';
                const fallbackText = document.getElementById('sidebar-fallback-text');
                if (fallbackText) fallbackText.style.display = 'block';
              }}
            />
            <div id="sidebar-fallback-icon" className="w-10 h-10 bg-emerald-500 rounded-2xl hidden items-center justify-center text-white shadow-sm flex-shrink-0">
              <Leaf size={22} />
            </div>
            <div className="overflow-hidden whitespace-nowrap">
              <h1 id="sidebar-fallback-text" className="text-xl font-bold tracking-tight leading-none hidden">Bonany</h1>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Mallorca / Catálogo</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-black ios-active"
          >
            <X size={20} />
          </button>
        </div>

        {/* Hidden file input for image upload */}
        <input 
          type="file" 
          multiple 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleImageUpload}
        />

        {/* Sidebar Content - iPadOS List Style */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 no-scrollbar">
          <div className="mb-2">
            <button
              onClick={() => {
                setAppSection('home');
                setSelectedCategory(null);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-black/5 rounded-lg transition-colors"
            >
              <ArrowLeft size={16} />
              Volver al inicio
            </button>
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">Catálogo General</p>
            <nav className="space-y-0.5">
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-[15px] font-medium transition-all ios-active ${
                  selectedCategory === null 
                    ? 'bg-emerald-500 text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-black/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <LayoutGrid size={18} className={selectedCategory === null ? 'text-white' : 'text-slate-400'} />
                  <span>Todos</span>
                </div>
                {selectedCategory === null && <ChevronRight size={14} />}
              </button>
            </nav>
          </div>

          {appSection === 'produce' && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">Frutas y Verduras</p>
              <nav className="space-y-0.5">
                {CATEGORIES.filter(c => c.section === 'produce' || c.section === 'other').map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    onDragOver={(e) => handleDragOver(e, category.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, category.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-[15px] font-medium transition-all ios-active ${
                      selectedCategory === category.id 
                        ? 'bg-emerald-500 text-white shadow-sm' 
                        : dragOverCategory === category.id
                        ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500 ring-inset'
                        : 'text-slate-600 hover:bg-black/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{category.icon}</span>
                      <span>{category.name}</span>
                    </div>
                    {selectedCategory === category.id && <ChevronRight size={14} />}
                  </button>
                ))}
              </nav>
            </div>
          )}

          {appSection === 'juices' && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">Zumos y Bebidas</p>
              <nav className="space-y-0.5">
                {CATEGORIES.filter(c => c.section === 'juices').map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    onDragOver={(e) => handleDragOver(e, category.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, category.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-[15px] font-medium transition-all ios-active ${
                      selectedCategory === category.id 
                        ? 'bg-orange-500 text-white shadow-sm' 
                        : dragOverCategory === category.id
                        ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-500 ring-inset'
                        : 'text-slate-600 hover:bg-black/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{category.icon}</span>
                      <span>{category.name}</span>
                    </div>
                    {selectedCategory === category.id && <ChevronRight size={14} />}
                  </button>
                ))}
              </nav>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-6 border-t border-black/5 bg-black/[0.02]">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            <span>v2.5.0</span>
            <span className="text-emerald-500 flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Online
            </span>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white lg:rounded-tl-[40px] lg:shadow-2xl lg:my-2 lg:mr-2 overflow-hidden relative">
        {/* Top Navigation Bar */}
        <header className="h-20 border-b border-black/5 flex items-center justify-between px-6 md:px-10 bg-white/80 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className={`p-2.5 text-slate-500 hover:text-black hover:bg-black/5 rounded-xl transition-all ios-active ${isSidebarOpen ? 'lg:hidden' : ''}`}
            >
              <Menu size={22} />
            </button>
            
            <div className="relative flex-1 max-w-md group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#f2f2f7] border-none rounded-2xl py-3 pl-12 pr-4 text-[15px] focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 ml-4">
            {/* View Mode Toggle */}
            <div className="hidden sm:flex bg-[#f2f2f7] p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <GridIcon size={18} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <ListIcon size={18} />
              </button>
            </div>

            {/* Sort Menu */}
            <div className="relative group hidden md:block">
              <button className="flex items-center gap-2 px-4 py-2.5 bg-[#f2f2f7] hover:bg-[#e5e5ea] rounded-xl text-sm font-semibold text-slate-700 transition-all ios-active">
                {sortMode === 'az' && <ArrowDownAZ size={18} />}
                {sortMode === 'za' && <ArrowUpZA size={18} />}
                {sortMode === 'size' && <Ruler size={18} />}
                {sortMode === 'newest' && <Clock size={18} />}
                <span>Ordenar</span>
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-black/5 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button onClick={() => setSortMode('az')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${sortMode === 'az' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-black/5'}`}>
                  <ArrowDownAZ size={16} /> A - Z
                </button>
                <button onClick={() => setSortMode('za')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${sortMode === 'za' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-black/5'}`}>
                  <ArrowUpZA size={16} /> Z - A
                </button>
                <button onClick={() => setSortMode('size')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${sortMode === 'size' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-black/5'}`}>
                  <Ruler size={16} /> Por Tamaño
                </button>
                <button onClick={() => setSortMode('newest')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${sortMode === 'newest' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-black/5'}`}>
                  <Clock size={16} /> Más recientes
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterLocal(!filterLocal)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ios-active ${
                  filterLocal 
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' 
                    : 'bg-[#f2f2f7] text-slate-600 hover:bg-[#e5e5ea]'
                }`}
              >
                <MapPin size={16} />
                <span className="hidden sm:inline">Mallorca</span>
              </button>
              <button
                onClick={() => setFilterSeasonal(!filterSeasonal)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ios-active ${
                  filterSeasonal 
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-200' 
                    : 'bg-[#f2f2f7] text-slate-600 hover:bg-[#e5e5ea]'
                }`}
              >
                <Calendar size={16} />
                <span className="hidden sm:inline">Temporada</span>
              </button>
            </div>
          </div>
        </header>

        {/* Products Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 no-scrollbar bg-white">
          <div className="max-w-[1600px] mx-auto">
            {/* Section Header */}
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                  {selectedCategory 
                    ? CATEGORIES.find(c => c.id === selectedCategory)?.name 
                    : appSection === 'produce' ? 'Frutas y Verduras' : 'Zumos y Bebidas'}
                </h2>
                <p className="text-slate-400 font-medium mt-1">
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'producto encontrado' : 'productos encontrados'}
                </p>
              </div>
            </div>

            {/* Products Grid/List */}
            {!isLoaded ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <p className="text-slate-400 font-medium animate-pulse">Cargando catálogo...</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <motion.div 
                layout
                className={viewMode === 'grid' 
                  ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6"
                  : "flex flex-col gap-3"
                }
              >
                <AnimatePresence mode='popLayout'>
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      viewMode={viewMode}
                      isAdmin={isAdminMode}
                      onDelete={handleDeleteProduct}
                      onToggleLocal={handleToggleLocal}
                      onToggleSeasonal={handleToggleSeasonal}
                      onClick={() => setSelectedProduct(product)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-6">
                  <Search size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No hay resultados</h3>
                <p className="text-slate-500 max-w-xs">No hemos encontrado ningún producto que coincida con tu búsqueda o filtros.</p>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setFilterLocal(false);
                    setFilterSeasonal(false);
                    setSelectedCategory(null);
                  }}
                  className="mt-6 text-emerald-600 font-bold hover:underline"
                >
                  Limpiar todos los filtros
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Admin Panel Overlay */}
        {isAdminPanelOpen && (
          <AdminPanel
            user={user}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onExport={handleExportData}
            onImport={handleImportData}
            onRestoreDefaults={handleRestoreDefaults}
            onRemoveDuplicates={handleRemoveDuplicates}
            onClearAll={handleClearAll}
            onAddManual={() => setIsAddingProduct(true)}
            onClose={() => setIsAdminPanelOpen(false)}
            setProducts={setProducts}
            showToast={showToast}
          />
        )}

        {/* Modals */}
        <AnimatePresence>
          {selectedProduct && (
            <ProductModal
              product={selectedProduct}
              onClose={() => setSelectedProduct(null)}
            />
          )}
          {isAddingProduct && (
            <ProductForm
              onClose={() => setIsAddingProduct(false)}
              onSubmit={handleAddManualProduct}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
