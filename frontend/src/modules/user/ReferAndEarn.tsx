import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api/config";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import IconLoader from "../../components/loaders/IconLoader";

export default function ReferAndEarn() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    refCode: string;
    coins: number;
    config: {
      enabled: boolean;
      referrerCoins: number;
      refereeCoins: number;
      rewardTrigger: string;
    };
    totalReferred: number;
    totalCoinsEarned: number;
    referrals: any[];
  } | null>(null);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login?redirect=/refer-earn");
      return;
    }
    fetchReferralData();
  }, [user]);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/customer/referral/details");
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to load referral data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!data?.refCode) return;
    navigator.clipboard.writeText(data.refCode);
    setCopied(true);
    showToast("Referral code copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    if (!data?.refCode) return;
    const refereeCoins = data.config?.refereeCoins ?? 5;
    const shareText = encodeURIComponent(
      `Hey! Use my referral code *${data.refCode}* when you join ApnaSabjiWala to get *${refereeCoins} FREE Coins* on fresh vegetables & grocery deliveries! 🥬🛒\n\nDownload/Open: ${window.location.origin}`
    );
    window.open(`https://api.whatsapp.com/send?text=${shareText}`, "_blank");
  };

  const handleNativeShare = async () => {
    if (!data?.refCode) return;
    const refereeCoins = data.config?.refereeCoins ?? 5;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join ApnaSabjiWala with my code!",
          text: `Use my referral code ${data.refCode} to get ${refereeCoins} Free Coins!`,
          url: window.location.origin,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopyCode();
    }
  };

  if (loading) return <IconLoader forceShow />;

  const referrerCoins = data?.config?.referrerCoins ?? 10;
  const refereeCoins = data?.config?.refereeCoins ?? 5;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16 md:mt-24 pb-24">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-emerald-600 to-green-500 rounded-3xl p-6 sm:p-10 text-white shadow-xl mb-8">
        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-teal-50 text-xs font-bold uppercase tracking-wider mb-3">
            🎁 Refer & Earn Rewards
          </span>
          <h1 className="text-3xl sm:text-4xl font-black mb-3 leading-tight tracking-tight">
            Invite Friends, <br className="hidden sm:block" />
            Earn <span className="text-yellow-300">🪙 {referrerCoins} Coins</span> Every Time!
          </h1>
          <p className="text-teal-50 text-sm sm:text-base leading-relaxed">
            Your friend gets <span className="font-bold text-white">🪙 {refereeCoins} Welcome Coins</span>, and you get <span className="font-bold text-white">🪙 {referrerCoins} Coins</span> when they sign up!
          </p>
        </div>

        {/* Decorative background floating icons */}
        <div className="absolute right-4 -bottom-6 sm:bottom-4 text-7xl sm:text-9xl opacity-25 select-none pointer-events-none">
          🎁
        </div>
      </div>

      {/* Referral Code Box */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-neutral-100 mb-8 text-center">
        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-2">
          Your Unique Referral Code
        </span>

        <div className="max-w-md mx-auto flex items-center justify-between bg-neutral-50 border-2 border-dashed border-teal-500/40 rounded-2xl p-2.5 sm:p-3 mb-6">
          <span className="font-mono text-xl sm:text-2xl font-black text-teal-800 tracking-widest px-3">
            {data?.refCode || "CODE"}
          </span>
          <button
            onClick={handleCopyCode}
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 ${
              copied
                ? "bg-green-600 text-white"
                : "bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
            }`}
          >
            {copied ? (
              <>
                <span>✓</span> Copied
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy Code
              </>
            )}
          </button>
        </div>

        {/* Share Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
          <button
            onClick={handleWhatsAppShare}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-2xl font-bold text-sm shadow-md transition-all"
          >
            <span>💬</span> Share via WhatsApp
          </button>

          <button
            onClick={handleNativeShare}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl font-bold text-sm shadow-md transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Share Code
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm flex flex-col items-center text-center">
          <span className="text-3xl mb-1">👥</span>
          <span className="text-2xl sm:text-3xl font-black text-neutral-900">{data?.totalReferred ?? 0}</span>
          <span className="text-xs font-semibold text-neutral-500 mt-0.5">Friends Invited</span>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm flex flex-col items-center text-center">
          <span className="text-3xl mb-1">🪙</span>
          <span className="text-2xl sm:text-3xl font-black text-teal-700">{data?.totalCoinsEarned ?? 0}</span>
          <span className="text-xs font-semibold text-neutral-500 mt-0.5">Total Coins Earned</span>
        </div>
      </div>

      {/* How it Works Section */}
      <div className="bg-neutral-50 rounded-3xl p-6 sm:p-8 border border-neutral-200/60 mb-8">
        <h2 className="text-lg font-bold text-neutral-900 mb-5 flex items-center gap-2">
          <span>⚡</span> How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs flex flex-col">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-sm mb-3">
              1
            </div>
            <h3 className="font-bold text-sm text-neutral-900 mb-1">Share Your Code</h3>
            <p className="text-xs text-neutral-500">Send your unique referral code to your friends and family.</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs flex flex-col">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-sm mb-3">
              2
            </div>
            <h3 className="font-bold text-sm text-neutral-900 mb-1">Friend Signs Up</h3>
            <p className="text-xs text-neutral-500">Your friend enters your code during their first login / signup.</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-xs flex flex-col">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-sm mb-3">
              3
            </div>
            <h3 className="font-bold text-sm text-neutral-900 mb-1">Both Get Coins!</h3>
            <p className="text-xs text-neutral-500">
              You get {referrerCoins} coins and your friend gets {refereeCoins} coins to redeem for awesome gifts!
            </p>
          </div>
        </div>
      </div>

      {/* Referral History List */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm">
        <h2 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
          <span>📋</span> Invited Friends
        </h2>

        {data?.referrals && data.referrals.length > 0 ? (
          <div className="divide-y divide-neutral-100">
            {data.referrals.map((item: any) => (
              <div key={item._id} className="py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-sm font-bold text-teal-700">
                    {item.referee?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-neutral-900">{item.referee?.name || "New Friend"}</h4>
                    <p className="text-xs text-neutral-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-black text-teal-700">
                    +🪙 {item.referrerCoins}
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    item.status === "Completed"
                      ? "bg-green-100 text-green-700"
                      : item.status === "Pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-neutral-100 text-neutral-600"
                  }`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <span className="text-4xl mb-2 block">🤝</span>
            <p className="text-sm font-semibold text-neutral-700">No friends invited yet</p>
            <p className="text-xs text-neutral-400 mt-0.5">Share your code above to start earning rewards!</p>
          </div>
        )}
      </div>
    </div>
  );
}
