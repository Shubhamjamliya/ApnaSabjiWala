import { useState, useEffect } from "react";
import api from "../../../services/api/config";
import { useToast } from "../../../context/ToastContext";

interface RewardRule {
  _id: string;
  minAmount: number;
  maxAmount: number;
  coins: number;
  isActive: boolean;
}

export default function AdminRewardRules() {
  const { showToast } = useToast();
  const [rules, setRules] = useState<RewardRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<RewardRule | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    minAmount: 0,
    maxAmount: 0,
    coins: 1,
    isActive: true,
  });

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/rewards/rules");
      if (res.data.success) {
        setRules(res.data.data);
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to fetch reward rules", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleOpenModal = (rule?: RewardRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        minAmount: rule.minAmount,
        maxAmount: rule.maxAmount,
        coins: rule.coins,
        isActive: rule.isActive,
      });
    } else {
      setEditingRule(null);
      setFormData({
        minAmount: 0,
        maxAmount: 0,
        coins: 1,
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRule(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingRule) {
        await api.put(`/admin/rewards/rules/${editingRule._id}`, formData);
        showToast("Reward rule updated", "success");
      } else {
        await api.post("/admin/rewards/rules", formData);
        showToast("Reward rule added", "success");
      }
      handleCloseModal();
      fetchRules();
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to save reward rule", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this rule?")) return;
    try {
      await api.delete(`/admin/rewards/rules/${id}`);
      showToast("Reward rule deleted", "success");
      fetchRules();
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to delete rule", "error");
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reward Rules (Coin Logic)</h1>
          <p className="mt-2 text-sm text-gray-700">Define how many coins users earn based on their order amount.</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            + Add New Rule
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Min Amount</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Max Amount</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Coins Reward</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {rules.map((rule) => (
                    <tr key={rule._id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">₹{rule.minAmount}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">₹{rule.maxAmount}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-teal-700">🪙 {rule.coins}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${rule.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {rule.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-3">
                        <button onClick={() => handleOpenModal(rule)} className="text-teal-600 hover:text-teal-900">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(rule._id)} className="text-red-600 hover:text-red-900">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rules.length === 0 && (
                <div className="p-12 text-center text-gray-500">No reward rules defined yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editingRule ? "Edit Rule" : "Add Rule"}</h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 p-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount (₹)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={formData.minAmount}
                    onChange={(e) => setFormData({ ...formData, minAmount: parseInt(e.target.value) || 0 })}
                    className="block w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount (₹)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={formData.maxAmount}
                    onChange={(e) => setFormData({ ...formData, maxAmount: parseInt(e.target.value) || 0 })}
                    className="block w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coins Reward 🪙</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={formData.coins}
                  onChange={(e) => setFormData({ ...formData, coins: parseInt(e.target.value) || 1 })}
                  className="block w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active Rule</label>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={handleCloseModal} className="border border-gray-300 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-teal-600 py-2 px-5 rounded-lg text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingRule ? "Update Rule" : "Add Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
