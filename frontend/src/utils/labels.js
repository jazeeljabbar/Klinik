export const DISPLAY_LABELS = {
  'Clear Skin': 'No visible breakouts detected',
  'Mild Acne': 'Lower visible breakout level',
  'Moderate Acne': 'Moderate visible breakout level',
  'Severe Acne': 'Higher visible breakout level',
  'Very Severe Acne': 'Very high visible breakout level'
};

export function getDisplayLabel(rawClass) {
  return DISPLAY_LABELS[rawClass] || rawClass || 'Scan completed';
}
