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
 * Run a single SLA check with timeout protection
 */
async function runSlaCheck(): Promise<void> {
  const SLA_CHECK_TIMEOUT_MS = 30000; // 30 second timeout

  try {
    // Add timeout protection to prevent indefinite hangs
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('SLA check timed out after 30 seconds')), SLA_CHECK_TIMEOUT_MS);
    });

    await Promise.race([
      dispatchService.monitorSLABreaches(),
      timeoutPromise
    ]);
  } catch (error) {
    if (error instanceof Error && error.message.includes('timed out')) {
      console.error('[SlaMonitorJob] SLA check timed out - consider optimizing queries');
    } else {
      console.error('[SlaMonitorJob] Error during SLA check:', error);
    }
    // Don't rethrow - let the next interval try again
  }
}

/**
 * Manually trigger an SLA check
 */
export async function triggerSlaCheck(): Promise<void> {
  console.log('[SlaMonitorJob] Manual SLA check triggered');
  await runSlaCheck();
}
