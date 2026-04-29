import { Application } from 'egg';

export default class AppBootHook {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  async willReady() {
    // Define model associations
    const { Dish, Sku, Category } = this.app.model;
    
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

    // Dish belongs to Category
    Dish.belongsTo(Category, {
      foreignKey: 'category_id',
      as: 'category',
    });

    // Category has many Dishes
    Category.hasMany(Dish, {
      foreignKey: 'category_id',
      as: 'dishes',
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
