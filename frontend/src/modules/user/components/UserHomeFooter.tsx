import { Link } from 'react-router-dom';
import {
  CalendarDays,
  CircleHelp,
  FileText,
  Heart,
  Headphones,
  Info,
  LayoutGrid,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useAppSettings } from '../../../context/AppSettingsContext';
import { useThemeContext } from '../../../context/ThemeContext';

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.ApnaSabjiWala.user&pcampaignid=web_share';

const footerGroups = [
  {
    title: 'Shop',
    links: [
      { label: 'Categories', to: '/categories', icon: LayoutGrid },
      { label: 'Wishlist', to: '/wishlist', icon: Heart },
      { label: 'Order Again', to: '/order-again', icon: RefreshCw },
      { label: "Tomorrow's Vegetable Booking", to: '/tomorrow-veg-booking', icon: CalendarDays },
    ],
  },
  {
    title: 'Customer Service',
    links: [
      { label: 'FAQ', to: '/faq', icon: CircleHelp },
      { label: 'Customer Support', to: '/customer/support', icon: Headphones },
      { label: 'Privacy Policy', to: '/customer/policy', icon: ShieldCheck },
      { label: 'Terms & Conditions', to: '/customer/terms', icon: FileText },
    ],
  },
  {
    title: 'Company',
    links: [{ label: 'About Us', to: '/about-us', icon: Info }],
  },
];

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M16.01 3A12.8 12.8 0 0 0 5.04 22.42L3 29l6.77-1.98A12.87 12.87 0 1 0 16.01 3Zm0 23.4a10.5 10.5 0 0 1-5.35-1.46l-.38-.23-4.02 1.18 1.21-3.91-.25-.4a10.45 10.45 0 1 1 8.79 4.82Zm5.74-7.83c-.31-.16-1.86-.91-2.15-1.02-.29-.11-.5-.16-.71.16-.21.31-.81 1.02-.99 1.23-.18.21-.37.24-.68.08-1.86-.93-3.08-1.66-4.31-3.77-.33-.56.33-.52.94-1.72.1-.21.05-.39-.03-.55-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.54-.71-.55h-.61c-.21 0-.55.08-.84.39-.29.31-1.1 1.07-1.1 2.62s1.13 3.04 1.29 3.25c.16.21 2.22 3.39 5.38 4.75.75.32 1.34.52 1.8.66.76.24 1.44.21 1.99.13.61-.09 1.86-.76 2.12-1.49.26-.73.26-1.36.18-1.49-.08-.13-.29-.21-.6-.37Z" />
    </svg>
  );
}

function GooglePlayIcon() {
  return (
    <svg viewBox="0 0 28 31" aria-hidden="true" className="h-8 w-7 shrink-0">
      <path fill="#34A853" d="M1.4 1.2C.9 1.8.6 2.7.6 3.9v23.2c0 1.2.3 2.1.8 2.7l.1.1 13-14.2v-.4L1.5 1.1l-.1.1Z" />
      <path fill="#FBBC04" d="m18.8 20.1-4.3-4.7v-.3l4.3-4.7.1.1 5.1 3c1.5.8 1.5 2.2 0 3l-5.1 3.6h-.1Z" />
      <path fill="#EA4335" d="m18.9 20.1-4.4-4.8L1.4 29.8c.8.9 2.1 1 3.6.2l13.9-9.9Z" />
      <path fill="#4285F4" d="M18.9 10.5 5 1.2C3.5.3 2.2.4 1.4 1.3l13.1 14.2 4.4-5Z" />
    </svg>
  );
}

export default function UserHomeFooter() {
  const { settings, userLogo } = useAppSettings();
  const { currentTheme } = useThemeContext();

  return (
    <footer
      className="hidden border-t lg:block"
      style={{
        borderColor: `${currentTheme.primary[0]}33`,
        background: `linear-gradient(120deg, ${currentTheme.secondary[0]} 0%, #ffffff 52%, ${currentTheme.secondary[1]} 100%)`,
      }}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-[1.2fr_1fr_1.15fr_.75fr_1.1fr] gap-8 px-8 py-12 lg:gap-12 lg:px-12">
        <div>
          <Link to="/" className="inline-flex items-center gap-3" aria-label={`${settings.appName} home`}>
            <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-black/5">
              <img src={userLogo} alt="" className="h-full w-full object-contain" />
            </span>
            <span className="text-xl font-bold leading-tight" style={{ color: currentTheme.textColor }}>
              {settings.appName}
            </span>
          </Link>

          <a
            href="https://wa.me/919601152862"
            target="_blank"
            rel="noreferrer"
            className="mt-7 flex w-fit items-center gap-2.5 rounded-xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md"
            style={{ color: currentTheme.textColor }}
            aria-label="Contact support on WhatsApp at 9601152862"
          >
            <span className="text-[#25D366]">
              <WhatsAppIcon />
            </span>
            <span className="leading-tight">
              <span className="block text-[11px] font-medium text-neutral-500">WhatsApp Support</span>
              <span className="mt-0.5 block text-sm font-semibold">9601152862</span>
            </span>
          </a>
        </div>

        {footerGroups.map((group) => (
          <div key={group.title}>
            <h2 className="mb-5 text-sm font-bold text-neutral-900">{group.title}</h2>
            <ul className="space-y-3.5">
              {group.links.map(({ label, to, icon: Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="group flex items-start gap-2 text-sm text-neutral-600 transition-colors hover:text-neutral-950"
                  >
                    <Icon
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0 transition-transform group-hover:scale-110"
                      style={{ color: currentTheme.accentColor }}
                    />
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h2 className="mb-5 text-sm font-bold text-neutral-900">Download Our App</h2>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-3 rounded-xl bg-neutral-950 px-4 py-2.5 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-black hover:shadow-md"
            aria-label={`Download ${settings.appName} on Google Play`}
          >
            <GooglePlayIcon />
            <span className="text-left leading-none">
              <span className="block text-[9px] uppercase tracking-wide">Get it on</span>
              <span className="mt-1 block whitespace-nowrap text-lg font-medium">Google Play</span>
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}
