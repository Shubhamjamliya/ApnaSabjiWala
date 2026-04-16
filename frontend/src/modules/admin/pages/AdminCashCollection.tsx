import { useState, useEffect } from "react";
import {
  getCashCollections,
  createCashCollection,
  type CashCollection,
  type CreateCashCollectionData,
} from "../../../services/api/admin/adminDeliveryService";
import { getDeliveryBoys } from "../../../services/api/admin/adminDeliveryService";
import { useAuth } from "../../../context/AuthContext";

export default function AdminCashCollection() {
  const { isAuthenticated, token } = useAuth();
  const [cashCollections, setCashCollections] = useState<CashCollection[]>([]);
  const [deliveryBoys, setDeliveryBoys] = useState<any[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState("all");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    deliveryBoyId: '',
    amount: '',
    remark: ''
  });

  // Fetch delivery boys and cash collections
  const fetchData = async () => {
    if (!isAuthenticated || !token) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch delivery boys for the dropdown
      const deliveryBoysResponse = await getDeliveryBoys({
        status: "Active",
        limit: 100,
      });
      if (deliveryBoysResponse.success) {
        setDeliveryBoys(deliveryBoysResponse.data);
      }

      // Fetch cash collections
      const params: any = {
        page: currentPage,
        limit: entriesPerPage,
      };

      if (selectedDeliveryBoy !== "all") {
        params.deliveryBoyId = selectedDeliveryBoy;
      }

      params.minAmount = 0.01; // Exclude zero or negative amounts

      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (searchTerm) params.search = searchTerm;

      const cashResponse = await getCashCollections(params);

      if (cashResponse.success) {
        setCashCollections(cashResponse.data);
        if (cashResponse.pagination) {
          setTotalPages(cashResponse.pagination.pages);
          setTotalEntries(cashResponse.pagination.total);
        }
      } else {
        setError("Failed to load cash collections");
      }
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err.response?.data?.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAuthenticated, token, currentPage, entriesPerPage, selectedDeliveryBoy, fromDate, toDate, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.deliveryBoyId || !formData.amount) {
      alert("Please fill all required fields");
      return;
    }

    try {
      setSubmitting(true);
      const res = await createCashCollection({
        deliveryBoyId: formData.deliveryBoyId,
        amount: Number(formData.amount),
        remark: formData.remark
      });

      if (res.success) {
        setShowModal(false);
        setFormData({ deliveryBoyId: '', amount: '', remark: '' });
        setCurrentPage(1);
        fetchData();
        alert("Cash collection recorded successfully");
      } else {
        alert(res.message || "Failed to add collection");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Error adding collection");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    const headers = ["ID", "Delivery Boy", "Amount Collected", "Remark", "Date"];
    const csvContent = [
      headers.join(","),
      ...cashCollections.map((c) => [
        c._id.slice(-6),
        `"${c.deliveryBoyName}"`,
        c.amount.toFixed(2),
        `"${c.remark || ""}"`,
        new Date(c.collectedAt).toLocaleDateString(),
      ].join(",")),
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cash_collections_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + cashCollections.length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-teal-600 px-4 sm:px-6 py-4 rounded-t-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <h1 className="text-white text-xl sm:text-2xl font-semibold">Delivery Boy Cash Collection List</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Cash Collection
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
        {/* Filters */}
        <div className="p-4 sm:p-6 border-b border-neutral-200">
           <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
             <div className="flex flex-col sm:flex-row gap-3 flex-1 flex-wrap">
               <div className="flex items-center gap-2">
                 <label className="text-sm text-neutral-700 whitespace-nowrap">Filter by Delivery Boy:</label>
                 <select
                   value={selectedDeliveryBoy}
                   onChange={(e) => { setSelectedDeliveryBoy(e.target.value); setCurrentPage(1); }}
                   className="px-3 py-2 border border-neutral-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 min-w-[150px]"
                 >
                   <option value="all">All Delivery Boys</option>
                   {deliveryBoys.map((boy) => (
                     <option key={boy._id} value={boy._id}>{boy.name}</option>
                   ))}
                 </select>
               </div>
               
               <div className="flex items-center gap-2">
                 <label className="text-sm text-neutral-700">Search:</label>
                 <input
                   type="text"
                   value={searchTerm}
                   onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                   placeholder="Search ID, Delivery Boy..."
                   className="px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 min-w-[150px]"
                 />
               </div>
             </div>
             
             <div className="flex gap-2">
                <button onClick={handleExport} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                   Export
                </button>
             </div>
           </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase">Id</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase">Remark</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase">Date Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {loading ? (
                <tr>
                   <td colSpan={5} className="px-6 py-10 text-center text-neutral-500">Loading...</td>
                </tr>
              ) : cashCollections.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-neutral-500">No data available</td>
                </tr>
              ) : (
                cashCollections.map((c) => (
                  <tr key={c._id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 text-sm text-neutral-500">{c._id.slice(-6)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900">{c.deliveryBoyName}</td>
                    <td className="px-6 py-4 text-sm font-bold text-teal-600">₹{c.amount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{c.remark || '-'}</td>
                    <td className="px-6 py-4 text-sm text-neutral-500">{new Date(c.collectedAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-between">
           <div className="text-sm text-neutral-500">
             Showing {startIndex + 1} to {endIndex} of {totalEntries} entries
           </div>
           <div className="flex gap-2">
             <button 
               disabled={currentPage === 1}
               onClick={() => setCurrentPage(p => p - 1)}
               className="p-2 border border-neutral-300 rounded disabled:opacity-50"
             >
               Previous
             </button>
             <button 
               disabled={currentPage === totalPages}
               onClick={() => setCurrentPage(p => p + 1)}
               className="p-2 border border-neutral-300 rounded disabled:opacity-50"
             >
               Next
             </button>
           </div>
        </div>
      </div>

      {/* Add Cash Collection Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-teal-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-semibold flex items-center gap-2">
                 Add Cash Collection
              </h2>
              <button onClick={() => setShowModal(false)} className="text-teal-100 hover:text-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Select Delivery Boy*</label>
                <select
                   required
                   value={formData.deliveryBoyId}
                   onChange={e => setFormData({...formData, deliveryBoyId: e.target.value})}
                   className="w-full px-3 py-2 border rounded-md"
                >
                   <option value="">Select a delivery boy</option>
                   {deliveryBoys.map(boy => (
                     <option key={boy._id} value={boy._id}>{boy.name}</option>
                   ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Amount Collected* (₹)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                  placeholder="Enter amount"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Remark</label>
                <textarea
                  value={formData.remark}
                  onChange={e => setFormData({...formData, remark: e.target.value})}
                  placeholder="Optional remark"
                  className="w-full px-3 py-2 border rounded-md"
                  rows={2}
                />
              </div>
              
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-md">Cancel</button>
                <button 
                   type="submit" 
                   disabled={submitting}
                   className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-md disabled:bg-teal-300"
                >
                   {submitting ? 'Adding...' : 'Add Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <div className="bg-neutral-800 text-white text-center text-sm py-4">
        Copyright © 2025. Developed By <a href="#" className="text-blue-400">Apna Sabji Wala</a>
      </div>
    </div>
  );
}
