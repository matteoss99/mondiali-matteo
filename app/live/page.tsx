'use client';

import { useState, useEffect } from 'react';

export default function LivePage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEuropa, setFilterEuropa] = useState(false); // Stato per il filtro

  const fetchLiveScores = async () => {
    setLoading(true);
    try {
      const url = 'https://livescore6.p.rapidapi.com/matches/v2/list-live?Category=soccer';
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY || '',
          'X-RapidAPI-Host': 'livescore6.p.rapidapi.com'
        }
      });

      const data = await response.json();
      
      const allMatches: any[] = [];
      data.Stages?.forEach((stage: any) => {
        stage.Events?.forEach((event: any) => {
          allMatches.push({
            id: event.Eid,
            homeTeam: event.T1[0].Nm,
            awayTeam: event.T2[0].Nm,
            homeId: event.T1[0].ID, // ID per il logo
            awayId: event.T2[0].ID, // ID per il logo
            homeScore: event.Tr1 || '0',
            awayScore: event.Tr2 || '0',
            minute: event.Eps,
            league: stage.Snm,
            // Identifichiamo se è Europa League o Conference
            isEuropa: stage.Snm.toLowerCase().includes('europa league') || stage.Snm.toLowerCase().includes('uefa')
          });
        });
      });

      setMatches(allMatches);
    } catch (err) {
      console.error("Errore API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveScores();
  }, []);

  // Logica di filtraggio: se filterEuropa è true, mostra solo quelle. Altrimenti tutte.
  const filteredMatches = filterEuropa 
    ? matches.filter(m => m.isEuropa) 
    : matches;

  if (loading) return <div className="p-20 text-center animate-pulse">📡 Caricamento loghi e dati UEFA...</div>;

  return (
    <div className="p-8">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Live Dashboard ⚽</h1>
          <p className="text-slate-400 text-sm italic">Oggi: Europa & Conference League</p>
        </div>
        
        <div className="flex gap-2">
          {/* Tasto per filtrare */}
          <button 
            onClick={() => setFilterEuropa(!filterEuropa)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              filterEuropa ? 'bg-orange-500 border-orange-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {filterEuropa ? 'Mostra Tutte' : 'Solo Europa League'}
          </button>
          
          <button 
            onClick={fetchLiveScores}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-all"
          >
            Aggiorna
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredMatches.length > 0 ? (
          filteredMatches.map((m) => (
            <div key={m.id} className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-[2rem] border border-slate-700 shadow-2xl flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-slate-700/50 pb-3">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{m.league}</span>
                <span className="text-[10px] font-bold bg-red-500/20 text-red-500 px-2 py-1 rounded-md animate-pulse">{m.minute}</span>
              </div>
              
              <div className="flex items-center justify-between gap-2">
                {/* CASA */}
                <div className="flex flex-col items-center flex-1">
                  <div className="w-16 h-16 bg-slate-900 rounded-full p-3 mb-2 flex items-center justify-center border border-slate-700">
                    <img 
                      src={`https://static.livescore.com/content/team/logos/${m.homeId}.png`} 
                      alt="logo" 
                      className="w-full h-full object-contain"
                      onError={(e: any) => e.target.src = "https://via.placeholder.com/50?text=?"}
                    />
                  </div>
                  <span className="text-[11px] font-black text-center uppercase leading-tight">{m.homeTeam}</span>
                </div>

                {/* RISULTATO */}
                <div className="text-4xl font-black tracking-tighter bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent px-4">
                  {m.homeScore} - {m.awayScore}
                </div>

                {/* OSPITI */}
                <div className="flex flex-col items-center flex-1">
                  <div className="w-16 h-16 bg-slate-900 rounded-full p-3 mb-2 flex items-center justify-center border border-slate-700">
                    <img 
                      src={`https://static.livescore.com/content/team/logos/${m.awayId}.png`} 
                      alt="logo" 
                      className="w-full h-full object-contain"
                      onError={(e: any) => e.target.src = "https://via.placeholder.com/50?text=?"}
                    />
                  </div>
                  <span className="text-[11px] font-black text-center uppercase leading-tight">{m.awayTeam}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full p-20 text-center bg-slate-800/20 rounded-[2rem] border-2 border-dashed border-slate-700 text-slate-500">
            Nessuna partita di Europa League in corso.
          </div>
        )}
      </div>
    </div>
  );
}