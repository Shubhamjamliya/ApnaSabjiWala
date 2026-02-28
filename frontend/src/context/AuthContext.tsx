import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  getAuthToken,
  removeAuthToken,
  setAuthToken,
  getUserData,
  setUserData,
} from "../services/api/config";

interface User {
  id: string;
  userType?: "Admin" | "Seller" | "Customer" | "Delivery";
  [key: string]: any;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize state synchronously from localStorage
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const storedToken = getAuthToken();
    const storedUser = getUserData();
    return !!(storedToken && storedUser);
  });

  const [user, setUser] = useState<User | null>(() => {
    return getUserData();
  });

  const [token, setToken] = useState<string | null>(() => {
    return getAuthToken();
  });

  // Effect to sync state if localStorage changes externally or on mount validation
  useEffect(() => {
    const storedToken = getAuthToken();
    const userData = getUserData();

    if (storedToken && userData) {
      if (!isAuthenticated || token !== storedToken) {
        setToken(storedToken);
        setUser(userData);
        setIsAuthenticated(true);
      }

      // Register FCM token on app load for already authenticated users
      import("../services/pushNotificationService").then(({ registerFCMToken }) => {
        registerFCMToken().catch(error => {
          console.error("Failed to register FCM token on mount:", error);
        });
      });
    } else if (isAuthenticated) {
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  const login = (newToken: string, userData: User) => {
    const role = userData.userType?.toLowerCase() || "customer";
    setToken(newToken);
    setUser(userData);
    setIsAuthenticated(true);
    setAuthToken(newToken, role);
    setUserData(userData, role);

    // Register FCM token for push notifications after successful login
    import("../services/pushNotificationService").then(({ registerFCMToken }) => {
      registerFCMToken(true)
        .then(() => {
          // Send test notification after successful token registration
          const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

          fetch(`${apiUrl}/fcm-tokens/test`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'Content-Type': 'application/json'
            }
          })
            .then(response => response.json())
            .then(data => {
              console.log('✅ Test notification sent:', data);
              if (data.success) {
                console.log(`📬 Notification sent to ${data.details?.totalTokens} device(s)`);
              }
            })
            .catch(error => {
              console.error('❌ Failed to send test notification:', error);
            });
        })
        .catch((error) => {
          console.error("Failed to register FCM token:", error);
        });
    });
  };

  const logout = () => {
    const role = user?.userType?.toLowerCase() || "customer";
    const currentToken = token; // Capture token before clearing

    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    removeAuthToken(role);

    // Remove FCM token on logout
    if (currentToken) {
      import("../services/pushNotificationService").then(({ removeFCMToken }) => {
        removeFCMToken(currentToken).catch((error) => {
          console.error("Failed to remove FCM token:", error);
        });
      });
    }
  };

  const updateUser = (userData: User) => {
    const role = userData.userType?.toLowerCase() || "customer";
    setUser(userData);
    setUserData(userData, role);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        token,
        login,
        logout,
        updateUser,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
