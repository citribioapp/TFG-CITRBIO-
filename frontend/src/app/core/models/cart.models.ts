export interface CartItemOption {
  id: number | null;
  name: string | null;
}

export interface CartItem {
  cartItemId: number;
  quantity: number;
  product: {
    id: number | null;
    name: string | null;
    image?: string | null;
  };
  selection: {
    caliber: CartItemOption | null;
    quality: CartItemOption | null;
    format: CartItemOption | null;
  };
}

export interface CartResponse {
  cartId?: number;
  status?: string;
  items: CartItem[];
  message?: string;
}

export interface AddCartItemRequest {
  productId: number;
  caliberId: number;
  qualityId: number;
  formatId: number;
  quantity: number;
}
