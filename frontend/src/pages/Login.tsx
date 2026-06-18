import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { login, toUser } from '../api/auth.api';
import { AuthCard } from '../components/layout/AuthCard';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { getErrorMessage } from '../lib/errors';
import { useAuthStore } from '../store/auth.store';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await login(data);
      setAuth(res.token, toUser(res.user));
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Login failed'));
    }
  };

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back — let's make a demo."
      footer={
        <span>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create one
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          icon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          icon={<Lock className="h-4 w-4" />}
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" fullWidth isLoading={isSubmitting}>
          Sign in
        </Button>
      </form>
    </AuthCard>
  );
}
