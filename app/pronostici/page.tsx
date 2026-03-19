'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- 🎯 WHITE LIST: Mostriamo SOLO queste se esistono ---
const IMPORTANT_LEAGUES = [
  'Serie A', 'Champions League', 'Europa League', 'Conference League', 
  'Premier League', 'LaLiga', 'Bundesliga', 'Coppa Italia', 'World Cup', 'Euro'
];

export default function PronosticiPage() {
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<any[]>([]);
  const [leagues, setLeagues] = useState<string[]>([]);
  const [selectedLeague, setSelectedLeague] = useState('Tutte');
  const [scores, setScores] = useState<{ [key: string]: { home: string, away: string } }>({});
  const [loading, setLoading] = useState(true);
  const [existingPredictions, setExistingPredictions] = useState<string[]>([]);

  const fetchScheduledMatches = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const url = `https://livescore6.p.rapidapi.com/matches/v2/list-by-date?Category=soccer&Date=${today}&Timezone=1`;
      
      const response = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY || '',
          'X-RapidAPI-Host': 'livescore6.p.rapidapi.com'
        }
      });

      const data = await response.json();
      const list: any[] = [];
      const leagueSet = new Set<string>();

      data.Stages?.forEach((stage: any) => {
        let name = stage.Snm;
        // Normalizzazione nomi
        if (name.includes('Champions League')) name = 'Champions League';
        else if (name.includes('Europa League')) name = 'Europa League';
        else if (name.includes('Serie A')) name = 'Serie A';

        // --- FILTRO CATTIVO ---
        // Se non è nella nostra lista importante e non è "Tutte", potremmo volerla nascondere
        // Ma per ora lasciamo che appaiano solo quelle che hanno match "Not Started" (NS)
        
        stage.Events?.forEach((event: any) => {
          if (event.Eps === 'NS') {
            leagueSet.add(name);
            list.push({
              id: event.Eid,
              homeTeam: event.T1[0].Nm,
              awayTeam: event.T2[0].Nm,
              homeId: event.T1[0].ID,
              awayId: event.T2[0].ID,
              time: event.Esd.toString().substring(8, 12),
              league: name 
            });
          }
        });
      });

      setAllMatches(list);
      setLeagues(['Tutte', ...Array.from(leagueSet)].sort());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduledMatches();
  }, []);

  useEffect(() => {
    if (selectedLeague === 'Tutte') setFilteredMatches(allMatches);
    else setFilteredMatches(allMatches.filter(m => m.league === selectedLeague));
  }, [selectedLeague, allMatches]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white italic tracking-widest">Sincronizzazione...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
      
      <header className="max-w-6xl mx-auto mb-10">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Pronostici <span className="text-blue-500">Live</span></h1>
        <div className="h-1 w-16 bg-blue-600 mt-2"></div>
      </header>

      {/* FILTRI CHIPS - Più piccoli e ordinati */}
      <div className="max-w-6xl mx-auto mb-10">
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
          {leagues.map((l) => (
            <button
              key={l}
              onClick={() => setSelectedLeague(l)}
              className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2 whitespace-nowrap
                ${selectedLeague === l ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* MATCH CARDS - Pulizia totale */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredMatches.map((m) => (
          <div key={m.id} className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl">
            <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase mb-6 tracking-widest">
              <span>{m.league}</span>
              <span>Ore {m.time.substring(0,2)}:{m.time.substring(2,4)}</span>
            </div>

            <div className="flex items-center justify-between gap-4 mb-8">
              <div className="flex-1 text-center">
                <p className="text-xs font-black uppercase italic leading-tight">{m.homeTeam}</p>
              </div>
              
              <div className="flex gap-2">
                <input type="number" placeholder="0" className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-xl text-center font-black text-blue-500 outline-none focus:border-blue-600" />
                <input type="number" placeholder="0" className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-xl text-center font-black text-blue-500 outline-none focus:border-blue-600" />
              </div>

              <div className="flex-1 text-center">
                <p className="text-xs font-black uppercase italic leading-tight">{m.awayTeam}</p>
              </div>
            </div>

            <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all">
              Salva Pronostico
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}