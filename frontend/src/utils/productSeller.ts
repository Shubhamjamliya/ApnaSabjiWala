import { Product } from '../types/domain';

export const getProductSellerId = (product?: Partial<Product> | null): string => {
  if (product?.sellerId) return String(product.sellerId);
  if (typeof product?.seller === 'string') return product.seller;
  return product?.seller?._id ? String(product.seller._id) : '';
};

export const getProductStoreName = (product?: Partial<Product> | null): string => {
  if (product?.storeName) return product.storeName;
  if (product?.sellerName) return product.sellerName;
  if (product?.seller && typeof product.seller === 'object') {
    return product.seller.storeName || product.seller.sellerName || '';
  }
  return '';
};
