# Order Routes Documentation

This directory contains three separate route files for order management:

## 1. AdminOrderManagement.js
**Base URL:** `/api/admin-orders`
**Middleware:** AdminRoute (admin authentication required)

### Routes:
- `GET /` - Get all orders
- `GET /statistics` - Get order statistics (total orders, revenue, etc.)
- `GET /:id` - Get specific order by ID
- `PUT /:id/status` - Update order status
- `DELETE /:id` - Delete order

### Usage Example:
```javascript
// Get all orders (admin only)
GET /api/admin-orders

// Update order status (admin only)
PUT /api/admin-orders/64f1a2b3c4d5e6f7g8h9i0j1/status
Body: { "status": "shipped", "trackingMessage": "Order shipped via FedEx" }
```

## 2. OrderTracking.js
**Base URL:** `/api/order-tracking`
**Middleware:** ProtectRoute (user authentication required)

### Routes:
- `GET /my-orders` - Get current user's orders
- `GET /track/:id` - Track specific order (returns tracking info)
- `GET /:id` - Get order details
- `POST /create-from-cart` - Create order from cart
- `PUT /:id/cancel` - Cancel order

### Usage Example:
```javascript
// Get user's orders
GET /api/order-tracking/my-orders

// Track specific order
GET /api/order-tracking/track/64f1a2b3c4d5e6f7g8h9i0j1

// Cancel order
PUT /api/order-tracking/64f1a2b3c4d5e6f7g8h9i0j1/cancel
```

## 3. Order.js (Legacy)
**Base URL:** `/api/orders`
**Middleware:** ProtectRoute (user authentication required)

### Routes (kept for backward compatibility):
- `GET /my` - Get current user's orders
- `GET /:id` - Get order by ID
- `POST /from-cart` - Create order from cart

## Middleware Usage:

### AdminRoute
- Used for admin-only operations
- Validates admin authentication token
- Applied to all routes in AdminOrderManagement.js

### ProtectRoute
- Used for user authentication
- Validates user authentication token
- Checks if user account is not banned
- Applied to all routes in OrderTracking.js and Order.js

## Order Status Flow:
1. `pending` - Order created but not confirmed
2. `confirmed` - Order confirmed by admin
3. `packed` - Order packed and ready for shipping
4. `shipped` - Order shipped to customer
5. `out-for-delivery` - Order is out for delivery
6. `delivered` - Order delivered to customer
7. `cancelled` - Order cancelled

## Security Notes:
- Admin routes require AdminRoute middleware
- User routes require ProtectRoute middleware
- Users can only access their own orders
- Admins can access all orders
- Order cancellation is only allowed for pending/confirmed/packed orders