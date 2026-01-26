# BTS Delivery - Performance & Bug Fix Implementation Plan

## Priority 1: Critical Bugs

### 1.1 Completed Orders Not Loading
**Location:** `client/src/pages/customer/customer-orders.tsx`
**Issue:** Past/completed orders tab shows no data
**Tasks:**
- [ ] Check if orders API returns completed orders (`status: delivered, cancelled`)
- [ ] Verify frontend filtering logic in `pastOrders` filter (line ~315)
- [ ] Check if `getOrdersByCustomer` in storage.ts returns all statuses
- [ ] Add console logging to debug API response vs filtered results
- [ ] Test with actual completed orders in database

### 1.2 WebSocket Constant Disconnections (1006 errors)
**Location:** `server/routes.ts` (WebSocketManager), `client/src/hooks/use-websocket.ts`
**Issue:** Clients connect/disconnect rapidly, causing performance issues
**Tasks:**
- [ ] Check WebSocket heartbeat/ping configuration
- [ ] Add reconnection backoff strategy
- [ ] Check if nginx proxy timeout is too short
- [ ] Review WebSocket path `/ws/v2` configuration
- [ ] Add proper connection error handling

---

## Priority 2: Performance Optimization

### 2.1 Install and Configure Redis
**Commands to run:**
```bash
apt update && apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server
```
**Then verify in app:** Check `/root/bts/btsdeliveryapp/server/services/cache.ts` connects properly

### 2.2 Reduce API Calls on Page Load
**Location:** Various customer pages
**Tasks:**
- [ ] Audit API calls on cart.tsx - currently makes 8+ calls on load
- [ ] Implement request batching where possible
- [ ] Add stale-while-revalidate caching strategy
- [ ] Reduce refetch intervals for non-critical data

### 2.3 Optimize Bundle Size
**Current:** index.js ~476KB gzipped
**Tasks:**
- [ ] Analyze bundle with `npm run build -- --analyze`
- [ ] Check for duplicate dependencies
- [ ] Lazy load heavy components (maps, charts)
- [ ] Tree-shake unused code

### 2.4 Image Optimization
**Location:** Restaurant images, menu item images
**Tasks:**
- [ ] Add lazy loading for images below fold
- [ ] Implement responsive image srcset
- [ ] Consider WebP format with fallback

---

## Priority 3: Code Quality

### 3.1 Fix TypeScript Errors (if any)
- [ ] Run `npx tsc --noEmit` to check for type errors
- [ ] Fix any strict mode violations

### 3.2 Clean Up Console Logs
- [ ] Remove debug console.log statements in production code
- [ ] Use proper logger with log levels

---

## Testing Checklist

After fixes, verify:
- [ ] Orders page loads with both active and completed orders
- [ ] WebSocket stays connected without rapid reconnects
- [ ] Page navigation is smooth (<1s transition)
- [ ] Cart page loads fully on first visit
- [ ] Payment amount matches cart total exactly

---

## Commands Reference

```bash
# Build and restart
cd /root/bts/btsdeliveryapp && npm run build && pm2 restart bts-delivery

# Check logs
pm2 logs bts-delivery --lines 50

# Check Redis
redis-cli ping

# Database check for completed orders
psql -U postgres -d bts_delivery -c "SELECT id, status FROM orders WHERE status IN ('delivered', 'cancelled') LIMIT 5;"
```
