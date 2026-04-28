import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

import supabase from '../backend/database/db.js';

async function analyze() {
  console.log('--- Fetching Events ---');
  const { data: events, error: eventErr } = await supabase
    .from('events')
    .select('eventId, eventName, status');

  if (eventErr) {
    console.error('Event Error:', eventErr);
    return;
  }

  console.log('--- Fetching Ticket Types (Capacity) ---');
  const { data: ticketTypes, error: ttErr } = await supabase
    .from('ticketTypes')
    .select('eventId, ticketTypeId, name, capacity_per_ticket, quantity');

  if (ttErr) {
    console.error('Ticket Type Error:', ttErr);
  }

  console.log('--- Fetching Tickets Sold ---');
  const { data: tickets, error: ticketErr } = await supabase
    .from('tickets')
    .select('eventId, ticketId, status');

  if (ticketErr) {
    console.error('Ticket Error:', ticketErr);
  }

  console.log('--- Fetching Likes ---');
  const { data: likes, error: likeErr } = await supabase
    .from('eventLikes')
    .select('eventId');

  if (likeErr) {
    // Try lowercase variant
    const { data: likes2, error: likeErr2 } = await supabase
      .from('eventlikes')
      .select('eventId');
    if (likeErr2) {
      console.error('Like Error:', likeErr2);
    } else {
      processLikes(likes2);
    }
  } else {
    processLikes(likes);
  }

  function processLikes(likesData) {
    const results = events.map(event => {
      const eventId = event.eventId;
      const name = event.eventName;

      const eventLikes = (likesData || []).filter(l => l.eventId === eventId).length;
      const eventTicketsSold = (tickets || []).filter(t => t.eventId === eventId && (t.status === 'ISSUED' || t.status === 'USED' || t.status === 'active')).length;

      const eventTicketTypes = (ticketTypes || []).filter(tt => tt.eventId === eventId);
      // Try both capacity_per_ticket and quantity as capacity
      const totalCapacity = eventTicketTypes.reduce((sum, tt) => sum + (tt.capacity_per_ticket || tt.quantity || 0), 0);

      return {
        name,
        likes: eventLikes,
        sold: eventTicketsSold,
        capacity: totalCapacity
      };
    });

    console.log('ANALYSIS_DATA_START');
    console.log(JSON.stringify(results, null, 2));
    console.log('ANALYSIS_DATA_END');
  }

  process.exit(0);
}

analyze();
