'use strict';

/**
 * 修复菜品图片 URL 路径
 * 将 /uploads/dishes/xxx.jpg 更新为 /public/uploads/dishes/xxx.jpg
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      UPDATE dishes 
      SET image_url = '/public' || image_url 
      WHERE image_url IS NOT NULL 
        AND image_url NOT LIKE '/public%'
        AND image_url LIKE '/uploads/%';
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      UPDATE dishes 
      SET image_url = REPLACE(image_url, '/public/uploads/', '/uploads/') 
      WHERE image_url LIKE '/public/uploads/%';
    `);
  },
};
