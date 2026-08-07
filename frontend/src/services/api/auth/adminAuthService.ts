import api, { setAuthToken, removeAuthToken, setUserData } from '../config';

const handleApiError = (error: any) => {
  if (error.response && error.response.data && error.response.data.message) {
    throw new Error(error.response.data.message);
  }
  throw new Error(error.message || 'An unexpected error occurred');
};

export interface SendOTPResponse {
  success: boolean;
  message: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      mobile: string;
      email: string;
      role: string;
    };
  };
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  password: string;
  role?: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      mobile: string;
      email: string;
      role: string;
    };
  };
}

/**
 * Send OTP to admin mobile number
 */
export const sendOTP = async (mobile: string): Promise<SendOTPResponse> => {
  try {
    const response = await api.post<SendOTPResponse>('/auth/admin/send-otp', { mobile });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Verify OTP and login admin
 */
export const verifyOTP = async (mobile: string, otp: string): Promise<VerifyOTPResponse> => {
  try {
    const response = await api.post<VerifyOTPResponse>('/auth/admin/verify-otp', { mobile, otp });

    if (response.data.success && response.data.data.token) {
      setAuthToken(response.data.data.token, 'admin');
      setUserData(response.data.data.user, 'admin');
    }

    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Register new admin
 */
export const register = async (data: RegisterData): Promise<RegisterResponse> => {
  try {
    const response = await api.post<RegisterResponse>('/auth/admin/register', data);

    if (response.data.success && response.data.data.token) {
      setAuthToken(response.data.data.token, 'admin');
      setUserData(response.data.data.user, 'admin');
    }

    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Logout admin
 */
export const logout = (): void => {
  removeAuthToken('admin');
};

export interface AdminProfileResponse {
  success: boolean;
  message?: string;
  data: {
    _id: string;
    name: string;
    email: string;
    mobile: string;
    profileImage?: string;
    role: string;
  };
}

/**
 * Get admin profile
 */
export const getAdminProfile = async (): Promise<AdminProfileResponse> => {
  try {
    const response = await api.get<AdminProfileResponse>('/auth/admin/profile');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Update admin profile
 */
export const updateAdminProfile = async (data: {
  name?: string;
  mobile?: string;
  profileImage?: string;
  currentPassword?: string;
  newPassword?: string;
}): Promise<AdminProfileResponse> => {
  try {
    const response = await api.put<AdminProfileResponse>('/auth/admin/profile', data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
