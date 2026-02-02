import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  getProducts,
  getCategories,
  deleteProduct,
  getSubCategories,
  type Product,
  type Category,
  type SubCategory,
} from "../../../services/api/admin/adminProductService";
import { useAuth } from "../../../context/AuthContext";

// Icons
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path>
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const FilterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

const STATUS_OPTIONS = ["All Status", "Published", "Unpublished"];
const STOCK_OPTIONS = ["All Stock", "In Stock", "Out of Stock", "Unlimited"];

export default function AdminStockManagement() {
  const navigate = useNavigate();
  const { isAuthenticated, token } = useAuth();

  // Data States
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string | null>(null);

  // Filter States
  const [filterSeller, setFilterSeller] = useState("All Sellers");
  const [filterStatus, setFilterStatus] = useState("All Status");
  const [filterStock, setFilterStock] = useState("All Stock");

  // UI States
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingSubCategories, setLoadingSubCategories] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  // Initial Load
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchCategories();
    }
  }, [isAuthenticated, token]);

  // Handle Category Selection
  useEffect(() => {
    if (selectedCategoryId) {
      // Reset subcategory and filters selection when category changes
      setSelectedSubCategoryId(null);
      setFilterSeller("All Sellers");
      setFilterStatus("All Status");
      setFilterStock("All Stock");

      // Fetch data for the new category
      fetchSubCategories(selectedCategoryId);
      // Fetch ALL products for this category, we will filter subcategory client-side
      fetchProducts(selectedCategoryId);
    } else {
      setSubCategories([]);
      setProducts([]);
    }
  }, [selectedCategoryId]);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await getCategories();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchSubCategories = async (categoryId: string) => {
    try {
      setLoadingSubCategories(true);

      // Fetch standard subcategories AND recursive categories
      const [legacyResponse, recursiveResponse] = await Promise.all([
        getSubCategories({ category: categoryId }),
        getCategories({ parentId: categoryId })
      ]);

      let combinedData: SubCategory[] = [];

      if (legacyResponse.success && Array.isArray(legacyResponse.data)) {
        combinedData = [...legacyResponse.data];
      }

      if (recursiveResponse.success && Array.isArray(recursiveResponse.data)) {
        const mappedCategories: SubCategory[] = recursiveResponse.data.map(cat => ({
          _id: cat._id,
          name: cat.name,
          image: cat.image,
          category: cat.parentId || categoryId,
          order: cat.order || 0,
          totalProduct: undefined,
          createdAt: cat.createdAt,
          updatedAt: cat.updatedAt
        }));

        const existingIds = new Set(combinedData.map(item => item._id));
        mappedCategories.forEach(item => {
          if (!existingIds.has(item._id)) {
            combinedData.push(item);
          }
        });
      }

      setSubCategories(combinedData);
    } catch (error) {
      console.error("Failed to fetch subcategories:", error);
    } finally {
      setLoadingSubCategories(false);
    }
  };

  const fetchProducts = async (categoryId: string) => {
    try {
      setLoadingProducts(true);
      // We purposefully fetch ALL products for the category (limit 1000)
      // This allows instant client-side filtering by subcategory/stock/etc.
      const params: any = { category: categoryId, limit: 1000 };

      const response = await getProducts(params);
      if (response.success) {
        setProducts(response.data);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleDeleteProduct = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        const response = await deleteProduct(id);
        if (response.success || response.message === "Product deleted successfully") {
          // Optimistic update
          setProducts(prev => prev.filter(p => p._id !== id));
        } else {
          alert("Failed to delete product");
        }
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("An error occurred");
      }
    }
  };

  // --- Derived State & Filtering ---

  // Get unique sellers from currently loaded products
  const uniqueSellers = useMemo(() => {
    const sellers = new Set<string>();
    products.forEach(p => {
      const sellerName = typeof p.seller === 'object' && p.seller
        ? (p.seller.storeName || p.seller.sellerName)
        : (p.seller as string);
      if (sellerName) sellers.add(sellerName);
    });
    return ["All Sellers", ...Array.from(sellers).sort()];
  }, [products]);

  // Combined Filtering Logic
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // 1. Subcategory Filter
      if (selectedSubCategoryId) {
        const productSubCatId = typeof product.subcategory === 'object' && product.subcategory
          ? product.subcategory._id
          : product.subcategory;

        if (productSubCatId !== selectedSubCategoryId) return false;
      }

      // 2. Status Filter
      if (filterStatus !== "All Status") {
        const isPublished = filterStatus === "Published";
        if (product.publish !== isPublished) return false;
      }

      // 3. Stock Filter
      if (filterStock !== "All Stock") {
        if (filterStock === "Unlimited") {
          if (product.stock !== "Unlimited" && (typeof product.stock !== 'string' || product.stock.toLowerCase() !== 'unlimited')) return false; // Basic check, ideally logic should be precise
        } else if (filterStock === "In Stock") {
          const stockVal = Number(product.stock);
          if (isNaN(stockVal) || stockVal <= 0) return false;
        } else if (filterStock === "Out of Stock") {
          const stockVal = Number(product.stock);
          if (product.stock === "Unlimited" || (!isNaN(stockVal) && stockVal > 0)) return false;
        }
      }

      // 4. Seller Filter
      if (filterSeller !== "All Sellers") {
        const sellerName = typeof product.seller === 'object' && product.seller
          ? (product.seller.storeName || product.seller.sellerName)
          : (product.seller as string);
        if (sellerName !== filterSeller) return false;
      }

      // 5. Search Filter
      if (productSearch) {
        const searchLower = productSearch.toLowerCase();
        const matchName = product.productName.toLowerCase().includes(searchLower);
        const matchSku = product.sku?.toLowerCase().includes(searchLower) || false;
        if (!matchName && !matchSku) return false;
      }

      return true;
    });
  }, [products, selectedSubCategoryId, filterStatus, filterStock, filterSeller, productSearch]);


  // Filter Categories Sidebar
  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const selectedCategory = categories.find(c => c._id === selectedCategoryId);

  return (
    <div className="flex h-[calc(100vh-6rem)] -m-6 bg-gray-50 overflow-hidden">
      {/* Sidebar - Categories List */}
      <div className="w-80 bg-white border-r border-neutral-200 flex flex-col h-full flex-shrink-0 z-10 shadow-sm transition-all hidden md:flex">
        <div className="p-4 border-b border-neutral-100 bg-white">
          <h2 className="text-lg font-bold text-neutral-800 mb-4 px-1">Categories</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Search categories..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
            />
            <div className="absolute left-3 top-2.5 text-neutral-400">
              <SearchIcon />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingCategories ? (
            <div className="p-4 text-center text-neutral-400 text-sm">Loading categories...</div>
          ) : filteredCategories.length === 0 ? (
            <div className="p-4 text-center text-neutral-400 text-sm">No categories found</div>
          ) : (
            filteredCategories.map(item => (
              <div
                key={item._id}
                onClick={() => setSelectedCategoryId(item._id)}
                className={`
                  flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all border
                  ${selectedCategoryId === item._id
                    ? "bg-teal-50 border-teal-200 shadow-sm"
                    : "bg-white border-transparent hover:bg-neutral-50 hover:border-neutral-200"
                  }
                `}
              >
                <div className={`
                    w-10 h-10 rounded-lg flex-shrink-0 bg-neutral-100 overflow-hidden border flex items-center justify-center
                    ${selectedCategoryId === item._id ? "border-teal-200" : "border-neutral-100"}
                  `}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-neutral-400 font-bold">{item.name.substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-medium truncate ${selectedCategoryId === item._id ? "text-teal-900" : "text-neutral-700"}`}>
                    {item.name}
                  </h3>
                  <p className="text-xs text-neutral-400 truncate">
                    {item.totalSubcategories || 0} Subcats
                  </p>
                </div>
                {selectedCategoryId === item._id && (
                  <div className="text-teal-600">
                    <ChevronRightIcon />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content - Products */}
      <div className="flex-1 flex flex-col h-full bg-gray-50 min-w-0">
        {!selectedCategoryId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 p-8">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-neutral-100">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300">
                <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z"></path>
                <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21"></path>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-neutral-600 mb-1">Select a Category</h3>
            <p className="text-sm max-w-xs text-center">
              Please select a category from the sidebar to manage its products.
            </p>
          </div>
        ) : (
          <>
            {/* Header Area */}
            <div className="bg-white border-b border-neutral-200 z-10 sticky top-0 shadow-sm">
              {/* 1. Title & Global Actions */}
              <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 uppercase tracking-widest border border-teal-100">Managing Stock</span>
                  </div>
                  <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                    {selectedCategory?.name}
                    <span className="text-sm font-normal text-neutral-500">
                      ({filteredProducts.length} filtered / {products.length} total)
                    </span>
                  </h1>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate("/admin/product/add")}
                    className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-sm hover:shadow active:scale-95 text-sm"
                  >
                    <PlusIcon />
                    <span>Add Product</span>
                  </button>
                </div>
              </div>

              {/* 2. Subcategory Filter Pills */}
              {subCategories.length > 0 && (
                <div className="px-6 pb-4 overflow-x-auto no-scrollbar">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedSubCategoryId(null)}
                      className={`
                               px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border
                               ${!selectedSubCategoryId
                          ? "bg-neutral-800 text-white border-neutral-800 shadow-sm"
                          : "bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300"}
                            `}
                    >
                      All
                    </button>
                    {subCategories.map(sub => (
                      <button
                        key={sub._id}
                        onClick={() => setSelectedSubCategoryId(sub._id)}
                        className={`
                                  px-4 py-1.5 rounded-full text-xs font-bold tracking-wider whitespace-nowrap transition-all border flex items-center gap-2
                                  ${selectedSubCategoryId === sub._id
                            ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                            : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300"}
                               `}
                      >
                        {sub.image && (
                          <img src={sub.image} alt="" className="w-4 h-4 rounded-full object-cover" />
                        )}
                        {sub.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Detailed Filters Toolbar */}
              <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-200 flex flex-col sm:flex-row gap-3 items-center">
                <div className="flex items-center gap-2 text-neutral-500">
                  <FilterIcon />
                  <span className="text-xs font-bold uppercase tracking-wider">Filters:</span>
                </div>

                <div className="flex flex-wrap items-center gap-3 flex-1 w-full sm:w-auto">
                  <select
                    value={filterSeller}
                    onChange={(e) => setFilterSeller(e.target.value)}
                    className="bg-white border border-neutral-300 text-neutral-700 text-sm rounded-md focus:ring-teal-500 focus:border-teal-500 block p-2 outline-none h-10"
                  >
                    {uniqueSellers.map(seller => (
                      <option key={seller} value={seller}>{seller}</option>
                    ))}
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-white border border-neutral-300 text-neutral-700 text-sm rounded-md focus:ring-teal-500 focus:border-teal-500 block p-2 outline-none h-10"
                  >
                    {STATUS_OPTIONS.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>

                  <select
                    value={filterStock}
                    onChange={(e) => setFilterStock(e.target.value)}
                    className="bg-white border border-neutral-300 text-neutral-700 text-sm rounded-md focus:ring-teal-500 focus:border-teal-500 block p-2 outline-none h-10"
                  >
                    {STOCK_OPTIONS.map(stock => (
                      <option key={stock} value={stock}>{stock}</option>
                    ))}
                  </select>
                </div>

                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all h-10"
                  />
                  <div className="absolute left-3 top-2.5 text-neutral-400">
                    <SearchIcon />
                  </div>
                </div>
              </div>
            </div>

            {/* Content Grid */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              {loadingProducts ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="bg-white rounded-xl shadow-sm border border-neutral-100 h-72 animate-pulse flex flex-col">
                      <div className="h-40 bg-neutral-100 rounded-t-xl" />
                      <div className="p-4 space-y-3 flex-1">
                        <div className="h-4 w-3/4 bg-neutral-100 rounded" />
                        <div className="h-3 w-1/2 bg-neutral-100 rounded" />
                        <div className="h-6 w-full bg-neutral-100 rounded mt-auto" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-neutral-200 rounded-xl bg-white h-full max-h-[500px]">
                  <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4 text-neutral-300">
                    <SearchIcon />
                  </div>
                  <h3 className="text-neutral-900 font-semibold text-lg">No products found</h3>
                  <p className="text-neutral-500 text-sm mt-1 max-w-xs text-center">
                    Try adjusting your filters (Subcategory, Status, etc.) or check other categories.
                  </p>
                  {(filterStatus !== "All Status" || filterSeller !== "All Sellers" || selectedSubCategoryId) && (
                    <button
                      onClick={() => {
                        setFilterStatus("All Status");
                        setFilterSeller("All Sellers");
                        setSelectedSubCategoryId(null);
                        setProductSearch("");
                      }}
                      className="mt-4 text-teal-600 font-medium hover:underline text-sm"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-5 pb-10">
                  {filteredProducts.map((product) => (
                    <div
                      key={product._id}
                      className="group bg-white rounded-xl shadow-sm border border-neutral-200 hover:border-teal-400 hover:shadow-lg hover:shadow-teal-900/5 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer relative"
                      onClick={() => navigate(`/admin/product/edit/${product._id}`)}
                    >
                      {/* Image Area */}
                      <div className="relative aspect-square bg-neutral-50 overflow-hidden border-b border-neutral-100 p-4">
                        {product.mainImage ? (
                          <img
                            src={product.mainImage}
                            alt={product.productName}
                            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500 ease-out mix-blend-multiply"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-300">
                            <span className="text-xs font-medium uppercase tracking-wider">No Image</span>
                          </div>
                        )}

                        {/* Tags */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          {product.stock <= 0 && (
                            <span className="px-2 py-1 rounded bg-red-500 text-white text-[10px] font-bold uppercase shadow-sm">
                              Out of Stock
                            </span>
                          )}
                          {product.stock === "Unlimited" && (
                            <span className="px-2 py-1 rounded bg-blue-500 text-white text-[10px] font-bold uppercase shadow-sm">
                              Unlimited
                            </span>
                          )}
                        </div>

                        {/* Hover Actions */}
                        <div className="absolute inset-x-0 bottom-2 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/admin/product/edit/${product._id}`); }}
                            className="p-2 bg-white text-neutral-700 rounded-full hover:bg-teal-500 hover:text-white shadow-md border border-neutral-100 transition-colors"
                            title="Edit"
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={(e) => handleDeleteProduct(product._id, e)}
                            className="p-2 bg-white text-red-500 rounded-full hover:bg-red-500 hover:text-white shadow-md border border-neutral-100 transition-colors"
                            title="Delete"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>

                      {/* Info Area */}
                      <div className="p-3 flex-1 flex flex-col">
                        <h3 className="text-sm font-semibold text-neutral-800 line-clamp-2 leading-snug mb-2 min-h-[2.5em]" title={product.productName}>
                          {product.productName}
                        </h3>

                        <div className="mt-auto flex items-end justify-between">
                          <div className="flex flex-col">
                            {/* <span className="text-[10px] text-neutral-400 capitalize">{product.brand ? (typeof product.brand === 'string' ? 'Brand' : product.brand.name) : 'No Brand'}</span> */}
                            <span className="text-base font-bold text-neutral-900">₹{product.price}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${product.publish ? "bg-green-50 text-green-700 border-green-100" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                            {product.publish ? "LIVE" : "DRAFT"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
