'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function MiePrevisioni() {
  const [myBets, setMyBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyBets = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Prendiamo i tuoi pronostici dal DB
    const { data: predictions } = await supabase.from('predictions').select('*').eq('user_id', user.id);

    // 2. Prendiamo le partite di TEST dal tuo database (USA, Messico, ecc.)
    const { data: dbMatches } = await supabase.from('matches').select('*');

    // 3. Prendiamo le partite REALI di oggi dall'API
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    let apiMatchesMap: any = {};
    
    try {
      const res = await fetch(`https://livescore6.p.rapidapi.com/matches/v2/list-by-date?Category=soccer&Date=${today}&Timezone=1`, {
        headers: { 
          'X-RapidAPI-Key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY || '', 
          'X-RapidAPI-Host': 'livescore6.p.rapidapi.com' 
        }
      });
      const apiData = await res.json();
      apiData.Stages?.forEach((s: any) => s.Events?.forEach((e: any) => {
        apiMatchesMap[e.Eid] = { home: e.T1[0].Nm, away: e.T2[0].Nm };
      }));
    } catch (e) { console.error("API Error", e); }

    // 4. INCROCIO DATI: cerchiamo prima nel DB, poi nell'API
    const fullData = predictions?.map(p => {
      const dbMatch = dbMatches?.find(m => m.id.toString() === p.match_id);
      const apiMatch = apiMatchesMap[p.match_id];

      return {
        ...p,
        details: {
          home: dbMatch?.home_team || apiMatch?.home || 'Match',
          away: dbMatch?.away_team || apiMatch?.away || 'Ignoto'
        }
      };
    });

    setMyBets(fullData || []);
    setLoading(false);
  };

  useEffect(() => { fetchMyBets(); }, []);

  const salvaModifica = async (matchId: string, h: any, a: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('predictions')
      .update({ home_score: parseInt(h), away_score: parseInt(a) })
      .eq('user_id', user?.id)
      .eq('match_id', matchId);

    if (error) alert("Errore: " + error.message);
    else alert("Modifica salvata! ✅");
  };

  if (loading) return <div className="p-20 text-center text-white">Caricamento...</div>;

  return (
    <div className="p-8 min-h-screen bg-slate-900 text-white"> {/* Forziamo sfondo scuro */}
      <h1 className="text-3xl font-black italic uppercase mb-8">Le mie Previsioni 📝</h1>
      
      <div className="grid grid-cols-1 gap-6">
        {myBets.map(bet => (
          <div key={bet.match_id} className="bg-slate-800 p-6 rounded-[2rem] border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl">
            <div className="flex items-center gap-6 flex-1 justify-center">
              <span className="text-xs font-black uppercase text-blue-400 text-right w-32">{bet.details.home}</span>
              
              <div className="flex gap-2">
                <input 
                  type="number" min="0" 
                  className="w-14 h-14 bg-slate-900 border border-slate-700 rounded-2xl text-center font-black text-xl text-white"
                  defaultValue={bet.home_score}
                  id={`h-${bet.match_id}`}
                />
                <span className="text-slate-600 font-bold self-center text-2xl">:</span>
                <input 
                  type="number" min="0" 
                  className="w-14 h-14 bg-slate-900 border border-slate-700 rounded-2xl text-center font-black text-xl text-white"
                  defaultValue={bet.away_score}
                  id={`a-${bet.match_id}`}
                />
              </div>
              
              <span className="text-xs font-black uppercase text-blue-400 text-left w-32">{bet.details.away}</span>
            </div>

            <button 
              onClick={() => {
                const h = (document.getElementById(`h-${bet.match_id}`) as HTMLInputElement).value;
                const a = (document.getElementById(`a-${bet.match_id}`) as HTMLInputElement).value;
                salvaModifica(bet.match_id, h, a);
              }}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-lg"
            >
              Salva Modifica
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}