import { x25519 } from '@noble/curves/ed25519';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
export const utf8=(s:string)=>new TextEncoder().encode(s);
export const hex=(b:Uint8Array)=>bytesToHex(b);
export const unhex=(s:string)=>hexToBytes(s.replace(/^0x/,''));
export const fresh=(n:number)=>crypto.getRandomValues(new Uint8Array(n));
export type Box={ephemeral:string;iv:string;ciphertext:string};
export type Envelope={version:1;listingId:string;metadata:{brand:string;category:string;region:string;face:string};iv:string;ciphertext:string;wrappedKey:Box};
export function derivedKey(privateKey:Uint8Array){return hkdf(sha256,privateKey,utf8('cardlane/v1'),utf8('action-x25519'),32);}
export async function aesEncrypt(key:Uint8Array,data:Uint8Array,context:string){const iv=fresh(12);const k=await crypto.subtle.importKey('raw',new Uint8Array(key),'AES-GCM',false,['encrypt']);const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv:new Uint8Array(iv),additionalData:new Uint8Array(utf8(context))},k,new Uint8Array(data));return {iv:hex(iv),ciphertext:hex(new Uint8Array(ciphertext))};}
export async function aesDecrypt(key:Uint8Array,box:{iv:string;ciphertext:string},context:string){const k=await crypto.subtle.importKey('raw',new Uint8Array(key),'AES-GCM',false,['decrypt']);return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(unhex(box.iv)),additionalData:new Uint8Array(utf8(context))},k,new Uint8Array(unhex(box.ciphertext))));}
export async function seal(publicKey:Uint8Array,data:Uint8Array,context:string):Promise<Box>{const privateKey=fresh(32);const ephemeral=x25519.getPublicKey(privateKey);const shared=x25519.getSharedSecret(privateKey,publicKey);const key=hkdf(sha256,shared,utf8(context),utf8('cardlane-envelope-v1'),32);return {ephemeral:hex(ephemeral),...await aesEncrypt(key,data,context)};}
export async function open(privateKey:Uint8Array,box:Box,context:string){const shared=x25519.getSharedSecret(privateKey,unhex(box.ephemeral));const key=hkdf(sha256,shared,utf8(context),utf8('cardlane-envelope-v1'),32);return aesDecrypt(key,box,context);}
export function keyPair(){const privateKey=fresh(32);return {privateKey,publicKey:x25519.getPublicKey(privateKey)};}
export async function encryptCard(listingId:string,metadata:Envelope['metadata'],secret:{code:string;pin:string},actionPublicKey:Uint8Array):Promise<Envelope>{const key=fresh(32);const data=await aesEncrypt(key,utf8(JSON.stringify(secret)),listingId);return {version:1,listingId,metadata,...data,wrappedKey:await seal(actionPublicKey,key,listingId)};}
export async function decryptCard(envelope:Envelope,key:Uint8Array){return JSON.parse(new TextDecoder().decode(await aesDecrypt(key,envelope,envelope.listingId))) as {code:string;pin:string};}
export function deliveryMessage(chainId:number,contract:string,id:string,recipient:string,expires:number){return ['CardLane delivery v1',String(chainId),contract.toLowerCase(),id.toLowerCase(),recipient.toLowerCase(),String(expires)].join('\n');}
