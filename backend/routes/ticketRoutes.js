import express from 'express';
import {
  listTickets,
  getTicketsByOrder,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket,
  checkInTicket,
  getRegistrationsByEvent,
  getAllRegistrations
} from '../controller/ticketController.js';
import { authMiddleware } from '../middleware/auth.js';


const router = express.Router();

// GET /api/tickets
router.get('/', authMiddleware, listTickets);

// GET /api/tickets/order/:orderId
router.get('/order/:orderId', getTicketsByOrder);

// GET /api/tickets/registrations?eventId=...
router.get('/registrations', authMiddleware, getRegistrationsByEvent);
// Admin: get all registrations across all events
router.get('/registrations-all', authMiddleware, getAllRegistrations);

// GET /api/tickets/:id (public)
router.get('/:id', getTicketById);

// POST /api/tickets
router.post('/', authMiddleware, createTicket);

// POST /api/tickets/checkin
router.post('/checkin', authMiddleware, checkInTicket);

// PUT /api/tickets/:id
router.put('/:id', authMiddleware, updateTicket);

// DELETE /api/tickets/:id
router.delete('/:id', authMiddleware, deleteTicket);

export default router;
