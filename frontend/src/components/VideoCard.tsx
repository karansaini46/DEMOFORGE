import { motion } from 'framer-motion';
import { Clock, ExternalLink, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Job, JobStatus } from '../api/job.api';

interface VideoCardProps {
  job: Job;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

const STATUS_STYLES: Record<JobStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-gray-100 text-gray-600' },
  PROCESSING: { label: 'Processing', className: 'bg-amber-50 text-amber-700' },
  DONE: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700' },
  FAILED: { label: 'Failed', className: 'bg-red-50 text-red-600' },
};

const TEMPLATE_LABELS: Record<string, string> = {
  'modern-saas': 'Modern SaaS',
  'dark-dev': 'Dark Dev',
  'bold-startup': 'Bold Startup',
};

const TRUNCATE_LENGTH = 40;

function truncateUrl(url: string): string {
  const clean = url.replace(/^https?:\/\//, '');
  if (clean.length <= TRUNCATE_LENGTH) return clean;
  return clean.slice(0, TRUNCATE_LENGTH) + '…';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function VideoCard({ job, onDelete, isDeleting }: VideoCardProps) {
  const navigate = useNavigate();
  const status = STATUS_STYLES[job.status];
  const templateLabel = TEMPLATE_LABELS[job.templateId] ?? job.templateId;

  const handleCardClick = () => {
    navigate(`/jobs/${job.id}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      'Delete this job? This action cannot be undone.',
    );
    if (confirmed) {
      onDelete(job.id);
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={handleCardClick}
      className="group cursor-pointer rounded-xl border border-line bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
            <span className="truncate text-sm font-medium text-gray-900">
              {truncateUrl(job.url)}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {templateLabel}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.className}`}
            >
              {status.label}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
            {job.video && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(job.video.durationSec)}
              </span>
            )}
            <span>{formatDate(job.createdAt)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="ml-2 rounded-lg p-1.5 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-danger group-hover:opacity-100 disabled:opacity-50"
          aria-label="Delete job"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
