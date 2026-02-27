import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '@/types/domain';
import { useCart } from '@/context/CartContext';
import { calculateProductPrice } from '@/utils/priceUtils';
import Button from '@/components/ui/button';

interface VariationSelectionModalProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceElement?: HTMLElement | null;
  onAdd?: (product: Product) => void;
}

export default function VariationSelectionModal({
  product,
  open,
  onOpenChange,
  sourceElement,
  onAdd: customOnAdd
}: VariationSelectionModalProps) {
  const { addToCart } = useCart();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  // Reset selection and handle body scroll when modal opens
  useEffect(() => {
    if (open) {
      setSelectedIndex(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!product.variations || product.variations.length === 0) return null;

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const variant = product.variations![selectedIndex];
    const { displayPrice, mrp } = calculateProductPrice(product, selectedIndex);

    const vName = (variant.name || '').trim();
    const isGeneric = !vName || ['variation', 'standard'].includes(vName.toLowerCase());
    const title = (isGeneric ? (variant.value || variant.title || vName) : vName).trim() || 'Standard';

    const cartProduct = {
      ...product,
      price: displayPrice,
      mrp: mrp,
      pack: title,
      selectedVariant: variant,
      variantId: variant?._id,
      variantTitle: title,
    };

    // Close modal first to ensure it doesn't block the animation
    onOpenChange(false);

    if (customOnAdd) {
      customOnAdd(cartProduct as any);
    } else {
      // Add to cart using the "Add to Basket" button inside the modal as the source for the animation
      // This makes the product fly FROM the modal TOWARDS the cart
      await addToCart(cartProduct, addButtonRef.current || sourceElement);
    }
  };

  const modalContent = (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            onOpenChange(false);
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[2px]"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative bg-white w-full max-w-[340px] rounded-3xl shadow-2xl flex flex-col pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 pb-3 border-b border-neutral-100">
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                  <h3 className="text-base font-bold text-neutral-900 leading-tight">
                    {product.name || product.productName}
                  </h3>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Select {product.variationType || 'Option'}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenChange(false);
                  }}
                  className="p-1.5 -mr-1 rounded-full hover:bg-neutral-100 text-neutral-400 transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* List */}
            <div className="p-3 max-h-[50vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                {product.variations.map((v: any, i: number) => {
                  const { displayPrice, mrp, discount, hasDiscount } = calculateProductPrice(product, i);
                  const isSelected = i === selectedIndex;
                  const isOutOfStock = v.status === 'Sold out' || (v.stock === 0 && v.stock !== undefined);

                  const vName = (v.name || '').trim();
                  const isGeneric = !vName || ['variation', 'standard'].includes(vName.toLowerCase());
                  const title = (isGeneric ? (v.value || v.title || vName) : vName).trim() || 'Standard';

                  return (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isOutOfStock) setSelectedIndex(i);
                      }}
                      disabled={isOutOfStock}
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${isSelected
                        ? 'border-green-600 bg-green-50 shadow-sm ring-1 ring-green-600/10'
                        : isOutOfStock
                          ? 'border-neutral-100 bg-neutral-50 opacity-50 cursor-not-allowed'
                          : 'border-neutral-200 bg-white hover:border-green-200'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'border-green-600 bg-green-600' : 'border-neutral-300'
                          }`}>
                          {isSelected && <div className="w-1 h-1 bg-white rounded-full" />}
                        </div>

                        <div>
                          <p className={`text-xs font-bold ${isSelected ? 'text-green-800' : 'text-neutral-800'}`}>
                            {title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-sm font-bold text-neutral-900">₹{displayPrice}</span>
                            {hasDiscount && (
                              <span className="text-[10px] text-neutral-400 line-through font-normal">₹{mrp}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {hasDiscount && (
                        <span className="bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                          {discount}% OFF
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 pt-3 border-t border-neutral-100 bg-neutral-50/30">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Total</p>
                  <p className="text-lg font-bold text-neutral-900">₹{calculateProductPrice(product, selectedIndex).displayPrice}</p>
                </div>
                <Button
                  ref={addButtonRef}
                  onClick={handleAdd}
                  disabled={product.variations[selectedIndex]?.status === 'Sold out'}
                  className="flex-1 py-2.5 h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold shadow-lg shadow-green-200/50 transition-all active:scale-95"
                >
                  Add to Basket
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
