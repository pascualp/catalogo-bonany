export interface Product {
  id: string;
  code?: string;
  name: string;
  category: string;
  image?: string;
  format?: string;
  packaging?: string;
  useCase?: string;
  isLocal?: boolean;
  isSeasonal?: boolean;
  landscapeImage?: string;
  price: number;
  rating: number;
  description: string;
  formats?: string[];
  uses?: string[];
  size?: number; // Size in ml or similar for sorting
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  section?: 'produce' | 'juices' | 'other';
}
