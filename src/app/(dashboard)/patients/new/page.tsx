import React from 'react';
import { Header } from '@/components/layout/Header';
import { PatientForm } from '@/components/patients/PatientForm';

export default function NewPatientPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Header
        title="Register New Patient"
        subtitle="Create a new patient identity and establish their private document locker."
        showAddPatient={false}
      />

      <PatientForm />
    </div>
  );
}

