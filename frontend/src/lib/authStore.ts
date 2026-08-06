import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  authPersistStorage,
  authAPI,
  clearPersistedAuthState,
  persistAuthTokens,
  readPersistedAuthState,
} from './api';
import { User } from '../types/auth';
import { LOGIN_ERROR_MESSAGES, isNetworkError, isRetryableAuthError } from './authMessages';

// NOTE: the original mediaJira app fetched the user's teams (`teamApi`) and
// cleared chat state (`chatStore`) here. Both the `teams` and `chat`
// features are out of scope for this extracted project - see README "Known
// simplifications" - so `userTeams`/`selectedTeamId` are always empty and
// logout no longer touches a chat store.

// Authentication state interface
interface AuthState {
  // User data and authentication state
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  organizationAccessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  initialized: boolean;

  // Team information
  userTeams: number[];
  selectedTeamId: number | null;
  hasHydrated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setRefreshToken: (refreshToken: string | null) => void;
  setOrganizationAccessToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setUserTeams: (teams: number[]) => void;
  setSelectedTeamId: (teamId: number | null) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  
  // Authentication actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; statusCode?: number; errorCode?: string }>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<{ success: boolean; error?: string; retryable?: boolean }>;
  getUserTeams: () => Promise<{ success: boolean; error?: string }>;
  refreshOrganizationAccessToken: () => Promise<{ success: boolean; error?: string }>;
  
  // Initialize auth state on app startup
  initializeAuth: () => Promise<void>;
  
  // Clear all auth data
  clearAuth: () => void;
}

// Create the auth store with persistence
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      refreshToken: null,
      organizationAccessToken: null,
      isAuthenticated: false,
      loading: false,
      initialized: false,
      userTeams: [],
      selectedTeamId: null,
      hasHydrated: false,

      // State setters
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      setRefreshToken: (refreshToken) => set({ refreshToken }),
      setOrganizationAccessToken: (organizationAccessToken) => set({ organizationAccessToken }),
      setLoading: (loading) => set({ loading }),
      setInitialized: (initialized) => set({ initialized }),
      setUserTeams: (userTeams) => set({ userTeams }),
      setSelectedTeamId: (selectedTeamId) => set({ selectedTeamId }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),

      // Login action
      login: async (email: string, password: string) => {
        set({ loading: true });
        try {
          const response = await authAPI.login({ email, password });
          const { token, refresh, user, organization_access_token } = response;

          // Persist auth data immediately so downstream requests include the token
          set({
            user,
            token,
            refreshToken: refresh,
            organizationAccessToken: organization_access_token || null,
            isAuthenticated: true,
          });
          persistAuthTokens({
            token,
            refreshToken: refresh,
            organizationAccessToken: organization_access_token || null,
            user,
          });

          // Teams are not part of this extracted project - see README.
          const userTeams: number[] = [];
          const selectedTeamId: number | null = null;

          set({
            userTeams,
            selectedTeamId,
            loading: false,
          });

          // Refresh user data to get latest avatar and profile info
          try {
            await get().getCurrentUser();
          } catch (error) {
            console.warn('Failed to refresh user data after login:', error);
            // Don't fail login if refresh fails
          }

          return { success: true };
        } catch (error: any) {
          set({ loading: false });

          // Network/connection failure – show network message only
          if (isNetworkError(error)) {
            return {
              success: false,
              error: LOGIN_ERROR_MESSAGES.NETWORK,
              statusCode: undefined,
              errorCode: 'NETWORK_ERROR',
            };
          }

          const statusCode = error?.response?.status;
          const errorData = error?.response?.data;
          const errorCode = errorData?.errorCode;
          const backendMessage = errorData?.error;

          let message: string = LOGIN_ERROR_MESSAGES.GENERIC;

          if (statusCode === 401) {
            message = LOGIN_ERROR_MESSAGES.INVALID_PASSWORD;
          } else if (statusCode === 403) {
            if (errorCode === 'EMAIL_NOT_VERIFIED' || backendMessage?.toLowerCase().includes('not verified')) {
              message = LOGIN_ERROR_MESSAGES.EMAIL_NOT_VERIFIED;
            } else if (errorCode === 'PASSWORD_NOT_SET' || backendMessage?.toLowerCase().includes('password not set')) {
              message = LOGIN_ERROR_MESSAGES.PASSWORD_NOT_SET;
            }
          } else if (statusCode === 400) {
            message = backendMessage || LOGIN_ERROR_MESSAGES.VALIDATION;
          } else if (statusCode === 404) {
            message = LOGIN_ERROR_MESSAGES.EMAIL_NOT_REGISTERED;
          }

          return {
            success: false,
            error: message,
            statusCode,
            errorCode,
          };
        }
      },

      // Logout action
      logout: async () => {
        try {
          // Try to call logout API (optional)
          await authAPI.logout(get().refreshToken);
        } catch (error) {
          // Ignore logout API errors
          console.warn('Logout API call failed:', error);
        }
        
        // Clear all auth data
        get().clearAuth();
      },

      // Get current user from API
      getCurrentUser: async () => {
        try {
          const user = await authAPI.getCurrentUser();
          let persistedToken = get().token;
          let persistedRefreshToken = get().refreshToken;
          let persistedOrganizationToken = get().organizationAccessToken;
          const authData = readPersistedAuthState();
          persistedToken = authData?.state?.token ?? persistedToken;
          persistedRefreshToken = authData?.state?.refreshToken ?? persistedRefreshToken;
          persistedOrganizationToken =
            authData?.state?.organizationAccessToken ?? persistedOrganizationToken;
          set({
            user,
            token: persistedToken,
            refreshToken: persistedRefreshToken,
            organizationAccessToken: persistedOrganizationToken,
            isAuthenticated: true,
          });
          persistAuthTokens({
            token: persistedToken,
            refreshToken: persistedRefreshToken,
            organizationAccessToken: persistedOrganizationToken,
            user,
          });
          return { success: true };
        } catch (error: any) {
          return {
            success: false,
            error: 'Failed to get user info',
            retryable: isRetryableAuthError(error),
          };
        }
      },

      // Teams are not part of this extracted project - see README. Kept as a
      // no-op so callers (e.g. the post-login flows) don't need changes.
      getUserTeams: async () => {
        try {
          return { success: true };
        } catch (error: any) {
          console.error('Failed to fetch user teams:', error);
          return { success: false, error: 'Failed to get user teams' };
        }
      },

      // Refresh organization access token
      refreshOrganizationAccessToken: async () => {
        try {
          const response = await authAPI.refreshOrganizationToken();
          const token = response.organization_access_token || null;
          set({ organizationAccessToken: token });
          persistAuthTokens({ organizationAccessToken: token });
          return { success: true };
        } catch (error: any) {
          const message =
            error?.response?.data?.error ||
            error?.response?.data?.detail ||
            error?.message ||
            'Failed to refresh organization token';
          return { success: false, error: message };
        }
      },

      // Initialize authentication state on app startup
      initializeAuth: async () => {
        let { token, refreshToken, user: persistedUser } = get();
        const persistedAuth = readPersistedAuthState();
        token = token ?? persistedAuth?.state?.token ?? null;
        refreshToken = refreshToken ?? persistedAuth?.state?.refreshToken ?? null;
        persistedUser = persistedUser ?? persistedAuth?.state?.user ?? null;
        const organizationAccessToken =
          get().organizationAccessToken ??
          persistedAuth?.state?.organizationAccessToken ??
          null;
        if (token || refreshToken || organizationAccessToken || persistedUser) {
          set({
            token,
            refreshToken,
            organizationAccessToken,
            user: persistedUser,
            isAuthenticated: Boolean(token && persistedUser),
          });
        }

        if (!token && !refreshToken) {
          set({ initialized: true });
          return;
        }

        set({ loading: true });

        try {
          if (refreshToken) {
            const refreshedToken = await authAPI.refreshToken(refreshToken);
            if (refreshedToken) {
              token = refreshedToken;
              set({
                token: refreshedToken,
                isAuthenticated: Boolean(refreshedToken && (get().user || persistedUser)),
              });
              persistAuthTokens({ token: refreshedToken, refreshToken, user: get().user ?? persistedUser });
            }
          }

          if (!token) {
            return;
          }

          // Validate token by calling /auth/me
          let userResult = await get().getCurrentUser();

          if (!userResult.success && refreshToken && !userResult.retryable) {
            const refreshedToken = await authAPI.refreshToken(refreshToken);
            if (refreshedToken) {
              token = refreshedToken;
              set({ token: refreshedToken });
              persistAuthTokens({ token: refreshedToken, refreshToken, user: get().user ?? persistedUser });
              userResult = await get().getCurrentUser();
            }
          }

          if (!userResult.success) {
            if (userResult.retryable) {
              // Backend unavailable — keep persisted session instead of forcing re-login.
              set({
                isAuthenticated: Boolean(token && (get().user || persistedUser)),
              });
              return;
            }
            get().clearAuth();
            return;
          }

          await get().getUserTeams();
        } catch (error) {
          console.error('Auth initialization failed:', error);
          if (isRetryableAuthError(error)) {
            set({
              isAuthenticated: Boolean(token && (get().user || persistedUser)),
            });
          } else {
            get().clearAuth();
          }
        } finally {
          set({ loading: false, initialized: true });
        }
      },

      // Clear all authentication data
      clearAuth: () => {
        clearPersistedAuthState();

        set({
          user: null,
          token: null,
          refreshToken: null,
          organizationAccessToken: null,
          isAuthenticated: false,
          loading: false,
          userTeams: [],
          selectedTeamId: null
        });
      }
    }),
    {
      name: 'auth-storage', // localStorage key
      storage: createJSONStorage(() => authPersistStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        // Only persist these fields to localStorage
        token: state.token,
        refreshToken: state.refreshToken,
        organizationAccessToken: state.organizationAccessToken,
        user: state.user,
        isAuthenticated: !!state.token && !!state.user,
        userTeams: state.userTeams,
        selectedTeamId: state.selectedTeamId
      })
    }
  )
); 
