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
    image: p.image || p.mainImage || (p.productImages && p.productImages[0]) || "",
    price: p.price,
    originalPrice: p.originalPrice || p.price,
    stock: p.stock || 0,
    maxQuantity: 10,
    unit: p.unit || p.pack
  } as any);

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
          <section className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100">
            <h2 className="text-xs font-black text-emerald-800 mb-4 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
              Select Morning Slot
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {slots.map((slot) => (
                <button
                  key={slot._id}
                  disabled={!slot.available}
                  onClick={() => setSelectedSlot(slot._id)}
                  className={`
                    p-3 rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-300
                    ${selectedSlot === slot._id
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md transform scale-[1.02]"
                      : "border-gray-100 bg-white text-gray-600 hover:border-emerald-200"}
                    ${!slot.available ? "opacity-40 cursor-not-allowed bg-gray-50 border-gray-100" : ""}
                    `}
                >
                  <span className="text-sm font-black">{slot.timeRange}</span>
                  <span className={`text-[10px] mt-1 font-bold ${slot.available ? "text-emerald-500" : "text-gray-400"}`}>
                    {slot.available ? "Available" : "Full"}
                  </span>
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

                <div className={`grid ${gridClass} ${gapClass}`}>
                  {section.products?.filter(Boolean).map(entry => {
                    const product = mapSectionProduct(entry);
                    const qty = getQuantity(product._id);
                    const unit = (product as any).unit;

                    return (
                      <div 
                        key={product._id} 
                        className="bg-white rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full overflow-hidden group"
                      >
                        {/* Image Container */}
                        <div className="aspect-square bg-neutral-50 relative overflow-hidden">
                          {product.image ? (
                            <img 
                              src={product.image} 
                              alt={product.name} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl bg-neutral-100">📦</div>
                          )}
                          
                          {/* Unit Badge */}
                          {unit && (
                            <div className="absolute bottom-2 left-2 z-10">
                              <span className="text-[10px] font-black text-neutral-700 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-md shadow-sm border border-neutral-100">
                                {unit}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-3 flex flex-col flex-1">
                          <h3 className="font-bold text-neutral-800 text-xs md:text-sm line-clamp-2 leading-tight mb-2 min-h-[2.5rem]">
                            {product.name}
                          </h3>

                          <div className="mt-auto flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-sm md:text-base font-black text-neutral-900">₹{product.price}</span>
                              {product.originalPrice > product.price && (
                                <span className="text-[10px] text-neutral-400 line-through">₹{product.originalPrice}</span>
                              )}
                            </div>

                            {!isBookingClosed && (
                              <div className="flex items-center">
                                {qty > 0 ? (
                                  <div className="flex items-center gap-2 bg-emerald-600 rounded-full p-1 shadow-md">
                                    <button 
                                      onClick={() => removeFromCart(product._id)} 
                                      className="w-6 h-6 flex items-center justify-center bg-white/20 text-white hover:bg-white/30 rounded-full transition-colors"
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14" /></svg>
                                    </button>
                                    <span className="text-xs font-black text-white w-4 text-center">{qty}</span>
                                    <button 
                                      onClick={() => addToCart(product)} 
                                      className="w-6 h-6 flex items-center justify-center bg-white text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors shadow-sm"
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => addToCart(product)} 
                                    className="bg-white border-2 border-emerald-500 text-emerald-600 font-black text-[10px] px-4 py-1.5 rounded-full hover:bg-emerald-500 hover:text-white transition-all duration-300 shadow-sm active:scale-95"
                                  >
                                    ADD
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
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
            className={`w-full py-4 rounded-2xl font-black text-sm shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${
              isBookingClosed 
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
    </div>
  );
}
