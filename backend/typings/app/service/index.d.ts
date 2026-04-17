// This file is created by egg-ts-helper@2.1.1
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
type AnyClass = new (...args: any[]) => any;
type AnyFunc<T = any> = (...args: any[]) => T;
type CanExportFunc = AnyFunc<Promise<any>> | AnyFunc<IterableIterator<any>>;
type AutoInstanceType<T, U = T extends CanExportFunc ? T : T extends AnyFunc ? ReturnType<T> : T> = U extends AnyClass ? InstanceType<U> : U;
import ExportAuth from '../../../app/service/auth';
import ExportMenu from '../../../app/service/menu';
import ExportOrder from '../../../app/service/order';
import ExportPayment from '../../../app/service/payment';
import ExportSession from '../../../app/service/session';
import ExportStats from '../../../app/service/stats';
import ExportTable from '../../../app/service/table';
import ExportWebsocket from '../../../app/service/websocket';

declare module 'egg' {
  interface IService {
    auth: AutoInstanceType<typeof ExportAuth>;
    menu: AutoInstanceType<typeof ExportMenu>;
    order: AutoInstanceType<typeof ExportOrder>;
    payment: AutoInstanceType<typeof ExportPayment>;
    session: AutoInstanceType<typeof ExportSession>;
    stats: AutoInstanceType<typeof ExportStats>;
    table: AutoInstanceType<typeof ExportTable>;
    websocket: AutoInstanceType<typeof ExportWebsocket>;
  }
}
