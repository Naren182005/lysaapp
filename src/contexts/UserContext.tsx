import React, { createContext, useContext, useState, useEffect } from 'react';

// Define user types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'teacher' | 'student' | 'admin';
  picture?: string; // Profile picture URL (for Google login)
  authProvider?: 'email' | 'google'; // Authentication provider
}

// Define evaluation history item
export interface EvaluationHistoryItem {
  id: string;
  date: string;
  studentName: string;
  questionText: string;
  marksAwarded: number;
  totalMarks: number;
  imageUrl: string;
}

// Define Google user info
export interface GoogleUserInfo {
  email: string;
  name: string;
  picture?: string;
  sub: string; // Google's user ID
}

// Define context type
interface UserContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: (googleUserInfo: GoogleUserInfo) => Promise<boolean>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  evaluationHistory: EvaluationHistoryItem[];
  addEvaluation: (evaluation: Omit<EvaluationHistoryItem, 'id' | 'date'>) => void;
  clearEvaluationHistory: () => void;
}

// Create context with default values
const UserContext = createContext<UserContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => false,
  loginWithGoogle: async () => false,
  logout: () => {},
  register: async () => false,
  evaluationHistory: [],
  addEvaluation: () => {},
  clearEvaluationHistory: () => {},
});

// Custom hook to use the user context
export const useUser = () => useContext(UserContext);

// Mock user data for demo purposes
const MOCK_USERS = [
  {
    id: '1',
    name: 'Teacher Demo',
    email: 'teacher@example.com',
    password: 'password123',
    role: 'teacher' as const,
  },
  {
    id: '2',
    name: 'Student Demo',
    email: 'student@example.com',
    password: 'password123',
    role: 'student' as const,
  },
];

// Provider component
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [evaluationHistory, setEvaluationHistory] = useState<EvaluationHistoryItem[]>([]);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // In a real app, this would verify the session with a backend
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));

          // Load evaluation history
          const storedHistory = localStorage.getItem('evaluationHistory');
          if (storedHistory) {
            setEvaluationHistory(JSON.parse(storedHistory));
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Save evaluation history to localStorage whenever it changes
  useEffect(() => {
    if (evaluationHistory.length > 0) {
      try {
        // Limit the history to the most recent 20 items to prevent quota issues
        const limitedHistory = evaluationHistory.slice(0, 20);
        localStorage.setItem('evaluationHistory', JSON.stringify(limitedHistory));
      } catch (error) {
        console.error('Error saving evaluation history:', error);
        // If we hit quota issues, clear the history and try again with just the most recent item
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          localStorage.removeItem('evaluationHistory');
          if (evaluationHistory.length > 0) {
            try {
              localStorage.setItem('evaluationHistory', JSON.stringify([evaluationHistory[0]]));
            } catch (innerError) {
              console.error('Failed to save even after clearing:', innerError);
            }
          }
        }
      }
    }
  }, [evaluationHistory]);

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      // In a real app, this would make an API call to verify credentials
      const foundUser = MOCK_USERS.find(
        (u) => u.email === email && u.password === password
      );

      if (foundUser) {
        const { password, ...userWithoutPassword } = foundUser;
        setUser(userWithoutPassword);
        localStorage.setItem('user', JSON.stringify(userWithoutPassword));

        // Load evaluation history
        const storedHistory = localStorage.getItem('evaluationHistory');
        if (storedHistory) {
          setEvaluationHistory(JSON.parse(storedHistory));
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // Register function
  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      // In a real app, this would make an API call to create a new user
      // Check if email already exists
      if (MOCK_USERS.some((u) => u.email === email)) {
        return false;
      }

      // Create new user
      const newUser = {
        id: Math.random().toString(36).substring(2, 9),
        name,
        email,
        role: 'teacher' as const,
      };

      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));

      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Login with Google
  const loginWithGoogle = async (googleUserInfo: GoogleUserInfo): Promise<boolean> => {
    setIsLoading(true);

    try {
      // Create a new user from Google info
      const newUser: User = {
        id: googleUserInfo.sub, // Use Google's user ID
        name: googleUserInfo.name,
        email: googleUserInfo.email,
        role: 'teacher', // Default role
        picture: googleUserInfo.picture,
        authProvider: 'google',
      };

      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));

      // Load evaluation history
      const storedHistory = localStorage.getItem('evaluationHistory');
      if (storedHistory) {
        setEvaluationHistory(JSON.parse(storedHistory));
      }

      return true;
    } catch (error) {
      console.error('Google login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Add evaluation to history
  const addEvaluation = (evaluation: Omit<EvaluationHistoryItem, 'id' | 'date'>) => {
    const newEvaluation: EvaluationHistoryItem = {
      ...evaluation,
      id: Math.random().toString(36).substring(2, 9),
      date: new Date().toISOString(),
    };

    // Limit history to 20 items to prevent localStorage quota issues
    setEvaluationHistory((prev) => {
      const newHistory = [newEvaluation, ...prev];
      return newHistory.slice(0, 20);
    });
  };

  // Clear evaluation history
  const clearEvaluationHistory = () => {
    setEvaluationHistory([]);
    localStorage.removeItem('evaluationHistory');
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    loginWithGoogle,
    logout,
    register,
    evaluationHistory,
    addEvaluation,
    clearEvaluationHistory,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
