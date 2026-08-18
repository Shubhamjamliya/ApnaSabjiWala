import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import HomeHero from "./components/HomeHero";
import PromoStrip from "./components/PromoStrip";
import NextDayBookingCard from "./components/NextDayBookingCard";
import AdsBannerCarousel from "./components/AdsBannerCarousel";
import LowestPricesEver from "./components/LowestPricesEver";
import CategoryTileSection from "./components/CategoryTileSection";
import BestsellerCards from "./components/BestsellerCards";
import ProductCard from "./components/ProductCard";
import { getHomeContent, getHomeProducts } from "../../services/api/customerHomeService";
import { useLocation } from "../../hooks/useLocation";
import { useLoading } from "../../context/LoadingContext";
import PageLoader from "../../components/PageLoader";
import { useThemeContext } from "../../context/ThemeContext";
import UserHomeFooter from "./components/UserHomeFooter";

export default function Home() {
  const navigate = useNavigate();
  const { location } = useLocation();
  const { activeCategory, setActiveCategory, currentTheme: theme } = useThemeContext();
  const { startRouteLoading, stopRouteLoading } = useLoading();
  const activeTab = activeCategory;
  const setActiveTab = setActiveCategory;

  const contentRef = useRef<HTMLDivElement>(null);
  const scrollHandledRef = useRef(false);
  const SCROLL_POSITION_KEY = 'home-scroll-position';
  const isPageReload = useMemo(() => {
    if (typeof window === 'undefined' || typeof performance === 'undefined') return false;
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    return navEntry?.type === 'reload';
  }, []);

  // State for dynamic data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [homeData, setHomeData] = useState<any>({
    categories: [],
    subcategories: [],
    homeSections: [],
    shops: [],
    promoBanners: [],
    trending: [],
    cookingIdeas: [],
    lowestPrices: [],
    bestsellers: [],
    bestsellerCards: [],
    homeBanner: null,
  });

  const [products, setProducts] = useState<any[]>([]);
  const [productsPage, setProductsPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(false);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);

  // Function to save scroll position before navigation
  const saveScrollPosition = () => {
    const mainElement = document.querySelector('main');
    const scrollPos = Math.max(
      mainElement ? mainElement.scrollTop : 0,
      window.scrollY || 0,
      document.documentElement.scrollTop || 0
    );
    if (scrollPos > 0) {
      sessionStorage.setItem(SCROLL_POSITION_KEY, scrollPos.toString());
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        startRouteLoading();
        setLoading(true);
        setError(null);
        setProductsPage(1);

        const response = await getHomeContent(
          activeTab,
          location?.latitude,
          location?.longitude
        );
        if (response.success && response.data) {
          setHomeData(response.data);

          if (response.data.allProducts) {
            setProducts(response.data.allProducts);
            setHasMoreProducts(
              response.data.allProductsPagination?.hasMore ?? (response.data.allProducts.length >= 20)
            );
          } else if (response.data.bestsellers) {
            setProducts(response.data.bestsellers);
            setHasMoreProducts(false);
          }
        } else {
          setError("Failed to load content. Please try again.");
        }
      } catch (error) {
        console.error("Failed to fetch home content", error);
        setError("Network error. Please check your connection.");
      } finally {
        setLoading(false);
        stopRouteLoading();
      }
    };

    fetchData();
  }, [location?.latitude, location?.longitude, activeTab]);

  const handleLoadMoreProducts = async () => {
    if (loadingMoreProducts || !hasMoreProducts) return;
    try {
      setLoadingMoreProducts(true);
      const nextPage = productsPage + 1;
      const res = await getHomeProducts(
        activeTab,
        nextPage,
        20,
        location?.latitude,
        location?.longitude
      );
      if (res.success && res.data) {
        setProducts(prev => {
          const existingIds = new Set(prev.map(p => p.id || p._id));
          const newItems = res.data.filter((p: any) => !existingIds.has(p.id || p._id));
          return [...prev, ...newItems];
        });
        setProductsPage(nextPage);
        setHasMoreProducts(res.pagination?.hasMore ?? false);
      }
    } catch (err) {
      console.error("Failed to load more products:", err);
    } finally {
      setLoadingMoreProducts(false);
    }
  };

  // Restore scroll position when returning to this page
  useEffect(() => {
    if (!loading && homeData.shops) {
      if (scrollHandledRef.current) return;
      scrollHandledRef.current = true;

      if (isPageReload) {
        sessionStorage.removeItem(SCROLL_POSITION_KEY);
        const resetToTop = () => {
          const mainElement = document.querySelector('main');
          if (mainElement) {
            mainElement.scrollTop = 0;
          }
          window.scrollTo(0, 0);
        };
        requestAnimationFrame(resetToTop);
        setTimeout(resetToTop, 80);
        return;
      }

      const savedScrollPosition = sessionStorage.getItem(SCROLL_POSITION_KEY);
      if (savedScrollPosition) {
        const scrollY = parseInt(savedScrollPosition, 10);
        const performScroll = () => {
          const mainElement = document.querySelector('main');
          if (mainElement) {
            mainElement.scrollTop = scrollY;
          }
          window.scrollTo(0, scrollY);
        };

        requestAnimationFrame(() => {
          performScroll();
          requestAnimationFrame(() => {
            performScroll();
            setTimeout(performScroll, 100);
            setTimeout(performScroll, 300);
          });
        });

        setTimeout(() => {
          sessionStorage.removeItem(SCROLL_POSITION_KEY);
        }, 1000);
      } else {
        const performReset = () => {
          const mainElement = document.querySelector('main');
          if (mainElement) {
            mainElement.scrollTop = 0;
          }
          window.scrollTo(0, 0);
        };
        requestAnimationFrame(performReset);
        setTimeout(performReset, 100);
      }
    }
  }, [loading, homeData.shops, isPageReload]);

  // Global click/touch listener to save scroll position before any navigation
  useEffect(() => {
    const handleNavigationEvent = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('a') || target.closest('button') || target.closest('[role="button"]') || target.closest('.cursor-pointer')) {
        saveScrollPosition();
      }
    };

    window.addEventListener('click', handleNavigationEvent, { capture: true });
    window.addEventListener('touchstart', handleNavigationEvent, { capture: true, passive: true });
    return () => {
      window.removeEventListener('click', handleNavigationEvent, { capture: true });
      window.removeEventListener('touchstart', handleNavigationEvent, { capture: true });
    };
  }, []);

  const getFilteredProducts = (tabId: string) => {
    const availableProducts = products.filter(p => p.isAvailable !== false);
    if (tabId === "all") {
      return availableProducts;
    }
    return availableProducts.filter(
      (p) =>
        p.categoryId === tabId ||
        (p.category && (p.category._id === tabId || p.category.slug === tabId))
    );
  };

  const filteredProducts = useMemo(
    () => getFilteredProducts(activeTab),
    [activeTab, products]
  );

  if (loading && !products.length && !homeData.homeSections?.length) {
    return <PageLoader />;
  }

  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
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
    <div className="bg-white min-h-screen pb-20 md:pb-0" ref={contentRef}>
      {/* Hero Header with Gradient and Tabs */}
      <HomeHero
        activeTab={activeTab}
        onTabChange={setActiveTab}
        homeBanner={homeData.homeBanner}
      />

      {/* Promo Strip */}
      <PromoStrip activeTab={activeTab} data={homeData} />

      {/* Next Day Vegetable Booking Card */}
      <NextDayBookingCard />

      {/* External ads uploaded by admin */}
      <AdsBannerCarousel banners={homeData.promoBanners} />

      {/* LOWEST PRICES EVER Section */}
      <LowestPricesEver activeTab={activeTab} products={homeData.lowestPrices?.filter((p: any) => p.isAvailable !== false)} />

      {/* BESTSELLER CARDS (2x2 Grid) */}
      <BestsellerCards cards={homeData.bestsellerCards || []} />

      {/* Main content */}
      <div
        className="-mt-2 pt-1 space-y-5 md:space-y-8 md:pt-4"
        style={{ backgroundColor: `${theme.secondary[0]}44` }}
      >
        {/* Dynamic Home Sections */}
        {homeData.homeSections && homeData.homeSections.length > 0 && (
          <>
            {homeData.homeSections.map((section: any) => {
              const columnCount = Number(section.columns) || 4;

              if (section.displayType === "products" && section.data && section.data.length > 0) {
                const gridClass = {
                  2: "grid-cols-2",
                  3: "grid-cols-3",
                  4: "grid-cols-4",
                  6: "grid-cols-6",
                  8: "grid-cols-8"
                }[columnCount] || "grid-cols-4";

                const isCompact = columnCount >= 4;
                const gapClass = columnCount >= 4 ? "gap-2" : "gap-3 md:gap-4";

                return (
                  <div key={section.id} className="mt-6 mb-6 md:mt-8 md:mb-8">
                    {section.title && (
                      <h2 className="text-lg md:text-2xl font-semibold text-neutral-900 mb-3 md:mb-6 px-4 md:px-6 lg:px-8 tracking-tight capitalize">
                        {section.title}
                      </h2>
                    )}
                    <div className="px-4 md:px-6 lg:px-8">
                      <div className={`grid ${gridClass} ${gapClass}`}>
                        {section.data
                          .filter((p: any) => p.isAvailable !== false)
                          .map((product: any) => (
                            <ProductCard
                              key={product.id || product._id}
                              product={product}
                              categoryStyle={true}
                              showBadge={true}
                              showHeartIcon={true}
                              showPackBadge={false}
                              showStockInfo={false}
                              compact={isCompact}
                            />
                          ))}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <CategoryTileSection
                  key={section.id}
                  title={section.title}
                  tiles={section.data || []}
                  columns={columnCount as 2 | 3 | 4 | 6 | 8}
                  showProductCount={false}
                />
              );
            })}
          </>
        )}

        {/* Bestsellers Section (Dynamic) */}
        {homeData.bestsellers && homeData.bestsellers.length > 0 && (
          <div className="mt-6 mb-6 md:mt-8 md:mb-8">
            <h2 className="text-lg md:text-2xl font-semibold text-neutral-900 mb-3 md:mb-6 px-4 md:px-6 lg:px-8 tracking-tight">
              Bestsellers
            </h2>
            <div className="px-4 md:px-6 lg:px-8">
              <div
                className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-2"
                style={{ scrollSnapType: 'x mandatory' }}
              >
                {homeData.bestsellers
                  .filter((p: any) => p.isAvailable !== false)
                  .map((product: any) => (
                    <div
                      key={product.id || product._id}
                      className="flex-shrink-0 w-[140px] md:w-[180px]"
                      style={{ scrollSnapAlign: 'start' }}
                    >
                      <ProductCard
                        product={product}
                        categoryStyle={true}
                        showBadge={true}
                        showHeartIcon={true}
                      />
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* All Products Section */}
        {filteredProducts && filteredProducts.length > 0 && (
          <div className="mt-6 mb-6 md:mt-8 md:mb-8">
            <h2 className="text-lg md:text-2xl font-semibold text-neutral-900 mb-3 md:mb-6 px-4 md:px-6 lg:px-8 tracking-tight capitalize">
              All Products
            </h2>
            <div className="px-4 md:px-6 lg:px-8">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {filteredProducts
                  .map((product: any) => (
                    <ProductCard
                      key={product.id || product._id}
                      product={product}
                      categoryStyle={true}
                      showBadge={true}
                      showHeartIcon={true}
                      showPackBadge={false}
                      showStockInfo={false}
                    />
                  ))}
              </div>

              {/* Load More Button */}
              {hasMoreProducts && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleLoadMoreProducts}
                    disabled={loadingMoreProducts}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-full shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loadingMoreProducts ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Loading more products...</span>
                      </>
                    ) : (
                      <>
                        <span>Load More Products</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Root Category Tiles - Showing main categories at the top of 'All' tab */}
        {activeTab === "all" && homeData.categories && homeData.categories.length > 0 && (
          <div className="mt-2 md:mt-4">
            <CategoryTileSection
              title="Shop by Category"
              tiles={homeData.categories}
              columns={4}
              showProductCount={false}
            />
          </div>
        )}

        {/* Subcategory Tiles - Showing sub-collections for specific header tabs */}
        {activeTab !== "all" && homeData.subcategories && homeData.subcategories.length > 0 && (
          <div className="mt-2 md:mt-4">
            <CategoryTileSection
              title={`Explore ${activeTab.replace('-', ' ')}`}
              tiles={homeData.subcategories}
              columns={4}
              showProductCount={false}
            />
          </div>
        )}

        {/* Shop by Store Section */}
        {homeData.shops && homeData.shops.length > 0 && (
          <div className="mt-6 mb-10 md:mb-16">
            <CategoryTileSection
              title="Shop by Store"
              tiles={homeData.shops}
              columns={4}
              showProductCount={false}
            />
          </div>
        )}
      </div>

      <UserHomeFooter />
    </div>
  );
}
