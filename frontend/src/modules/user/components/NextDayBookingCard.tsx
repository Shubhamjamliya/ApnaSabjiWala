import { useNavigate } from "react-router-dom";
import { useThemeContext } from "../../../context/ThemeContext";

export default function NextDayBookingCard() {
  const navigate = useNavigate();
  const { currentTheme: theme } = useThemeContext();

  return (
    <div className="mx-4 mt-6 mb-2">
      <div
        onClick={() => navigate("/tomorrow-veg-booking")}
        className="relative overflow-hidden rounded-2xl p-4 shadow-sm border cursor-pointer flex items-center justify-between transition-all hover:shadow-md"
        style={{
          background: `linear-gradient(to right, ${theme.secondary[0]}, ${theme.secondary[1]})`,
          borderColor: theme.secondary[2]
        }}
      >
        <div className="z-10 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wide"
              style={{ backgroundColor: theme.accentColor }}
            >
              Early Access
            </span>
          </div>
          <h3
            className="text-lg font-bold leading-tight mb-1"
            style={{ color: theme.textColor }}
          >
            Book Tomorrow's <br /> Fresh Vegetables Today 🥕
          </h3>
          <p
            className="text-xs font-medium mb-3 opacity-90"
            style={{ color: theme.textColor }}
          >
            Guaranteed morning delivery
          </p>
          <button
            className="text-white text-xs font-semibold px-4 py-2 rounded-full shadow-md transition-all active:scale-95"
            style={{ backgroundColor: theme.accentColor }}
          >
            Book Now
          </button>
        </div>

        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-20 bg-no-repeat bg-contain bg-right-bottom pointer-events-none"
          style={{ backgroundImage: "url('https://cdn-icons-png.flaticon.com/512/2909/2909787.png')" }}>
        </div>
        <div className="z-10 w-24 h-24 flex items-center justify-center pointer-events-none">
          {/* Placeholder icon if background image fails or for styling */}
          <span className="text-6xl drop-shadow-lg filter grayscale-0">🥬</span>
        </div>
      </div>
    </div>
  );
}
