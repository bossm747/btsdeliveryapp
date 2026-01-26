# BTS Delivery Frontend: Migrating Order Tracking from Polling to WebSocket

## Overview
This guide explains how to convert the order tracking feature in the BTS Delivery frontend from HTTP polling to real-time updates using WebSockets.

## Current Polling Implementation
- The  component uses React Query's  to fetch order status:
  /api/orders//tracking
- This means the frontend requests the order status every 30 seconds.

## Why Switch to WebSocket?
- WebSockets provide instant updates, reducing server load and improving user experience.
- No need to wait for the next poll—order status changes are pushed in real time.

## WebSocket Endpoint
- Use the following endpoint for order tracking:
  
  Replace  with the actual order ID.

## Migration Steps

### 1. Remove Polling Logic
- Remove or set  to  in the  hook:
  /api/orders//tracking
- Optionally, keep the initial fetch for first load, but rely on WebSocket for updates.

### 2. Establish WebSocket Connection
- Use the native WebSocket API or a library (e.g., ).
- Example using native WebSocket:
  ws://server/subscribe/orders/

### 3. Handle Incoming Messages
- The server will push order status updates as JSON.
- Update your component state accordingly.

### 4. Update UI State
- Use the received data to update the UI in real time (e.g., order status, timeline, rider location).

### 5. Authentication (If Required)
- If the WebSocket server requires authentication, send a JWT or token after connecting:
  

### 6. Fallback (Optional)
- Optionally, keep polling as a fallback if the WebSocket disconnects.

## Example Migration Diff


## References
- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [React useEffect docs](https://react.dev/reference/react/useEffect)

