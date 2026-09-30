# Clinical Guidance & Treatment Inventory

This inventory catalogs every displayed treatment suggestion, active ingredient, concentration, product reference, and urgency statement present in the Klinik codebase across `backend/utils/recommendations.py` and `frontend/src/components/ResultsDashboard.jsx`.

This document is prepared for **Kavin's clinical review and dermatologist sign-off** prior to commercial deployment.

---

## 1. Summary of Active Ingredients & Specific Medications Mentioned

| Active Ingredient / Drug | Stated Concentration | Severity Tier | Location in Codebase | Regulatory / Clinical Note |
| :--- | :--- | :--- | :--- | :--- |
| **Salicylic Acid** | **2%** | Mild Acne, Moderate Acne | `backend/utils/recommendations.py:23`<br>`frontend/src/components/ResultsDashboard.jsx:18` | Common OTC BHA exfoliant. Requires dermatological confirmation of recommended frequency. |
| **Benzoyl Peroxide** | **2.5%** | Mild Acne, Moderate Acne | `backend/utils/recommendations.py:23,35`<br>`frontend/src/components/ResultsDashboard.jsx:18` | Antibacterial OTC agent. 2.5% is chosen to minimize initial contact irritation. |
| **Adapalene** | **0.1%** | Moderate Acne | `backend/utils/recommendations.py:36,41`<br>`frontend/src/components/ResultsDashboard.jsx:31` | OTC topical retinoid (third-generation). Retinoid dermatitis warning advised. |
| **Niacinamide** | Concentration unspecified | Moderate Acne | `backend/utils/recommendations.py:38,41`<br>`frontend/src/components/ResultsDashboard.jsx:28` | Anti-inflammatory soothing serum. |
| **Topical Retinoids (General)** | "Start with low concentration" | Mild Acne | `backend/utils/recommendations.py:25` | Advises nighttime application. |
| **Isotretinoin ("Accutane")** | Systemic prescription | Very Severe Acne | `backend/utils/recommendations.py:61` | Potent systemic oral retinoid requiring strict medical supervision (e.g. iPLEDGE in US). |
| **Oral Medications / Combination Therapy** | Systemic prescription | Severe Acne | `backend/utils/recommendations.py:51` | General mention for physician discussion (antibiotics, spironolactone, etc.). |
| **Broad-Spectrum Sunscreen** | **SPF 30+** | Clear Skin, Mild, Moderate | `backend/utils/recommendations.py:13,17,41`<br>`frontend/src/components/ResultsDashboard.jsx:10,13` | Photoprotection during routine care. |

---

## 2. Inventory by Severity Class

### Tier 1: Clear Skin
- **Severity Index**: `0`
- **Urgency Level**: `low`
- **Backend Summary**: *"Your skin appears clear with no significant acne detected."*
- **Frontend Fallback Summary**: *"Your skin appears clear with minimal visible blemishes detected."*
- **Actionable Tips**:
  1. Continue your current skincare routine — it's working well.
  2. Use a gentle, pH-balanced cleanser twice daily.
  3. Apply a broad-spectrum SPF 30+ sunscreen every morning.
  4. Stay hydrated and maintain a balanced diet rich in antioxidants.
  5. Avoid touching your face frequently to prevent bacterial transfer.
  6. Keep skin hydrated with a lightweight non-comedogenic moisturizer.
- **Recommended Products**: Gentle foaming cleanser, lightweight moisturizer, SPF 30+ sunscreen.

---

### Tier 2: Mild Acne
- **Severity Index**: `1`
- **Urgency Level**: `low`
- **Backend Summary**: *"Mild acne detected. Minor blemishes that can typically be managed with over-the-counter treatments."*
- **Frontend Fallback Summary**: *"Minor blemishes detected that can typically be managed with consistent over-the-counter skincare routines."*
- **Actionable Tips**:
  1. Use a salicylic acid (2%) or benzoyl peroxide (2.5%) cleanser.
  2. Apply a non-comedogenic moisturizer after cleansing.
  3. Consider using a retinoid product at night (start with low concentration).
  4. Avoid picking or squeezing blemishes to prevent scarring.
  5. Change pillowcases frequently and keep hair away from face.
  6. Avoid harsh scrubbing to prevent irritation and skin barrier damage.
- **Recommended Products**: Salicylic acid cleanser, benzoyl peroxide spot treatment, oil-free moisturizer.

---

### Tier 3: Moderate Acne
- **Severity Index**: `2`
- **Urgency Level**: `medium`
- **Backend Summary**: *"Moderate acne detected. Multiple blemishes present that may benefit from a more targeted treatment approach."*
- **Frontend Fallback Summary**: *"Moderate visible blemishes detected across target areas."*
- **Actionable Tips**:
  1. Use a combination of benzoyl peroxide and salicylic acid products.
  2. Consider adding a topical retinoid (adapalene 0.1%) to your nighttime routine.
  3. Use a gentle, non-foaming cleanser to avoid over-drying the skin.
  4. Apply niacinamide serum to reduce inflammation and redness.
  5. Consult a dermatologist if symptoms persist after 6–8 weeks of treatment.
- **Recommended Products**: Adapalene gel, niacinamide serum, gentle cleanser, oil-free SPF moisturizer.

---

### Tier 4: Severe Acne
- **Severity Index**: `3`
- **Urgency Level**: `high`
- **Backend Summary**: *"Severe acne detected. Significant inflammation present. Professional dermatological consultation is strongly recommended."*
- **Frontend Fallback Summary**: *"Significant visible blemishes detected. Professional dermatological evaluation is strongly advised."*
- **Actionable Tips**:
  1. Schedule an appointment with a board-certified dermatologist.
  2. Avoid harsh scrubs or exfoliants that can worsen inflammation.
  3. Use a very gentle, fragrance-free cleanser.
  4. Apply prescribed topical treatments as directed by your dermatologist.
  5. Consider discussing oral medications or combination therapy with your doctor.
  6. Do not attempt to pop or extract lesions — this can cause permanent scarring.
- **Recommended Products**: Prescription-strength treatments as recommended by your dermatologist; ultra-gentle cleansers.

---

### Tier 5: Very Severe Acne
- **Severity Index**: `4`
- **Urgency Level**: `critical`
- **Backend Summary**: *"Very severe acne detected. Extensive inflammation and potential for scarring. Immediate professional medical attention is recommended."*
- **Frontend Fallback Summary**: *"Extensive visible blemishes detected. Immediate professional medical dermatological evaluation is recommended."*
- **Actionable Tips**:
  1. Seek immediate consultation with a dermatologist or skincare specialist.
  2. Your dermatologist may recommend isotretinoin (Accutane) or other systemic treatments.
  3. Avoid all harsh products — use only ultra-gentle, dermatologist-approved cleansers.
  4. Do not pick, squeeze, or touch affected areas.
  5. Follow your dermatologist's treatment plan strictly for best results.
  6. Consider discussing hormonal evaluation if applicable.
  7. Mental health support is available if acne is affecting your well-being.
- **Recommended Products**: Dermatologist-prescribed systemic and topical treatments only.

---

## 3. Disclaimers Enforced in UI

To prevent medical misrepresentation, the following mandatory disclaimers accompany all guidance:
1. **Header Disclaimer**: Displayed alongside results: *"Klinik provides automated algorithmic observations for educational and routine-tracking purposes. It does not provide medical diagnosis, clinical evaluation, or prescription advice."*
2. **Consultation Notice**: *"Always seek the advice of a qualified dermatologist or other healthcare provider with questions regarding your skin health."*
3. **Data Source Distinction**: `ResultsDashboard.jsx` explicitly distinguishes between scan-derived observations and preset fallback skincare guidance.
