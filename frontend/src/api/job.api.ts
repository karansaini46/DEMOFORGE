import { apiClient } from './client';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

export interface JobVideo {
  id: string;
  title: string;
  url: string;
  storagePath: string;
  publicUrl: string;
  templateId: string;
  durationSec: number;
  fileSizeMb: number;
  createdAt: string;
}

export interface Job {
  id: string;
  userId: string;
  url: string;
  templateId: string;
  status: JobStatus;
  currentStep: string | null;
  stepProgress: number;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  video: JobVideo | null;
}

interface CreateJobResponse {
  jobId: string;
}

interface ListJobsResponse {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
}

export async function createJob(
  url: string,
  templateId: string,
): Promise<CreateJobResponse> {
  const res = await apiClient.post<CreateJobResponse>('/jobs', {
    url,
    templateId,
  });
  return res.data;
}

export async function getJob(id: string): Promise<Job> {
  const res = await apiClient.get<Job>(`/jobs/${id}`);
  return res.data;
}

export async function listJobs(
  page: number,
  limit: number,
): Promise<ListJobsResponse> {
  const res = await apiClient.get<ListJobsResponse>('/jobs', {
    params: { page, limit },
  });
  return res.data;
}

export async function deleteJob(id: string): Promise<void> {
  await apiClient.delete(`/jobs/${id}`);
}
