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

  const calculatePoints = (hP: number, aP: number, hR: number, aR: number) => {
    const signP = hP > aP ? '1' : hP < aP ? '2' : 'X';
    const signR = hR > aR ? '1' : hR < aR ? '2' : 'X';
    return signP === signR ? 3 : 0;
  };

  const fetchData = async () => {
    if (!leagueId) return;
    setLoading(true);

    try {
      // Recupero Membri e info Lega
      const { data: membersData } = await supabase
        .from('league_members')
        .select('user_id, leagues(name)')
        .eq('league_id', leagueId);

      if (!membersData || membersData.length === 0) return;
      
      // FIX ERRORE ROSSO: Accediamo al nome della lega in modo sicuro
      const rawLeagueData = membersData[0].leagues as any;
      const name = Array.isArray(rawLeagueData) ? rawLeagueData[0]?.name : rawLeagueData?.name;
      setLeagueName(name || 'La mia Lega');

      const userIds = membersData.map(m => m.user_id);
      const { data: allPredictions } = await supabase
        .from('predictions')
        .select('*')
        .in('user_id', userIds);

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
            status: event.Eps
          };
        });
      });

      const userStats: any = {};
      membersData.forEach(m => {
        userStats[m.user_id] = { id: m.user_id, points: 0, hits: 0 };
      });

      allPredictions?.forEach(p => {
        const real = apiResults[p.match_id];
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

  if (loading) return <div className="p-20 text-center text-white italic">Aggiornamento punti... 🏟️</div>;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-black uppercase italic text-white">{leagueName}</h1>
        <p className="text-blue-400 text-xs font-bold tracking-widest uppercase mt-2">Classifica Generale</p>
      </header>

      <div className="bg-slate-800 rounded-[2rem] border border-slate-700 shadow-2xl overflow-hidden">
        <div className="grid grid-cols-4 bg-slate-900/50 p-4 border-b border-slate-700 text-[10px] font-black uppercase text-slate-500">
          <span>Pos</span>
          <span>Player</span>
          <span className="text-center">Presi</span>
          <span className="text-right">Punti</span>
        </div>

        {leaderboard.map((user, index) => (
          <div key={user.id} className="grid grid-cols-4 p-5 items-center border-b border-slate-700/30 last:border-0">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${index === 0 ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-slate-400'}`}>
              {index + 1}
            </span>
            <span className="text-sm font-bold text-white truncate">{user.id.substring(0, 5)}</span>
            <span className="text-center text-xs font-mono text-slate-400">{user.hits}</span>
            <span className="text-right text-2xl font-black text-blue-500">{user.points}</span>
          </div>
        ))}
      </div>

      <button onClick={fetchData} className="w-full mt-6 py-4 bg-slate-900 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl text-[10px] font-black uppercase border border-slate-700">
        🔄 Aggiorna Dati Live
      </button>
    </div>
  );
}

export default function ClassificaPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center text-white">Caricamento classifica...</div>}>
      <ClassificaContent />
    </Suspense>
  );
}