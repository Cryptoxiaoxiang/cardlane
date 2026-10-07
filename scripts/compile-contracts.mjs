import fs from 'node:fs/promises';import solc from 'solc';
const sources=Object.fromEntries(await Promise.all(['CardLane','TestUSDC'].map(async name=>[name+'.sol',{content:await fs.readFile('contracts/'+name+'.sol','utf8')}])));
const output=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources,settings:{optimizer:{enabled:true,runs:200},evmVersion:'paris',outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}})));
for(const e of output.errors??[]){if(e.severity==='error')throw new Error(e.formattedMessage);}
await fs.mkdir('generated',{recursive:true});for(const name of ['CardLane','TestUSDC']){const c=output.contracts[name+'.sol'][name];await fs.writeFile('generated/'+name+'.json',JSON.stringify({abi:c.abi,bytecode:'0x'+c.evm.bytecode.object},null,2)+'\n');await fs.writeFile('lib/cardlane/'+name+'-abi.ts','export const '+name+'Abi = '+JSON.stringify(c.abi,null,2)+' as const;\n');}console.log('Compiled CardLane and TestUSDC');
