import { useState, useEffect } from "react";
import {
    getBestsellerCards,
    createBestsellerCard,
    updateBestsellerCard,
    deleteBestsellerCard,
    type BestsellerCard,
    type BestsellerCardFormData,
} from "../../../services/api/admin/adminBestsellerCardService";
import { getCategories, type Category } from "../../../services/api/categoryService";
import { getHeaderCategoriesAdmin, type HeaderCategory } from "../../../services/api/headerCategoryService";
import { getProducts, type Product } from "../../../services/api/productService";
import { useMemo } from "react";

const MAX_ACTIVE_CARDS = 12;

export default function AdminBestsellerCards() {
    // Form state
    const [name, setName] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [order, setOrder] = useState<number | undefined>(undefined);
    const [isActive, setIsActive] = useState(true);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // Data state
    const [cards, setCards] = useState<BestsellerCard[]>([]);
    const [headerCategories, setHeaderCategories] = useState<HeaderCategory[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedHeader, setSelectedHeader] = useState<string>("");

    // UI state
    const [loading, setLoading] = useState(false);
    const [loadingCards, setLoadingCards] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Pagination
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    // Fetch initial data
    useEffect(() => {
        fetchCards();
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [catRes, headerRes] = await Promise.all([
                getCategories(),
                getHeaderCategoriesAdmin()
            ]);

            if (catRes.success) {
                setCategories(catRes.data);
            }
            if (Array.isArray(headerRes)) {
                setHeaderCategories(headerRes);
                // Auto-select HOME header if exists
                const homeHeader = headerRes.find(h => h.name?.toUpperCase() === "HOME");
                if (homeHeader) setSelectedHeader(homeHeader._id);
            }
        } catch (err) {
            console.error("Error fetching filters:", err);
        }
    };

    const fetchCards = async () => {
        try {
            setLoadingCards(true);
            const response = await getBestsellerCards();
            if (response.success && Array.isArray(response.data)) {
                setCards(response.data);
            }
        } catch (err) {
            console.error("Error fetching bestseller cards:", err);
            setError("Failed to load bestseller cards");
        } finally {
            setLoadingCards(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await getCategories();
            if (response.success) {
                // Filter only root categories (no parentId)
                const rootCategories = response.data.filter((cat) => !cat.parentId);
                setCategories(rootCategories);
            }
        } catch (err) {
            console.error("Error fetching categories:", err);
        }
    };

    const handleSubmit = async () => {
        setError("");
        setSuccess("");

        // Validation
        if (!name.trim()) {
            setError("Please enter a card name");
            return;
        }
        if (!selectedCategory) {
            setError("Please select a category");
            return;
        }

        // Check max active cards limit
        if (isActive && !editingId) {
            const activeCardsCount = cards.filter((c) => c.isActive).length;
            if (activeCardsCount >= MAX_ACTIVE_CARDS) {
                setError(`Maximum ${MAX_ACTIVE_CARDS} active bestseller cards allowed`);
                return;
            }
        }

        // Check if trying to activate and already at max
        if (isActive && editingId) {
            const card = cards.find((c) => c._id === editingId);
            if (card && !card.isActive) {
                const activeCardsCount = cards.filter((c) => c.isActive).length;
                if (activeCardsCount >= MAX_ACTIVE_CARDS) {
                    setError(`Maximum ${MAX_ACTIVE_CARDS} active bestseller cards allowed`);
                    return;
                }
            }
        }

        const formData: BestsellerCardFormData = {
            name: name.trim(),
            category: selectedCategory,
            headerCategoryId: selectedHeader || undefined,
            products: selectedProductIds.length > 0 ? selectedProductIds : undefined,
            order: order !== undefined ? order : undefined,
            isActive,
        };

        try {
            setLoading(true);

            if (editingId) {
                const response = await updateBestsellerCard(editingId, formData);
                if (response.success) {
                    setSuccess("Bestseller card updated successfully!");
                    resetForm();
                    fetchCards();
                } else {
                    setError(response.message || "Failed to update card");
                }
            } else {
                const response = await createBestsellerCard(formData);
                if (response.success) {
                    setSuccess("Bestseller card created successfully!");
                    resetForm();
                    fetchCards();
                } else {
                    setError(response.message || "Failed to create card");
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to save bestseller card");
        } finally {
            setLoading(false);
        }
    };

    // Filter categories based on selected header
    const filteredCategoriesForSelection = useMemo(() => {
        if (!selectedHeader) return categories;
        const header = headerCategories.find(h => h._id === selectedHeader);
        if (!header) return categories;

        // Find categories linked to this header (either by headerCategoryId or relatedCategory)
        return categories.filter(cat =>
            cat.headerCategoryId === selectedHeader ||
            (typeof cat.headerCategoryId === 'object' && cat.headerCategoryId?._id === selectedHeader) ||
            cat._id === header.relatedCategory
        );
    }, [selectedHeader, categories, headerCategories]);

    // Fetch products when category changes
    useEffect(() => {
        if (selectedCategory) {
            fetchCategoryProducts(selectedCategory);
        } else {
            setAvailableProducts([]);
        }
    }, [selectedCategory]);

    const fetchCategoryProducts = async (categoryId: string) => {
        try {
            setLoadingProducts(true);
            const response = await getProducts({ category: categoryId, limit: 100 });
            if (response.success) {
                setAvailableProducts(response.data);
            }
        } catch (err) {
            console.error("Error fetching category products:", err);
        } finally {
            setLoadingProducts(false);
        }
    };

    const toggleProductSelection = (productId: string) => {
        setSelectedProductIds(prev => {
            if (prev.includes(productId)) {
                return prev.filter(id => id !== productId);
            }
            if (prev.length >= 4) {
                setError("You can select up to 4 products for a bestseller card");
                return prev;
            }
            return [...prev, productId];
        });
    };

    const handleEdit = (card: BestsellerCard) => {
        setName(card.name);
        setSelectedCategory(
            typeof card.category === "string" ? card.category : card.category?._id || ""
        );
        // Try to pre-select header if category is found
        const catId = typeof card.category === "string" ? card.category : card.category?._id;
        if (catId) {
            const cat = categories.find(c => c._id === catId);
            if (cat) {
                const hId = typeof cat.headerCategoryId === 'string'
                    ? cat.headerCategoryId
                    : cat.headerCategoryId?._id;
                if (hId) setSelectedHeader(hId);
                else if (card.headerCategoryId) setSelectedHeader(card.headerCategoryId);
            } else if (card.headerCategoryId) {
                setSelectedHeader(card.headerCategoryId);
            }
        } else if (card.headerCategoryId) {
            setSelectedHeader(card.headerCategoryId);
        }
        setOrder(card.order);
        setIsActive(card.isActive);
        setSelectedProductIds(card.products?.map(p => typeof p === 'string' ? p : p._id) || []);
        setEditingId(card._id);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this bestseller card?")) {
            return;
        }

        try {
            const response = await deleteBestsellerCard(id);
            if (response.success) {
                setSuccess("Bestseller card deleted successfully!");
                fetchCards();
                if (editingId === id) {
                    resetForm();
                }
            } else {
                setError(response.message || "Failed to delete card");
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to delete bestseller card");
        }
    };

    const resetForm = () => {
        setName("");
        setSelectedCategory("");
        setOrder(undefined);
        setIsActive(true);
        setSelectedProductIds([]);
        setEditingId(null);
    };

    // Pagination
    const totalPages = Math.ceil(cards.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const displayedCards = cards.slice(startIndex, endIndex);

    const activeCardsCount = cards.filter((c) => c.isActive).length;

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Page Header */}
            <div className="p-6 pb-0">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-semibold text-neutral-800">
                        Bestseller Cards
                    </h1>
                    <div className="text-sm text-blue-500">
                        <span className="text-blue-500 hover:underline cursor-pointer">
                            Home
                        </span>{" "}
                        <span className="text-neutral-400">/</span> Bestseller Cards
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

            {/* Max Cards Info */}
            <div className="px-6 mb-4">
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded text-sm">
                    Active cards: {activeCardsCount} / {MAX_ACTIVE_CARDS} (Maximum {MAX_ACTIVE_CARDS} active cards allowed)
                </div>
            </div>

            {/* Page Content */}
            <div className="flex-1 px-6 pb-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                    {/* Left Sidebar: Add/Edit Form */}
                    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 flex flex-col">
                        <h2 className="text-lg font-semibold text-neutral-800 mb-4">
                            {editingId ? "Edit Card" : "Add Card"}
                        </h2>

                        <div className="space-y-4 flex-1 overflow-y-auto">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Card Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Fresh Vegetables"
                                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                />
                            </div>

                            {/* Header Category Filter */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Header Category
                                </label>
                                <select
                                    value={selectedHeader}
                                    onChange={(e) => {
                                        setSelectedHeader(e.target.value);
                                        setSelectedCategory("");
                                    }}
                                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                >
                                    <option value="">Select Header</option>
                                    {headerCategories.map(h => (
                                        <option key={h._id} value={h._id}>{h.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Category <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                >
                                    <option value="">Select a category</option>
                                    {filteredCategoriesForSelection.map((cat) => (
                                        <option key={cat._id} value={cat._id}>
                                            {cat.name} {cat.parentId ? `(Sub of ${cat.parentId})` : '(Root)'}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-neutral-500 mt-1">
                                    Pick up to 4 products below or leave unselected to auto-fetch the most popular ones
                                </p>
                            </div>

                            {/* Product Picker */}
                            {selectedCategory && (
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                                        Select Products ({selectedProductIds.length}/4)
                                    </label>
                                    <div className="border border-neutral-200 rounded-lg max-h-60 overflow-y-auto p-2 bg-neutral-50">
                                        {loadingProducts ? (
                                            <div className="text-center py-4 text-xs text-neutral-500">Loading products...</div>
                                        ) : availableProducts.length === 0 ? (
                                            <div className="text-center py-4 text-xs text-neutral-500">No products found in this category</div>
                                        ) : (
                                            <div className="space-y-1">
                                                {availableProducts.map(product => (
                                                    <div
                                                        key={product._id}
                                                        onClick={() => toggleProductSelection(product._id)}
                                                        className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${selectedProductIds.includes(product._id)
                                                            ? "bg-teal-50 border border-teal-200"
                                                            : "bg-white border border-transparent hover:bg-neutral-100"
                                                            }`}
                                                    >
                                                        <div className="w-8 h-8 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                                                            {(product.mainImage || product.mainImageUrl) && (
                                                                <img
                                                                    src={product.mainImage || product.mainImageUrl}
                                                                    alt=""
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs font-medium text-neutral-800 truncate">{product.productName}</div>
                                                            <div className="text-[10px] text-neutral-500">₹{product.price}</div>
                                                        </div>
                                                        {selectedProductIds.includes(product._id) && (
                                                            <div className="text-teal-600">
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                                </svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

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
                                    className="w-full px-3 py-2 border border-neutral-300 rounded bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                />
                                <p className="text-xs text-neutral-500 mt-1">
                                    Leave empty to auto-assign at the end
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
                                        Active (Show on home page)
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-6 space-y-2">
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className={`w-full px-4 py-2 rounded font-medium transition-colors ${loading
                                    ? "bg-gray-400 cursor-not-allowed text-white"
                                    : "bg-teal-600 hover:bg-teal-700 text-white"
                                    }`}
                            >
                                {loading
                                    ? "Saving..."
                                    : editingId
                                        ? "Update Card"
                                        : "Create Card"}
                            </button>
                            {editingId && (
                                <button
                                    onClick={resetForm}
                                    className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right Section: View Cards Table */}
                    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-neutral-200 flex flex-col">
                        <div className="bg-teal-600 text-white px-6 py-4 rounded-t-lg">
                            <h2 className="text-lg font-semibold">View Cards</h2>
                        </div>

                        {/* Controls */}
                        <div className="p-4 border-b border-neutral-100">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-neutral-600">Show</span>
                                <input
                                    type="number"
                                    value={rowsPerPage}
                                    onChange={(e) => {
                                        setRowsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="w-16 px-2 py-1.5 border border-neutral-300 rounded text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none"
                                />
                                <span className="text-sm text-neutral-600">entries</span>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-neutral-50 text-xs font-bold text-neutral-800 border-b border-neutral-200">
                                        <th className="p-4">Order</th>
                                        <th className="p-4">Name</th>
                                        <th className="p-4">Category</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingCards ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="p-8 text-center text-neutral-400"
                                            >
                                                Loading cards...
                                            </td>
                                        </tr>
                                    ) : displayedCards.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="p-8 text-center text-neutral-400"
                                            >
                                                No bestseller cards found. Create your first card!
                                            </td>
                                        </tr>
                                    ) : (
                                        displayedCards.map((card) => (
                                            <tr
                                                key={card._id}
                                                className="hover:bg-neutral-50 transition-colors text-sm text-neutral-700 border-b border-neutral-200"
                                            >
                                                <td className="p-4">{card.order}</td>
                                                <td className="p-4 font-medium">{card.name}</td>
                                                <td className="p-4">
                                                    {typeof card.category === "string"
                                                        ? card.category
                                                        : card.category?.name || "Category not found"}
                                                </td>
                                                <td className="p-4">
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${card.isActive
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-gray-100 text-gray-800"
                                                            }`}
                                                    >
                                                        {card.isActive ? "Active" : "Inactive"}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleEdit(card)}
                                                            className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
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
                                                            onClick={() => handleDelete(card._id)}
                                                            className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
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
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="p-4 border-t border-neutral-100 flex justify-between items-center">
                                <div className="text-sm text-neutral-600">
                                    Showing {startIndex + 1} to{" "}
                                    {Math.min(endIndex, cards.length)} of {cards.length} entries
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className={`px-3 py-1.5 rounded text-sm border ${currentPage === 1
                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300"
                                            : "bg-white text-neutral-700 hover:bg-neutral-50 border-neutral-300"
                                            }`}
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() =>
                                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                                        }
                                        disabled={currentPage === totalPages}
                                        className={`px-3 py-1.5 rounded text-sm border ${currentPage === totalPages
                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300"
                                            : "bg-white text-neutral-700 hover:bg-neutral-50 border-neutral-300"
                                            }`}
                                    >
                                        Next
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

