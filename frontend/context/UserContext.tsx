import React from 'react';
import { UserRole } from '../types';

interface UserContextState {
  userId: string | null;
  role: UserRole | null;
  email: string | null;
  name: string | null;
  imageUrl: string | null;
  isAuthenticated: boolean;
  hasResolvedSession: boolean;
  canViewEvents?: boolean;
  canEditEvents?: boolean;
  canManualCheckIn?: boolean;
  canReceiveNotifications?: boolean;
  isOnboarded?: boolean;
}

interface UserContextValue extends UserContextState {
  setUser: (payload: { userId: string; role: UserRole; email: string; name?: string | null; imageUrl?: string | null; canViewEvents?: boolean; canEditEvents?: boolean; canManualCheckIn?: boolean; canReceiveNotifications?: boolean; isOnboarded?: boolean }) => void;
  clearUser: () => void;
  authModal: { isOpen: boolean; view: 'login' | 'signup' | 'forgot-password' };
  openAuthModal: (view?: 'login' | 'signup' | 'forgot-password') => void;
  closeAuthModal: () => void;
}

const UserContext = React.createContext<UserContextValue | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = React.useState<UserContextState>({
    userId: null,
    role: null,
    email: null,
    name: null,
    imageUrl: null,
    isAuthenticated: false,
    hasResolvedSession: false,
    canViewEvents: undefined,
    canEditEvents: undefined,
    canManualCheckIn: undefined,
    canReceiveNotifications: undefined,
    isOnboarded: undefined,
  });

  const setUser = React.useCallback((payload: { userId: string; role: UserRole; email: string; name?: string | null; imageUrl?: string | null; canViewEvents?: boolean; canEditEvents?: boolean; canManualCheckIn?: boolean; canReceiveNotifications?: boolean; isOnboarded?: boolean }) => {
    setState((prev) => {
      const next: UserContextState = {
        userId: payload.userId,
        role: payload.role,
        email: payload.email,
        name: payload.name !== undefined ? payload.name : prev.name,
        imageUrl: payload.imageUrl !== undefined ? payload.imageUrl : prev.imageUrl,
        isAuthenticated: true,
        hasResolvedSession: true,
        canViewEvents: payload.canViewEvents !== undefined ? payload.canViewEvents : prev.canViewEvents,
        canEditEvents: payload.canEditEvents !== undefined ? payload.canEditEvents : prev.canEditEvents,
        canManualCheckIn: payload.canManualCheckIn !== undefined ? payload.canManualCheckIn : prev.canManualCheckIn,
        canReceiveNotifications: payload.canReceiveNotifications !== undefined ? payload.canReceiveNotifications : prev.canReceiveNotifications,
        isOnboarded: payload.isOnboarded !== undefined ? payload.isOnboarded : prev.isOnboarded,
      };

      if (
        prev.userId === next.userId &&
        prev.role === next.role &&
        prev.email === next.email &&
        prev.name === next.name &&
        prev.imageUrl === next.imageUrl &&
        prev.isOnboarded === next.isOnboarded &&
        prev.isAuthenticated === next.isAuthenticated &&
        prev.hasResolvedSession === next.hasResolvedSession &&
        prev.canViewEvents === next.canViewEvents &&
        prev.canEditEvents === next.canEditEvents &&
        prev.canManualCheckIn === next.canManualCheckIn &&
        prev.canReceiveNotifications === next.canReceiveNotifications
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const clearUser = React.useCallback(() => {
    setState((prev) => {
      if (!prev.isAuthenticated && !prev.role && !prev.email && !prev.name && !prev.imageUrl && !prev.userId && prev.hasResolvedSession) return prev;
      return {
        userId: null,
        role: null,
        email: null,
        name: null,
        imageUrl: null,
        isAuthenticated: false,
        hasResolvedSession: true,
        canViewEvents: undefined,
        canEditEvents: undefined,
        canManualCheckIn: undefined,
        canReceiveNotifications: undefined,
        isOnboarded: undefined
      };
    });
  }, []);

  const [authModal, setAuthModal] = React.useState<{ isOpen: boolean; view: 'login' | 'signup' | 'forgot-password' }>({
    isOpen: false,
    view: 'login'
  });

  const openAuthModal = React.useCallback((view: 'login' | 'signup' | 'forgot-password' = 'login') => {
    setAuthModal({ isOpen: true, view });
  }, []);

  const closeAuthModal = React.useCallback(() => {
    setAuthModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const value = React.useMemo(() => ({ 
    ...state, 
    setUser, 
    clearUser,
    authModal,
    openAuthModal,
    closeAuthModal
  }), [state, setUser, clearUser, authModal, openAuthModal, closeAuthModal]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = React.useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
};
