import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DeliveryHeader from '../components/DeliveryHeader';
import DeliveryBottomNav from '../components/DeliveryBottomNav';
import { getHelpSupport } from '../../../services/api/delivery/deliveryService';

// Icon mapping helper
const getIcon = (iconName: string) => {
  // You can use the same SVG logic or import shared icons
  if (iconName === 'phone') return '📞'; // Simplified for brevity in this example, or use SVG
  if (iconName === 'email') return '✉️';
  if (iconName === 'chat') return '💬';
  return 'ℹ️';
};

export default function DeliveryHelp() {
  const navigate = useNavigate();
  const [faqs, setFaqs] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHelp = async () => {
      try {
        const data = await getHelpSupport();
        setFaqs(data.faqs || []);
        setContacts(data.contact || []);
      } catch (error) {
        console.error("Failed to load help data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHelp();
  }, []);

  const handleContactAction = (option: any) => {
    if (option.icon === 'phone') {
      window.location.href = `tel:${option.value}`;
    } else if (option.icon === 'email') {
      window.location.href = `mailto:${option.value}`;
    } else if (option.icon === 'chat') {
      // Assuming it's a WhatsApp link or similar
      const cleanNumber = option.value.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanNumber}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center pb-20">
        <p className="text-neutral-500">Loading help content...</p>
        <DeliveryBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 pb-20">
      <div className="px-4 py-4">
        <div className="flex items-center mb-4">
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
          <h2 className="text-neutral-900 text-xl font-semibold">Help & Support</h2>
        </div>

        {/* Contact Options */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden mb-4">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-neutral-900 font-semibold">Contact Us</h3>
          </div>
          <div className="divide-y divide-neutral-200">
            {contacts.map((option, index) => (
              <button
                key={index}
                onClick={() => handleContactAction(option)}
                className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors text-left"
              >
                <div>
                  <p className="text-neutral-900 text-sm font-medium mb-1">{option.label}</p>
                  <p className="text-neutral-500 text-xs">{option.value}</p>
                </div>
                <div className="text-2xl">{getIcon(option.icon)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-neutral-900 font-semibold">Frequently Asked Questions</h3>
          </div>
          <div className="divide-y divide-neutral-200">
            {faqs.map((item, index) => (
              <div key={index} className="p-4">
                <p className="text-neutral-900 text-sm font-medium mb-2">{item.question}</p>
                <p className="text-neutral-500 text-xs leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Support Button */}
        <button 
          onClick={() => handleContactAction(contacts.find(c => c.icon === 'phone') || contacts[0])}
          className="w-full mt-4 bg-orange-500 text-white rounded-xl py-3 font-semibold hover:bg-orange-600 transition-colors shadow-md active:scale-[0.98]">
          Contact Support
        </button>
      </div>
      <DeliveryBottomNav />
    </div>
  );
}

