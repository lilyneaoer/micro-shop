import { Application } from 'egg';

export default class AppBootHook {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  async willReady() {
    // Sync database models in development/test
    if (this.app.config.env !== 'prod') {
      // Models are synced via migrations in production
    }
  }

  async didReady() {
    this.app.logger.info('Application is ready');
  }
}
