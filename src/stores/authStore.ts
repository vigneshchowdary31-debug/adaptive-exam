import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Student {
  id: string;
  student_id: string;
  name: string;
  attempted: boolean;
}

interface AdminAuth {
  id: string;
  username: string;
}

interface AuthState {
  student: Student | null;
  admin: AdminAuth | null;
  sessionToken: string | null;
  setStudent: (student: Student | null) => void;
  setAdmin: (admin: AdminAuth | null) => void;
  setSessionToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      student: null,
      admin: null,
      sessionToken: null,
      setStudent: (student) => set({ student }),
      setAdmin: (admin) => set({ admin }),
      setSessionToken: (token) => set({ sessionToken: token }),
      logout: () => set({ student: null, admin: null, sessionToken: null }),
    }),
    { name: 'auth-storage' }
  )
);
