'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Users,
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  FolderLock,
  Sparkles,
} from 'lucide-react';
import { UserRole } from '@/types/database';

interface SidebarProps {
  userEmail: string;
  userRole: UserRole;
  userName: string;
}

export function Sidebar({ userEmail, userRole, userName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navigation = [
    {
      name: 'Overview',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Patient Lockers',
      href: '/patients',
      icon: Users,
    },
    {
      name: 'System Settings',
      href: '/settings',
      icon: Settings,
    },
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
    <div className="flex h-full flex-col justify-between p-4 bg-white border-r border-[#E7E3EF]">
      <div>
        {/* Care.locker Brand Header */}
        <div className="flex items-center gap-3 px-3 py-4 border-b border-[#E7E3EF]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7956B5] text-white shadow-2xs shrink-0">
            <span className="text-base font-black tracking-tight">cl</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-[#111111]">Care.locker</span>
            </div>
            <p className="text-[10px] text-[#7956B5] font-bold tracking-wider uppercase">
              Claims & Document Vault
            </p>
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
                    ? 'bg-[#F2EEFA] text-[#7956B5] font-bold border border-[#E7E3EF]'
                    : 'text-[#6B7280] hover:bg-[#F2EEFA]/50 hover:text-[#111111]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 ${
                      isActive ? 'text-[#7956B5]' : 'text-[#6B7280]'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {isActive && (
                  <div className="h-1.5 w-1.5 rounded-full bg-[#7956B5]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Info & Sign Out Footer */}
      <div className="space-y-3 pt-4 border-t border-[#E7E3EF]">
        <div className="rounded-xl bg-[#F2EEFA]/60 p-3 border border-[#E7E3EF]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7956B5] text-xs font-bold text-white shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-[#111111] truncate">{userName}</p>
                <p className="text-[11px] text-[#6B7280] truncate">{userEmail}</p>
              </div>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-[#E7E3EF]">
            <span className="text-[11px] text-[#6B7280] font-medium">Role</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                userRole === 'admin'
                  ? 'bg-[#111111] text-white'
                  : 'bg-[#7956B5] text-white'
              }`}
            >
              {userRole}
            </span>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          disabled={isLoggingOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#6B7280] hover:bg-red-50 hover:text-red-700 transition-colors border border-transparent hover:border-red-100"
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
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-[#E7E3EF] bg-white px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7956B5] text-white font-black text-sm">
            cl
          </div>
          <div>
            <span className="font-extrabold text-[#111111] text-sm block">Care.locker</span>
            <span className="text-[10px] text-[#7956B5] font-bold block -mt-1 uppercase tracking-wider">Claims Desk</span>
          </div>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="rounded-lg p-2 text-[#6B7280] hover:bg-[#F2EEFA]"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 pt-14">
          <div
            className="fixed inset-0 bg-[#111111]/40 backdrop-blur-xs"
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
