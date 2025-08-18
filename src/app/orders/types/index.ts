import type { ProductsInResponse } from 'src/app/products/types';
import type { Order, OrderItem, Address } from 'src/db/schemas';

type OrderItemResponse = {
  id: OrderItem['id'];
  orderId: OrderItem['orderId'];
  productId: OrderItem['productId'];
  quantity: OrderItem['quantity'];
  price: OrderItem['price'];
  product: ProductsInResponse;
};

export interface OrderInResponse extends Order {
  orderItems: OrderItemResponse[];
  shippingAddress: Address;
}
