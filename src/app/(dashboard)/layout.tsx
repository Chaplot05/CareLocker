import React from 'react';
import { redirect } from 'next/navigation';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { UserRole } from '@/types/database';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userEmail = 'staff@carelocker.health';
  let userName = 'Staff Member';
  let userRole: UserRole = 'agent';

  if (isSupabaseServerConfigured()) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect('/login');
    }

    userEmail = user.email || userEmail;
    userName = user.user_metadata?.full_name || userEmail.split('@')[0];

    const { data: profile } = (await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()) as { data: { role?: string; full_name?: string } | null };

    if (profile) {
      if (profile.role === 'admin' || profile.role === 'agent') {
        userRole = profile.role as UserRole;
      }
      if (profile.full_name) userName = profile.full_name;
    }
  }

  return (
    <div className="min-h-screen bg-[#fbfbfe]">
      <Sidebar userEmail={userEmail} userRole={userRole} userName={userName} />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
