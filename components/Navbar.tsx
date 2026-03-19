'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-slate-800 border-b border-slate-700 sticky top-0 z-50 shadow-lg">
      <Link href="/" className="text-2xl font-black tracking-tighter">
        WC<span className="text-blue-500">2026</span>
      </Link>
      
      <div className="flex gap-6 items-center">
        {/* LINK ALLE PAGINE */}
        <Link href="/" className="text-sm font-medium text-slate-400 hover:text-white transition">
          Partite
        </Link>
        
        <Link href="/pronostici" className="text-sm font-medium text-slate-400 hover:text-blue-400 transition flex items-center gap-1">
          🎯 Pronostici
        </Link>

        {/* LINK RINOMINATO */}
        <Link href="/previsioni" className="text-sm font-medium text-slate-400 hover:text-yellow-400 transition flex items-center gap-1">
          📝 Le mie previsioni
        </Link>
        
        <Link href="/lega" className="text-sm font-medium text-slate-400 hover:text-green-400 transition flex items-center gap-1">
          🤝 Lega
        </Link>

        <Link href="/live" className="text-sm font-medium text-red-500 hover:text-red-400 flex items-center gap-1 transition">
          <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
          LIVE
        </Link>
        
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-700">
              {user.email}
            </span>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-lg text-xs font-bold uppercase transition-all border border-red-600/20"
            >
              Esci
            </button>
          </div>
        ) : (
          <Link 
            href="/login" 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-blue-900/40"
          >
            Accedi
          </Link>
        )}
      </div>
    </nav>
  );
}