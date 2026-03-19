'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

// Icone semplici per lo sport (pallone, coppa)
const BallIcon = () => (
  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 0l-4 3m4-3l4 3m-8 3h8m-8 4l-4 3m8-3l4 3" />
  </svg>
);

const TrophyIcon = () => (
  <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
  </svg>
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LegaPage() {
  const [leagues, setLeagues] = useState<any[]>([]);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Recupera le leghe a cui l'utente partecipa
  const fetchMyLeagues = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Join per prendere i dati della lega dalla tabella league_members
    const { data: memberData, error: memberError } = await supabase
      .from('league_members')
      .select('league_id, leagues(id, name, owner_id)')
      .eq('user_id', user.id);

    if (memberError) {
      console.error("Errore recupero leghe:", memberError.message);
    } else if (memberData) {
      // Estraiamo solo l'oggetto lega da memberData
      setLeagues(memberData.map(m => m.leagues).filter(l => l !== null));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMyLeagues();
  }, []);

  const createLeague = async () => {
    if (!newLeagueName) return alert("Dai un nome alla lega!");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Con il trigger SQL, non dobbiamo più inviare invite_code, owner_id lo lasciamo per ora come riferimento
    const { data: league, error: lErr } = await supabase
      .from('leagues')
      .insert({ name: newLeagueName, owner_id: user.id })
      .select()
      .single();

    if (lErr) return alert("Errore creazione: " + lErr.message);

    if (league) {
      await supabase.from('league_members').insert({
        league_id: league.id,
        user_id: user.id
      });
      alert(`Lega '${newLeagueName}' creata con successo!`);
      setNewLeagueName('');
      fetchMyLeagues(); // Ricarica la lista
    }
  };

  if (loading) return <div className="p-20 text-center text-white italic">Caricamento spogliatoi...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-black text-white italic mb-12 uppercase tracking-tight">Le tue Leghe 🏆</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Sezione Le tue Leghe */}
        <div>
          <h2 className="text-xl font-bold text-white mb-6">Le tue Sfide</h2>
          {leagues.length === 0 ? (
            <div className="p-10 border-2 border-dashed border-slate-700 rounded-3xl text-center text-slate-600 font-bold uppercase text-xs">Ancora nessuna lega attiva</div>
          ) : (
            <div className="space-y-6">
              {leagues.map((l, index) => (
                <div key={l.id} className="bg-slate-900 p-8 border border-slate-800 rounded-[2.5rem] shadow-xl hover:border-blue-600 transition-all flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-6 text-center md:text-left">
                    <div className="bg-slate-800 p-4 rounded-3xl border border-slate-700 shadow-inner">
                      <BallIcon />
                    </div>
                    <div>
                      <span className="text-3xl font-black text-white uppercase italic tracking-tighter">{l.name}</span>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase font-black">Codice: <span className="text-green-500">{l.invite_code || 'Attesa...'}</span></p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    {/* Placeholder per Punti e Posizione */}
                    <div className="text-center p-3 bg-slate-800 rounded-2xl w-24">
                       <p className="text-[8px] text-slate-500 font-black uppercase">Posizione</p>
                       <span className="text-xl font-black text-white italic">#1</span>
                    </div>
                    <div className="text-center p-3 bg-slate-800 rounded-2xl w-24">
                        <p className="text-[8px] text-slate-500 font-black uppercase">Punti</p>
                        <span className="text-3xl font-black text-blue-500 italic">0</span>
                    </div>
                    <button onClick={() => router.push(`/classifica?id=${l.id}`)} className="p-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">Classifica</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sezione Crea */}
        <div className="sticky top-28 bg-slate-900 p-10 border border-slate-800 rounded-[3rem] shadow-2xl h-fit">
          <div className="text-center mb-10 flex flex-col items-center">
            <TrophyIcon />
            <h2 className="text-2xl font-black text-white mt-4 uppercase italic">Nuova Sfida</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Crea la tua lega privata Mondiale</p>
          </div>
          <input 
            type="text" value={newLeagueName} onChange={(e)=>setNewLeagueName(e.target.value)}
            placeholder="Nome della Lega"
            className="w-full p-5 bg-slate-800 border border-slate-700 rounded-2xl text-white mb-6 outline-none focus:border-blue-500"
          />
          <button onClick={createLeague} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-900/40 transition-all active:scale-95">Crea ora</button>
        </div>
      </div>
    </div>
  );
}