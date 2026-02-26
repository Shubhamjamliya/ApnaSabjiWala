import { useEffect, useState } from "react";
import { getCategories } from "../../services/api/categoryService";
import CategoryTileSection from "./components/CategoryTileSection";

export default function Categories() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getCategories();
        if (response.success && response.data) {
          // Map to match the tile expected format
          const mappedCategories = response.data.map(c => ({
            id: c._id,
            name: c.name,
            image: c.image || "",
            slug: (c as any).slug || c._id,
            type: "category"
          }));
          setCategories(mappedCategories);
        } else {
          setError("Failed to load categories. Please try again.");
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
        setError("Network error. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading && !categories?.length) {
    return null; // Let global IconLoader handle it
  }

  if (error && !categories?.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center bg-white">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Oops! Something went wrong</h3>
        <p className="text-gray-600 mb-6 max-w-xs">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 transition-colors"
        >
          Try Refreshing
        </button>
      </div>
    );
  }



  return (
    <div className="pb-4 md:pb-8 bg-white min-h-screen">
      {/* Page Header */}
      <div className="px-4 py-4 md:px-6 md:py-6 bg-white border-b border-neutral-200 sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl md:text-2xl font-bold text-neutral-900">All Categories</h1>
      </div>

      <div className="bg-neutral-50 pt-1 md:pt-4">
        {categories && categories.length > 0 ? (
          <div className="px-4 md:px-6 lg:px-8">
            <CategoryTileSection
              title=""
              tiles={categories}
              columns={4}
              showProductCount={false}
            />
          </div>
        ) : (
          <div className="text-center py-12 md:py-16 text-neutral-500 px-4">
            <p className="text-lg md:text-xl mb-2">No categories found</p>
            <p className="text-sm md:text-base">
              Categories are being updated. Please check back soon.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

