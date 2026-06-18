import { motion } from 'framer-motion';
import { Loader2, Plus, Video } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

import { deleteJob, Job, listJobs } from '../api/job.api';
import { VideoCard } from '../components/VideoCard';
import { Button } from '../components/ui/Button';
import { getErrorMessage } from '../lib/errors';
import { useAuthStore } from '../store/auth.store';

const FREE_MONTHLY_LIMIT = 3;
const RECENT_JOBS_LIMIT = 3;

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const { jobs: data } = await listJobs(1, RECENT_JOBS_LIMIT);
      setJobs(data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load jobs'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchJobs();
    void refreshUser();
  }, [fetchJobs, refreshUser]);

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await deleteJob(id);
        toast.success('Job deleted');
        await fetchJobs();
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to delete job'));
      } finally {
        setDeletingId(null);
      }
    },
    [fetchJobs],
  );

  if (!user) return null;

  const isFree = user.plan === 'FREE';
  const usagePercent = isFree
    ? Math.min((user.monthlyUsage / FREE_MONTHLY_LIMIT) * 100, 100)
    : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-8"
    >
      <WelcomeHeader name={user.name} />

      <UsageCard
        monthlyUsage={user.monthlyUsage}
        plan={user.plan}
        usagePercent={usagePercent}
        isFree={isFree}
      />

      <RecentJobs
        jobs={jobs}
        isLoading={isLoading}
        deletingId={deletingId}
        onDelete={handleDelete}
      />
    </motion.div>
  );
}

/* ─── Welcome Header ─── */

function WelcomeHeader({ name }: { name: string | null }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{name ? `, ${name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Your generated demos appear here.
        </p>
      </div>
      <Link to="/generate">
        <Button>
          <Plus className="h-4 w-4" />
          Generate New Demo
        </Button>
      </Link>
    </div>
  );
}

/* ─── Usage Card ─── */

interface UsageCardProps {
  monthlyUsage: number;
  plan: 'FREE' | 'PRO';
  usagePercent: number;
  isFree: boolean;
}

function UsageCard({ monthlyUsage, plan, usagePercent, isFree }: UsageCardProps) {
  return (
    <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Video className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Monthly usage</p>
            <p className="text-xs text-gray-500">
              {isFree
                ? `${monthlyUsage} / ${FREE_MONTHLY_LIMIT} videos used`
                : 'Unlimited videos'}
            </p>
          </div>
        </div>
        <span
          className={[
            'rounded-full px-2.5 py-0.5 text-xs font-semibold',
            plan === 'PRO'
              ? 'bg-primary/10 text-primary'
              : 'bg-gray-100 text-gray-600',
          ].join(' ')}
        >
          {plan}
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${usagePercent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

/* ─── Recent Jobs ─── */

interface RecentJobsProps {
  jobs: Job[];
  isLoading: boolean;
  deletingId: string | null;
  onDelete: (id: string) => void;
}

function RecentJobs({ jobs, isLoading, deletingId, onDelete }: RecentJobsProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Recent demos</h2>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && jobs.length === 0 && (
        <div className="rounded-xl border border-dashed border-line bg-surface p-12 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            No demos yet — create your first one to get started.
          </p>
        </div>
      )}

      {!isLoading && jobs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <VideoCard
              key={job.id}
              job={job}
              onDelete={onDelete}
              isDeleting={deletingId === job.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}
