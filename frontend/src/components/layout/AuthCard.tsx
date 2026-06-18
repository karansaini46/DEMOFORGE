import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="mb-6 text-center">
          <span className="text-2xl font-extrabold tracking-tight text-gray-900">
            DEMO<span className="text-primary">FORGE</span>
          </span>
        </div>

        <div className="rounded-xl border border-line bg-surface p-8 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>

          <div className="mt-6">{children}</div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">{footer}</div>
      </motion.div>
    </div>
  );
}
