import { useState, useEffect } from "react";
import {
  getPromoStrips,
  createPromoStrip,
  updatePromoStrip,
  deletePromoStrip,
  type PromoStrip,
  type PromoStripFormData,
  type CategoryCard,
} from "../../../services/api/admin/adminPromoStripService";
import { getCategories, getSubcategories, type Category, type SubCategory } from "../../../services/api/categoryService";
import { getHeaderCategoriesAdmin, type HeaderCategory } from "../../../services/api/headerCategoryService";
import { getProducts as getAdminProducts, type Product } from "../../../services/api/admin/adminProductService";

// --- Icons ---
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path>
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const CameraIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
    <circle cx="12" cy="13" r="4"></circle>
  </svg>
)

export default function AdminPromoStrip() {
  // --- Form state ---
  const [headerCategorySlug, setHeaderCategorySlug] = useState("");
  const [productCategoryId, setProductCategoryId] = useState("");
  const [heading, setHeading] = useState("");
  const [saleText, setSaleText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryCards, setCategoryCards] = useState<CategoryCard[]>([
    { subCategoryId: "", title: "", badge: "", images: [], discountPercentage: 0, order: 0 },
    { subCategoryId: "", title: "", badge: "", images: [], discountPercentage: 0, order: 1 },
    { subCategoryId: "", title: "", badge: "", images: [], discountPercentage: 0, order: 2 },
    { subCategoryId: "", title: "", badge: "", images: [], discountPercentage: 0, order: 3 },
  ]);
  const [featuredProducts, setFeaturedProducts] = useState<string[]>([]);
  const [crazyDealsTitle, setCrazyDealsTitle] = useState("CRAZY DEALS");
  const [isActive, setIsActive] = useState(true);
  const [order, setOrder] = useState(0);

  // --- Data state ---
  const [promoStrips, setPromoStrips] = useState<PromoStrip[]>([]);
  const [headerCategories, setHeaderCategories] = useState<HeaderCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");

  // Persistent map for product names {id: name}
  const [productNames, setProductNames] = useState<Record<string, string>>({});

  // --- UI state ---
  const [loading, setLoading] = useState(false);
  const [loadingPromoStrips, setLoadingPromoStrips] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Pagination
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch initial data
  useEffect(() => {
    fetchPromoStrips();
    fetchHeaderCategories();
    fetchCategories();
  }, []);

  // Fetch subcategories when product category changes
  useEffect(() => {
    if (productCategoryId) {
      fetchSubcategories(productCategoryId);
    } else {
      setSubcategories([]);
    }
  }, [productCategoryId]);

  // Fetch products for Crazy Deals search
  useEffect(() => {
    if (productSearch.length > 2) {
      const timeoutId = setTimeout(() => {
        fetchProducts(productSearch, setProducts);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else if (productSearch.length === 0) {
      fetchProducts("", setProducts);
    }
  }, [productSearch]);

  const fetchPromoStrips = async () => {
    try {
      setLoadingPromoStrips(true);
      const data = await getPromoStrips();
      setPromoStrips(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch PromoStrips");
    } finally {
      setLoadingPromoStrips(false);
    }
  };

  const fetchHeaderCategories = async () => {
    try {
      const data = await getHeaderCategoriesAdmin();
      setHeaderCategories(data);
    } catch (err: any) {
      console.error("Failed to fetch header categories:", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await getCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch categories:", err);
    }
  };

  const fetchSubcategories = async (catId: string) => {
    try {
      const response = await getSubcategories(catId);
      if (response.success && response.data) {
        setSubcategories(response.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch subcategories:", err);
    }
  };

  const fetchProducts = async (search: string, setter: (products: Product[]) => void) => {
    try {
      const response = await getAdminProducts({ search, limit: 10 });
      if (response.success && response.data) {
        const fetchedProducts = Array.isArray(response.data) ? response.data : [];
        setter(fetchedProducts);

        // Update name map
        const newNames = { ...productNames };
        fetchedProducts.forEach(p => {
          newNames[p._id] = p.productName;
        });
        setProductNames(newNames);
      }
    } catch (err: any) {
      console.error("Failed to fetch products:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!headerCategorySlug || !heading || !saleText || !startDate || !endDate) {
      setError("Please fill in all required fields");
      return;
    }

    // Validate 4 cards
    const validCards = categoryCards.filter(c => c.subCategoryId);
    if (validCards.length !== 4) {
      setError("Please select exactly 4 subcategories for the shortcut boxes");
      return;
    }

    // Validate 4 featured products
    if (featuredProducts.length < 4) {
      setError("Please select at least 4 products for the Crazy Deals section");
      return;
    }

    const formData: PromoStripFormData = {
      headerCategorySlug,
      productCategoryId,
      heading,
      saleText,
      startDate,
      endDate,
      categoryCards: validCards,
      featuredProducts,
      crazyDealsTitle,
      isActive,
      order,
    };

    try {
      setLoading(true);
      if (editingId) {
        await updatePromoStrip(editingId, formData);
        setSuccess("Campaign updated successfully!");
      } else {
        await createPromoStrip(formData);
        setSuccess("Campaign launched successfully!");
      }
      resetForm();
      fetchPromoStrips();
    } catch (err: any) {
      setError(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (strip: PromoStrip) => {
    setHeaderCategorySlug(strip.headerCategorySlug);
    setProductCategoryId(typeof strip.productCategoryId === 'string' ? strip.productCategoryId : (strip.productCategoryId as any)?._id || "");
    setHeading(strip.heading);
    setSaleText(strip.saleText);
    setStartDate(strip.startDate.split("T")[0]);
    setEndDate(strip.endDate.split("T")[0]);

    // Process cards
    const cards = strip.categoryCards.map(c => ({
      subCategoryId: typeof c.subCategoryId === 'string' ? c.subCategoryId : (c.subCategoryId as any)?._id || "",
      title: c.title,
      badge: c.badge,
      images: Array.isArray(c.images) ? c.images : (c.imageUrl ? [c.imageUrl] : []),
      discountPercentage: c.discountPercentage,
      order: c.order,
      _id: c._id
    }));

    while (cards.length < 4) {
      cards.push({ subCategoryId: "", title: "", badge: "", images: [], discountPercentage: 0, order: cards.length });
    }
    setCategoryCards(cards.slice(0, 4));

    setFeaturedProducts(strip.featuredProducts.map(p => {
      const id = typeof p === 'string' ? p : (p as any)?._id || p;
      const name = typeof p === 'object' ? (p as any).productName : "";
      if (name) setProductNames(prev => ({ ...prev, [id]: name }));
      return id;
    }));
    setCrazyDealsTitle(strip.crazyDealsTitle || "CRAZY DEALS");
    setIsActive(strip.isActive);
    setOrder(strip.order);
    setEditingId(strip._id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this campaign?")) {
      try {
        await deletePromoStrip(id);
        setSuccess("Deleted successfully");
        fetchPromoStrips();
      } catch (err: any) {
        setError("Delete failed");
      }
    }
  };

  const resetForm = () => {
    setHeaderCategorySlug("");
    setProductCategoryId("");
    setHeading("");
    setSaleText("");
    setStartDate("");
    setEndDate("");
    setCategoryCards([
      { subCategoryId: "", title: "", badge: "", images: [], discountPercentage: 0, order: 0 },
      { subCategoryId: "", title: "", badge: "", images: [], discountPercentage: 0, order: 1 },
      { subCategoryId: "", title: "", badge: "", images: [], discountPercentage: 0, order: 2 },
      { subCategoryId: "", title: "", badge: "", images: [], discountPercentage: 0, order: 3 },
    ]);
    setFeaturedProducts([]);
    setCrazyDealsTitle("CRAZY DEALS");
    setIsActive(true);
    setOrder(0);
    setEditingId(null);
  };

  const updateCardField = async (index: number, field: keyof CategoryCard, value: any) => {
    const updated = [...categoryCards];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-fill images and title if subcategory is selected
    if (field === "subCategoryId" && value) {
      const selectedSub = subcategories.find(s => s._id === value);
      if (selectedSub) {
        updated[index].title = selectedSub.name || selectedSub.subcategoryName || "";

        // Fetch 4 product images from this subcategory
        try {
          const response = await getAdminProducts({ subcategory: value, limit: 4 });
          if (response.success && response.data) {
            const products = Array.isArray(response.data) ? response.data : [];
            const images = products
              .map(p => p.mainImage)
              .filter(img => !!img) as string[];
            updated[index].images = images;
          }
        } catch (err) {
          console.error("Failed to fetch subcategory product images:", err);
        }
      }
    }

    setCategoryCards(updated);
  };

  // Pagination logic
  const totalPages = Math.ceil(promoStrips.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const displayedStrips = promoStrips.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header Section */}
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Promo Strips</h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">Marketing Hub</p>
          </div>
          <div className="text-xs font-bold text-slate-400">
            ADMIN <span className="mx-2">/</span> PROMO STRIPS
          </div>
        </div>

        {/* Alerts */}
        {(success || error) && (
          <div className={`mb-6 p-4 rounded-xl border text-sm font-bold flex items-center gap-3 ${success ? "bg-teal-50 border-teal-200 text-teal-700" : "bg-rose-50 border-rose-200 text-rose-700"
            }`}>
            <div className={`w-2 h-2 rounded-full ${success ? "bg-teal-500" : "bg-rose-500"}`}></div>
            {success || error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT: Management Form */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 sticky top-6">
              <h2 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
                  <PlusIcon />
                </div>
                {editingId ? "Edit Campaign" : "New Campaign"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">1. Header Placement</label>
                    <select
                      value={headerCategorySlug}
                      onChange={(e) => setHeaderCategorySlug(e.target.value)}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-teal-500/10 outline-none transition-all"
                      required
                    >
                      <option value="">Choose placement...</option>
                      <option value="all">Home Main</option>
                      {headerCategories.map(hc => (
                        <option key={hc._id} value={hc.slug}>{hc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Badge Text (e.g. LIVE)</label>
                    <input
                      value={saleText}
                      onChange={(e) => setSaleText(e.target.value)}
                      placeholder="e.g. LIVE"
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm"
                      required
                    />
                  </div>
                </div>

                {/* 2. Heading & Basis */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">2. Campaign Heading</label>
                    <input
                      value={heading}
                      onChange={(e) => setHeading(e.target.value)}
                      placeholder="e.g. SUMMER SALE"
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">3. Product Category</label>
                    <select
                      value={productCategoryId}
                      onChange={(e) => setProductCategoryId(e.target.value)}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm"
                      required
                    >
                      <option value="">Link Category...</option>
                      {categories.map(c => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Starts On</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Ends On</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm"
                      required
                    />
                  </div>
                </div>

                {/* 4. Shortcut Subcategories (Boxes) */}
                <div className="space-y-4 pt-4 border-t border-slate-50">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase">4. Shortcut Boxes (Exactly 4)</label>
                  <div className="grid grid-cols-2 gap-4">
                    {categoryCards.map((card, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative group">
                        <span className="absolute -top-2 -left-2 w-6 h-6 bg-slate-800 text-white rounded-lg flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>

                        <div className="space-y-3">
                          <select
                            value={card.subCategoryId}
                            onChange={(e) => updateCardField(idx, "subCategoryId", e.target.value)}
                            className="w-full bg-white border border-slate-100 py-1.5 px-3 rounded-xl text-xs font-bold"
                          >
                            <option value="">Select Subcat</option>
                            {subcategories.map(s => <option key={s._id} value={s._id}>{s.name || s.subcategoryName}</option>)}
                          </select>

                          <div className="grid grid-cols-2 gap-2">
                            <input
                              placeholder="Card Title"
                              value={card.title}
                              onChange={(e) => updateCardField(idx, "title", e.target.value)}
                              className="bg-white border border-slate-100 p-2 rounded-xl text-[9px] font-bold"
                            />
                            <input
                              placeholder="Card Badge"
                              value={card.badge}
                              onChange={(e) => updateCardField(idx, "badge", e.target.value)}
                              className="bg-white border border-slate-100 p-2 rounded-xl text-[9px] font-bold"
                            />
                          </div>

                          {card.images && card.images.length > 0 && (
                            <div className="mt-2 space-y-2">
                              <div className="grid grid-cols-2 gap-1.5 p-2 bg-white rounded-xl border border-slate-100">
                                {card.images.map((img, i) => (
                                  <div key={i} className="relative aspect-square group/img">
                                    <img src={img} className="w-full h-full rounded-md object-cover border border-slate-50" />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newImgs = card.images.filter((_, index) => index !== i);
                                        updateCardField(idx, "images", newImgs);
                                      }}
                                      className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center scale-0 group-hover/img:scale-100 transition-transform text-[8px] font-bold"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                                {/* Fill empty slots */}
                                {[...Array(Math.max(0, 4 - card.images.length))].map((_, i) => (
                                  <div key={`empty-${i}`} className="aspect-square bg-slate-50 rounded-md border border-dashed border-slate-200 flex items-center justify-center">
                                    <span className="text-[8px] font-bold text-slate-300">Slot {card.images.length + i + 1}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center justify-between px-1">
                                <span className="text-[8px] font-bold text-teal-600 uppercase tracking-wider">{card.images.length}/4 IMAGES SET</span>
                                <button
                                  type="button"
                                  onClick={() => updateCardField(idx, "images", [])}
                                  className="text-[8px] font-bold text-rose-400 hover:text-rose-600 uppercase"
                                >
                                  Clear All
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <input
                              placeholder="Title"
                              value={card.title}
                              onChange={(e) => updateCardField(idx, "title", e.target.value)}
                              className="bg-white border border-slate-100 p-2 rounded-xl text-[9px] font-bold"
                            />
                            <input
                              placeholder="Badge"
                              value={card.badge}
                              onChange={(e) => updateCardField(idx, "badge", e.target.value)}
                              className="bg-white border border-slate-100 p-2 rounded-xl text-[9px] font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Crazy Deals */}
                <div className="space-y-4 pt-4 border-t border-slate-50">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">5. Crazy Deals (Min 4)</label>
                    <span className="text-[9px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded uppercase">{featuredProducts.length} added</span>
                  </div>

                  <div className="relative">
                    <input
                      placeholder="Add products to deals..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm"
                    />
                    {productSearch.length > 0 && products.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-2 bg-white shadow-2xl border border-slate-100 rounded-3xl z-20 overflow-hidden">
                        <div className="max-h-60 overflow-y-auto">
                          {products.map(p => {
                            const isAdded = featuredProducts.includes(p._id);
                            return (
                              <div
                                key={p._id}
                                onClick={() => {
                                  if (!isAdded) {
                                    setFeaturedProducts([...featuredProducts, p._id]);
                                  } else {
                                    setFeaturedProducts(featuredProducts.filter(id => id !== p._id));
                                  }
                                }}
                                className={`px-6 py-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between border-b border-slate-50 transition-colors ${isAdded ? "bg-teal-50/30" : ""}`}
                              >
                                <div className="flex items-center gap-3">
                                  {p.mainImage && <img src={p.mainImage} className="w-8 h-8 rounded-lg object-cover" />}
                                  <span className={`text-xs font-bold ${isAdded ? "text-teal-700" : "text-slate-800"}`}>{p.productName}</span>
                                </div>
                                {isAdded ? (
                                  <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center text-white text-[10px] shadow-sm">✓</div>
                                ) : (
                                  <PlusIcon />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-center">
                          <button
                            type="button"
                            onClick={() => setProductSearch("")}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-900 uppercase tracking-widest"
                          >
                            Done Selecting
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {featuredProducts.map(id => (
                      <div key={id} className="bg-teal-50 text-teal-700 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-teal-100 flex items-center gap-2">
                        <span>{productNames[id] || 'Product'}</span>
                        <button type="button" onClick={() => setFeaturedProducts(featuredProducts.filter(x => x !== id))} className="hover:text-rose-500">×</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-slate-900 text-white py-4 rounded-3xl font-black text-sm hover:scale-[1.02] transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
                  >
                    {loading ? "SAVING..." : (editingId ? "UPDATE CAMPAIGN" : "LAUNCH CAMPAIGN")}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-4 border border-slate-200 rounded-3xl font-black text-sm text-slate-500 hover:bg-slate-50"
                    >
                      CANCEL
                    </button>
                  )}
                </div>

              </form>
            </div>
          </div>

          {/* RIGHT: Campaigns List */}
          <div className="lg:col-span-7 space-y-6">

            {/* List Header */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Live Campaigns</h3>
                <p className="text-[10px] font-bold text-teal-600 uppercase">{promoStrips.length} TOTAL</p>
              </div>
              <div className="flex bg-slate-50 p-1.5 rounded-[1.2rem] gap-1">
                {[10, 20, 50].map(v => (
                  <button
                    key={v}
                    onClick={() => { setRowsPerPage(v); setCurrentPage(1); }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all ${rowsPerPage === v ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-900"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* List Content */}
            {loadingPromoStrips ? (
              <div className="bg-white p-20 rounded-3xl text-center border border-slate-100 flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-slate-50 border-t-teal-500 rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Crunching data...</p>
              </div>
            ) : displayedStrips.length === 0 ? (
              <div className="bg-white p-20 rounded-3xl text-center border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold">No active campaigns found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {displayedStrips.map(strip => (
                  <div key={strip._id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:border-teal-200 transition-all group overflow-hidden relative">
                    {/* Status */}
                    <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-[1.5rem] text-[10px] font-bold uppercase ${strip.isActive ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-400"
                      }`}>
                      {strip.isActive ? "ACTIVE" : "INACTIVE"}
                    </div>

                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">
                          {strip.headerCategorySlug === 'all' ? "HOME MAIN" : `${strip.headerCategorySlug} PLACEMENT`}
                        </span>
                        <h3 className="text-xl font-bold text-slate-800 leading-tight">{strip.heading}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-3 py-1 rounded-full">{strip.saleText}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-[10px] font-bold text-slate-400">PRIORITY: {strip.order}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(strip)} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-teal-50 hover:text-teal-600 rounded-2xl transition-all">
                          <EditIcon />
                        </button>
                        <button onClick={() => handleDelete(strip._id)} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 rounded-2xl transition-all">
                          <TrashIcon />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pb-8 border-b border-slate-50 mb-6">
                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-50">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Shortcut Boxes</p>
                        <p className="text-sm font-bold text-slate-700">{strip.categoryCards.length} SUB-CATS</p>
                      </div>
                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-50">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Featured Deals</p>
                        <p className="text-sm font-bold text-slate-700">{strip.featuredProducts.length} PRODUCTS</p>
                      </div>
                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-50">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Duration</p>
                        <p className="text-sm font-bold text-slate-700">{new Date(strip.endDate).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 group-hover:gap-3 cursor-pointer transition-all" onClick={() => handleEdit(strip)}>
                        <span className="text-[10px] font-bold text-teal-600 uppercase">Edit Campaign Details</span>
                        <div className="w-6 h-6 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                          <EditIcon />
                        </div>
                      </div>
                      {typeof strip.productCategoryId === 'object' && (strip.productCategoryId as any)?.name && (
                        <div className="bg-slate-900 text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase">
                          {(strip.productCategoryId as any).name}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white px-8 py-4 rounded-[2rem] border border-slate-200 shadow-sm mt-8">
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Showing {startIndex + 1} - {Math.min(startIndex + rowsPerPage, promoStrips.length)} of {promoStrips.length}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-12 h-12 flex items-center justify-center border border-slate-200 rounded-[1.2rem] text-slate-400 hover:bg-slate-50 disabled:opacity-20 transition-all font-bold"
                  >
                    ←
                  </button>
                  <div className="flex items-center px-6 bg-slate-900 text-white rounded-[1.2rem] text-xs font-bold shadow-lg">
                    {currentPage} / {totalPages}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-12 h-12 flex items-center justify-center border border-slate-200 rounded-[1.2rem] text-slate-400 hover:bg-slate-50 disabled:opacity-20 transition-all font-bold"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
