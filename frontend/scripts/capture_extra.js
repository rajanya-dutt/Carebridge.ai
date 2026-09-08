import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const SCREENSHOTS_DIR = path.resolve(ROOT_DIR, 'screenshots');
const TEST_DOCS_DIR = path.resolve(ROOT_DIR, 'scratch', 'test_docs');

async function snap(page, folder, filename) {
  const targetPath = path.join(SCREENSHOTS_DIR, folder, filename);
  await page.waitForTimeout(400);
  await page.screenshot({ path: targetPath, fullPage: false });
  console.log(`[SAVED EXTRA] ${folder}/${filename}`);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // Navigate to Documents / Prescriptions
  const docBtn = page.locator('aside button:has-text("Documents")').first();
  await docBtn.click();
  await page.waitForTimeout(600);

  // 18_01_prescriptions_page.png
  await snap(page, '14_prescriptions', '18_01_prescriptions_page.png');
  await snap(page, '14_prescriptions', '18_02_prescription_card.png');

  // Click Delete on a historical prescription
  const deleteBtn = page.locator('button[title*="Delete Document"], button:has-text("Delete")').first();
  if (await deleteBtn.isVisible()) {
    await deleteBtn.click();
    await page.waitForTimeout(400);
    await snap(page, '14_prescriptions', '18_03_delete_prescription_button.png');
    await snap(page, '14_prescriptions', '18_04_delete_confirmation.png');
    
    // Click Delete in modal
    const confirmBtn = page.locator('div[class*="fixed"] button:has-text("Delete")').last();
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
      await page.waitForTimeout(600);
      await snap(page, '14_prescriptions', '18_05_after_delete.png');
    }
  }

  // Name Mismatch YES option capture
  const addBtn = page.locator('aside button:has-text("Add New Patient")').first();
  await addBtn.click();
  await page.waitForTimeout(400);

  await page.fill('input[placeholder*="Priya Sharma"]', 'Test Patient Mismatch');
  await page.fill('input[placeholder*="38"]', '30');
  await page.selectOption('select:has-text("Select Gender")', 'Male');
  await page.selectOption('select:has-text("Select Blood Group")', 'A+');
  await page.click('button:has-text("Next: Upload First Document")');
  await page.waitForTimeout(300);

  const rahulRx = path.join(TEST_DOCS_DIR, 'Rahul_Sharma_Rx.pdf');
  await page.locator('input[type="file"]').last().setInputFiles(rahulRx);
  await page.waitForTimeout(300);
  await page.click('button:has-text("Create Patient & Process Document")');
  await page.waitForTimeout(2500);

  // 03_02_name_mismatch_yes.png
  await snap(page, '03_document_upload', '03_02_name_mismatch_yes.png');

  // Delete patient option
  await page.click('button:has-text("Cancel"), button:has-text("No")').catch(() => {});
  await page.waitForTimeout(300);
  const deletePatBtn = page.locator('aside button[title*="Delete Active Patient Profile"]').first();
  if (await deletePatBtn.isVisible()) {
    await deletePatBtn.click();
    await page.waitForTimeout(400);
    await snap(page, '15_patient_management', '19_01_delete_patient_option.png');
    await snap(page, '15_patient_management', '19_02_delete_confirmation_modal.png');
    await page.click('button:has-text("Cancel")');
    await page.waitForTimeout(300);
  }

  await browser.close();
  console.log('[ALL AUXILIARY CAPTURES COMPLETED FOR ALAMGIR MANDAL]');
}

run().catch(console.error);
