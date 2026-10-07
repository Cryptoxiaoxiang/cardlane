"use client";
import {useState} from 'react';
import {ShieldCheck,Clock,MessageSquare} from 'lucide-react';
import type {Product} from './client';
import {useLanguage} from './language';
import {CONFIRM_SECONDS,REPLY_SECONDS,appealReasons,arbitrationReady,sellerReplyDue} from './order-policy';
export function OrderPanel({order,now,buyer,seller,demo,demoSeller,onDemoSeller,busy,onAppeal,onReply}:{order:Product;now:number;buyer:boolean;seller:boolean;demo:boolean;demoSeller:boolean;onDemoSeller:(seller:boolean)=>void;busy:boolean;onAppeal:(reason:number)=>void;onReply:(reply:string)=>void}) {
  const {language,t}=useLanguage();const [reason,setReason]=useState(1);const [reply,setReply]=useState('');const [appealing,setAppealing]=useState(false);
  const showSeller=demo?demoSeller:seller;
  const date=(time:number)=>new Date(time*1000).toLocaleString(language==='en'?'en-US':'zh-CN');
  const remaining=(until:number)=>{const seconds=Math.max(0,Math.ceil(until-now));return `${Math.floor(seconds/3600)}${t('小时')} ${Math.floor((seconds%3600)/60)}${t('分钟')}`;};
  if(![2,3,4,5].includes(order.state))return <div className="order-protection"><ShieldCheck size={18}/><p>{t('付款先进入托管，确认可用后才向卖家放款。48 小时未确认且无申诉的订单会自动完成。')}</p></div>;
  return <section className="order-protection">
    <div className="order-protection-heading"><ShieldCheck size={18}/><strong>{t(order.state===4?'款项已发给卖家':order.state===5?'款项已退给买家':'款项仍在托管中')}</strong></div>
    {order.state===2&&order.paidAt&&<><p>{t('确认礼品卡可用后再确认收货。若无法使用，请在自动确认前提交申诉。')}</p><div className="order-deadline"><Clock size={16}/><div><strong>{t(now>=order.paidAt+CONFIRM_SECONDS?'已到自动确认时间，等待结算':'自动确认倒计时')} {now<order.paidAt+CONFIRM_SECONDS&&remaining(order.paidAt+CONFIRM_SECONDS)}</strong><small>{date(order.paidAt+CONFIRM_SECONDS)}</small></div></div><p>{t('无申诉时，付款满 48 小时由定时任务自动确认并放款；实际到账以链上交易确认为准。')}</p>{demo&&<small>{t('演示订单仅在本次页面会话内自动更新；真实订单由后台定时任务处理。')}</small>}
    {buyer&&now<order.paidAt+CONFIRM_SECONDS&&<>{!appealing?<button className="secondary wide" disabled={busy} onClick={()=>setAppealing(true)}><MessageSquare size={16}/>{t('无法使用，提交申诉')}</button>:<form className="appeal-form" onSubmit={e=>{e.preventDefault();onAppeal(reason);}}><label>{t('申诉原因')}<select aria-label={t('申诉原因')} value={reason} onChange={e=>setReason(Number(e.target.value))}>{appealReasons.slice(1).map((text,i)=><option value={i+1} key={text}>{t(text)}</option>)}</select></label><p>{t('提交后暂停自动放款，卖家需在 24 小时内回复。')}</p><button className="primary wide" disabled={busy}>{t('提交申诉并冻结放款')}</button></form>}</>}
    </>}
    {order.appeal?.openedAt&&<div className="appeal-record"><strong>{t('申诉记录')}</strong><p>{t('申诉原因')}：{t(appealReasons[order.appeal.reason]??'其他使用问题')}</p><small>{date(order.appeal.openedAt)}</small>
      {order.appeal.repliedAt?<><p><strong>{t('卖家回复')}</strong></p><p className="seller-reply">{order.appeal.reply}</p><small>{date(order.appeal.repliedAt)}</small>{order.state===3&&<p>{t('等待仲裁。问题解决后，买家也可以确认收货并放款。')}</p>}</>:order.state===3&&<div className="order-deadline"><Clock size={16}/><div><strong>{t(sellerReplyDue(order,now)?'卖家已超时未回复，等待仲裁':'卖家回复剩余时间')} {!sellerReplyDue(order,now)&&remaining(order.appeal.openedAt+REPLY_SECONDS)}</strong><small>{t('回复截止')}：{date(order.appeal.openedAt+REPLY_SECONDS)}</small></div></div>}
      {order.state===3&&<><p>{t('申诉期间，48 小时自动确认暂停，资金继续托管。卖家回复或超过回复期限后可由仲裁处理。')}</p>{demo&&<div className="demo-role"><span>{t('演示视角')}</span><button type="button" aria-pressed={!demoSeller} onClick={()=>onDemoSeller(false)}>{t('买家')}</button><button type="button" aria-pressed={demoSeller} onClick={()=>onDemoSeller(true)}>{t('卖家')}</button></div>}
      {showSeller&&!arbitrationReady(order,now)&&<form className="appeal-form" onSubmit={e=>{e.preventDefault();onReply(reply);}}><label>{t('回复申诉')}<textarea required maxLength={300} value={reply} onChange={e=>setReply(e.target.value)} placeholder={t('说明核查结果或处理方案')}/></label><small>{t('回复会公开保存到链上。请勿填写兑换码、PIN 或个人信息。')}</small><button className="primary wide" disabled={busy}>{t('提交卖家回复')}</button></form>}
      </>}
    </div>}
  </section>;
}
