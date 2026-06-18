import { z } from 'zod';

export const TEMPLATE_IDS = ['modern-saas', 'dark-dev', 'bold-startup'] as const;

/**
 * Payload for creating a generation job. String sanitization (trim + HTML
 * stripping) runs in the validate middleware before these rules apply.
 * Full SSRF validation of the URL happens in the controller via validateUrl.
 */
export const createJobSchema = z.object({
  url: z
    .string()
    .min(1, 'URL is required')
    .max(2048, 'URL must be at most 2048 characters'),
  templateId: z.enum(TEMPLATE_IDS, {
    errorMap: () => ({ message: 'Invalid templateId' }),
  }),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
