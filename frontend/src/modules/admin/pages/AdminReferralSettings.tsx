import { useState, useEffect } from "react";
import api from "../../../services/api/config";
import { useToast } from "../../../context/ToastContext";

export default function AdminReferralSettings() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({
    enabled: true,
    referrerCoins: 10,
    refereeCoins: 5,
    rewardTrigger: "signup",
    minOrderAmount: 0,
  });

  // Logs State
  const [referrals, setReferrals] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsRes, listRes] = await Promise.all([
        api.get("/admin/referral/settings"),
        api.get("/admin/referral/list"),
      ]);

      if (settingsRes.data.success) {
        setSettings(settingsRes.data.data);
      }

      if (listRes.data.success) {
        setReferrals(listRes.data.data.referrals || []);
        setTotal(listRes.data.data.total || 0);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to load referral data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.put("/admin/referral/settings", settings);
      if (res.data.success) {
        showToast("Referral settings updated successfully", "success");
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to update settings", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Refer & Earn Management</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure referral coins rules, program status, and monitor referral invitations.
        </p>
      </div>

      {/* Settings Form Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Program Rules & Configuration</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">
              {settings.enabled ? "Program Active" : "Program Disabled"}
            </span>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                settings.enabled ? "bg-teal-600" : "bg-gray-300"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  settings.enabled ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Referrer Coins */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Coins for Referrer (Inviter) 🪙
              </label>
              <input
                type="number"
                min="0"
                required
                value={settings.referrerCoins}
                onChange={(e) =>
                  setSettings({ ...settings, referrerCoins: parseInt(e.target.value) || 0 })
                }
                className="block w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-teal-500 focus:border-teal-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Coins credited to the existing user when their friend joins.
              </p>
            </div>

            {/* Referee Coins */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Coins for New User (Invitee) 🪙
              </label>
              <input
                type="number"
                min="0"
                required
                value={settings.refereeCoins}
                onChange={(e) =>
                  setSettings({ ...settings, refereeCoins: parseInt(e.target.value) || 0 })
                }
                className="block w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-teal-500 focus:border-teal-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Welcome bonus coins given to the new user for entering the code.
              </p>
            </div>
          </div>

          {/* Reward Trigger Mode */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reward Trigger Condition
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  settings.rewardTrigger === "signup"
                    ? "border-teal-600 bg-teal-50/40 ring-1 ring-teal-600"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="rewardTrigger"
                  value="signup"
                  checked={settings.rewardTrigger === "signup"}
                  onChange={() => setSettings({ ...settings, rewardTrigger: "signup" })}
                  className="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                />
                <div>
                  <span className="font-bold text-sm text-gray-900 block">
                    Instant on First Login / Sign up
                  </span>
                  <span className="text-xs text-gray-500">
                    Both users receive coins immediately upon code submission.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  settings.rewardTrigger === "first_order_delivered"
                    ? "border-teal-600 bg-teal-50/40 ring-1 ring-teal-600"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="rewardTrigger"
                  value="first_order_delivered"
                  checked={settings.rewardTrigger === "first_order_delivered"}
                  onChange={() =>
                    setSettings({ ...settings, rewardTrigger: "first_order_delivered" })
                  }
                  className="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                />
                <div>
                  <span className="font-bold text-sm text-gray-900 block">
                    On First Order Delivery
                  </span>
                  <span className="text-xs text-gray-500">
                    Coins are awarded only after the new user's 1st order is successfully delivered.
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition-colors disabled:opacity-50"
            >
              {saving ? "Saving Settings..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>

      {/* Referrals Activity Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Referral Activity History</h2>
            <p className="text-xs text-gray-500">Total Referrals: {total}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3.5 pl-6 pr-3 text-left font-semibold text-gray-900">Referrer (Inviter)</th>
                <th className="px-3 py-3.5 text-left font-semibold text-gray-900">New User (Invitee)</th>
                <th className="px-3 py-3.5 text-left font-semibold text-gray-900">Code Used</th>
                <th className="px-3 py-3.5 text-left font-semibold text-gray-900">Coins (Inviter / Invitee)</th>
                <th className="px-3 py-3.5 text-left font-semibold text-gray-900">Date</th>
                <th className="px-3 py-3.5 text-left font-semibold text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {referrals.map((item) => (
                <tr key={item._id} className="hover:bg-gray-50/60">
                  <td className="py-4 pl-6 pr-3">
                    <div className="font-semibold text-gray-900">{item.referrer?.name || "Customer"}</div>
                    <div className="text-xs text-gray-500">{item.referrer?.phone}</div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="font-semibold text-gray-900">{item.referee?.name || "New User"}</div>
                    <div className="text-xs text-gray-500">{item.referee?.phone}</div>
                  </td>
                  <td className="px-3 py-4 font-mono font-bold text-teal-800">
                    {item.referralCode}
                  </td>
                  <td className="px-3 py-4 font-semibold text-gray-700">
                    🪙 {item.referrerCoins} / 🪙 {item.refereeCoins}
                  </td>
                  <td className="px-3 py-4 text-xs text-gray-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                        item.status === "Completed"
                          ? "bg-green-100 text-green-800"
                          : item.status === "Pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
              {referrals.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    No referrals recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
