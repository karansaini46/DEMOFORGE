import { motion } from 'framer-motion';
import { Check, Globe, Sparkles } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import { createJob } from '../api/job.api';
import { Button } from '../components/ui/Button';
import { getErrorMessage } from '../lib/errors';

interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  colors: string[];
}

const TEMPLATES: TemplateConfig[] = [
  {
    id: 'explainer-reel',
    name: 'Explainer Reel',
    description: 'Vertical 9:16 reel — your app inside an animated glass card',
    colors: ['#5b78ff', '#aebcff', '#dbe3ff', '#f5f7ff'],
  },
];

const URL_PATTERN = /^https?:\/\/.+\..+/;

function validateUrl(value: string): 'valid' | 'invalid' | 'empty' {
  if (!value.trim()) return 'empty';
  return URL_PATTERN.test(value.trim()) ? 'valid' : 'invalid';
}

export default function Generate() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(
    TEMPLATES[0].id,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const urlStatus = useMemo(() => validateUrl(url), [url]);
  const canSubmit = urlStatus === 'valid' && selectedTemplate !== null;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !selectedTemplate) return;

    setIsSubmitting(true);
    try {
      const { jobId } = await createJob(url.trim(), selectedTemplate);
      toast.success('Demo generation started!');
      navigate(`/jobs/${jobId}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create job'));
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, selectedTemplate, url, navigate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mx-auto max-w-3xl space-y-10"
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create a demo</h1>
        <p className="mt-1 text-sm text-gray-500">
          Paste your web app URL, choose a style, and we'll do the rest.
        </p>
      </div>

      <UrlInput url={url} status={urlStatus} onChange={setUrl} />

      <TemplatePicker
        templates={TEMPLATES}
        selected={selectedTemplate}
        onSelect={setSelectedTemplate}
      />

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          isLoading={isSubmitting}
          className="px-8"
        >
          {isSubmitting ? 'Starting…' : 'Generate Demo'}
          {!isSubmitting && <Sparkles className="h-4 w-4" />}
        </Button>
      </div>
    </motion.div>
  );
}

/* ─── URL Input Section ─── */

interface UrlInputProps {
  url: string;
  status: 'valid' | 'invalid' | 'empty';
  onChange: (value: string) => void;
}

function UrlInput({ url, status, onChange }: UrlInputProps) {
  return (
    <section className="space-y-2">
      <label
        htmlFor="url-input"
        className="block text-sm font-semibold text-gray-700"
      >
        Web app URL
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
          <Globe className="h-5 w-5" />
        </span>
        <input
          id="url-input"
          type="url"
          value={url}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://your-app.com"
          className={[
            'w-full rounded-xl border bg-surface py-4 pl-12 pr-12 text-base text-gray-900',
            'placeholder:text-gray-400 transition-all',
            'focus:outline-none focus:ring-2 focus:ring-primary/40',
            status === 'invalid' ? 'border-danger' : 'border-line',
          ].join(' ')}
        />
        {status === 'valid' && (
          <span className="absolute inset-y-0 right-0 flex items-center pr-4">
            <Check className="h-5 w-5 text-emerald-500" />
          </span>
        )}
      </div>
      {status === 'invalid' && (
        <p className="text-xs text-danger">
          Enter a valid URL starting with http:// or https://
        </p>
      )}
    </section>
  );
}

/* ─── Template Picker Section ─── */

interface TemplatePickerProps {
  templates: TemplateConfig[];
  selected: string | null;
  onSelect: (id: string) => void;
}

function TemplatePicker({ templates, selected, onSelect }: TemplatePickerProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">Video style</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {templates.map((tpl) => (
          <TemplateCard
            key={tpl.id}
            template={tpl}
            isSelected={selected === tpl.id}
            onSelect={() => onSelect(tpl.id)}
          />
        ))}
      </div>
    </section>
  );
}

interface TemplateCardProps {
  template: TemplateConfig;
  isSelected: boolean;
  onSelect: () => void;
}

function TemplateCard({ template, isSelected, onSelect }: TemplateCardProps) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={onSelect}
      className={[
        'relative overflow-hidden rounded-xl border-2 bg-surface text-left shadow-sm transition-colors',
        isSelected
          ? 'border-primary ring-2 ring-primary/30'
          : 'border-line hover:border-gray-300',
      ].join(' ')}
    >
      {isSelected && (
        <span className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
          <Check className="h-3.5 w-3.5" />
        </span>
      )}

      <div className="mx-auto aspect-[9/16] w-2/3 overflow-hidden rounded-lg border border-gray-200 bg-gradient-to-b from-[#eef2ff] to-[#f7f8ff]">
        <div className="flex h-full flex-col items-center justify-center gap-2 p-3">
          <div className="aspect-video w-full rounded-md bg-gradient-to-br from-[#e8edff] via-white to-[#dfe7ff] shadow-sm ring-1 ring-[#aebcff]/50" />
          <div className="text-center text-[10px] font-semibold leading-tight text-[#5b78ff]">
            POV: your explainer reel
          </div>
        </div>
      </div>

      <div className="p-3">
        <h3 className="text-sm font-semibold text-gray-900">{template.name}</h3>
        <p className="mt-0.5 text-xs text-gray-500">{template.description}</p>
        <div className="mt-2 flex gap-1.5">
          {template.colors.map((color) => (
            <span
              key={color}
              className="h-3.5 w-3.5 rounded-full border border-gray-200"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </motion.button>
  );
}
