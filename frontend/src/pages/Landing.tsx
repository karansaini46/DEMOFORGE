import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '../components/ui/Button';
import { useAuthStore } from '../store/auth.store';

export default function Landing() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-2xl py-16 text-center"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        AI-generated product demos
      </span>
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
        Turn any web app into a polished demo video
      </h1>
      <p className="mt-4 text-lg text-gray-500">
        Paste a URL, pick a style, and DemoForge writes the script, records the
        screen, narrates it, and renders a shareable video.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to={isAuthenticated ? '/generate' : '/register'}>
          <Button>
            {isAuthenticated ? 'Create a demo' : 'Get started'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        {!isAuthenticated && (
          <Link to="/login">
            <Button variant="secondary">Sign in</Button>
          </Link>
        )}
      </div>
    </motion.section>
  );
}
