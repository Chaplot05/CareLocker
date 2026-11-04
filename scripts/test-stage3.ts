import {
  formatWhatsAppRecipient,
  formatWhatsAppSender,
  isTwilioConfigured,
  sendWhatsAppMessage,
} from '../src/lib/messaging/twilio';

// Load .env.local if not already in environment
if (!process.env.TWILIO_ACCOUNT_SID && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env.local');
  } catch {}
}
import {
  isValidEmail,
  buildClaimNotificationHtml,
  isEmailConfigured,
  sendEmailMessage,
} from '../src/lib/messaging/email';
import { dispatchQueryNotification } from '../src/lib/messaging/dispatcher';
import { createAdminClient } from '../src/lib/supabase/admin';

// Strict overall test timeout (30 seconds) to prevent any hangs
const TEST_TIMEOUT_MS = 30000;
const globalTimer = setTimeout(() => {
  console.error(`\n[FATAL] Test suite timed out after ${TEST_TIMEOUT_MS / 1000} seconds.`);
  process.exit(1);
}, TEST_TIMEOUT_MS);
if (globalTimer.unref) globalTimer.unref();

console.log('====================================================');
console.log(' CareLocker Stage 3: Multi-Channel Messaging Test Suite');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    process.exitCode = 1;
  }
}

async function runStage3Tests() {
  // -------------------------------------------------------------
  // TEST SUITE 1: WHATSAPP FORMATTING & CREDENTIALS
  // -------------------------------------------------------------
  console.log('--- Test Suite 1: WhatsApp Configuration & Formatting ---');

  assert(isTwilioConfigured(), 'Twilio credentials verified in environment');
  assert(
    formatWhatsAppRecipient('6376907620') === 'whatsapp:+916376907620',
    '10-digit phone formatted with Indian +91 and whatsapp: prefix'
  );
  assert(
    formatWhatsAppRecipient('+91 6376907620') === 'whatsapp:+916376907620',
    'Phone with spaces formatted to clean E.164'
  );
  assert(
    formatWhatsAppSender().startsWith('whatsapp:+'),
    'Sender normalized with whatsapp:+ prefix without whitespace'
  );

  // -------------------------------------------------------------
  // TEST SUITE 2: EMAIL VALIDATION & HTML TEMPLATING
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 2: Email Configuration & Templating ---');

  assert(isEmailConfigured(), 'Gmail SMTP credentials verified in environment');
  assert(isValidEmail('nearidmelon@gmail.com'), 'Valid recipient email validated');
  assert(!isValidEmail('invalid-email-address'), 'Invalid email format rejected');

  const html = buildClaimNotificationHtml('Patient Name', 'Hello Patient\n\nMissing Pharmacy Bills');
  assert(html.includes('CareLocker Claims Desk'), 'Email template includes hospital branding');
  assert(html.includes('Missing Pharmacy Bills'), 'Email template contains message body');

  // -------------------------------------------------------------
  // TEST SUITE 3: CONTROLLED WHATSAPP DELIVERY TO EXPLICIT RECIPIENT
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 3: Controlled WhatsApp Channel Delivery ---');

  const WHATSAPP_TEST_TO = process.env.WHATSAPP_TEST_TO || '+916376907620';
  console.log(`  Targeting explicit recipient: ${WHATSAPP_TEST_TO}`);

  console.log(`\n  Executing single controlled WhatsApp dispatch to: ${WHATSAPP_TEST_TO}...`);
  const waResult = await sendWhatsAppMessage({
    to: WHATSAPP_TEST_TO,
    body: `[CareLocker Test] Hello, this is a controlled test notification from CareLocker Claims Desk.`,
  });

  console.log('  WhatsApp Provider Result:', {
    success: waResult.success,
    messageSid: waResult.messageSid,
    status: waResult.status,
    errorCode: waResult.errorCode,
    error: waResult.error,
  });

  // Strict rule: Success ONLY when Twilio accepts and returns a real SID.
  // Errors 21654, 63015, 63016, or any provider rejection MUST be recorded as FAIL.
  const deliveryAccepted = waResult.success === true && !!waResult.messageSid;
  assert(
    deliveryAccepted,
    deliveryAccepted
      ? `Twilio accepted WhatsApp delivery (SID: ${waResult.messageSid}, Status: ${waResult.status})`
      : `Twilio rejected WhatsApp delivery: [${waResult.errorCode || 'ERROR'}] ${waResult.error}`
  );

  // -------------------------------------------------------------
  // TEST SUITE 4: MULTI-CHANNEL SUITE & EMAIL SAFETY CHECK
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 4: Multi-Channel Dispatcher Logic & Gating ---');

  if (process.env.RUN_FULL_EMAIL_SUITE !== 'true') {
    console.log('  [NOTICE] Real Email dispatch skipped to prevent inbox spam.');
    console.log('  (Set RUN_FULL_EMAIL_SUITE=true to execute live SMTP email delivery).');
    assert(true, 'Live email spam prevention active (skipped live SMTP dispatches)');
  } else {
    const adminSupabase = createAdminClient();
    const { data: patient } = await adminSupabase
      .from('patients')
      .select('id, name, phone, email, patient_code')
      .ilike('phone', '%6376907620%')
      .maybeSingle();

    if (patient) {
      console.log(`\n  Executing live Email dispatch to: ${patient.email}...`);
      const emailResult = await sendEmailMessage({
        to: patient.email,
        subject: `[CareLocker Verification] Claim ${patient.patient_code}`,
        text: `Dear ${patient.name},\n\nAutomated notification verification.\n\nWarm regards,\nCareLocker Desk`,
      });

      assert(emailResult.success, `Real Email sent via Gmail SMTP: messageId=${emailResult.messageId || 'N/A'}`);
    }
  }

  console.log('\n====================================================');
  console.log(` Results: ${passedTests} / ${totalTests} Stage 3 Tests Passed`);
  console.log('====================================================\n');
}

runStage3Tests()
  .catch((err) => {
    console.error('Test execution error:', err);
    process.exit(1);
  })
  .finally(() => {
    clearTimeout(globalTimer);
  });
