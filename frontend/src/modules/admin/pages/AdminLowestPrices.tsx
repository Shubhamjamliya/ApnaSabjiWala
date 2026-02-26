import { useState, useEffect, useMemo } from "react";
import {
    getLowestPricesProducts,
    createLowestPricesProduct,
    updateLowestPricesProduct,
    deleteLowestPricesProduct,
    type LowestPricesProduct,
    type LowestPricesProductFormData,
} from "../../../services/api/admin/adminLowestPricesService";
import {
    getProducts,
    getCategories,
    getSubCategories,
    type Product,
    type Category,
    type SubCategory
} from "../../../services/api/admin/adminProductService";
import { getHeaderCategoriesAdmin, type HeaderCategory } from "../../../services/api/headerCategoryService";

export default function AdminLowestPrices() {
    // Form state
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [order, setOrder] = useState<number | undefined>(undefined);
    const [isActive, setIsActive] = useState(true);

    // Filter state
    const [headerCategories, setHeaderCategories] = useState<HeaderCategory[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<SubCategory[]>([]);

    const [selectedHeader, setSelectedHeader] = useState<string>("");
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");

    // Data state
    const [lowestPricesProducts, setLowestPricesProducts] = useState<LowestPricesProduct[]>([]);
    const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
    const [productSearchTerm, setProductSearchTerm] = useState("");

    // UI state
    const [loading, setLoading] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Pagination
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    // Check if HOME header is selected
    const isHomeHeader = useMemo(() => {
        const header = headerCategories.find(h => h._id === selectedHeader);
        return header?.name?.toUpperCase() === "HOME";
    }, [selectedHeader, headerCategories]);

    // Fetch initial data
    useEffect(() => {
        fetchLowestPricesProducts();
        fetchInitialFilters();
    }, []);

    const fetchInitialFilters = async () => {
        try {
            const [catRes, headerRes] = await Promise.all([
                getCategories({ status: "Active" }),
                getHeaderCategoriesAdmin()
            ]);

            if (catRes.success) {
                setCategories(catRes.data);
            }
            if (Array.isArray(headerRes)) {
                setHeaderCategories(headerRes);
                // Try to find the "HOME" header category and select it by default
                const homeHeader = headerRes.find(h => h.name?.toUpperCase() === "HOME");
                if (homeHeader) {
                    setSelectedHeader(homeHeader._id);
                } else {
                    setSelectedHeader("");
                }
            }
        } catch (err) {
            console.error("Error fetching filters:", err);
        }
    };

    // Categories are now unfiltered so any product can be added to any header section
    const currentCategories = categories;

    useEffect(() => {
        if (selectedCategory) {
            fetchSubcategories(selectedCategory);
        } else {
            setSubcategories([]);
            setSelectedSubcategory("");
        }
        fetchAvailableProducts();
    }, [selectedHeader, selectedCategory, selectedSubcategory]);

    const fetchSubcategories = async (categoryId: string) => {
        try {
            const subRes = await getSubCategories({ category: categoryId });
            if (subRes.success) {
                setSubcategories(subRes.data);
            }
        } catch (err) {
            console.error("Error fetching subcategories:", err);
        }
    };

    const fetchLowestPricesProducts = async () => {
        try {
            setLoadingProducts(true);
            const response = await getLowestPricesProducts();
            if (response.success && Array.isArray(response.data)) {
                setLowestPricesProducts(response.data);
            }
        } catch (err) {
            console.error("Error fetching lowest prices products:", err);
            setError("Failed to load lowest prices products");
        } finally {
            setLoadingProducts(false);
        }
    };

    const fetchAvailableProducts = async () => {
        try {
            const params: any = { limit: 1000, status: "Active" };
            if (selectedCategory) params.category = selectedCategory;
            if (selectedSubcategory) params.subcategory = selectedSubcategory;

            const response = await getProducts(params);
            if (response.success && response.data) {
                const productList = Array.isArray(response.data) ? response.data : [];
                setAvailableProducts(productList);
            }
        } catch (err) {
            console.error("Error fetching products:", err);
        }
    };

    // Filter products based on search term and exclude already added products
    const filteredProducts = availableProducts.filter((product) => {
        // Get IDs of products already in lowest prices FOR THIS SPECIFIC HEADER
        const existingProductIds = lowestPricesProducts
            .filter((lp) => {
                const lpHeaderId = lp.headerCategoryId ? (typeof lp.headerCategoryId === "string" ? lp.headerCategoryId : (lp.headerCategoryId as any)._id) : "";
                return lpHeaderId === selectedHeader;
            })
            .map((lp) => (typeof lp.product === "string" ? lp.product : lp.product?._id))
            .filter((id): id is string => !!id);

        // Exclude already added products for this header (unless we're editing that specific one)
        if (existingProductIds.includes(product._id) && editingId === null) {
            return false;
        }

        // Filter by search term
        if (productSearchTerm) {
            const searchLower = productSearchTerm.toLowerCase();
            return (
                product.productName?.toLowerCase().includes(searchLower) ||
                product._id.toLowerCase().includes(searchLower)
            );
        }

        return true;
    });

    const toggleProductSelection = (productId: string) => {
        if (editingId) {
            setSelectedProductIds([productId]);
            return;
        }
        setSelectedProductIds(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    const handleSubmit = async () => {
        setError("");
        setSuccess("");

        // Validation
        if (selectedProductIds.length === 0) {
            setError("Please select at least one product");
            return;
        }

        try {
            setLoading(true);

            if (editingId) {
                const formData: LowestPricesProductFormData = {
                    product: selectedProductIds[0],
                    headerCategoryId: selectedHeader || undefined,
                    order: order !== undefined ? order : undefined,
                    isActive,
                };
                const response = await updateLowestPricesProduct(editingId, formData);
                if (response.success) {
                    setSuccess("Product updated successfully!");
                    resetForm();
                    fetchLowestPricesProducts();
                } else {
                    setError(response.message || "Failed to update product");
                }
            } else {
                // Bulk Add
                let successCount = 0;
                let failCount = 0;

                for (const productId of selectedProductIds) {
                    const formData: LowestPricesProductFormData = {
                        product: productId,
                        headerCategoryId: selectedHeader || undefined,
                        order: order !== undefined ? order : undefined,
                        isActive,
                    };
                    const response = await createLowestPricesProduct(formData);
                    if (response.success) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                }

                if (successCount > 0) {
                    setSuccess(`${successCount} product(s) added successfully!${failCount > 0 ? ` (${failCount} failed)` : ""}`);
                    resetForm();
                    fetchLowestPricesProducts();
                    fetchAvailableProducts();
                } else {
                    setError("Failed to add products");
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to save products");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (lowestPricesProduct: LowestPricesProduct) => {
        const productId = typeof lowestPricesProduct.product === "string"
            ? lowestPricesProduct.product
            : lowestPricesProduct.product?._id || "";
        setSelectedProductIds([productId]);
        setOrder(lowestPricesProduct.order);
        setIsActive(lowestPricesProduct.isActive);
        setEditingId(lowestPricesProduct._id);

        // Try to find the category/subcategory for this product to set the filters
        const product = availableProducts.find(p => p._id === productId);
        if (product) {
            const catId = typeof product.category === 'string' ? product.category : product.category?._id;
            const subId = typeof product.subcategory === 'string' ? product.subcategory : product.subcategory?._id;
            if (catId) setSelectedCategory(catId);
            if (subId) setSelectedSubcategory(subId);
        }

        if (lowestPricesProduct.headerCategoryId) {
            setSelectedHeader(lowestPricesProduct.headerCategoryId);
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to remove this product from lowest prices section?")) {
            return;
        }

        try {
            const response = await deleteLowestPricesProduct(id);
            if (response.success) {
                setSuccess("Product removed successfully!");
                fetchLowestPricesProducts();
                fetchAvailableProducts(); // Refresh to update filtered list
                if (editingId === id) {
                    resetForm();
                }
            } else {
                setError(response.message || "Failed to remove product");
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to remove product");
        }
    };

    const resetForm = () => {
        setSelectedProductIds([]);
        setOrder(undefined);
        setIsActive(true);
        setEditingId(null);
        setProductSearchTerm("");
        setSelectedCategory("");
        setSelectedSubcategory("");
    };

    // Filter the lowest prices list by the selected header so the table only shows relevant products
    const filteredLowestPricesProducts = useMemo(() => {
        return lowestPricesProducts.filter((lp) => {
            const lpHeaderId = lp.headerCategoryId ? (typeof lp.headerCategoryId === "string" ? lp.headerCategoryId : (lp.headerCategoryId as any)._id) : "";
            return lpHeaderId === selectedHeader;
        });
    }, [lowestPricesProducts, selectedHeader]);

    // Pagination
    const totalPages = Math.ceil(filteredLowestPricesProducts.length / rowsPerPage) || 1;
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const displayedProducts = filteredLowestPricesProducts.slice(startIndex, endIndex);

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Page Header */}
            <div className="p-6 pb-0">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-semibold text-neutral-800">
                        Lowest Prices Ever Products
                    </h1>
                    <div className="text-sm text-blue-500">
                        <span className="text-blue-500 hover:underline cursor-pointer">
                            Home
                        </span>{" "}
                        <span className="text-neutral-400">/</span> Lowest Prices Products
                    </div>
                </div>
            </div>

            {/* Success/Error Messages */}
            {(success || error) && (
                <div className="px-6">
                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                            {success}
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}
                </div>
            )}

            {/* Page Content */}
            <div className="flex-1 px-6 pb-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                    {/* Left Sidebar: Add/Edit Form */}
                    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 flex flex-col max-h-[calc(100vh-200px)]">
                        <h2 className="text-lg font-semibold text-neutral-800 mb-4">
                            {editingId ? "Edit Product" : "Add Products"}
                        </h2>

                        <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-thin">
                            {/* Header Category Filter */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Step 1: Header Category
                                </label>
                                <select
                                    value={selectedHeader}
                                    onChange={(e) => {
                                        setSelectedHeader(e.target.value);
                                        setSelectedCategory("");
                                        setSelectedSubcategory("");
                                    }}
                                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                >
                                    <option value="">Choose Header...</option>
                                    {headerCategories.map(h => (
                                        <option key={h._id} value={h._id}>{h.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Category Filter */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Step 2: Filter by Category
                                </label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => {
                                        setSelectedCategory(e.target.value);
                                        setSelectedSubcategory("");
                                    }}
                                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                >
                                    <option value="">All Categories</option>
                                    {currentCategories.map(cat => (
                                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Subcategory Filter */}
                            {subcategories.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                                        Step 3: Filter by Subcategory
                                    </label>
                                    <select
                                        value={selectedSubcategory}
                                        onChange={(e) => setSelectedSubcategory(e.target.value)}
                                        className="w-full px-3 py-2 border border-neutral-300 rounded bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                    >
                                        <option value="">All Subcategories</option>
                                        {subcategories.map(sub => (
                                            <option key={sub._id} value={sub._id}>{sub.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Product Search and Select */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Step 4: Select Products <span className="text-red-500">*</span>
                                </label>
                                {!editingId ? (
                                    <>
                                        <input
                                            type="text"
                                            placeholder="Search products..."
                                            value={productSearchTerm}
                                            onChange={(e) => setProductSearchTerm(e.target.value)}
                                            className="w-full px-3 py-2 border border-neutral-300 rounded bg-white focus:ring-2 focus:ring-teal-500 outline-none mb-2 text-sm"
                                        />
                                        <div className="border border-neutral-300 rounded h-64 overflow-y-auto bg-white scrollbar-thin">
                                            {filteredProducts.length === 0 ? (
                                                <p className="text-sm text-neutral-400 p-3 text-center">
                                                    {productSearchTerm
                                                        ? "No products found"
                                                        : "No available products in this category"}
                                                </p>
                                            ) : (
                                                filteredProducts.map((product) => (
                                                    <div
                                                        key={product._id}
                                                        onClick={() => toggleProductSelection(product._id)}
                                                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-neutral-50 border-b border-neutral-50 last:border-b-0 ${selectedProductIds.includes(product._id)
                                                            ? "bg-teal-50"
                                                            : ""
                                                            }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedProductIds.includes(product._id)}
                                                            readOnly
                                                            className="h-4 w-4 text-teal-600 rounded cursor-pointer"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-medium text-neutral-900 truncate">
                                                                {product.productName}
                                                            </div>
                                                            <div className="text-xs text-neutral-500">
                                                                {product.price ? `₹${product.price}` : "No price"} • {product.stock} in stock
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <div className="mt-2 text-xs text-neutral-500 flex justify-between">
                                            <span>{selectedProductIds.length} products selected</span>
                                            {selectedProductIds.length > 0 && (
                                                <button
                                                    onClick={() => setSelectedProductIds([])}
                                                    className="text-red-500 hover:underline px-0 py-0 bg-transparent border-none shadow-none"
                                                >
                                                    Clear selection
                                                </button>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="px-3 py-2 border border-neutral-300 rounded bg-neutral-50 text-sm flex justify-between items-center">
                                        <span>
                                            {availableProducts.find((p) => p._id === selectedProductIds[0])
                                                ?.productName || "Product not found"}
                                        </span>
                                        <span className="text-xs bg-teal-100 text-teal-800 px-2 py-0.5 rounded">Editing</span>
                                    </div>
                                )}
                            </div>

                            {/* Order */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Display Order
                                </label>
                                <input
                                    type="number"
                                    value={order !== undefined ? order : ""}
                                    onChange={(e) =>
                                        setOrder(e.target.value ? Number(e.target.value) : undefined)
                                    }
                                    placeholder="Auto-assign"
                                    min="0"
                                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                />
                                <p className="text-xs text-neutral-500 mt-1">
                                    Leave empty to auto-assign
                                </p>
                            </div>

                            {/* Active Status */}
                            <div>
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isActive}
                                        onChange={(e) => setIsActive(e.target.checked)}
                                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                                    />
                                    <span className="ml-2 text-sm font-medium text-neutral-700">
                                        Active
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-6 space-y-2">
                            <button
                                onClick={handleSubmit}
                                disabled={loading || selectedProductIds.length === 0}
                                className={`w-full px-4 py-2 rounded font-medium transition-colors ${loading || selectedProductIds.length === 0
                                    ? "bg-gray-400 cursor-not-allowed text-white"
                                    : "bg-teal-600 hover:bg-teal-700 text-white"
                                    }`}
                            >
                                {loading
                                    ? "Saving..."
                                    : editingId
                                        ? "Update Product"
                                        : `Add ${selectedProductIds.length || ""} Product(s)`}
                            </button>
                            {editingId && (
                                <button
                                    onClick={resetForm}
                                    className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded font-medium transition-colors border-none"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right Section: View Products Table */}
                    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-neutral-200 flex flex-col h-[calc(100vh-200px)]">
                        <div className="bg-teal-600 text-white px-6 py-4 rounded-t-lg">
                            <h2 className="text-lg font-semibold">Current Lowest Price Products</h2>
                        </div>

                        {/* Controls */}
                        <div className="p-4 border-b border-neutral-100 flex justify-between items-center shadow-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-neutral-600">Show</span>
                                <input
                                    type="number"
                                    value={rowsPerPage}
                                    onChange={(e) => {
                                        setRowsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="w-16 px-2 py-1 border border-neutral-300 rounded text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none"
                                />
                                <span className="text-sm text-neutral-600">entries</span>
                            </div>
                            <div className="text-sm text-neutral-500">
                                Total: {filteredLowestPricesProducts.length} items
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto flex-1 scrollbar-thin">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-neutral-50 text-xs font-bold text-neutral-800 border-b border-neutral-200 sticky top-0 z-10">
                                        <th className="p-4">Order</th>
                                        <th className="p-4">Product Name</th>
                                        <th className="p-4">Price</th>
                                        <th className="p-4 text-center">Status</th>
                                        <th className="p-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingProducts ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="p-8 text-center text-neutral-400"
                                            >
                                                Loading products...
                                            </td>
                                        </tr>
                                    ) : displayedProducts.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="p-8 text-center text-neutral-400"
                                            >
                                                No products found. Use the sidebar to add products!
                                            </td>
                                        </tr>
                                    ) : (
                                        displayedProducts.map((item) => {
                                            const product =
                                                typeof item.product === "string"
                                                    ? null
                                                    : item.product;
                                            return (
                                                <tr
                                                    key={item._id}
                                                    className="hover:bg-neutral-50 transition-colors text-sm text-neutral-700 border-b border-neutral-200"
                                                >
                                                    <td className="p-4">{item.order}</td>
                                                    <td className="p-4">
                                                        <div className="font-medium text-neutral-900">
                                                            {product?.productName || "Product not found"}
                                                        </div>
                                                        <div className="text-[10px] text-neutral-400">ID: {item._id}</div>
                                                    </td>
                                                    <td className="p-4 font-semibold text-teal-700">
                                                        {product?.price
                                                            ? `₹${product.price.toLocaleString("en-IN")}`
                                                            : "N/A"}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span
                                                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${item.isActive
                                                                ? "bg-green-100 text-green-700"
                                                                : "bg-neutral-100 text-neutral-500"
                                                                }`}
                                                        >
                                                            {item.isActive ? "Active" : "Inactive"}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleEdit(item)}
                                                                className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded transition-all border-none shadow-none"
                                                                title="Edit"
                                                            >
                                                                <svg
                                                                    width="14"
                                                                    height="14"
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="2"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                >
                                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(item._id)}
                                                                className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded transition-all border-none shadow-none"
                                                                title="Delete"
                                                            >
                                                                <svg
                                                                    width="14"
                                                                    height="14"
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="2"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                >
                                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="p-4 border-t border-neutral-100 flex justify-between items-center bg-neutral-50 rounded-b-lg">
                            <div className="text-[11px] text-neutral-500 font-medium">
                                Showing {filteredLowestPricesProducts.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredLowestPricesProducts.length)} of {filteredLowestPricesProducts.length} entries
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className={`px-3 py-1 rounded text-xs font-bold transition-colors border-none ${currentPage === 1
                                        ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                        : "bg-white text-teal-600 hover:bg-teal-50 shadow-sm"
                                        }`}
                                >
                                    Prev
                                </button>
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`w-7 h-7 rounded text-xs font-bold transition-colors border-none ${currentPage === i + 1
                                            ? "bg-teal-600 text-white shadow-md"
                                            : "bg-white text-neutral-600 hover:bg-neutral-50 shadow-sm"
                                            }`}
                                    >
                                        {i + 1}
                                    </button>
                                )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
                                <button
                                    onClick={() =>
                                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                                    }
                                    disabled={currentPage === totalPages}
                                    className={`px-3 py-1 rounded text-xs font-bold transition-colors border-none ${currentPage === totalPages
                                        ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                        : "bg-white text-teal-600 hover:bg-teal-50 shadow-sm"
                                        }`}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
