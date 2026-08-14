import { sendNotification } from './notificationService';

export const LOW_STOCK_THRESHOLD = 5;

export const hasEnteredLowStock = (
  previousStock: number,
  currentStock: number,
) =>
  previousStock > LOW_STOCK_THRESHOLD &&
  currentStock <= LOW_STOCK_THRESHOLD;

interface LowStockNotificationInput {
  sellerId: string;
  productId: string;
  productName: string;
  previousStock: number;
  currentStock: number;
  variationId?: string;
  variationName?: string;
}

export const sendLowStockNotification = async ({
  sellerId,
  productId,
  productName,
  previousStock,
  currentStock,
  variationId,
  variationName,
}: LowStockNotificationInput) => {
  if (!hasEnteredLowStock(previousStock, currentStock)) return null;

  const isOutOfStock = currentStock === 0;
  const variationLabel = variationName ? ` (${variationName})` : '';

  return sendNotification(
    'Seller',
    sellerId,
    isOutOfStock ? 'Product Out of Stock' : 'Low Stock Alert',
    `"${productName}"${variationLabel} has ${currentStock} unit${currentStock === 1 ? '' : 's'} left.`,
    {
      type: 'Warning',
      link: '/seller/product/stock',
      actionLabel: 'Update Stock',
      priority: isOutOfStock ? 'Urgent' : 'High',
      data: {
        type: isOutOfStock ? 'OUT_OF_STOCK' : 'LOW_STOCK',
        productId,
        variationId: variationId || '',
        currentStock: String(currentStock),
      },
    },
  );
};
