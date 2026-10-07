import type {Product} from './client';
export const CONFIRM_SECONDS = 48 * 60 * 60;
export const REPLY_SECONDS = 24 * 60 * 60;
export const appealReasons = ['','卡密无效','已被使用','余额不足','地区不匹配','其他使用问题'];
export function autoConfirmDue(order: Product, now: number) {
  return order.state === 2 && !!order.paidAt && now >= order.paidAt + CONFIRM_SECONDS;
}
export function sellerReplyDue(order: Product, now: number) {
  return order.state === 3 && !!order.appeal?.openedAt && !order.appeal.repliedAt && now >= order.appeal.openedAt + REPLY_SECONDS;
}
export function arbitrationReady(order: Product, now: number) {
  return order.state === 3 && (!!order.appeal?.repliedAt || sellerReplyDue(order, now));
}
