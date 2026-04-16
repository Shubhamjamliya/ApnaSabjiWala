import { useNavigate, useLocation } from 'react-router-dom';
import DeliveryBottomNav from '../components/DeliveryBottomNav';

export default function DeliveryPolicy() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPrivacy = location.pathname.includes('privacy');

  const content = isPrivacy ? {
    title: 'Privacy Policy',
    sections: [
      {
        title: '1. Data Collection',
        text: 'We collect information you provide directly to us, such as when you create or modify your account, request services, contact customer support, or otherwise communicate with us.'
      },
      {
        title: '2. Location Data',
        text: 'To enable delivery tracking and order assignments, we collect precise location data from your device when the app is running in the foreground or background.'
      },
      {
        title: '3. Use of Information',
        text: 'We use the information we collect to provide, maintain, and improve our services, including to facilitate deliveries, send related information, and provide support.'
      },
      {
        title: '4. Information Sharing',
        text: 'We may share your information with customers (limited to your name and location) and sellers to facilitate the delivery process.'
      }
    ]
  } : {
    title: 'Terms & Conditions',
    sections: [
      {
        title: '1. Eligibility',
        text: 'You must be at least 18 years old and possess a valid driver\'s license and vehicle registration to act as a delivery partner.'
      },
      {
        title: '2. Delivery Standards',
        text: 'Partners are expected to maintain high standards of service, including timely deliveries and professional conduct with customers and sellers.'
      },
      {
        title: '3. Payment Terms',
        text: 'Earnings are calculated based on completed deliveries and any applicable bonuses. Payments are processed according to our standard payout schedule.'
      },
      {
        title: '4. Termination',
        text: 'We reserve the right to suspend or terminate access to the platform for violations of our policies or poor performance.'
      }
    ]
  };

  return (
    <div className="min-h-screen bg-neutral-100 pb-20">
      <div className="px-4 py-4">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="mr-3 p-2 hover:bg-neutral-200 rounded-full transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h2 className="text-neutral-900 text-xl font-semibold">{content.title}</h2>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="p-6 space-y-6">
            {content.sections.map((section, index) => (
              <div key={index}>
                <h3 className="text-neutral-900 font-bold mb-2">{section.title}</h3>
                <p className="text-neutral-600 text-sm leading-relaxed">{section.text}</p>
              </div>
            ))}
            <div className="pt-4 border-t border-neutral-100">
              <p className="text-neutral-400 text-xs text-center">
                Last Updated: January 2025
              </p>
            </div>
          </div>
        </div>
      </div>
      <DeliveryBottomNav />
    </div>
  );
}
