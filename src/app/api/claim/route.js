import { NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { createClient } from '@supabase/supabase-js';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const PUMPPORTAL_API_KEY = process.env.PUMPPORTAL_API_KEY;
const WALLET_SECRET = process.env.WALLET_SECRET;
const TOKEN_MINT = process.env.TOKEN_MINT || ""; // Make sure to set this in your env
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const connection = new Connection(RPC_URL, "confirmed");
const WALLET = Keypair.fromSecretKey(bs58.decode(WALLET_SECRET));

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper function to get server time info for 3-minute cycles
function getServerTimeInfo() {
  const now = new Date();
  
  // 3-minute intervals: 0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57
  const validMinutes = Array.from({ length: 20 }, (_, i) => i * 3);
  const currentMinute = now.getMinutes();
  
  // Find the current and next valid 3-minute marks
  const currentValidMinute = validMinutes.filter(validMinute => validMinute <= currentMinute).pop() || 0;
  let nextValidMinute = validMinutes.find(validMinute => validMinute > currentMinute);
  
  // Create next buyback time
  const nextBuyback = new Date(now);
  if (nextValidMinute) {
    nextBuyback.setMinutes(nextValidMinute, 0, 0);
  } else {
    // Next valid minute is next hour at 00 minutes
    nextBuyback.setHours(nextBuyback.getHours() + 1);
    nextBuyback.setMinutes(0, 0, 0);
  }
  
  // Create last buyback time
  const lastBuyback = new Date(now);
  lastBuyback.setMinutes(currentValidMinute, 0, 0);
  
  // Calculate time until next buyback
  const millisecondsUntilNext = nextBuyback.getTime() - now.getTime();
  const secondsUntilNext = Math.ceil(millisecondsUntilNext / 1000);
  
  // Create a unique cycle ID based on the last valid minute (every 3 minutes)
  const cycleStart = new Date(lastBuyback);
  const cycleId = Math.floor(cycleStart.getTime() / (3 * 60 * 1000));
  
  return {
    serverTime: now.toISOString(),
    secondsUntilNext: Math.max(0, secondsUntilNext),
    nextBuybackTime: nextBuyback.toISOString(),
    lastBuybackTime: lastBuyback.toISOString(),
    currentCycle: cycleId,
    currentValidMinute,
    tokenMintEmpty: !TOKEN_MINT || TOKEN_MINT.trim() === ""
  };
}

async function saveBuybackRecord(solAmount, tokensReceived, signature, cycleId, tokenMint) {
  const { data, error } = await supabase
    .from('buybacks')
    .insert([
      {
        sol_amount: solAmount,
        tokens_received: tokensReceived || 0,
        signature: signature,
        cycle_id: cycleId,
        token_mint: tokenMint,
        executed_at: new Date().toISOString()
      }
    ])
    .select();

  if (error) {
    console.error('Error saving buyback record:', error);
    throw error;
  }

  console.log(`Saved buyback record for cycle ${cycleId}:`, data[0]);
  return data[0];
}

async function getRecentBuybacks(limit = 20) {
  const { data, error } = await supabase
    .from('buybacks')
    .select('*')
    .order('executed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching buyback records:', error);
    throw error;
  }

  return data || [];
}

async function getBuybackStats() {
  const { data, error } = await supabase
    .from('buyback_stats')
    .select('*')
    .single();

  if (error) {
    console.error('Error fetching buyback stats:', error);
    return null;
  }

  return data;
}

async function claimCreatorFees() {
  const response = await fetch(
    "https://pumpportal.fun/api/trade?api-key=" + PUMPPORTAL_API_KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "collectCreatorFee",
        priorityFee: 0.000001,
        pool: "pump",
      }),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to claim fees: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

async function executeBuyback(tokenMint, solAmount) {
  // Step 1: Get buyback transaction from PumpPortal
  const buyResponse = await fetch(
    "https://pumpportal.fun/api/trade?api-key=" + PUMPPORTAL_API_KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "buy",
        mint: tokenMint,
        amount: solAmount,
        denominatedInSol: "true",
        slippage: 15, // 15% slippage tolerance for better execution
        priorityFee: 0.000005, // 0.000005 SOL priority fee
        pool: "pump"
      }),
    }
  );
  
  if (!buyResponse.ok) {
    throw new Error(`Failed to get buyback transaction: ${buyResponse.status} ${buyResponse.statusText}`);
  }
  
  const buyData = await buyResponse.json();
  
  if (!buyData.success || !buyData.transaction) {
    throw new Error(`Buyback transaction creation failed: ${buyData.error || 'Unknown error'}`);
  }
  
  // Step 2: Execute the transaction
  const tx = Transaction.from(Buffer.from(buyData.transaction, 'base64'));
  tx.partialSign(WALLET);
  
  const signature = await sendAndConfirmTransaction(connection, tx, [WALLET], {
    commitment: 'confirmed',
    maxRetries: 3,
    skipPreflight: false
  });
  
  return {
    signature,
    buyData
  };
}

async function getTokenBalance(tokenMint, walletPublicKey) {
  try {
    const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-token-balance',
        method: 'getTokenAccountsByOwner',
        params: [
          walletPublicKey.toBase58(),
          { mint: tokenMint },
          { encoding: 'jsonParsed' }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`RPC error: ${data.error.message}`);
    }

    const accounts = data.result?.value || [];
    
    if (accounts.length === 0) {
      return 0;
    }

    const balance = parseFloat(accounts[0].account.data.parsed.info.tokenAmount.amount || '0');
    return balance;
  } catch (error) {
    console.error('Error getting token balance:', error);
    return 0;
  }
}

export async function GET() {
  try {
    // Validate environment variables
    if (!TOKEN_MINT || TOKEN_MINT.trim() === "") {
      return NextResponse.json({
        success: false,
        error: "TOKEN_MINT not configured in environment variables",
        tokenMintEmpty: true,
        buybacks: [],
        ...getServerTimeInfo()
      });
    }

    const timeInfo = getServerTimeInfo();
    console.log(`[BUYBACK CRON] ${timeInfo.serverTime} - Starting buyback check for cycle ${timeInfo.currentCycle} (minute ${timeInfo.currentValidMinute})`);
    
    // Check if buyback already executed for this cycle
    const { data: existingBuyback, error: queryError } = await supabase
      .from('buybacks')
      .select('*')
      .eq('cycle_id', timeInfo.currentCycle)
      .limit(1);

    if (queryError) {
      console.error('Error checking existing buyback:', queryError);
    }

    if (existingBuyback && existingBuyback.length > 0) {
      console.log(`Buyback already completed for cycle ${timeInfo.currentCycle}`);
      const recentBuybacks = await getRecentBuybacks(20);
      
      return NextResponse.json({
        success: false,
        error: `Buyback already completed for cycle ${timeInfo.currentCycle}`,
        existingBuyback: existingBuyback[0],
        buybacks: recentBuybacks,
        ...timeInfo
      });
    }

    console.log(`Executing new buyback for cycle ${timeInfo.currentCycle}`);

    // Get wallet balance before claiming fees
    const balanceBefore = await connection.getBalance(WALLET.publicKey);
    console.log(`Wallet balance before fee claim: ${balanceBefore / 1e9} SOL`);
    
    // Claim creator fees
    const claimResult = await claimCreatorFees();
    console.log('Fee claim result:', claimResult);
    
    // Wait for fee claim to process
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Get wallet balance after claiming fees
    const balanceAfter = await connection.getBalance(WALLET.publicKey);
    const claimedAmount = balanceAfter - balanceBefore;
    
    console.log(`Wallet balance after fee claim: ${balanceAfter / 1e9} SOL`);
    console.log(`Fees claimed: ${claimedAmount / 1e9} SOL`);

    let buybackResult = null;
    let txSignature = null;
    let solSpentOnBuyback = 0;
    let tokensReceived = 0;
    
    // Execute buyback if we have enough SOL (minimum 0.01 SOL to make it worthwhile)
    if (claimedAmount > 10000000) { // 0.01 SOL minimum
      solSpentOnBuyback = Math.floor((claimedAmount - 2000000) / 1e9 * 1e9); // Keep 0.002 SOL for fees, round down
      
      if (solSpentOnBuyback > 0) {
        const solAmount = solSpentOnBuyback / 1e9;
        console.log(`Attempting buyback with ${solAmount} SOL`);
        
        try {
          // Get token balance before buyback
          const tokenBalanceBefore = await getTokenBalance(TOKEN_MINT, WALLET.publicKey);
          
          // Execute buyback
          buybackResult = await executeBuyback(TOKEN_MINT, solAmount);
          txSignature = buybackResult.signature;
          
          console.log(`Buyback transaction executed: ${txSignature}`);
          
          // Wait for transaction to process
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Get token balance after buyback
          const tokenBalanceAfter = await getTokenBalance(TOKEN_MINT, WALLET.publicKey);
          tokensReceived = tokenBalanceAfter - tokenBalanceBefore;
          
          console.log(`Tokens received from buyback: ${tokensReceived}`);
          
        } catch (error) {
          console.error(`Buyback execution failed:`, error);
          buybackResult = { error: error.message };
        }
      }
    } else {
      console.log(`Insufficient fees for buyback: ${claimedAmount / 1e9} SOL (minimum 0.01 SOL required)`);
    }

    // Save buyback record to database
    const buybackRecord = await saveBuybackRecord(
      solSpentOnBuyback / 1e9,
      tokensReceived,
      txSignature,
      timeInfo.currentCycle,
      TOKEN_MINT
    );

    // Get recent buybacks and stats for response
    const recentBuybacks = await getRecentBuybacks(20);
    const stats = await getBuybackStats();

    return NextResponse.json({
      success: true,
      cycleId: timeInfo.currentCycle,
      tokenMint: TOKEN_MINT,
      claimResult,
      balanceBefore: balanceBefore / 1e9,
      balanceAfter: balanceAfter / 1e9,
      feesClaimedSOL: claimedAmount / 1e9,
      solSpentOnBuyback: solSpentOnBuyback / 1e9,
      tokensReceived,
      txSignature,
      buybackRecord,
      buybacks: recentBuybacks,
      stats,
      ...timeInfo
    });

  } catch (error) {
    console.error(`Error in buyback cron for cycle ${getServerTimeInfo().currentCycle}:`, error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      ...getServerTimeInfo()
    }, { status: 500 });
  }
}

// Get buyback history and stats
export async function POST() {
  try {
    if (!TOKEN_MINT || TOKEN_MINT.trim() === "") {
      return NextResponse.json({
        success: false,
        error: "TOKEN_MINT not configured",
        tokenMintEmpty: true,
        buybacks: [],
        ...getServerTimeInfo()
      });
    }

    const recentBuybacks = await getRecentBuybacks(20);
    const stats = await getBuybackStats();

    return NextResponse.json({ 
      success: true,
      buybacks: recentBuybacks,
      stats,
      tokenMint: TOKEN_MINT,
      ...getServerTimeInfo()
    });

  } catch (error) {
    console.error("Error fetching buyback data:", error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      ...getServerTimeInfo()
    }, { status: 500 });
  }
}