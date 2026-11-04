import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Load .env.local without logging values
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

console.log('=== CareLocker Connectivity & Verification Diagnostic ===\n');

async function runVerification() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  // 1. Check Env Vars Presence
  console.log('1. Environment Variables Audit:');
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY',
    'GEMINI_MODEL',
  ];

  for (const k of required) {
    const val = process.env[k];
    const isPresent = !!val && val.length > 3 && !val.includes('placeholder') && !val.includes('your-');
    console.log(`  - ${k}: ${isPresent ? 'PRESENT & POPULATED' : 'MISSING / EMPTY / PLACEHOLDER'}`);
  }

  // 2. Supabase Connectivity & Table Verification
  console.log('\n2. Supabase Database & Table Check:');
  if (!supabaseUrl || !anonKey) {
    console.log('  ❌ Cannot test Supabase: URL or Anon key missing.');
  } else {
    // Prefer service role key for inspection if provided, else anon key
    const clientToUse = serviceRoleKey && !serviceRoleKey.includes('placeholder')
      ? createClient(supabaseUrl, serviceRoleKey)
      : createClient(supabaseUrl, anonKey);

    const tables = [
      'profiles',
      'patients',
      'documents',
      'query_letters',
      'query_points',
      'messages',
      'audit_logs',
    ];

    for (const t of tables) {
      try {
        const { error, count } = await clientToUse.from(t).select('*', { count: 'exact', head: true });
        if (error) {
          console.log(`  - Table "${t}": ❌ ERROR (${error.message})`);
        } else {
          console.log(`  - Table "${t}": ✓ EXISTS (Row count: ${count ?? 0})`);
        }
      } catch (err: any) {
        console.log(`  - Table "${t}": ❌ EXCEPTION (${err.message})`);
      }
    }

    // 3. Storage Bucket Check
    console.log('\n3. Supabase Storage Bucket Check:');
    try {
      const { data: buckets, error: bucketError } = await clientToUse.storage.listBuckets();
      if (bucketError) {
        console.log(`  ❌ Failed to list buckets: ${bucketError.message}`);
      } else {
        const targetBucket = buckets?.find((b) => b.id === 'patient-documents' || b.name === 'patient-documents');
        if (targetBucket) {
          console.log(`  ✓ Bucket "patient-documents": EXISTS`);
          console.log(`    - Visibility: ${targetBucket.public ? 'PUBLIC (WARNING: Should be private!)' : 'PRIVATE (Correct)'}`);
          console.log(`    - File Size Limit: ${targetBucket.file_size_limit ? `${targetBucket.file_size_limit / (1024 * 1024)}MB` : 'Unlimited'}`);
        } else {
          console.log(`  ❌ Bucket "patient-documents": NOT FOUND. Existing buckets: ${buckets?.map((b) => b.name).join(', ') || 'None'}`);
        }
      }
    } catch (err: any) {
      console.log(`  ❌ Storage check exception: ${err.message}`);
    }
  }

  // 4. Gemini API Connectivity & Model Configuration
  console.log('\n4. Gemini API Connectivity Check:');
  if (!geminiApiKey || geminiApiKey.includes('placeholder') || geminiApiKey.includes('your-')) {
    console.log('  ❌ GEMINI_API_KEY is not set or placeholder.');
  } else {
    const candidateModels = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-3.8-flash', geminiModel];
    const uniqueCandidates = Array.from(new Set(candidateModels));
    let workingModel = null;

    const genAI = new GoogleGenerativeAI(geminiApiKey);

    for (const m of uniqueCandidates) {
      try {
        process.stdout.write(`  Testing model "${m}"... `);
        const model = genAI.getGenerativeModel({ model: m });
        const startTime = Date.now();
        const result = await model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [{ text: 'Respond with exactly: {"status":"ok"}' }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        });
        const response = await result.response;
        const text = response.text();
        const duration = Date.now() - startTime;
        console.log(`✓ SUCCESS (${duration}ms)`);
        console.log(`    Response: ${text.trim()}`);
        workingModel = m;
        break;
      } catch (err: any) {
        console.log(`❌ FAILED: ${err.message}`);
      }
    }

    if (workingModel) {
      console.log(`\n  Recommended working model: "${workingModel}"`);
    } else {
      console.log(`\n  ❌ No candidate model succeeded.`);
    }
  }

  console.log('\n=== Diagnostic Complete ===');
}

runVerification().catch((err) => {
  console.error('Fatal diagnostic error:', err.message);
  process.exit(1);
});
