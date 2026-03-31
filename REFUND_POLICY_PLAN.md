# Refund & Cancellation Technical Roadmap

This document outlines the proposed automation for event cancellations and refunds, based on the Eventbrite model. 

## 1. Industry Standard (The Eventbrite Model)
*   **Mandatory Refunds:** Cancellation of a paid event overrides any "No Refund" policy.
*   **Bulk Refund Tool:** Organizers can process all refunds with a single click.
*   **Payout Holds:** Platforms usually hold funds until after the event. *Note: Our platform facilitates faster payouts, making manual/automated refunds more critical for the organizer to manage.*

## 2. Current Implementation (v1)
*   **Smart Cancellation Modal:** Detects if an event has `PAID` transactions before allowing cancellation.
*   **Critical Warning:** Displays a manual refund warning to the organizer: *"You are responsible for manual refunds via your payment provider."*
*   **Attendee Notifications:** Automatically sends cancellation emails to all registered guests.
*   **Database Sync:** Automatically marks all tickets as `CANCELLED` to disable scannability at the venue.

## 3. Future Automation (v2 Goal)
To move from "Manual Warnings" to "Automated Refunds," we will need:

### A. HitPay API Integration
*   **Endpoint:** `POST /v1/refunds`
*   **Requirements:** 
    *   `payment_id` from the original transaction.
    *   `amount` to be refunded.
    *   HitPay API Keys (with Refund permissions enabled).

### B. "Refund All" Feature
*   **UI:** Add a "Refund All Orders" button inside the cancellation modal.
*   **Backend Logic:** 
    1.  Fetch all `PAID` orders for the event.
    2.  Loop through each order and trigger the HitPay refund API.
    3.  Update the `orders` status to `REFUNDED` and individual `tickets` to `REFUNDED`.
    4.  Log the outcome in the Audit Log for accounting.

## 4. Security Considerations
*   **Balance Check:** Refunds will fail if the organizer has $0 in the gateway. The system must handle these partial failures gracefully.
*   **Confirmation:** A final "Are you sure? You are about to return $[Amount] to attendees" dialog is mandatory.

---
*Created on: 2026-03-31*
