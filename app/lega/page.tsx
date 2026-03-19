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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 1. Controllo Profilo
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.username) {
        setNickname(profile.username);
        setHasProfile(true);
      }

      // 2. Recupero Iscrizioni
      const { data: memberships } = await supabase
        .from('league_members')
        .select('league_id')
        .eq('user_id', user.id);

      if (memberships && memberships.length > 0) {
        const leagueIds = memberships.map(m => m.league_id);

        const { data: leaguesData } = await supabase
          .from('leagues')
          .select(`
            id, 
            name,
            league_members (
              profiles (username)
            )
          `)
          .in('id', leagueIds);

        if (leaguesData) {
          const formatted = leaguesData.map(l => ({
            id: l.id,
            name: l.name,
            members: l.league_members
              ? (l.league_members as any[])
                  .map(m => m.profiles?.username || 'Nuovo Utente')
                  .join(', ')
              : 'Solo tu'
          }));
          setLeagues(formatted);
        }
      } else {
        setLeagues([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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

    if (lErr) return alert("Errore: " + lErr.message);

    if (league) {
      await supabase.from('league_members').insert({ league_id: league.id, user_id: user.id });
      alert("Lega creata!");
      setNewLeagueName('');
      fetchData();
    }
  };

  const joinLeague = async () => {
    if (!inviteCodeInput.trim()) return alert("Inserisci il codice!");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: league } = await supabase
      .from('leagues')
      .select('id, name')
      .eq('invite_code', inviteCodeInput.toUpperCase())
      .maybeSingle();

    if (!league) return alert("Codice errato!");

    const { error: joinError } = await supabase
      .from('league_members')
      .insert({ league_id: league.id, user_id: user.id });

    if (joinError) alert("Sei già membro o errore DB.");
    else { alert("Benvenuto!"); setInviteCodeInput(''); fetchData(); }
  };

  if (loading) return <div className="p-20 text-center text-white italic">Caricamento...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {!hasProfile ? (
        <div className="mb-12 p-8 bg-blue-600 rounded-[2rem] shadow-2xl text-white text-center">
          <h2 className="text-2xl font-black uppercase italic mb-4">Scegli il tuo Nickname</h2>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <input 
              type="text" value={nickname} onChange={(e)=>setNickname(e.target.value)}
              className="p-4 bg-white/10 border border-white/20 rounded-xl outline-none text-white font-bold"
              placeholder="Nickname"
            />
            <button onClick={saveNickname} className="px-8 py-4 bg-white text-blue-700 rounded-xl font-black uppercase text-xs">Salva</button>
          </div>
        </div>
      ) : (
        <h1 className="text-4xl font-black text-white italic uppercase mb-12 text-center md:text-left tracking-tighter">
          Area <span className="text-blue-500">Leghe</span>
        </h1>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-sm font-black uppercase text-slate-500 mb-6 tracking-widest">Le tue Sfide</h2>
          <div className="space-y-4">
            {leagues.length === 0 ? (
              <div className="p-10 border-2 border-dashed border-slate-800 rounded-[2rem] text-center">
                <p className="text-slate-500 text-xs font-bold uppercase">Nessuna lega trovata.</p>
              </div>
            ) : (
              leagues.map(l => (
                <div 
                  key={l.id} 
                  onClick={() => router.push(`/classifica?id=${l.id}`)}
                  className="p-6 bg-slate-800/40 border border-slate-700 rounded-[2rem] cursor-pointer hover:border-blue-500 transition-all group"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-black text-white uppercase group-hover:text-blue-400">{l.name}</h3>
                      <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase">
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

        <div className="lg:col-span-2 space-y-6">
          <div className="p-8 bg-slate-900 border border-slate-800 rounded-[2.5rem]">
            <h2 className="text-lg font-black uppercase text-white mb-4 italic">Unisciti</h2>
            <div className="flex gap-3">
              <input 
                type="text" value={inviteCodeInput} onChange={(e)=>setInviteCodeInput(e.target.value)}
                placeholder="CODICE"
                className="flex-1 p-4 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold outline-none uppercase"
              />
              <button onClick={joinLeague} className="px-6 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-black uppercase text-[10px]">Entra</button>
            </div>
          </div>

          <div className="p-8 bg-slate-900 border border-slate-800 rounded-[2.5rem]">
            <h2 className="text-lg font-black uppercase text-white mb-4 italic">Crea Nuova</h2>
            <div className="flex gap-3">
              <input 
                type="text" value={newLeagueName} onChange={(e)=>setNewLeagueName(e.target.value)}
                placeholder="NOME"
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