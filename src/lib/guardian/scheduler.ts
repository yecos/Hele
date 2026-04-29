/**
 * IPTV Guardian - Programador de tareas automáticas
 * Se inicia automáticamente con Next.js (instrumentation.ts)
 * 
 * Tareas programadas:
 * - 06:00 AM → Escaneo de validación de canales
 * - 12:00 PM → Escaneo de validación + Búsqueda web de nuevas fuentes
 * - 06:00 PM → Escaneo de validación de canales
 * - 03:00 AM → Búsqueda web de nuevas fuentes (horario de baja actividad)
 */

import cron from 'node-cron';
import { runFullScan } from './scanner';
import { runDiscovery } from './discovery';

let scheduledTasks: cron.ScheduledTask[] = [];
let initialized = false;

export function startGuardianScheduler() {
  if (initialized) {
    console.log('[Guardian] Scheduler ya está inicializado');
    return;
  }

  initialized = true;
  console.log('[Guardian] Iniciando scheduler automático...');
  console.log('[Guardian] Tareas:');
  console.log('  - 06:00 AM: Escaneo de validación');
  console.log('  - 12:00 PM: Escaneo + Descubrimiento web');
  console.log('  - 06:00 PM: Escaneo de validación');
  console.log('  - 03:00 AM: Descubrimiento web (busca nuevas fuentes)');
  console.log('[Guardian] Zona horaria: America/Bogota');

  // Escaneo de las 6:00 AM - actualización matutina
  const morningTask = cron.schedule('0 6 * * *', async () => {
    console.log('[Guardian] Escaneo programado de las 6:00 AM...');
    await runFullScan('scheduled');
  }, { timezone: 'America/Bogota' });

  // Mediodía: escaneo + descubrimiento
  const noonTask = cron.schedule('0 12 * * *', async () => {
    console.log('[Guardian] Escaneo programado del mediodía...');
    await runFullScan('scheduled');
    console.log('[Discovery] Descubrimiento web programado del mediodía...');
    await runDiscovery('scheduled');
  }, { timezone: 'America/Bogota' });

  // Escaneo de las 6:00 PM - actualización vespertina
  const eveningTask = cron.schedule('0 18 * * *', async () => {
    console.log('[Guardian] Escaneo programado de las 6:00 PM...');
    await runFullScan('scheduled');
  }, { timezone: 'America/Bogota' });

  // Descubrimiento web a las 3 AM (baja actividad)
  const discoveryTask = cron.schedule('0 3 * * *', async () => {
    console.log('[Discovery] Descubrimiento web programado de las 3:00 AM...');
    await runDiscovery('scheduled');
    // Después de descubrir, escanear las nuevas fuentes
    console.log('[Guardian] Escaneo post-descubrimiento...');
    await runFullScan('scheduled');
  }, { timezone: 'America/Bogota' });

  scheduledTasks = [morningTask, noonTask, eveningTask, discoveryTask];

  console.log('[Guardian] 4 tareas programadas activas');
  console.log('[Guardian] El sistema validará y descubrirá canales automáticamente');

  // Escaneo inicial: 60 segundos después de iniciar
  setTimeout(async () => {
    console.log('[Guardian] Ejecutando escaneo inicial...');
    try {
      await runFullScan('scheduled');
    } catch (err) {
      console.error('[Guardian] Error en escaneo inicial:', err);
    }

    // Primer descubrimiento web 3 minutos después
    setTimeout(async () => {
      console.log('[Discovery] Primer descubrimiento web...');
      try {
        await runDiscovery('scheduled');
      } catch (err) {
        console.error('[Discovery] Error en primer descubrimiento:', err);
      }
    }, 180_000); // 3 min después
  }, 60_000); // 1 min después del arranque
}

export function stopGuardianScheduler() {
  for (const task of scheduledTasks) {
    task.stop();
  }
  scheduledTasks = [];
  initialized = false;
  console.log('[Guardian] Scheduler detenido');
}

export function getSchedulerStatus() {
  return {
    initialized,
    activeTasks: scheduledTasks.length,
    tasks: [
      { name: 'Mañana (6:00 AM)', cron: '0 6 * * *', type: 'scan' },
      { name: 'Mediodía (12:00 PM)', cron: '0 12 * * *', type: 'scan+discovery' },
      { name: 'Tarde (6:00 PM)', cron: '0 18 * * *', type: 'scan' },
      { name: 'Madrugada (3:00 AM)', cron: '0 3 * * *', type: 'discovery+scan' },
    ],
  };
}
