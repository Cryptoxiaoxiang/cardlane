import { env } from 'cloudflare:workers';
import { createPublicClient,http,isAddress,type Address } from 'viem';
import { publicConfig } from './config';
import { CardLaneAbi } from './CardLane-abi';
export function values(){return env as unknown as Record<string,string|undefined>;}
export function config(){return publicConfig(values());}
export function chain(){const c=config();return createPublicClient({transport:http(c.rpc,{timeout:12000,retryCount:1})});}
export async function assertContract(){const c=config();if(!c.contractReady)throw new Error('合约尚未部署');const client=chain();if(await client.getChainId()!==84532)throw new Error('RPC 网络不匹配');const [token,arbiter,version]=await Promise.all([client.readContract({address:c.contract as Address,abi:CardLaneAbi,functionName:'token'}),client.readContract({address:c.contract as Address,abi:CardLaneAbi,functionName:'arbiter'}),client.readContract({address:c.contract as Address,abi:CardLaneAbi,functionName:'VERSION'})]);if(version!==BigInt(2)||!isAddress(arbiter)||arbiter.toLowerCase()!==c.arbiter.toLowerCase()||token.toLowerCase()!==c.token.toLowerCase())throw new Error('合约配置不匹配');return {client,c};}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}});}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin;}
export async function boundedBody(request:Request){const size=Number(request.headers.get('content-length')??0);if(size>40000)throw new Error('请求过大');const text=await request.text();if(text.length>40000)throw new Error('请求过大');return JSON.parse(text);}
