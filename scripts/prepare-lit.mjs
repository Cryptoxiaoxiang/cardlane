import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import {isAddress,keccak256,toHex} from 'viem';
// Generates reproducible action source. Does not create an account or spend service credits.
const contract=process.env.CARDLANE_CONTRACT;if(!isAddress(contract??''))throw new Error('Set CARDLANE_CONTRACT to the deployed Base Sepolia escrow.');
const template=await fs.readFile('generated/action-template.js','utf8');const release=JSON.parse(await fs.readFile('generated/action-release.json'));
if(createHash('sha256').update(template).digest('hex')!==release.sha256)throw new Error('Released template hash mismatch');
const manifest={chainId:84532,contract:contract.toLowerCase(),rpc:process.env.CARDLANE_RPC??'https://sepolia.base.org',version:1};const source=template+'\nconst MANIFEST='+JSON.stringify(manifest)+';\nasync function main(params){return CardLaneAction.run(MANIFEST,params)}\n';
await fs.writeFile('.sites-runtime/cardlane-action.js',source);console.log('Prepared immutable action: .sites-runtime/cardlane-action.js\nSource hash: '+keccak256(toHex(source))+'\nRegister only this exact source CID with your Lit usage-key group. Follow docs/SETUP.md.');
