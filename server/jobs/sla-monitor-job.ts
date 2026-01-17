/**
 * SLA Monitor Background Job
 *
 * Runs periodically to check for SLA breaches and auto-escalate orders.
 */

import { dispatchService } from '../services/dispatch-service';

let intervalId: NodeJS.Timeout | null = null;

// SLA monitoring interval in milliseconds (1 minute)
const SLA_MONITOR_INTERVAL = 60000;

/**
 * Start the SLA monitoring background job
 */
export function startSlaMonitor(): void {
  if (intervalId) {
    console.log('[SlaMonitorJob] Already running');
    return;
  }

  console.log('[SlaMonitorJob] Starting SLA monitor job');

  // Run immediately on start
  runSlaCheck();

  // Schedule periodic checks
  intervalId = setInterval(runSlaCheck, SLA_MONITOR_INTERVAL);
}

/**
 * Stop the SLA monitoring background job
 */
export function stopSlaMonitor(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[SlaMonitorJob] Stopped SLA monitor job');
  }
}

/**
 * Run a single SLA check
 */
async function runSlaCheck(): Promise<void> {
  try {
    await dispatchService.monitorSLABreaches();
  } catch (error) {
    console.error('[SlaMonitorJob] Error during SLA check:', error);
  }
}

/**
 * Manually trigger an SLA check
 */
export async function triggerSlaCheck(): Promise<void> {
  console.log('[SlaMonitorJob] Manual SLA check triggered');
  await runSlaCheck();
}
