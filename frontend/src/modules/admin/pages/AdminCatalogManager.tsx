import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCategories,
  getSubcategories,
  type Category,
  type SubCategory,
} from "../../../services/api/categoryService";
import {
  getProducts,
  type Product,
} from "../../../services/api/admin/adminProductService";

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

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const FolderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

// --- Styled Components ---

interface CatalogPanelProps<T> {
  title: string;
  items: T[];
  selectedId: string | null;
  onSelect: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  onAdd?: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  subtitle?: string;
}

function CatalogPanel<T extends { _id?: string; id?: string }>({
  title,
  items,
  selectedId,
  onSelect,
  renderItem,
  loading,
  emptyMessage = "No items found",
  onAdd,
  searchQuery,
  onSearchChange,
  subtitle,
}: CatalogPanelProps<T>) {
  const filteredItems = items.filter((item) => {
    const str = JSON.stringify(item).toLowerCase();
    return str.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-white border-r border-neutral-200 min-w-[300px] flex-1 last:border-r-0 transition-all duration-300 overflow-hidden group">
      {/* Header */}
      <div className="p-5 border-b border-neutral-100 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">{title}</h3>
            {subtitle && <p className="text-[10px] text-neutral-400 font-medium uppercase mt-0.5">{subtitle}</p>}
          </div>
          {onAdd && (
            <button
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
              className="w-8 h-8 flex items-center justify-center bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-600 hover:text-white transition-all duration-200 shadow-sm"
              title={`Manage ${title}`}
            >
              <PlusIcon />
            </button>
          )}
        </div>
        <div className="relative group/search">
          <input
            type="text"
            placeholder={`Filter ${title.toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white transition-all duration-200"
          />
          <div className="absolute left-3 top-2.5 text-neutral-400 group-focus-within/search:text-teal-500 transition-colors">
            <SearchIcon />
          </div>
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5 scroll-smooth">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 space-y-3">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-teal-100"></div>
              <div className="absolute inset-0 rounded-full border-2 border-teal-600 border-t-transparent animate-spin"></div>
            </div>
            <span className="text-xs font-medium text-neutral-400 animate-pulse">Fetching {title}...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 p-6 text-center">
            <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mb-3 text-neutral-300">
              <FolderIcon />
            </div>
            <p className="text-neutral-500 font-medium text-xs">{emptyMessage}</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const id = item._id || item.id;
            const isSelected = selectedId === id;
            return (
              <div
                key={id}
                onClick={() => onSelect(item)}
                className={`
                                    group/item p-3 rounded-xl cursor-pointer transition-all duration-200 border flex items-center gap-3
                                    ${isSelected
                    ? "bg-teal-600 border-teal-600 shadow-lg shadow-teal-900/20 translate-x-1"
                    : "bg-white border-neutral-100 hover:border-teal-200 hover:bg-teal-50/30"
                  }
                                `}
              >
                <div className="flex-1 min-w-0">
                  {renderItem(item)}
                </div>
                <div className={`transition-all duration-200 ${isSelected ? "text-white translate-x-0" : "text-neutral-300 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-1"}`}>
                  <ChevronRightIcon />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// --- Main Page ---

export default function AdminCatalogManager() {
  const navigate = useNavigate();

  // Data State
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Selection State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Search State
  const [searchCategory, setSearchCategory] = useState("");
  const [searchSubCategory, setSearchSubCategory] = useState("");
  const [searchProduct, setSearchProduct] = useState("");

  // Loading States
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubCats, setLoadingSubCats] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // -- Fetch Categories --
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await getCategories();
      if (res.success && Array.isArray(res.data)) {
        setCategories(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCategories(false);
    }
  };

  // -- 2. Category -> SubCategories --
  useEffect(() => {
    if (selectedCategoryId) {
      fetchSubCats(selectedCategoryId);
    } else {
      setSubCategories([]);
    }
    setSelectedSubCategoryId(null);
    setProducts([]);
    setSelectedProductId(null);
  }, [selectedCategoryId]);

  const fetchSubCats = async (catId: string) => {
    setLoadingSubCats(true);
    try {
      const res = await getSubcategories(catId);
      if (res.success) setSubCategories(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSubCats(false);
    }
  };

  // -- 3. SubCategory -> Products --
  useEffect(() => {
    if (selectedSubCategoryId) {
      fetchProds(selectedSubCategoryId);
    } else {
      setProducts([]);
    }
    setSelectedProductId(null);
  }, [selectedSubCategoryId]);

  const fetchProds = async (subId: string) => {
    setLoadingProducts(true);
    try {
      const res = await getProducts({ subcategory: subId });
      if (res.success) setProducts(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProducts(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] -m-6 bg-white overflow-hidden">
      {/* Glossy Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-neutral-200 px-8 py-5 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-600/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight">Catalog Intelligence</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Live Visual Hierarchy</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-3 mr-4">
            <button
              onClick={() => navigate("/admin/promo-strip")}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-100 text-purple-600 transition-all hover:scale-105"
            >
              <div className="p-1 mb-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                  <path d="M3 9H21M9 3V21"></path>
                </svg>
              </div>
              <span className="text-[9px] font-bold uppercase">Promo Strip</span>
            </button>
            <button
              onClick={() => navigate("/admin/lowest-prices")}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-100 text-orange-600 transition-all hover:scale-105"
            >
              <div className="p-1 mb-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z"></path>
                  <path d="M2 17L12 22L22 17"></path>
                </svg>
              </div>
              <span className="text-[9px] font-bold uppercase">Lowest Price</span>
            </button>
            <button
              onClick={() => navigate("/admin/bestseller-cards")}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-600 transition-all hover:scale-105"
            >
              <div className="p-1 mb-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path>
                </svg>
              </div>
              <span className="text-[9px] font-bold uppercase">Bestsellers</span>
            </button>
            <button
              onClick={() => navigate("/admin/shop-by-store")}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-100 text-pink-600 transition-all hover:scale-105"
            >
              <div className="p-1 mb-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"></path>
                </svg>
              </div>
              <span className="text-[9px] font-bold uppercase">Stores</span>
            </button>
          </div>
          <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-neutral-50 rounded-full border border-neutral-100">
            <span className="text-xs font-bold text-neutral-400">STATUS:</span>
            <span className="text-xs font-bold text-teal-600">CONNECTED</span>
          </div>
        </div>
      </div>

      {/* Hierarchy Container */}
      <div className="flex-1 flex bg-neutral-50/30 overflow-x-auto overflow-y-hidden custom-scrollbar">
        {/* Panel 1: Categories */}
        <CatalogPanel
          title="Categories"
          subtitle="Level 1"
          items={categories}
          selectedId={selectedCategoryId}
          onSelect={(c) => setSelectedCategoryId(c._id)}
          loading={loadingCategories}
          searchQuery={searchCategory}
          onSearchChange={setSearchCategory}
          renderItem={(cat) => (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center overflow-hidden border border-neutral-200 transition-transform group-hover/item:scale-105 flex-shrink-0">
                {cat.image ? (
                  <img src={cat.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className={`text-xs font-bold ${selectedCategoryId === cat._id ? "text-teal-200" : "text-neutral-400"}`}>{cat.name?.[0]}</span>
                )}
              </div>
              <div>
                <div className={`font-bold text-sm ${selectedCategoryId === cat._id ? "text-white" : "text-neutral-800"}`}>{cat.name}</div>
                {cat.status === "Inactive" && <span className="text-[10px] text-red-400 font-bold uppercase">Disabled</span>}
              </div>
            </div>
          )}
          onAdd={() => navigate("/admin/category")}
        />

        {/* Panel 2: SubCategories */}
        <CatalogPanel
          title="Sub-Categories"
          subtitle="Level 2"
          items={subCategories}
          selectedId={selectedSubCategoryId}
          onSelect={(s) => setSelectedSubCategoryId(s._id || s.id || "")}
          loading={loadingSubCats}
          emptyMessage={selectedCategoryId ? "No subcategories" : "Select category"}
          searchQuery={searchSubCategory}
          onSearchChange={setSearchSubCategory}
          renderItem={(sub) => (
            <div>
              <div className={`font-bold text-sm ${selectedSubCategoryId === (sub._id || sub.id) ? "text-white" : "text-neutral-800"}`}>
                {sub.subcategoryName || sub.name}
              </div>
              <div className={`text-[10px] font-medium mt-0.5 ${selectedSubCategoryId === (sub._id || (sub as any).id) ? "text-teal-100" : "text-neutral-400"}`}>
                {sub.totalProduct !== undefined ? `${sub.totalProduct} Products` : "Collection"}
              </div>
            </div>
          )}
          onAdd={selectedCategoryId ? () => navigate("/admin/category") : undefined}
        />

        {/* Panel 3: Products */}
        <CatalogPanel
          title="Products"
          subtitle="Level 3"
          items={products}
          selectedId={selectedProductId}
          onSelect={(p) => setSelectedProductId(p._id)}
          loading={loadingProducts}
          emptyMessage={selectedSubCategoryId ? "Empty shelf" : "Select subcategory"}
          searchQuery={searchProduct}
          onSearchChange={setSearchProduct}
          renderItem={(prod) => (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center overflow-hidden border border-neutral-200 group-hover/item:scale-110 transition-transform flex-shrink-0">
                {prod.mainImage ? (
                  <img src={prod.mainImage} alt="" className="w-full h-full object-contain p-1" />
                ) : (
                  <span className={`text-xs font-bold ${selectedProductId === prod._id ? "text-teal-200" : "text-neutral-300"}`}>P</span>
                )}
              </div>
              <div className="min-w-0">
                <div className={`font-bold text-sm truncate ${selectedProductId === prod._id ? "text-white" : "text-neutral-800"}`} title={prod.productName}>
                  {prod.productName}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] font-bold ${selectedProductId === prod._id ? "text-white/80" : "text-teal-600"}`}>₹{prod.price}</span>
                  {!prod.publish && <span className="text-[9px] font-bold px-1 rounded bg-orange-50 text-orange-600 border border-orange-100">DRAFT</span>}
                </div>
              </div>
              {selectedProductId === prod._id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin/product/edit/${prod._id}`);
                  }}
                  className="ml-auto p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-lg transition-all"
                  title="Edit Product"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
              )}
            </div>
          )}
          onAdd={selectedSubCategoryId ? () => navigate("/admin/product/add") : undefined}
        />
      </div>

      {/* Bottom Insight Bar */}
      <div className="h-14 bg-white border-t border-neutral-200 px-8 flex items-center justify-between z-10">
        <div className="flex items-center gap-6 text-xs font-bold text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
            <span>TOTAL CATEGORIES: {categories.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span>PRODUCTS IN VIEW: {products.length}</span>
          </div>
        </div>
        <div className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">
          Catalog Intelligence v2.0
        </div>
      </div>

      <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                     height: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e5e7eb;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
                .group:hover .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #d1d5db;
                }
            `}</style>
    </div>
  );
}
