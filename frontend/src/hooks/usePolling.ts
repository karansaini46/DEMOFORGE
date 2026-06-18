import { useCallback, useEffect, useRef, useState } from 'react';

import { getJob, Job } from '../api/job.api';
import { getErrorMessage } from '../lib/errors';

const DEFAULT_INTERVAL_MS = 3000;
const TERMINAL_STATUSES = new Set(['DONE', 'FAILED']);

interface UsePollingResult {
  job: Job | null;
  isLoading: boolean;
  error: string | null;
}

export function usePolling(
  jobId: string | null,
  intervalMs = DEFAULT_INTERVAL_MS,
): UsePollingResult {
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fetchJob = useCallback(async () => {
    if (!jobId) return;

    try {
      const data = await getJob(jobId);
      setJob(data);
      setError(null);

      if (TERMINAL_STATUSES.has(data.status)) {
        clearTimer();
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch job status'));
    } finally {
      setIsLoading(false);
    }
  }, [jobId, clearTimer]);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    void fetchJob();

    intervalRef.current = setInterval(() => {
      void fetchJob();
    }, intervalMs);

    return clearTimer;
  }, [jobId, intervalMs, fetchJob, clearTimer]);

  return { job, isLoading, error };
}
