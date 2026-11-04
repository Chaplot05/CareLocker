'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { PatientForm } from '@/components/patients/PatientForm';
import { Loader2 } from 'lucide-react';

export default function EditPatientPage() {
  const params = useParams();
  const id = params?.id as string;
  const [patient, setPatient] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/patients/${id}`);
        const data = await res.json();
        if (res.ok) {
          setPatient(data.patient);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-peach-500" />
        <p className="text-xs text-slate-400">Loading patient details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Header
        title="Edit Patient Details"
        subtitle={`Updating information for ${patient?.name || 'patient'} (${patient?.patient_code || ''})`}
        showAddPatient={false}
      />

      <PatientForm initialData={patient} isEditing={true} />
    </div>
  );
}

