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
  const [inviteCodeInput, setInviteCodeInput] = useState('');
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

    // 1. Controllo Nickname
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.username) {
      setNickname(profile.username);
      setHasProfile(true);
    }

    // 2. Recupero Leghe (Query Semplificata e Diretta)
    // Chiediamo: "Dammi tutte le iscrizioni di questo utente, incluse le info sulla lega e i suoi membri"
    const { data: membershipData, error: fetchError } = await supabase
      .from('league_members')
      .select(`
        leagues (
          id,
          name,
          league_members (
            profiles (
              username
            )
          )
        )
      `)
      .eq('user_id', user.id);

    if (fetchError) {
      console.error("Errore recupero leghe:", fetchError);
    } else if (membershipData) {
      // Trasformiamo i dati grezzi in una lista pulita per la UI
      const formatted = membershipData
        .map((m: any) => m.leagues)
        .filter(l => l !== null)
        .map(l => ({
          id: l.id,
          name: l.name,
          members: l.league_members
            .map((member: any) => member.profiles?.username || 'Nuovo Utente')
            .join(', ')
        }));
      setLeagues(formatted);
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
    else { setHasProfile(true); alert("Profilo creato! 🎉"); fetchData(); }
    setSavingNickname(false);
  };

  const createLeague = async () => {
    if (!newLeagueName) return alert("Inserisci un nome!");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const randomInviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data: league, error: lErr } = await supabase
      .from('leagues')
      .insert({ 
        name: newLeagueName, 
        owner_id: user.id,
        invite_code: randomInviteCode
      })
      .select().single();

    if (lErr) return alert("Errore creazione: " + lErr.message);

    if (league) {
      await supabase.from('league_members').insert({ league_id: league.id, user_id: user.id });
      alert(`Lega creata! Mandalo a Emma: ${randomInviteCode}`);
      setNewLeagueName('');
      fetchData();
    }
  };

  const joinLeague = async () => {
    if (!inviteCodeInput.trim()) return alert("Inserisci il codice!");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: league, error: searchError } = await supabase
      .from('leagues')
      .select('id, name')
      .eq('invite_code', inviteCodeInput.toUpperCase())
      .maybeSingle();

    if (searchError || !league) return alert("Codice errato!");

    const { error: joinError } = await supabase
      .from('league_members')
      .insert({ league_id: league.id, user_id: user.id });

    if (joinError) {
      if (joinError.code === '23505') alert("Sei già dentro!");
      else alert("Errore: " + joinError.message);
    } else {
      alert(`Benvenuto nella lega ${league.name}!`);
      setInviteCodeInput('');
      fetchData();
    }
  };

  if (loading) return <div className="p-20 text-center text-white italic">Aggiornamento tabellone... ⚽</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {!hasProfile ? (
        <div className="mb-12 p-8 bg-blue-600 rounded-[2.5rem] shadow-2xl text-white text-center">
          <h2 className="text-2xl font-black uppercase italic mb-4">Chi sei in campo?</h2>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <input 
              type="text" value={nickname} onChange={(e)=>setNickname(e.target.value)}
              className="p-4 bg-white/10 border border-white/20 rounded-xl outline-none text-white font-bold"
              placeholder="Nickname"
            />
            <button onClick={saveNickname} className="px-8 py-4 bg-white text-blue-700 rounded-xl font-black uppercase text-xs">Entra</button>
          </div>
        </div>
      ) : (
        <h1 className="text-4xl md:text-5xl font-black text-white italic uppercase mb-12 text-center md:text-left tracking-tighter">
          Area <span className="text-blue-500">Leghe</span>
        </h1>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* COLONNA SINISTRA: LE MIE LEGHE */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-black uppercase text-slate-500 mb-6 tracking-widest">Le tue Sfide</h2>
          <div className="space-y-4">
            {leagues.length === 0 ? (
              <div className="p-10 border-2 border-dashed border-slate-800 rounded-[2rem] text-center">
                <p className="text-slate-500 text-xs font-bold uppercase">Ancora nessuna lega. Crea o unisciti!</p>
              </div>
            ) : (
              leagues.map(l => (
                <div 
                  key={l.id} 
                  onClick={() => router.push(`/classifica?id=${l.id}`)}
                  className="p-6 bg-slate-800/40 border border-slate-700 rounded-[2rem] cursor-pointer hover:border-blue-500 hover:bg-slate-800 transition-all group"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-black text-white uppercase group-hover:text-blue-400">{l.name}</h3>
                      <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-tight">
                        <span className="text-blue-500">Membri:</span> {l.members}
                      </p>
                    </div>
                    <div className="text-blue-500 group-hover:translate-x-1 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLONNA DESTRA: AZIONI */}
        <div className="lg:col-span-2 space-y-6">
          {/* UNISCITI */}
          <div className="p-8 bg-slate-900 border border-slate-800 rounded-[2.5rem]">
            <h2 className="text-lg font-black uppercase text-white mb-4 italic">Hai un codice?</h2>
            <div className="flex gap-3">
              <input 
                type="text" value={inviteCodeInput} onChange={(e)=>setInviteCodeInput(e.target.value)}
                placeholder="CODICE"
                className="flex-1 p-4 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold outline-none uppercase"
              />
              <button onClick={joinLeague} className="px-6 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-black uppercase text-[10px]">Entra</button>
            </div>
          </div>

          {/* CREA */}
          <div className="p-8 bg-slate-900 border border-slate-800 rounded-[2.5rem]">
            <h2 className="text-lg font-black uppercase text-white mb-4 italic">Crea nuova sfida</h2>
            <div className="flex gap-3">
              <input 
                type="text" value={newLeagueName} onChange={(e)=>setNewLeagueName(e.target.value)}
                placeholder="NOME LEGA"
                className="flex-1 p-4 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold outline-none"
              />
              <button onClick={createLeague} className="px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase text-[10px]">Crea</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}