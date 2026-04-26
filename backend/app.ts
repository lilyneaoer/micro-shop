import { Application } from 'egg';

export default class AppBootHook {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  async willReady() {
    // Define model associations
    const { Dish, Sku } = this.app.model;
    
    // Dish has many SKUs
    Dish.hasMany(Sku, {
      foreignKey: 'dish_id',
      as: 'skus',
    });
    
    // SKU belongs to Dish
    Sku.belongsTo(Dish, {
      foreignKey: 'dish_id',
      as: 'dish',
    });

    // Sync database models in development/test
    if (this.app.config.env !== 'prod') {
      // Models are synced via migrations in production
    }
  }

  async didReady() {
    this.app.logger.info('Application is ready');
  }
}
