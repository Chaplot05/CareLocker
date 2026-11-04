import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local if present
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...rest] = trimmed.split('=');
      process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('--- CareLocker Database Seeder ---');

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
  console.error('\n❌ ERROR: Supabase credentials are missing or placeholder.');
  console.error('Please configure your NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.error('Or execute the SQL migration script directly in Supabase SQL Editor:');
  console.error('👉 supabase/migrations/20261104000001_initial_schema.sql');
  console.error('👉 supabase/seed.sql\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSeed() {
  console.log(`Connecting to Supabase at: ${supabaseUrl}`);

  // 1. Seed Patients
  const patients = [
    {
      patient_code: 'PAT-2026-001',
      name: 'Rajesh Sharma',
      phone: '+91 98201 44521',
      email: 'rajesh.sharma@example.com',
      date_of_birth: '1982-04-12',
    },
    {
      patient_code: 'PAT-2026-002',
      name: 'Priya Iyer',
      phone: '+91 94451 22980',
      email: 'priya.iyer@example.com',
      date_of_birth: '1990-09-25',
    },
    {
      patient_code: 'PAT-2026-003',
      name: 'Vikramaditya Rao',
      phone: '+91 98840 91823',
      email: 'vikram.rao@example.com',
      date_of_birth: '1975-11-03',
    },
    {
      patient_code: 'PAT-2026-004',
      name: 'Sunita Patel',
      phone: '+91 97234 11209',
      email: 'sunita.patel@example.com',
      date_of_birth: '1988-01-19',
    },
    {
      patient_code: 'PAT-2026-005',
      name: 'Arjun Sengupta',
      phone: '+91 98300 76543',
      email: 'arjun.sengupta@example.com',
      date_of_birth: '1995-07-08',
    },
  ];

  console.log('\nSeeding synthetic patients...');
  for (const patient of patients) {
    const { data, error } = await supabase
      .from('patients')
      .upsert(patient, { onConflict: 'patient_code' })
      .select()
      .single();

    if (error) {
      console.warn(`  ⚠️ Could not insert ${patient.patient_code}: ${error.message}`);
    } else {
      console.log(`  ✓ Inserted/Updated: ${data.patient_code} - ${data.name}`);
    }
  }

  // Fetch created patient 1 to link documents
  const { data: p1 } = await supabase
    .from('patients')
    .select('id')
    .eq('patient_code', 'PAT-2026-001')
    .single();

  if (p1) {
    console.log('\nSeeding synthetic documents for PAT-2026-001...');
    const documents = [
      {
        patient_id: p1.id,
        document_name: 'Discharge_Summary_MaxHealthcare.pdf',
        category: 'Discharge Summary',
        file_path: 'patients/PAT-2026-001/Discharge_Summary_MaxHealthcare.pdf',
        file_type: 'application/pdf',
        file_size: 1845200,
      },
      {
        patient_id: p1.id,
        document_name: 'Final_Consolidated_Bill_Breakup.pdf',
        category: 'Hospital Bill',
        file_path: 'patients/PAT-2026-001/Final_Consolidated_Bill_Breakup.pdf',
        file_type: 'application/pdf',
        file_size: 924500,
      },
    ];

    for (const doc of documents) {
      const { data, error } = await supabase.from('documents').insert(doc).select().single();
      if (error) {
        console.warn(`  ⚠️ Could not insert document ${doc.document_name}: ${error.message}`);
      } else {
        console.log(`  ✓ Inserted document: ${data.document_name}`);
      }
    }

    // Seed query letter
    console.log('\nSeeding synthetic query letter and query points...');
    const { data: qLetter, error: qError } = await supabase
      .from('query_letters')
      .insert({
        patient_id: p1.id,
        file_name: 'StarHealth_QueryLetter_Claim_40912.pdf',
        file_path: 'queries/PAT-2026-001/StarHealth_QueryLetter_Claim_40912.pdf',
        status: 'completed',
      })
      .select()
      .single();

    if (qLetter) {
      console.log(`  ✓ Inserted query letter: ${qLetter.file_name}`);
      await supabase.from('query_points').insert([
        {
          query_letter_id: qLetter.id,
          requirement_text: 'Provide complete indoor case papers and operative notes for laparoscopic cholecystectomy.',
          document_category: 'Investigation Reports',
          decision_status: 'missing',
        },
        {
          query_letter_id: qLetter.id,
          requirement_text: 'Itemized pharmacy bill with doctor prescriptions.',
          document_category: 'Pharmacy Bills',
          decision_status: 'missing',
        },
      ]);
      console.log(`  ✓ Inserted query points.`);
    }
  }

  console.log('\n✅ Synthetic seed complete! All records persisted in Supabase.\n');
}

runSeed().catch((err) => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});

