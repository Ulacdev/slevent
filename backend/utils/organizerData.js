import supabase from '../database/db.js';

export function isMissingColumnError(error, columnName) {
  const code = error?.code || '';
  if (code === '42703' || code === 'PGRST204') return true;

  if (!error?.message) return false;
  return error.message.includes(`column "${columnName}"`);
}

export function isMissingRelationError(error, relationName) {
  const code = error?.code || '';
  if (code === '42P01' || code === 'PGRST205') return true;

  const message = String(error?.message || '').toLowerCase();
  if (!message) return false;

  const tableToken = String(relationName || '').toLowerCase();
  const mentionsTable =
    message.includes(`relation "${tableToken}"`) ||
    message.includes(`relation "public.${tableToken}"`) ||
    message.includes(`table '${tableToken}'`) ||
    message.includes(`table 'public.${tableToken}'`) ||
    message.includes(tableToken);

  if (!mentionsTable) return false;
  return (
    message.includes('does not exist') ||
    message.includes('could not find the table')
  );
}

export function isOrganizerTableMissingError(error) {
  return isMissingRelationError(error, 'organizers');
}

export function serializeOrganizerRecord(record, eventsHostedCount = 0, recentFollowers = [], likesCount = 0) {
  if (!record) return null;
  return {
    ...record,
    followersCount: Number.isFinite(Number(record.followersCount))
      ? Number(record.followersCount)
      : 0,
    eventsHostedCount: Number.isFinite(Number(eventsHostedCount))
      ? Number(eventsHostedCount)
      : 0,
    likesCount: Number.isFinite(Number(likesCount))
      ? Number(likesCount)
      : 0,
    recentFollowers: Array.isArray(recentFollowers) ? recentFollowers : [],
  };
}

function isPublishedEvent(eventRow) {
  const normalizedStatus = String(eventRow?.status || '').trim().toUpperCase();
  return ['PUBLISHED', 'LIVE', 'COMPLETED'].includes(normalizedStatus);
}

async function findUserById(userId) {
  let { data, error } = await supabase
    .from('users')
    .select('userId, name, email')
    .eq('userId', userId)
    .maybeSingle();

  if ((!data && !error) || isMissingColumnError(error, 'userId')) {
    const fallback = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', userId)
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  return data || null;
}

export async function getEventsHostedCounts(organizerIds = []) {
  const countMap = new Map();
  const uniqueIds = [...new Set((organizerIds || []).filter(Boolean))];
  if (uniqueIds.length === 0) return countMap;

  // Primary count source: events explicitly linked to organizerId.
  let { data, error } = await supabase
    .from('events')
    .select('eventId, organizerId, status')
    .in('organizerId', uniqueIds);

  let hasStatusColumn = true;
  if (error && isMissingColumnError(error, 'status')) {
    hasStatusColumn = false;
    const fallback = await supabase
      .from('events')
      .select('eventId, organizerId')
      .in('organizerId', uniqueIds);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    if (isMissingColumnError(error, 'organizerId')) return countMap;
    throw error;
  }

  for (const event of data || []) {
    if (!event?.organizerId) continue;
    if (!isPublishedEvent(event)) continue;
    countMap.set(event.organizerId, (countMap.get(event.organizerId) || 0) + 1);
  }

  // Fallback for legacy rows: organizer-owned events where organizerId was not set.
  const { data: organizerRows, error: organizerError } = await supabase
    .from('organizers')
    .select('organizerId, ownerUserId')
    .in('organizerId', uniqueIds);
  if (organizerError) throw organizerError;

  const ownerToOrganizerId = new Map();
  for (const organizer of organizerRows || []) {
    if (!organizer?.ownerUserId || !organizer?.organizerId) continue;
    ownerToOrganizerId.set(organizer.ownerUserId, organizer.organizerId);
  }

  const ownerUserIds = [...new Set([...ownerToOrganizerId.keys()].filter(Boolean))];
  if (ownerUserIds.length === 0) return countMap;

  let { data: legacyEvents, error: legacyError } = await supabase
    .from('events')
    .select('eventId, organizerId, createdBy, status')
    .in('createdBy', ownerUserIds);

  if (legacyError) {
    if (isMissingColumnError(legacyError, 'createdBy')) return countMap;
    throw legacyError;
  }

  for (const event of legacyEvents || []) {
    // If organizerId is already present, it was counted above.
    if (event?.organizerId) continue;
    if (!event?.createdBy) continue;
    if (!isPublishedEvent(event)) continue;

    const organizerId = ownerToOrganizerId.get(event.createdBy);
    if (!organizerId) continue;
    countMap.set(organizerId, (countMap.get(organizerId) || 0) + 1);
  }

  return countMap;
}

/**
 * Aggregates total likes from all events owned by an organizer.
 */
export async function getOrganizersTotalLikes(organizerIds = []) {
  const likeMap = new Map();
  const uniqueIds = [...new Set((organizerIds || []).filter(Boolean))];
  if (uniqueIds.length === 0) return likeMap;

  // 1. Get all events for these organizers
  // We include createdBy for legacy fallback
  const { data: organizers } = await supabase
    .from('organizers')
    .select('organizerId, ownerUserId')
    .in('organizerId', uniqueIds);
  
  const ownerToOrg = new Map((organizers || []).map(o => [o.ownerUserId, o.organizerId]));
  const owners = [...ownerToOrg.keys()].filter(Boolean);

  const { data: events, error } = await supabase
    .from('events')
    .select('eventId, organizerId, createdBy, status')
    .or(`organizerId.in.(${uniqueIds.join(',')}),createdBy.in.(${owners.join(',')})`);

  if (error || !events) return likeMap;

  const publishedEvents = events.filter(e => isPublishedEvent(e));
  const publishedEventIds = publishedEvents.map(e => e.eventId);
  
  if (publishedEventIds.length === 0) return likeMap;

  // 2. Get likes for these events
  const { data: likes } = await supabase
    .from('eventLikes') // Try standard table first
    .select('eventId')
    .in('eventId', publishedEventIds);

  let finalLikes = likes;
  if (!finalLikes) {
    const { data: likes2 } = await supabase.from('eventlikes').select('eventId').in('eventId', publishedEventIds);
    finalLikes = likes2;
  }

  if (finalLikes) {
    for (const l of finalLikes) {
      const eventId = l.eventId || l.eventid;
      const event = publishedEvents.find(e => e.eventId === eventId);
      const orgId = event?.organizerId || (event?.createdBy ? ownerToOrg.get(event.createdBy) : null);
      if (orgId) likeMap.set(orgId, (likeMap.get(orgId) || 0) + 1);
    }
  }

  return likeMap;
}

export async function getOrganizerByOwnerUserId(ownerUserId) {
  if (!ownerUserId) return null;

  // Try fetching with join first
  let { data, error } = await supabase
    .from('organizers')
    .select('*, plan:plans(*)')
    .eq('ownerUserId', ownerUserId)
    .maybeSingle();

  // If join fails due to missing relationship in cache, fetch just the organizer
  if (error && error.code === 'PGRST200') {
    const fallback = await supabase
      .from('organizers')
      .select('*')
      .eq('ownerUserId', ownerUserId)
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    if (isOrganizerTableMissingError(error)) return null;
    throw error;
  }
  if (!data) return null;

  // If plan is missing (even though join was attempted or fallback used), fetch it manually
  if (!data.plan && data.currentPlanId) {
    const { data: planData } = await supabase
      .from('plans')
      .select('*')
      .eq('planId', data.currentPlanId)
      .maybeSingle();
    data.plan = planData;
  }

  const counts = await getEventsHostedCounts([data.organizerId]);
  return serializeOrganizerRecord(data, counts.get(data.organizerId) || 0);
}

/**
 * Gets organizer details for ANY user (Owner or Staff).
 * If the user is a staff member, it looks up their employer's organizer record.
 */
export async function getOrganizerByUserId(userId) {
  if (!userId) return null;

  // 1. Try if user is an owner
  const byOwner = await getOrganizerByOwnerUserId(userId);
  if (byOwner) return byOwner;

  // 2. Try if user is staff (fetch employerId)
  // Logic: Some tables use "userId" column, others "id".
  let userQuery = await supabase
    .from('users')
    .select('employerId')
    .eq('userId', userId)
    .maybeSingle();

  if (!userQuery.data && !userQuery.error) {
    userQuery = await supabase
      .from('users')
      .select('employerId')
      .eq('id', userId)
      .maybeSingle();
  }

  if (userQuery.data?.employerId) {
    return getOrganizerByOwnerUserId(userQuery.data.employerId);
  }

  return null;
}

export async function getOrganizerWithStatsById(organizerId) {
  if (!organizerId) return null;

  // Try fetching with join first
  let { data, error } = await supabase
    .from('organizers')
    .select('*, plan:plans(*)')
    .eq('organizerId', organizerId)
    .maybeSingle();

  // If join fails due to missing relationship in cache, fetch just the organizer
  if (error && error.code === 'PGRST200') {
    const fallback = await supabase
      .from('organizers')
      .select('*')
      .eq('organizerId', organizerId)
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    if (isOrganizerTableMissingError(error)) return null;
    throw error;
  }
  if (!data) return null;

  // If plan is missing (even though join was attempted or fallback used), fetch it manually
  if (!data.plan && data.currentPlanId) {
    const { data: planData } = await supabase
      .from('plans')
      .select('*')
      .eq('planId', data.currentPlanId)
      .maybeSingle();
    data.plan = planData;
  }

  const counts = await getEventsHostedCounts([organizerId]);
  return serializeOrganizerRecord(data, counts.get(organizerId) || 0);
}

export async function getOrCreateOrganizerForUser(ownerUserId) {
  if (!ownerUserId) return null;

  const existing = await getOrganizerByOwnerUserId(ownerUserId);
  if (existing?.organizerId) return existing;

  const user = await findUserById(ownerUserId);
  const fallbackName =
    (user?.name && String(user.name).trim()) ||
    (user?.email && String(user.email).split('@')[0]) ||
    'Organizer';

  const payload = {
    ownerUserId,
    organizerName: fallbackName,
    emailOptIn: false,
    followersCount: 0,
    subscriptionStatus: 'pending',
    currentPlanId: null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('organizers')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    if (isOrganizerTableMissingError(error)) return null;
    // Race-safe fallback if another request created the same organizer first.
    if (error.code === '23505') {
      return getOrganizerByOwnerUserId(ownerUserId);
    }
    throw error;
  }

  return serializeOrganizerRecord(data, 0);
}

export async function enrichEventsWithOrganizer(events = []) {
  if (!Array.isArray(events) || events.length === 0) return [];

  const explicitOrganizerIds = [...new Set(events.map((event) => event?.organizerId).filter(Boolean))];
  const fallbackOwnerIds = [...new Set(
    events
      .filter((event) => !event?.organizerId && event?.createdBy)
      .map((event) => event.createdBy)
      .filter(Boolean)
  )];

  const organizerById = new Map();
  const organizerByOwner = new Map();

  if (explicitOrganizerIds.length > 0) {
    const { data, error } = await supabase
      .from('organizers')
      .select('*')
      .in('organizerId', explicitOrganizerIds);

    if (error && !isMissingRelationError(error, 'organizers')) throw error;
    for (const row of data || []) {
      organizerById.set(row.organizerId, row);
    }
  }

  if (fallbackOwnerIds.length > 0) {
    const { data, error } = await supabase
      .from('organizers')
      .select('*')
      .in('ownerUserId', fallbackOwnerIds);

    if (error && !isMissingRelationError(error, 'organizers')) throw error;
    for (const row of data || []) {
      organizerByOwner.set(row.ownerUserId, row);
      organizerById.set(row.organizerId, row);
    }
  }

  const counts = await getEventsHostedCounts([...organizerById.keys()]);

  return events.map((event) => {
    let organizer = null;
    let organizerId = event.organizerId || null;

    if (organizerId && organizerById.has(organizerId)) {
      const row = organizerById.get(organizerId);
      organizer = serializeOrganizerRecord(row, counts.get(row.organizerId) || 0);
    } else if (!organizerId && event?.createdBy && organizerByOwner.has(event.createdBy)) {
      const row = organizerByOwner.get(event.createdBy);
      organizer = serializeOrganizerRecord(row, counts.get(row.organizerId) || 0);
      organizerId = row.organizerId;
    }

    return {
      ...event,
      organizerId,
      organizer,
    };
  });
}
