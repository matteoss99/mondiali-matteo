'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nicknameInput, setNicknameInput] = useState('');
  const [leagueNameInput, setLeagueNameInput] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const router = useRouter();

  const loadAllData = async () => {
    setLoading(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      router.push('/login');
      return;
    }
    setUser(authUser);

    // 1. Carica Profilo
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();
    setProfile(prof);
    if (prof) setNicknameInput(prof.username);

    // 2. Carica Leghe (Logica semplificata)
    const { data: memberships } = await supabase
      .from('league_members')
      .select('league_id, leagues(*)')
      .eq('user_id', authUser.id);

    if (memberships) {
      setLeagues(memberships.map(m => m.leagues).filter(l => l !== null));
    }
    setLoading(false);
  };

  useEffect(() => { loadAllData(); }, []);

  const handleSaveProfile = async () => {
    if (!nicknameInput.trim()) return alert("Inserisci un nome!");
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, username: nicknameInput });
    
    if (error) alert("Errore profilo: " + error.message);
    else loadAllData();
  };

  const handleCreateLeague = async () => {
    if (!leagueNameInput.trim()) return alert("Nome lega mancante!");
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { data: newLega, error } = await supabase
      .from('leagues')
      .insert({ name: leagueNameInput, owner_id: user.id, invite_code: inviteCode })
      .select().single();

    if (newLega) {
      await supabase.from('league_members').insert({ league_id: newLega.id, user_id: user.id });
      setLeagueNameInput('');
      loadAllData();
      alert(`Lega creata! Il codice invito è: ${inviteCode}`);
    } else {
      alert("Errore creazione: " + error?.message);
    }
  };

  const handleJoinLeague = async () => {
    const { data: lega } = await supabase
      .from('leagues')
      .select('*')
      .eq('invite_code', joinCodeInput.toUpperCase())
      .maybeSingle();

    if (!lega) return alert("Codice non valido!");

    const { error } = await supabase
      .from('league_members')
      .insert({ league_id: lega.id, user_id: user.id });

    if (error) alert("Sei già in questa lega!");
    else { setJoinCodeInput(''); loadAllData(); }
  };

  if (loading) return <div className="p-20 text-center text-white italic">Sincronizzazione Dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-10">
      
      {/* HEADER: PROFILO */}
      <div className="max-w-6xl mx-auto mb-12 flex flex-col md:flex-row justify-between items-center bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
        <div className="flex items-center gap-6 mb-6 md:mb-0">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-3xl shadow-lg shadow-blue-900/40">
            {profile?.username?.charAt(0).toUpperCase() || '⚽'}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Il tuo Account</p>
            <input 
              className="bg-transparent text-3xl font-black italic uppercase outline-none focus:text-blue-400 transition-colors w-full"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              onBlur={handleSaveProfile}
              placeholder="Scegli Nickname"
            />
          </div>
        </div>
        <div className="flex gap-4">
           <button onClick={() => router.push('/partite')} className="px-6 py-3 bg-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">Pronostici</button>
           <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="px-6 py-3 bg-red-900/30 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest">Esci</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* COLONNA 1: LE MIE LEGHE */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-black uppercase italic mb-8 flex items-center gap-4">
            <span className="w-10 h-1 bg-blue-500"></span> Le tue Leghe
          </h2>
          <div className="grid gap-4">
            {leagues.length === 0 ? (
              <div className="p-10 border-2 border-dashed border-slate-800 rounded-[2.5rem] text-center text-slate-600 font-bold uppercase text-xs">Nessuna sfida attiva</div>
            ) : (
              leagues.map(l => (
                <div key={l.id} className="p-8 bg-slate-900 border border-slate-800 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-blue-500 transition-all">
                  <div>
                    <h3 className="text-2xl font-black uppercase italic group-hover:text-blue-400 transition-colors">{l.name}</h3>
                    <p className="text-[10px] font-black text-slate-500 mt-2 tracking-widest uppercase">
                      Codice Invito: <span className="text-green-500 select-all">{l.invite_code}</span>
                    </p>
                  </div>
                  <button 
                    onClick={() => router.push(`/classifica?id=${l.id}`)}
                    className="w-full md:w-auto px-8 py-4 bg-blue-600 rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-900/40 hover:scale-105 transition-transform"
                  >
                    Classifica
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLONNA 2: AZIONI */}
        <div className="space-y-6">
          <div className="p-8 bg-slate-900 border border-slate-800 rounded-[2.5rem]">
            <h3 className="text-lg font-black uppercase italic mb-6">Unisciti</h3>
            <div className="space-y-4">
              <input 
                className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none focus:border-green-500 uppercase font-bold"
                placeholder="Codice"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
              />
              <button onClick={handleJoinLeague} className="w-full py-4 bg-green-600 rounded-2xl font-black uppercase text-xs">Entra in campo</button>
            </div>
          </div>

          <div className="p-8 bg-slate-900 border border-slate-800 rounded-[2.5rem]">
            <h3 className="text-lg font-black uppercase italic mb-6">Crea Lega</h3>
            <div className="space-y-4">
              <input 
                className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none focus:border-blue-500"
                placeholder="Nome Lega"
                value={leagueNameInput}
                onChange={(e) => setLeagueNameInput(e.target.value)}
              />
              <button onClick={handleCreateLeague} className="w-full py-4 bg-blue-600 rounded-2xl font-black uppercase text-xs">Crea ora</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}