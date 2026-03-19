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

    // 1. Controllo se l'utente ha un Nickname
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    if (profile?.username) {
      setNickname(profile.username);
      setHasProfile(true);
    }

    // 2. Recupero le Leghe dell'utente
    const { data: memberData } = await supabase
      .from('league_members')
      .select('league_id, leagues(id, name)')
      .eq('user_id', user.id);

    if (memberData) {
      setLeagues(memberData.map((m: any) => m.leagues));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveNickname = async () => {
    if (!nickname.trim()) return alert("Inserisci un nickname valido!");
    setSavingNickname(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user?.id, username: nickname });

    if (error) {
      alert("Errore: il nickname potrebbe essere già preso.");
    } else {
      setHasProfile(true);
      alert("Nickname salvato! Ora apparirai in classifica.");
    }
    setSavingNickname(false);
  };

  const createLeague = async () => {
    if (!newLeagueName) return;
    const { data: { user } } = await supabase.auth.getUser();
    
    // Creazione Lega
    const { data: league, error } = await supabase
      .from('leagues')
      .insert({ name: newLeagueName, owner_id: user?.id })
      .select()
      .single();

    if (league) {
      // Autoiscrizione come proprietario
      await supabase.from('league_members').insert({
        league_id: league.id,
        user_id: user?.id
      });
      setNewLeagueName('');
      fetchData();
    }
  };

  if (loading) return <div className="p-20 text-center text-white">Caricamento...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* SEZIONE NICKNAME - APPARE SOLO SE NON CE L'HAI */}
      {!hasProfile ? (
        <div className="mb-12 p-8 bg-blue-600 rounded-[2rem] shadow-2xl text-white">
          <h2 className="text-2xl font-black uppercase italic mb-2">Benvenuto in Campo! 🏟️</h2>
          <p className="text-blue-100 text-sm mb-6">Prima di iniziare, scegli il nome che tutti vedranno in classifica.</p>
          <div className="flex gap-4">
            <input 
              type="text" 
              placeholder="Esempio: Matteo_98"
              className="flex-1 p-4 bg-white/10 border border-white/20 rounded-2xl outline-none focus:bg-white/20 transition-all font-bold placeholder:text-white/40"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <button 
              onClick={saveNickname}
              disabled={savingNickname}
              className="px-8 py-4 bg-white text-blue-600 rounded-2xl font-black uppercase text-xs hover:scale-105 transition-transform disabled:opacity-50"
            >
              {savingNickname ? 'Salvataggio...' : 'Inizia la sfida'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-12">
          <p className="text-slate-500 uppercase font-black text-[10px] tracking-widest mb-1">Il tuo profilo</p>
          <h1 className="text-4xl font-black text-white italic">Ciao, <span className="text-blue-500">{nickname}</span>! ⚽</h1>
        </div>
      )}

      {/* SEZIONE LEGHE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* LE MIE LEGHE */}
        <div>
          <h2 className="text-xl font-black uppercase text-white mb-6">Le tue Leghe</h2>
          {leagues.length === 0 ? (
            <p className="text-slate-500 text-sm italic">Non sei ancora in nessuna lega.</p>
          ) : (
            <div className="space-y-4">
              {leagues.map(l => (
                <div key={l.id} className="p-6 bg-slate-800 border border-slate-700 rounded-3xl flex justify-between items-center group hover:border-blue-500 transition-all shadow-xl">
                  <span className="font-bold text-white uppercase">{l.name}</span>
                  <button 
                    onClick={() => router.push(`/classifica?id=${l.id}`)}
                    className="p-3 bg-slate-900 text-blue-400 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all"
                  >
                    Classifica
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CREA LEGA */}
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-[2.5rem]">
          <h2 className="text-xl font-black uppercase text-white mb-2">Crea Lega</h2>
          <p className="text-slate-500 text-xs mb-6 font-bold uppercase">Sfida i tuoi amici</p>
          <input 
            type="text" 
            placeholder="Nome della Lega"
            className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white mb-4 outline-none focus:border-blue-500 transition-all"
            value={newLeagueName}
            onChange={(e) => setNewLeagueName(e.target.value)}
          />
          <button 
            onClick={createLeague}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-900/40"
          >
            Crea ora
          </button>
        </div>
      </div>
    </div>
  );
}