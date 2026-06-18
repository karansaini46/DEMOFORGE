import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  ClipboardCopy,
  Download,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import ReactPlayer from 'react-player';
import { useNavigate, useParams } from 'react-router-dom';

import { createJob, Job } from '../api/job.api';
import { Button } from '../components/ui/Button';
import { getErrorMessage } from '../lib/errors';
import { usePolling } from '../hooks/usePolling';

const PIPELINE_STEPS = [
  'scraping',
  'scripting',
  'recording',
  'voiceover',
  'rendering',
  'assembling',
  'done',
] as const;

type PipelineStep = (typeof PIPELINE_STEPS)[number];

const STEP_LABELS: Record<PipelineStep, string> = {
  scraping: 'Scraping',
  scripting: 'Scripting',
  recording: 'Recording',
  voiceover: 'Voiceover',
  rendering: 'Rendering',
  assembling: 'Assembling',
  done: 'Done',
};

function getStepIndex(currentStep: string | null): number {
  if (!currentStep) return -1;
  return PIPELINE_STEPS.indexOf(currentStep as PipelineStep);
}

export default function JobStatus() {
  const { id } = useParams<{ id: string }>();
  const { job, isLoading, error } = usePolling(id ?? null);

  if (isLoading && !job) {
    return <LoadingState />;
  }

  if (error && !job) {
    return <FetchErrorState message={error} />;
  }

  if (!job) {
    return <FetchErrorState message="Job not found" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mx-auto max-w-3xl space-y-8"
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Job status</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tracking job{' '}
          <span className="font-mono text-gray-700">
            {job.id.slice(0, 8)}…
          </span>
        </p>
      </div>

      <StepTracker
        currentStep={job.currentStep}
        stepProgress={job.stepProgress}
        status={job.status}
      />

      <MetadataPreview job={job} />

      <AnimatePresence>
        {job.status === 'DONE' && job.video && (
          <VideoResult video={job.video} />
        )}
      </AnimatePresence>

      {job.status === 'FAILED' && (
        <FailedState job={job} />
      )}
    </motion.div>
  );
}

/* ─── Step Tracker ─── */

interface StepTrackerProps {
  currentStep: string | null;
  stepProgress: number;
  status: string;
}

function StepTracker({ currentStep, stepProgress, status }: StepTrackerProps) {
  const activeIndex = getStepIndex(currentStep);

  return (
    <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
      <div className="flex items-center justify-between">
        {PIPELINE_STEPS.map((step, i) => (
          <StepItem
            key={step}
            label={STEP_LABELS[step]}
            index={i}
            activeIndex={activeIndex}
            stepProgress={stepProgress}
            isFailed={status === 'FAILED' && i === activeIndex}
            isLast={i === PIPELINE_STEPS.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

interface StepItemProps {
  label: string;
  index: number;
  activeIndex: number;
  stepProgress: number;
  isFailed: boolean;
  isLast: boolean;
}

function StepItem({
  label,
  index,
  activeIndex,
  stepProgress,
  isFailed,
  isLast,
}: StepItemProps) {
  const isDone = index < activeIndex || (index === activeIndex && activeIndex === PIPELINE_STEPS.length - 1);
  const isActive = index === activeIndex && !isDone;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.2 }}
      className="flex flex-1 flex-col items-center"
    >
      <div className="flex w-full items-center">
        {index > 0 && (
          <div
            className={[
              'h-0.5 flex-1 transition-colors duration-300',
              isDone ? 'bg-emerald-500' : 'bg-gray-200',
            ].join(' ')}
          />
        )}

        <div
          className={[
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300',
            isDone
              ? 'bg-emerald-500 text-white'
              : isActive && isFailed
                ? 'bg-danger text-white'
                : isActive
                  ? 'bg-primary text-white animate-pulse'
                  : 'bg-gray-200 text-gray-500',
          ].join(' ')}
        >
          {isDone ? (
            <Check className="h-4 w-4" />
          ) : isFailed ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            index + 1
          )}
        </div>

        {!isLast && (
          <div
            className={[
              'h-0.5 flex-1 transition-colors duration-300',
              isDone ? 'bg-emerald-500' : 'bg-gray-200',
            ].join(' ')}
          />
        )}
      </div>

      <span
        className={[
          'mt-2 text-center text-xs font-medium',
          isDone
            ? 'text-emerald-600'
            : isActive
              ? isFailed
                ? 'text-danger'
                : 'text-primary'
              : 'text-gray-400',
        ].join(' ')}
      >
        {label}
      </span>

      {isActive && !isFailed && (
        <div className="mt-1 h-1 w-12 overflow-hidden rounded-full bg-gray-200">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${stepProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
    </motion.div>
  );
}

/* ─── Metadata Preview ─── */

interface MetadataPreviewProps {
  job: Job;
}

function MetadataPreview({ job }: MetadataPreviewProps) {
  const metadata = job.metadata as {
    appTitle?: string;
    features?: string[];
    scriptPreview?: string;
  } | null;

  const currentStepIndex = getStepIndex(job.currentStep);
  const scrapingDone = currentStepIndex > 0;

  if (!scrapingDone || !metadata) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden rounded-xl border border-line bg-surface p-6 shadow-sm"
    >
      <h3 className="text-sm font-semibold text-gray-700">Detected metadata</h3>

      {metadata.appTitle && (
        <p className="mt-2 text-lg font-bold text-gray-900">
          {metadata.appTitle}
        </p>
      )}

      {metadata.features && metadata.features.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {metadata.features.map((feat) => (
            <span
              key={feat}
              className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {feat}
            </span>
          ))}
        </div>
      )}

      {metadata.scriptPreview && (
        <div className="mt-4 rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-semibold text-gray-500">Script preview</p>
          <p className="mt-1 text-sm italic text-gray-700">
            "{metadata.scriptPreview}"
          </p>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Video Result ─── */

interface VideoResultProps {
  video: NonNullable<Job['video']>;
}

function VideoResult({ video }: VideoResultProps) {
  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(video.publicUrl);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  }, [video.publicUrl]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-4 rounded-xl border border-line bg-surface p-6 shadow-sm"
    >
      <h3 className="text-sm font-semibold text-gray-700">Your demo video</h3>

      <div className="aspect-video overflow-hidden rounded-lg bg-black">
        <ReactPlayer
          url={video.publicUrl}
          controls
          width="100%"
          height="100%"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
        <span>Duration: {formatDuration(video.durationSec)}</span>
        <span>Size: {video.fileSizeMb.toFixed(1)} MB</span>
        <span>Template: {video.templateId}</span>
      </div>

      <div className="flex gap-3">
        <a
          href={video.publicUrl}
          download
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          <Download className="h-4 w-4" />
          Download
        </a>
        <Button variant="secondary" onClick={handleCopyLink}>
          <ClipboardCopy className="h-4 w-4" />
          Share link
        </Button>
      </div>
    </motion.div>
  );
}

/* ─── Failed State ─── */

interface FailedStateProps {
  job: Job;
}

function FailedState({ job }: FailedStateProps) {
  const navigate = useNavigate();

  const handleRetry = useCallback(async () => {
    try {
      const { jobId } = await createJob(job.url, job.templateId);
      toast.success('Retrying with a new job');
      navigate(`/jobs/${jobId}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to retry'));
    }
  }, [job.url, job.templateId, navigate]);

  return (
    <div className="rounded-xl border border-danger/30 bg-red-50 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-danger" />
        <div>
          <h3 className="text-sm font-semibold text-danger">
            Generation failed
          </h3>
          <p className="mt-1 text-sm text-gray-700">
            {job.errorMessage ?? 'An unexpected error occurred.'}
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={handleRetry}
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Utility States ─── */

function LoadingState() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function FetchErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-danger/30 bg-red-50 p-8 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-danger" />
      <p className="mt-3 text-sm text-gray-700">{message}</p>
    </div>
  );
}

/* ─── Helpers ─── */

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
