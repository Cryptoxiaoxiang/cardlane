import {CardLaneAbi} from '../lib/cardlane/CardLane-abi';
import {baseSepolia} from 'viem/chains';
import type {Address, PublicClient, WalletClient, Account,Transport} from 'viem';

/** Runs without a buyer/seller session. Reverts protect races with confirmation or appeal. */
export async function settleDueOrders(client: PublicClient<Transport,typeof baseSepolia>, wallet: WalletClient<Transport,typeof baseSepolia,Account>, account: Account, contract: Address, token: Address, arbiter: Address, slot = Math.floor(Date.now()/60000)) {
  if (await client.getChainId() !== 84532) throw new Error('Keeper requires Base Sepolia');
  const [version, actualToken, actualArbiter, count, block] = await Promise.all([
    client.readContract({address:contract,abi:CardLaneAbi,functionName:'VERSION'}),
    client.readContract({address:contract,abi:CardLaneAbi,functionName:'token'}),
    client.readContract({address:contract,abi:CardLaneAbi,functionName:'arbiter'}),
    client.readContract({address:contract,abi:CardLaneAbi,functionName:'count'}), client.getBlock(),
  ]);
  if(version!==BigInt(2) || actualToken.toLowerCase()!==token.toLowerCase() || actualArbiter.toLowerCase()!==arbiter.toLowerCase()) throw new Error('Keeper contract configuration mismatch');
  // Rotate bounded pages so older orders are not permanently skipped.
  const pages=(count+BigInt(99))/BigInt(100);if(!pages)return {scanned:0,settled:0,failed:0};
  const start=(BigInt(slot)%pages)*BigInt(100);const end=start+BigInt(100)<count?start+BigInt(100):count;
  let scanned=0, settled=0, failed=0;
  for(let index=start;index<end;index++){
    const id=await client.readContract({address:contract,abi:CardLaneAbi,functionName:'listingIds',args:[index]});
    const order=await client.readContract({address:contract,abi:CardLaneAbi,functionName:'getListing',args:[id]});scanned++;
    if(order.state!==2 || block.timestamp<BigInt(order.paidAt)+BigInt(172800))continue;
    try {
      const {request}=await client.simulateContract({account,address:contract,abi:CardLaneAbi,functionName:'settleAfterWindow',args:[id]});
      const hash=await wallet.writeContract({...request,chain:wallet.chain});
      const receipt=await client.waitForTransactionReceipt({hash,timeout:45000});
      if(receipt.status==='success')settled++;else failed++;
    } catch { failed++; } // A raced buyer appeal/confirmation never gets overridden.
    if(settled+failed>=10)break;
  }
  if(failed)throw new Error(`Keeper: ${settled} settled; ${failed} submissions failed or raced. Retry on the next sweep.`);
  return {scanned,settled,failed};
}
