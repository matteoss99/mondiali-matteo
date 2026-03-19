'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function ClassificaContent() {
  const searchParams = useSearchParams();
  const leagueId = searchParams.get('id');
  
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [leagueName, setLeagueName] = useState('LEGA');

  const fetchData = async () => {
    if (!leagueId) return;
    setLoading(true);

    try {
      // 1. Prendi il nome della Lega
      const { data: lega } = await supabase
        .from('leagues')
        .select('name')
        .eq('id', leagueId)
        .maybeSingle();
      if (lega) setLeagueName(lega.name);

      // 2. Prendi gli ID dei Partecipanti (Short Pass strategy)
      const { data: members, error: mErr } = await supabase
        .from('league_members')
        .select('user_id')
        .eq('league_id', leagueId);

      if (mErr || !members || members.length === 0) {
        setLeaderboard([]);
        setLoading(false);
        return;
      }

      const userIds = members.map(m => m.user_id);

      // 3. Prendi i Nickname e i Pronostici (Separate calls for robustness)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

      // Per ora assumiamo 0 punti, in attesa della logica livescore
      const stats = userIds.map(uid => {
        const prof = profiles?.find(p => p.id === uid);
        return {
          id: uid,
          name: prof?.username || `Utente ${uid.substring(0, 4)}`,
          points: 0, // Inizializzato a 0
          hits: 0
        };
      });

      // Ordinamento (per ora fittizio essendo tutti a 0)
      setLeaderboard(stats.sort((a, b) => b.points - a.points));

    } catch (err) {
      console.error("Errore classifica:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [leagueId]);

  if (loading) return (
    <div className="p-20 text-center text-white italic text-xs uppercase tracking-widest animate-pulse">
      Aggiornamento tabellone... ⚽
    </div>
  );

  return (
    <div className="p-4 md:p-10 max-w-2xl mx-auto min-h-screen bg-slate-950">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-black uppercase italic text-white tracking-tighter">
          {leagueName}
        </h1>
        <p className="text-blue-500 text-[10px] font-black tracking-widest uppercase mt-2">Classifica Ufficiale Live</p>
        <div className="h-1 w-24 bg-blue-600 mx-auto mt-6 rounded-full"></div>
      </header>

      {/* CONTENITORE PRINCIPALE TABELLA */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3rem] shadow-[0_0_60px_rgba(0,0,0,0.5)] overflow-hidden">
        
        {/* Intestazione Tabella - Grid perfetta */}
        <div className="grid grid-cols-[50px_1fr_60px_60px] p-6 border-b border-slate-800 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] items-center">
          <span className="text-center">Pos</span>
          <span>Giocatore</span>
          <span className="text-center">Presi</span>
          <span className="text-right">Punti</span>
        </div>

        {/* Righe Giocatori */}
        {leaderboard.length === 0 ? (
          <div className="p-20 text-center text-slate-700 font-bold uppercase text-xs italic">Nessun partecipante trovato in questa lega.</div>
        ) : (
          leaderboard.map((user, index) => (
            <div key={user.id} className="grid grid-cols-[50px_1fr_60px_60px] p-7 items-center border-b border-slate-800 last:border-0 odd:bg-white/5 hover:bg-slate-800/80 transition-all active:scale-[0.98]">
              
              {/* Posizione (Ranks colorati) */}
              <div className="flex justify-center">
                <span className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-lg ${
                  index === 0 ? 'bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'bg-slate-800 text-slate-400'
                }`}>
                  {index + 1}
                </span>
              </div>
              
              {/* Giocatore */}
              <div className="truncate pr-4">
                <span className="text-lg md:text-xl font-black text-white uppercase italic tracking-tight group-hover:text-blue-400">
                  {user.name}
                </span>
              </div>
              
              {/* Pronostici Presi */}
              <div className="text-center">
                <span className="font-mono text-sm font-medium text-slate-400">{user.hits}</span>
              </div>
              
              {/* Punti (Enormi e blu) */}
              <div className="text-right">
                <span className="text-4xl font-black text-blue-500 italic tracking-tighter">
                  {user.points}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <button onClick={fetchData} className="w-full mt-12 py-5 bg-slate-900 hover:bg-slate-800 text-slate-500 rounded-3xl font-black uppercase text-[10px] tracking-widest border border-slate-800 transition-all hover:text-white shadow-xl active:scale-95">
        🔄 Forza Aggiornamento Dati
      </button>
    </div>
  );
}

export default function ClassificaPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center text-white italic tracking-widest animate-pulse">Apertura spogliatoi... 👟</div>}>
      <ClassificaContent />
    </Suspense>
  );
}