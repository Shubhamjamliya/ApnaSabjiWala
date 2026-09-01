import { useState, useEffect } from "react";
import api from "../../services/api/config";
import { useToast } from "../../context/ToastContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import IconLoader from "../../components/loaders/IconLoader";
import { getAddresses, Address } from "../../services/api/customerAddressService";

export default function Rewards() {
  const { showToast } = useToast();
  const [coins, setCoins] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [coinHistory, setCoinHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("rewards"); // 'rewards' or 'history'
  const [showAffordableOnly, setShowAffordableOnly] = useState(false);

  // Address & Redeem modal state
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedItemForRedeem, setSelectedItemForRedeem] = useState<any | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");
  const [redeemSubmitting, setRedeemSubmitting] = useState(false);
  const [customAddress, setCustomAddress] = useState({
    fullName: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    landmark: "",
  });

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
      const [rewardsRes, historyRes, coinHistoryRes, addressRes] = await Promise.all([
        api.get("/customer/rewards"),
        api.get("/customer/rewards/redemptions"),
        api.get("/customer/rewards/history"),
        getAddresses().catch(() => ({ data: [] })),
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

      const addresses = Array.isArray(addressRes.data) ? addressRes.data : [];
      setSavedAddresses(addresses);
      if (addresses.length > 0) {
        const defaultAddr = addresses.find((a: Address) => a.isDefault) || addresses[0];
        setSelectedAddressId(defaultAddr._id || "new");
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to load rewards", "error");
    } finally {
      setLoading(false);
    }
  };

  const openRedeemModal = (item: any) => {
    if (coins < item.coinsRequired) {
      showToast("You don't have enough coins for this reward!", "error");
      return;
    }

    setSelectedItemForRedeem(item);
    if (savedAddresses.length > 0) {
      const defaultAddr = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
      setSelectedAddressId(defaultAddr._id || "new");
    } else {
      setSelectedAddressId("new");
    }

    // Pre-fill custom address with user profile info if available
    setCustomAddress({
      fullName: user?.name || "",
      phone: user?.phone || "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      landmark: "",
    });
  };

  const handleConfirmRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForRedeem) return;

    let deliveryAddress: any = null;

    if (selectedAddressId !== "new") {
      const chosen = savedAddresses.find((a) => a._id === selectedAddressId);
      if (chosen) {
        deliveryAddress = {
          fullName: chosen.fullName,
          phone: chosen.phone,
          address: chosen.address,
          city: chosen.city,
          state: chosen.state || "",
          pincode: chosen.pincode,
          landmark: chosen.landmark || "",
        };
      }
    } else {
      if (!customAddress.fullName.trim() || !customAddress.phone.trim() || !customAddress.address.trim() || !customAddress.city.trim() || !customAddress.pincode.trim()) {
        showToast("Please fill in all required address fields", "error");
        return;
      }
      deliveryAddress = { ...customAddress };
    }

    if (!deliveryAddress) {
      showToast("Please provide a valid delivery address", "error");
      return;
    }

    try {
      setRedeemSubmitting(true);
      const res = await api.post(`/customer/rewards/redeem/${selectedItemForRedeem._id}`, {
        deliveryAddress,
      });

      if (res.data.success) {
        showToast(res.data.message || "Reward redeemed successfully!", "success");
        setSelectedItemForRedeem(null);
        setCoins(res.data.data.coinsRemaining);
        fetchData();
        setActiveTab("history");
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to redeem reward", "error");
    } finally {
      setRedeemSubmitting(false);
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
                    onClick={() => openRedeemModal(item)}
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
                <div key={order._id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4 w-full md:w-auto">
                    <img
                      src={order.rewardItem?.imageUrl || "https://placehold.co/100x100?text=Gift"}
                      alt=""
                      className="w-16 h-16 rounded-xl object-contain bg-gray-50 flex-shrink-0"
                    />
                    <div>
                      <h4 className="font-bold text-gray-900">{order.rewardItem?.name || "Deleted Item"}</h4>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                        <span className="font-semibold text-red-500">-🪙 {order.coinsSpent}</span>
                        <span>•</span>
                        <span>{new Date(order.orderDate).toLocaleDateString()}</span>
                      </div>
                      {order.deliveryAddress && (
                        <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                          <span className="font-semibold text-gray-800">📍 Deliver To: </span>
                          <span>{order.deliveryAddress.fullName || "User"} ({order.deliveryAddress.phone}) - {order.deliveryAddress.address}, {order.deliveryAddress.city} {order.deliveryAddress.pincode}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-sm font-bold capitalize w-full md:w-auto text-center flex-shrink-0 ${order.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
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

      {/* Address Selection & Redeem Confirmation Modal */}
      {selectedItemForRedeem && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-xl">
                  🎁
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Redeem Reward</h2>
                  <p className="text-xs text-gray-500">Choose where to deliver your gift</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItemForRedeem(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleConfirmRedeem} className="p-6 space-y-5">
              {/* Item Info Summary */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedItemForRedeem.imageUrl || "https://placehold.co/100x100?text=Gift"}
                    alt={selectedItemForRedeem.name}
                    className="w-12 h-12 object-contain rounded-lg bg-white p-1 border border-gray-200"
                  />
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">{selectedItemForRedeem.name}</h4>
                    <span className="text-xs text-teal-700 font-semibold">🪙 {selectedItemForRedeem.coinsRequired} Coins</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 block">Balance after:</span>
                  <span className="text-sm font-bold text-gray-800">🪙 {coins - selectedItemForRedeem.coinsRequired}</span>
                </div>
              </div>

              {/* Saved Addresses Section */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Delivery Address
                </label>

                {savedAddresses.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {savedAddresses.map((addr) => (
                      <label
                        key={addr._id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedAddressId === addr._id
                            ? "border-teal-600 bg-teal-50/40 ring-1 ring-teal-600"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="deliveryAddress"
                          value={addr._id}
                          checked={selectedAddressId === addr._id}
                          onChange={() => setSelectedAddressId(addr._id || "new")}
                          className="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                        />
                        <div className="text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{addr.fullName}</span>
                            <span className="text-gray-500 font-medium">{addr.phone}</span>
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-semibold text-gray-600">{addr.type}</span>
                          </div>
                          <p className="text-gray-600 mt-0.5">{addr.address}, {addr.city} - {addr.pincode}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {/* Option for custom address */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedAddressId === "new"
                      ? "border-teal-600 bg-teal-50/40 ring-1 ring-teal-600"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="deliveryAddress"
                    value="new"
                    checked={selectedAddressId === "new"}
                    onChange={() => setSelectedAddressId("new")}
                    className="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-gray-900">+ Enter New / Other Delivery Address</span>
                  </div>
                </label>
              </div>

              {/* Custom Address Input Fields */}
              {selectedAddressId === "new" && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                      <input
                        required
                        type="text"
                        placeholder="John Doe"
                        value={customAddress.fullName}
                        onChange={(e) => setCustomAddress({ ...customAddress, fullName: e.target.value })}
                        className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number *</label>
                      <input
                        required
                        type="tel"
                        placeholder="9876543210"
                        value={customAddress.phone}
                        onChange={(e) => setCustomAddress({ ...customAddress, phone: e.target.value })}
                        className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Complete Address / Street *</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="House/Flat No., Building, Street Area"
                      value={customAddress.address}
                      onChange={(e) => setCustomAddress({ ...customAddress, address: e.target.value })}
                      className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">City *</label>
                      <input
                        required
                        type="text"
                        placeholder="City"
                        value={customAddress.city}
                        onChange={(e) => setCustomAddress({ ...customAddress, city: e.target.value })}
                        className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Pincode *</label>
                      <input
                        required
                        type="text"
                        placeholder="Pincode"
                        value={customAddress.pincode}
                        onChange={(e) => setCustomAddress({ ...customAddress, pincode: e.target.value })}
                        className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Landmark (Optional)</label>
                    <input
                      type="text"
                      placeholder="Near City Mall"
                      value={customAddress.landmark}
                      onChange={(e) => setCustomAddress({ ...customAddress, landmark: e.target.value })}
                      className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedItemForRedeem(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={redeemSubmitting}
                  className="px-6 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {redeemSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Redeeming...</span>
                    </>
                  ) : (
                    <span>Confirm & Redeem</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
