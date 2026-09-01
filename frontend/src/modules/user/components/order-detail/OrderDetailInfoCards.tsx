import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Button from "../../../../components/ui/button";

interface OrderDetailInfoCardsProps {
  order: any;
  id?: string;
  displayOrderId: string;
  onPayNow: () => void;
  onCallStore: () => void;
  onOpenItemsModal: () => void;
  onOpenInstructionsModal: () => void;
  onOpenSpecialRequestsModal: () => void;
  onOpenCancelModal: () => void;
}

// Icon Components
const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const PhoneIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const HomeIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const MessageSquareIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const HelpCircleIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
  </svg>
);

const ChefHatIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M6 13h12M6 13c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2M6 13v5c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-5" />
    <path d="M9 9V7a3 3 0 0 1 6 0v2" />
  </svg>
);

const ReceiptIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
    <line x1="8" y1="7" x2="16" y2="7" />
    <line x1="8" y1="11" x2="16" y2="11" />
    <line x1="8" y1="15" x2="16" y2="15" />
  </svg>
);

const CircleSlashIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);

const SectionItem = ({
  icon: Icon,
  title,
  subtitle,
  onClick,
  showArrow = true,
  rightContent,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  showArrow?: boolean;
  rightContent?: React.ReactNode;
}) => (
  <motion.button
    onClick={onClick}
    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left border-b border-dashed border-gray-200 last:border-0"
    whileTap={{ scale: 0.99 }}>
    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
      <Icon className="w-5 h-5 text-gray-600" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-gray-900 truncate">{title}</p>
      {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
    </div>
    {rightContent ||
      (showArrow && <ChevronRightIcon className="w-5 h-5 text-gray-400" />)}
  </motion.button>
);

export default function OrderDetailInfoCards({
  order,
  id,
  displayOrderId,
  onPayNow,
  onCallStore,
  onOpenItemsModal,
  onOpenInstructionsModal,
  onOpenSpecialRequestsModal,
  onOpenCancelModal,
}: OrderDetailInfoCardsProps) {
  return (
    <>
      {/* Payment Pending */}
      {order?.paymentMethod === "COD" &&
        order?.paymentStatus === "Pending" &&
        !["Delivered", "Cancelled", "Returned", "Rejected"].includes(
          order?.status
        ) && (
          <motion.div
            className="bg-white rounded-xl p-4 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">
                  Payment of ₹{order.totalAmount?.toFixed(0) || "0"} pending
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Pay now, or pay to the delivery partner using Cash/UPI
                </p>
              </div>
              <Button
                onClick={onPayNow}
                className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-6">
                Pay now <ChevronRightIcon className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

      {/* Delivery Partner Assignment - Only show if no partner assigned yet */}
      {!order?.deliveryPartner && (
        <motion.div
          className="bg-white rounded-xl p-4 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <span className="text-2xl">👨‍🍳</span>
            </div>
            <p className="font-semibold text-gray-900">
              {order?.status === "Received" || order?.status === "Accepted"
                ? "Assigning delivery partner shortly"
                : "Preparing your order"}
            </p>
          </div>
        </motion.div>
      )}

      {/* Delivery Details Banner */}
      <motion.div
        className="bg-yellow-50 rounded-xl p-4 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}>
        <p className="text-yellow-800 font-medium">
          All your delivery details in one place 👇
        </p>
      </motion.div>

      {/* Contact & Address Section */}
      <motion.div
        className="bg-white rounded-xl shadow-sm overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}>
        <SectionItem
          icon={PhoneIcon}
          title={`${order?.address?.name || "Customer"}, ${
            order?.address?.phone || "9XXXXXXXX"
          }`}
          subtitle="Delivery partner may call this number"
        />
        <SectionItem
          icon={HomeIcon}
          title="Delivery at Home"
          subtitle={
            order?.address
              ? `${order.address.address}, ${order.address.city}`
              : "Add delivery address"
          }
        />
        <SectionItem
          icon={MessageSquareIcon}
          title="Add delivery instructions"
          subtitle=""
          onClick={onOpenInstructionsModal}
        />
      </motion.div>

      {/* Store Section */}
      <motion.div
        className="bg-white rounded-xl shadow-sm overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75 }}>
        <div className="flex items-center gap-3 p-4 border-b border-dashed border-gray-200">
          <div className="w-12 h-12 rounded-full bg-orange-100 overflow-hidden flex items-center justify-center">
            <span className="text-2xl">🛒</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">BarodaMart Store</p>
            <p className="text-sm text-gray-500">
              {order?.address?.city || "Local Area"}
            </p>
          </div>
          <motion.button
            className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"
            whileTap={{ scale: 0.9 }}
            onClick={onCallStore}>
            <PhoneIcon className="w-5 h-5 text-green-700" />
          </motion.button>
        </div>

        {/* Order Items */}
        <div
          className="p-4 border-b border-dashed border-gray-200"
          onClick={onOpenItemsModal}
          style={{ cursor: "pointer" }}>
          <div className="flex items-start gap-3">
            <ReceiptIcon className="w-5 h-5 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                Order #{displayOrderId}
              </p>
              <div className="mt-2 space-y-1">
                {order?.items?.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-4 h-4 rounded border border-green-600 flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-green-600" />
                    </span>
                    <span>
                      {item.quantity} x{" "}
                      {item.product?.name || item.productName || "Product"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <ChevronRightIcon className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        <SectionItem
          icon={ChefHatIcon}
          title="Add special requests"
          subtitle=""
          onClick={onOpenSpecialRequestsModal}
        />
      </motion.div>

      {/* Help Section */}
      <motion.div
        className="bg-white rounded-xl shadow-sm overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}>
        <div
          className="flex items-center gap-3 p-4 border-b border-dashed border-gray-200"
          onClick={() => window.open("/help", "_blank")}
          style={{ cursor: "pointer" }}>
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <HelpCircleIcon className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">
              Need help with your order?
            </p>
            <p className="text-sm text-gray-500">Get help & support</p>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-gray-400" />
        </div>
        <SectionItem
          icon={CircleSlashIcon}
          title="Cancel order"
          subtitle=""
          onClick={onOpenCancelModal}
        />
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        className="flex gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85 }}>
        {order?.invoiceEnabled ? (
          <Link to={`/orders/${id}/invoice`} className="flex-1">
            <Button className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white">
              View Invoice
            </Button>
          </Link>
        ) : (
          <div className="flex-1">
            <Button
              className="w-full bg-gray-400 cursor-not-allowed text-white"
              disabled
              title="Invoice will be available after delivery is completed">
              Invoice Unavailable
            </Button>
          </div>
        )}
        <Link to="/orders" className="flex-1">
          <Button variant="outline" className="w-full border-gray-300">
            All Orders
          </Button>
        </Link>
      </motion.div>
    </>
  );
}
