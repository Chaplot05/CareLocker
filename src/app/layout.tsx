import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Care.locker | Patient Document & Query Management',
  description: 'Enterprise healthcare document management and insurance query automation platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full bg-[#fbfbfe] text-slate-800 font-sans selection:bg-lavender-200 selection:text-lavender-900">
        {children}
      </body>
    </html>
  );
}

