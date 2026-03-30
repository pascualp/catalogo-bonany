/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, ChangeEvent, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Leaf, MapPin, Calendar, Menu, X, ChevronRight, LayoutGrid, Trash2, ArrowLeft, CupSoda, List as ListIcon, Grid as GridIcon, ArrowDownAZ, ArrowUpZA, Clock, Ruler, RefreshCcw } from 'lucide-react';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { ProductForm } from './components/ProductForm';
import { AdminPanel } from './components/AdminPanel';
import { JsonPasteModal } from './components/JsonPasteModal';
import { SmartAssistant } from './components/SmartAssistant';
import { CATEGORIES, PRODUCTS as DEFAULT_PRODUCTS } from './constants';
import { EXTERNAL_PRODUCTS_URL } from './config';
import { Product } from './types';
import { saveProducts, saveProduct, deleteProduct, deleteProducts, loadProducts, subscribeToProducts, subscribeToLogo, saveLogo, testConnection, loadSettings, saveSettings, getIsQuotaExceeded } from './lib/db';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const isPng = file.type === 'image/png';
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
          // If it's PNG, we keep it as PNG to maintain transparency and quality
          // Otherwise use JPEG for better compression
          const dataUrl = isPng 
            ? canvas.toDataURL('image/png') 
            : canvas.toDataURL('image/jpeg', 0.8);
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
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
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
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastOpenedRef = useRef<number>(0);

  const [isSyncing, setIsSyncing] = useState(false);
  const hasAttemptedSyncRef = useRef(false);

  const showToast = (message: string, duration = 3000) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), duration);
  };

  useEffect(() => {
    testConnection();
    
    // Auto-sync from Vercel-hosted JSON
    const autoSync = async () => {
      try {
        const response = await fetch('/catalog.json');
        if (!response.ok) return;
        const catalogData = await response.json();
        
        if (!catalogData || typeof catalogData.version !== 'number' || !Array.isArray(catalogData.products)) {
          return;
        }

        // Fallback: If products are still empty after a while, use catalogData
        setTimeout(() => {
          setProducts(prev => {
            if (prev.length === 0) {
              console.log('Using catalog.json as fallback due to empty Firestore (possible quota limit)');
              return catalogData.products;
            }
            return prev;
          });
          setIsLoaded(true);
        }, 3000);

        const settings = await loadSettings();
        const currentVersion = settings?.lastSyncVersion || 0;
        
        if (catalogData.version > currentVersion) {
          if (getIsQuotaExceeded()) {
            console.log('Quota exceeded, skipping auto-sync write to Firestore. Using catalog.json directly.');
            setProducts(catalogData.products);
            setIsLoaded(true);
            return;
          }

          console.log(`Auto-syncing catalog from version ${currentVersion} to ${catalogData.version}`);
          setIsSyncing(true);
          showToast(`Actualizando catálogo a v${catalogData.version}...`);
          
          try {
            // Save products using the safe batching method
            await saveProducts(catalogData.products);
            
            // Update version in Firestore settings
            await saveSettings({ lastSyncVersion: catalogData.version });
            
            showToast('Catálogo actualizado automáticamente');
          } catch (syncError) {
            console.error('Sync error:', syncError);
            // If it's a quota error, we just ignore it and use the local data
            if (String(syncError).includes('Quota') || String(syncError).includes('resource-exhausted')) {
              showToast('Límite de Firebase alcanzado. Usando datos locales.');
              setProducts(catalogData.products);
              setIsLoaded(true);
            } else {
              showToast('Error en la actualización automática');
            }
          } finally {
            setIsSyncing(false);
          }
        }
      } catch (error) {
        console.error('Error in auto-sync:', error);
      }
    };
    
    autoSync();
  }, []);

  useEffect(() => {
    const fetchExternalProducts = async () => {
      if (!EXTERNAL_PRODUCTS_URL) return [];
      try {
        const response = await fetch(EXTERNAL_PRODUCTS_URL);
        if (!response.ok) {
          console.warn(`External products fetch failed with status: ${response.status}`);
          return [];
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.error('Error fetching external products:', e);
        return [];
      }
    };

    const unsubscribeProducts = subscribeToProducts(async (updatedProducts) => {
      const validProducts = (updatedProducts || []).filter(p => p && typeof p === 'object');
      if (validProducts.length > 0) {
        setProducts(validProducts);
        setIsLoaded(true);
      }

      // If we have a quota error, we might want to stop the listener if it's empty
      if (getIsQuotaExceeded() && validProducts.length === 0) {
        console.log('Quota exceeded and no products from Firestore. Relying on catalog.json.');
        // The autoSync fallback will handle this
      }

      // Auto-seed if empty and we haven't tried yet
      if (validProducts.length === 0 && !hasAttemptedSyncRef.current) {
        hasAttemptedSyncRef.current = true;
        console.log('Database is empty, attempting to seed from external URL or defaults...');
        
        const external = await fetchExternalProducts();
        if (external.length > 0) {
          console.log(`Seeding ${external.length} products from external URL`);
          try {
            await saveProducts(external);
          } catch (e) {
            console.warn('Failed to seed products (quota?)');
          }
        } else {
          console.log(`Seeding from DEFAULT_PRODUCTS`);
          try {
            await saveProducts(DEFAULT_PRODUCTS);
          } catch (e) {
            console.warn('Failed to seed products (quota?)');
          }
        }
      }
    });

    const unsubscribeLogo = subscribeToLogo((logo) => {
      setCustomLogo(logo);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeLogo();
    };
  }, []);

  const isAdmin = true;

  const handleLogoUpdate = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      await saveLogo(base64);
      showToast("Logo actualizado correctamente");
    } catch (error) {
      showToast("Error al actualizar el logo");
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
      await deleteProduct(id);
      showToast('Producto eliminado');
    } catch (error) {
      showToast('Error al eliminar producto');
    }
  }, []);

  const handleToggleLocal = useCallback(async (id: string) => {
    const product = products.find(p => p.id === id);
    if (product) {
      try {
        await saveProduct({ ...product, isLocal: !product.isLocal });
      } catch (error) {
        showToast('Error al actualizar producto');
      }
    }
  }, [products]);

  const handleToggleSeasonal = useCallback(async (id: string) => {
    const product = products.find(p => p.id === id);
    if (product) {
      try {
        await saveProduct({ ...product, isSeasonal: !product.isSeasonal });
      } catch (error) {
        showToast('Error al actualizar producto');
      }
    }
  }, [products]);

  const handleUpdateProductCategory = useCallback(async (id: string, newCategory: string) => {
    const product = products.find(p => p.id === id);
    if (product) {
      try {
        await saveProduct({ ...product, category: newCategory });
        setToastMessage('Categoría actualizada');
        setTimeout(() => setToastMessage(null), 2000);
      } catch (error) {
        showToast('Error al actualizar categoría');
      }
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

  const handleDrop = async (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    setDragOverCategory(null);
    const productId = e.dataTransfer.getData('productId');
    if (productId) {
      const product = products.find(p => p.id === productId);
      if (product && product.category === categoryId) {
        return; // Do nothing if it's already in this category
      }
      
      if (product) {
        try {
          await saveProduct({ ...product, category: categoryId });
          setToastMessage('Producto movido de categoría');
          setTimeout(() => setToastMessage(null), 2000);
        } catch (error) {
          showToast('Error al mover producto');
        }
      }
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('¿ESTÁS SEGURO? Esto borrará permanentemente TODOS los productos de la base de datos. Esta acción no se puede deshacer.')) {
      showToast('Borrando catálogo...');
      try {
        const productIds = products.map(p => p.id);
        await deleteProducts(productIds);
        showToast('Catálogo borrado correctamente');
      } catch (error) {
        showToast('Error al borrar el catálogo');
      }
    }
  };

  const handleRemoveDuplicates = async () => {
    const unique: Product[] = [];
    const seen = new Set<string>();
    const toDelete: string[] = [];
    
    for (let i = products.length - 1; i >= 0; i--) {
      const p = products[i];
      const key = String(p.name || '').toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.unshift(p);
      } else {
        toDelete.push(p.id);
      }
    }
    
    if (toDelete.length > 0) {
      try {
        await deleteProducts(toDelete);
        showToast(`Se han eliminado ${toDelete.length} productos repetidos`);
      } catch (error) {
        showToast('Error al eliminar duplicados');
      }
    } else {
      showToast(`No se encontraron productos repetidos`);
    }
  };

  const handleExportData = () => {
    const exportData = {
      version: Date.now(),
      products: products
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `catalog_fruites_bonany_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showToast('Catálogo exportado (formato GitHub)');
  };

  const handleSyncFromExternal = async () => {
    if (!EXTERNAL_PRODUCTS_URL) {
      showToast('No hay URL externa configurada');
      return;
    }

    setIsSyncing(true);
    showToast('Sincronizando catálogo desde GitHub...');
    try {
      const response = await fetch(EXTERNAL_PRODUCTS_URL);
      if (!response.ok) throw new Error('Error al descargar el archivo');
      
      const importedProducts = await response.json();
      if (Array.isArray(importedProducts)) {
        // Ensure all products have an ID
        const productsWithIds = importedProducts.map((p: any, i: number) => ({
          ...p,
          id: p.id || `ext-${Date.now()}-${i}`,
          category: p.category || p.categoria || 'otros'
        }));
        
        await saveProducts(productsWithIds);
        showToast(`Sincronización completada: ${productsWithIds.length} productos`);
      } else {
        showToast('El formato del archivo no es válido');
      }
    } catch (err) {
      console.error('Sync error:', err);
      showToast('Error en la sincronización. Verifica el enlace.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePasteJson = (jsonStr: string) => {
    try {
      const importedProducts = JSON.parse(jsonStr);
      if (Array.isArray(importedProducts)) {
        // Ensure all products have an ID
        const productsWithIds = importedProducts.map((p: any, i: number) => ({
          ...p,
          id: p.id || `paste-${Date.now()}-${i}`,
          category: p.category || p.categoria || 'otros'
        }));

        showToast('Guardando catálogo en la base de datos...');
        saveProducts(productsWithIds).then(() => {
          showToast(`Importados ${productsWithIds.length} productos correctamente`);
          setIsPasteModalOpen(false);
        }).catch(err => {
          showToast('Error al guardar en la base de datos');
        });
      } else {
        showToast('El JSON debe ser una lista [] de productos');
      }
    } catch (err) {
      showToast('Error al procesar el JSON. Asegúrate de que el formato es correcto.');
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedProducts = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedProducts)) {
          setProducts(prev => {
            // Merge with existing, avoiding duplicates by ID
            const existingIds = new Set(prev.map(p => p.id));
            const newOnes = importedProducts.filter(p => !existingIds.has(p.id));
            return [...prev, ...newOnes];
          });
          showToast(`Importados ${importedProducts.length} productos`);
        }
      } catch (err) {
        showToast('Error al importar el archivo');
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreDefaults = () => {
    if (window.confirm('¿Estás seguro de que quieres restaurar los productos por defecto? Esto no borrará tus productos actuales, solo añadirá los básicos si faltan.')) {
      import('./constants').then(async ({ PRODUCTS: defaultProducts }) => {
        const existingNames = new Set(products.map(p => String(p.name || '').toLowerCase().trim()));
        const toAdd = defaultProducts.filter(p => !existingNames.has(String(p.name || '').toLowerCase().trim()));
        if (toAdd.length === 0) {
          showToast('Ya tienes todos los productos básicos');
          return;
        }
        try {
          await saveProducts(toAdd);
          showToast(`Añadidos ${toAdd.length} productos básicos`);
        } catch (error) {
          showToast('Error al restaurar básicos');
        }
      });
    }
  };

  const handleAddManualProduct = async (newProduct: Product) => {
    try {
      await saveProduct(newProduct);
      setIsAddingProduct(false);
      showToast('Producto añadido correctamente');
    } catch (error) {
      showToast('Error al añadir producto');
    }
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newProductsPromises: Promise<Product>[] = Array.from(files as Iterable<File>).map(async (file: File, index: number): Promise<Product> => {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      
      // Extract code from the beginning of the filename (e.g., "123-tomate" -> "123")
      const codeMatch = nameWithoutExt.match(/^(\d+)/);
      const code = codeMatch ? codeMatch[1] : '';
      
      // Remove the code from the name and clean up leading hyphens/underscores/spaces
      let cleanName = nameWithoutExt;
      if (code) {
        cleanName = cleanName.substring(code.length);
      }
      cleanName = cleanName.replace(/^[-_\s]+/, '').replace(/[-_]/g, ' ').trim();
      
      // Fallback if name is empty
      if (!cleanName) {
        cleanName = 'PRODUCTO';
      }

      // Determine if local (contains 'mallorca')
      const isLocal = cleanName.toLowerCase().includes('mallorca');

      // Determine category based on name
      let category = 'otros';
      const nameLower = cleanName.toLowerCase();
      
      if (nameLower.includes('zumo') || nameLower.includes('jugo') || nameLower.includes('licuado') || nameLower.includes('batido')) {
        if (nameLower.includes('batido') || nameLower.includes('smoothie')) {
          category = 'batidos';
        } else if (nameLower.includes('licuado')) {
          category = 'licuados';
        } else if (nameLower.includes('natural')) {
          category = 'zumos-naturales';
        } else {
          category = 'zumos-naturales';
        }
      } else if (nameLower.includes('patata') || nameLower.includes('papa')) {
        category = 'patatas';
      } else if (nameLower.includes('cebolla') || nameLower.includes('ajo') || nameLower.includes('puerro') || nameLower.includes('cebolleta') || nameLower.includes('chalota')) {
        category = 'cebollas';
      } else if (nameLower.includes('germinado') || nameLower.includes('brote')) {
        category = 'germinados';
      } else if (nameLower.includes('lechuga') || nameLower.includes('espinaca') || nameLower.includes('acelga') || nameLower.includes('canonigo') || nameLower.includes('canónigo') || nameLower.includes('rucula') || nameLower.includes('rúcula') || nameLower.includes('berro') || nameLower.includes('endivia') || nameLower.includes('escarola')) {
        category = 'lechugas';
      } else if (nameLower.includes('hierba') || nameLower.includes('perejil') || nameLower.includes('cilantro') || nameLower.includes('albahaca') || nameLower.includes('menta') || nameLower.includes('romero') || nameLower.includes('tomillo') || nameLower.includes('cebollino') || nameLower.includes('eneldo') || nameLower.includes('oregano') || nameLower.includes('orégano') || nameLower.includes('laurel')) {
        category = 'hierbas';
      } else if (nameLower.includes('manzana') || nameLower.includes('pera') || nameLower.includes('naranja') || nameLower.includes('limon') || nameLower.includes('limón') || nameLower.includes('platano') || nameLower.includes('plátano') || nameLower.includes('fresa') || nameLower.includes('uva') || nameLower.includes('melon') || nameLower.includes('melón') || nameLower.includes('sandia') || nameLower.includes('sandía') || nameLower.includes('melocoton') || nameLower.includes('melocotón') || nameLower.includes('cereza') || nameLower.includes('ciruela') || nameLower.includes('kiwi') || nameLower.includes('mango') || nameLower.includes('aguacate') || nameLower.includes('mandarina') || nameLower.includes('pomelo') || nameLower.includes('frambuesa') || nameLower.includes('arandano') || nameLower.includes('arándano')) {
        category = 'frutas';
      } else if (nameLower.includes('tomate') || nameLower.includes('pimiento') || nameLower.includes('pepino') || nameLower.includes('calabacin') || nameLower.includes('calabacín') || nameLower.includes('berenjena') || nameLower.includes('calabaza') || nameLower.includes('brocoli') || nameLower.includes('brócoli') || nameLower.includes('coliflor') || nameLower.includes('col') || nameLower.includes('alcachofa') || nameLower.includes('esparrago') || nameLower.includes('espárrago') || nameLower.includes('judia') || nameLower.includes('judía') || nameLower.includes('guisante') || nameLower.includes('haba')) {
        category = 'hortalizas';
      } else if (nameLower.includes('seta') || nameLower.includes('champinon') || nameLower.includes('champiñón') || nameLower.includes('portobello') || nameLower.includes('shiitake') || nameLower.includes('boletus') || nameLower.includes('trufa') || nameLower.includes('niscalo') || nameLower.includes('níscalo') || nameLower.includes('girgola') || nameLower.includes('gírgola')) {
        category = 'setas';
      } else if (nameLower.includes('zanahoria') || nameLower.includes('rabano') || nameLower.includes('rábano') || nameLower.includes('remolacha') || nameLower.includes('boniato') || nameLower.includes('batata') || nameLower.includes('yuca') || nameLower.includes('jengibre') || nameLower.includes('nabo') || nameLower.includes('chirivia') || nameLower.includes('chirivía') || nameLower.includes('apio')) {
        category = 'raices';
      }

      // Determine if seasonal (March in Mallorca) - Exclude juices by default
      const seasonalKeywords = [
        'alcachofa', 'guisante', 'haba', 'esparrago', 'espárrago', 'acelga', 'espinaca', 
        'col', 'coliflor', 'brocoli', 'brócoli', 'puerro', 'zanahoria', 'rabano', 'rábano', 
        'lechuga', 'naranja', 'limon', 'limón', 'pomelo', 'mandarina', 'fresa', 'freson', 'fresón'
      ];
      const isSeasonal = !category.includes('zumo') && !category.includes('batido') && !category.includes('licuado') && 
                         seasonalKeywords.some(keyword => cleanName.toLowerCase().includes(keyword));

      // Extract size if present (e.g. 250ml, 500ml, 1L)
      let size = 0;
      const sizeMatch = nameLower.match(/(\d+)\s*(ml|l)/);
      if (sizeMatch) {
        const value = parseInt(sizeMatch[1], 10);
        const unit = sizeMatch[2];
        size = unit === 'l' ? value * 1000 : value;
      }

      // Ensure ID is always unique even if multiple files contain the same number
      const baseId = code || 'prod';
      const uniqueSuffix = Math.random().toString(36).substring(2, 9);
      const id = `${baseId}-${uniqueSuffix}-${index}`;
      
      const base64Image = await fileToBase64(file);
      
      return {
        id,
        code,
        name: cleanName.toUpperCase(),
        category,
        image: base64Image,
        price: 0,
        rating: 5.0,
        description: 'Producto añadido desde imagen.',
        isLocal,
        isSeasonal,
        size,
      };
    });

    try {
      const results = await Promise.allSettled(newProductsPromises);
      
      const newProducts = results
        .filter((result): result is PromiseFulfilledResult<Product> => result.status === 'fulfilled')
        .map(result => result.value);

      const failedCount = results.length - newProducts.length;

      if (newProducts.length > 0) {
        try {
          await saveProducts(newProducts);
          if (failedCount > 0) {
            setToastMessage(`¡Éxito! ${newProducts.length} subidos. ${failedCount} fallaron (formato no soportado).`);
          } else {
            setToastMessage(`¡Éxito! ${newProducts.length} productos creados correctamente`);
          }
        } catch (error) {
          setToastMessage("Error al guardar productos en la nube");
        }
      } else {
        setToastMessage("Error: Ninguna imagen pudo ser procesada (formato no soportado).");
      }
      setTimeout(() => setToastMessage(null), 4000);
    } catch (error) {
      console.error("Error uploading images:", error);
      setToastMessage("Error al procesar las imágenes");
      setTimeout(() => setToastMessage(null), 3000);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const productCategory = CATEGORIES.find(c => 
        c.id.toLowerCase() === String(product.category).toLowerCase() || 
        c.name.toLowerCase() === String(product.category).toLowerCase()
      );
      let section = productCategory?.section;
      
      // Fallback for common juice keywords if category is unknown or not in juices section
      if (section !== 'juices' && product.category) {
        const cat = String(product.category).toLowerCase();
        if (cat.includes('zumo') || cat.includes('jugo') || cat.includes('batido') || cat.includes('licuado') || cat.includes('smoothie') || cat.includes('bebida')) {
          section = 'juices';
        }
      }

      const sectionMatch = appSection === 'home' || 
                           section === appSection || 
                           (appSection === 'produce' && section === 'other');
      if (!sectionMatch) return false;

      const matchesCategory = selectedCategory ? 
        (String(product.category).toLowerCase() === selectedCategory.toLowerCase() || 
         CATEGORIES.find(c => c.id === selectedCategory)?.name.toLowerCase() === String(product.category).toLowerCase()) : true;
      const productName = String(product.name || '');
      const productId = String(product.id || '');
      const matchesSearch = productName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            productId.includes(searchQuery);
      const matchesLocal = filterLocal ? product.isLocal : true;
      const matchesSeasonal = filterSeasonal ? product.isSeasonal : true;
      
      return matchesCategory && matchesSearch && matchesLocal && matchesSeasonal;
    });

    // Apply sorting
    result.sort((a, b) => {
      const aName = String(a.name || '');
      const bName = String(b.name || '');
      if (sortMode === 'az') return aName.localeCompare(bName);
      if (sortMode === 'za') return bName.localeCompare(aName);
      if (sortMode === 'size') return (Number(a.size) || 0) - (Number(b.size) || 0);
      // 'newest' assumes newer items are added to the beginning of the array or we can use ID if it's timestamp based.
      // For now, if 'newest', we can just reverse the default order or assume the original array is newest first.
      // Since we unshift in loadProducts, the original array is newest first.
      // We can find their index in the original `products` array to maintain 'newest' order.
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
      <>
        <div className="min-h-screen bg-[#f2f2f7] flex flex-col items-center justify-center p-6 font-sans">
          <div className="text-center mb-12">
             <img 
               src={customLogo || "/LOGO.png"} 
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
             <h1 id="home-fallback-text" className="text-4xl font-bold tracking-tight text-slate-900 mb-2 hidden">Bonany - Catálogo Público</h1>
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
        <SmartAssistant products={products} />
      </>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#f2f2f7] text-black overflow-hidden relative font-sans">
      {/* Quota Warning Banner */}
      {getIsQuotaExceeded() && (
        <div className="bg-amber-600 text-white text-[10px] font-bold py-1.5 px-4 text-center sticky top-0 z-[100] flex items-center justify-center gap-2 shadow-md">
          <RefreshCcw size={12} className="animate-spin" />
          <span>Límite diario de base de datos alcanzado. Tus cambios se guardarán localmente y se sincronizarán mañana.</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
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
              src={customLogo || "/LOGO.png"} 
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
                {CATEGORIES.filter(c => c.section === 'produce').map((category) => (
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
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedCategory === category.id ? 'bg-white' : dragOverCategory === category.id ? 'bg-emerald-500' : 'bg-slate-300'}`} />
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
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">Zumos</p>
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
                        ? 'bg-emerald-500 text-white shadow-sm' 
                        : dragOverCategory === category.id
                        ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500 ring-inset'
                        : 'text-slate-600 hover:bg-black/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedCategory === category.id ? 'bg-white' : dragOverCategory === category.id ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span>{category.name}</span>
                    </div>
                    {selectedCategory === category.id && <ChevronRight size={14} />}
                  </button>
                ))}
              </nav>
            </div>
          )}

          {appSection === 'produce' && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">Otros</p>
              <nav className="space-y-0.5">
                {CATEGORIES.filter(c => c.section === 'other').map((category) => (
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
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedCategory === category.id ? 'bg-white' : dragOverCategory === category.id ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span>{category.name}</span>
                    </div>
                    {selectedCategory === category.id && <ChevronRight size={14} />}
                  </button>
                ))}
              </nav>
            </div>
          )}

          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">Filtros</p>
            <div className="space-y-1">
              <button
                onClick={() => setFilterLocal(!filterLocal)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all ios-active ${
                  filterLocal ? 'bg-white text-emerald-600 shadow-sm border border-black/5' : 'bg-transparent text-slate-600 hover:bg-black/5'
                }`}
              >
                <MapPin size={18} className={filterLocal ? 'text-emerald-500' : 'text-slate-400'} />
                <span>Local / Mallorca</span>
              </button>
              <button
                onClick={() => setFilterSeasonal(!filterSeasonal)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all ios-active ${
                  filterSeasonal ? 'bg-white text-amber-600 shadow-sm border border-black/5' : 'bg-transparent text-slate-600 hover:bg-black/5'
                }`}
              >
                <Calendar size={18} className={filterSeasonal ? 'text-amber-500' : 'text-slate-400'} />
                <span>Temporada</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-6 space-y-4">
          <div className="p-4 bg-black/5 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Comercial</p>
            <p className="text-sm font-bold text-black">Bonany Mallorca</p>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#f2f2f7]">
        {/* Top Navigation Bar - iOS Style */}
        <header className="h-16 md:h-20 ios-glass border-b border-black/5 flex items-center justify-between px-4 md:px-8 flex-shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-4 md:gap-6 flex-1">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full transition-all ios-active"
            >
              {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <div className="relative w-full max-w-md group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-black/5 border-none rounded-2xl text-[15px] focus:bg-white focus:ring-0 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 ml-4">
            {isAdminMode && (
              <button
                onClick={handleRemoveDuplicates}
                className="hidden sm:flex items-center gap-2 px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-colors"
                title="Eliminar productos con el mismo nombre"
              >
                <Trash2 size={14} />
                <span>Limpiar Duplicados</span>
              </button>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Estado</p>
              <p className="text-xs font-bold text-emerald-600">{isAdminMode ? 'Modo Edición' : 'Actualizado'}</p>
            </div>
            <div 
              className={`w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-black/5 cursor-pointer transition-colors ${isAdminMode ? 'text-white bg-emerald-500' : 'text-emerald-500'}`}
              onDoubleClick={() => setIsAdminMode(prev => !prev)}
              title="Doble clic para modo edición"
            >
              <Leaf size={20} />
            </div>
          </div>
        </header>

        {/* Scrollable Grid Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 no-scrollbar">
          <div className="max-w-7xl mx-auto">
            {filteredProducts.length === 0 && isLoaded ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-6">
                  <Search size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No se encontraron productos</h3>
                <p className="text-slate-500 max-w-xs mx-auto mb-8">
                  {searchQuery ? 'Prueba con otros términos de búsqueda o categoría.' : 'El catálogo parece estar vacío en este momento.'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={handleSyncFromExternal}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    <RefreshCcw size={18} className={isSyncing ? 'animate-spin' : ''} />
                    <span>{isSyncing ? 'Sincronizando...' : 'Cargar Catálogo Inicial'}</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight text-black">
                      {selectedCategory ? CATEGORIES.find(c => c.id === selectedCategory)?.name : 'Catálogo'}
                    </h2>
                    <p className="text-[15px] text-slate-500 mt-1 font-medium">
                      {filteredProducts.length} productos profesionales
                      {isAdminMode && ' • Arrastra para recategorizar'}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    {/* Sort Toggle */}
                    <div className="flex bg-white rounded-xl shadow-sm border border-black/5 p-1">
                      <button
                        onClick={() => setSortMode('az')}
                        className={`p-2 rounded-lg transition-colors ${sortMode === 'az' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Ordenar A-Z"
                      >
                        <ArrowDownAZ size={18} />
                      </button>
                      <button
                        onClick={() => setSortMode('za')}
                        className={`p-2 rounded-lg transition-colors ${sortMode === 'za' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Ordenar Z-A"
                      >
                        <ArrowUpZA size={18} />
                      </button>
                      <button
                        onClick={() => setSortMode('newest')}
                        className={`p-2 rounded-lg transition-colors ${sortMode === 'newest' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Más recientes"
                      >
                        <Clock size={18} />
                      </button>
                      {appSection === 'juices' && (
                        <button
                          onClick={() => setSortMode('size')}
                          className={`p-2 rounded-lg transition-colors ${sortMode === 'size' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                          title="Ordenar por tamaño"
                        >
                          <Ruler size={18} />
                        </button>
                      )}
                    </div>

                    {/* View Mode Segmented Control */}
                    <div className="flex bg-[#f2f2f7] p-1 rounded-xl relative w-24">
                      <motion.div
                        layoutId="viewModeBg"
                        className="absolute inset-y-1 bg-white rounded-lg shadow-sm"
                        initial={false}
                        animate={{
                          left: viewMode === 'grid' ? 4 : '50%',
                          width: 'calc(50% - 4px)'
                        }}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                      />
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`relative z-10 flex-1 flex items-center justify-center py-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Vista Cuadrícula"
                      >
                        <GridIcon size={18} />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`relative z-10 flex-1 flex items-center justify-center py-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Vista Lista"
                      >
                        <ListIcon size={18} />
                      </button>
                    </div>

                    {(searchQuery || filterLocal || filterSeasonal || selectedCategory) && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory(null);
                          setFilterLocal(false);
                          setFilterSeasonal(false);
                        }}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors"
                      >
                        Ver todos
                      </button>
                    )}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div 
                    key={viewMode}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={viewMode === 'grid' 
                      ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6"
                      : "flex flex-col gap-3"
                    }
                  >
                    {filteredProducts.map((product) => (
                      <ProductCard 
                        key={product.id} 
                        product={product} 
                        onClick={setSelectedProduct} 
                        isAdminMode={isAdminMode && isAdmin}
                        onDelete={handleDeleteProduct}
                        onToggleLocal={handleToggleLocal}
                        onToggleSeasonal={handleToggleSeasonal}
                        onUpdateCategory={handleUpdateProductCategory}
                        viewMode={viewMode}
                      />
                    ))}
                  </motion.div>
                </AnimatePresence>
              </>
            )}
          </div>
        </div>
      </main>

      <ProductModal 
        product={selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        isAdminMode={isAdminMode && isAdmin}
        onUpdateCategory={handleUpdateProductCategory}
      />

      {isAdminPanelOpen && (
        <AdminPanel
          onExport={handleExportData}
          onImport={handleImportData}
          onRestoreDefaults={handleRestoreDefaults}
          onRemoveDuplicates={handleRemoveDuplicates}
          onClearAll={handleClearAll}
          onAddManual={() => {
            setIsAdminPanelOpen(false);
            setIsAddingProduct(true);
          }}
          onSyncFromExternal={handleSyncFromExternal}
          onPasteJson={() => {
            setIsAdminPanelOpen(false);
            setIsPasteModalOpen(true);
          }}
          onClose={() => setIsAdminPanelOpen(false)}
          setProducts={setProducts}
          showToast={showToast}
          onUpdateLogo={handleLogoUpdate}
          isAdmin={isAdmin}
        />
      )}

      {isAddingProduct && (
        <ProductForm
          onSave={handleAddManualProduct}
          onCancel={() => setIsAddingProduct(false)}
        />
      )}

      {isPasteModalOpen && (
        <JsonPasteModal
          onSave={handlePasteJson}
          onClose={() => setIsPasteModalOpen(false)}
        />
      )}

      {/* Hidden File Input for legacy support */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        multiple
        accept="image/*"
        className="hidden"
      />
      {/* Smart Assistant */}
      <SmartAssistant products={products} />
      </div>
    </div>
  );
}
