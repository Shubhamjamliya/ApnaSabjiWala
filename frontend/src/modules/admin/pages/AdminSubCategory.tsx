import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { uploadImage } from "../../../services/api/uploadService";
import {
  validateImageFile,
  createImagePreview,
} from "../../../utils/imageUpload";
import {
  getSubCategories,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
  getCategories,
  type SubCategory,
  type Category,
} from "../../../services/api/admin/adminProductService";

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
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

interface SubCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; image: string | null; imageFile: File | null }) => Promise<void>;
  initialData?: SubCategory | null;
  categoryName: string;
}

// Modal Component
function SubCategoryModal({ isOpen, onClose, onSubmit, initialData, categoryName }: SubCategoryModalProps) {
  const [name, setName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [currentImageUrl, setCurrentImageUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setCurrentImageUrl(initialData.image || "");
        setImagePreview(initialData.image || "");
      } else {
        setName("");
        setCurrentImageUrl("");
        setImagePreview("");
        setImageFile(null);
      }
      setError("");
    }
  }, [isOpen, initialData]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || "Invalid image file");
      return;
    }

    setImageFile(file);
    setError("");

    try {
      const preview = await createImagePreview(file);
      setImagePreview(preview);
    } catch (err) {
      setError("Failed to create image preview");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a subcategory name");
      return;
    }
    if (!imageFile && !currentImageUrl && !initialData) {
      setError("Subcategory image is required");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        image: currentImageUrl || null,
        imageFile: imageFile,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save subcategory");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-semibold text-neutral-900">
            {initialData ? "Edit Subcategory" : "Add New Subcategory"}
          </h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">
              Parent Category
            </label>
            <div className="px-3 py-2 bg-neutral-100 rounded-lg text-neutral-700 text-sm font-medium">
              {categoryName}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Subcategory Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              placeholder="e.g. Fresh Vegetables"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Icon / Image
            </label>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-24 h-24 bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200 relative group">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-400">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                  </div>
                )}
                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <span className="text-white text-xs font-medium">Change</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex-1 text-xs text-neutral-500 mt-2">
                <p>Upload a square image for best results.</p>
                <p className="mt-1">Supported formats: JPG, PNG, WEBP.</p>
                <p>Max size: 5MB.</p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-70 flex items-center gap-2"
              disabled={loading}
            >
              {loading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {initialData ? "Save Changes" : "Create Subcategory"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminSubCategory() {
  const { isAuthenticated, token } = useAuth();

  // Data States
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // UI States
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingSubCategories, setLoadingSubCategories] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);

  // Load Categories on Mount
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchCategories();
    }
  }, [isAuthenticated, token]);

  // Load Subcategories when Category Selected
  useEffect(() => {
    if (selectedCategoryId) {
      fetchSubCategories(selectedCategoryId);
    } else {
      setSubCategories([]);
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

      // Fetch from both sources in parallel
      const [legacyResponse, recursiveResponse] = await Promise.all([
        getSubCategories({ category: categoryId }),
        getCategories({ parentId: categoryId })
      ]);

      let combinedData: SubCategory[] = [];

      // 1. Process "Real" SubCategories
      if (legacyResponse.success && Array.isArray(legacyResponse.data)) {
        combinedData = [...legacyResponse.data];
      }

      // 2. Process Recursive Categories (Child Categories behaving as SubCategories)
      if (recursiveResponse.success && Array.isArray(recursiveResponse.data)) {
        const mappedCategories: SubCategory[] = recursiveResponse.data.map(cat => ({
          _id: cat._id,
          name: cat.name,
          image: cat.image,
          category: cat.parentId || categoryId, // Map parentId to category
          order: cat.order || 0,
          totalProduct: undefined, // Categories might not have this count readily available
          createdAt: cat.createdAt,
          updatedAt: cat.updatedAt
        }));

        // Merge avoiding duplicates (though IDs should be unique across collections ideally, be safe)
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
      // Don't clear data on error, maybe show notification
    } finally {
      setLoadingSubCategories(false);
    }
  };

  const handleCreateOrUpdate = async (data: { name: string; image: string | null; imageFile: File | null }) => {
    if (!selectedCategoryId) return;

    let imageUrl = data.image;

    // Upload image if provided
    if (data.imageFile) {
      const uploadResult = await uploadImage(data.imageFile, "apnasabjiwala/subcategories");
      imageUrl = uploadResult.secureUrl;
    }

    if (!imageUrl) {
      throw new Error("Image upload failed");
    }

    const payload = {
      name: data.name,
      category: selectedCategoryId,
      image: imageUrl,
    };

    if (editingSubCategory) {
      const response = await updateSubCategory(editingSubCategory._id, payload);
      if (response.success) {
        setSubCategories(prev => prev.map(item => item._id === editingSubCategory._id ? response.data : item));
      } else {
        throw new Error(response.message || "Update failed");
      }
    } else {
      const response = await createSubCategory(payload);
      if (response.success) {
        setSubCategories(prev => [...prev, response.data]);
      } else {
        throw new Error(response.message || "Creation failed");
      }
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this subcategory? This action cannot be undone.")) {
      try {
        const response = await deleteSubCategory(id);
        if (response.success) {
          setSubCategories(prev => prev.filter(item => item._id !== id));
        } else {
          alert("Failed to delete");
        }
      } catch (error) {
        console.error("Delete error", error);
        alert("An error occurred while deleting");
      }
    }
  };

  const openCreateModal = () => {
    setEditingSubCategory(null);
    setIsModalOpen(true);
  };

  const openEditModal = (subCategory: SubCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSubCategory(subCategory);
    setIsModalOpen(true);
  };

  // Filter categories sidebar
  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const selectedCategory = categories.find(c => c._id === selectedCategoryId);

  return (
    <div className="flex h-[calc(100vh-6rem)] -m-6 bg-gray-50 overflow-hidden">
      {/* Sidebar - Categories List */}
      <div className="w-80 bg-white border-r border-neutral-200 flex flex-col h-full flex-shrink-0 z-10 shadow-sm transition-all">
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
                    {item.childrenCount || 0} subcategories
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

      {/* Main Content - Subcategories */}
      <div className="flex-1 flex flex-col h-full bg-gray-50 min-w-0">
        {!selectedCategoryId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 p-8">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-neutral-100">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-neutral-600 mb-2">Select a Category</h3>
            <p className="text-base text-neutral-400 max-w-sm text-center">
              Choose a category from the sidebar to view, manage, and add new subcategories.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-8 py-6 bg-white border-b border-neutral-200 flex justify-between items-center shadow-sm z-10 sticky top-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 uppercase tracking-widest border border-teal-100">Selected Category</span>
                </div>
                <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-3">
                  {selectedCategory?.name}
                  <span className="text-sm font-normal text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200">
                    {subCategories.length}
                  </span>
                </h1>
              </div>

              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-md hover:shadow-lg active:scale-95 border border-teal-500"
              >
                <PlusIcon />
                <span>Add Subcategory</span>
              </button>
            </div>

            {/* Content Grid */}
            <div className="flex-1 overflow-y-auto p-8">
              {loadingSubCategories ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-white rounded-xl shadow-sm border border-neutral-100 h-64 animate-pulse flex flex-col">
                      <div className="h-40 bg-neutral-100 rounded-t-xl" />
                      <div className="p-4 space-y-3 flex-1">
                        <div className="h-4 w-3/4 bg-neutral-100 rounded" />
                        <div className="h-3 w-1/2 bg-neutral-100 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : subCategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-neutral-200 rounded-xl bg-white/50 h-96">
                  <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
                    <PlusIcon />
                  </div>
                  <p className="text-neutral-900 font-semibold text-lg">No subcategories yet</p>
                  <p className="text-neutral-500 text-sm mt-1 mb-6">This category doesn't have any subcategories.</p>
                  <button
                    onClick={openCreateModal}
                    className="px-6 py-2 bg-white border border-neutral-300 shadow-sm text-neutral-700 font-medium rounded-lg hover:bg-neutral-50 hover:border-neutral-400 transition-all"
                  >
                    Create First Subcategory
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-12">
                  {subCategories.map((sub) => (
                    <div
                      key={sub._id}
                      className="group bg-white rounded-xl shadow-sm border border-neutral-200 hover:border-teal-400 hover:shadow-lg hover:shadow-teal-900/5 transition-all duration-300 overflow-hidden flex flex-col relative"
                    >
                      {/* Image Area */}
                      <div className="relative aspect-square bg-neutral-50 overflow-hidden border-b border-neutral-100">
                        {sub.image ? (
                          <img
                            src={sub.image}
                            alt={sub.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-300 bg-neutral-50">
                            <span className="text-4xl font-bold opacity-30 select-none">{sub.name.charAt(0)}</span>
                          </div>
                        )}

                        {/* Overlay Actions */}
                        <div className="absolute inset-x-0 bottom-4 flex justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
                          <button
                            onClick={(e) => openEditModal(sub, e)}
                            className="flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-sm text-neutral-700 rounded-full hover:bg-teal-50 hover:text-teal-700 shadow-lg border border-transparent hover:border-teal-100 transition-all text-xs font-bold uppercase tracking-wider"
                            title="Edit"
                          >
                            <span className="w-4 h-4"><EditIcon /></span>
                            Edit
                          </button>
                          <button
                            onClick={(e) => handleDelete(sub._id, e)}
                            className="p-2 bg-white/95 backdrop-blur-sm text-red-500 rounded-full hover:bg-red-50 hover:text-red-700 shadow-lg border border-transparent hover:border-red-100 transition-all"
                            title="Delete"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>

                      {/* Info Area */}
                      <div className="p-4 flex-1 flex flex-col justify-center text-center">
                        <h3 className="font-semibold text-neutral-800 group-hover:text-teal-700 transition-colors truncate px-2" title={sub.name}>
                          {sub.name}
                        </h3>
                        {/* <p className="text-xs text-neutral-400 mt-1">
                          ID: {sub._id.slice(-6)}
                        </p> */}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal Overlay */}
      <SubCategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateOrUpdate}
        initialData={editingSubCategory}
        categoryName={selectedCategory?.name || ""}
      />
    </div>
  );
}
