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
  console.log(`[ReservationCleanup] Running cleanup at`, new Date().toISOString());
  const now = new Date();
  const { data: expiredOrders, error } = await supabase
    .from('orders')
    .select('orderId, expiresAt')
    .eq('status', 'PENDING_PAYMENT')
    .not('expiresAt', 'is', null)
    .lt('expiresAt', now.toISOString());

  if (error) {
    const retryable = isConnectivityError(error);

    if (retryable) {
      console.error(
        `[ReservationCleanup] Failed to reach Supabase (${supabaseConfig.host}) while loading expired orders: ${summarizeConnectivityError(error)}`
      );
    } else {
      console.error('Reservation cleanup failed to load orders', error);
    }

    return {
      cleaned: 0,
      error: error.message,
      retryable,
      reason: summarizeConnectivityError(error),
    };
  }

  if (!expiredOrders || expiredOrders.length === 0) {
    return { cleaned: 0 };
  }

  let cleaned = 0;

  for (const order of expiredOrders) {
    try {
      const { data: orderItems, error: itemsErr } = await supabase
        .from('orderItems')
        .select('ticketTypeId, quantity')
        .eq('orderId', order.orderId);

      if (itemsErr) {
        console.error('Reservation cleanup failed to load order items', order.orderId, itemsErr);
        continue;
      }

      const qtyByType = {};
      for (const item of orderItems || []) {
        qtyByType[item.ticketTypeId] = (qtyByType[item.ticketTypeId] || 0) + (item.quantity || 0);
      }

      const typeIds = Object.keys(qtyByType);
      if (typeIds.length) {
        const { data: ticketTypes, error: typesErr } = await supabase
          .from('ticketTypes')
          .select('ticketTypeId, quantitySold')
          .in('ticketTypeId', typeIds);

        if (typesErr) {
          console.error('Reservation cleanup failed to load ticket types', order.orderId, typesErr);
          continue;
        }

        for (const tt of ticketTypes || []) {
          const dec = qtyByType[tt.ticketTypeId] || 0;
          const newSold = Math.max(0, (tt.quantitySold || 0) - dec);
          const { error: updErr } = await supabase
            .from('ticketTypes')
            .update({ quantitySold: newSold })
            .eq('ticketTypeId', tt.ticketTypeId);
          if (updErr) {
            console.error('Reservation cleanup failed to update ticket type', order.orderId, updErr);
          }
        }
      }

      await supabase.from('tickets').delete().eq('orderId', order.orderId);
      await supabase.from('attendees').delete().eq('orderId', order.orderId);

      const { error: orderErr } = await supabase
        .from('orders')
        .update({ status: 'EXPIRED', updated_at: now.toISOString() })
        .eq('orderId', order.orderId);

      if (orderErr) {
        console.error('Reservation cleanup failed to update order', order.orderId, orderErr);
        continue;
      }

      cleaned += 1;
    } catch (err) {
      console.error('Reservation cleanup error', order.orderId, err);
    }
  }

  return { cleaned };
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
