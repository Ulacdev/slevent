import supabase from '../database/db.js';
import { enrichEventsWithOrganizer } from '../utils/organizerData.js';
import { getEventLikeCountsMap } from './eventLikeController.js';

// Utility: filter events by registration window if provided
function withinRegistrationWindow(event) {
  const now = new Date();
  const open = event.regOpenAt ? new Date(event.regOpenAt) : null;
  const close = event.regCloseAt ? new Date(event.regCloseAt) : null;
  if (open && now < open) return false;
  if (close && now > close) return false;
  return true;
}

// Utility: filter ticket types by sales window if provided
function withinSalesWindow(tt) {
  const now = new Date();
  const start = tt.salesStartAt ? new Date(tt.salesStartAt) : null;
  const end = tt.salesEndAt ? new Date(tt.salesEndAt) : null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

// Utility: group ticketTypes by eventId
function attachTicketTypes(events, ticketTypes) {
  const map = new Map();
  for (const tt of ticketTypes) {
    const list = map.get(tt.eventId) || [];
    list.push(tt);
    map.set(tt.eventId, list);
  }
  return events.map(e => ({ ...e, ticketTypes: map.get(e.eventId) || [] }));
}

const UUID_V4_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function fetchEventByIdentifier(identifier) {
  const bySlug = await supabase
    .from('events')
    .select('*')
    .eq('slug', identifier)
    .limit(1);

  if (bySlug.error) return { error: bySlug.error, event: null };
  const slugEvent = (bySlug.data || [])[0];
  if (slugEvent) return { error: null, event: slugEvent };

  if (!UUID_V4_LIKE.test(identifier)) return { error: null, event: null };

  const byId = await supabase
    .from('events')
    .select('*')
    .eq('eventId', identifier)
    .limit(1);

  if (byId.error) return { error: byId.error, event: null };
  return { error: null, event: (byId.data || [])[0] || null };
}

export const listEvents = async (req, res) => {
  try {
    const status = (req.query.status || 'PUBLISHED').toString();
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').toString().trim();
    const location = (req.query.location || '').toString().trim();
    const organizerId = (req.query.organizerId || '').toString().trim();

    // 1) Fetch all events (optionally filter by status)
    let query = supabase.from('events').select('*');
    if (status) query = query.eq('status', status);
    if (organizerId) query = query.eq('organizerId', organizerId);

    // Detailed search filter
    if (search) {
      query = query.or(`eventName.ilike.%${search}%,locationText.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Explicit location filter
    if (location) {
      if (location === 'Online Events') {
        query = query.in('locationType', ['ONLINE', 'HYBRID']);
      } else {
        query = query.ilike('locationText', `%${location}%`);
      }
    }

    const { data: events, error: eventsError } = await query;
    if (eventsError) return res.status(500).json({ error: eventsError.message });

    // 2) Apply registration window filter, rank by likes, then paginate
    const filteredEvents = (events || []).filter(withinRegistrationWindow);
    const filteredEventIds = filteredEvents.map((event) => event.eventId).filter(Boolean);
    const allLikeCountMap = await getEventLikeCountsMap(filteredEventIds);
    const rankedEvents = [...filteredEvents].sort((a, b) => {
      const likeDiff = (allLikeCountMap.get(b.eventId) || 0) - (allLikeCountMap.get(a.eventId) || 0);
      if (likeDiff !== 0) return likeDiff;
      return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    });

    const total = rankedEvents.length;
    const totalPages = total ? Math.ceil(total / limit) : 1;
    const pagedEvents = rankedEvents.slice(offset, offset + limit);
    if (pagedEvents.length === 0) {
      return res.json({ events: [], pagination: { page, limit, total: 0, totalPages: 0 } });
    }

    // 3) Fetch ticket types for these events
    const eventIds = pagedEvents.map(e => e.eventId);
    const { data: ticketTypes, error: ttError } = await supabase
      .from('ticketTypes')
      .select('*')
      .eq('status', true)
      .in('eventId', eventIds);

    if (ttError) return res.status(500).json({ error: ttError.message });

    // 4) Fetch registration counts for these events (robust aggregation)
    let regCountMap = new Map();
    if (eventIds.length > 0) {
      const { data: attendees, error: regErr } = await supabase
        .from('attendees')
        .select('eventId')
        .in('eventId', eventIds);
      if (regErr) return res.status(500).json({ error: regErr.message });
      // Aggregate counts in JS
      for (const att of attendees || []) {
        regCountMap.set(att.eventId, (regCountMap.get(att.eventId) || 0) + 1);
      }
    }

    // 5) Filter ticket types by sales window, attach and return
    const usableTicketTypes = (ticketTypes || []).filter(withinSalesWindow);
    const withTicketTypes = attachTicketTypes(pagedEvents, usableTicketTypes).map((e) => ({
      ...e,
      registrationCount: regCountMap.get(e.eventId) || 0,
      likesCount: allLikeCountMap.get(e.eventId) || 0,
    }));
    const enrichedEvents = await enrichEventsWithOrganizer(withTicketTypes);

    return res.json({
      events: enrichedEvents,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};

export const getEventBySlug = async (req, res) => {
  try {
    const identifier = req.params.slug || req.params.id || req.params.identifier;

    // 1) Fetch event by slug first, then by eventId if identifier looks like UUID.
    const { event, error: eventError } = await fetchEventByIdentifier(identifier);
    if (eventError) return res.status(500).json({ error: eventError.message });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // 2) Fetch ticket types for this event
    const { data: ticketTypes, error: ttError } = await supabase
      .from('ticketTypes')
      .select('*')
      .eq('status', true)
      .eq('eventId', event.eventId);

    if (ttError) return res.status(500).json({ error: ttError.message });

    // 3) Filter by sales window, attach and return
    const usableTicketTypes = (ticketTypes || []).filter(withinSalesWindow);
    const likeCounts = await getEventLikeCountsMap([event.eventId]);
    const [enrichedEvent] = await enrichEventsWithOrganizer([{
      ...event,
      ticketTypes: usableTicketTypes,
      likesCount: likeCounts.get(event.eventId) || 0,
    }]);
    return res.json(enrichedEvent || {
      ...event,
      ticketTypes: usableTicketTypes,
      likesCount: likeCounts.get(event.eventId) || 0,
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
};
