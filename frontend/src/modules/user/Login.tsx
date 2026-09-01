import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sendOTP, verifyOTP } from '../../services/api/auth/customerAuthService';
import api from '../../services/api/config';
import { useAuth } from '../../context/AuthContext';
import OTPInput from '../../components/OTPInput';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useToast } from '../../context/ToastContext';

export default function Login() {
  const RESEND_OTP_COOLDOWN = 30;
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  const { userLogo } = useAppSettings();
  const redirectPath = new URLSearchParams(window.location.search).get('redirect') || '/';
  const [mobileNumber, setMobileNumber] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // New User Welcome & Referral Modal State
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [referralApplying, setReferralApplying] = useState(false);
  const [referralError, setReferralError] = useState('');

  useEffect(() => {
    if (resendTimer <= 0) return;

    const timerId = window.setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          window.clearInterval(timerId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [resendTimer]);

  const handleContinue = async () => {
    if (mobileNumber.length !== 10) return;

    setLoading(true);
    setError('');

    try {
      const response = await sendOTP(mobileNumber);
      if (response.sessionId) {
        setSessionId(response.sessionId);
      }
      setShowOTP(true);
      setResendTimer(RESEND_OTP_COOLDOWN);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPComplete = async (otp: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await verifyOTP(mobileNumber, otp, sessionId);
      if (response.success && response.data) {
        login(response.data.token, {
          id: response.data.user.id,
          name: response.data.user.name,
          phone: response.data.user.phone,
          email: response.data.user.email,
          userType: 'Customer',
          walletAmount: response.data.user.walletAmount,
          refCode: response.data.user.refCode,
          status: response.data.user.status,
        });

        if (response.data.isNewUser) {
          // Open referral popup for first-time login
          setShowWelcomeModal(true);
        } else {
          const safeRedirect = redirectPath.startsWith('/') ? redirectPath : '/';
          navigate(safeRedirect);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralCodeInput.trim()) return;

    setReferralApplying(true);
    setReferralError('');

    try {
      const res = await api.post('/customer/referral/apply', {
        referralCode: referralCodeInput.trim().toUpperCase(),
      });

      if (res.data.success) {
        showToast(res.data.message || 'Referral bonus claimed!', 'success');
        setShowWelcomeModal(false);
        const safeRedirect = redirectPath.startsWith('/') ? redirectPath : '/';
        navigate(safeRedirect);
      }
    } catch (err: any) {
      setReferralError(err.response?.data?.message || 'Invalid referral code');
    } finally {
      setReferralApplying(false);
    }
  };

  const handleSkipReferral = () => {
    setShowWelcomeModal(false);
    const safeRedirect = redirectPath.startsWith('/') ? redirectPath : '/';
    navigate(safeRedirect);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-green-50 flex flex-col items-center justify-center px-4 py-8 relative">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-neutral-50 transition-colors"
        aria-label="Back"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header Section */}
        <div className="relative pt-8 pb-6 px-6 text-center bg-gradient-to-br from-green-500 to-green-600 overflow-hidden">
          {/* Decorative Circles */}
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-28 h-28 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-2 flex items-center justify-center mb-4 border border-green-400/30 transform hover:scale-105 transition-transform duration-300">
              <img
                src={userLogo || "/assets/barodamart.png"}
                alt="BarodaMart"
                className="w-full h-full object-contain"
              />
            </div>

            <h1 className="text-2xl font-bold text-white mb-1 tracking-tight drop-shadow-sm">
              Login
            </h1>
            <p className="text-green-50 text-sm font-medium bg-green-700/30 px-3 py-1 rounded-full border border-green-400/20">
              Fast Grocery & Daily Essentials
            </p>
          </div>
        </div>

        {/* Login Form Body */}
        <div className="p-6 space-y-4">
          {!showOTP ? (
            /* Mobile Login Form */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Mobile Number
                </label>
                <div className="flex items-center bg-white border border-neutral-300 rounded-lg overflow-hidden focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-200 transition-all">
                  <div className="px-3 py-2.5 text-sm font-medium text-neutral-600 border-r border-neutral-300 bg-neutral-50">
                    +91
                  </div>
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter mobile number"
                    className="flex-1 px-3 py-2.5 text-sm placeholder:text-neutral-400 focus:outline-none"
                    maxLength={10}
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <button
                onClick={handleContinue}
                disabled={mobileNumber.length !== 10 || loading}
                className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors ${mobileNumber.length === 10 && !loading
                  ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-md'
                  : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                  }`}
              >
                {loading ? 'Sending OTP...' : 'Continue'}
              </button>
            </div>
          ) : (
            /* OTP Verification Form */
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-neutral-600 mb-2">
                  Enter the 4-digit OTP sent to
                </p>
                <p className="text-sm font-semibold text-neutral-800">+91 {mobileNumber}</p>
              </div>

              <div className="flex justify-center">
                <OTPInput onComplete={handleOTPComplete} disabled={loading} />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded text-center">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowOTP(false);
                    setError('');
                    setResendTimer(0);
                  }}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-lg font-semibold text-sm bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors border border-neutral-300"
                >
                  Change Number
                </button>
                <button
                  onClick={handleContinue}
                  disabled={loading || resendTimer > 0}
                  className={`flex-1 py-2.5 rounded-lg font-semibold text-sm border transition-colors ${loading || resendTimer > 0
                    ? 'bg-neutral-100 text-neutral-400 border-neutral-300 cursor-not-allowed'
                    : 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700'
                    }`}
                >
                  {loading ? 'Sending...' : resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                </button>
              </div>
            </div>
          )}

          {/* Customer Notice */}
          <div className="text-center pt-2 border-t border-neutral-200">
            <p className="text-xs text-neutral-500">
              Access your saved addresses from BarodaMart automatically!
            </p>
          </div>

          {/* Legal Links */}
          <div className="flex justify-center gap-4 mt-2 text-xs text-neutral-500">
            <Link to="/customer/policy" className="hover:text-neutral-800 underline">Privacy Policy</Link>
            <Link to="/customer/terms" className="hover:text-neutral-800 underline">Terms & Conditions</Link>
            <Link to="/customer/support" className="hover:text-neutral-800 underline">Support</Link>
          </div>
        </div>
      </div>

      {/* New User Welcome & Referral Code Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center transform transition-all animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg shadow-yellow-500/20 mb-4 animate-bounce">
              🎁
            </div>

            <h2 className="text-xl font-black text-neutral-900 mb-1">
              Welcome to ApnaSabjiWala! 🎉
            </h2>
            <p className="text-xs text-neutral-500 mb-5 leading-relaxed">
              Did a friend invite you? Enter their <span className="font-semibold text-teal-700">Referral Code</span> to unlock bonus welcome reward coins!
            </p>

            <form onSubmit={handleApplyReferral} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="e.g. AMIT4821"
                  value={referralCodeInput}
                  onChange={(e) => {
                    setReferralCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                    setReferralError('');
                  }}
                  className="w-full text-center tracking-widest uppercase font-mono font-bold text-lg px-4 py-3 bg-neutral-50 border-2 border-dashed border-teal-500/50 rounded-xl focus:border-teal-600 focus:bg-white outline-none transition-all placeholder:text-neutral-300"
                  maxLength={10}
                />
                {referralError && (
                  <p className="text-xs text-red-500 mt-1.5 font-medium">{referralError}</p>
                )}
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={!referralCodeInput.trim() || referralApplying}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-700 hover:to-green-700 text-white shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {referralApplying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Claiming Reward...</span>
                    </>
                  ) : (
                    <span>Apply Code & Claim Coins 🪙</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSkipReferral}
                  className="w-full py-2.5 rounded-xl font-semibold text-xs text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 transition-colors"
                >
                  I don't have a code, Skip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


