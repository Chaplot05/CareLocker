'use client';

import React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

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
        <h1 className="text-2xl font-black tracking-tight text-[#111111]">{title}</h1>
        {subtitle && <p className="text-xs text-[#6B7280] font-medium mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {showAddPatient && (
          <Link
            href="/patients/new"
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-xl bg-[#111111] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#171417] active:scale-[0.98] transition-all shadow-2xs"
          >
            <Plus className="h-4 w-4 text-[#B7A2DE]" />
            <span>Add Patient</span>
          </Link>
        )}
      </div>
    </header>
  );
}
