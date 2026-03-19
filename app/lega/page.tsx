'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LegaPage() {
  const [leagues, setLeagues] = useState<any[]>([]);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState('');
  const [hasProfile, setHasProfile] = useState(false);
  const [savingNickname, setSavingNickname] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    if (profile?.username) {
      setNickname(profile.username);
      setHasProfile(true);
    }

    const { data: memberData } = await supabase
      .from('league_members')
      .select('league_id, leagues(id, name)')
      .eq('user_id', user.id);

    if (memberData) {
      setLeagues(memberData.map((m: any) => m.leagues).filter(l => l !== null));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveNickname = async () => {
    if (!nickname.trim()) return alert("Inserisci un nickname!");
    setSavingNickname(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('profiles').upsert({ id: user?.id, username: nickname });
    
    if (error) alert("Errore: Nickname già preso.");
    else { setHasProfile(true); alert("Profilo creato! 🎉"); }
    setSavingNickname(false);
  };

  const createLeague = async () => {
    if (!newLeagueName) return alert("Inserisci un nome!");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // GENERATORE CODICE INVITO (Es: 'WK9S2P')
    const randomInviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // CREAZIONE LEGA
    const { data: league, error: lErr } = await supabase
      .from('leagues')
      .insert({ 
        name: newLeagueName, 
        owner_id: user.id,
        invite_code: randomInviteCode // <--- QUESTO RISOLVE IL BUG
      })
      .select()
      .single();

    if (lErr) return alert("Errore DB: " + lErr.message);

    if (league) {
      await supabase.from('league_members').insert({
        league_id: league.id,
        user_id: user.id
      });
      alert(`Lega '${newLeagueName}' creata! Codice invito: ${randomInviteCode}`);
      setNewLeagueName('');
      fetchData();
    }
  };

  if (loading) return <div className="p-20 text-center text-white italic">Connessione stadio... 🏟️</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {!hasProfile ? (
        <div className="mb-12 p-8 bg-blue-600 rounded-[2rem] shadow-2xl text-white text-center">
          <h2 className="text-2xl font-black uppercase italic mb-2">Benvenuto!</h2>
          <div className="flex gap-4 mt-6 justify-center">
            <input 
              type="text" value={nickname} onChange={(e)=>setNickname(e.target.value)}
              className="w-64 p-4 bg-white/10 border border-white/20 rounded-2xl outline-none text-white font-bold"
              placeholder="Scegli il tuo Nickname"
            />
            <button onClick={saveNickname} className="px-8 py-4 bg-white text-blue-600 rounded-2xl font-black uppercase text-xs hover:scale-105 transition-transform">Salva</button>
          </div>
        </div>
      ) : (
        <h1 className="text-4xl font-black text-white italic mb-12 uppercase tracking-tighter">Ciao, <span className="text-blue-500">{nickname}</span></h1>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-xl font-black uppercase text-white mb-6">Le tue Leghe</h2>
          {leagues.length === 0 ? (
            <p className="text-slate-500 italic">Nessuna lega trovata.</p>
          ) : (
            <div className="space-y-4">
              {leagues.map(l => (
                <div key={l.id} className="p-6 bg-slate-800 border border-slate-700 rounded-3xl flex justify-between items-center shadow-xl">
                  <span className="font-bold text-white uppercase">{l.name}</span>
                  <button onClick={() => router.push(`/classifica?id=${l.id}`)} className="p-3 bg-slate-900 text-blue-400 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all">Classifica</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-900 border border-slate-800 rounded-[2.5rem]">
          <h2 className="text-xl font-black uppercase text-white mb-6 tracking-tighter">Nuova Lega</h2>
          <input 
            type="text" value={newLeagueName} onChange={(e)=>setNewLeagueName(e.target.value)}
            placeholder="Nome della Lega"
            className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white mb-4 outline-none focus:border-blue-500"
          />
          <button onClick={createLeague} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all">Crea ora</button>
        </div>
      </div>
    </div>
  );
}