'use strict';

/**
 * 为开发模式添加固定的 qr_token
 * 将 A01 桌台的 qr_token 设置为固定值，方便开发测试
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 为 A01 桌台设置固定的开发用 qr_token（使用固定的UUID）
    // 这个UUID是专门为开发模式生成的固定值
    const DEV_QR_TOKEN = '00000000-0000-0000-0000-000000000001';
    
    await queryInterface.sequelize.query(`
      UPDATE tables 
      SET qr_token = :qrToken 
      WHERE table_no = 'A01'
    `, {
      replacements: { qrToken: DEV_QR_TOKEN }
    });

    console.log('✅ 开发模式 qr_token 已设置');
    console.log(`📝 A01 桌台 qr_token: ${DEV_QR_TOKEN}`);
  },

  async down(queryInterface, Sequelize) {
    // 回滚时生成新的随机 UUID
    const { v4: uuidv4 } = require('uuid');
    const newToken = uuidv4();
    
    await queryInterface.sequelize.query(`
      UPDATE tables 
      SET qr_token = :qrToken 
      WHERE table_no = 'A01'
    `, {
      replacements: { qrToken: newToken }
    });
  },
};
