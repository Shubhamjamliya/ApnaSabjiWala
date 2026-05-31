import { useState, useEffect } from 'react';
import { useToast } from '../../../context/ToastContext';
import { getAppSettings, updateAppSettings, AppSettings } from '../../../services/api/admin/adminSettingsService';

export default function AdminSupport() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'customer' | 'seller' | 'delivery'>('customer');
  
  const [support, setSupport] = useState({
    customer: '',
    seller: '',
    delivery: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await getAppSettings();
      if (response && response.success && response.data) {
        setSettings(response.data);
        if (response.data.appSupport) {
          setSupport({
            customer: response.data.appSupport.customer || '',
            seller: response.data.appSupport.seller || '',
            delivery: response.data.appSupport.delivery || ''
          });
        }
      }
    } catch (error: any) {
      console.error(error);
      showToast('Failed to fetch settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updatePayload = {
        appSupport: support
      };

      const response = await updateAppSettings(updatePayload);
      if (response.success) {
        showToast('Support details updated successfully!');
      } else {
        showToast('Failed to update support details', 'error');
      }
    } catch (error: any) {
      console.error(error);
      showToast(error.response?.data?.message || 'Error updating support', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-4 sm:px-6 py-4 border-b border-neutral-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">App Support Details</h1>
          </div>
          <div className="text-sm text-neutral-600">
            <span className="text-blue-600">Home</span> / <span className="text-neutral-900">App Support</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white px-4 sm:px-6 border-b border-neutral-200">
        <nav className="-mb-px flex space-x-8">
          {(['customer', 'seller', 'delivery'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize
                ${activeTab === tab
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab} App
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-neutral-50">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
              <div className="bg-teal-600 px-4 sm:px-6 py-3">
                <h2 className="text-white text-lg font-semibold capitalize">{activeTab} App Support Content</h2>
              </div>
              <div className="p-4 sm:p-6">
                <div>
                  <textarea
                    name="supportContent"
                    value={support[activeTab]}
                    onChange={(e) => setSupport({ ...support, [activeTab]: e.target.value })}
                    placeholder={`Enter ${activeTab} App Support details...`}
                    rows={20}
                    className="w-full px-4 py-3 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-y font-mono"
                  />
                  <p className="mt-2 text-xs text-neutral-500">
                    You can format the support details using plain text. Use line breaks and spacing to organize the content.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setSupport({ ...support, [activeTab]: '' })}
                className="px-6 py-2.5 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                disabled={saving}
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-lg text-base font-medium transition-colors"
              >
                {saving ? 'Updating...' : 'Update Support'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
