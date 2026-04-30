import React from 'react';
import { useNavigate } from 'react-router-dom';

interface NewOrderAlertProps {
  order: {
    orderId: string;
    orderNumber: string;
    message?: string;
  } | null;
  onClose: () => void;
}

const NewOrderAlert: React.FC<NewOrderAlertProps> = ({ order, onClose }) => {
  const navigate = useNavigate();

  if (!order) return null;

  const handleView = () => {
    navigate(`/delivery/orders/${order.orderId}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="bg-amber-500 p-6 flex flex-col items-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 animate-bounce">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-5 0v1a3 3 0 0 1-6 0v-1" />
            </svg>
          </div>
          <h3 className="text-xl font-bold">New Delivery Request!</h3>
          <p className="text-amber-50 opacity-90 text-sm mt-1">Order #{order.orderNumber}</p>
        </div>
        
        <div className="p-6">
          <p className="text-neutral-600 text-center text-sm leading-relaxed mb-6">
            {order.message || "You have a new order assignment. Would you like to accept it now?"}
          </p>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={handleView}
              className="w-full py-4 bg-black text-white rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform"
            >
              Accept / View Order
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 bg-neutral-100 text-neutral-500 rounded-2xl font-semibold text-sm active:scale-95 transition-transform"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewOrderAlert;
