'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- 1. IL "CERVELLO" DELLE CATEGORIE ---
const CATEGORY_MAP: { [key: string]: string } = {
  'Italy': 'Italia',
  'England': 'Inghilterra',
  'Spain': 'Spagna',
  'Germany': 'Germania',
  'France': 'Francia',
  'Europe': 'Europa',
  'International': 'Europa', 
  'World': 'Mondo'
};

const PRIORITY = ['Tutte', 'Europa', 'Mondo', 'Italia', 'Inghilterra', 'Spagna', 'Germania', 'Francia', 'Altro'];

export default function PronosticiPage() {
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Tutte');
  const [loading, setLoading] = useState(true);

  const fetchScheduledMatches = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const response = await fetch(`https://livescore6.p.rapidapi.com/matches/v2/list-by-date?Category=soccer&Date=${today}&Timezone=1`, {
        headers: {
          'X-RapidAPI-Key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY || '',
          'X-RapidAPI-Host': 'livescore6.p.rapidapi.com'
        }
      });
      const data = await response.json();
      const list: any[] = [];
      const foundCategories = new Set<string>();

      data.Stages?.forEach((stage: any) => {
        // Determiniamo la macro-categoria
        let cat = CATEGORY_MAP[stage.Cnm] || 'Altro';
        
        // Correzione per coppe europee/mondiali
        const stageName = stage.Snm.toLowerCase();
        if (stageName.includes('champions league') || stageName.includes('europa league')) cat = 'Europa';
        if (stageName.includes('world cup') || stageName.includes('nations league')) cat = 'Mondo';

        stage.Events?.forEach((event: any) => {
          if (event.Eps === 'NS') {
            foundCategories.add(cat);
            list.push({
              id: event.Eid,
              homeTeam: event.T1[0].Nm,
              awayTeam: event.T2[0].Nm,
              homeId: event.T1[0].ID,
              awayId: event.T2[0].ID,
              time: event.Esd.toString().substring(8, 12),
              league: stage.Snm,
              category: cat
            });
          }
        });
      });

      // Ordiniamo le categorie secondo la nostra priorità
      const sortedCats = Array.from(foundCategories).sort((a, b) => {
        return PRIORITY.indexOf(a) - PRIORITY.indexOf(b);
      });

      setAllMatches(list);
      setCategories(['Tutte', ...sortedCats]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchScheduledMatches(); }, []);

  useEffect(() => {
    if (selectedCategory === 'Tutte') {
      setFilteredMatches(allMatches);
    } else {
      setFilteredMatches(allMatches.filter(m => m.category === selectedCategory));
    }
  }, [selectedCategory, allMatches]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-black uppercase tracking-[0.3em]">Caricamento...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-10">
      
      <header className="max-w-6xl mx-auto mb-12 text-center md:text-left">
        <h1 className="text-5xl font-black italic uppercase tracking-tighter inline-block border-b-8 border-blue-600 pb-2">
          Pronostici <span className="text-blue-500">Live</span>
        </h1>
      </header>

      {/* --- BARRA CATEGORIE (FIXATA) --- */}
      <div className="max-w-6xl mx-auto mb-16">
        <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`
                px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all border-2 whitespace-nowrap
                ${selectedCategory === cat 
                  ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_30px_rgba(37,99,235,0.3)] scale-105' 
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600'}
              `}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* MATCH LIST */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
        {filteredMatches.length === 0 ? (
          <div className="col-span-full p-20 text-center bg-slate-900 rounded-[3rem] border border-slate-800">
             <p className="text-slate-600 font-black uppercase text-xs tracking-widest">Nessun match per questa categoria.</p>
          </div>
        ) : (
          filteredMatches.map((m) => (
            <div key={m.id} className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 p-10 rounded-[3.5rem] shadow-2xl flex flex-col group hover:border-blue-600/50 transition-all">
              
              <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.4em]">{m.league}</span>
                <span className="text-[10px] font-bold text-slate-600 italic uppercase">Ore {m.time.substring(0,2)}:{m.time.substring(2,4)}</span>
              </div>

              <div className="flex items-center justify-between gap-6 mb-10">
                <div className="flex-1 text-right font-black uppercase italic text-sm tracking-tight text-white">{m.homeTeam}</div>
                <div className="flex gap-3">
                  <input type="number" placeholder="0" className="w-14 h-14 bg-slate-950 border-2 border-slate-800 rounded-2xl text-center font-black text-xl text-blue-500 outline-none focus:border-blue-600 transition-all" />
                  <input type="number" placeholder="0" className="w-14 h-14 bg-slate-950 border-2 border-slate-800 rounded-2xl text-center font-black text-xl text-blue-500 outline-none focus:border-blue-600 transition-all" />
                </div>
                <div className="flex-1 text-left font-black uppercase italic text-sm tracking-tight text-white">{m.awayTeam}</div>
              </div>

              <button className="w-full py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] text-white transition-all shadow-xl active:scale-95">
                Salva Pronostico
              </button>
            </div>
          ))
        )}
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}