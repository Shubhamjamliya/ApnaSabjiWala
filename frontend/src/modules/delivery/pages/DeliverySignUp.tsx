import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  register,
  sendOTP,
  verifyOTP,
} from "../../../services/api/auth/deliveryAuthService";
import { clearAuthSessionWithFCM } from "../../../services/pushNotificationService";
import { uploadDocument } from "../../../services/api/uploadService";
import { validateDocumentFile } from "../../../utils/imageUpload";
import OTPInput from "../../../components/OTPInput";
import { useAppSettings } from "../../../context/AppSettingsContext";

export default function DeliverySignUp() {
  const { deliveryLogo } = useAppSettings();
  const ALPHABET_ONLY_REGEX = /^[A-Za-z ]+$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const DOB_REGEX = /^\d{4}-\d{2}-\d{2}$/;
  const PINCODE_REGEX = /^\d{6}$/;
  const ACCOUNT_NUMBER_REGEX = /^\d{9,15}$/;
  const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    dateOfBirth: "",
    address: "",
    city: "",
    pincode: "",
    drivingLicenseUrl: "",
    nationalIdentityCardUrl: "",
    accountName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    bonusType: "",
    aadhaarFrontPhotoUrl: "",
    aadhaarBackPhotoUrl: "",
    livePhotoUrl: "",
    panCardPhotoUrl: "",
  });

  // File state for UI
  const [drivingLicenseFile, setDrivingLicenseFile] = useState<File | null>(
    null
  );
  const [nationalIdentityCardFile, setNationalIdentityCardFile] =
    useState<File | null>(null);
  const [aadhaarFrontFile, setAadhaarFrontFile] = useState<File | null>(null);
  const [aadhaarBackFile, setAadhaarBackFile] = useState<File | null>(null);
  const [livePhotoFile, setLivePhotoFile] = useState<File | null>(null);
  const [panCardFile, setPanCardFile] = useState<File | null>(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isCityLoading, setIsCityLoading] = useState(false);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraError, setCameraError] = useState("");

  const startCamera = async () => {
    setIsCameraOpen(true);
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraError("Unable to access camera. Please allow camera permissions in your browser.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], "live_photo.jpg", {
                type: "image/jpeg",
              });
              setLivePhotoFile(file);
              setError(""); // Clear any required doc errors
            }
          },
          "image/jpeg",
          0.9
        );

        stopCamera();
      }
    }
  };

  const sanitizeAlphabetValue = (value: string) =>
    value.replace(/[^A-Za-z ]/g, "").replace(/\s+/g, " ").trimStart();

  const bonusTypes = [
    "Select Bonus Type",
    "Fixed or Salaried",
    "Fixed",
    "Salaried",
    "Commission Based",
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "mobile") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/\D/g, "").slice(0, 10),
      }));
    } else if (name === "name" || name === "city" || name === "accountName" || name === "bankName") {
      setFormData((prev) => ({
        ...prev,
        [name]: sanitizeAlphabetValue(value),
      }));
    } else if (name === "pincode") {
      setFormData((prev) => ({
        ...prev,
        pincode: value.replace(/\D/g, "").slice(0, 6),
      }));
    } else if (name === "accountNumber") {
      setFormData((prev) => ({
        ...prev,
        accountNumber: value.replace(/\D/g, "").slice(0, 15),
      }));
    } else if (name === "ifscCode") {
      setFormData((prev) => ({
        ...prev,
        ifscCode: value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === "email" ? value.trim() : value,
      }));
    }
  };

  const fetchCityFromLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsCityLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
          );
          const data = await response.json();
          if (data.status === "OK") {
            const addressComponents = data.results[0].address_components;
            const cityComponent = addressComponents.find((c: any) =>
              c.types.includes("locality") || c.types.includes("administrative_area_level_2")
            );
            if (cityComponent) {
              setFormData((prev) => ({ ...prev, city: cityComponent.long_name }));
            }
          } else {
            setError("Could not fetch city from your location");
          }
        } catch (err) {
          setError("Failed to fetch city details");
        } finally {
          setIsCityLoading(false);
        }
      },
      (err) => {
        setError("Location access denied. Please type your city manually.");
        setIsCityLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 10000
      }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (!files || !files[0]) return;

    const file = files[0];
    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      setError(validation.error || "Invalid document file");
      return;
    }

    if (name === "drivingLicense") {
      setDrivingLicenseFile(file);
    } else if (name === "nationalIdentityCard") {
      setNationalIdentityCardFile(file);
    } else if (name === "aadhaarFrontPhoto") {
      setAadhaarFrontFile(file);
    } else if (name === "aadhaarBackPhoto") {
      setAadhaarBackFile(file);
    } else if (name === "livePhoto") {
      setLivePhotoFile(file);
    } else if (name === "panCardPhoto") {
      setPanCardFile(file);
    }
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (
      !formData.name ||
      !formData.mobile ||
      !formData.email ||
      !formData.address ||
      !formData.city ||
      !formData.pincode
    ) {
      setError("Please fill all required fields");
      return;
    }

    if (!ALPHABET_ONLY_REGEX.test(formData.name.trim())) {
      setError("Name should contain only alphabets");
      return;
    }

    if (!EMAIL_REGEX.test(formData.email)) {
      setError("Please enter a valid email address (e.g. ags@gmail.com)");
      return;
    }

    if (formData.dateOfBirth && !DOB_REGEX.test(formData.dateOfBirth)) {
      setError("DOB year should be 4 digits");
      return;
    }

    if (!ALPHABET_ONLY_REGEX.test(formData.city.trim())) {
      setError("City should contain only alphabets");
      return;
    }

    if (!PINCODE_REGEX.test(formData.pincode)) {
      setError("Pincode should be 6 digits");
      return;
    }

    if (formData.accountName && !ALPHABET_ONLY_REGEX.test(formData.accountName.trim())) {
      setError("Account name should contain only alphabets");
      return;
    }

    if (formData.accountNumber && !ACCOUNT_NUMBER_REGEX.test(formData.accountNumber)) {
      setError("Account number should be 9 to 15 digits");
      return;
    }

    if (formData.bankName && !ALPHABET_ONLY_REGEX.test(formData.bankName.trim())) {
      setError("Bank name should contain only alphabets");
      return;
    }

    if (formData.ifscCode && !IFSC_REGEX.test(formData.ifscCode)) {
      setError("IFSC Code should be in format SBIN0001234");
      return;
    }

    if (formData.mobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    if (!drivingLicenseFile || !nationalIdentityCardFile || !aadhaarFrontFile || !aadhaarBackFile || !livePhotoFile || !panCardFile) {
      setError("Please upload all required documents");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Upload required documents
      let drivingLicenseUrl = formData.drivingLicenseUrl;
      let nationalIdentityCardUrl = formData.nationalIdentityCardUrl;
      let aadhaarFrontPhotoUrl = formData.aadhaarFrontPhotoUrl;
      let aadhaarBackPhotoUrl = formData.aadhaarBackPhotoUrl;
      let livePhotoUrl = formData.livePhotoUrl;
      let panCardPhotoUrl = formData.panCardPhotoUrl;

      setUploadingDocs(true);
      try {
        const drivingLicenseResult = await uploadDocument(
          drivingLicenseFile,
          "barodamart/delivery/documents"
        );
        drivingLicenseUrl = drivingLicenseResult.secureUrl;

        const nationalIdResult = await uploadDocument(
          nationalIdentityCardFile,
          "barodamart/delivery/documents"
        );
        nationalIdentityCardUrl = nationalIdResult.secureUrl;

        const aadhaarFrontResult = await uploadDocument(aadhaarFrontFile, "barodamart/delivery/documents");
        aadhaarFrontPhotoUrl = aadhaarFrontResult.secureUrl;

        const aadhaarBackResult = await uploadDocument(aadhaarBackFile, "barodamart/delivery/documents");
        aadhaarBackPhotoUrl = aadhaarBackResult.secureUrl;

        const livePhotoResult = await uploadDocument(livePhotoFile, "barodamart/delivery/documents");
        livePhotoUrl = livePhotoResult.secureUrl;

        const panCardResult = await uploadDocument(panCardFile, "barodamart/delivery/documents");
        panCardPhotoUrl = panCardResult.secureUrl;
      } finally {
        setUploadingDocs(false);
      }

      // Keep password in payload for backend compatibility, but hide it from UI.
      const generatedPassword = `Delivery@${formData.mobile}`;

      const response = await register({
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email,
        dateOfBirth: formData.dateOfBirth || undefined,
        password: generatedPassword,
        address: formData.address,
        city: formData.city,
        pincode: formData.pincode,
        drivingLicense: drivingLicenseUrl || undefined,
        nationalIdentityCard: nationalIdentityCardUrl || undefined,
        aadhaarFrontPhoto: aadhaarFrontPhotoUrl || undefined,
        aadhaarBackPhoto: aadhaarBackPhotoUrl || undefined,
        livePhoto: livePhotoUrl || undefined,
        panCardPhoto: panCardPhotoUrl || undefined,
        accountName: formData.accountName || undefined,
        bankName: formData.bankName || undefined,
        accountNumber: formData.accountNumber || undefined,
        ifscCode: formData.ifscCode || undefined,
        bonusType: formData.bonusType || undefined,
      });

      if (response.success) {
        // Clear token from registration (we'll get it after OTP verification)
        await clearAuthSessionWithFCM('delivery');
        // Registration successful, now send SMS OTP for verification
        try {
          const otpRes = await sendOTP(formData.mobile);
          if (otpRes.sessionId) setSessionId(otpRes.sessionId);
          setShowOTP(true);
        } catch (otpErr: any) {
          setError(
            otpErr.message ||
            "Registration successful but failed to send OTP."
          );
        }
      }
    } catch (err: any) {
      setError(
        err.message || "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOTPComplete = async (otp: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await verifyOTP(formData.mobile, otp, sessionId);
      if (response.success) {
        navigate("/delivery");
      }
    } catch (err: any) {
      setError(err.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-green-50 flex flex-col items-center justify-center px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-neutral-50 transition-colors"
        aria-label="Back">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <path
            d="M15 18L9 12L15 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "black" }}
          />
        </svg>
      </button>

      {/* Sign Up Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header Section */}
        <div
          className="px-6 pt-3 pb-4 text-center border-b border-green-700"
          style={{
            backgroundColor: "rgb(21 178 74 / var(--tw-bg-opacity, 1))",
          }}>
          <div className="mb-2">
            <img
              src={deliveryLogo || "/assets/barodamart.png"}
              alt="BarodaMart Delivery"
              className="h-32 w-full max-w-xs mx-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Delivery Sign Up
          </h1>
          <p className="text-green-50 text-sm">
            Create your delivery partner account
          </p>
        </div>

        {/* Sign Up Form */}
        <div
          className="p-6 space-y-4 delivery-signup-form"
          style={{
            maxHeight: "70vh",
            overflowY: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}>
          <style>{`
            .delivery-signup-form::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {!showOTP ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-neutral-700 border-b pb-2">
                  Personal Information
                </h3>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    required
                    className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center bg-white border border-neutral-300 rounded-lg overflow-hidden focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-200">
                    <div className="px-3 py-2.5 text-sm font-medium text-neutral-600 border-r border-neutral-300 bg-neutral-50">
                      +91
                    </div>
                    <input
                      type="tel"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleInputChange}
                      placeholder="Enter mobile number"
                      required
                      maxLength={10}
                      className="flex-1 px-3 py-2.5 text-sm placeholder:text-neutral-400 focus:outline-none"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter email address"
                    required
                    className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter your address"
                    required
                    className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Enter your city"
                      required
                      className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                      disabled={loading || isCityLoading}
                    />
                    <button
                      type="button"
                      onClick={fetchCityFromLocation}
                      disabled={isCityLoading || loading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-teal-600 hover:bg-teal-50 rounded-md transition-colors disabled:text-neutral-400"
                      title="Fetch current location"
                    >
                      {isCityLoading ? (
                        <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    placeholder="Enter 6-digit pincode"
                    required
                    maxLength={6}
                    className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Bank Information */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-neutral-700 border-b pb-2">
                  Bank Account Information
                </h3>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Account Name
                  </label>
                  <input
                    type="text"
                    name="accountName"
                    value={formData.accountName}
                    onChange={handleInputChange}
                    placeholder="Account holder name"
                    className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    placeholder="Bank name"
                    className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    placeholder="Enter 9-15 digit account number"
                    className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={handleInputChange}
                    placeholder="SBIN0001234"
                    className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Bonus Type
                  </label>
                  <select
                    name="bonusType"
                    value={formData.bonusType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    disabled={loading}>
                    {bonusTypes.map((type) => (
                      <option
                        key={type}
                        value={type === "Select Bonus Type" ? "" : type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Documents Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-neutral-700 border-b pb-2">
                  Documents (Mandatory)
                </h3>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Driving License <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      name="drivingLicense"
                      onChange={handleFileChange}
                      accept="image/*,.pdf"
                      className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                      disabled={loading || uploadingDocs}
                    />
                    {drivingLicenseFile && (
                      <p className="text-xs text-neutral-600">
                        {drivingLicenseFile.name}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    National Identity Card <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      name="nationalIdentityCard"
                      onChange={handleFileChange}
                      accept="image/*,.pdf"
                      className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                      disabled={loading || uploadingDocs}
                    />
                    {nationalIdentityCardFile && (
                      <p className="text-xs text-neutral-600">
                        {nationalIdentityCardFile.name}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Aadhaar Front Photo <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      name="aadhaarFrontPhoto"
                      onChange={handleFileChange}
                      accept="image/*,.pdf"
                      className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                      disabled={loading || uploadingDocs}
                    />
                    {aadhaarFrontFile && (
                      <p className="text-xs text-neutral-600">
                        {aadhaarFrontFile.name}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Aadhaar Back Photo <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      name="aadhaarBackPhoto"
                      onChange={handleFileChange}
                      accept="image/*,.pdf"
                      className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                      disabled={loading || uploadingDocs}
                    />
                    {aadhaarBackFile && (
                      <p className="text-xs text-neutral-600">
                        {aadhaarBackFile.name}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Live Photo <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2 flex flex-col items-start">
                    <button
                      type="button"
                      onClick={startCamera}
                      className={`inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors cursor-pointer w-full ${
                        loading || uploadingDocs
                          ? "bg-neutral-100 text-neutral-400 border-neutral-300 cursor-not-allowed"
                          : "bg-white text-teal-600 border-teal-600 hover:bg-teal-50"
                      }`}
                      disabled={loading || uploadingDocs}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      </svg>
                      {livePhotoFile ? "Retake Photo" : "Click Photo"}
                    </button>
                    {livePhotoFile && (
                      <div className="mt-2 flex items-center justify-center w-full">
                         <img src={URL.createObjectURL(livePhotoFile)} alt="Live Photo" className="w-24 h-24 rounded-full object-cover border-2 border-teal-500" />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Pan Card Photo <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      name="panCardPhoto"
                      onChange={handleFileChange}
                      accept="image/*,.pdf"
                      className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                      disabled={loading || uploadingDocs}
                    />
                    {panCardFile && (
                      <p className="text-xs text-neutral-600">
                        {panCardFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || uploadingDocs}
                className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors ${!loading && !uploadingDocs
                  ? "bg-teal-600 text-white hover:bg-teal-700 shadow-md"
                  : "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                  }`}>
                {uploadingDocs
                  ? "Uploading Documents..."
                  : loading
                    ? "Creating Account..."
                    : "Sign Up"}
              </button>

              {/* Login Link */}
              <div className="text-center pt-2 border-t border-neutral-200">
                <p className="text-sm text-neutral-600">
                  Already have a delivery partner account?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/delivery/login")}
                    className="text-teal-600 hover:text-teal-700 font-semibold">
                    Login
                  </button>
                </p>
              </div>
            </form>
          ) : (
            /* OTP Verification Form */
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-neutral-600 mb-2">
                  Enter the 4-digit OTP sent via voice call to
                </p>
                <p className="text-sm font-semibold text-neutral-800">
                  +91 {formData.mobile}
                </p>
              </div>

              <OTPInput onComplete={handleOTPComplete} disabled={loading} />

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded text-center">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowOTP(false);
                    setError("");
                  }}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-lg font-semibold text-sm bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors border border-neutral-300">
                  Back
                </button>
                <button
                  onClick={async () => {
                    setLoading(true);
                    setError("");
                    try {
                      const res = await sendOTP(formData.mobile);
                      if (res.sessionId) setSessionId(res.sessionId);
                    } catch (err: any) {
                      setError(
                        err.message || "Failed to resend OTP."
                      );
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-lg font-semibold text-sm bg-teal-600 text-white hover:bg-teal-700 transition-colors">
                  {loading ? "Calling..." : "Resend OTP"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Text */}
      <p className="mt-6 text-xs text-neutral-500 text-center max-w-md mb-2">
        By continuing, you agree to BarodaMart's Terms of Service and Privacy Policy
      </p>

      {/* Legal Links */}
      <div className="flex justify-center gap-4 text-xs text-neutral-500 relative z-10">
        <Link to="/delivery/policy" className="hover:text-neutral-800 underline">Privacy Policy</Link>
        <Link to="/delivery/terms" className="hover:text-neutral-800 underline">Terms & Conditions</Link>
        <Link to="/delivery/support" className="hover:text-neutral-800 underline">Support</Link>
      </div>

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center">
            <h3 className="text-lg font-bold text-neutral-800 mb-4">Capture Live Photo</h3>
            
            {cameraError ? (
              <div className="text-red-500 text-center mb-4 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                {cameraError}
              </div>
            ) : (
              <div className="relative w-64 h-64 mb-6">
                <div className="absolute inset-0 rounded-full overflow-hidden border-4 border-teal-500 shadow-inner bg-black">
                  <video 
                    ref={videoRef}
                    autoPlay 
                    playsInline 
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                </div>
                {/* Face outline overlay */}
                <div className="absolute inset-0 pointer-events-none rounded-full flex items-center justify-center">
                   <div className="w-[70%] h-[80%] border-[3px] border-dashed border-white/70 rounded-[50%]"></div>
                </div>
              </div>
            )}
            
            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={stopCamera}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
              >
                Cancel
              </button>
              {!cameraError && (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  Capture
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

