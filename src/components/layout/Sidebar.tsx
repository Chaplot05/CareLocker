'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FolderLock,
  Settings,
  LogOut,
  ShieldCheck,
  UserCheck,
  ChevronRight,
  Menu,
  X,
  FileSearch,
} from 'lucide-react';
import { UserRole } from '@/types/database';

interface SidebarProps {
  userEmail?: string;
  userRole?: UserRole;
  userName?: string;
}

export function Sidebar({
  userEmail = 'staff@carelocker.health',
  userRole = 'agent',
  userName = 'Care Staff',
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Patients Directory', href: '/patients', icon: Users },
    { name: 'Settings & Security', href: '/settings', icon: Settings },
  ];

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between p-4 bg-white border-r border-slate-200">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-3 py-4 border-b border-slate-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-lavender-600 to-peach-500 text-white shadow-md shadow-lavender-500/20">
            <FolderLock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-slate-900">CareLocker</span>
              <span className="rounded bg-lavender-100 px-1.5 py-0.5 text-[10px] font-semibold text-lavender-800 uppercase tracking-wider">
                Stage 1
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Healthcare SaaS</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="mt-6 space-y-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch={false}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-lavender-100/80 text-lavender-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 ${
                      isActive ? 'text-lavender-700' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {isActive && (
                  <div className="h-1.5 w-1.5 rounded-full bg-peach-500" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Info & Sign Out Footer */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <div className="rounded-xl bg-slate-50/80 p-3 border border-slate-200/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-lavender-200 text-xs font-bold text-lavender-800">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-800 truncate">{userName}</p>
                <p className="text-[11px] text-slate-400 truncate">{userEmail}</p>
              </div>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-200/50">
            <span className="text-[11px] text-slate-500 font-medium">Role</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                userRole === 'admin'
                  ? 'bg-peach-100 text-peach-700 border border-peach-200'
                  : 'bg-lavender-100 text-lavender-800 border border-lavender-200'
              }`}
            >
              {userRole}
            </span>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          disabled={isLoggingOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors border border-transparent hover:border-red-100"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Bar Toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-lavender-600 to-peach-500 text-white">
            <FolderLock className="h-4 w-4" />
          </div>
          <span className="font-bold text-slate-900">CareLocker</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 pt-14">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative h-full w-72 bg-white shadow-xl">
            {navContent}
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30">
        {navContent}
      </aside>
    </>
  );
}

