import { Product, Category } from './types';

export const CATEGORIES: Category[] = [
  { id: 'frutas', name: 'Frutas', icon: 'Apple', section: 'produce' },
  { id: 'hortalizas', name: 'Hortalizas', icon: 'Carrot', section: 'produce' },
  { id: 'patatas', name: 'Patatas', icon: 'Potato', section: 'produce' },
  { id: 'raices', name: 'Raíces y Tubérculos', icon: 'Radish', section: 'produce' },
  { id: 'cebollas', name: 'Cebollas y Ajos', icon: 'Circle', section: 'produce' },
  { id: 'lechugas', name: 'Lechugas y Verdes', icon: 'Leaf', section: 'produce' },
  { id: 'germinados', name: 'Germinados', icon: 'Sprout', section: 'produce' },
  { id: 'hierbas', name: 'Hierbas Aromáticas', icon: 'Wind', section: 'produce' },
  { id: 'setas', name: 'Setas y Hongos', icon: 'Mushroom', section: 'produce' },
  { id: 'zumos-naturales', name: 'Zumos Naturales', icon: 'CupSoda', section: 'juices' },
  { id: 'batidos', name: 'Batidos y Smoothies', icon: 'CupSoda', section: 'juices' },
  { id: 'licuados', name: 'Licuados Especiales', icon: 'CupSoda', section: 'juices' },
  { id: 'otros-zumos', name: 'Otras Bebidas', icon: 'CupSoda', section: 'juices' },
  { id: 'otros', name: 'Otros', icon: 'Package', section: 'other' },
];

export const PRODUCTS: Product[] = [
  {
    id: '1',
    code: '101',
    name: 'TOMATE RAMA',
    category: 'hortalizas',
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400',
    price: 0,
    rating: 5,
    description: 'Tomate de rama fresco y sabroso.',
    isLocal: true,
    isSeasonal: true
  },
  {
    id: '2',
    code: '102',
    name: 'MANZANA GOLDEN',
    category: 'frutas',
    image: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&q=80&w=400',
    price: 0,
    rating: 5,
    description: 'Manzana golden dulce y crujiente.',
    isLocal: false,
    isSeasonal: true
  },
  {
    id: '3',
    code: '103',
    name: 'PATATA MALLORCA',
    category: 'patatas',
    image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=400',
    price: 0,
    rating: 5,
    description: 'Patata local de Mallorca, ideal para freír.',
    isLocal: true,
    isSeasonal: true
  },
  {
    id: '4',
    code: '104',
    name: 'ZUMO DE NARANJA NATURAL',
    category: 'zumos-naturales',
    image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&q=80&w=400',
    price: 0,
    rating: 5,
    description: 'Zumo de naranja recién exprimido.',
    isLocal: true,
    isSeasonal: true,
    size: 250
  }
];
