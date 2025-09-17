import ModelManager from '@/src/components/ModelManager';

export const metadata = { title: 'Models • Private Transcribe' };

export default function ModelsPage() {
  return (
    <main>
      <h1 className="govuk-heading-l">Models</h1>
      <p className="govuk-body">Pre-download models for offline transcription and summarisation. First load may take a while; assets are cached for future use.</p>
      <ModelManager />
    </main>
  );
}
