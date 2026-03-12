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
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Item Name</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Customer</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Coins Spent</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {orders.map((order) => (
                    <tr key={order._id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                        {order.rewardItem?.name || "Deleted Item"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <div className="font-semibold text-gray-800">{order.customer?.name}</div>
                        <div className="text-xs text-gray-500">{order.customer?.phone}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-bold">{order.coinsSpent}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order._id, e.target.value)}
                          className={`rounded border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500 ${order.status === 'Pending' ? 'text-yellow-700 bg-yellow-50' :
                            order.status === 'Fulfilled' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
                            }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Fulfilled">Fulfilled</option>
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
