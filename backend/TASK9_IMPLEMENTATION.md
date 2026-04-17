# Task 9: WebSocket Real-Time Push Module Implementation

## Overview

This document describes the implementation of the WebSocket real-time push module for the QR Code Ordering System backend.

## Requirements

- **Requirement 5.2**: Push order status changes to related rooms (customer and merchant)
- **Requirement 5.3**: Order status updates should be pushed within 5 seconds
- **Requirement 6.1**: New orders should be pushed within 10 seconds to merchant

## Implementation

### 1. WebSocket Service (`app/service/websocket.ts`)

The WebSocket service manages merchant rooms and table rooms using Socket.IO.

#### Key Features:

- **Connection Authentication**:
  - Merchant side: Carries JWT Token for authentication
  - Customer side: Carries Session Token for authentication
  - Server validates tokens and joins clients to appropriate rooms

- **Room Management**:
  - Merchant Room: `merchant:{merchantId}` - All merchants join their own room
  - Table Room: `table:{tableId}` - Customers join the room for their table

- **Events**:
  - `order:status_changed`: Pushed to both customer (table room) and merchant room when order status changes
  - `order:new`: Pushed to merchant room only when a new paid order arrives

#### Methods:

1. **`initSocketIO(io: SocketIOServer)`**
   - Initializes the Socket.IO server
   - Sets up connection handlers
   - Called during application startup in `app.ts`

2. **`pushOrderStatusChanged(orderId, merchantId, tableId, status)`**
   - Pushes order status change events to:
     - Table room (customer side)
     - Merchant room (merchant side)
   - Requirement 5.2, 5.3

3. **`pushNewOrder(orderId, merchantId, tableNo, totalAmount)`**
   - Pushes new order arrival event to merchant room only
   - Requirement 6.1

### 2. Application Initialization (`app.ts`)

Socket.IO server is initialized in the `didReady()` lifecycle hook:

```typescript
async didReady() {
  // Initialize Socket.IO server
  const io = new SocketIOServer(this.app.server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Initialize WebSocket service with Socket.IO instance
  const ctx = this.app.createAnonymousContext();
  ctx.service.websocket.initSocketIO(io);

  // Store io instance on app for access in other parts
  (this.app as any).io = io;
}
```

### 3. Integration with Order Service

The order service calls WebSocket push methods when order status changes:

#### `updateOrderStatus()` method:

```typescript
// Push order status change via WebSocket (Requirement 5.2, 5.3)
try {
  await this.service.websocket.pushOrderStatusChanged(
    orderId,
    merchantId,
    order.table_id,
    newStatus,
  );
} catch (error) {
  this.ctx.logger.error('Failed to push order status change via WebSocket:', error);
  // Don't fail the request if WebSocket push fails
}
```

#### `cancelOrder()` method:

Similar WebSocket push when customer cancels an order.

### 4. Integration with Payment Service

The payment service pushes WebSocket events when payment is successful:

#### `handlePaymentNotify()` method:

```typescript
// Push order status change via WebSocket (Requirement 5.2, 5.3)
try {
  await this.service.websocket.pushOrderStatusChanged(
    order.id,
    order.merchant_id,
    order.table_id,
    '已支付',
  );
} catch (error) {
  this.ctx.logger.error('Failed to push order status change via WebSocket:', error);
}

// Push new order to merchant (Requirement 6.1)
try {
  const table: any = await this.app.model.Table.findOne({
    where: { id: order.table_id },
  });

  if (table) {
    await this.service.websocket.pushNewOrder(
      order.id,
      order.merchant_id,
      table.table_no,
      order.total_amount,
    );
  }
} catch (error) {
  this.ctx.logger.error('Failed to push new order via WebSocket:', error);
}
```

## WebSocket Connection Flow

### Merchant Connection:

1. Client connects with JWT Token in `auth.token`
2. Server verifies JWT Token
3. If valid, client joins `merchant:{merchantId}` room
4. Server emits `authenticated` event with `{ type: 'merchant', merchantId }`

### Customer Connection:

1. Client connects with Session Token in `auth.token`
2. Server validates Session Token via `session.validateSessionToken()`
3. If valid, client joins `table:{tableId}` room
4. Server emits `authenticated` event with `{ type: 'customer', tableId, sessionId }`

### Connection Rejection:

- No token provided: Emit `error` event and disconnect
- Invalid token: Emit `error` event and disconnect

## Event Payloads

### `order:status_changed` Event:

```typescript
{
  orderId: string;
  tableId: string;
  status: OrderStatus;
  updatedAt: string; // ISO 8601 timestamp
}
```

### `order:new` Event:

```typescript
{
  orderId: string;
  tableNo: string;
  totalAmount: number; // Amount in cents (分)
  createdAt: string; // ISO 8601 timestamp
}
```

## Error Handling

- WebSocket push failures are logged but do not fail the main operation (order status update, payment processing)
- If Socket.IO is not initialized, push methods log a warning and return gracefully
- Connection authentication failures result in immediate disconnection

## Testing

Due to the complexity of testing WebSocket connections in the Egg.js test environment, the implementation focuses on:

1. **Manual Testing**: Use WebSocket clients (e.g., Postman, socket.io-client) to test connections and events
2. **Integration Testing**: Verify that order status updates and payment processing trigger the correct WebSocket push calls
3. **Logging**: Comprehensive logging of all WebSocket events for debugging

## Client Implementation Guide

### Merchant Client (Web Admin / Merchant App):

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:7001', {
  auth: {
    token: jwtToken, // JWT Token from login
  },
});

socket.on('authenticated', (data) => {
  console.log('Authenticated as:', data.type, data.merchantId);
});

socket.on('order:status_changed', (data) => {
  console.log('Order status changed:', data);
  // Update UI to reflect order status change
});

socket.on('order:new', (data) => {
  console.log('New order arrived:', data);
  // Show notification and update order list
});

socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

### Customer Client (Customer App):

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:7001', {
  auth: {
    token: sessionToken, // Session Token from session creation
  },
});

socket.on('authenticated', (data) => {
  console.log('Authenticated as:', data.type, data.tableId);
});

socket.on('order:status_changed', (data) => {
  console.log('Order status changed:', data);
  // Update UI to reflect order status change
});

socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

## Dependencies

- `socket.io`: ^4.7.4 (already installed in package.json)

## Files Modified/Created

1. **Created**: `app/service/websocket.ts` - WebSocket service implementation
2. **Modified**: `app.ts` - Initialize Socket.IO server
3. **Modified**: `app/service/order.ts` - Add WebSocket push calls
4. **Modified**: `app/service/payment.ts` - Add WebSocket push calls
5. **Modified**: `typings/app/service/index.d.ts` - Add WebSocket service type definition

## Verification

To verify the implementation:

1. Start the backend server: `npm run dev`
2. Connect a WebSocket client with a valid JWT token (merchant) or session token (customer)
3. Verify the `authenticated` event is received
4. Create an order and update its status
5. Verify the `order:status_changed` event is received
6. Complete a payment for an order
7. Verify both `order:status_changed` and `order:new` events are received (merchant only)

## Notes

- The WebSocket service gracefully handles cases where Socket.IO is not initialized (e.g., in unit tests)
- All WebSocket push operations are wrapped in try-catch blocks to prevent failures from affecting core business logic
- The implementation uses rooms for efficient message routing to specific clients
- Connection authentication ensures only authorized clients can receive order updates
