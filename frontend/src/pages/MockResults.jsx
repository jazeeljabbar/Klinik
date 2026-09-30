import React from 'react';
import ResultsDashboard from '../components/ResultsDashboard';
import HistorySection from '../components/HistorySection';

export default function MockResults() {
  const isFallback = typeof window !== 'undefined' && window.location.search.includes('fallback=true');
  const dummyResults = {
    image_url: 'https://via.placeholder.com/150',
    predicted_class: 'Mild Acne',
    confidence: 95,
    severity_index: 1,
    recommendation: isFallback ? null : { summary: 'Maintain a gentle cleansing routine. Your skin is showing mild signs that can be managed with consistent care.' }
  };

  return (
    <div style={{ paddingTop: '92px' }}>
      <ResultsDashboard results={dummyResults} />
      <HistorySection refreshTrigger={0} />
    </div>
  );
}
