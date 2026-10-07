import { createPublicClient, http, isAddress, keccak256, toHex, verifyMessage, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { x25519 } from '@noble/curves/ed25519';
import { CardLaneAbi } from '../lib/cardlane/CardLane-abi';
import { derivedKey, deliveryMessage, hex, open, seal, unhex, type Envelope } from '../lib/cardlane/crypto';
declare const Lit:{Actions:{getLitActionPrivateKey():Promise<Hex>}};
export type Manifest={chainId:number;contract:Address;rpc:string;version:1};
type Params={operation:'publicKey'|'decrypt';challenge?:string;listingId?:Hex;recipient?:string;expires?:number;signature?:Hex;envelope?:string};
export function bindingMessage(m:Manifest,challenge:string,publicKey:string){return ['CardLane key binding v1',String(m.chainId),m.contract.toLowerCase(),challenge,publicKey].join('\n');}
export async function run(manifest:Manifest,params:Params,deps?:{getKey:()=>Promise<Hex>;client:ReturnType<typeof createPublicClient>}){
 if(!isAddress(manifest.contract)||manifest.version!==1)throw new Error('Invalid manifest');
 const client=deps?.client??createPublicClient({transport:http(manifest.rpc,{timeout:12000,retryCount:0})});
 const getKey=deps?.getKey??(()=>Lit.Actions.getLitActionPrivateKey());
 if(params.operation==='publicKey'){
   if(!/^[0-9a-f]{64}$/.test(params.challenge??''))throw new Error('Invalid challenge');
   const key=await getKey();const account=privateKeyToAccount(key);const publicKey=hex(x25519.getPublicKey(derivedKey(unhex(key))));
   const message=bindingMessage(manifest,params.challenge!,publicKey);
   return {publicKey,signature:await account.signMessage({message}),challenge:params.challenge};
 }
 const {listingId,recipient,expires,signature,envelope}=params;
 if(params.operation!=='decrypt'||!/^0x[0-9a-f]{64}$/.test(listingId??'')||!signature||!recipient||!/^[0-9a-f]{64}$/.test(recipient)||typeof expires!=='number'||!Number.isSafeInteger(expires)||expires<Math.floor(Date.now()/1000)||expires>Math.floor(Date.now()/1000)+300||!envelope||envelope.length>32000)throw new Error('Invalid delivery request');
 if(await client.getChainId()!==manifest.chainId)throw new Error('Wrong chain');
 const listing=await client.readContract({address:manifest.contract,abi:CardLaneAbi,functionName:'getListing',args:[listingId!]});
 const message=deliveryMessage(manifest.chainId,manifest.contract,listingId!,recipient,expires);
 if(!await verifyMessage({address:listing.buyer,message,signature}))throw new Error('Buyer signature required');
 if(!await client.readContract({address:manifest.contract,abi:CardLaneAbi,functionName:'canDecrypt',args:[listingId!,listing.buyer]}))throw new Error('Order not eligible');
 if(keccak256(toHex(envelope))!==listing.payloadHash)throw new Error('Envelope commitment mismatch');
 const data=JSON.parse(envelope) as Envelope;if(data.version!==1||data.listingId!==listingId)throw new Error('Wrong envelope');
 // Identity key is requested only after authentication, chain and payload checks pass.
 const privateKey=derivedKey(unhex(await getKey()));const secretKey=await open(privateKey,data.wrappedKey,listingId!);
 // Encrypt the data key to the ephemeral public key bound into the buyer's signature.
 return {wrappedKey:await seal(unhex(recipient),secretKey,message)};
}
