import { useState, useEffect, useMemo, useRef } from 'react';
import {
  getHeaderCategoriesAdmin,
  createHeaderCategory,
  updateHeaderCategory,
  deleteHeaderCategory,
  HeaderCategory
} from '../../../services/api/headerCategoryService';
import { themes } from '../../../utils/themes';
import { getCategories, Category } from '../../../services/api/admin/adminProductService';
import { uploadImage } from '../../../services/api/uploadService';
import { validateImageFile, createImagePreview } from '../../../utils/imageUpload';

export default function AdminHeaderCategory() {
  const [headerCategories, setHeaderCategories] = useState<HeaderCategory[]>([]);
  const [productCategories, setProductCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [headerCategoryName, setHeaderCategoryName] = useState('');
  const [headerCategoryImage, setHeaderCategoryImage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(''); // Slug of product category
  const [selectedTheme, setSelectedTheme] = useState('all'); // Maps to slug/color
  const [selectedStatus, setSelectedStatus] = useState<'Published' | 'Unpublished'>('Published');
  const [editingId, setEditingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const themeOptions = Object.keys(themes);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [headerData, productData] = await Promise.all([
        getHeaderCategoriesAdmin(),
        getCategories({ status: 'Active' })
      ]);
      setHeaderCategories(headerData);
      if (productData.success) {
        setProductCategories(productData.data);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setHeaderCategoryName('');
    setHeaderCategoryImage('');
    setImageFile(null);
    setImagePreview('');
    setSelectedCategory('');
    setSelectedTheme('all');
    setSelectedStatus('Published');
    setEditingId(null);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setImageFile(file);
    try {
      const preview = await createImagePreview(file);
      setImagePreview(preview);
    } catch (err) {
      console.error('Preview error', err);
    }
  };

  const handleAddOrUpdate = async () => {
    if (!headerCategoryName.trim()) return alert('Please enter a header category name');
    if (!headerCategoryImage && !imageFile && !editingId) return alert('Please upload a logo');

    try {
      setLoading(true);
      let finalImageUrl = headerCategoryImage;

      // Handle Image Upload to Cloudinary
      if (imageFile) {
        setUploadingImage(true);
        const uploadRes = await uploadImage(imageFile, 'apnasabjiwala/header_categories');
        finalImageUrl = uploadRes.secureUrl;
        setUploadingImage(false);
      }

      const payload = {
        name: headerCategoryName,
        image: finalImageUrl,
        slug: selectedTheme, // Theme identifier
        relatedCategory: selectedCategory, // Slug of the linked product category
        status: selectedStatus,
      };

      if (editingId) {
        await updateHeaderCategory(editingId, payload);
        alert('Header Category updated successfully!');
      } else {
        await createHeaderCategory(payload);
        alert('Header Category added successfully!');
      }

      fetchData();
      resetForm();
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  const handleEdit = (category: HeaderCategory) => {
    setEditingId(category._id);
    setHeaderCategoryName(category.name);
    setHeaderCategoryImage(category.image || '');
    setImagePreview(category.image || '');
    setSelectedCategory(category.relatedCategory || '');
    setSelectedTheme(category.slug);
    setSelectedStatus(category.status);
    setImageFile(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this header category?')) {
      try {
        await deleteHeaderCategory(id);
        alert('Header Category deleted successfully!');
        fetchCategories();
      } catch (error) {
        console.error(error);
        alert('Failed to delete category');
      }
    }
  };

  // Table states
  const [entriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredCategories = headerCategories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.relatedCategory || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.slug || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCategories.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const displayedCategories = filteredCategories.slice(startIndex, endIndex);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-800">Header Category</h1>
          <p className="text-sm text-neutral-500 mt-1">Configure main navigation categories seen on the app home header.</p>
        </div>
        <div className="text-sm">
          <span className="text-blue-500 hover:underline cursor-pointer">Admin</span>{' '}
          <span className="text-neutral-400">/</span> Header Navigation
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Panel - Add/Edit Form */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden h-fit">
          <div className="bg-teal-600 text-white px-6 py-4">
            <h2 className="text-lg font-semibold">
              {editingId ? 'Update Header Tab' : 'Create New Header Tab'}
            </h2>
          </div>
          <div className="p-6 space-y-5">
            {/* Header Category Name */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                Display Name:
              </label>
              <input
                type="text"
                value={headerCategoryName}
                onChange={(e) => setHeaderCategoryName(e.target.value)}
                placeholder="e.g. Grocery, Fruits, Dairy"
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              />
            </div>

            {/* Logo Upload Section */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                Header Logo (Icon):
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all
                  ${imagePreview ? 'border-teal-400 bg-teal-50' : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100'}
                `}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />

                {imagePreview ? (
                  <div className="relative group">
                    <img src={imagePreview} alt="Preview" className="w-20 h-20 object-contain rounded-lg shadow-sm" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-all">
                      <span className="text-[10px] text-white font-bold bg-black/50 px-2 py-1 rounded">Update</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="p-3 bg-white rounded-full shadow-sm mb-2">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-neutral-600">Click to upload logo</span>
                    <span className="text-[10px] text-neutral-400 mt-1">PNG, JPG or SVG (Max 1MB)</span>
                  </div>
                )}

                {uploadingImage && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-teal-600">Uploading...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Related Product Category */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                Linked Product Category:
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select Category (Optional)</option>
                {productCategories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-neutral-500 italic">This identifies which products to show in this tab.</p>
            </div>

            {/* Theme / Color Selection */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                Brand Color:
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                {themeOptions.filter(t => t !== 'all').map(themeKey => {
                  const themeObj = themes[themeKey];
                  const color = themeObj.primary[0];
                  const isSelected = selectedTheme === themeKey;

                  return (
                    <div
                      key={themeKey}
                      onClick={() => setSelectedTheme(themeKey)}
                      className={`
                        cursor-pointer flex flex-col items-center justify-center p-2 rounded-lg transition-all
                        ${isSelected ? 'bg-white shadow-md ring-2 ring-teal-500' : 'hover:bg-neutral-200'}
                      `}
                    >
                      <div
                        className="w-6 h-6 rounded-full border border-black/10 shadow-inner"
                        style={{ background: color }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status & Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-neutral-700">Display Status:</span>
                <div
                  onClick={() => setSelectedStatus(selectedStatus === 'Published' ? 'Unpublished' : 'Published')}
                  className={`
                    flex items-center w-12 h-6 rounded-full cursor-pointer transition-all p-1
                    ${selectedStatus === 'Published' ? 'bg-green-500' : 'bg-neutral-300'}
                  `}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all ${selectedStatus === 'Published' ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
                <span className={`text-[10px] font-bold uppercase ${selectedStatus === 'Published' ? 'text-green-600' : 'text-neutral-500'}`}>
                  {selectedStatus}
                </span>
              </div>

              <div className="flex gap-2">
                {editingId && (
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 border border-neutral-300 text-neutral-600 rounded-lg text-sm font-bold hover:bg-neutral-50 transition"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleAddOrUpdate}
                  className="bg-teal-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 transition shadow-md shadow-teal-900/10 active:scale-95"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Tab List */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-neutral-200 flex justify-between items-center bg-neutral-50">
            <h3 className="font-bold text-neutral-700 flex items-center gap-2">
              Navigation Tabs
              <span className="text-[10px] bg-neutral-200 px-2 py-0.5 rounded-full text-neutral-600">
                {headerCategories.length}
              </span>
            </h3>

            <div className="relative">
              <input
                type="text"
                placeholder="Find tab..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-4 py-1.5 text-xs border border-neutral-300 rounded-full w-40 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
              />
              <svg className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="overflow-x-auto flex-1 h-[500px] custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-neutral-50 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-200">Tab Details</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-200 text-center">Color</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-200 text-center">Status</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-200 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {displayedCategories.map((category) => (
                  <tr key={category._id} className="hover:bg-teal-50/30 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-neutral-50 rounded-lg flex items-center justify-center p-1 border border-neutral-100">
                          <img src={category.image || '/placeholder.png'} alt="" className="max-w-full max-h-full object-contain" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-neutral-800">{category.name}</p>
                          <p className="text-[10px] text-teal-600 font-medium">L: {category.relatedCategory || 'All Categories'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="w-4 h-4 rounded-full mx-auto shadow-sm border border-black/10" style={{ background: themes[category.slug]?.primary[0] || '#ccc' }} />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${category.status === 'Published' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-neutral-100 text-neutral-500'}`}>
                        {category.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleEdit(category)}
                          className="p-1.5 text-neutral-400 hover:text-teal-600 hover:bg-white rounded-lg transition-all"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button
                          onClick={() => handleDelete(category._id)}
                          className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
            <span className="text-[10px] text-neutral-500 font-medium">Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 text-[10px] font-bold border border-neutral-300 rounded bg-white hover:bg-neutral-50 disabled:opacity-50"
              >Prev</button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-[10px] font-bold border border-neutral-300 rounded bg-white hover:bg-neutral-50 disabled:opacity-50"
              >Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
