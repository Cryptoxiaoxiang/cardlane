import template from '@/generated/action-template.js?raw';
export function actionSource(contract:string,rpc:string){const manifest={chainId:84532,contract:contract.toLowerCase(),rpc,version:1};return template+'\nconst MANIFEST='+JSON.stringify(manifest)+';\nasync function main(params){return CardLaneAction.run(MANIFEST,params)}\n';}
