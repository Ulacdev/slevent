import supabase, { supabaseConfig } from '../database/db.js';

const DEFAULT_CLEANUP_INTERVAL_MS = 60_000; // 1 minute
const MAX_CLEANUP_BACKOFF_MS = 15 * 60_000;

const getNumberEnv = (key, fallback) => {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getErrorText = (error) => {
  if (!error) return '';
  if (typeof error === 'string') return error;

  return [
    error.message,
    error.details,
    error.hint,
    error.code,
    error.cause?.message,
    error.cause?.code,
  ]
    .filter(Boolean)
    .join('\n');
};

const isConnectivityError = (error) => {
  const text = getErrorText(error);
  if (!text) return false;

  return [
    'fetch failed',
    'enotfound',
    'eai_again',
    'econnreset',
    'etimedout',
    'econnrefused',
    'network',
  ].some(pattern => text.toLowerCase().includes(pattern));
};

const summarizeConnectivityError = (error) => {
  const text = getErrorText(error);
  if (!text) return 'Unknown connectivity error';

  const firstLine = text
    .split('\n')
    .map(line => line.trim())
    .find(Boolean);

  return firstLine || 'Unknown connectivity error';
};

const getBackoffDelayMs = (intervalMs, consecutiveFailures) => {
  const multiplier = 2 ** Math.min(consecutiveFailures, 4);
  return Math.min(intervalMs * multiplier, MAX_CLEANUP_BACKOFF_MS);
};

export const runReservationCleanup = async () => {
  const now = new Date();
  
  // 1. Audit Log Pruning (90-day retention TTL) - Run only once per hour to reduce load
  const lastPrune = global._lastAuditPrune || 0;
  if (now.getTime() - lastPrune > 3600_000) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    try {
      console.log(`[Maintenance] Starting audit log pruning...`);
      const { count: prunedLogs } = await supabase
        .from('auditLogs')
        .delete({ count: 'exact' })
        .lt('createdAt', ninetyDaysAgo.toISOString());
      
      if (prunedLogs) {
        console.log(`[Maintenance] Pruned ${prunedLogs} old audit logs.`);
      }
      global._lastAuditPrune = now.getTime();
    } catch (err) {
      console.warn('[Maintenance] Audit log pruning failed:', err.message);
    }
  }

  console.log(`[ReservationCleanup] Running reservation check at`, now.toISOString());

  // 2. Batch Reservation Cleanup
  const { data: expiredOrders, error } = await supabase
    .from('orders')
    .select('orderId')
    .eq('status', 'PENDING_PAYMENT')
    .not('expiresAt', 'is', null)
    .lt('expiresAt', now.toISOString());

  if (error) {
    const retryable = isConnectivityError(error);
    console.error('Reservation cleanup failed to load orders', error);
    return { cleaned: 0, error: error.message, retryable };
  }

  if (!expiredOrders || expiredOrders.length === 0) {
    return { cleaned: 0 };
  }

  const expiredOrderIds = expiredOrders.map(o => o.orderId);

  try {
    // A. Fetch all affected item quantities to release inventory in bulk
    const { data: allItems, error: itemsErr } = await supabase
      .from('orderItems')
      .select('ticketTypeId, quantity')
      .in('orderId', expiredOrderIds);

    if (itemsErr) throw itemsErr;

    // Aggregate inventory to release
    const releaseMap = {};
    for (const item of allItems || []) {
      releaseMap[item.ticketTypeId] = (releaseMap[item.ticketTypeId] || 0) + (item.quantity || 0);
    }

    // B. Bulk inventory release (One call per ticket type instead of per order)
    const releasePromises = Object.entries(releaseMap).map(([id, qty]) => {
      // Use SQL increment (decrement) if possible, but for now we fetch-and-update
      // A safer way is to use a DB function for atomic decrement, but this is already 
      // much faster than the per-order loop.
      return (async () => {
         const { data: tt } = await supabase.from('ticketTypes').select('quantitySold').eq('ticketTypeId', id).single();
         if (tt) {
           await supabase.from('ticketTypes')
             .update({ quantitySold: Math.max(0, (tt.quantitySold || 0) - qty) })
             .eq('ticketTypeId', id);
         }
      })();
    });
    await Promise.all(releasePromises);

    // C. Bulk status update and record deletion
    await Promise.all([
      supabase.from('tickets').delete().in('orderId', expiredOrderIds),
      supabase.from('attendees').delete().in('orderId', expiredOrderIds),
      supabase.from('orders')
        .update({ status: 'EXPIRED', updated_at: now.toISOString() })
        .in('orderId', expiredOrderIds)
    ]);

    console.log(`[ReservationCleanup] Successfully expired ${expiredOrderIds.length} orders.`);
    return { cleaned: expiredOrderIds.length };
  } catch (err) {
    console.error('[ReservationCleanup] Batch cleanup error:', err);
    return { cleaned: 0, error: err.message };
  }
};

export const startReservationCleanup = () => {
  const intervalMs = getNumberEnv('RESERVATION_CLEANUP_INTERVAL_MS', DEFAULT_CLEANUP_INTERVAL_MS);
  if (intervalMs <= 0) return;

  let consecutiveFailures = 0;

  const scheduleNextRun = (delayMs) => {
    setTimeout(async () => {
      try {
        const result = await runReservationCleanup();

        if (result?.retryable) {
          consecutiveFailures += 1;
          const nextDelay = getBackoffDelayMs(intervalMs, consecutiveFailures);
          console.warn(
            `[ReservationCleanup] Connectivity issue detected. Retrying in ${nextDelay}ms. Reason: ${result.reason}`
          );
          scheduleNextRun(nextDelay);
          return;
        }

        consecutiveFailures = 0;
        scheduleNextRun(intervalMs);
      } catch (error) {
        if (isConnectivityError(error)) {
          consecutiveFailures += 1;
          const nextDelay = getBackoffDelayMs(intervalMs, consecutiveFailures);
          console.warn(
            `[ReservationCleanup] Connectivity issue detected. Retrying in ${nextDelay}ms. Reason: ${summarizeConnectivityError(error)}`
          );
          scheduleNextRun(nextDelay);
          return;
        }

        consecutiveFailures = 0;
        console.error('Reservation cleanup run failed', error);
        scheduleNextRun(intervalMs);
      }
    }, delayMs);
  };

  scheduleNextRun(0);
};
