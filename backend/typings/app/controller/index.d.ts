// This file is created by egg-ts-helper@2.1.1
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportAuth from '../../../app/controller/auth';
import ExportHealth from '../../../app/controller/health';
import ExportMenu from '../../../app/controller/menu';
import ExportOrder from '../../../app/controller/order';
import ExportPayment from '../../../app/controller/payment';
import ExportSession from '../../../app/controller/session';
import ExportStats from '../../../app/controller/stats';
import ExportTable from '../../../app/controller/table';

declare module 'egg' {
  interface IController {
    auth: ExportAuth;
    health: ExportHealth;
    menu: ExportMenu;
    order: ExportOrder;
    payment: ExportPayment;
    session: ExportSession;
    stats: ExportStats;
    table: ExportTable;
  }
}
