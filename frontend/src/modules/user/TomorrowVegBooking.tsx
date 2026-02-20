import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLoading } from "../../context/LoadingContext";
import { useToast } from "../../context/ToastContext";
import api from "../../services/api/config";

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
  const mapSectionProduct = (p: any): Product => ({
    _id: p._id,
    name: p.name || p.productName,
    image: p.mainImage || (p.productImages && p.productImages[0]) || "",
    price: p.price,
    originalPrice: p.price, // Or compareAtPrice if available
    stock: p.stock || 0,
    maxQuantity: 10 // Default
  });

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item._id === product._id);
      if (existing) {
        if (existing.quantity >= product.maxQuantity) return prev;
        return prev.map((item) =>
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item._id === productId);
      if (existing?.quantity === 1) {
        return prev.filter((item) => item._id !== productId);
      }
      return prev.map((item) =>
        item._id === productId ? { ...item, quantity: item.quantity - 1 } : item
      );
    });
  };

  const getQuantity = (productId: string) => {
    return cart.find((item) => item._id === productId)?.quantity || 0;
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

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
        items: cart.map(i => ({ product: i._id, quantity: i.quantity, price: i.price })),
        slotId: selectedSlot,
        paymentMethod: "COD"
      };

      const res = await api.post("/next-day/order", payload);
      if (res.data.success) {
        showToast("Order placed successfully for tomorrow!", "success");
        setCart([]);
        navigate("/orders");
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
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Select Morning Slot</h2>
            <div className="grid grid-cols-2 gap-3">
              {slots.map((slot) => (
                <button
                  key={slot._id}
                  disabled={!slot.available}
                  onClick={() => setSelectedSlot(slot._id)}
                  className={`
                    p-3 rounded-xl border flex flex-col items-center justify-center transition-all
                    ${selectedSlot === slot._id
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500 shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:border-emerald-200"}
                    ${!slot.available ? "opacity-50 cursor-not-allowed bg-gray-50" : ""}
                    `}
                >
                  <span className="text-sm font-bold">{slot.timeRange}</span>
                  <span className="text-[10px] mt-1 text-gray-400">
                    {slot.available ? "Available" : "Full"}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Dynamic Sections */}
        {sections.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p>No products available for next day delivery yet.</p>
          </div>
        ) : (
          sections.map(section => {
            const columnCount = Number(section.columns) || 2; // Default to 2 for mobile, Home.tsx uses 4 for desktop
            const gridClass = {
              2: "grid-cols-2",
              3: "grid-cols-3",
              4: "grid-cols-2 md:grid-cols-4", // Responsive for 4 columns
              6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6", // Responsive for 6 columns
              8: "grid-cols-2 md:grid-cols-4 lg:grid-cols-8" // Responsive for 8 columns
            }[columnCount] || "grid-cols-2"; // Default to 2 columns on mobile

            const isCompact = columnCount >= 4; // Use compact mode for 4 or more columns
            const gapClass = isCompact ? "gap-2" : "gap-3 md:gap-4";

            return (
              <section key={section._id}>
                <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">{section.title}</h2>
                <div className={`grid ${gridClass} ${gapClass}`}>
                  {section.products?.filter(Boolean).map(entry => {
                    const product = mapSectionProduct(entry);
                    const unit = (entry as any).unit || (entry as any).pack;

                    return (
                      <div key={product._id} className={`bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col ${isCompact ? 'text-xs' : ''}`}>
                        <div className={`aspect-square bg-gray-50 rounded-lg mb-2 relative overflow-hidden ${isCompact ? 'h-20' : ''}`}>
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                          )}
                        </div>

                        {/* Unit/Size Display - Matches ProductCard style */}
                        {unit && (
                          <p className={`text-neutral-500 mb-1 ${isCompact ? 'text-[10px]' : 'text-xs'}`}>
                            {unit}
                          </p>
                        )}

                        <h3 className={`font-medium text-gray-800 ${isCompact ? 'text-xs' : 'text-sm'} line-clamp-2 leading-tight mb-2 min-h-[2.5em]`}>{product.name}</h3>

                        <div className="flex items-end justify-between mt-auto">
                          <div>
                            <span className={`block font-bold text-gray-900 ${isCompact ? 'text-sm' : 'text-lg'}`}>₹{product.price}</span>
                          </div>

                          {!isBookingClosed && (
                            <div className="flex items-center gap-2 bg-emerald-50 rounded-lg p-1">
                              {getQuantity(product._id) > 0 ? (
                                <>
                                  <button onClick={() => removeFromCart(product._id)} className={`flex items-center justify-center bg-white rounded shadow text-emerald-600 font-bold ${isCompact ? 'w-5 h-5 text-xs' : 'w-6 h-6'}`}>-</button>
                                  <span className={`font-bold text-emerald-800 w-3 text-center ${isCompact ? 'text-xs' : 'text-sm'}`}>{getQuantity(product._id)}</span>
                                  <button onClick={() => addToCart(product)} className={`flex items-center justify-center bg-emerald-600 rounded shadow text-white font-bold ${isCompact ? 'w-5 h-5 text-xs' : 'w-6 h-6'}`}>+</button>
                                </>
                              ) : (
                                <button onClick={() => addToCart(product)} className={`bg-emerald-600 text-white font-bold rounded shadow-sm ${isCompact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs'}`}>ADD</button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {(!section.products || section.products.length === 0) && (
                    <div className="col-span-full text-center text-xs text-gray-400 py-4">
                      No products in this section
                    </div>
                  )}
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
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            {isBookingClosed ? "Booking Closed" : "Place Order for Tomorrow"}
            {!isBookingClosed && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
          </button>
        </div>
      )}
    </div>
  );
}
