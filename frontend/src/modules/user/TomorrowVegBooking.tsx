import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLoading } from "../../context/LoadingContext";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api/config";
import ProductCard from "./components/ProductCard";
import RazorpayCheckout from "../../components/RazorpayCheckout";

interface Slot {
  _id: string;
  timeRange: string;
  available: boolean;
  maxCapacity: number;
  bookedCount: number;
}

interface Product {
  _id: string;
  name: string;
  image: string;
  price: number;
  originalPrice: number;
  stock: number;
  maxQuantity: number;
}

interface CartItem extends Product {
  quantity: number;
}

interface Section {
  _id: string;
  title: string;
  displayType: string;
  products?: any[]; // Simplified
  categories?: any[];
  subCategories?: any[];
  columns?: number;
  limit?: number;
}

export default function TomorrowVegBooking() {
  const navigate = useNavigate();
  const { startRouteLoading, stopRouteLoading } = useLoading();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isBookingClosed, setIsBookingClosed] = useState(false);
  const [targetDate, setTargetDate] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      startRouteLoading();
      setLoading(true);

      const [slotsRes, contentRes] = await Promise.all([
        api.get("/next-day/slots"),
        api.get("/next-day/content"),
      ]);

      if (slotsRes.data.success) {
        setSlots(slotsRes.data.data);
        setIsBookingClosed(slotsRes.data.bookingClosed);
        if (slotsRes.data.targetDate) {
          setTargetDate(new Date(slotsRes.data.targetDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }));
        }
      }

      if (contentRes.data.success) {
        setSections(contentRes.data.data);
      }
    } catch (error) {
      console.error(error);
      showToast("Failed to load booking data", "error");
    } finally {
      setLoading(false);
      stopRouteLoading();
    }
  };

  // Helper to standardise section products to our Product interface
  const mapSectionProduct = (p: any): any => ({
    ...p,
    _id: p._id,
    id: p._id,
    name: p.name || p.productName,
    productName: p.name || p.productName,
    imageUrl: p.image || p.mainImage || (p.productImages && p.productImages[0]) || "",
    mainImage: p.image || p.mainImage || (p.productImages && p.productImages[0]) || "",
    price: p.price,
    mrp: p.originalPrice || p.price,
    originalPrice: p.originalPrice || p.price,
    stock: p.stock || 0,
    maxQuantity: 10,
    unit: p.unit || p.pack,
    pack: p.unit || p.pack
  });

  const addToCart = (product: Product | any) => {
    setCart((prev) => {
      const productId = product._id || product.id;
      const variantId = product.variantId || (product.selectedVariant?._id);
      const variantTitle = product.variantTitle || product.pack;

      const existing = prev.find((item: any) => {
        const itemProductId = item._id || item.id;
        const itemVariantId = item.variantId || (item.selectedVariant?._id);
        const itemVariantTitle = item.variantTitle || item.pack;

        if (variantId || variantTitle) {
          return itemProductId === productId && (itemVariantId === variantId || itemVariantTitle === variantTitle);
        }
        return itemProductId === productId && !itemVariantId && !itemVariantTitle;
      });

      if (existing) {
        if (existing.quantity >= (product.maxQuantity || 10)) return prev;
        return prev.map((item: any) => {
          const itemProductId = item._id || item.id;
          const itemVariantId = item.variantId || (item.selectedVariant?._id);
          const itemVariantTitle = item.variantTitle || item.pack;

          const isMatch = (variantId || variantTitle)
            ? itemProductId === productId && (itemVariantId === variantId || itemVariantTitle === variantTitle)
            : itemProductId === productId && !itemVariantId && !itemVariantTitle;

          return isMatch ? { ...item, quantity: item.quantity + 1 } : item;
        });
      }
      return [...prev, { ...product, _id: productId, id: productId, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string, variantInfo?: { id?: string, title?: string }) => {
    setCart((prev) => {
      let existingIndex = -1;

      if (variantInfo?.id || variantInfo?.title) {
        existingIndex = prev.findIndex((item: any) => {
          const itemProductId = item._id || item.id;
          const itemVariantId = item.variantId || (item.selectedVariant?._id);
          const itemVariantTitle = item.variantTitle || item.pack;
          return itemProductId === productId && (itemVariantId === variantInfo.id || itemVariantTitle === variantInfo.title);
        });
      } else {
        // Find the most recently added item of this product if no variant info provided
        for (let i = prev.length - 1; i >= 0; i--) {
          if ((prev[i] as any)._id === productId || (prev[i] as any).id === productId) {
            existingIndex = i;
            break;
          }
        }
      }

      if (existingIndex === -1) return prev;

      const existing = prev[existingIndex];
      if (existing.quantity === 1) {
        return prev.filter((_, index) => index !== existingIndex);
      }

      return prev.map((item: any, index: number) =>
        index === existingIndex ? { ...item, quantity: item.quantity - 1 } : item
      );
    });
  };

  const getQuantity = (productId: string, variantInfo?: { id?: string, title?: string }) => {
    return cart.reduce((acc, item: any) => {
      const itemProductId = item._id || item.id;

      if (variantInfo?.id || variantInfo?.title) {
        const itemVariantId = item.variantId || (item.selectedVariant?._id);
        const itemVariantTitle = item.variantTitle || item.pack;
        if (itemProductId === productId && (itemVariantId === variantInfo.id || itemVariantTitle === variantInfo.title)) {
          return acc + item.quantity;
        }
      } else if (itemProductId === productId) {
        return acc + item.quantity;
      }
      return acc;
    }, 0);
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const [showRazorpayCheckout, setShowRazorpayCheckout] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  const handleBooking = async () => {
    if (!selectedSlot) {
      showToast("Please select a delivery slot", "error");
      return;
    }
    if (cart.length === 0) {
      showToast("Your cart is empty", "error");
      return;
    }

    try {
      startRouteLoading();
      const payload = {
        items: cart.map(i => ({ product: i._id, quantity: i.quantity, price: i.price, variantId: (i as any).variantId, variantTitle: (i as any).variantTitle || (i as any).pack })),
        slotId: selectedSlot,
        paymentMethod: "Online"
      };

      const res = await api.post("/next-day/order", payload);
      if (res.data.success && res.data.orderId) {
        setPendingOrderId(res.data.orderId);
        setShowRazorpayCheckout(true);
      } else {
        showToast(res.data.message || "Booking failed", "error");
      }

    } catch (error: any) {
      showToast(error.response?.data?.message || "Booking failed", "error");
    } finally {
      stopRouteLoading();
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div>;

  return (
    <div className="min-h-screen bg-emerald-50/30 pb-24">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-lg font-bold text-gray-800">Book for Tomorrow</h1>
          <div className="w-8"></div>
        </div>

        {/* Date & Note */}
        <div className="px-4 pb-3">
          <p className="text-sm text-center text-gray-500">Delivery for <span className="font-bold text-emerald-600">{targetDate || "Tomorrow"}</span></p>
          {isBookingClosed && (
            <div className="mt-2 bg-red-100 text-red-700 px-3 py-2 rounded-lg text-xs text-center font-medium">
              Order booking closed for tomorrow. Try again later.
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Slots */}
        {!isBookingClosed && (
          <section className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100">
            <h2 className="text-xs font-black text-emerald-800 mb-4 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
              Select Morning Slot
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {slots.map((slot) => (
                <button
                  key={slot._id}
                  disabled={!slot.available}
                  onClick={() => setSelectedSlot(slot._id)}
                  className={`
                    p-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-300
                    ${selectedSlot === slot._id
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-lg transform scale-[1.03] z-10"
                      : "border-slate-100 bg-white text-slate-600 hover:border-emerald-200 hover:shadow-md"}
                    ${!slot.available ? "opacity-40 cursor-not-allowed bg-slate-50 border-slate-100" : ""}
                    `}
                >
                  <span className="text-sm font-black tracking-tight">{slot.timeRange}</span>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${slot.available ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}></span>
                    <span className={`text-[9px] font-black uppercase tracking-wider ${slot.available ? "text-emerald-600" : "text-slate-400"}`}>
                      {slot.available ? "Available" : "Full"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Dynamic Sections */}
        {sections.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="text-4xl mb-3">🥦</div>
            <p className="text-sm font-bold text-gray-400">No products available for next day delivery yet.</p>
          </div>
        ) : (
          sections.map(section => {
            const columnCount = Number(section.columns) || 4;
            const gridClass = "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
            const gapClass = "gap-3 md:gap-4 lg:gap-6";

            return (
              <section key={section._id} className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1 h-3 bg-emerald-400 rounded-full"></span>
                    {section.title}
                  </h2>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {section.products?.length || 0} ITEMS
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5 md:gap-4 lg:gap-6">
                  {section.products?.filter(Boolean).map(entry => {
                    const product = mapSectionProduct(entry);

                    return (
                      <ProductCard
                        key={product._id}
                        product={product as any}
                        categoryStyle={true}
                        showBadge={true}
                        showRating={true}
                        showOptionsText={true}
                        overrideQuantity={getQuantity(product._id, { id: product.variantId, title: product.variantTitle || product.pack })}
                        onAdd={(p) => addToCart(p as any)}
                        onIncrease={(p) => addToCart(p as any)}
                        onDecrease={(p) => removeFromCart(p._id || p.id, { id: (p as any).variantId, title: (p as any).variantTitle || (p as any).pack })}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* Floating Checkout Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total</span>
              <div className="text-xl font-bold text-gray-900">₹{cartTotal}</div>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500">{cart.reduce((a, b) => a + b.quantity, 0)} items</span>
            </div>
          </div>
          <button
            onClick={handleBooking}
            disabled={isBookingClosed}
            className={`w-full py-4 rounded-2xl font-black text-sm shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${isBookingClosed
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200"
              }`}
          >
            {isBookingClosed ? "BOOKING CLOSED" : "PLACE ORDER FOR TOMORROW"}
            {!isBookingClosed && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            )}
          </button>
        </div>
      )}

      {
        showRazorpayCheckout && pendingOrderId && user && (
          <RazorpayCheckout
            orderId={pendingOrderId}
            amount={cartTotal}
            customerDetails={{
              name: user.name || 'Customer',
              email: user.email || '',
              phone: user.phone || '',
            }}
            onSuccess={(paymentId) => {
              setShowRazorpayCheckout(false);
              setCart([]);
              setPendingOrderId(null);
              showToast("Order placed successfully for tomorrow!", "success");
              navigate("/orders");
            }}
            onFailure={(error) => {
              setShowRazorpayCheckout(false);
              showToast(error || 'Payment failed. Please try again.', 'error');
              // If payment fails, maybe navigate or just let them retry?
            }}
          />
        )
      }
    </div>
  );
}
