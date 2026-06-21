export interface CreateOrderResponse {
  message: string;
  orderId: number;
  emailSent?: boolean;
  warning?: string;
}

export interface CustomerOrderSummary {
  id: number;
  status: string;
  deliveryAddress: string;
  createdAt: string;
  shippingPrice?: number | null;
  productsSubtotal?: number | null;
  totalPrice?: number | null;
  items?: CustomerOrderItemSummary[];
}

export interface CustomerOrderItemSummary {
  id: number;
  product: string;
  category: string;
  caliber: string;
  quality: string;
  format: string;
  quantity: number;
  unitPrice?: number | null;
  lineTotal?: number | null;
}

export interface AdminOrderSummary extends CustomerOrderSummary {
  customer: {
    id: number | null;
    name: string;
    email: string | null;
    phone: string | null;
  };
}

export interface SendQuoteRequest {
  items: { orderItemId: number; unitPrice: number }[];
  shippingPrice: number;
}

export interface SendQuoteResponse {
  message: string;
  orderId: number;
  status: string;
  emailSent: boolean;
  warning?: string;
}
