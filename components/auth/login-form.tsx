'use client';

import { useState, type FormEvent } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/auth-context';

export function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailError(null);

    if (!email) {
      setEmailError('이메일을 입력해주세요.');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    if (!password) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await Promise.race([
        login(email, password),
        new Promise<{ success: boolean; error?: string }>((resolve) =>
          setTimeout(
            () =>
              resolve({
                success: false,
                error:
                  '로그인 요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
              }),
            20000,
          ),
        ),
      ]);

      if (!result.success && result.error) {
        setError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <FieldGroup>
        <Field data-invalid={!!emailError}>
          <FieldLabel htmlFor="email">이메일</FieldLabel>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(null);
              }}
              className="pl-10"
              aria-invalid={!!emailError}
              disabled={isSubmitting}
            />
          </div>
          {emailError && <FieldError>{emailError}</FieldError>}
        </Field>

        <Field data-invalid={!!error && !emailError}>
          <FieldLabel htmlFor="password">비밀번호</FieldLabel>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="비밀번호 입력"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              className="pl-10 pr-10"
              aria-invalid={!!error && !emailError}
              disabled={isSubmitting}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {error && !emailError && <FieldError>{error}</FieldError>}
        </Field>

        <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2" />
              로그인 중...
            </>
          ) : (
            '로그인'
          )}
        </Button>
      </FieldGroup>
    </form>
  );
}
