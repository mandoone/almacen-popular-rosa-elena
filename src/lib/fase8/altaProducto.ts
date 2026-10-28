/** ID técnico determinista por actor + key; el lock del backend acredita unicidad/replay. */
export async function idProductoAutomatico(actor: string, key: string): Promise<string> {
  if (!actor || !/^[A-Za-z0-9_-]{8,120}$/.test(key)) throw new Error('Identidad de alta inválida.');
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${actor}\0${key}`));
  return `PROD-TEST-WEB-${Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('').slice(0, 32)}`;
}
