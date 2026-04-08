import { useNavigate } from 'react-router-dom';
import { useLayoutEffect, useRef, useState, useEffect, useMemo } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getTheme } from '../../../utils/themes';
import { useLocation } from '../../../hooks/useLocation';
import { useThemeContext } from '../../../context/ThemeContext';
import { appConfig } from '../../../services/configService';
import { getCategories } from '../../../services/api/customerProductService';
import { Category } from '../../../types/domain';
import { getHeaderCategoriesPublic } from '../../../services/api/headerCategoryService';
import { getIconByName } from '../../../utils/iconLibrary';
import homeIcon from '@assets/category/home_v2.png';

gsap.registerPlugin(ScrollTrigger);

interface HomeHeroProps {
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const HOME_TAB: Tab = {
  id: 'all',
  label: 'Home',
  icon: <img src={`${homeIcon}?v=${Date.now()}`} alt="Home" className="w-full h-full object-contain" />,
};


export default function HomeHero({ activeTab = 'all', onTabChange }: HomeHeroProps) {
  const [tabs, setTabs] = useState<Tab[]>([HOME_TAB]);

  useEffect(() => {
    const fetchHeaderCategories = async () => {
      try {
        const cats = await getHeaderCategoriesPublic();
        if (cats && cats.length > 0) {
          const mapped = cats.map(c => {
            if (c.slug === 'all' && !c.image) {
              return {
                id: c.slug,
                label: c.name,
                icon: HOME_TAB.icon
              };
            }
            return {
              id: c.slug,
              label: c.name,
              icon: c.image ? (
                <img src={c.image} alt={c.name} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-2">
                  {getIconByName(c.iconName || '')}
                </div>
              )
            };
          });
          setTabs(mapped);
        }
      } catch (error) {
        console.error('Failed to fetch header categories', error);
      }
    };
    fetchHeaderCategories();
  }, []);
  const navigate = useNavigate();
  const { location: userLocation, setIsLocationModalOpen } = useLocation();
  const heroRef = useRef<HTMLDivElement>(null);
  const topSectionRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [isSticky, setIsSticky] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [searchBarHeight, setSearchBarHeight] = useState(0);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // Format location display text - only show if user has provided location
  const locationDisplayText = useMemo(() => {
    if (userLocation?.address) {
      // Use the full address if available
      return userLocation.address;
    }
    // Fallback to city, state format if available
    if (userLocation?.city && userLocation?.state) {
      return `${userLocation.city}, ${userLocation.state}`;
    }
    // Fallback to city only
    if (userLocation?.city) {
      return userLocation.city;
    }
    // No default - return empty string if no location provided
    return '';
  }, [userLocation]);

  const [categories, setCategories] = useState<Category[]>([]);

  // Fetch categories for search suggestions
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getCategories();
        if (response.success && response.data) {
          setCategories(response.data.map((c: any) => ({
            ...c,
            id: c._id || c.id
          })));
        }
      } catch (error) {
        console.error("Error fetching categories for suggestions:", error);
      }
    };
    fetchCategories();
  }, []);

  // Search suggestions based on active tab or fetched categories
  const searchSuggestions = useMemo(() => {
    if (activeTab === 'all' && categories.length > 0) {
      // Use real category names for 'all' tab suggestions
      return categories.slice(0, 8).map(c => c.name.toLowerCase());
    }

    switch (activeTab) {
      case 'wedding':
        return ['gift packs', 'dry fruits', 'sweets', 'decorative items', 'wedding cards', 'return gifts'];
      case 'winter':
        return ['woolen clothes', 'caps', 'gloves', 'blankets', 'heater', 'winter wear'];
      case 'electronics':
        return ['chargers', 'cables', 'power banks', 'earphones', 'phone cases', 'screen guards'];
      case 'beauty':
        return ['lipstick', 'makeup', 'skincare', 'kajal', 'face wash', 'moisturizer'];
      case 'grocery':
        return ['atta', 'milk', 'dal', 'rice', 'oil', 'vegetables'];
      case 'fashion':
        return ['clothing', 'shoes', 'accessories', 'watches', 'bags', 'jewelry'];
      case 'sports':
        return ['cricket bat', 'football', 'badminton', 'fitness equipment', 'sports shoes', 'gym wear'];
      default: // 'all'
        return ['atta', 'milk', 'dal', 'coke', 'bread', 'eggs', 'rice', 'oil'];
    }
  }, [activeTab]);

  useLayoutEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        hero,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out',
          clearProps: 'transform',
        }
      );
    }, hero);

    return () => ctx.revert();
  }, []);

  // Animate search suggestions
  useEffect(() => {
    setCurrentSearchIndex(0);
    const interval = setInterval(() => {
      setCurrentSearchIndex((prev) => (prev + 1) % searchSuggestions.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [searchSuggestions.length, activeTab]);

  // Handle scroll for fixed search bar and top transition.
  useEffect(() => {
    const getMainScrollTop = () => {
      const mainEl = document.querySelector('main');
      return mainEl instanceof HTMLElement ? mainEl.scrollTop : 0;
    };

    const getWindowScrollTop = () => window.scrollY || document.documentElement.scrollTop || 0;

    const handleScroll = () => {
      const scrollTop = Math.max(getMainScrollTop(), getWindowScrollTop());

      setScrollProgress(Math.min(Math.max(scrollTop / 140, 0), 1));
      setIsSticky(scrollTop > 24);
    };

    const updateSearchBarHeight = () => {
      if (searchBarRef.current) {
        setSearchBarHeight(searchBarRef.current.offsetHeight);
      }
    };

    updateSearchBarHeight();
    window.addEventListener('resize', updateSearchBarHeight);

    // Listen on both containers because this app uses custom main scrolling on mobile.
    const mainEl = document.querySelector('main');
    if (mainEl instanceof HTMLElement) {
      mainEl.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Ensure sticky state is correct after initial layout/paint.
    const rafId = requestAnimationFrame(handleScroll);
    handleScroll(); // Check initial state

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateSearchBarHeight);
      const cleanupMainEl = document.querySelector('main');
      if (cleanupMainEl instanceof HTMLElement) {
        cleanupMainEl.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Update sliding indicator position when activeTab changes and scroll to active tab
  useEffect(() => {
    const updateIndicator = (shouldScroll = true) => {
      const activeTabButton = tabRefs.current.get(activeTab);
      const container = tabsContainerRef.current;

      if (activeTabButton && container) {
        try {
          // Use offsetLeft for position relative to container (not affected by scroll)
          // This ensures the indicator stays aligned even when container scrolls
          const left = activeTabButton.offsetLeft;
          const width = activeTabButton.offsetWidth;

          // Ensure valid values
          if (width > 0) {
            setIndicatorStyle({ left, width });
          }

          // Scroll the container to bring the active tab into view (only when tab changes)
          if (shouldScroll) {
            const containerScrollLeft = container.scrollLeft;
            const containerWidth = container.offsetWidth;
            const buttonLeft = left;
            const buttonWidth = width;
            const buttonRight = buttonLeft + buttonWidth;

            // Calculate scroll position to center the button or keep it visible
            const scrollPadding = 20; // Padding from edges
            let targetScrollLeft = containerScrollLeft;

            // If button is on the left side and partially or fully hidden
            if (buttonLeft < containerScrollLeft + scrollPadding) {
              targetScrollLeft = buttonLeft - scrollPadding;
            }
            // If button is on the right side and partially or fully hidden
            else if (buttonRight > containerScrollLeft + containerWidth - scrollPadding) {
              targetScrollLeft = buttonRight - containerWidth + scrollPadding;
            }

            // Smooth scroll to the target position
            if (targetScrollLeft !== containerScrollLeft) {
              container.scrollTo({
                left: Math.max(0, targetScrollLeft),
                behavior: 'smooth'
              });
            }
          }
        } catch (error) {
          console.warn('Error updating indicator:', error);
        }
      }
    };

    // Update immediately with scroll
    updateIndicator(true);

    // Also update after delays to handle any layout shifts and ensure smooth animation
    const timeout1 = setTimeout(() => updateIndicator(true), 50);
    const timeout2 = setTimeout(() => updateIndicator(true), 150);
    const timeout3 = setTimeout(() => updateIndicator(false), 300); // Last update without scroll to avoid conflicts

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [activeTab]);

  const handleTabClick = (tabId: string) => {
    onTabChange?.(tabId);
    // Don't scroll - keep page at current position
  };

  const { currentTheme } = useThemeContext();
  const theme = currentTheme;
  const heroGradient = `linear-gradient(to bottom right, ${theme.primary[0]}, ${theme.primary[1]}, ${theme.primary[2]})`;

  // Helper to convert RGB to RGBA
  const rgbToRgba = (rgb: string, alpha: number) => {
    return rgb.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
  };

  return (
    <div
      ref={heroRef}
      style={{
        background: heroGradient,
        paddingBottom: 0,
        marginBottom: 0,
      }}
    >
      {/* Top section with delivery info and buttons - NOT sticky */}
      <div>
        <div ref={topSectionRef} className="px-4 md:px-6 lg:px-8 pt-2 md:pt-3 pb-0">
          <div className="flex items-start justify-between mb-2 md:mb-2">
            {/* Left: Text content */}
            <div className="flex-1 pr-2">
              {/* Service name - small, dark */}
              <div className="text-neutral-800 font-medium text-[10px] md:text-xs mb-0 leading-tight">Apna Sabji Wala Quick Commerce</div>
              {/* Delivery time - large, bold, dark grey/black */}
              <div className="text-neutral-900 font-extrabold text-2xl md:text-xl mb-0 md:mb-0.5 leading-tight">{appConfig.estimatedDeliveryTime}</div>
              {/* Location with dropdown indicator - only show if location is provided */}
              {locationDisplayText && (
                <div 
                  className="text-neutral-700 text-[10px] md:text-xs flex items-center gap-0.5 leading-tight cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setIsLocationModalOpen(true)}
                >
                  <span className="line-clamp-1" title={locationDisplayText}>{locationDisplayText}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky section: Search Bar and Category Tabs */}
      <div ref={stickyRef}>
        {isSticky && <div style={{ height: searchBarHeight || 52 }} />}

        <div
          ref={searchBarRef}
          className={`${isSticky ? 'fixed top-0 left-0 right-0 z-50 md:top-[60px]' : 'relative z-20'}`}
          style={{
            ...(scrollProgress >= 0.1 && {
              background: `linear-gradient(to bottom right,
                ${rgbToRgba(theme.primary[0], 1 - scrollProgress)},
                ${rgbToRgba(theme.primary[1], 1 - scrollProgress)},
                ${rgbToRgba(theme.primary[2], 1 - scrollProgress)}),
                rgba(255, 255, 255, ${scrollProgress})`,
              boxShadow: `0 4px 6px -1px rgba(0, 0, 0, ${scrollProgress * 0.1})`,
              transition: 'background 0.1s ease-out, box-shadow 0.1s ease-out',
            }),
          }}
        >
          <div className="px-4 md:px-6 lg:px-8 pt-2 md:pt-2 pb-2 md:pb-2">
          {/* Search Bar */}
          <div
            onClick={() => navigate('/search')}
            className="w-full md:w-auto md:max-w-xl md:mx-auto rounded-xl shadow-lg px-3 py-2 md:px-3 md:py-1.5 flex items-center gap-2 cursor-pointer hover:shadow-xl transition-all duration-300 mb-2 md:mb-1.5 bg-white"
            style={{
              backgroundColor: scrollProgress > 0.1 ? `rgba(249, 250, 251, ${scrollProgress})` : 'white',
              border: scrollProgress > 0.1 ? `1px solid rgba(229, 231, 235, ${scrollProgress})` : 'none',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 md:w-4 md:h-4">
              <circle cx="11" cy="11" r="8" stroke={scrollProgress > 0.5 ? "#9ca3af" : "#6b7280"} strokeWidth="2" />
              <path d="m21 21-4.35-4.35" stroke={scrollProgress > 0.5 ? "#9ca3af" : "#6b7280"} strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div className="flex-1 relative h-4 md:h-4 overflow-hidden">
              {searchSuggestions.map((suggestion, index) => {
                const isActive = index === currentSearchIndex;
                const prevIndex = (currentSearchIndex - 1 + searchSuggestions.length) % searchSuggestions.length;
                const isPrev = index === prevIndex;

                return (
                  <div
                    key={suggestion}
                    className={`absolute inset-0 flex items-center transition-all duration-500 ${isActive
                      ? 'translate-y-0 opacity-100'
                      : isPrev
                        ? '-translate-y-full opacity-0'
                        : 'translate-y-full opacity-0'
                      }`}
                  >
                    <span className={`text-xs md:text-xs`} style={{ color: scrollProgress > 0.5 ? '#9ca3af' : '#6b7280' }}>
                      Search &apos;{suggestion}&apos;
                    </span>
                  </div>
                );
              })}
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 md:w-4 md:h-4">
              <path d="M12 1C13.1 1 14 1.9 14 3C14 4.1 13.1 5 12 5C10.9 5 10 4.1 10 3C10 1.9 10.9 1 12 1Z" fill={scrollProgress > 0.5 ? "#9ca3af" : "#6b7280"} />
              <path d="M19 10V17C19 18.1 18.1 19 17 19H7C5.9 19 5 18.1 5 17V10" stroke={scrollProgress > 0.5 ? "#9ca3af" : "#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 11V17" stroke={scrollProgress > 0.5 ? "#9ca3af" : "#6b7280"} strokeWidth="2" strokeLinecap="round" />
              <path d="M8 11V17" stroke={scrollProgress > 0.5 ? "#9ca3af" : "#6b7280"} strokeWidth="2" strokeLinecap="round" />
              <path d="M16 11V17" stroke={scrollProgress > 0.5 ? "#9ca3af" : "#6b7280"} strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        </div>

        {/* Category Tabs Section */}
        <div className="w-full relative" style={{ paddingTop: '12px', paddingBottom: '24px' }}>
          <div className="px-4 md:px-6 lg:px-8 mb-4">
            <h2 className="text-lg md:text-xl font-bold text-neutral-900 tracking-tight">
              Popular Categories
            </h2>
          </div>
          <div
            ref={tabsContainerRef}
            className="flex gap-4 md:gap-6 overflow-x-auto overflow-y-visible scrollbar-hide px-4 md:px-6 lg:px-8 md:justify-center scroll-smooth py-2"
          >

            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const tabColor = isActive
                ? 'text-neutral-900'
                : scrollProgress > 0.5
                  ? 'text-neutral-600'
                  : 'text-neutral-800';

              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    if (el) {
                      tabRefs.current.set(tab.id, el);
                    } else {
                      tabRefs.current.delete(tab.id);
                    }
                  }}
                  onClick={() => handleTabClick(tab.id)}
                  className="flex-shrink-0 flex flex-col items-center gap-2 group outline-none"
                  type="button"
                >
                  <div
                    className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center overflow-hidden transition-all duration-300 ${isActive
                      ? 'bg-white shadow-[0_0_0_3px_#111827,0_4px_12px_rgba(0,0,0,0.15)] scale-110 z-20'
                      : 'bg-white shadow-md border border-neutral-100 hover:shadow-lg group-hover:scale-105'
                      }`}
                  >
                    <div className="w-full h-full transition-all duration-300">
                      {tab.icon}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] md:text-sm text-center font-bold leading-tight max-w-[80px] transition-all duration-300 ${isActive ? 'text-neutral-900 scale-105' : 'text-neutral-500'
                      }`}
                  >
                    {tab.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

