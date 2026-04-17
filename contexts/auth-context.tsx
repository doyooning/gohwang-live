'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  // Session/bootstrap loading only
  isLoading: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const needsSessionCheck =
      pathname === '/login' || pathname.startsWith('/manager');
    if (!needsSessionCheck) {
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession(), 4000, 'getSession');

        const authEmail = session?.user?.email;

        if (!authEmail) {
          setUser(null);
          return;
        }

        const { data: admin, error: adminError } = await withTimeout(
          Promise.resolve(
            supabase
              .from('admins')
              .select('*')
              .eq('email', authEmail)
              .maybeSingle(),
          ),
          10000,
          'admins lookup (session)',
        );

        if (adminError) {
          console.error('Session admin lookup error:', {
            message: adminError.message,
            code: adminError.code,
            details: adminError.details,
            hint: adminError.hint,
          });
        }

        if (admin && admin.is_active) {
          setUser({
            id: admin.id,
            email: admin.email,
            name: admin.email.split('@')[0],
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        return;
      }

      if (!session?.user?.email) return;

      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('email', session.user.email)
        .maybeSingle();

      if (adminError) {
        console.error('Auth state admin lookup error:', {
          message: adminError.message,
          code: adminError.code,
          details: adminError.details,
          hint: adminError.hint,
        });
      }

      if (admin && admin.is_active) {
        setUser({
          id: admin.id,
          email: admin.email,
          name: admin.email.split('@')[0],
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname]);

  const login = useCallback(
    async (email: string, password: string) => {
      const supabase = createClient();

      try {
        const { error: authError } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          15000,
          'signInWithPassword',
        );

        if (authError) {
          console.error('Supabase auth signInWithPassword error:', {
            message: authError.message,
            status: authError.status,
            name: authError.name,
          });
          return {
            success: false,
            error: `로그인 실패: ${authError.message}${authError.status ? ` (status: ${authError.status})` : ''}`,
          };
        }

        const { data: admin, error: adminError } = await withTimeout(
          Promise.resolve(
            supabase.from('admins').select('*').eq('email', email).maybeSingle(),
          ),
          15000,
          'admins lookup (login)',
        );

        if (adminError || !admin || !admin.is_active) {
          if (adminError) {
            console.error('Supabase admins lookup error:', {
              message: adminError.message,
              code: adminError.code,
              details: adminError.details,
              hint: adminError.hint,
            });
          }

          await supabase.auth.signOut();

          if (adminError) {
            return {
              success: false,
              error: `운영자 확인 실패: ${adminError.message}`,
            };
          }
          return {
            success: false,
            error: '운영자 권한이 없거나 비활성화된 계정입니다.',
          };
        }

        setUser({
          id: admin.id,
          email: admin.email,
          name: admin.email.split('@')[0],
        });

        router.push('/manager');
        return { success: true };
      } catch (error) {
        console.error('Login error:', error);
        return {
          success: false,
          error: '로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요.',
        };
      }
    },
    [router],
  );

  const logout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
