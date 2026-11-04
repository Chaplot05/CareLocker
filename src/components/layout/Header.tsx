'use client';

import React from 'react';
import Link from 'next/link';
import { Plus, Database, Shield } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showAddPatient?: boolean;
}

export function Header({
  title,
  subtitle,
  showAddPatient = true,
}: HeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 pt-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {showAddPatient && (
          <Link
            href="/patients/new"
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-xl bg-peach-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-peach-600 active:scale-[0.98] transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add Patient</span>
          </Link>
        )}
      </div>
    </header>
  );
}

