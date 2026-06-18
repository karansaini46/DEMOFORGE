import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Mail, User as UserIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { register as registerApi, toUser } from '../api/auth.api';
import { AuthCard } from '../components/layout/AuthCard';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { getErrorMessage } from '../lib/errors';
import { getPasswordStrength, StrengthLevel } from '../lib/password';
import { useAuthStore } from '../store/auth.store';

// Mirrors the backend registration rules.
const registerSchema = z.object({
  name: z.string().max(50, 'Name must be at most 50 characters').optional(),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Add at least one uppercase letter')
    .regex(/[0-9]/, 'Add at least one number'),
});

type RegisterForm = z.infer<typeof registerSchema>;

const STRENGTH_STYLES: Record<StrengthLevel, { bar: string; text: string }> = {
  weak: { bar: 'bg-danger', text: 'text-danger' },
  medium: { bar: 'bg-amber-500', text: 'text-amber-600' },
  strong: { bar: 'bg-accent', text: 'text-accent' },
};

export default function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const password = watch('password') ?? '';
  const strength = getPasswordStrength(password);
  const strengthStyle = STRENGTH_STYLES[strength.level];

  const onSubmit = async (data: RegisterForm) => {
    try {
      const res = await registerApi({
        email: data.email,
        password: data.password,
        name: data.name || undefined,
      });
      setAuth(res.token, toUser(res.user));
      toast.success('Account created!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Registration failed'));
    }
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start turning web apps into demo videos."
      footer={
        <span>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <TextField
          label="Name"
          type="text"
          autoComplete="name"
          placeholder="Ada Lovelace"
          icon={<UserIcon className="h-4 w-4" />}
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          icon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email')}
        />
        <div>
          <TextField
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            icon={<Lock className="h-4 w-4" />}
            error={errors.password?.message}
            {...register('password')}
          />
          {password && (
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                <div
                  className={`h-full rounded-full transition-all ${strengthStyle.bar}`}
                  style={{ width: `${(strength.score / 4) * 100}%` }}
                />
              </div>
              <p className={`mt-1 text-xs font-medium ${strengthStyle.text}`}>
                {strength.label} password
              </p>
            </div>
          )}
        </div>
        <Button type="submit" fullWidth isLoading={isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
