export interface CategorySummary {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

export interface ProductSummary {
  id: number;
  name: string;
  description: string | null;
  isActive?: boolean;
  isOutOfSeason?: boolean;
  image?: string | null;
  category: CategorySummary | null;
}

export interface ProductOption {
  id: number;
  name: string;
}

export interface ProductImage {
  id: number;
  imagePath: string;
  isMain: boolean;
}

export interface ProductDetail extends ProductSummary {
  images: ProductImage[];
  options: {
    calibers: ProductOption[];
    qualities: ProductOption[];
    formats: ProductOption[];
  };
}

export interface CategoryWithProducts extends CategorySummary {
  products: Array<{
    id: number;
    name: string;
    description: string | null;
    image?: string | null;
    isOutOfSeason: boolean;
  }>;
}

export interface CategoryProductsResponse {
  category: CategorySummary;
  products: Array<{
    id: number;
    name: string;
    description: string | null;
    image?: string | null;
    isOutOfSeason: boolean;
  }>;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface CreateProductRequest {
  name: string;
  categoryId: number;
  description?: string | null;
  isActive?: boolean;
  isOutOfSeason?: boolean;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {}
