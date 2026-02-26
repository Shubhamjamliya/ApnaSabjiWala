import { useNavigate } from 'react-router-dom';

interface BestsellerCard {
  id: string;
  name: string;
  categoryName: string;
  categorySlug: string;
  categoryId: string;
  productImages: string[];
}

interface BestsellerCardsProps {
  cards: BestsellerCard[];
}

export default function BestsellerCards({ cards }: BestsellerCardsProps) {
  const navigate = useNavigate();

  if (!cards || cards.length === 0) return null;

  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 mb-4">
      <h2 className="text-xl md:text-2xl font-bold text-neutral-900 mb-6 tracking-tight">
        Shop by Best Sellers
      </h2>
      <div 
        className="flex md:grid md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 md:mx-0 md:px-0"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {cards.map((card) => (
          <div
            key={card.id}
            onClick={() => navigate(`/category/${card.categorySlug || card.categoryId}`)}
            className="flex-shrink-0 w-[260px] md:w-auto bg-white rounded-2xl p-3 md:p-4 shadow-sm border border-neutral-100 hover:shadow-md transition-all cursor-pointer group flex flex-col h-full"
            style={{ scrollSnapAlign: 'start' }}
          >
            <div className="text-sm md:text-base font-bold text-neutral-800 mb-3 group-hover:text-teal-600 transition-colors line-clamp-1">
              {card.name}
            </div>

            {/* 2x2 Grid for products */}
            <div className="grid grid-cols-2 gap-2 bg-neutral-50 rounded-xl p-2 flex-1 items-center justify-center min-h-[140px] md:min-h-[160px]">
              {card.productImages.slice(0, 4).map((img, idx) => (
                <div key={idx} className="aspect-square bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-100/50 p-1">
                  <img
                    src={img || '/placeholder.png'}
                    alt=""
                    className="w-full h-full object-contain hover:scale-110 transition-transform duration-300"
                  />
                </div>
              ))}
              {/* Fill empty slots if less than 4 images */}
              {[...Array(Math.max(0, 4 - card.productImages.length))].map((_, idx) => (
                <div key={`empty-${idx}`} className="aspect-square bg-neutral-100 rounded-lg" />
              ))}
            </div>

            <div className="mt-3 flex items-center text-[10px] md:text-xs font-bold text-teal-600 uppercase tracking-wider group-hover:translate-x-1 transition-transform">
              Shop Now
              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
