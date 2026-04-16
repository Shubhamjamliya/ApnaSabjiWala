import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DeliveryHeader from '../components/DeliveryHeader';
import DeliveryBottomNav from '../components/DeliveryBottomNav';
import { useDeliveryUser } from '../context/DeliveryUserContext';
import { getDeliveryProfile, updateProfile, getDashboardStats } from '../../../services/api/delivery/deliveryService';
import { sendTestNotification } from '../../../services/pushNotificationService';
import { useToast } from '../../../context/ToastContext';

export default function DeliveryProfile() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const { userName, setUserName } = useDeliveryUser();
  const { showToast } = useToast();
  const [testNotifLoading, setTestNotifLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    status: 'Inactive',
    vehicleNumber: '',
    vehicleType: 'Bike',
    joinDate: '',
    totalDeliveries: 0,
    rating: 0,
    drivingLicense: '',
    nationalIdentityCard: '',
    accountName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
  });

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [data, stats] = await Promise.all([
          getDeliveryProfile(),
          getDashboardStats()
        ]);
        setProfileData({
          name: data.name,
          phone: data.mobile,
          email: data.email,
          address: data.location?.address || data.address || '',
          status: data.status || 'Inactive',
          vehicleNumber: data.vehicleNumber || '',
          vehicleType: data.vehicleType || 'Bike',
          joinDate: new Date(data.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          totalDeliveries: stats.totalDeliveredCount || 0,
          rating: 4.8, // Mock for now
          drivingLicense: data.drivingLicense || '',
          nationalIdentityCard: data.nationalIdentityCard || '',
          accountName: data.accountName || '',
          bankName: data.bankName || '',
          accountNumber: data.accountNumber || '',
          ifscCode: data.ifscCode || '',
        });
        setUserName(data.name);
      } catch (error) {
        console.error("Failed to fetch profile", error);
      }
    };
    fetchProfile();
  }, [setUserName]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Re-fetch or reset to previous state
  };

  const handleSave = async () => {
    // Validation
    const nameRegex = /^[a-zA-Z\s]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const vehicleRegex = /^[A-Z0-9\s-]+$/i;
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    const accountRegex = /^\d{9,15}$/;

    if (!nameRegex.test(profileData.name)) {
      showToast("Name should only contain alphabets", "error");
      return;
    }
    if (profileData.email && !emailRegex.test(profileData.email)) {
      showToast("Please enter a valid email (ex: ags@gmail.com)", "error");
      return;
    }
    if (!vehicleRegex.test(profileData.vehicleNumber)) {
      showToast("Vehicle number should be in correct format", "error");
      return;
    }
    if (profileData.accountName && !nameRegex.test(profileData.accountName)) {
      showToast("Account holder name should only contain alphabets", "error");
      return;
    }
    if (profileData.bankName && !nameRegex.test(profileData.bankName)) {
      showToast("Bank name should only contain alphabets", "error");
      return;
    }
    if (profileData.accountNumber && !accountRegex.test(profileData.accountNumber)) {
      showToast("Account number should be 9-15 digits", "error");
      return;
    }
    if (profileData.ifscCode && !ifscRegex.test(profileData.ifscCode)) {
      showToast("IFSC code should be in format (ex: SBIN0001234)", "error");
      return;
    }

    try {
      await updateProfile({
        name: profileData.name,
        email: profileData.email,
        address: profileData.address,
        vehicleNumber: profileData.vehicleNumber.toUpperCase(),
        vehicleType: profileData.vehicleType,
        accountName: profileData.accountName,
        bankName: profileData.bankName,
        accountNumber: profileData.accountNumber,
        ifscCode: profileData.ifscCode.toUpperCase(),
      });
      setUserName(profileData.name);
      setIsEditing(false);
      showToast("Profile updated successfully", "success");
    } catch (error) {
      console.error("Failed to update profile", error);
      showToast("Failed to update profile", "error");
    }
  };

  const handleTestNotification = async () => {
    try {
      setTestNotifLoading(true);
      const result = await sendTestNotification();
      if (result.success) {
        showToast(result.message, 'success');
      } else {
        showToast(result.message, 'error');
      }
    } catch (err: any) {
      showToast('Failed to send test notification', 'error');
    } finally {
      setTestNotifLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="min-h-screen bg-neutral-100 pb-20">
      <DeliveryHeader />
      <div className="px-4 py-4">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate(-1)}
            className="mr-3 p-2 hover:bg-neutral-200 rounded-full transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h2 className="text-neutral-900 text-xl font-semibold">Profile</h2>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200 mb-4">
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mb-4">
              <span className="text-white text-3xl font-bold">
                {profileData.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            {isEditing ? (
              <div className="w-full max-w-xs">
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full text-center text-neutral-900 text-xl font-semibold mb-2 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full text-center text-neutral-600 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            ) : (
              <>
                <h3 className="text-neutral-900 text-xl font-semibold mb-1">{profileData.name}</h3>
                <p className="text-neutral-600 text-sm">{profileData.phone}</p>
                <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${profileData.status === 'Active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
                  }`}>
                  {profileData.status === 'Active' ? 'Verified' : 'Pending Verification'}
                </span>
              </>
            )}
            <div className="flex items-center gap-1 mt-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  fill="#22c55e"
                />
              </svg>
              <span className="text-neutral-900 font-semibold">{profileData.rating}</span>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-neutral-900 font-semibold">Personal Information</h3>
          </div>
          <div className="divide-y divide-neutral-200">
            <div className="p-4">
              <p className="text-neutral-500 text-xs mb-1">Email</p>
              {isEditing ? (
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full text-neutral-900 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              ) : (
                <p className="text-neutral-900 text-sm">{profileData.email}</p>
              )}
            </div>
            <div className="p-4">
              <p className="text-neutral-500 text-xs mb-1">Address</p>
              {isEditing ? (
                <textarea
                  value={profileData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={2}
                  className="w-full text-neutral-900 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              ) : (
                <p className="text-neutral-900 text-sm">{profileData.address}</p>
              )}
            </div>
            <div className="p-4">
              <p className="text-neutral-500 text-xs mb-1">Vehicle Number</p>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.vehicleNumber}
                  onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
                  className="w-full text-neutral-900 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              ) : (
                <p className="text-neutral-900 text-sm">{profileData.vehicleNumber}</p>
              )}
            </div>
            <div className="p-4">
              <p className="text-neutral-500 text-xs mb-1">Vehicle Type</p>
              {isEditing ? (
                <select
                  value={profileData.vehicleType}
                  onChange={(e) => handleInputChange('vehicleType', e.target.value)}
                  className="w-full text-neutral-900 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="Bike" className="bg-white text-neutral-900">Bike</option>
                  <option value="Scooter" className="bg-white text-neutral-900">Scooter</option>
                  <option value="Car" className="bg-white text-neutral-900">Car</option>
                  <option value="Cycle" className="bg-white text-neutral-900">Cycle</option>
                </select>
              ) : (
                <p className="text-neutral-900 text-sm">{profileData.vehicleType}</p>
              )}
            </div>
          </div>
        </div>

        {/* Document Details */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden mt-4">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-neutral-900 font-semibold">Verification Documents</h3>
          </div>
          <div className="divide-y divide-neutral-200">
            <div className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-neutral-500 text-xs mb-1">Driving License</p>
                <p className="text-neutral-900 text-sm">
                  {profileData.drivingLicense ? 'Uploaded' : 'Not Uploaded'}
                </p>
              </div>
              {profileData.drivingLicense ? (
                <a
                  href={profileData.drivingLicense}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-orange-600 hover:text-orange-700"
                >
                  View
                </a>
              ) : null}
            </div>
            <div className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-neutral-500 text-xs mb-1">National Identity Card</p>
                <p className="text-neutral-900 text-sm">
                  {profileData.nationalIdentityCard ? 'Uploaded' : 'Not Uploaded'}
                </p>
              </div>
              {profileData.nationalIdentityCard ? (
                <a
                  href={profileData.nationalIdentityCard}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-orange-600 hover:text-orange-700"
                >
                  View
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden mt-4">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-neutral-900 font-semibold">Bank Details</h3>
          </div>
          <div className="divide-y divide-neutral-200">
            <div className="p-4">
              <p className="text-neutral-500 text-xs mb-1">Account Holder Name</p>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.accountName}
                  onChange={(e) => handleInputChange('accountName', e.target.value)}
                  className="w-full text-neutral-900 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter account holder name"
                />
              ) : (
                <p className="text-neutral-900 text-sm">{profileData.accountName || 'Not Set'}</p>
              )}
            </div>
            <div className="p-4">
              <p className="text-neutral-500 text-xs mb-1">Bank Name</p>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.bankName}
                  onChange={(e) => handleInputChange('bankName', e.target.value)}
                  className="w-full text-neutral-900 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. HDFC Bank"
                />
              ) : (
                <p className="text-neutral-900 text-sm">{profileData.bankName || 'Not Set'}</p>
              )}
            </div>
            <div className="p-4">
              <p className="text-neutral-500 text-xs mb-1">Account Number</p>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.accountNumber}
                  onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                  className="w-full text-neutral-900 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter account number"
                />
              ) : (
                <p className="text-neutral-900 text-sm">{profileData.accountNumber ? `XXXX${profileData.accountNumber.slice(-4)}` : 'Not Set'}</p>
              )}
            </div>
            <div className="p-4">
              <p className="text-neutral-500 text-xs mb-1">IFSC Code</p>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.ifscCode}
                  onChange={(e) => handleInputChange('ifscCode', e.target.value)}
                  className="w-full text-neutral-900 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. HDFC0001234"
                />
              ) : (
                <p className="text-neutral-900 text-sm">{profileData.ifscCode || 'Not Set'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 mt-4 p-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-neutral-500 text-xs mb-1">Total Deliveries</p>
              <p className="text-neutral-900 text-2xl font-bold">{profileData.totalDeliveries}</p>
            </div>
            <div>
              <p className="text-neutral-500 text-xs mb-1">Joined On</p>
              <p className="text-neutral-900 text-sm font-semibold">{profileData.joinDate}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-neutral-100">
            <button
              onClick={handleTestNotification}
              disabled={testNotifLoading}
              className="w-full flex items-center justify-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700 disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {testNotifLoading ? 'Sending Test...' : 'Send Test Notification'}
            </button>
          </div>
        </div>

        {/* Edit/Save/Cancel Buttons */}
        {isEditing ? (
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCancel}
              className="flex-1 bg-neutral-200 text-neutral-900 rounded-xl py-3 font-semibold hover:bg-neutral-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-orange-500 text-white rounded-xl py-3 font-semibold hover:bg-orange-600 transition-colors"
            >
              Save Changes
            </button>
          </div>
        ) : (
          <button
            onClick={handleEdit}
            className="w-full mt-4 bg-orange-500 text-white rounded-xl py-3 font-semibold hover:bg-orange-600 transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>
      <DeliveryBottomNav />
    </div>
  );
}

