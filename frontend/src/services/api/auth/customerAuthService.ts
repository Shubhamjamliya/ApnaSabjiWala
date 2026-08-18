import api, { setAuthToken, setUserData } from '../config';
import { clearAuthSessionWithFCM } from '../../pushNotificationService';

const handleApiError = (error: any) => {
  if (error.response && error.response.data && error.response.data.message) {
    throw new Error(error.response.data.message);
  }
  throw new Error(error.message || 'An unexpected error occurred');
};

export interface SendOTPResponse {
  success: boolean;
  message: string;
  sessionId?: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      id: string;
      name: string;
      phone: string;
      email: string;
      walletAmount: number;
      refCode: string;
      status: string;
    };
    isNewUser?: boolean;
  };
}

/**
 * Send SMS OTP to customer mobile number
 */
export const sendOTP = async (mobile: string): Promise<SendOTPResponse> => {
  try {
    const response = await api.post<SendOTPResponse>('/auth/customer/send-sms-otp', { mobile });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Verify SMS OTP and login customer
 * Auto-creates customer if not exists
 */
export const verifyOTP = async (mobile: string, otp: string, sessionId?: string): Promise<VerifyOTPResponse> => {
  try {
    const response = await api.post<VerifyOTPResponse>('/auth/customer/verify-sms-otp', { mobile, otp, sessionId });

    if (response.data.success && response.data.data.token) {
      setAuthToken(response.data.data.token, 'customer');
      // Add userType to user data for proper identification
      const userData = {
        ...response.data.data.user,
        userType: 'Customer'
      };
      setUserData(userData, 'customer');
    }

    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Logout customer
 */
export const logout = (): Promise<void> => clearAuthSessionWithFCM('customer');

