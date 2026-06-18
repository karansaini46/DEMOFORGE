import { AxiosError } from 'axios';

/** Extract a human-readable message from an API error (backend uses `{ error }`). */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
    if (err.message) return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
