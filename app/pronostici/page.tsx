'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PronosticiPage() {
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<any[]>([]);
  const [leagues, setLeagues] = useState<string[]>([]);
  const [selectedLeague, setSelectedLeague] = useState('Tutte');
  const [scores, setScores] = useState<{ [key: string]: { home: string, away: string } }>({});
  const [loading, setLoading] = useState(true);

  const fetchScheduledMatches = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const url = `https://livescore6.p.rapidapi.com/matches/v2/list-by-date?Category=soccer&Date=${today}&Timezone=1`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY || '',
          'X-RapidAPI-Host': 'livescore6.p.rapidapi.com'
        }
      });

      const data = await response.json();
      const list: any[] = [];
      const leagueSet = new Set<string>();

      data.Stages?.forEach((stage: any) => {
        // --- LOGICA PULIZIA NOME LEGA ---
        let displayLeague = stage.Snm;
        if (displayLeague.toLowerCase().includes('europa league')) {
            displayLeague = 'Europa League';
        } else if (displayLeague.toLowerCase().includes('conference league')) {
            displayLeague = 'Conference League';
        }
        
        leagueSet.add(displayLeague);

        stage.Events?.forEach((event: any) => {
          if (event.Eps === 'NS') {
            list.push({
              id: event.Eid,
              homeTeam: event.T1[0].Nm,
              awayTeam: event.T2[0].Nm,
              homeId: event.T1[0].ID,
              awayId: event.T2[0].ID,
              time: event.Esd.toString().substring(8, 12),
              league: displayLeague // Usiamo il nome pulito
            });
          }
        });
      });

      setAllMatches(list);
      setFilteredMatches(list);
      setLeagues(['Tutte', ...Array.from(leagueSet)].sort());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchScheduledMatches(); }, []);

  useEffect(() => {
    if (selectedLeague === 'Tutte') setFilteredMatches(allMatches);
    else setFilteredMatches(allMatches.filter(m => m.league === selectedLeague));
  }, [selectedLeague, allMatches]);

  const salvaScommessa = async (matchId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Devi loggarti!");

    const s = scores[matchId];
    if (!s?.home || !s?.away) return alert("Inserisci il punteggio!");

    const { error } = await supabase.from('predictions').upsert({
      user_id: user.id,
      match_id: matchId,
      home_score: parseInt(s.home),
      away_score: parseInt(s.away)
    }, { onConflict: 'user_id, match_id' });

    if (error) alert("Errore: " + error.message);
    else alert("Pronostico salvato! 🎯");
  };

  if (loading) return <div className="p-20 text-center text-white">Preparando il palinsesto... 📅</div>;

  return (
    <div className="p-8">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Pronostici Oggi 🎰</h1>
          <p className="text-slate-400 text-sm">Seleziona la lega e piazza la tua giocata</p>
        </div>

        <select 
          className="bg-slate-800 border border-slate-700 p-3 rounded-xl text-sm text-white outline-none focus:border-blue-500 w-full md:w-64"
          onChange={(e) => setSelectedLeague(e.target.value)}
          value={selectedLeague}
        >
          {leagues.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredMatches.map((m) => (
          <div key={m.id} className="bg-slate-800 p-6 rounded-[2rem] border border-slate-700 shadow-xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-700/50 pb-3">
              <span className="text-[10px] font-black text-blue-400 uppercase">{m.league}</span>
              <span className="text-xs font-bold text-slate-400 italic">Inizio: {m.time.substring(0,2)}:{m.time.substring(2,4)}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              {/* CASA */}
              <div className="flex flex-col items-center flex-1">
                <div className="w-14 h-14 bg-white/5 rounded-full p-2 mb-2 flex items-center justify-center">
                    <img 
                        src={`https://api.sofascore.app/api/v1/team/${m.homeId}/image`} 
                        className="w-10 h-10 object-contain" 
                        alt="" 
                        onError={(e: any) => e.target.src = `https://ui-avatars.com/api/?name=${m.homeTeam}&background=random&color=fff`}
                    />
                </div>
                <span className="text-[10px] font-black text-center uppercase text-white leading-tight">{m.homeTeam}</span>
              </div>

              {/* INPUTS - TESTO BIANCO */}
              <div className="flex items-center gap-2">
                <input 
                  type="number" placeholder="0" 
                  className="w-12 h-12 bg-slate-900 border border-slate-700 rounded-xl text-center font-black text-white outline-none focus:border-blue-500"
                  onChange={(e) => setScores({...scores, [m.id]: {...scores[m.id], home: e.target.value}})}
                />
                <span className="font-bold text-slate-600">:</span>
                <input 
                  type="number" placeholder="0" 
                  className="w-12 h-12 bg-slate-900 border border-slate-700 rounded-xl text-center font-black text-white outline-none focus:border-blue-500"
                  onChange={(e) => setScores({...scores, [m.id]: {...scores[m.id], away: e.target.value}})}
                />
              </div>

              {/* OSPITI */}
              <div className="flex flex-col items-center flex-1">
                <div className="w-14 h-14 bg-white/5 rounded-full p-2 mb-2 flex items-center justify-center">
                    <img 
                        src={`https://api.sofascore.app/api/v1/team/${m.awayId}/image`} 
                        className="w-10 h-10 object-contain" 
                        alt="" 
                        onError={(e: any) => e.target.src = `https://ui-avatars.com/api/?name=${m.awayTeam}&background=random&color=fff`}
                    />
                </div>
                <span className="text-[10px] font-black text-center uppercase text-white leading-tight">{m.awayTeam}</span>
              </div>
            </div>

            {/* BOTTONE TESTO BIANCO */}
            <button 
              onClick={() => salvaScommessa(m.id)}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black uppercase text-[11px] text-white tracking-widest transition-all shadow-lg shadow-blue-900/20 active:scale-95"
            >
              Conferma Pronostico
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}