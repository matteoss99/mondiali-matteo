'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

// Inizializziamo il connettore con Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault(); // Evita che la pagina si ricarichi

    if (isRegistering) {
      // LOGICA REGISTRAZIONE
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert("Errore registrazione: " + error.message);
      else {
        alert("Account creato con successo! Ora puoi accedere.");
        setIsRegistering(false);
      }
    } else {
      // LOGICA ACCESSO
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert("Errore accesso: " + error.message);
      else {
        alert("Bentornato!");
        router.push('/'); // Torna alla Home dopo il login
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6">
      <div className="w-full max-w-md bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl">
        <h2 className="text-3xl font-black mb-8 text-center uppercase tracking-tighter">
          {isRegistering ? 'Crea Account' : 'Bentornato'} 🏆
        </h2>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <input 
            type="email" 
            placeholder="La tua email" 
            required
            className="w-full p-4 bg-slate-900 rounded-xl border border-slate-700 outline-none focus:border-blue-500 transition-all text-white"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" 
            placeholder="Password" 
            required
            className="w-full p-4 bg-slate-900 rounded-xl border border-slate-700 outline-none focus:border-blue-500 transition-all text-white"
            onChange={(e) => setPassword(e.target.value)}
          />
          
          <button 
            type="submit"
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold uppercase tracking-widest transition-all shadow-lg shadow-blue-900/40"
          >
            {isRegistering ? 'Registrati' : 'Accedi'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          {isRegistering ? 'Hai già un account?' : 'Nuovo della lega?'} {' '}
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-blue-400 font-bold hover:underline"
          >
            {isRegistering ? 'Accedi qui' : 'Registrati ora'}
          </button>
        </p>
      </div>
    </div>
  );
}