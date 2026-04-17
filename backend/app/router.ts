import { Application } from 'egg';

export default (app: Application) => {
  const { router, controller, middleware } = app;

  // Health check endpoint (Requirement 11.6)
  router.get('/health', controller.health.index);

  // Auth middleware (JWT verification)
  const authMiddleware = middleware.auth({}, app);

  // Session auth middleware (Session Token verification for customer APIs)
  const sessionAuthMiddleware = middleware.sessionAuth({}, app);

  // Optional auth middleware (tries both JWT and Session Token, doesn't reject if neither)
  const optionalAuthMiddleware = middleware.optionalAuth({}, app);

  // Authentication routes (Requirements 9.1, 9.2, 9.3, 9.4, 9.5)
  router.post('/api/auth/login', controller.auth.login);
  router.post('/api/auth/logout', authMiddleware, controller.auth.logout);
  router.post('/api/auth/refresh', controller.auth.refresh);

  // Customer session routes (Requirements 10.1, 10.2, 10.3, 10.5, 10.6)
  router.post('/api/sessions', controller.session.create);
  router.get('/api/sessions/current', sessionAuthMiddleware, controller.session.current);

  // Table management routes (Requirements 1.1, 1.2, 1.6) — all require JWT auth
  router.get('/api/tables', authMiddleware, controller.table.index);
  router.post('/api/tables', authMiddleware, controller.table.create);
  router.put('/api/tables/:id', authMiddleware, controller.table.update);
  router.delete('/api/tables/:id', authMiddleware, controller.table.destroy);
  router.get('/api/tables/:id/qrcode', authMiddleware, controller.table.qrcode);

  // Menu management routes (Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7)
  // Categories - JWT auth required
  router.get('/api/categories', authMiddleware, controller.menu.getCategories);
  router.post('/api/categories', authMiddleware, controller.menu.createCategory);
  router.put('/api/categories/:id', authMiddleware, controller.menu.updateCategory);
  router.delete('/api/categories/:id', authMiddleware, controller.menu.deleteCategory);

  // Dishes - JWT auth required for management, session auth for customer queries
  router.get('/api/dishes', optionalAuthMiddleware, controller.menu.getDishes); // Supports both JWT and Session auth
  router.post('/api/dishes', authMiddleware, controller.menu.createDish);
  router.put('/api/dishes/:id', authMiddleware, controller.menu.updateDish);
  router.delete('/api/dishes/:id', authMiddleware, controller.menu.deleteDish);
  router.post('/api/dishes/:id/image', authMiddleware, controller.menu.uploadDishImage);

  // Order management routes (Requirements 3.5, 3.6, 3.7, 5.1, 5.4, 5.5, 5.6, 5.7)
  router.post('/api/orders', sessionAuthMiddleware, controller.order.create); // Customer: submit order
  router.get('/api/orders/:id', controller.order.show); // Both JWT and session auth (handled in controller)
  router.get('/api/orders', authMiddleware, controller.order.index); // Merchant: get orders list
  router.put('/api/orders/:id/status', authMiddleware, controller.order.updateStatus); // Merchant: update status
  router.delete('/api/orders/:id', sessionAuthMiddleware, controller.order.destroy); // Customer: cancel order
  router.post('/api/orders/:id/refund', authMiddleware, controller.order.refund); // Merchant: refund order

  // Payment routes (Requirements 4.1, 4.2, 4.3, 4.4, 4.7)
  router.post('/api/payments/prepay', sessionAuthMiddleware, controller.payment.prepay); // Customer: create prepay order
  router.post('/api/payments/notify', controller.payment.notify); // WeChat Pay callback (no auth middleware)

  // Stats routes (Requirements 8.1, 8.2, 8.3, 8.5, 8.6) — all require JWT auth
  router.get('/api/stats/dashboard', authMiddleware, controller.stats.dashboard);
  router.get('/api/stats/revenue', authMiddleware, controller.stats.revenue);
  router.get('/api/stats/dishes', authMiddleware, controller.stats.dishes);
};
