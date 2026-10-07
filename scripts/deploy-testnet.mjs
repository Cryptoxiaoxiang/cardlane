import fs from 'node:fs/promises';import {createWalletClient,createPublicClient,http,isAddress} from 'viem';import {privateKeyToAccount} from 'viem/accounts';import {baseSepolia} from 'viem/chains';
// Run manually with a dedicated, faucet-funded testnet wallet. No key is printed or saved.
if(!/^0x[0-9a-fA-F]{64}$/.test(process.env.DEPLOYER_PRIVATE_KEY??''))throw new Error('Set DEPLOYER_PRIVATE_KEY for a dedicated Base Sepolia test wallet in your local environment.');
const account=privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY);const arbiter=process.env.CARDLANE_ARBITER??account.address;if(!isAddress(arbiter))throw new Error('Invalid arbiter address');
const transport=http(process.env.CARDLANE_RPC??'https://sepolia.base.org');const client=createPublicClient({chain:baseSepolia,transport});if(await client.getChainId()!==84532)throw new Error('Refusing deployment outside Base Sepolia');
const wallet=createWalletClient({chain:baseSepolia,transport,account});
const deploy=async(name,args=[])=>{const artifact=JSON.parse(await fs.readFile('generated/'+name+'.json'));const hash=await wallet.deployContract({...artifact,args});const receipt=await client.waitForTransactionReceipt({hash});if(receipt.status!=='success'||!receipt.contractAddress)throw new Error('Deployment failed');console.log(name+' deployed: '+receipt.contractAddress+' (tx '+hash+')');return receipt.contractAddress;};
const token=await deploy('TestUSDC');const contract=await deploy('CardLane',[token,arbiter]);
console.log('\nPublic runtime configuration:\nCARDLANE_TOKEN='+token+'\nCARDLANE_CONTRACT='+contract+'\nCARDLANE_ARBITER='+arbiter);
