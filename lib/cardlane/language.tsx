"use client";
import {createContext, useContext, useEffect, useState, type ReactNode} from 'react';
import {english} from './translations';

type Language = 'zh' | 'en';
export function translate(language: Language, text: string): string {
  if (language === 'zh') return text;
  if (english[text]) return english[text];
  const unavailable = text.match(/^(\d+) 个商品的加密文件暂不可读，请稍后刷新$/);
  if (unavailable) return `${unavailable[1]} encrypted card files are unavailable. Try refreshing later.`;
  return text;
}
const LanguageContext = createContext({language: 'zh' as Language, setLanguage: (_: Language) => {}, t: (text: string) => text});
export function LanguageProvider({children}: {children: ReactNode}) {
  const [language, setLanguage] = useState<Language>('zh');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {if (localStorage.getItem('cardlane-language') === 'en') setLanguage('en');} catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {localStorage.setItem('cardlane-language', language);} catch {}
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = language === 'zh' ? 'CardLane · 礼品卡交易' : 'CardLane · Gift Card Marketplace';
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute('content', language === 'zh' ? '礼品卡测试网交易平台，加密存储、链上托管、付款后自动取卡。' : 'A testnet gift card marketplace with encrypted storage, onchain escrow, and automatic delivery after payment.');
  }, [language, loaded]);
  return <LanguageContext.Provider value={{language, setLanguage, t: text => translate(language, text)}}>{children}</LanguageContext.Provider>;
}
export const useLanguage = () => useContext(LanguageContext);
