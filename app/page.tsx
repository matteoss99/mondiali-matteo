'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [matches, setMatches] = useState<any[]>([]);
  const [scores, setScores] = useState<{ [key: string]: { home: string, away: string } }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initApp() {
      // 1. Scarichiamo le partite
      const { data: matchesData } = await supabase.from('matches').select('*');
      if (matchesData) setMatches(matchesData);

      // 2. Scarichiamo i pronostici già fatti dall'utente loggato (se c'è)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: predData } = await supabase
          .from('predictions')
          .select('*')
          .eq('user_id', user.id);
        
        if (predData) {
          // Riempiamo gli input con i dati già salvati nel DB
          const savedScores: any = {};
          predData.forEach(p => {
            savedScores[p.match_id] = { home: p.home_score.toString(), away: p.away_score.toString() };
          });
          setScores(savedScores);
        }
      }
      setLoading(false);
    }
    initApp();
  }, []);

  async function inviaPronostico(matchId: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Accedi per giocare!");

    const matchScores = scores[matchId];
    if (!matchScores?.home || !matchScores?.away) return alert("Inserisci i punteggi!");

    // UPSERT: Se esiste già un pronostico di questo utente per questa partita, lo aggiorna.
    // Altrimenti ne crea uno nuovo.
    const { error } = await supabase
      .from('predictions')
      .upsert({ 
          user_id: user.id, 
          match_id: matchId.toString(), 
          home_score: parseInt(matchScores.home), 
          away_score: parseInt(matchScores.away) 
        }, 
        { onConflict: 'user_id, match_id' } // Questa è la chiave logica
      );

    if (error) alert("Errore: " + error.message);
    else alert("Pronostico sincronizzato! 🔄");
  }

  if (loading) return <div className="p-20 text-center">Caricamento Mondiale...</div>;

  return (
    <div className="p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {matches.map((match) => (
          <div key={match.id} className="bg-slate-800 rounded-3xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-8">
              <div className="text-center flex-1">
                <span className="text-5xl block mb-2">{match.home_flag}</span>
                <span className="font-bold text-xs">{match.home_team}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={scores[match.id]?.home || ''}
                  className="w-12 h-14 bg-slate-900 border-2 border-slate-700 rounded-xl text-center text-xl font-bold"
                  onChange={(e) => setScores({...scores, [match.id]: {...scores[match.id], home: e.target.value}})}
                />
                <span className="font-bold text-slate-600">:</span>
                <input 
                  type="number" 
                  value={scores[match.id]?.away || ''}
                  className="w-12 h-14 bg-slate-900 border-2 border-slate-700 rounded-xl text-center text-xl font-bold"
                  onChange={(e) => setScores({...scores, [match.id]: {...scores[match.id], away: e.target.value}})}
                />
              </div>

              <div className="text-center flex-1">
                <span className="text-5xl block mb-2">{match.away_flag}</span>
                <span className="font-bold text-xs">{match.away_team}</span>
              </div>
            </div>

            <button onClick={() => inviaPronostico(match.id)} className="w-full py-4 bg-blue-600 rounded-2xl font-bold uppercase text-xs">
              Conferma
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}