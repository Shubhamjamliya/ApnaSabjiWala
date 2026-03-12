import { useState, useEffect, useRef } from "react";
import api from "../../../services/api/config";
import { useToast } from "../../../context/ToastContext";
import { uploadImage } from "../../../services/api/uploadService";
import { validateImageFile } from "../../../utils/imageUpload";

// Types
interface RewardItem {
  _id: string;
  name: string;
  description: string;
  coinsRequired: number;
  imageUrl?: string;
  stock: number;
  isActive: boolean;
}

export default function AdminRewards() {
  const { showToast } = useToast();
  const [items, setItems] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<RewardItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    coinsRequired: 1,
    imageUrl: "",
    stock: 0,
    isActive: true,
  });

  const fetchItems = async () => {
    try {
      const res = await api.get("/admin/rewards/items");
      if (res.data.success) {
        setItems(res.data.data);
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to fetch reward items", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleOpenModal = (item?: RewardItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description,
        coinsRequired: item.coinsRequired,
        imageUrl: item.imageUrl || "",
        stock: item.stock,
        isActive: item.isActive,
      });
      setImagePreview(item.imageUrl || "");
    } else {
      setEditingItem(null);
      setFormData({
        name: "",
        description: "",
        coinsRequired: 1,
        imageUrl: "",
        stock: 0,
        isActive: true,
      });
      setImagePreview("");
    }
    setImageFile(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setImageFile(null);
    setImagePreview("");
  };

  // ------- Image handling -------
  const processFile = (file: File) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      showToast(validation.error || "Invalid file", "error");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    setFormData((prev) => ({ ...prev, imageUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ------- Submit -------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let finalImageUrl = formData.imageUrl;

      // Upload new image to Cloudinary if a new file was selected
      if (imageFile) {
        setUploading(true);
        try {
          const uploadResult = await uploadImage(imageFile, "rewards");
          finalImageUrl = uploadResult.secureUrl;
        } catch (uploadError: any) {
          showToast(uploadError.message || "Image upload failed", "error");
          setUploading(false);
          setSubmitting(false);
          return;
        }
        setUploading(false);
      }

      const payload = { ...formData, imageUrl: finalImageUrl };

      if (editingItem) {
        await api.put(`/admin/rewards/items/${editingItem._id}`, payload);
        showToast("Reward item updated", "success");
      } else {
        await api.post("/admin/rewards/items", payload);
        showToast("Reward item added", "success");
      }

      handleCloseModal();
      fetchItems();
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to save reward item", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Rewards</h1>
          <p className="mt-2 text-sm text-gray-700">Add, edit or update stock for reward items.</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            + Add Reward Item
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Item</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Coins Required</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Stock</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Edit</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {items.map((item) => (
                    <tr key={item._id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                        <div className="flex items-center">
                          <div className="h-12 w-12 flex-shrink-0">
                            <img
                              className="h-12 w-12 rounded-lg bg-gray-100 object-cover border border-gray-200"
                              src={item.imageUrl || "https://placehold.co/100x100?text=🎁"}
                              alt=""
                              onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=🎁"; }}
                            />
                          </div>
                          <div className="ml-4">
                            <div className="font-medium text-gray-900">{item.name}</div>
                            <div className="text-gray-500 text-xs truncate max-w-[200px]">{item.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-teal-700">🪙 {item.coinsRequired}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.stock} in stock</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${item.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button onClick={() => handleOpenModal(item)} className="text-teal-600 hover:text-teal-900 font-semibold">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {items.length === 0 && (
                <div className="p-12 text-center">
                  <div className="text-5xl mb-4">🎁</div>
                  <p className="text-gray-500 font-medium">No reward items yet. Add one to get started!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingItem ? "Edit Reward Item" : "Add Reward Item"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Free Coffee, Discount Coupon"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Describe the reward item..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"
                />
              </div>

              {/* Coins & Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">🪙 Coins Required *</label>
                  <input
                    required
                    min="1"
                    type="number"
                    value={formData.coinsRequired}
                    onChange={(e) => setFormData({ ...formData, coinsRequired: parseInt(e.target.value) || 1 })}
                    className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">📦 Stock *</label>
                  <input
                    required
                    min="0"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    className="block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reward Image</label>

                {/* If we have a preview, show it */}
                {imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-44 object-contain"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      {/* Change image */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white shadow text-xs font-semibold text-teal-700 border border-teal-200 px-2.5 py-1 rounded-lg hover:bg-teal-50 transition-colors"
                      >
                        Change
                      </button>
                      {/* Remove image */}
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="bg-white shadow text-xs font-semibold text-red-500 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                    {imageFile && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs text-center py-1 truncate px-2">
                        {imageFile.name}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Drop zone */
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${isDragging
                        ? "border-teal-500 bg-teal-50 scale-[1.01]"
                        : "border-gray-300 hover:border-teal-400 hover:bg-gray-50"
                      }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isDragging ? "bg-teal-100" : "bg-gray-100"}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={isDragging ? "text-teal-600" : "text-gray-400"}>
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700">
                          {isDragging ? "Drop image here" : "Click or drag image here"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WebP · Max 5 MB</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-900 cursor-pointer select-none">
                  Active — Show this item to customers
                </label>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="bg-white border border-gray-300 py-2 px-4 rounded-lg text-sm font-medium shadow-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploading}
                  className="bg-teal-600 border border-transparent py-2 px-5 rounded-lg text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {(submitting || uploading) ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      {uploading ? "Uploading..." : "Saving..."}
                    </>
                  ) : (
                    editingItem ? "Update Item" : "Add Item"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
