/**
 * Next.js Instrumentation - Se ejecuta automáticamente al iniciar el servidor
 * Aquí arrancamos el IPTV Guardian en segundo plano
 *
 * Este archivo es el punto de entrada para procesos que corren en "las sombras"
 * El Guardian se inicia sin interacción del usuario y mantiene los canales actualizados
 */

export async function register() {
  // Solo ejecutar en el servidor (Node.js runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      // Importar dinámicamente para no bloquear el arranque de Next.js
      const { startGuardianScheduler } = await import('@/lib/guardian/scheduler');
      startGuardianScheduler();
      console.log('[Instrumentation] Guardian scheduler started successfully');
    } catch (err) {
      console.error('[Instrumentation] Failed to start Guardian scheduler:', err);
    }
  }
}
