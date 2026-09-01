import { useState, useEffect } from "react";
import api from "../../../services/api/config";
import { useToast } from "../../../context/ToastContext";

export default function AdminRewardOrders() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await api.get("/admin/rewards/orders");
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to fetch reward orders", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await api.put(`/admin/rewards/orders/${orderId}/status`, { status: newStatus });
      showToast("Order status updated", "success");
      fetchOrders();
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to update status", "error");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">Reward Orders</h1>
          <p className="mt-2 text-sm text-gray-700">View and manage customer reward redemptions.</p>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Item</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Customer</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Delivery Address</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Coins</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-4 pl-4 pr-3 text-sm">
                        <div className="flex items-center gap-3">
                          <img
                            src={order.rewardItem?.imageUrl || "https://placehold.co/50x50?text=Gift"}
                            alt=""
                            className="w-10 h-10 object-contain rounded-lg bg-gray-50 border border-gray-100 flex-shrink-0"
                          />
                          <span className="font-semibold text-gray-900">
                            {order.rewardItem?.name || "Deleted Item"}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <div className="font-semibold text-gray-800">{order.customer?.name || "Customer"}</div>
                        <div className="text-xs text-gray-500">{order.customer?.phone}</div>
                        {order.customer?.email && (
                          <div className="text-[11px] text-gray-400">{order.customer?.email}</div>
                        )}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-600 min-w-[220px] max-w-[320px]">
                        {order.deliveryAddress ? (
                          <div className="bg-gray-50/80 p-2.5 rounded-lg border border-gray-100 text-xs space-y-0.5">
                            <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                              <span>📍</span>
                              <span>{order.deliveryAddress.fullName || order.customer?.name}</span>
                              {order.deliveryAddress.phone && (
                                <span className="text-gray-500 text-[11px]">({order.deliveryAddress.phone})</span>
                              )}
                            </div>
                            <div className="text-gray-700 leading-snug">{order.deliveryAddress.address}</div>
                            <div className="text-gray-500 text-[11px]">
                              {order.deliveryAddress.city}
                              {order.deliveryAddress.state ? `, ${order.deliveryAddress.state}` : ""}
                              {order.deliveryAddress.pincode ? ` - ${order.deliveryAddress.pincode}` : ""}
                            </div>
                            {order.deliveryAddress.landmark && (
                              <div className="text-teal-700 text-[11px] font-medium">
                                Landmark: {order.deliveryAddress.landmark}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs italic text-gray-400">No address provided</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-teal-700 font-bold">
                        🪙 {order.coinsSpent}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order._id, e.target.value)}
                          className={`rounded-full px-3 py-1.5 text-xs font-bold focus:ring-teal-500 focus:border-teal-500 outline-none border transition-colors shadow-sm ${order.status === 'Pending' ? 'text-yellow-700 bg-yellow-50 border-yellow-200' :
                            order.status === 'Approved' ? 'text-blue-700 bg-blue-50 border-blue-200' :
                              order.status === 'Delivered' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'
                            }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length === 0 && (
                <div className="p-8 text-center text-gray-500">No reward orders yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
