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

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.username) {
      setNickname(profile.username);
      setHasProfile(true);
    }

    const { data: myLeaguesData } = await supabase
      .from('league_members')
      .select('league_id')
      .eq('user_id', user.id);

    if (myLeaguesData && myLeaguesData.length > 0) {
      const leagueIds = myLeaguesData.map(m => m.league_id);
      const { data: fullLeagues } = await supabase
        .from('leagues')
        .select(`
          id, 
          name,
          league_members (
            profiles (username)
          )
        `)
        .in('id', leagueIds);

      if (fullLeagues) {
        const formatted = fullLeagues.map(l => ({
          id: l.id,
          name: l.name,
          members: (l.league_members as any[])
            .map(m => m.profiles?.username || 'Nuovo Utente')
            .join(', ')
        }));
        setLeagues(formatted);
      }
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

    if (lErr) return alert("Errore: " + lErr.message);

    if (league) {
      await supabase.from('league_members').insert({ league_id: league.id, user_id: user.id });
      alert(`Lega creata! Codice per Emma: ${randomInviteCode}`);
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

    if (searchError || !league) return alert("Codice errato o lega inesistente!");

    const { error: joinError } = await supabase
      .from('league_members')
      .insert({ league_id: league.id, user_id: user.id });

    if (joinError) {
      if (joinError.code === '23505') alert("Fai già parte di questa lega!");
      else alert("Errore durante l'adesione: " + joinError.message);
    } else {
      alert(`Ti sei unito alla lega: ${league.name}! 🏆`);
      setInviteCodeInput('');
      fetchData();
    }
  };

  if (loading) return <div className="p-20 text-center text-white italic">Preparazione campo... ⚽</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {!hasProfile ? (
        <div className="mb-12 p-10 bg-blue-600 rounded-[3rem] shadow-2xl text-white text-center">
          <h2 className="text-3xl font-black uppercase italic mb-4">Benvenuto nel Club!</h2>
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
            <input 
              type="text" value={nickname} onChange={(e)=>setNickname(e.target.value)}
              className="w-full md:w-80 p-5 bg-white/10 border border-white/20 rounded-2xl outline-none text-white font-bold"
              placeholder="Scegli Nickname"
            />
            <button onClick={saveNickname} className="px-10 py-5 bg-white text-blue-700 rounded-2xl font-black uppercase text-sm">Salva</button>
          </div>
        </div>
      ) : (
        <h1 className="text-5xl font-black text-white italic uppercase mb-16 text-center md:text-left">Area Leghe</h1>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-black uppercase text-white mb-6 italic">Le tue Sfide</h2>
          <div className="grid gap-4">
            {leagues.length === 0 ? (
              <p className="text-slate-500 italic p-8 border border-slate-800 rounded-3xl">Nessuna lega.</p>
            ) : (
              leagues.map(l => (
                <div key={l.id} onClick={() => router.push(`/classifica?id=${l.id}`)} className="p-6 bg-slate-800/50 border border-slate-700 rounded-[2rem] cursor-pointer hover:border-blue-500 transition-all shadow-lg group">
                  <h3 className="text-xl font-black text-white uppercase group-hover:text-blue-400">{l.name}</h3>
                  <p className="text-slate-400 text-[10px] mt-2 font-bold uppercase tracking-widest"><span className="text-blue-500">Membri:</span> {l.members}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className="p-8 bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-xl">
            <h2 className="text-xl font-black uppercase text-white mb-4 italic">Unisciti a una Lega</h2>
            <div className="flex gap-3">
              <input 
                type="text" value={inviteCodeInput} onChange={(e)=>setInviteCodeInput(e.target.value)}
                placeholder="Inserisci Codice"
                className="flex-1 p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold outline-none uppercase"
              />
              <button onClick={joinLeague} className="px-6 py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black uppercase text-xs transition-all">Entra</button>
            </div>
          </div>

          <div className="p-8 bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-xl">
            <h2 className="text-xl font-black uppercase text-white mb-4 italic">Crea Nuova</h2>
            <div className="flex gap-3">
              <input 
                type="text" value={newLeagueName} onChange={(e)=>setNewLeagueName(e.target.value)}
                placeholder="Nome Lega"
                className="flex-1 p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold outline-none"
              />
              <button onClick={createLeague} className="px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-xs transition-all">Crea</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}