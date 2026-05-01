import { useState, useEffect } from "react";
import api from "../../services/api/config";
import { useToast } from "../../context/ToastContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import IconLoader from "../../components/loaders/IconLoader"; // Assuming this exists

export default function Rewards() {
  const { showToast } = useToast();
  const [coins, setCoins] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [coinHistory, setCoinHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("rewards"); // 'rewards' or 'history'
  const [showAffordableOnly, setShowAffordableOnly] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rewardsRes, historyRes, coinHistoryRes] = await Promise.all([
        api.get("/customer/rewards"),
        api.get("/customer/rewards/redemptions"),
        api.get("/customer/rewards/history")
      ]);

      if (rewardsRes.data.success) {
        setCoins(rewardsRes.data.data.coins);
        setItems(rewardsRes.data.data.items);
      }

      if (historyRes.data.success) {
        setRedemptions(historyRes.data.data);
      }

      if (coinHistoryRes.data.success) {
        setCoinHistory(coinHistoryRes.data.data);
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to load rewards", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (itemId: string, requiredCoins: number) => {
    if (coins < requiredCoins) {
      showToast("You don't have enough coins for this reward!", "error");
      return;
    }

    if (!window.confirm("Are you sure you want to redeem this reward?")) return;

    try {
      const res = await api.post(`/customer/rewards/redeem/${itemId}`);
      if (res.data.success) {
        showToast(res.data.message, "success");
        setCoins(res.data.data.coinsRemaining);
        // Refresh data to update stock & history
        fetchData();
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to redeem reward", "error");
    }
  };

  if (loading) return <IconLoader forceShow />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16 md:mt-24">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-500 to-green-500 rounded-2xl p-8 mb-8 text-white shadow-lg flex flex-col md:flex-row items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">My Rewards</h1>
          <p className="text-teal-50 text-lg">Earn 1 coin for every successful delivery!</p>
        </div>
        <div className="mt-6 md:mt-0 flex flex-col items-center bg-white/20 px-8 py-6 rounded-xl backdrop-blur-sm border border-white/30">
          <span className="text-teal-50 text-sm font-semibold uppercase tracking-wider mb-1">Coin Balance</span>
          <div className="flex items-center gap-2">
            <span className="text-4xl">🪙</span>
            <span className="text-5xl font-black">{coins}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-200 mb-8 pb-4">
        <button
          onClick={() => setActiveTab("rewards")}
          className={`pb-2 px-4 font-semibold text-lg transition-colors ${activeTab === 'rewards' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-500 hover:text-gray-800'}`}
        >
          Available Rewards
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-2 px-4 font-semibold text-lg transition-colors ${activeTab === 'history' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-500 hover:text-gray-800'}`}
        >
          Redemption History
        </button>
        <button
          onClick={() => setActiveTab("coins")}
          className={`pb-2 px-4 font-semibold text-lg transition-colors ${activeTab === 'coins' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-500 hover:text-gray-800'}`}
        >
          Coin History
        </button>
      </div>

      {activeTab === "rewards" && (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">Available Products</h2>
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
              <span className="text-xs font-semibold text-gray-600">Show only affordable</span>
              <button 
                onClick={() => setShowAffordableOnly(!showAffordableOnly)}
                className={`w-10 h-5 rounded-full transition-colors relative ${showAffordableOnly ? 'bg-teal-600' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showAffordableOnly ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items
              .filter(item => !showAffordableOnly || coins >= item.coinsRequired)
              .map((item) => (
            <div key={item._id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-300 border border-gray-100 overflow-hidden flex flex-col">
              <div className="h-48 w-full bg-gray-50 relative p-4 flex items-center justify-center">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain" />
                ) : (
                  <span className="text-6xl">🎁</span>
                )}
                <div className="absolute top-4 right-4 bg-teal-600 text-white font-bold px-3 py-1 rounded-full text-sm shadow-md flex items-center gap-1">
                  <span>🪙</span> {item.coinsRequired}
                </div>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{item.name}</h3>
                <p className="text-gray-500 text-sm mb-4 line-clamp-2 min-h-[40px]">{item.description}</p>
                <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400">{item.stock} left in stock</span>
                  <button
                    onClick={() => handleRedeem(item._id, item.coinsRequired)}
                    disabled={coins < item.coinsRequired}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${coins >= item.coinsRequired
                      ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                  >
                    Redeem
                  </button>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="col-span-full py-12 text-center bg-gray-50 rounded-2xl border border-gray-200">
              <span className="text-4xl mb-4 block">😢</span>
              <h3 className="text-xl font-bold text-gray-700 mb-1">No Rewards Available</h3>
              <p className="text-gray-500">Check back later for exciting rewards!</p>
            </div>
          )}
        </div>
      </>
    )}

      {activeTab === "history" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {redemptions.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {redemptions.map((order) => (
                <div key={order._id} className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <img
                      src={order.rewardItem?.imageUrl || "https://placehold.co/100x100?text=Gift"}
                      alt=""
                      className="w-16 h-16 rounded-xl object-contain bg-gray-50"
                    />
                    <div>
                      <h4 className="font-bold text-gray-900">{order.rewardItem?.name || "Deleted Item"}</h4>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                        <span className="font-semibold text-red-500">-🪙 {order.coinsSpent}</span>
                        <span>•</span>
                        <span>{new Date(order.orderDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-sm font-bold capitalize w-full sm:w-auto text-center ${order.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                    order.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                      order.status === 'Delivered' || order.status === 'Fulfilled' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {order.status}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <span className="text-4xl mb-4 block">🛒</span>
              <h3 className="text-xl font-bold text-gray-700 mb-1">No History Yet</h3>
              <p className="text-gray-500">You haven't redeemed any rewards yet.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "coins" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {coinHistory.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {coinHistory.map((transaction) => (
                <div key={transaction._id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${transaction.type === 'Earned' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                      {transaction.type === 'Earned' ? '💰' : '🎁'}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{transaction.description}</h4>
                      <p className="text-sm text-gray-500">{new Date(transaction.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className={`text-lg font-black ${transaction.type === 'Earned' ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {transaction.type === 'Earned' ? '+' : '-'} {transaction.amount} 🪙
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <span className="text-4xl mb-4 block">💰</span>
              <h3 className="text-xl font-bold text-gray-700 mb-1">No Coin History</h3>
              <p className="text-gray-500">Earn coins by completing orders!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
