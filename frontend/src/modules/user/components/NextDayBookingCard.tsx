import { useNavigate } from "react-router-dom";

export default function NextDayBookingCard() {
  const navigate = useNavigate();

  return (
    <div className="mx-4 mt-6 mb-2">
      <div
        onClick={() => navigate("/tomorrow-veg-booking")}
        className="relative overflow-hidden bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-2xl p-4 shadow-sm border border-emerald-200 cursor-pointer flex items-center justify-between"
      >
        <div className="z-10 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wide">
              Early Access
            </span>
          </div>
          <h3 className="text-lg font-bold text-emerald-900 leading-tight mb-1">
            Book Tomorrow's <br /> Fresh Vegetables Today 🥕
          </h3>
          <p className="text-xs text-emerald-700 font-medium mb-3">
            Guaranteed morning delivery
          </p>
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-md transition-colors">
            Book Now
          </button>
        </div>

        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-20 bg-no-repeat bg-contain bg-right-bottom"
          style={{ backgroundImage: "url('https://cdn-icons-png.flaticon.com/512/2909/2909787.png')" }}>
        </div>
        <div className="z-10 w-24 h-24 flex items-center justify-center">
          {/* Placeholder icon if background image fails or for styling */}
          <span className="text-6xl drop-shadow-lg filter grayscale-0">🥬</span>
        </div>
      </div>
    </div>
  );
}
