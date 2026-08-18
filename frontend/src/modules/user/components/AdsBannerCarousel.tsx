import { useEffect, useRef, useState } from "react";

export interface AdsBannerItem {
  _id: string;
  imageUrl: string;
  linkUrl: string;
  title?: string;
}

export default function AdsBannerCarousel({ banners = [] }: { banners?: AdsBannerItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(0, banners.length - 1)));
  }, [banners.length]);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % banners.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  if (!banners.length) return null;

  const move = (direction: number) => {
    setActiveIndex((current) => (current + direction + banners.length) % banners.length);
  };

  return (
    <section className="mx-4 mb-3 mt-4" aria-label="Advertisements">
      <div
        className="relative aspect-[8/3] overflow-hidden rounded-2xl bg-neutral-100 shadow-sm"
        onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
        onTouchEnd={(event) => {
          if (touchStartX.current === null) return;
          const distance = event.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(distance) > 45) move(distance > 0 ? -1 : 1);
          touchStartX.current = null;
        }}
      >
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {banners.map((banner, index) => (
            <a
              key={banner._id}
              href={banner.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block h-full w-full flex-none"
              aria-label={banner.title || `Open advertisement ${index + 1}`}
            >
              <img
                src={banner.imageUrl}
                alt={banner.title || "Advertisement"}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </a>
          ))}
        </div>

        {banners.length > 1 && (
          <>
            <button type="button" onClick={() => move(-1)} aria-label="Previous advertisement" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/35 p-1.5 text-white backdrop-blur-sm">
              <span aria-hidden="true">&#8249;</span>
            </button>
            <button type="button" onClick={() => move(1)} aria-label="Next advertisement" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/35 p-1.5 text-white backdrop-blur-sm">
              <span aria-hidden="true">&#8250;</span>
            </button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/25 px-2 py-1 backdrop-blur-sm">
              {banners.map((banner, index) => (
                <button
                  key={banner._id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Show advertisement ${index + 1}`}
                  className={`h-1.5 rounded-full transition-all ${index === activeIndex ? "w-4 bg-white" : "w-1.5 bg-white/60"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
