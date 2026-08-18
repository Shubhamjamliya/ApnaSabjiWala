import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { useToast } from "../../../context/ToastContext";
import { uploadImage } from "../../../services/api/uploadService";
import {
  AdBanner,
  createAdBanner,
  deleteAdBanner,
  getAdBanners,
  updateAdBanner,
} from "../../../services/api/admin/adminAdBannerService";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const emptyForm = { title: "", linkUrl: "", imageUrl: "", isActive: true, order: 0 };

const errorMessage = (error: unknown, fallback: string) =>
  isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message || fallback
    : error instanceof Error ? error.message : fallback;

export default function AdminAdsBanner() {
  const { showToast } = useToast();
  const [banners, setBanners] = useState<AdBanner[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadBanners = async () => {
    try {
      setLoading(true);
      const response = await getAdBanners();
      if (response.success) setBanners(response.data);
    } catch (loadError) {
      showToast(errorMessage(loadError, "Failed to load ads banners"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadBanners(); }, []);
  useEffect(() => () => {
    if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const resetForm = () => {
    setForm({ ...emptyForm, order: banners.length });
    setEditingId(null);
    setImageFile(null);
    setPreviewUrl("");
    setError("");
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Banner must be a JPG, PNG, or WEBP image.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Banner image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }
    setError("");
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const editBanner = (banner: AdBanner) => {
    setEditingId(banner._id);
    setForm({
      title: banner.title || "",
      linkUrl: banner.linkUrl,
      imageUrl: banner.imageUrl,
      isActive: banner.isActive,
      order: banner.order,
    });
    setImageFile(null);
    setPreviewUrl(banner.imageUrl);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!imageFile && !form.imageUrl) return setError("Please upload a banner image.");

    try {
      const url = new URL(form.linkUrl.trim());
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch {
      return setError("Enter a valid link starting with http:// or https://.");
    }

    try {
      setSaving(true);
      let imageUrl = form.imageUrl;
      if (imageFile) {
        const uploaded = await uploadImage(imageFile, "barodamart/ads-banners");
        imageUrl = uploaded.secureUrl || uploaded.url;
      }
      const payload = { ...form, imageUrl, linkUrl: form.linkUrl.trim(), order: Number(form.order) };
      if (editingId) await updateAdBanner(editingId, payload);
      else await createAdBanner(payload);
      showToast(editingId ? "Ads banner updated successfully" : "Ads banner added successfully");
      resetForm();
      await loadBanners();
    } catch (saveError) {
      setError(errorMessage(saveError, "Failed to save ads banner"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (banner: AdBanner) => {
    if (!window.confirm(`Delete${banner.title ? ` “${banner.title}”` : " this ads banner"}?`)) return;
    try {
      setDeletingId(banner._id);
      await deleteAdBanner(banner._id);
      if (editingId === banner._id) resetForm();
      setBanners((current) => current.filter((item) => item._id !== banner._id));
      showToast("Ads banner deleted successfully");
    } catch (deleteError) {
      showToast(errorMessage(deleteError, "Failed to delete ads banner"), "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">Ads Banner</h1>
            <p className="mt-1 text-sm text-neutral-500">Add any number of linked banners to the home-page carousel.</p>
          </div>
          <div className="text-sm text-neutral-600"><span className="text-blue-600">Home</span> / Ads Banner</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-neutral-50 p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <form onSubmit={handleSubmit} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-neutral-900">{editingId ? "Edit Ads Banner" : "Add Ads Banner"}</h2>
              {editingId && <button type="button" onClick={resetForm} className="text-sm font-medium text-neutral-600 hover:text-neutral-900">Cancel edit</button>}
            </div>
            {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-4">
                <div className="aspect-[8/3] overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-100">
                  {previewUrl ? <img src={previewUrl} alt="Ads banner preview" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-neutral-500">Banner preview</div>}
                </div>
                <div>
                  <label htmlFor="ads-banner-image" className="mb-1.5 block text-sm font-medium text-neutral-800">Upload Banner <span className="text-red-600">*</span></label>
                  <input id="ads-banner-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-teal-700" />
                  <p className="mt-1 text-xs text-neutral-500">Recommended 1600 × 600 px. JPG, PNG or WEBP; maximum 5 MB.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="ads-title" className="mb-1.5 block text-sm font-medium text-neutral-800">Title <span className="text-neutral-400">(optional)</span></label>
                  <input id="ads-title" maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Summer offer" className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label htmlFor="ads-link" className="mb-1.5 block text-sm font-medium text-neutral-800">Destination Link <span className="text-red-600">*</span></label>
                  <input id="ads-link" type="url" required maxLength={2048} value={form.linkUrl} onChange={(event) => setForm({ ...form, linkUrl: event.target.value })} placeholder="https://play.google.com/store/apps/..." className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500" />
                  <p className="mt-1 text-xs text-neutral-500">Play Store, App Store, website, or another HTTPS link.</p>
                </div>
                <div>
                  <label htmlFor="ads-order" className="mb-1.5 block text-sm font-medium text-neutral-800">Display Order</label>
                  <input id="ads-order" type="number" min="0" step="1" required value={form.order} onChange={(event) => setForm({ ...form, order: Number(event.target.value) })} className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500" />
                </div>
                <label className="flex items-center justify-between rounded-lg border border-neutral-200 p-3">
                  <span><span className="block text-sm font-medium text-neutral-900">Active</span><span className="block text-xs text-neutral-500">Show this banner in the carousel.</span></span>
                  <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="h-5 w-5 rounded border-neutral-300 text-teal-600 focus:ring-teal-500" />
                </label>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button type="submit" disabled={saving} className="rounded-lg bg-teal-600 px-7 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">{saving ? "Uploading and saving..." : editingId ? "Update Banner" : "Add Banner"}</button>
            </div>
          </form>

          <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="mb-4 font-semibold text-neutral-900">Uploaded Banners ({banners.length})</h2>
            {loading ? <div className="py-10 text-center text-sm text-neutral-500">Loading banners...</div> : banners.length === 0 ? <div className="rounded-lg border border-dashed border-neutral-300 py-10 text-center text-sm text-neutral-500">No ads banners added yet.</div> : (
              <div className="grid gap-4 sm:grid-cols-2">
                {banners.map((banner) => (
                  <article key={banner._id} className="overflow-hidden rounded-xl border border-neutral-200">
                    <div className="aspect-[8/3] bg-neutral-100"><img src={banner.imageUrl} alt={banner.title || "Ads banner"} className="h-full w-full object-cover" /></div>
                    <div className="space-y-2 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><p className="truncate text-sm font-semibold text-neutral-900">{banner.title || "Untitled banner"}</p><p className="truncate text-xs text-neutral-500">{banner.linkUrl}</p></div>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${banner.isActive ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-600"}`}>{banner.isActive ? "Active" : "Hidden"}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-neutral-100 pt-2">
                        <span className="text-xs text-neutral-500">Order: {banner.order}</span>
                        <div className="flex gap-2"><button type="button" onClick={() => editBanner(banner)} className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50">Edit</button><button type="button" disabled={deletingId === banner._id} onClick={() => void handleDelete(banner)} className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">{deletingId === banner._id ? "Deleting..." : "Delete"}</button></div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
