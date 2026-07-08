'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass }),
      });
      if (res.ok) {
        router.push('/admin');
      } else {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? 'Contraseña incorrecta');
        setPass('');
      }
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-dark flex flex-col items-center justify-center px-4 gap-6">
      <Image
        src="/images/logo.png"
        alt="Logo Almacén"
        width={80}
        height={80}
        className="object-contain"
      />
      <h1 className="font-serif text-white text-3xl font-bold text-center">
        Panel de Administración
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
        <input
          type="password"
          placeholder="Contraseña"
          value={pass}
          onChange={(e) => { setPass(e.target.value); setError(''); }}
          className="px-4 py-3 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
          autoFocus
          disabled={loading}
        />
        {error && (
          <p className="text-red-300 text-sm text-center">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="bg-white text-primary-dark font-semibold py-3 rounded-md hover:bg-gray-100 disabled:opacity-60 transition-colors"
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
