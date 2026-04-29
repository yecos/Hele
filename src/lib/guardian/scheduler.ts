/**
 * IPTV Guardian - Programador de tareas automáticas
 * Se inicia automáticamente con Next.js (instrumentation.ts)
 * Ejecuta el escaneo 2 veces al día: 6:00 AM y 6:00 PM (hora de Bogotá)
 */

import cron from 'node-cron';
import { runFullScan } from './scanner';

let scheduledTasks: cron.ScheduledTask[] = [];
let initialized = false;

/**
 * Inicia el programador del Guardian.
 * Los horarios usan la hora de Bogotá (America/Bogota).
 *
 * Escaneos programados:
 * - 06:00 AM → Refresca canales para la mañana
 * - 06:00 PM → Refresca canales para la tarde/noche
 * - 12:00 PM (mediodía) → Verificación adicional
 */
export function startGuardianScheduler() {
  if (initialized) {
    console.log('[Guardian] Scheduler ya está inicializado');
    return;
  }

  initialized = true;
  console.log('[Guardian] Iniciando scheduler automático...');
  console.log('[Guardian] Horarios: 06:00 AM, 12:00 PM, 06:00 PM (America/Bogota)');

  // Escaneo de las 6:00 AM - actualización matutina
  const morningTask = cron.schedule('0 6 * * *', async () => {
    console.log('[Guardian] Ejecutando escaneo programado de las 6:00 AM...');
    await runFullScan('scheduled');
  }, {
    timezone: 'America/Bogota',
  });

  // Escaneo del mediodía - verificación adicional
  const noonTask = cron.schedule('0 12 * * *', async () => {
    console.log('[Guardian] Ejecutando escaneo programado del mediodía...');
    await runFullScan('scheduled');
  }, {
    timezone: 'America/Bogota',
  });

  // Escaneo de las 6:00 PM - actualización vespertina
  const eveningTask = cron.schedule('0 18 * * *', async () => {
    console.log('[Guardian] Ejecutando escaneo programado de las 6:00 PM...');
    await runFullScan('scheduled');
  }, {
    timezone: 'America/Bogota',
  });

  scheduledTasks = [morningTask, noonTask, eveningTask];

  console.log('[Guardian] 3 tareas programadas activas');
  console.log('[Guardian] El sistema validará canales en segundo plano sin intervención del usuario');

  // Escaneo inicial: se ejecuta 60 segundos después de iniciar (para no bloquear el arranque)
  setTimeout(async () => {
    console.log('[Guardian] Ejecutando escaneo inicial...');
    try {
      await runFullScan('scheduled');
    } catch (err) {
      console.error('[Guardian] Error en escaneo inicial:', err);
    }
  }, 60_000); // 1 minuto después del arranque
}

/**
 * Detiene todas las tareas programadas
 */
export function stopGuardianScheduler() {
  for (const task of scheduledTasks) {
    task.stop();
  }
  scheduledTasks = [];
  initialized = false;
  console.log('[Guardian] Scheduler detenido');
}

/**
 * Obtiene el estado de las tareas programadas
 */
export function getSchedulerStatus() {
  return {
    initialized,
    activeTasks: scheduledTasks.length,
    tasks: [
      { name: 'Mañana (6:00 AM)', cron: '0 6 * * *', timezone: 'America/Bogota' },
      { name: 'Mediodía (12:00 PM)', cron: '0 12 * * *', timezone: 'America/Bogota' },
      { name: 'Tarde (6:00 PM)', cron: '0 18 * * *', timezone: 'America/Bogota' },
    ],
  };
}
