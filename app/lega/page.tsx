'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LegaPage() {
  const [leagueName, setLeagueName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [userLeagues, setUserLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Carica le leghe di cui l'utente fa già parte
  const fetchUserLeagues = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('league_members')
      .select('leagues(id, name, invite_code)')
      .eq('user_id', user.id);

    if (data) setUserLeagues(data.map(item => item.leagues));
    setLoading(false);
  };

  useEffect(() => { fetchUserLeagues(); }, []);

  // Funzione per CREARE una lega
  const createLeague = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !leagueName) return alert("Inserisci un nome per la lega!");

    // Genera un codice casuale di 6 caratteri
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    // 1. Inserisce la lega
    const { data: newLeague, error: leagueError } = await supabase
      .from('leagues')
      .insert([{ name: leagueName, invite_code: code }])
      .select()
      .single();

    if (leagueError) return alert(leagueError.message);

    // 2. Aggiunge il creatore come membro
    await supabase.from('league_members').insert([
      { league_id: newLeague.id, user_id: user.id }
    ]);

    alert(`Lega creata! Codice invito: ${code}`);
    setLeagueName('');
    fetchUserLeagues();
  };

  // Funzione per UNIRSI a una lega
  const joinLeague = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !inviteCode) return alert("Inserisci il codice!");

    // 1. Trova la lega con quel codice
    const { data: league, error: findError } = await supabase
      .from('leagues')
      .select('id')
      .eq('invite_code', inviteCode.toUpperCase())
      .single();

    if (!league) return alert("Codice non valido!");

    // 2. Aggiunge l'utente ai membri
    const { error: joinError } = await supabase
      .from('league_members')
      .insert([{ league_id: league.id, user_id: user.id }]);

    if (joinError) alert("Fai già parte di questa lega o c'è un errore.");
    else {
      alert("Sei entrato nella lega!");
      setInviteCode('');
      fetchUserLeagues();
    }
  };

  if (loading) return <div className="p-20 text-center text-white">Caricamento...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-black uppercase italic mb-10 text-center">Gestione Lega 🤝</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* SEZIONE CREA */}
        <div className="bg-slate-800 p-8 rounded-[2rem] border border-slate-700 shadow-xl">
          <h2 className="text-xl font-bold mb-4">Crea una nuova Lega</h2>
          <input 
            type="text" placeholder="Nome Lega (es: Lega Dottori)" 
            className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl mb-4 text-white"
            value={leagueName}
            onChange={(e) => setLeagueName(e.target.value)}
          />
          <button onClick={createLeague} className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white uppercase transition-all">
            Crea e Genera Codice
          </button>
        </div>

        {/* SEZIONE UNISCITI */}
        <div className="bg-slate-800 p-8 rounded-[2rem] border border-slate-700 shadow-xl">
          <h2 className="text-xl font-bold mb-4">Unisciti a una Lega</h2>
          <input 
            type="text" placeholder="Inserisci Codice Invito" 
            className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl mb-4 text-white"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
          />
          <button onClick={joinLeague} className="w-full py-4 bg-orange-600 hover:bg-orange-500 rounded-xl font-bold text-white uppercase transition-all">
            Unisciti alla Sfida
          </button>
        </div>
      </div>

      {/* LISTA DELLE TUE LEGHE */}
      <div className="mt-12">
        <h2 className="text-2xl font-black mb-6 uppercase tracking-tighter">Le tue competizioni attive</h2>
        <div className="grid grid-cols-1 gap-4">
          {userLeagues.map(l => (
            <div key={l.id} className="bg-slate-900 p-6 rounded-2xl border border-slate-700 flex justify-between items-center">
              <div>
                <p className="text-lg font-bold text-white">{l.name}</p>
                <p className="text-xs text-slate-500 font-mono uppercase">Codice: {l.invite_code}</p>
              </div>
              <button onClick={() => router.push(`/classifica?id=${l.id}`)} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold uppercase border border-slate-600">
                Guarda Classifica
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}