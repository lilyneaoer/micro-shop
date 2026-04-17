// This file is created by egg-ts-helper@2.1.1
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportCategory from '../../../app/model/category';
import ExportDailyStats from '../../../app/model/daily_stats';
import ExportDish from '../../../app/model/dish';
import ExportMerchant from '../../../app/model/merchant';
import ExportOrder from '../../../app/model/order';
import ExportOrderItem from '../../../app/model/order_item';
import ExportPayment from '../../../app/model/payment';
import ExportSession from '../../../app/model/session';
import ExportSku from '../../../app/model/sku';
import ExportTable from '../../../app/model/table';

declare module 'egg' {
  interface IModel {
    Category: ReturnType<typeof ExportCategory>;
    DailyStats: ReturnType<typeof ExportDailyStats>;
    Dish: ReturnType<typeof ExportDish>;
    Merchant: ReturnType<typeof ExportMerchant>;
    Order: ReturnType<typeof ExportOrder>;
    OrderItem: ReturnType<typeof ExportOrderItem>;
    Payment: ReturnType<typeof ExportPayment>;
    Session: ReturnType<typeof ExportSession>;
    Sku: ReturnType<typeof ExportSku>;
    Table: ReturnType<typeof ExportTable>;
  }
}
