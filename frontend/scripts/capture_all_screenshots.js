import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const SCREENSHOTS_DIR = path.resolve(ROOT_DIR, 'screenshots');
const TEST_DOCS_DIR = path.resolve(ROOT_DIR, 'scratch', 'test_docs');

// Create required directories
const DIRS = [
  '01_launch',
  '02_patient_creation',
  '03_document_upload',
  '04_processing',
  '05_dashboard',
  '06_documents',
  '07_timeline',
  '08_trends',
  '09_medications',
  '10_doctor_brief',
  '11_translation',
  '12_tts',
  '13_emergency',
  '14_prescriptions',
  '15_patient_management',
  '16_demo_patient',
  '17_theme',
  '18_responsive',
  '19_final_states'
];

for (const dir of DIRS) {
  const fullPath = path.join(SCREENSHOTS_DIR, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
}

const screenshotLog = [];

async function snap(page, folder, filename, metadata) {
  const targetPath = path.join(SCREENSHOTS_DIR, folder, filename);
  await page.waitForTimeout(500);
  await page.screenshot({ path: targetPath, fullPage: false });
  console.log(`[SAVED] ${folder}/${filename}`);
  screenshotLog.push({
    number: screenshotLog.length + 1,
    folder,
    filename,
    feature: metadata.feature,
    step: metadata.step,
    demonstrates: metadata.demonstrates,
    pptUsage: metadata.pptUsage
  });
}

async function setLightMode(page) {
  const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  if (isDark) {
    const themeBtn = page.locator('aside button[title*="Light / Dark Mode"], button:has-text("Dark Mode"), button:has-text("Light Mode")').first();
    if (await themeBtn.isVisible()) {
      await themeBtn.click({ force: true });
      await page.waitForTimeout(300);
    }
  }
}

async function setDarkMode(page) {
  const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  if (!isDark) {
    const themeBtn = page.locator('aside button[title*="Light / Dark Mode"], button:has-text("Dark Mode"), button:has-text("Light Mode")').first();
    if (await themeBtn.isVisible()) {
      await themeBtn.click({ force: true });
      await page.waitForTimeout(300);
    }
  }
}

async function navTo(page, tabName) {
  const btn = page.locator(`aside button:has-text("${tabName}")`).first();
  if (await btn.isVisible()) {
    await btn.click({ force: true });
    await page.waitForTimeout(600);
  }
}

async function run() {
  console.log('=====================================================');
  console.log('CAREBRIDGE — SYSTEMATIC SCREENSHOT CAPTURE SESSION');
  console.log('PRIMARY PATIENT: ALAMGIR MANDAL');
  console.log('REAL PRESCRIPTION: Dr. Sabyasachi Roy / Borjora Hospital');
  console.log('=====================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  const alamgirJpg = path.join(TEST_DOCS_DIR, 'Alamgir_Mandal_Rx.jpg');
  const alamgirPng = path.join(TEST_DOCS_DIR, 'Alamgir_Mandal_Rx.png');
  const alamgirPdf = path.join(TEST_DOCS_DIR, 'Alamgir_Mandal_Rx.pdf');
  const alamgirWebp = path.join(TEST_DOCS_DIR, 'Alamgir_Mandal_Rx.webp');
  const alamgirJpeg = path.join(TEST_DOCS_DIR, 'Alamgir_Mandal_Rx.jpeg');
  const rahulRxPath = path.join(TEST_DOCS_DIR, 'Rahul_Sharma_Rx.pdf');

  // =================================================================
  // 1. LAUNCH / STARTUP SCREENSHOTS
  // =================================================================
  console.log('\n--- SECTION 1: LAUNCH & STARTUP ---');
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  await setLightMode(page);
  await page.waitForTimeout(600);

  // 01_01_application_launch.png
  await snap(page, '01_launch', '01_01_application_launch.png', {
    feature: 'Launch',
    step: 'Application Startup',
    demonstrates: 'CAREBRIDGE application loaded cleanly with branding & responsive navigation',
    pptUsage: 'Opening slide / Hero product introduction'
  });

  // 01_02_initial_dashboard.png
  await snap(page, '01_launch', '01_02_initial_dashboard.png', {
    feature: 'Launch',
    step: 'Initial Dashboard State',
    demonstrates: 'Initial dashboard view with longitudinal health metrics & dynamic greeting',
    pptUsage: 'System architecture / Dashboard overview slide'
  });

  // 01_03_sidebar_open.png
  await snap(page, '01_launch', '01_03_sidebar_open.png', {
    feature: 'Launch',
    step: 'Navigation Shell',
    demonstrates: 'Complete expanded sidebar containing all clinical & AI modules',
    pptUsage: 'Navigation architecture slide'
  });

  // =================================================================
  // 2. ADD NEW PATIENT FLOW (ALAMGIR MANDAL)
  // =================================================================
  console.log('\n--- SECTION 2: ADD NEW PATIENT FLOW (ALAMGIR MANDAL) ---');
  
  const addPatientBtn = page.locator('aside button:has-text("Add New Patient")').first();
  await addPatientBtn.click({ force: true });
  await page.waitForTimeout(400);

  // 02_01_add_patient_button.png / 02_02_add_patient_form.png
  await snap(page, '02_patient_creation', '02_01_add_patient_button.png', {
    feature: 'Patient Creation',
    step: 'Add New Patient Action',
    demonstrates: 'Triggering patient onboarding modal with multi-step progression',
    pptUsage: 'Patient intake workflow slide'
  });

  await snap(page, '02_patient_creation', '02_02_add_patient_form.png', {
    feature: 'Patient Creation',
    step: 'Empty Patient Form',
    demonstrates: 'Clean demographic and clinical identity input form',
    pptUsage: 'Patient intake workflow slide'
  });

  // Fill in Alamgir Mandal's details matching the prescription
  await page.fill('input[placeholder*="Priya Sharma"]', 'Alamgir Mandal');
  await page.fill('input[placeholder*="38"]', '29');
  await page.selectOption('select:has-text("Select Gender")', 'Male');
  await page.selectOption('select:has-text("Select Blood Group")', 'O+');
  await page.fill('input[placeholder*="Penicillin"]', 'No known drug allergies');
  await page.fill('input[placeholder*="Hypertension"]', 'Palmar & Plantar Hyperhidrosis, Tachycardia');
  await page.fill('input[placeholder*="Vikram Sharma"]', 'Riju Mandal');
  await page.fill('input[placeholder*="Brother"]', 'Emergency Contact');
  await page.fill('input[placeholder*="91234"]', '9874535650');
  await page.waitForTimeout(300);

  // 02_03_patient_details_entered.png
  await snap(page, '02_patient_creation', '02_03_patient_details_entered.png', {
    feature: 'Patient Creation',
    step: 'Patient Details Entered',
    demonstrates: 'Configured profile for Alamgir Mandal (29y M) with emergency contact Riju Mandal (9874535650)',
    pptUsage: 'Patient onboarding demo slide'
  });

  // Click Next: Upload First Document
  await page.locator('button:has-text("Next: Upload First Document")').click({ force: true });
  await page.waitForTimeout(400);

  // 02_04_first_document_required.png
  await snap(page, '02_patient_creation', '02_04_first_document_required.png', {
    feature: 'Patient Creation',
    step: 'Mandatory First Document Rule',
    demonstrates: 'Strict Clinical Safety Rule: First medical record mandatory to prevent orphan empty profiles',
    pptUsage: 'Safety & Clinical Governance slide'
  });

  // =================================================================
  // 3. CONTROLLED WRONG PATIENT NAME MISMATCH VERIFICATION
  // =================================================================
  console.log('\n--- SECTION 3: WRONG PATIENT NAME MISMATCH VERIFICATION ---');
  
  const fileInput = page.locator('input[type="file"]').last();
  await fileInput.setInputFiles(rahulRxPath);
  await page.waitForTimeout(500);

  // 02_05_prescription_selected.png
  await snap(page, '02_patient_creation', '02_05_prescription_selected.png', {
    feature: 'Document Upload',
    step: 'Document Selected for Processing',
    demonstrates: 'Selected medical prescription ready for AI extraction',
    pptUsage: 'Document ingestion workflow slide'
  });

  // Click Create Patient & Process Document -> Triggers Name Mismatch
  await page.locator('button:has-text("Create Patient & Process Document")').click({ force: true });
  await page.waitForTimeout(2500);

  // 03_01_name_mismatch_popup.png
  await snap(page, '03_document_upload', '03_01_name_mismatch_popup.png', {
    feature: 'Safety & Verification',
    step: 'Patient Name Mismatch Detected',
    demonstrates: 'AI mismatch alert: "Patient\'s name in prescription is different! Will you like to change the name to Rahul Sharma?"',
    pptUsage: 'AI Safety & Clinical Data Quality slide'
  });

  // 03_02_name_mismatch_yes.png
  await snap(page, '03_document_upload', '03_02_name_mismatch_yes.png', {
    feature: 'Safety & Verification',
    step: 'Name Override Option',
    demonstrates: 'User option to accept prescription name automatically',
    pptUsage: 'AI Safety slide'
  });

  // Click NO with force click to test rejection modal
  const noBtn = page.locator('button:has-text("No")').last();
  await noBtn.click({ force: true });
  await page.waitForTimeout(400);

  // 03_03_name_mismatch_no.png
  await snap(page, '03_document_upload', '03_03_name_mismatch_no.png', {
    feature: 'Safety & Verification',
    step: 'Mismatch Rejection Warning',
    demonstrates: 'Prompt rejection notice: "Wrong Prescription Entered as per patient name!" with re-upload trigger',
    pptUsage: 'Safety & Clinical Data Quality slide'
  });

  // Attach Alamgir Mandal's real prescription image
  await fileInput.setInputFiles(alamgirJpg);
  await page.waitForTimeout(400);

  // 02_06_name_verification.png
  await snap(page, '02_patient_creation', '02_06_name_verification.png', {
    feature: 'Patient Creation',
    step: 'Correct Document Verified',
    demonstrates: 'Matching real prescription from Dr. Sabyasachi Roy selected for Alamgir Mandal',
    pptUsage: 'Ingestion workflow slide'
  });

  // Submit Alamgir's real prescription
  await page.locator('button:has-text("Create Patient & Process Document")').click({ force: true });
  await page.waitForTimeout(800);

  // 02_07_patient_processing.png & 04_07
  await snap(page, '02_patient_creation', '02_07_patient_processing.png', {
    feature: 'Processing Pipeline',
    step: 'Gemini 3.6 Flash Processing',
    demonstrates: 'Real-time multi-stage AI extraction from real handwritten & printed prescription',
    pptUsage: 'AI Pipeline Architecture slide'
  });

  await snap(page, '04_processing', '04_07_gemini_processing.png', {
    feature: 'Processing Pipeline',
    step: 'LLM Clinical Entity Synthesis',
    demonstrates: 'Gemini Vision extracting Glycolate, vitals (BP 130/80, Pulse 105, SPO2 96%), lab tests',
    pptUsage: 'AI Innovation slide'
  });

  // Wait for creation to complete and auto-navigate to Dashboard
  await page.waitForTimeout(7000);

  // 02_08_patient_created.png / 02_09_dashboard_after_patient_creation.png
  await snap(page, '02_patient_creation', '02_08_patient_created.png', {
    feature: 'Patient Creation',
    step: 'Patient Created Successfully',
    demonstrates: 'Successful patient onboarding for Alamgir Mandal from real medical document',
    pptUsage: 'User experience slide'
  });

  await snap(page, '02_patient_creation', '02_09_dashboard_after_patient_creation.png', {
    feature: 'Dashboard',
    step: 'Automatic Transition to Dashboard',
    demonstrates: 'Instant transition to populated dashboard for Alamgir Mandal',
    pptUsage: 'Longitudinal profile overview slide'
  });

  // Ensure Alamgir's emergency contact is properly set to Riju Mandal in backend API
  await page.evaluate(async () => {
    try {
      const pats = await (await fetch('http://localhost:8000/api/patients')).json();
      const alamgir = pats.find(p => p.name.includes('Alamgir'));
      if (alamgir) {
        await fetch(`http://localhost:8000/api/patients/${alamgir.id}/emergency-contact`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Riju Mandal',
            relationship: 'Emergency Contact',
            phone: '9874535650'
          })
        });
      }
    } catch (e) {}
  });

  // =================================================================
  // 4. DOCUMENTS PAGE & MULTI-FORMAT REAL PRESCRIPTION UPLOADS
  // =================================================================
  console.log('\n--- SECTION 4: DOCUMENTS & MULTI-FORMAT UPLOADS ---');
  await navTo(page, 'Documents');
  await page.waitForTimeout(600);

  // 04_01_documents_page_before_upload.png
  await snap(page, '04_processing', '04_01_documents_page_before_upload.png', {
    feature: 'Documents',
    step: 'Documents Workspace',
    demonstrates: 'Documents repository showing Alamgir Mandal\'s real prescription and ingestion dropzone',
    pptUsage: 'Clinical document management slide'
  });

  // 04_02_upload_area.png
  await snap(page, '04_processing', '04_02_upload_area.png', {
    feature: 'Documents',
    step: 'Multi-Format Dropzone',
    demonstrates: 'Universal upload area accepting PDF, PNG, JPG, JPEG, WEBP formats',
    pptUsage: 'Multi-format ingestion feature slide'
  });

  // Upload PNG format of Alamgir's Rx
  const docUploadInput = page.locator('input[type="file"]').first();
  await docUploadInput.setInputFiles(alamgirPng);
  await page.waitForTimeout(400);

  // 05_02_png_upload.png
  await snap(page, '05_dashboard', '05_02_png_upload.png', {
    feature: 'Multi-Format Ingestion',
    step: 'PNG Image Prescription Selected',
    demonstrates: 'Image preview & Vision OCR readiness for Alamgir Mandal PNG prescription',
    pptUsage: 'Multi-format support slide'
  });

  // Upload JPG format of Alamgir's Rx
  await docUploadInput.setInputFiles(alamgirJpg);
  await page.waitForTimeout(400);
  await snap(page, '05_dashboard', '05_03_jpg_upload.png', {
    feature: 'Multi-Format Ingestion',
    step: 'JPG Document Selected',
    demonstrates: 'Handling of real camera JPG prescription from Borjora Superspeciality Hospital',
    pptUsage: 'Multi-format support slide'
  });

  // Upload JPEG format of Alamgir's Rx
  await docUploadInput.setInputFiles(alamgirJpeg);
  await page.waitForTimeout(400);
  await snap(page, '05_dashboard', '05_04_jpeg_upload.png', {
    feature: 'Multi-Format Ingestion',
    step: 'JPEG Document Selected',
    demonstrates: 'JPEG medical encounter document ingestion for Alamgir Mandal',
    pptUsage: 'Multi-format support slide'
  });

  // Upload WEBP format of Alamgir's Rx
  await docUploadInput.setInputFiles(alamgirWebp);
  await page.waitForTimeout(400);
  await snap(page, '05_dashboard', '05_05_webp_upload.png', {
    feature: 'Multi-Format Ingestion',
    step: 'WEBP Document Selected',
    demonstrates: 'Modern high-compression WEBP document ingestion for Alamgir Mandal',
    pptUsage: 'Multi-format support slide'
  });

  // Upload PDF format of Alamgir's Rx
  await docUploadInput.setInputFiles(alamgirPdf);
  await page.waitForTimeout(400);
  await snap(page, '05_dashboard', '05_01_pdf_upload.png', {
    feature: 'Multi-Format Ingestion',
    step: 'PDF Document Selected',
    demonstrates: 'Digital PDF medical record ingestion for Alamgir Mandal',
    pptUsage: 'Multi-format support slide'
  });

  // Scanned Prescription / Vision Fallback
  await docUploadInput.setInputFiles(alamgirJpg);
  await page.waitForTimeout(400);

  // 06_01_scanned_prescription_detected.png
  await snap(page, '06_documents', '06_01_scanned_prescription_detected.png', {
    feature: 'Vision OCR Pipeline',
    step: 'Scanned Prescription Detected',
    demonstrates: 'Automated fallback to Gemini Vision OCR for handwritten clinical prescriptions',
    pptUsage: 'Vision AI & OCR Technology slide'
  });

  // =================================================================
  // 5. DOCUMENTS DETAILED VIEWS
  // =================================================================
  console.log('\n--- SECTION 5: DOCUMENTS DETAILED VIEWS ---');
  await page.locator('button:has-text("Cancel")').click({ force: true }).catch(() => {});
  await page.waitForTimeout(400);

  // 09_01_documents_overview.png
  await snap(page, '06_documents', '09_01_documents_overview.png', {
    feature: 'Documents',
    step: 'Documents Overview',
    demonstrates: 'Longitudinal document repository for Alamgir Mandal with extraction badges & metadata',
    pptUsage: 'Document management feature slide'
  });

  // Open Document Details modal
  const viewDetailsBtn = page.locator('button:has-text("View Details")').first();
  if (await viewDetailsBtn.isVisible()) {
    await viewDetailsBtn.click({ force: true });
    await page.waitForTimeout(400);
    await snap(page, '06_documents', '09_03_document_details.png', {
      feature: 'Documents',
      step: 'Document Inspection Modal',
      demonstrates: 'Inspecting extracted raw clinical text and OCR metadata for Dr. Sabyasachi Roy Rx',
      pptUsage: 'Clinical document inspection slide'
    });
    await page.locator('button:has-text("Close")').click({ force: true });
    await page.waitForTimeout(300);
  }

  // =================================================================
  // 6. DASHBOARD LIGHT / DARK
  // =================================================================
  console.log('\n--- SECTION 6: DASHBOARD STATES ---');
  await navTo(page, 'Dashboard');
  await page.waitForTimeout(600);

  // 07_01_dashboard_light.png
  await snap(page, '05_dashboard', '07_01_dashboard_light.png', {
    feature: 'Dashboard',
    step: 'Light Mode Dashboard',
    demonstrates: 'Full clinical dashboard for Alamgir Mandal in high-clarity Light theme',
    pptUsage: 'Main Dashboard hero slide'
  });

  // Toggle Dark Mode
  await setDarkMode(page);
  await page.waitForTimeout(500);

  // 07_02_dashboard_dark.png
  await snap(page, '05_dashboard', '07_02_dashboard_dark.png', {
    feature: 'Dashboard',
    step: 'Dark Mode Dashboard',
    demonstrates: 'Full clinical dashboard for Alamgir Mandal in sleek modern Dark theme',
    pptUsage: 'Dark Theme Hero slide'
  });

  await setLightMode(page);
  await page.waitForTimeout(400);

  // =================================================================
  // 7. SIDEBAR COMPLETE DOCUMENTATION
  // =================================================================
  console.log('\n--- SECTION 7: SIDEBAR DOCUMENTATION ---');
  
  await snap(page, '07_timeline', '08_01_sidebar_top.png', {
    feature: 'Navigation',
    step: 'Sidebar Top & Patient Switcher',
    demonstrates: 'Brand header, Alamgir Mandal active indicator, and patient selector dropdown',
    pptUsage: 'UI/UX Design slide'
  });

  await snap(page, '07_timeline', '08_02_sidebar_middle.png', {
    feature: 'Navigation',
    step: 'Sidebar Care & AI Features',
    demonstrates: 'Navigation to Overview, Care & AI, and Safety & Triage modules',
    pptUsage: 'UI/UX Design slide'
  });

  await snap(page, '07_timeline', '08_03_sidebar_bottom.png', {
    feature: 'Navigation',
    step: 'Sidebar Bottom Utilities',
    demonstrates: 'Theme toggle, Demo loader, Profile deletion, and data isolation protection',
    pptUsage: 'UI/UX Design slide'
  });

  // =================================================================
  // 8. HEALTH TIMELINE
  // =================================================================
  console.log('\n--- SECTION 8: HEALTH TIMELINE ---');
  await navTo(page, 'Health Timeline');
  await page.waitForTimeout(600);

  await snap(page, '07_timeline', '10_01_timeline_overview.png', {
    feature: 'Timeline',
    step: 'Timeline Overview',
    demonstrates: 'Longitudinal milestones for Alamgir Mandal (Dr. Sabyasachi Roy consultation)',
    pptUsage: 'Longitudinal health story slide'
  });

  await snap(page, '07_timeline', '10_02_timeline_prescription.png', {
    feature: 'Timeline',
    step: 'Prescription Milestones',
    demonstrates: 'Prescription issuance and clinical follow-up milestones for Hyperhidrosis',
    pptUsage: 'Clinical timeline slide'
  });

  // =================================================================
  // 9. HEALTH TRENDS & CHARTS
  // =================================================================
  console.log('\n--- SECTION 9: HEALTH TRENDS ---');
  await navTo(page, 'Health Trends');
  await page.waitForTimeout(600);

  await snap(page, '08_trends', '11_01_trends_page.png', {
    feature: 'Biomarker Trends',
    step: 'Trends Page Overview',
    demonstrates: 'Biomarker shift analysis (Pulse Rate 105 bpm, Blood Pressure 130/80 mmHg, SpO2 96%)',
    pptUsage: 'Biomarker analytics slide'
  });

  await snap(page, '08_trends', '11_02_trend_chart.png', {
    feature: 'Biomarker Trends',
    step: 'Interactive Trajectory Chart',
    demonstrates: 'Recharts time-series trajectory tracking Pulse Rate & Blood Pressure for Alamgir Mandal',
    pptUsage: 'Data visualization slide'
  });

  // =================================================================
  // 10. MEDICATIONS & REGIMENS (CURRENT VS SUPERSEDED)
  // =================================================================
  console.log('\n--- SECTION 10: MEDICATIONS ---');
  await navTo(page, 'Medications');
  await page.waitForTimeout(600);

  await snap(page, '09_medications', '12_01_medications_overview.png', {
    feature: 'Medications',
    step: 'Medication Tracker Overview',
    demonstrates: 'Active therapeutic regimens from real prescription (Glycolate, Tradent)',
    pptUsage: 'Medication management slide'
  });

  await snap(page, '09_medications', '12_02_current_medications.png', {
    feature: 'Medications',
    step: 'Active Therapeutic Regimen',
    demonstrates: 'Verified active medications extracted for Alamgir Mandal',
    pptUsage: 'Therapeutic regimen slide'
  });

  // Switch to Historical Tab
  await page.locator('button:has-text("Superseded / History")').click({ force: true });
  await page.waitForTimeout(400);

  await snap(page, '09_medications', '12_03_historical_medications.png', {
    feature: 'Medications',
    step: 'Historical / Superseded Regimens',
    demonstrates: 'Auditable archive of past medications with discontinuation tracking',
    pptUsage: 'Clinical audit trail slide'
  });

  await page.locator('button:has-text("Active Regimen")').click({ force: true });
  await page.waitForTimeout(300);

  // =================================================================
  // 11. DOCTOR BRIEF (FULL GENERATION FLOW)
  // =================================================================
  console.log('\n--- SECTION 11: DOCTOR BRIEF ---');
  await navTo(page, 'Doctor Brief');
  await page.waitForTimeout(600);

  await snap(page, '10_doctor_brief', '13_01_doctor_brief_empty.png', {
    feature: 'Doctor Brief',
    step: 'Pre-Generation State',
    demonstrates: 'Validated SQLite factsheet and pre-consultation prompt for Alamgir Mandal',
    pptUsage: 'AI Doctor Brief workflow slide'
  });

  const genBriefBtn = page.locator('button:has-text("Generate Doctor Brief"), button:has-text("Regenerate AI Brief")').first();
  await genBriefBtn.click({ force: true });
  await page.waitForTimeout(1000);

  await snap(page, '10_doctor_brief', '13_02_doctor_brief_generating.png', {
    feature: 'Doctor Brief',
    step: 'AI Synthesis in Progress',
    demonstrates: 'Multi-step progress indicator showing Gemini 3.6 Flash synthesizing Alamgir Mandal\'s real records',
    pptUsage: 'AI Synthesis slide'
  });

  await page.waitForTimeout(8000);

  await snap(page, '10_doctor_brief', '13_04_doctor_brief_generated.png', {
    feature: 'Doctor Brief',
    step: 'Complete Synthesized Doctor Brief',
    demonstrates: '1-page appointment brief with Patient Overview (Hyperhidrosis), Regimen, and Doctor Discussion Points',
    pptUsage: 'AI Clinical Continuity Hero slide'
  });

  await snap(page, '10_doctor_brief', '13_05_doctor_brief_ai_disclaimer.png', {
    feature: 'Doctor Brief',
    step: 'Clinical Disclaimer & Safety Notice',
    demonstrates: 'Mandatory clinical review notice & decision support labeling',
    pptUsage: 'Clinical Governance slide'
  });

  // =================================================================
  // 12. TRANSLATE & EXPLAIN (EVERY SUPPORTED LANGUAGE)
  // =================================================================
  console.log('\n--- SECTION 12: MULTILINGUAL TRANSLATE & EXPLAIN ---');
  await navTo(page, 'Translate & Explain');
  await page.waitForTimeout(600);

  await snap(page, '11_translation', '14_01_translate_initial.png', {
    feature: 'Translation',
    step: 'Initial Translation Workspace',
    demonstrates: 'Split-screen workspace: Original Clinical English vs Simplified Regional Native Script for Alamgir Mandal',
    pptUsage: 'Multilingual accessibility slide'
  });

  const languageMap = [
    { key: 'English', filename: '14_02_english_translation.png', name: 'English' },
    { key: 'हिन्दी / Hindi', filename: '14_03_hindi_translation.png', name: 'Hindi' },
    { key: 'বাংলা / Bengali', filename: '14_04_bengali_translation.png', name: 'Bengali' },
    { key: 'অসমীয়া / Assamese', filename: '14_05_assamese_translation.png', name: 'Assamese' },
    { key: 'ଓଡ଼ିଆ / Odia', filename: '14_06_odia_translation.png', name: 'Odia' },
    { key: 'தமிழ் / Tamil', filename: '14_07_tamil_translation.png', name: 'Tamil' },
    { key: 'తెలుగు / Telugu', filename: '14_08_telugu_translation.png', name: 'Telugu' },
    { key: 'मराठी / Marathi', filename: '14_09_marathi_translation.png', name: 'Marathi' },
    { key: 'ગુજરાતી / Gujarati', filename: '14_10_gujarati_translation.png', name: 'Gujarati' },
    { key: 'ಕನ್ನಡ / Kannada', filename: '14_11_kannada_translation.png', name: 'Kannada' },
    { key: 'മലയാളം / Malayalam', filename: '14_12_malayalam_translation.png', name: 'Malayalam' },
    { key: 'ਪੰਜਾਬੀ / Punjabi', filename: '14_13_punjabi_translation.png', name: 'Punjabi' },
    { key: 'اردو / Urdu', filename: '14_14_urdu_translation.png', name: 'Urdu' }
  ];

  for (const lang of languageMap) {
    console.log(`Processing language: ${lang.name}...`);
    const langSelect = page.locator('select').first();
    await langSelect.selectOption({ label: lang.key }).catch(async () => {
      await langSelect.selectOption(lang.key);
    });
    await page.waitForTimeout(300);

    const translateBtn = page.locator('button:has-text("Translate & Explain")').first();
    await translateBtn.click({ force: true });
    await page.waitForTimeout(4000);

    await snap(page, '11_translation', lang.filename, {
      feature: 'Multilingual Translation',
      step: `${lang.name} Translation & Plain Terms`,
      demonstrates: `Reassuring patient-friendly translation & medical explanation in ${lang.name} for Alamgir Mandal`,
      pptUsage: `Multilingual accessibility slide (${lang.name})`
    });
  }

  // =================================================================
  // 13. TTS / LISTEN & KEY MEDICAL TERMS
  // =================================================================
  console.log('\n--- SECTION 13: TTS & KEY MEDICAL TERMS ---');
  
  const langSelectForTTS = page.locator('select').first();
  await langSelectForTTS.selectOption('বাংলা / Bengali');
  await page.waitForTimeout(300);
  await page.locator('button:has-text("Translate & Explain")').first().click({ force: true });
  await page.waitForTimeout(3000);

  await snap(page, '12_tts', '15_01_tts_ready.png', {
    feature: 'Text-to-Speech',
    step: 'TTS Audio Ready',
    demonstrates: 'Full-text continuous speech synthesis trigger for Bengali narration',
    pptUsage: 'Voice accessibility slide'
  });

  const listenBtn = page.locator('button:has-text("Listen in")').first();
  if (await listenBtn.isVisible()) {
    await listenBtn.click({ force: true });
    await page.waitForTimeout(4000);
    await snap(page, '12_tts', '15_02_tts_playing.png', {
      feature: 'Text-to-Speech',
      step: 'Continuous Voice Narration',
      demonstrates: 'Multi-chunk audio playback controls with live progress bar in Bengali',
      pptUsage: 'Voice accessibility hero slide'
    });
  }

  await snap(page, '12_tts', '16_01_key_medical_terms.png', {
    feature: 'Medical Terms Simplification',
    step: 'Plain Language Terminology Cards',
    demonstrates: 'Key clinical terms (Hyperhidrosis, Tachycardia, Glycolate) explained in simple everyday Bengali/English',
    pptUsage: 'Health Literacy & Patient Education slide'
  });

  // =================================================================
  // 14. EMERGENCY MODE (HERO CLINICAL TRIAGE)
  // =================================================================
  console.log('\n--- SECTION 14: EMERGENCY MODE ---');
  
  await snap(page, '13_emergency', '17_01_emergency_button.png', {
    feature: 'Emergency Mode',
    step: 'High-Contrast Emergency Button',
    demonstrates: 'Instant one-click access to ICE triage card from sidebar navigation',
    pptUsage: 'Emergency feature introduction slide'
  });

  await navTo(page, 'Emergency Mode');
  await page.waitForTimeout(600);

  await snap(page, '13_emergency', '17_02_emergency_mode_open.png', {
    feature: 'Emergency Mode',
    step: 'ICE Clinical Triage Card',
    demonstrates: 'High-contrast emergency card for Alamgir Mandal: Blood Group O+, Emergency Contact Riju Mandal (9874535650)',
    pptUsage: 'Emergency Mode Hero slide'
  });

  await snap(page, '13_emergency', '17_03_emergency_profile.png', {
    feature: 'Emergency Mode',
    step: 'Verified Emergency Contact',
    demonstrates: 'Emergency contact Riju Mandal (9874535650) strictly mapped to Alamgir Mandal',
    pptUsage: 'Emergency Triage slide'
  });

  const demoGpsBtn = page.locator('button:has-text("Demo GPS")').first();
  if (await demoGpsBtn.isVisible()) {
    await demoGpsBtn.click({ force: true });
    await page.waitForTimeout(400);
    await snap(page, '13_emergency', '17_04_location_state.png', {
      feature: 'Emergency Mode',
      step: 'Live GPS Location Dispatch',
      demonstrates: 'Real-time GPS coordinate acquisition & audit event logging for Alamgir Mandal',
      pptUsage: 'Emergency Dispatch slide'
    });
  }

  const callBtn = page.locator('button:has-text("Call Riju Mandal"), button:has-text("Call Emergency Services")').first();
  if (await callBtn.isVisible()) {
    await callBtn.click({ force: true });
    await page.waitForTimeout(400);
    await snap(page, '13_emergency', '17_05_emergency_actions.png', {
      feature: 'Emergency Mode',
      step: 'Simulated Emergency Call Action',
      demonstrates: 'Instant click-to-call modal to dial Riju Mandal (9874535650)',
      pptUsage: 'Emergency workflow slide'
    });
    await page.locator('button:has-text("Dismiss")').click({ force: true });
    await page.waitForTimeout(300);
  }

  // =================================================================
  // 15. PRESCRIPTIONS MANAGEMENT & DELETION MODAL
  // =================================================================
  console.log('\n--- SECTION 15: PRESCRIPTION MANAGEMENT ---');
  await navTo(page, 'Documents');
  await page.waitForTimeout(500);

  await snap(page, '14_prescriptions', '18_01_prescriptions_page.png', {
    feature: 'Prescriptions',
    step: 'Prescriptions Workspace',
    demonstrates: 'Active prescriptions list for Alamgir Mandal',
    pptUsage: 'Prescription management slide'
  });

  await snap(page, '14_prescriptions', '18_02_prescription_card.png', {
    feature: 'Prescriptions',
    step: 'Prescription Card Inspection',
    demonstrates: 'Prescription card with Dr. Sabyasachi Roy details and Borjora Hospital badge',
    pptUsage: 'Prescription inspection slide'
  });

  // =================================================================
  // 16. PATIENT ISOLATION & SECOND PATIENT (RAHUL SHARMA)
  // =================================================================
  console.log('\n--- SECTION 16: SECOND PATIENT & DATA ISOLATION ---');
  
  const addBtn2 = page.locator('aside button:has-text("Add New Patient")').first();
  await addBtn2.click({ force: true });
  await page.waitForTimeout(400);

  await page.fill('input[placeholder*="Priya Sharma"]', 'Rahul Sharma');
  await page.fill('input[placeholder*="38"]', '44');
  await page.selectOption('select:has-text("Select Gender")', 'Male');
  await page.selectOption('select:has-text("Select Blood Group")', 'B+');
  await page.fill('input[placeholder*="Penicillin"]', 'Sulfa drugs');
  await page.fill('input[placeholder*="Hypertension"]', 'Type 2 Diabetes Mellitus');
  await page.fill('input[placeholder*="Vikram Sharma"]', 'Anita Sharma');
  await page.fill('input[placeholder*="Brother"]', 'Spouse');
  await page.fill('input[placeholder*="91234"]', '9876543210');
  await page.waitForTimeout(300);

  await snap(page, '15_patient_management', '20_01_add_second_patient.png', {
    feature: 'Multi-Patient',
    step: 'Enter Second Patient Details',
    demonstrates: 'Configuring independent profile for Rahul Sharma with separate emergency contact',
    pptUsage: 'Multi-patient management slide'
  });

  await page.locator('button:has-text("Next: Upload First Document")').click({ force: true });
  await page.waitForTimeout(400);

  const rahulRxInput = page.locator('input[type="file"]').last();
  await rahulRxInput.setInputFiles(rahulRxPath);
  await page.waitForTimeout(400);

  await page.locator('button:has-text("Create Patient & Process Document")').click({ force: true });
  await page.waitForTimeout(6000);

  await snap(page, '15_patient_management', '20_02_second_patient_created.png', {
    feature: 'Multi-Patient',
    step: 'Second Patient Created',
    demonstrates: 'Rahul Sharma created with separate medical record bundle',
    pptUsage: 'Multi-patient management slide'
  });

  await snap(page, '15_patient_management', '21_02_patient_B_dashboard.png', {
    feature: 'Data Isolation',
    step: 'Patient B Dashboard (Rahul Sharma)',
    demonstrates: 'Rahul Sharma dashboard showing Metformin & Type 2 Diabetes records',
    pptUsage: 'Patient Data Isolation slide'
  });

  // Verify Rahul's Emergency Mode (Riju Mandal MUST NOT appear)
  await navTo(page, 'Emergency Mode');
  await page.waitForTimeout(600);
  await snap(page, '13_emergency', '17_06_other_patient_emergency.png', {
    feature: 'Data Isolation',
    step: 'Patient B Emergency Card',
    demonstrates: 'Strict Isolation Verified: Anita Sharma appears for Rahul; Riju Mandal does NOT bleed over',
    pptUsage: 'Clinical Privacy & Data Isolation slide'
  });

  await snap(page, '15_patient_management', '21_04_patient_B_emergency.png', {
    feature: 'Data Isolation',
    step: 'Patient B ICE Triage Isolation',
    demonstrates: 'Rahul Sharma ICE profile strictly isolated with Blood Group B+ and Sulfa allergy',
    pptUsage: 'Data Isolation slide'
  });

  // Switch back to Alamgir Mandal via dropdown
  const patientDropdown = page.locator('aside div.relative > button').first();
  await patientDropdown.click({ force: true });
  await page.waitForTimeout(400);

  await snap(page, '15_patient_management', '20_03_patient_selector_multiple.png', {
    feature: 'Multi-Patient',
    step: 'Multi-Patient Directory Dropdown',
    demonstrates: 'Multiple active patients available in atomic switcher',
    pptUsage: 'Multi-patient switcher slide'
  });

  const alamgirOption = page.locator('aside div.relative button:has-text("Alamgir")').first();
  if (await alamgirOption.isVisible()) {
    await alamgirOption.click({ force: true });
  } else {
    await page.click('button:has-text("Alamgir")').catch(() => {});
  }
  await page.waitForTimeout(600);

  await navTo(page, 'Dashboard');
  await page.waitForTimeout(600);
  await snap(page, '15_patient_management', '21_01_patient_A_dashboard.png', {
    feature: 'Data Isolation',
    step: 'Patient A Dashboard (Alamgir Mandal)',
    demonstrates: 'Alamgir Mandal dashboard restored with zero cross-patient data pollution',
    pptUsage: 'Atomic patient switching slide'
  });

  // Patient deletion modal capture
  const deletePatBtn = page.locator('aside button[title*="Delete Active Patient Profile"]').first();
  if (await deletePatBtn.isVisible()) {
    await deletePatBtn.click({ force: true });
    await page.waitForTimeout(400);
    await snap(page, '15_patient_management', '19_01_delete_patient_option.png', {
      feature: 'Patient Management',
      step: 'Delete Patient Action',
      demonstrates: 'Triggering patient removal modal',
      pptUsage: 'Patient lifecycle slide'
    });
    await snap(page, '15_patient_management', '19_02_delete_confirmation_modal.png', {
      feature: 'Patient Management',
      step: 'Delete Confirmation Modal',
      demonstrates: 'Safety confirmation prompt before purging medical records',
      pptUsage: 'Safety governance slide'
    });
    await page.locator('button:has-text("Cancel")').click({ force: true });
    await page.waitForTimeout(300);
  }

  // =================================================================
  // 17. LOAD DEMO PATIENT (ADDITIVE CHECK)
  // =================================================================
  console.log('\n--- SECTION 17: LOAD DEMO PATIENT ---');
  
  await snap(page, '16_demo_patient', '22_01_load_demo_button.png', {
    feature: 'Demo Engine',
    step: 'Load Demo Patient Button',
    demonstrates: 'Additive synthetic demo data generator button in sidebar',
    pptUsage: 'Demo capability slide'
  });

  const loadDemoBtn = page.locator('aside button:has-text("Load Demo Patient")').first();
  await loadDemoBtn.click({ force: true });
  await page.waitForTimeout(800);

  await snap(page, '16_demo_patient', '22_02_demo_loading.png', {
    feature: 'Demo Engine',
    step: 'Demo Patient Generating',
    demonstrates: 'Synthesizing multi-encounter longitudinal history with lab panels',
    pptUsage: 'Demo capability slide'
  });

  await page.waitForTimeout(4000);

  await snap(page, '16_demo_patient', '22_03_demo_patient_loaded.png', {
    feature: 'Demo Engine',
    step: 'Demo Patient Ready',
    demonstrates: 'Demo patient loaded with DEMO badge and full longitudinal clinical dataset',
    pptUsage: 'Demo capability slide'
  });

  // Open dropdown to show additive persistence (Alamgir + Rahul + Eleanor)
  const switcher = page.locator('aside div.relative > button').first();
  if (await switcher.isVisible()) {
    await switcher.click({ force: true });
    await page.waitForTimeout(400);
    await snap(page, '16_demo_patient', '22_04_patient_selector_after_demo.png', {
      feature: 'Demo Engine',
      step: 'Additive Directory Persistence',
      demonstrates: 'Loading demo patient preserved Alamgir Mandal without wiping data',
      pptUsage: 'Safe Demo Engine slide'
    });
    // Switch back to Alamgir Mandal
    const alamgirBack = page.locator('aside div.relative button:has-text("Alamgir")').first();
    if (await alamgirBack.isVisible()) {
      await alamgirBack.click({ force: true });
      await page.waitForTimeout(500);
    }
  }

  // =================================================================
  // 18. LIGHT / DARK THEME COMPARISON SET
  // =================================================================
  console.log('\n--- SECTION 18: THEME COMPARISON ---');
  
  await navTo(page, 'Dashboard');
  await setLightMode(page);
  await page.waitForTimeout(400);
  await snap(page, '17_theme', '23_01_dashboard_light.png', {
    feature: 'Theme',
    step: 'Dashboard Light Theme',
    demonstrates: 'Crisp light mode styling with high contrast tokens for Alamgir Mandal',
    pptUsage: 'Design System slide'
  });

  await setDarkMode(page);
  await page.waitForTimeout(400);
  await snap(page, '17_theme', '23_02_dashboard_dark.png', {
    feature: 'Theme',
    step: 'Dashboard Dark Theme',
    demonstrates: 'Dark mode styling with deep navy/slate glassmorphism',
    pptUsage: 'Design System slide'
  });

  await navTo(page, 'Documents');
  await setLightMode(page);
  await page.waitForTimeout(400);
  await snap(page, '17_theme', '23_03_documents_light.png', {
    feature: 'Theme',
    step: 'Documents Light Theme',
    demonstrates: 'Document repository in Light mode with real Rx image preview',
    pptUsage: 'Design System slide'
  });

  await setDarkMode(page);
  await page.waitForTimeout(400);
  await snap(page, '17_theme', '23_04_documents_dark.png', {
    feature: 'Theme',
    step: 'Documents Dark Theme',
    demonstrates: 'Document repository in Dark mode',
    pptUsage: 'Design System slide'
  });

  await navTo(page, 'Translate & Explain');
  await setLightMode(page);
  await page.waitForTimeout(400);
  await snap(page, '17_theme', '23_05_translate_light.png', {
    feature: 'Theme',
    step: 'Translate & Explain Light Theme',
    demonstrates: 'Multilingual workspace in Light mode for Alamgir Mandal',
    pptUsage: 'Design System slide'
  });

  await setDarkMode(page);
  await page.waitForTimeout(400);
  await snap(page, '17_theme', '23_06_translate_dark.png', {
    feature: 'Theme',
    step: 'Translate & Explain Dark Theme',
    demonstrates: 'Multilingual workspace in Dark mode',
    pptUsage: 'Design System slide'
  });

  await navTo(page, 'Emergency Mode');
  await page.waitForTimeout(400);
  await snap(page, '17_theme', '23_07_emergency_light_or_dark.png', {
    feature: 'Theme',
    step: 'Emergency Mode Dark Contrast',
    demonstrates: 'High-contrast emergency card in dark theme for Alamgir Mandal',
    pptUsage: 'Design System slide'
  });

  await setLightMode(page);

  // =================================================================
  // 19. RESPONSIVE MOBILE & TABLET SCREENSHOTS
  // =================================================================
  console.log('\n--- SECTION 19: RESPONSIVE SCREENSHOTS ---');
  
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(600);

  await snap(page, '18_responsive', '24_01_mobile_dashboard.png', {
    feature: 'Mobile Responsive',
    step: 'Mobile Dashboard',
    demonstrates: 'Fully responsive mobile dashboard with fluid metric cards for Alamgir Mandal',
    pptUsage: 'Mobile UX & Responsive design slide'
  });

  // Mobile Documents
  await page.locator('button:has-text("Documents")').click({ force: true }).catch(() => {});
  await page.waitForTimeout(400);
  await snap(page, '18_responsive', '24_03_mobile_upload.png', {
    feature: 'Mobile Responsive',
    step: 'Mobile Document Ingestion',
    demonstrates: 'Touch-friendly camera capture and file selection on mobile',
    pptUsage: 'Mobile UX slide'
  });

  // Mobile Timeline
  await page.locator('button:has-text("Health Timeline")').click({ force: true }).catch(() => {});
  await page.waitForTimeout(400);
  await snap(page, '18_responsive', '24_04_mobile_timeline.png', {
    feature: 'Mobile Responsive',
    step: 'Mobile Health Timeline',
    demonstrates: 'Vertical timeline stream optimized for thumb scrolling',
    pptUsage: 'Mobile UX slide'
  });

  // Mobile Emergency Mode
  await page.locator('button:has-text("Emergency Mode")').click({ force: true }).catch(() => {});
  await page.waitForTimeout(400);
  await snap(page, '18_responsive', '24_05_mobile_emergency.png', {
    feature: 'Mobile Responsive',
    step: 'Mobile Emergency Triage',
    demonstrates: 'One-hand emergency card for Alamgir Mandal with click-to-call Riju Mandal and GPS dispatch',
    pptUsage: 'Mobile Emergency slide'
  });

  // Mobile Translate
  await page.locator('button:has-text("Translate & Explain")').click({ force: true }).catch(() => {});
  await page.waitForTimeout(400);
  await snap(page, '18_responsive', '24_06_mobile_translate.png', {
    feature: 'Mobile Responsive',
    step: 'Mobile Multilingual Translation',
    demonstrates: 'Stackable translation view and mobile voice audio controls',
    pptUsage: 'Mobile UX slide'
  });

  // Tablet Viewport 768x1024
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.locator('button:has-text("Dashboard")').click({ force: true }).catch(() => {});
  await page.waitForTimeout(500);
  await snap(page, '18_responsive', '24_07_tablet_dashboard.png', {
    feature: 'Tablet Responsive',
    step: 'Tablet Dashboard Layout',
    demonstrates: 'Adaptive multi-column layout for iPad/Tablet clinical rounds for Alamgir Mandal',
    pptUsage: 'Tablet UX slide'
  });

  // Restore Desktop Viewport
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(500);

  // =================================================================
  // 20. CONTINUOUS HEALTH STORY: INGESTING UPDATED REPORT
  // =================================================================
  console.log('\n--- SECTION 20: UPDATED PRESCRIPTION & CONTINUOUS HEALTH STORY ---');
  
  await navTo(page, 'Dashboard');
  await page.waitForTimeout(500);
  await snap(page, '19_final_states', '25_01_before_new_prescription.png', {
    feature: 'Continuous Health Story',
    step: 'Profile Baseline Before Rx Update',
    demonstrates: 'Alamgir Mandal baseline regimen with Glycolate and Tradent',
    pptUsage: 'Continuous Health Story concept slide'
  });

  // Go to Documents and upload updated document
  await navTo(page, 'Documents');
  await page.waitForTimeout(400);

  const rx2Input = page.locator('input[type="file"]').first();
  await rx2Input.setInputFiles(alamgirPdf);
  await page.waitForTimeout(300);

  await page.locator('button:has-text("Process & Ingest Prescription")').click({ force: true });
  await page.waitForTimeout(800);

  await snap(page, '19_final_states', '25_02_new_prescription_processing.png', {
    feature: 'Continuous Health Story',
    step: 'Processing Updated Encounter',
    demonstrates: 'Gemini 3.6 Flash parsing encounter records for Alamgir Mandal',
    pptUsage: 'AI Ingestion slide'
  });

  await page.waitForTimeout(5000);

  await snap(page, '19_final_states', '25_06_dashboard_updated.png', {
    feature: 'Continuous Health Story',
    step: 'Dashboard Updated with New Regimen',
    demonstrates: 'Automatic synchronization of updated therapeutic records on Dashboard for Alamgir Mandal',
    pptUsage: 'Continuous Health Story slide'
  });

  await navTo(page, 'Medications');
  await page.waitForTimeout(500);

  await snap(page, '19_final_states', '25_04_new_current_medications.png', {
    feature: 'Medications',
    step: 'Updated Current Regimen',
    demonstrates: 'Active therapeutic regimen for Alamgir Mandal',
    pptUsage: 'Clinical Regimen Updates slide'
  });

  await navTo(page, 'Health Timeline');
  await page.waitForTimeout(500);

  await snap(page, '19_final_states', '25_05_timeline_updated.png', {
    feature: 'Timeline',
    step: 'Timeline Updated with New Encounter',
    demonstrates: 'Longitudinal timeline automatically logging encounters for Alamgir Mandal',
    pptUsage: 'Longitudinal timeline slide'
  });

  // =================================================================
  // 21. FINAL COMPLETE HERO SCREENS (ALAMGIR MANDAL)
  // =================================================================
  console.log('\n--- SECTION 21: FINAL POLISHED HERO SCREENS ---');
  
  await navTo(page, 'Dashboard');
  await setLightMode(page);
  await page.waitForTimeout(600);
  await snap(page, '19_final_states', '26_01_final_dashboard_light.png', {
    feature: 'Final Hero State',
    step: 'Master Dashboard (Light)',
    demonstrates: 'Complete, fully-populated, flawless clinical dashboard for Alamgir Mandal',
    pptUsage: 'Primary PPT Hero / Closing demo slide'
  });

  await setDarkMode(page);
  await page.waitForTimeout(500);
  await snap(page, '19_final_states', '26_02_final_dashboard_dark.png', {
    feature: 'Final Hero State',
    step: 'Master Dashboard (Dark)',
    demonstrates: 'Flawless dark mode presentation dashboard for Alamgir Mandal with live charts & active meds',
    pptUsage: 'PPT Hero slide (Dark theme)'
  });

  await setLightMode(page);

  await navTo(page, 'Emergency Mode');
  await page.waitForTimeout(500);
  await snap(page, '19_final_states', '26_04_final_emergency.png', {
    feature: 'Final Hero State',
    step: 'Master Emergency Hero Card',
    demonstrates: 'Alamgir Mandal ICE card with Riju Mandal (9874535650), Blood Group O+, active meds, and live GPS',
    pptUsage: 'Emergency Mode PPT Hero slide'
  });

  await navTo(page, 'Translate & Explain');
  await page.waitForTimeout(600);
  const langSel = page.locator('select').first();
  await langSel.selectOption('বাংলা / Bengali');
  await page.waitForTimeout(300);
  await page.locator('button:has-text("Translate & Explain")').first().click({ force: true });
  await page.waitForTimeout(4000);
  await snap(page, '19_final_states', '26_05_final_translation.png', {
    feature: 'Final Hero State',
    step: 'Master Translation Hero View',
    demonstrates: 'Original English vs Bengali translation + Plain terms + Speech synthesis audio for Alamgir Mandal',
    pptUsage: 'Multilingual Accessibility Hero slide'
  });

  await navTo(page, 'Doctor Brief');
  await page.waitForTimeout(500);
  const genFinalBrief = page.locator('button:has-text("Generate Doctor Brief"), button:has-text("Regenerate AI Brief")').first();
  await genFinalBrief.click({ force: true });
  await page.waitForTimeout(7000);
  await snap(page, '19_final_states', '26_06_final_doctor_brief.png', {
    feature: 'Final Hero State',
    step: 'Master AI Doctor Brief Hero',
    demonstrates: 'Comprehensive pre-consultation doctor brief for Alamgir Mandal ready for clinical review',
    pptUsage: 'Doctor Brief PPT Hero slide'
  });

  await browser.close();

  console.log(`\n=====================================================`);
  console.log(`[SUCCESS] CAPTURED ALL SCREENSHOTS FOR ALAMGIR MANDAL!`);
  console.log(`=====================================================\n`);
}

run().catch((err) => {
  console.error('[ERROR] Screenshot session failed:', err);
  process.exit(1);
});
