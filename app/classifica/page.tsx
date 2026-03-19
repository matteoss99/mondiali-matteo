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
  const [leagueName, setLeagueName] = useState('');

  // Logica Ingegneristica: Calcolo del Segno (1X2)
  const calculatePoints = (hP: number, aP: number, hR: number, aR: number) => {
    const signP = hP > aP ? '1' : hP < aP ? '2' : 'X';
    const signR = hR > aR ? '1' : hR < aR ? '2' : 'X';
    return signP === signR ? 3 : 0;
  };

  const fetchData = async () => {
    if (!leagueId) return;
    setLoading(true);

    try {
      // 1. Recupero Membri della Lega
      const { data: membersData } = await supabase
        .from('league_members')
        .select('user_id, leagues(name)')
        .eq('league_id', leagueId);

      if (!membersData || membersData.length === 0) return;
      setLeagueName((membersData[0].leagues as any).name || (membersData[0].leagues as any)[0]?.name);

      // 2. Recupero tutti i pronostici dei membri
      const userIds = membersData.map(m => m.user_id);
      const { data: allPredictions } = await supabase
        .from('predictions')
        .select('*')
        .in('user_id', userIds);

      // 3. Recupero Risultati Reali (LiveScore API)
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const response = await fetch(`https://livescore6.p.rapidapi.com/matches/v2/list-by-date?Category=soccer&Date=${today}&Timezone=1`, {
        headers: {
          'X-RapidAPI-Key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY || '',
          'X-RapidAPI-Host': 'livescore6.p.rapidapi.com'
        }
      });
      const apiData = await response.json();

      const apiResults: any = {};
      apiData.Stages?.forEach((stage: any) => {
        stage.Events?.forEach((event: any) => {
          apiResults[event.Eid] = {
            h: parseInt(event.Tr1 || '0'),
            a: parseInt(event.Tr2 || '0'),
            status: event.Eps // "NS" = Non iniziata, "FT" = Finita
          };
        });
      });

      // 4. Elaborazione Punteggi
      const userStats: any = {};
      membersData.forEach(m => {
        userStats[m.user_id] = { id: m.user_id, points: 0, hits: 0 };
      });

      allPredictions?.forEach(p => {
        const real = apiResults[p.match_id];
        // Calcoliamo i punti solo se la partita è iniziata o finita
        if (real && real.status !== 'NS') {
          const pts = calculatePoints(p.home_score, p.away_score, real.h, real.a);
          userStats[p.user_id].points += pts;
          if (pts > 0) userStats[p.user_id].hits += 1;
        }
      });

      const sorted = Object.values(userStats).sort((a: any, b: any) => b.points - a.points);
      setLeaderboard(sorted);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [leagueId]);

  if (loading) return <div className="p-20 text-center text-white italic">Calcolo punti in tempo reale... 🏟️</div>;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-black uppercase italic text-white">{leagueName}</h1>
        <p className="text-blue-400 text-xs font-bold tracking-widest uppercase mt-2">Classifica Generale</p>
      </header>

      <div className="bg-slate-800 rounded-[2rem] border border-slate-700 shadow-2xl overflow-hidden">
        <div className="grid grid-cols-4 bg-slate-900/50 p-4 border-b border-slate-700">
          <span className="text-[10px] font-black uppercase text-slate-500">Pos</span>
          <span className="text-[10px] font-black uppercase text-slate-500">Player</span>
          <span className="text-[10px] font-black uppercase text-slate-500 text-center">Indovinate</span>
          <span className="text-[10px] font-black uppercase text-slate-500 text-right">Punti</span>
        </div>

        {leaderboard.map((user, index) => (
          <div key={user.id} className="grid grid-cols-4 p-5 items-center border-b border-slate-700/30 last:border-0">
            <div className="flex items-center">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                index === 0 ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-slate-400'
              }`}>
                {index + 1}
              </span>
            </div>
            <div className="truncate pr-2">
              <span className="text-sm font-bold text-white uppercase">{user.id.substring(0, 5)}</span>
            </div>
            <div className="text-center">
              <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded">{user.hits}</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-blue-500">{user.points}</span>
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={fetchData} 
        className="w-full mt-6 py-4 bg-slate-900 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-700"
      >
        🔄 Aggiorna Dati Live
      </button>
    </div>
  );
}

// Suspense è obbligatorio per usare useSearchParams in Next.js
export default function ClassificaPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center text-white">Caricamento...</div>}>
      <ClassificaContent />
    </Suspense>
  );
}