import { useState, useEffect } from 'react';
import { getWalletTransactions, addDeliveryFundTransfer } from '../../../services/api/admin/adminWalletService';
import { getDeliveryBoys } from '../../../services/api/admin/adminDeliveryService';
import { useAuth } from '../../../context/AuthContext';

interface Transaction {
  _id: string;
  userName: string;
  userId: string;
  amount: number;
  type: 'Credit' | 'Debit';
  description: string;
  createdAt: string;
  status: string;
}

export default function AdminFundTransfer() {
  const { isAuthenticated, token } = useAuth();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deliveryBoysList, setDeliveryBoysList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    deliveryBoyId: '',
    amount: '',
    type: 'Credit' as 'Credit' | 'Debit',
    description: ''
  });

  // Fetch Delivery Boys for dropdown
  useEffect(() => {
    if (isAuthenticated && token) {
      getDeliveryBoys({ status: 'Active', limit: 100 }).then(res => {
        if (res.success) setDeliveryBoysList(res.data);
      });
    }
  }, [isAuthenticated, token]);

  // Fetch Transactions
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const params: any = {
          page: currentPage,
          limit: entriesPerPage,
          userType: 'DELIVERY_BOY',
          search: searchTerm
        };
        
        if (selectedMethod !== 'all') params.type = selectedMethod;
        if (selectedDeliveryBoy !== 'all') params.userId = selectedDeliveryBoy;
        
        const res = await getWalletTransactions(params);
        if (res.success) {
          setTransactions(res.data as any);
        } else {
          setError('Failed to fetch transactions');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error fetching data');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [isAuthenticated, token, currentPage, entriesPerPage, selectedDeliveryBoy, selectedMethod, searchTerm]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleExport = () => {
    const headers = ['ID', 'Name', 'Amount', 'Type', 'Description', 'Date'];
    const csvContent = [
      headers.join(','),
      ...transactions.map(t => [
        t._id.slice(-6),
        `"${t.userName}"`,
        t.amount,
        t.type,
        `"${t.description}"`,
        new Date(t.createdAt).toLocaleDateString()
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `fund_transfers_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.deliveryBoyId || !formData.amount) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const res = await addDeliveryFundTransfer({
        deliveryBoyId: formData.deliveryBoyId,
        amount: Number(formData.amount),
        type: formData.type,
        description: formData.description
      });

      if (res.success) {
        setShowModal(false);
        setFormData({ deliveryBoyId: '', amount: '', type: 'Credit', description: '' });
        // Refresh transactions
        setCurrentPage(1);
        // Refresh current page manually if needed, but the dependency array will handle it if we are on page 1
        const params: any = { page: 1, limit: entriesPerPage, userType: 'DELIVERY_BOY' };
        const updated = await getWalletTransactions(params);
        if (updated.success) setTransactions(updated.data as any);
        alert('Fund transfer successful');
      } else {
        alert(res.message || 'Transfer failed');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error submitting transfer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-teal-600 px-4 sm:px-6 py-4 rounded-t-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <h1 className="text-white text-xl sm:text-2xl font-semibold">View Delivery Boy Fund Transfer</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Fund Transfer
        </button>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
        {/* Filters */}
        <div className="p-4 sm:p-6 border-b border-neutral-200">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-700 whitespace-nowrap">Filter by Delivery Boy:</label>
                <select
                  value={selectedDeliveryBoy}
                  onChange={(e) => {
                    setSelectedDeliveryBoy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-neutral-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 min-w-[200px]"
                >
                  <option value="all">All Delivery Boys</option>
                  {deliveryBoysList.map((boy) => (
                    <option key={boy._id} value={boy._id}>
                      {boy.name} ({boy.mobile})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-700 whitespace-nowrap">Type:</label>
                <select
                  value={selectedMethod}
                  onChange={(e) => {
                    setSelectedMethod(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-neutral-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="all">All</option>
                  <option value="Credit">Credit</option>
                  <option value="Debit">Debit</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <button
                onClick={handleExport}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Export
              </button>

              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-700">Search:</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search description..."
                  className="px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase">Delivery Boy</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-neutral-500">
                    <div className="flex justify-center items-center gap-2">
                       <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-600"></div>
                       Loading transfers...
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-neutral-500">No transactions found</td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t._id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 text-sm text-neutral-500">#{t._id.slice(-6)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900">{t.userName}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${t.type === 'Credit' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'Credit' ? '+' : '-'} ₹{t.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${t.type === 'Credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{t.description}</td>
                    <td className="px-6 py-4 text-sm text-neutral-500">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Fund Transfer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-teal-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-semibold flex items-center gap-2">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                 </svg>
                 Add Fund Transfer
              </h2>
              <button onClick={() => setShowModal(false)} className="text-teal-100 hover:text-white transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Select Delivery Boy*</label>
                <select
                   required
                   value={formData.deliveryBoyId}
                   onChange={e => setFormData({...formData, deliveryBoyId: e.target.value})}
                   className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                >
                   <option value="">Select a delivery boy</option>
                   {deliveryBoysList.map(boy => (
                     <option key={boy._id} value={boy._id}>{boy.name} ({boy.mobile})</option>
                   ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Amount* (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Type*</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as 'Credit' | 'Debit'})}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="Credit">Credit (+)</option>
                    <option value="Debit">Debit (-)</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Description / Message</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="e.g. Fuel allowance, Cash reconciliation"
                  rows={3}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 resize-none"
                />
              </div>
              
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-md hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : 'Confirm Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
