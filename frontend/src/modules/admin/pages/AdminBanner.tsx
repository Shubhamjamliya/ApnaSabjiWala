import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { useToast } from '../../../context/ToastContext';
import { uploadImage } from '../../../services/api/uploadService';
import { getProducts, type Product } from '../../../services/api/admin/adminProductService';
import {
  getHomeBannerSettings,
  updateHomeBannerSettings,
} from '../../../services/api/admin/adminSettingsService';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function AdminBanner() {
  const { showToast } = useToast();
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [bannerResponse, productsResponse] = await Promise.all([
          getHomeBannerSettings(),
          getProducts({ limit: 1000, status: 'Active', publish: true }),
        ]);

        if (bannerResponse.success && bannerResponse.data) {
          const banner = bannerResponse.data;
          setImageUrl(banner.imageUrl || '');
          setPreviewUrl(banner.imageUrl || '');
          setSelectedProductId(
            typeof banner.product === 'string' ? banner.product : banner.product?._id || ''
          );
          setIsActive(banner.isActive !== false);
        }

        if (productsResponse.success) {
          setProducts(productsResponse.data);
        }
      } catch (loadError) {
        console.error(loadError);
        showToast('Failed to load banner settings', 'error');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [showToast]);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      product.productName.toLowerCase().includes(query) ||
      product.sku?.toLowerCase().includes(query)
    );
  }, [products, search]);

  const selectedProduct = products.find((product) => product._id === selectedProductId);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Banner must be a JPG, PNG, or WEBP image.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Banner image must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }

    setError('');
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!imageFile && !imageUrl) {
      setError('Please upload a banner image.');
      return;
    }
    if (!selectedProductId) {
      setError('Please select the product that should open from this banner.');
      return;
    }

    try {
      setSaving(true);
      let finalImageUrl = imageUrl;

      if (imageFile) {
        const uploaded = await uploadImage(imageFile, 'barodamart/home-banners');
        finalImageUrl = uploaded.secureUrl || uploaded.url;
      }

      const response = await updateHomeBannerSettings({
        imageUrl: finalImageUrl,
        productId: selectedProductId,
        isActive,
      });

      if (response.success) {
        setImageUrl(response.data.imageUrl);
        setPreviewUrl(response.data.imageUrl);
        setImageFile(null);
        showToast('Home banner updated successfully');
      }
    } catch (saveError: unknown) {
      console.error(saveError);
      const message = isAxiosError<{ message?: string }>(saveError)
        ? saveError.response?.data?.message
        : saveError instanceof Error
          ? saveError.message
          : undefined;
      setError(message || 'Failed to save the banner.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">Banner</h1>
            <p className="mt-1 text-sm text-neutral-500">Manage the clickable banner above Popular Categories.</p>
          </div>
          <div className="text-sm text-neutral-600"><span className="text-blue-600">Home</span> / Banner</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-neutral-50 p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-6">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 px-4 py-4 sm:px-6">
              <h2 className="font-semibold text-neutral-900">Banner Image</h2>
            </div>
            <div className="space-y-4 p-4 sm:p-6">
              <div className="aspect-[2/1] w-full overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-100">
                {previewUrl ? (
                  <img src={previewUrl} alt="Home banner preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center px-4 text-center text-sm text-neutral-500">
                    Banner preview will appear here
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="banner-image" className="mb-1.5 block text-sm font-medium text-neutral-800">
                  Upload Banner <span className="text-red-600">*</span>
                </label>
                <input
                  id="banner-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:font-medium file:text-teal-700 hover:file:bg-teal-100"
                />
                <p className="mt-1.5 text-xs text-neutral-500">Recommended: 1600 × 800 px (2:1). JPG, PNG or WEBP, maximum 5 MB.</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 px-4 py-4 sm:px-6">
              <h2 className="font-semibold text-neutral-900">Linked Product</h2>
            </div>
            <div className="space-y-4 p-4 sm:p-6">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search product by name or SKU..."
                className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
              />

              {selectedProduct && (
                <div className="flex items-center gap-3 rounded-lg border border-teal-200 bg-teal-50 p-3">
                  <div className="h-12 w-12 overflow-hidden rounded-lg bg-white">
                    {selectedProduct.mainImage && <img src={selectedProduct.mainImage} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-neutral-900">{selectedProduct.productName}</p>
                    <p className="text-xs text-teal-700">Selected product</p>
                  </div>
                </div>
              )}

              <div className="max-h-72 overflow-y-auto rounded-lg border border-neutral-200">
                {filteredProducts.length > 0 ? filteredProducts.map((product) => {
                  const selected = product._id === selectedProductId;
                  return (
                    <button
                      key={product._id}
                      type="button"
                      onClick={() => setSelectedProductId(product._id)}
                      className={`flex w-full items-center gap-3 border-b border-neutral-100 p-3 text-left last:border-0 ${selected ? 'bg-teal-50' : 'hover:bg-neutral-50'}`}
                    >
                      <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-md bg-neutral-100">
                        {product.mainImage && <img src={product.mainImage} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-800">{product.productName}</span>
                      {selected && <span className="text-xs font-semibold text-teal-700">Selected</span>}
                    </button>
                  );
                }) : (
                  <p className="p-6 text-center text-sm text-neutral-500">No active published products found.</p>
                )}
              </div>

              <label className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 p-4">
                <div>
                  <span className="block text-sm font-medium text-neutral-900">Show banner on home page</span>
                  <span className="block text-xs text-neutral-500">Turn this off to temporarily hide the banner.</span>
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="h-5 w-5 rounded border-neutral-300 text-teal-600 focus:ring-teal-500"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-teal-600 px-8 py-2.5 font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Uploading and saving...' : 'Save Banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
