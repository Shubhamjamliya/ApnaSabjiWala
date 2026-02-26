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

// --- Compact Preview Component for List Items ---
const CompactPromoPreview = ({ strip }: { strip: PromoStrip }) => {
  return (
    <div className="mt-4 mb-6 rounded-xl overflow-hidden border border-neutral-100 bg-neutral-50 shadow-inner">
      <div
        className="p-4 relative min-h-[160px]"
        style={{
          background: `linear-gradient(to bottom, #dcfce7, #f0fdf4, #ffffff)`
        }}
      >
        <div className="flex gap-4">
          {/* Left: Deals Preview */}
          <div className="w-28 bg-green-600/10 rounded-lg p-2 flex flex-col items-center justify-between border border-green-200">
            <div className="text-center">
              <p className="text-green-800 font-black text-[10px] leading-tight uppercase">
                {(strip.crazyDealsTitle || "CRAZY DEALS").split(' ').map((w, i) => <div key={i}>{w}</div>)}
              </p>
            </div>
            <div className="my-1.5 text-center">
              <div className="bg-neutral-800 text-white text-[7px] px-1 rounded line-through">₹999</div>
              <div className="bg-green-500 text-white text-[10px] font-bold px-1.5 rounded -mt-0.5 shadow-sm">₹499</div>
            </div>
            <div className="w-full aspect-square bg-white/60 rounded-md flex items-center justify-center text-[24px] shadow-sm">
              📦
            </div>
          </div>

          {/* Right: Text & Shortcut Grid */}
          <div className="flex-1 flex flex-col">
            <div className="mb-3">
              <h4
                className="text-lg font-black text-white leading-none mb-1"
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  textShadow: `-1.5px -1.5px 0 #16a34a, 1.5px -1.5px 0 #16a34a, -1.5px 1.5px 0 #16a34a, 1.5px 1.5px 0 #16a34a`
                }}
              >
                {strip.heading}
              </h4>
              <p
                className="text-[10px] font-black text-white uppercase"
                style={{
                  fontFamily: '"Poppins", sans-serif',
                  textShadow: `-1px -1px 0 #16a34a, 1px -1px 0 #16a34a, -1px 1px 0 #16a34a, 1px 1px 0 #16a34a`
                }}
              >
                {strip.saleText}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {strip.categoryCards.slice(0, 4).map((card, idx) => (
                <div key={idx} className="bg-white rounded-lg p-1.5 shadow-sm border border-neutral-100 flex flex-col items-center justify-center aspect-square overflow-hidden">
                  <div className="grid grid-cols-2 gap-1 w-full mb-1">
                    {(card.images?.length ? card.images.slice(0, 4) : [null, null, null, null]).map((img, i) => (
                      <div key={i} className="aspect-square bg-neutral-50 rounded-sm flex items-center justify-center overflow-hidden">
                        {img ? <img src={img} className="w-full h-full object-cover" /> : <span className="text-[6px]">📦</span>}
                      </div>
                    ))}
                  </div>
                  <span className="text-[6px] font-bold text-neutral-800 truncate w-full text-center">
                    {card.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AdminPromoStrip() {
  // --- Form state ---
  const [headerCategorySlug, setHeaderCategorySlug] = useState("");
  const [productCategoryId, setProductCategoryId] = useState("");
  const [heading, setHeading] = useState("");
  const [saleText, setSaleText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryCards, setCategoryCards] = useState<CategoryCard[]>([
    { subCategoryId: "", productId: "", title: "", badge: "", images: [], discountPercentage: 0, order: 0, _id: undefined },
    { subCategoryId: "", productId: "", title: "", badge: "", images: [], discountPercentage: 0, order: 1, _id: undefined },
    { subCategoryId: "", productId: "", title: "", badge: "", images: [], discountPercentage: 0, order: 2, _id: undefined },
    { subCategoryId: "", productId: "", title: "", badge: "", images: [], discountPercentage: 0, order: 3, _id: undefined },
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
  const [cardProducts, setCardProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productSubCategoryId, setProductSubCategoryId] = useState("");
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [subcategoryProducts, setSubcategoryProducts] = useState<Product[]>([]);
  const [cardSearchIndex, setCardSearchIndex] = useState<number | null>(null);
  const [cardSearchQuery, setCardSearchQuery] = useState("");
  const [cardProductFilters, setCardProductFilters] = useState<string[]>(["", "", "", ""]); // Search query for each card
  const [listSearchQuery, setListSearchQuery] = useState(""); // Search for the promo strips list

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
      fetchCategoryProducts(productCategoryId);
      setProductSubCategoryId(""); // Reset subcat filter when main cat changes
    } else {
      setSubcategories([]);
      setCategoryProducts([]);
      setSubcategoryProducts([]);
      setProductSubCategoryId("");
    }
  }, [productCategoryId]);

  // Fetch subcategory products when subcat changes
  useEffect(() => {
    if (productSubCategoryId) {
      fetchSubcategoryProducts(productSubCategoryId);
    } else {
      setSubcategoryProducts([]);
    }
  }, [productSubCategoryId]);

  // Fetch products for Crazy Deals search
  useEffect(() => {
    if (productSearch.length > 2) {
      const timeoutId = setTimeout(() => {
        fetchProducts(productSearch, setProducts);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [productSearch]);

  // Fetch products for card shortcuts search
  useEffect(() => {
    if (cardSearchQuery.length > 2) {
      const timeoutId = setTimeout(() => {
        fetchProducts(cardSearchQuery, setCardProducts);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setCardProducts([]);
    }
  }, [cardSearchQuery]);

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
      // Auto-select HOME header if exists
      const homeHeader = data.find(h => h.name?.toUpperCase() === "HOME");
      if (homeHeader && !editingId && !headerCategorySlug) {
        setHeaderCategorySlug(homeHeader.slug);
      }
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

  const fetchCategoryProducts = async (catId: string) => {
    try {
      const response = await getAdminProducts({ category: catId, limit: 100 });
      if (response.success && response.data) {
        const fetchedProducts = Array.isArray(response.data) ? response.data : [];
        setCategoryProducts(fetchedProducts);

        // Update name map
        const newNames = { ...productNames };
        fetchedProducts.forEach(p => {
          newNames[p._id] = p.productName;
        });
        setProductNames(newNames);
      }
    } catch (err: any) {
      console.error("Failed to fetch category products:", err);
    }
  };

  const fetchSubcategoryProducts = async (subId: string) => {
    try {
      const response = await getAdminProducts({ subcategory: subId, limit: 100 });
      if (response.success && response.data) {
        const fetchedProducts = Array.isArray(response.data) ? response.data : [];
        setSubcategoryProducts(fetchedProducts);

        // Update name map
        const newNames = { ...productNames };
        fetchedProducts.forEach(p => {
          newNames[p._id] = p.productName;
        });
        setProductNames(newNames);
      }
    } catch (err: any) {
      console.error("Failed to fetch subcategory products:", err);
    }
  };

  const fetchProducts = async (search: string, setter: (products: Product[]) => void) => {
    try {
      const params: any = { search, limit: 20 };
      if (productCategoryId) params.category = productCategoryId;
      if (productSubCategoryId) params.subcategory = productSubCategoryId;

      const response = await getAdminProducts(params);
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

    // Validate cards: a card is valid if it has a link OR images
    const validCards = categoryCards.filter(c => c.subCategoryId || c.productId || (c.images && c.images.length > 0));
    
    if (validCards.length === 0) {
      setError("Please add at least one box (link or images) to the shortcut section");
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
      categoryCards: validCards.map(c => ({
        ...c,
        title: c.title || "Limited Offer", // Backend requires title
        badge: c.badge || "OFFERS", // Backend requires badge
        discountPercentage: c.discountPercentage || 0
      })),
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
    const cards = strip.categoryCards.map(c => {
      const subId = typeof c.subCategoryId === 'string' ? c.subCategoryId : (c.subCategoryId as any)?._id || "";
      const prodId = typeof c.productId === 'string' ? c.productId : (c.productId as any)?._id || "";

      if (prodId && typeof c.productId === 'object') {
        const p = c.productId as any;
        setProductNames(prev => ({ ...prev, [p._id]: p.productName }));
      }

      return {
        subCategoryId: subId,
        productId: prodId,
        title: c.title,
        badge: c.badge,
        images: Array.isArray(c.images) ? c.images : ((c as any).imageUrl ? [(c as any).imageUrl] : []),
        discountPercentage: c.discountPercentage,
        order: c.order,
        _id: c._id
      };
    });

    while (cards.length < 4) {
      cards.push({ subCategoryId: "", productId: "", title: "", badge: "", images: [], discountPercentage: 0, order: cards.length, _id: undefined });
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

  const handleDelete = async (id: string, slug: string) => {
    if (slug === 'all') {
      alert("The HOME campaign is a system default and cannot be deleted. You can only Edit or Deactivate it.");
      return;
    }
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
      { subCategoryId: "", productId: "", title: "", badge: "", images: [], discountPercentage: 0, order: 0, _id: undefined },
      { subCategoryId: "", productId: "", title: "", badge: "", images: [], discountPercentage: 0, order: 1, _id: undefined },
      { subCategoryId: "", productId: "", title: "", badge: "", images: [], discountPercentage: 0, order: 2, _id: undefined },
      { subCategoryId: "", productId: "", title: "", badge: "", images: [], discountPercentage: 0, order: 3, _id: undefined },
    ]);
    setFeaturedProducts([]);
    setCrazyDealsTitle("CRAZY DEALS");
    setIsActive(true);
    setOrder(0);
    setProductSubCategoryId("");
    setSubcategoryProducts([]);
    setProductSubCategoryId("");
    setSubcategoryProducts([]);
    setCardProductFilters(["", "", "", ""]);
    setEditingId(null);
  };

  const updateCardField = async (index: number, field: keyof CategoryCard, value: any) => {
    const updated = [...categoryCards];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-fill images and title if subcategory is selected
    if (field === "subCategoryId" && value) {
      updated[index].productId = ""; // Clear product if subcat selected
      const selectedSub = subcategories.find(s => s._id === value);
      if (selectedSub) {
        updated[index].title = selectedSub.subcategoryName || "";
        updated[index].badge = "FLAT 50% OFF"; 

        try {
          const response = await getAdminProducts({ subcategory: value, limit: 4 });
          if (response.success && response.data) {
            const products = Array.isArray(response.data) ? response.data : [];
            const images = products
              .map(p => typeof p.mainImage === 'string' ? p.mainImage : (p.mainImage as any)?.url)
              .filter(img => !!img) as string[];
            updated[index].images = images;
          }
        } catch (err) {
          console.error("Failed to fetch subcategory images:", err);
        }
      }
    }

    // Auto-fill if product is selected
    if (field === "productId" && value) {
      updated[index].subCategoryId = ""; // Clear subcat
      const selectedProd = categoryProducts.find(p => p._id === value) || cardProducts.find(p => p._id === value);
      if (selectedProd) {
        updated[index].title = selectedProd.productName || "";
        updated[index].badge = "BEST DEAL";
        
        const mainImg = typeof selectedProd.mainImage === 'string' ? selectedProd.mainImage : (selectedProd.mainImage as any)?.url;
        const galleryImgs = (selectedProd.galleryImages || []).map(img => typeof img === 'string' ? img : (img as any)?.url).filter(Boolean);
        const allImgs = [mainImg, ...galleryImgs].filter(Boolean).slice(0, 4);
        updated[index].images = allImgs;
      }
    }

    setCategoryCards(updated);
  };

  const toggleProductImage = (cardIdx: number, p: Product) => {
    const card = categoryCards[cardIdx];
    const img = typeof p.mainImage === 'string' ? p.mainImage : (p.mainImage as any)?.url;
    if (!img) return;

    let newImgs = [...card.images];
    const exists = newImgs.includes(img);

    if (exists) {
      newImgs = newImgs.filter(i => i !== img);
    } else if (newImgs.length < 4) {
      newImgs.push(img);
    } else {
      // If 4 already, replace the last one or just do nothing
      return;
    }

    updateCardField(cardIdx, "images", newImgs);
    
    // Auto-link to the first product if destination is empty
    if (!card.subCategoryId && !card.productId && newImgs.length === 1 && !exists) {
      updateCardField(cardIdx, "productId", p._id);
    }
  };

  // Pagination logic
  const filteredStrips = promoStrips.filter(s => 
    s.heading.toLowerCase().includes(listSearchQuery.toLowerCase()) ||
    s.headerCategorySlug.toLowerCase().includes(listSearchQuery.toLowerCase())
  );
  const totalPages = Math.ceil(filteredStrips.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const displayedStrips = filteredStrips.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 uppercase-none">
      {/* Header Section */}
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-800">Promo Strips</h1>
            <p className="text-[10px] text-neutral-400 font-medium uppercase mt-1">Marketing Hub</p>
          </div>
          <div className="text-xs font-bold text-neutral-400">
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
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 sticky top-6">
              <h2 className="text-xl font-bold text-neutral-800 mb-6 flex items-center gap-3">
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
                      className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-semibold text-sm focus:ring-2 focus:ring-teal-500/10 outline-none transition-all"
                      required
                    >
                      <option value="">Choose placement...</option>
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
                      className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-semibold text-sm"
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
                      className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-semibold text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">3. Product Category</label>
                    <select
                      value={productCategoryId}
                      onChange={(e) => setProductCategoryId(e.target.value)}
                      className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-semibold text-sm"
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
                      className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-semibold text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Ends On</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-semibold text-sm"
                      required
                    />
                  </div>
                </div>

                {/* 4. Shortcut Subcategories (Boxes) */}
                <div className="space-y-4 pt-4 border-t border-slate-50">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">4. Shortcut Boxes (Up to 4)</label>
                    <span className="text-[9px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded">MULTI-SELECT ACTIVE</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {categoryCards.map((card, idx) => (
                      <div key={idx} className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 relative group transition-all hover:border-teal-200 hover:shadow-md">
                        <span className="absolute -top-2 -left-2 w-7 h-7 bg-slate-900 text-white rounded-xl flex items-center justify-center text-[10px] font-black shadow-lg z-10">{idx + 1}</span>

                        <div className="space-y-3">
                          {/* Destination Selection */}
                          <div className="space-y-2">
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Link Destination</p>
                             <div className="grid grid-cols-1 gap-2">
                               {subcategories.length > 0 && (
                                 <select
                                   value={typeof card.subCategoryId === 'string' ? card.subCategoryId : (card.subCategoryId as any)?._id || ""}
                                   onChange={(e) => updateCardField(idx, "subCategoryId", e.target.value)}
                                   className="w-full bg-white border border-neutral-200 py-2 px-3 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-teal-500/10"
                                 >
                                   <option value="">Subcategory Link...</option>
                                   {subcategories.map(s => <option key={s._id} value={s._id}>{s.name || s.subcategoryName}</option>)}
                                 </select>
                               )}

                               <select
                                 value={typeof card.productId === 'string' ? card.productId : (card.productId as any)?._id || ""}
                                 onChange={(e) => updateCardField(idx, "productId", e.target.value)}
                                 className="w-full bg-white border border-neutral-200 py-2 px-3 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-teal-500/10"
                               >
                                 <option value="">Specific Product Link...</option>
                                 {categoryProducts.map(p => (
                                   <option key={p._id} value={p._id}>{p.productName}</option>
                                 ))}
                               </select>
                             </div>
                          </div>

                          {/* Image Multi-Selector */}
                          {categoryProducts.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                               <div className="flex items-center justify-between">
                                  <p className="text-[8px] font-black text-teal-600 uppercase tracking-widest pl-1">Choose 4 Images</p>
                                  <input 
                                    placeholder="Filter products..."
                                    value={cardProductFilters[idx]}
                                    onChange={(e) => {
                                      const next = [...cardProductFilters];
                                      next[idx] = e.target.value;
                                      setCardProductFilters(next);
                                    }}
                                    className="text-[7px] font-black bg-white border border-slate-100 rounded-lg px-2 py-1 outline-none focus:border-teal-300 w-24 shadow-sm"
                                  />
                               </div>
                               <div className="grid grid-cols-4 gap-1 p-1 bg-white/50 rounded-xl border border-slate-100 max-h-28 overflow-y-auto custom-scrollbar">
                                  {categoryProducts
                                    .filter(p => p.productName.toLowerCase().includes(cardProductFilters[idx].toLowerCase()))
                                    .map(p => {
                                      const img = typeof p.mainImage === 'string' ? p.mainImage : (p.mainImage as any)?.url;
                                      const isSelected = card.images.includes(img);
                                      return (
                                        <button
                                          key={p._id}
                                          type="button"
                                          onClick={() => toggleProductImage(idx, p)}
                                          title={p.productName}
                                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                            isSelected ? 'border-teal-500 ring-2 ring-teal-500/20 z-10 scale-95' : 'border-transparent opacity-50 hover:opacity-100'
                                          }`}
                                        >
                                          {img ? (
                                            <img src={img} className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full bg-slate-200 flex items-center justify-center text-[8px]">📦</div>
                                          )}
                                          {isSelected && (
                                             <div className="absolute inset-x-0 bottom-0 bg-teal-500 h-1.5" />
                                          )}
                                        </button>
                                      );
                                    })}
                               </div>
                            </div>
                          )}

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

                          <div className="mt-2">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Discount Percentage</label>
                            <input
                              type="number"
                              placeholder="0"
                              value={card.discountPercentage || 0}
                              onChange={(e) => updateCardField(idx, "discountPercentage", Number(e.target.value))}
                              className="w-full bg-white border border-slate-100 p-2 rounded-xl text-[9px] font-bold mt-1"
                              min="0"
                              max="100"
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
                                  <div key={`empty-${idx}-${i}`} className="aspect-square bg-slate-50 rounded-md border border-dashed border-slate-200 flex items-center justify-center">
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

                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                 {/* 5. Crazy Deals */}
                <div className="space-y-4 pt-4 border-t border-slate-50">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">5. Crazy Deals (Min 4)</label>
                    <div className="flex items-center gap-2">
                       {featuredProducts.length > 0 && (
                        <button 
                          type="button" 
                          onClick={() => setFeaturedProducts([])}
                          className="text-[9px] font-bold text-rose-500 hover:text-rose-600 uppercase"
                        >
                          Clear All
                        </button>
                      )}
                      <span className="text-[9px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded uppercase">{featuredProducts.length} added</span>
                    </div>
                  </div>

                  {/* Filter & Search Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      value={productSubCategoryId}
                      onChange={(e) => setProductSubCategoryId(e.target.value)}
                      disabled={!productCategoryId || subcategories.length === 0}
                      className="px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-bold text-xs disabled:opacity-50"
                    >
                      <option value="">All Subcategories</option>
                      {subcategories.map(s => (
                        <option key={s._id} value={s._id}>{s.name || s.subcategoryName}</option>
                      ))}
                    </select>

                    <input
                      placeholder="Search more products..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg font-bold text-xs"
                    />
                  </div>

                  {/* Quick Pick from Category/Subcategory */}
                  {categoryProducts.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-bold text-neutral-400 uppercase">
                        {productSubCategoryId ? "Products from Subcategory" : "All Products from Category"}
                      </p>
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-neutral-50 rounded-xl border border-neutral-100">
                        {(productSubCategoryId ? subcategoryProducts : categoryProducts).map(p => {
                          const isAdded = featuredProducts.includes(p._id);
                          return (
                            <button
                              key={p._id}
                              type="button"
                              onClick={() => {
                                if (!isAdded) {
                                  setFeaturedProducts([...featuredProducts, p._id]);
                                } else {
                                  setFeaturedProducts(featuredProducts.filter(id => id !== p._id));
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                                isAdded 
                                  ? "bg-teal-600 text-white border-teal-600 shadow-sm" 
                                  : "bg-white text-neutral-600 border-neutral-200 hover:border-teal-500 hover:text-teal-600"
                              }`}
                            >
                              {isAdded ? "✓ " : "+ "}{p.productName}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="relative">
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
                                  {p.mainImage && (
                                    <img
                                      src={typeof p.mainImage === 'string' ? p.mainImage : (p.mainImage as any)?.url}
                                      className="w-8 h-8 rounded-lg object-cover"
                                    />
                                  )}
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
                    className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-teal-700 transition-all shadow-md disabled:opacity-50"
                  >
                    {loading ? "SAVING..." : (editingId ? "UPDATE CAMPAIGN" : "LAUNCH CAMPAIGN")}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-3 border border-neutral-200 rounded-lg font-semibold text-sm text-neutral-500 hover:bg-neutral-50"
                    >
                      CANCEL
                    </button>
                  )}
                </div>

              </form>
            </div>
          </div>

          {/* RIGHT: Preview & Campaigns List */}
          <div className="lg:col-span-7 space-y-8">


            {/* List Header */}
            <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-neutral-800">Live Campaigns</h3>
                <p className="text-[10px] font-bold text-teal-600 uppercase">{promoStrips.length} TOTAL</p>
              </div>
              <div className="flex bg-neutral-50 p-1 rounded-lg gap-1">
                {[10, 20, 50].map(v => (
                  <button
                    key={v}
                    onClick={() => { setRowsPerPage(v); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${rowsPerPage === v ? "bg-neutral-800 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-800"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* List Content */}
            {loadingPromoStrips ? (
              <div className="bg-white p-20 rounded-lg text-center border border-neutral-100 flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-neutral-50 border-t-teal-500 rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Crunching data...</p>
              </div>
            ) : displayedStrips.length === 0 ? (
              <div className="bg-white p-20 rounded-lg text-center border-2 border-dashed border-neutral-200">
                <p className="text-neutral-400 font-bold">No active campaigns found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {displayedStrips.map(strip => (
                  <div key={strip._id} className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm hover:border-teal-200 transition-all group overflow-hidden relative">
                    {/* Status */}
                    <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-lg text-[10px] font-bold uppercase ${strip.isActive ? "bg-teal-500 text-white" : "bg-neutral-100 text-neutral-400"
                      }`}>
                      {strip.isActive ? "ACTIVE" : "INACTIVE"}
                    </div>

                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-[9px] font-bold text-neutral-400 uppercase block mb-1">
                          {strip.headerCategorySlug === 'all' ? "HOME MAIN" : `${strip.headerCategorySlug} PLACEMENT`}
                        </span>
                        <h3 className="text-xl font-bold text-neutral-800 leading-tight">{strip.heading}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-3 py-1 rounded-full">{strip.saleText}</span>
                          <span className="text-neutral-300">|</span>
                          <span className="text-[10px] font-bold text-neutral-400">PRIORITY: {strip.order}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(strip)} className="w-9 h-9 flex items-center justify-center bg-neutral-50 text-neutral-400 hover:bg-teal-50 hover:text-teal-600 rounded-lg transition-all">
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => handleDelete(strip._id, strip.headerCategorySlug)}
                          className="w-9 h-9 flex items-center justify-center bg-neutral-50 text-neutral-400 hover:bg-rose-50 hover:text-rose-500 rounded-lg transition-all"
                          title="Delete Campaign"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>

                    <div className="px-1 text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <div className="h-[1px] flex-1 bg-neutral-100"></div>
                      <span>Visual Preview</span>
                      <div className="h-[1px] flex-1 bg-neutral-100"></div>
                    </div>

                    <CompactPromoPreview strip={strip} />

                    <div className="grid grid-cols-3 gap-4 pb-8 border-b border-neutral-50 mb-6">
                      <div className="bg-neutral-50/50 p-4 rounded-xl border border-neutral-50">
                        <p className="text-[9px] font-bold text-neutral-400 uppercase mb-1">Shortcut Boxes</p>
                        <p className="text-sm font-bold text-neutral-700">{strip.categoryCards.length} SUB-CATS</p>
                      </div>
                      <div className="bg-neutral-50/50 p-4 rounded-xl border border-neutral-50">
                        <p className="text-[9px] font-bold text-neutral-400 uppercase mb-1">Featured Deals</p>
                        <p className="text-sm font-bold text-neutral-700">{strip.featuredProducts.length} PRODUCTS</p>
                      </div>
                      <div className="bg-neutral-50/50 p-4 rounded-xl border border-neutral-50">
                        <p className="text-[9px] font-bold text-neutral-400 uppercase mb-1">Duration</p>
                        <p className="text-sm font-bold text-neutral-700">{new Date(strip.endDate).toLocaleDateString()}</p>
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
                        <div className="bg-neutral-800 text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase">
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
              <div className="flex items-center justify-between bg-white px-6 py-4 rounded-lg border border-neutral-200 shadow-sm mt-8">
                <p className="text-[10px] font-bold text-neutral-400 uppercase">
                  Showing {startIndex + 1} - {Math.min(startIndex + rowsPerPage, promoStrips.length)} of {promoStrips.length}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-10 h-10 flex items-center justify-center border border-neutral-200 rounded-lg text-neutral-400 hover:bg-neutral-50 disabled:opacity-20 transition-all font-bold"
                  >
                    ←
                  </button>
                  <div className="flex items-center px-4 bg-neutral-800 text-white rounded-lg text-xs font-bold shadow-sm">
                    {currentPage} / {totalPages}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-10 h-10 flex items-center justify-center border border-neutral-200 rounded-lg text-neutral-400 hover:bg-neutral-50 disabled:opacity-20 transition-all font-bold"
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
