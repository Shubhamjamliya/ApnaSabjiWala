import { useState, useEffect, useMemo } from "react";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  bulkDeleteCategories,
  type Category,
  type CreateCategoryData,
  type UpdateCategoryData,
} from "../../../services/api/admin/adminProductService";
import { useAuth } from "../../../context/AuthContext";
import CategoryFormModal from "../components/CategoryFormModal";
import CategoryTreeView from "../components/CategoryTreeView";
import {
  buildCategoryTree,
  searchCategories,
  filterCategoriesByStatus,
} from "../../../utils/categoryUtils";
import ContentLoader from "../../../components/loaders/ContentLoader";

// --- Icons ---
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

const GridIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"></rect>
    <rect x="14" y="3" width="7" height="7"></rect>
    <rect x="14" y="14" width="7" height="7"></rect>
    <rect x="3" y="14" width="7" height="7"></rect>
  </svg>
);

const TreeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"></line>
    <line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line>
    <line x1="3" y1="6" x2="3.01" y2="6"></line>
    <line x1="3" y1="12" x2="3.01" y2="12"></line>
    <line x1="3" y1="18" x2="3.01" y2="18"></line>
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

// Flatten tree structure for filtering
const flattenTree = (cats: Category[]): Category[] => {
  const result: Category[] = [];
  cats.forEach((cat) => {
    const { children, ...catWithoutChildren } = cat;
    let normalizedParentId: string | null = null;
    if (catWithoutChildren.parentId) {
      if (typeof catWithoutChildren.parentId === "string") {
        normalizedParentId = catWithoutChildren.parentId;
      } else if (
        typeof catWithoutChildren.parentId === "object" &&
        catWithoutChildren.parentId !== null
      ) {
        normalizedParentId =
          (catWithoutChildren.parentId as { _id?: string })._id || null;
      }
    }

    result.push({
      ...catWithoutChildren,
      parentId: normalizedParentId,
      childrenCount:
        cat.childrenCount ||
        (children && children.length > 0 ? children.length : 0),
    } as Category);
    if (children && children.length > 0) {
      result.push(...flattenTree(children));
    }
  });
  return result;
};

export default function AdminCategory() {
  const { isAuthenticated, token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [viewMode, setViewMode] = useState<"tree" | "grid">("grid"); // Changed default to grid
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "create-subcategory">("create");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination for grid view
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12); // Increased for grid

  // Fetch categories
  useEffect(() => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      return;
    }
    fetchCategories();
  }, [isAuthenticated, token]);

  const fetchCategories = async (preserveExpandedIds?: Set<string>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCategories({
        includeChildren: true,
        skipLoader: true,
      } as any);
      if (response.success) {
        setCategories(response.data);
        if (preserveExpandedIds && preserveExpandedIds.size > 0) {
          setExpandedIds(preserveExpandedIds);
        } else {
          const allIds = new Set<string>();
          const collectIds = (cats: Category[]) => {
            cats.forEach((cat) => {
              allIds.add(cat._id);
              if (cat.children && cat.children.length > 0) {
                collectIds(cat.children);
              }
            });
          };
          collectIds(response.data);
          setExpandedIds(allIds);
        }
      }
    } catch (err: unknown) {
      console.error("Error fetching categories:", err);
      // Removed complex error handling for brevity, use standard error state
      setError("Failed to load categories.");
    } finally {
      setLoading(false);
    }
  };

  // Filter and search categories
  const filteredCategories = useMemo(() => {
    const flatCategories = flattenTree(categories);
    let filtered = [...flatCategories];

    if (searchQuery.trim()) {
      filtered = searchCategories(filtered, searchQuery);
      const matchingParentIds = new Set(filtered.map((cat) => cat._id));
      const childrenOfMatches = flatCategories.filter(
        (cat) => cat.parentId && matchingParentIds.has(cat.parentId)
      );
      const allFiltered = [...filtered, ...childrenOfMatches];
      filtered = Array.from(new Map(allFiltered.map((cat) => [cat._id, cat])).values());
    }

    filtered = filterCategoriesByStatus(filtered, statusFilter);
    return filtered;
  }, [categories, searchQuery, statusFilter]);

  // Build tree for tree view
  const categoryTree = useMemo(() => {
    // Rebuild tree from filtered list to ensure consistency or use base if search is empty
    // Simplification: Always use full tree for Tree View effectively, filtering tree view is complex
    // For now, let's use the standard builder on filtered list if needed, or just full categories
    // Ideally Tree View has its own filtering node logic, but let's stick to base categories for tree view to maintain structure
    return buildCategoryTree(statusFilter === 'All' && !searchQuery ? categories : filteredCategories);
  }, [categories, filteredCategories, viewMode, statusFilter, searchQuery]);


  // Pagination Logic
  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCategories.slice(start, start + itemsPerPage);
  }, [filteredCategories, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);


  // Handlers
  const handleCreateCategory = () => {
    setModalMode("create");
    setEditingCategory(null);
    setParentCategory(null);
    setModalOpen(true);
  };

  const handleCreateSubcategory = (parent: Category) => {
    setModalMode("create-subcategory");
    setEditingCategory(null);
    setParentCategory(parent);
    setModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setModalMode("edit");
    setEditingCategory(category);
    setParentCategory(null);
    setModalOpen(true);
  };

  const handleDelete = async (category: Category) => {
    if (!window.confirm(`Are you sure you want to delete "${category.name}"? This action cannot be undone.`)) return;

    try {
      const response = await deleteCategory(category._id);
      if (response.success) {
        // alert("Category deleted successfully!");
        fetchCategories();
      }
    } catch (error) {
      alert("Failed to delete category");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected items?`)) return;

    try {
      const response = await bulkDeleteCategories(Array.from(selectedIds));
      if (response.success) {
        setSelectedIds(new Set());
        fetchCategories();
      }
    } catch (error) {
      alert("Bulk delete failed");
    }
  };

  const handleToggleStatus = async (category: Category) => {
    const newStatus = category.status === "Active" ? "Inactive" : "Active";
    const cascade = category.childrenCount && category.childrenCount > 0
      ? window.confirm(`Update status for all subcategories?`)
      : false;

    try {
      await toggleCategoryStatus(category._id, newStatus, cascade);
      fetchCategories();
    } catch (error) {
      alert("Status update failed");
    }
  };

  const handleFormSubmit = async (data: CreateCategoryData | UpdateCategoryData) => {
    if (modalMode === "edit" && editingCategory) {
      const response = await updateCategory(editingCategory._id, data);
      if (response.success) fetchCategories();
    } else {
      const response = await createCategory(data as CreateCategoryData);
      if (response.success) {
        if (modalMode === "create-subcategory" && parentCategory) {
          const newExpandedIds = new Set(expandedIds);
          newExpandedIds.add(parentCategory._id);
          fetchCategories(newExpandedIds);
        } else {
          fetchCategories();
        }
      }
    }
  };

  const handleExport = () => {
    // Basic CSV export
    const headers = ["ID", "Name", "Parent", "Status", "Order", "Created At"];
    const csvContent = [
      headers.join(","),
      ...filteredCategories.map(c => [c._id, c.name, c.parentId || "Root", c.status, c.order, c.createdAt].join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "categories.csv";
    link.click();
  };

  const handleToggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };


  return (
    <div className="flex h-[calc(100vh-6rem)] -m-6 bg-gray-50 overflow-hidden flex-col">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-20">
        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 uppercase tracking-widest border border-teal-100">Management</span>
            </div>
            <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              Manage Categories
              <span className="text-sm font-normal text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                {filteredCategories.length} items
              </span>
            </h1>
          </div>

          <button
            onClick={handleCreateCategory}
            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-md hover:shadow-lg active:scale-95 border border-teal-500"
          >
            <PlusIcon />
            <span>Add Category</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-200 flex flex-col sm:flex-row gap-3 items-center">

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all shadow-sm"
            />
            <div className="absolute left-3 top-2.5 text-neutral-400">
              <SearchIcon />
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white border border-neutral-300 text-neutral-700 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block p-2 outline-none shadow-sm cursor-pointer min-w-[120px]"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            {selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center gap-2"
              >
                <TrashIcon />
                Delete ({selectedIds.size})
              </button>
            )}

            <button
              onClick={handleExport}
              className="px-3 py-2 bg-white text-neutral-600 border border-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-50 transition-colors hidden sm:flex"
            >
              Export
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-white border border-neutral-300 rounded-lg p-1 ml-auto shadow-sm">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-teal-50 text-teal-600 shadow-sm" : "text-neutral-400 hover:text-neutral-600"}`}
              title="Grid View"
            >
              <GridIcon />
            </button>
            <button
              onClick={() => setViewMode("tree")}
              className={`p-2 rounded-md transition-all ${viewMode === "tree" ? "bg-teal-50 text-teal-600 shadow-sm" : "text-neutral-400 hover:text-neutral-600"}`}
              title="Tree View"
            >
              <TreeIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 relative min-h-[400px]">
        {loading && <ContentLoader />}

        {viewMode === "grid" ? (
          <>
            {filteredCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-neutral-200 rounded-xl bg-white h-96">
                <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4 text-neutral-300">
                  <SearchIcon />
                </div>
                <p className="text-neutral-500 font-medium">No categories found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 mb-8">
                {paginatedCategories.map((cat) => (
                  <div
                    key={cat._id}
                    className="group bg-white rounded-xl shadow-sm border border-neutral-200 hover:border-teal-400 hover:shadow-lg hover:shadow-teal-900/5 transition-all duration-300 overflow-hidden flex flex-col relative"
                  >
                    {/* Image */}
                    <div className="relative aspect-[4/3] bg-neutral-50 border-b border-neutral-100 overflow-hidden">
                      {cat.image ? (
                        <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-300 text-3xl font-bold opacity-30">
                          {cat.name.charAt(0)}
                        </div>
                      )}

                      {/* Overlay Actions */}
                      <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center sidebar gap-2">
                        <div className="flex gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                          <button
                            onClick={() => handleEdit(cat)}
                            className="p-2 bg-white text-neutral-700 rounded-full hover:text-teal-600 shadow-lg"
                            title="Edit"
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={() => handleDelete(cat)}
                            className="p-2 bg-white text-neutral-700 rounded-full hover:text-red-600 shadow-lg"
                            title="Delete"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm ${cat.status === 'Active' ? 'bg-white/90 text-teal-700' : 'bg-gray-200 text-gray-600'}`}>
                          {cat.status}
                        </span>
                      </div>
                      <div className="absolute top-2 right-2">
                        {cat.childrenCount !== undefined && cat.childrenCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold shadow-sm">
                            {cat.childrenCount} Sub
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-bold text-neutral-800 text-base mb-1 line-clamp-1" title={cat.name}>{cat.name}</h3>
                      <div className="mt-auto pt-2 flex items-center justify-between text-xs">
                        <span className="text-neutral-400">
                          {cat.parentId ? "Subcategory" : "Root Category"}
                        </span>
                        <span className="text-neutral-400 font-mono">
                          Seq: {cat.order}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center border-t border-neutral-200 pt-6 pb-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-neutral-50"
                  >
                    Prev
                  </button>
                  <span className="px-3 py-1 text-sm text-neutral-600 flex items-center">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-neutral-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden min-h-[500px] p-6">
            <CategoryTreeView
              categories={categoryTree}
              onAddSubcategory={handleCreateSubcategory}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
              expandedIds={expandedIds}
              onToggleExpand={handleToggleExpand}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {isModalOpen && (
        <CategoryFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingCategory(null);
            setParentCategory(null);
          }}
          onSubmit={handleFormSubmit}
          category={editingCategory || undefined}
          parentCategory={parentCategory || undefined}
          mode={modalMode}
          allCategories={categories}
        />
      )}
    </div>
  );
}
