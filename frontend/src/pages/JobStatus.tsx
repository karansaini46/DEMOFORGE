import { useParams } from 'react-router-dom';

export default function JobStatus() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900">Job status</h1>
      <p className="mt-1 text-sm text-gray-500">
        Tracking job <span className="font-mono text-gray-700">{id}</span>
      </p>
      <div className="mt-6 rounded-xl border border-line bg-surface p-8 shadow-sm">
        <p className="text-sm text-gray-500">
          Live progress for this job will appear here.
        </p>
      </div>
    </div>
  );
}
