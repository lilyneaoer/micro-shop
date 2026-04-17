# Integration Tests

## Overview

This directory contains integration tests for the QR Code Ordering System backend. The tests cover:

1. **Complete Ordering Workflow** (`complete-workflow.test.ts`)
   - Merchant authentication and token verification (Requirements 9.1 ~ 9.5)
   - Complete customer ordering flow: session creation → menu query → order submission → payment callback → status changes (Requirements 3.1 ~ 5.7)
   - Order status validation
   - Unavailable dish validation
   - Session management (Requirements 10.1 ~ 10.6)
   - API response format validation (Requirements 11.1, 11.7)
   - Health check endpoint (Requirement 11.6)

2. **WebSocket Push Notifications** (`websocket.test.ts`)
   - WebSocket connection authentication for merchants and customers
   - Order status change push notifications (Requirements 5.2, 5.3)
   - New order push notifications to merchants (Requirement 6.1)
   - WebSocket room management

## Prerequisites

### 1. Start Test Database

The integration tests require a PostgreSQL test database and Redis test instance. Start them using Docker Compose:

\`\`\`bash
cd backend
docker-compose up -d postgres_test redis_test
\`\`\`

This will start:

- PostgreSQL test database on port 5433
- Redis test instance on port 6380

### 2. Wait for Services to be Ready

Wait for the services to be healthy:

\`\`\`bash
docker-compose ps
\`\`\`

Both services should show "healthy" status.

## Running the Tests

### Run All Integration Tests

\`\`\`bash
npm test -- test/integration
\`\`\`

### Run Specific Test Suite

\`\`\`bash

# Complete workflow tests

npm test -- test/integration/complete-workflow.test.ts

# WebSocket tests

npm test -- test/integration/websocket.test.ts
\`\`\`

### Run with Coverage

\`\`\`bash
npm test -- test/integration --coverage
\`\`\`

## Test Environment Configuration

The test environment is configured in `config/config.test.ts`:

- **Database**: PostgreSQL on localhost:5433 (database: `qr_ordering_test`)
- **Redis**: localhost:6380 (db: 1)
- **Logging**: WARN level to reduce noise during tests

## Test Structure

### Complete Workflow Tests

1. **Merchant Authentication Flow**
   - Login with correct/incorrect credentials
   - JWT token validation (valid, expired, invalid signature)
   - API request authorization

2. **Complete Ordering Flow** (11 steps)
   - Step 1: Merchant creates a table
   - Step 2: Merchant creates a category
   - Step 3: Merchant creates a dish
   - Step 4: Customer scans QR code and creates session
   - Step 5: Customer queries menu
   - Step 6: Customer submits order
   - Step 7: Customer creates prepay order
   - Step 8: WeChat payment callback (idempotent)
   - Step 9: Merchant accepts order
   - Step 10: Merchant completes order
   - Step 11: Customer views order status

3. **Order Status Validation**
   - Invalid status transitions are rejected
   - Valid status transitions are accepted
   - Cancellation is allowed from any status

4. **Unavailable Dish Validation**
   - Unavailable dishes don't appear in customer menu
   - Orders with unavailable dishes are rejected
   - Mixed available/unavailable dishes are rejected

5. **Session Management**
   - New session creation for new OpenID + table combination
   - Session reuse for same OpenID + table
   - Expired session token rejection
   - Invalid session token rejection

6. **API Response Format**
   - Consistent response structure across all endpoints
   - Amount fields are non-negative integers (cents)

7. **Health Check**
   - Service health status endpoint

### WebSocket Tests

1. **Connection Authentication**
   - Merchant connection with valid/invalid JWT token
   - Customer connection with valid/invalid session token

2. **Order Status Change Push**
   - Status change events pushed to merchant and customer
   - Push notification within 5 seconds (Requirement 5.3)

3. **New Order Push**
   - New order events pushed to merchant within 10 seconds (Requirement 6.1)
   - New order events only sent to merchant, not customer

4. **Room Management**
   - Merchants join merchant room on connection
   - Customers join table room on connection

## Troubleshooting

### Database Connection Errors

If you see errors like "Cannot read properties of undefined (reading 'sync')":

1. Ensure Docker Compose services are running:
   \`\`\`bash
   docker-compose ps
   \`\`\`

2. Check database connectivity:
   \`\`\`bash
   psql -h localhost -p 5433 -U postgres -d qr_ordering_test
   \`\`\`

3. Restart the test database:
   \`\`\`bash
   docker-compose restart postgres_test
   \`\`\`

### Port Conflicts

If ports 5433 or 6380 are already in use:

1. Stop the conflicting services
2. Or modify the ports in `docker-compose.yml` and `config/config.test.ts`

### Test Timeouts

WebSocket tests have longer timeouts (30 seconds) due to async nature. If tests timeout:

1. Check if the application server started successfully
2. Check WebSocket connection logs
3. Increase timeout in `jest.config.ts` if needed

## Cleanup

After running tests, you can stop and remove the test containers:

\`\`\`bash

# Stop containers

docker-compose stop postgres_test redis_test

# Remove containers and volumes

docker-compose down -v
\`\`\`

## CI/CD Integration

For CI/CD pipelines, use the following workflow:

\`\`\`yaml

- name: Start test services
  run: docker-compose up -d postgres_test redis_test

- name: Wait for services
  run: |
  timeout 60 bash -c 'until docker-compose ps | grep healthy; do sleep 2; done'

- name: Run integration tests
  run: npm test -- test/integration

- name: Stop test services
  run: docker-compose down -v
  \`\`\`
