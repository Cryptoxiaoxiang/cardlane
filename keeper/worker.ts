import {createPublicClient,createWalletClient,http,isAddress} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {baseSepolia} from 'viem/chains';
import {settleDueOrders} from './settle';
type Env=Record<string,string|undefined>;
export default {
  async scheduled(controller:ScheduledController,env:Env){
    if(!/^0x[0-9a-fA-F]{64}$/.test(env.CARDLANE_KEEPER_PRIVATE_KEY??''))throw new Error('Configure a dedicated testnet keeper key');
    const contract=env.CARDLANE_CONTRACT,token=env.CARDLANE_TOKEN,arbiter=env.CARDLANE_ARBITER;
    if(!contract||!token||!arbiter||!isAddress(contract)||!isAddress(token)||!isAddress(arbiter))throw new Error('Configure keeper contract, token and arbiter');
    const account=privateKeyToAccount(env.CARDLANE_KEEPER_PRIVATE_KEY as `0x${string}`);
    const transport=http(env.CARDLANE_RPC??'https://sepolia.base.org',{timeout:12000,retryCount:1});
    const client=createPublicClient({chain:baseSepolia,transport});
    const wallet=createWalletClient({chain:baseSepolia,transport,account});
    console.log(await settleDueOrders(client,wallet,account,contract,token,arbiter,Math.floor(controller.scheduledTime/60000)));
  },
};
