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
const TOKEN_MINT = "Ed7nUZQ9Gv8RWSNunHUKMXYU5pP4VqkHaiSEnQcVpump" || ""; // Allow empty TOKEN_MINT
const DEV_WALLET = process.env.DEV_WALLET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const connection = new Connection(RPC_URL, "confirmed");
const WALLET = Keypair.fromSecretKey(bs58.decode(WALLET_SECRET));

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper function to get server time info
function getServerTimeInfo() {
  const now = new Date();
  const secondsElapsed = now.getSeconds();
  const millisecondsElapsed = now.getMilliseconds();
  
  // Calculate precise seconds until next minute
  const totalElapsedMs = (secondsElapsed * 1000) + millisecondsElapsed;
  const secondsUntilNext = (60000 - totalElapsedMs) / 1000;
  
  // Get the timestamp of the next scheduled distribution
  const nextDistribution = new Date(now);
  nextDistribution.setSeconds(0, 0);
  nextDistribution.setMinutes(nextDistribution.getMinutes() + 1);
  
  // Get the timestamp of the last distribution
  const lastDistribution = new Date(now);
  lastDistribution.setSeconds(0, 0);
  
  return {
    serverTime: now.toISOString(),
    secondsUntilNext: Math.ceil(secondsUntilNext),
    nextDistributionTime: nextDistribution.toISOString(),
    lastDistributionTime: lastDistribution.toISOString(),
    currentCycle: Math.floor(now.getTime() / 60000), // Unique ID for current minute
    tokenMintEmpty: !TOKEN_MINT || TOKEN_MINT.trim() === "" // Add flag for empty token mint
  };
}

async function saveWinner(wallet, amount, signature) {
  const { data, error } = await supabase
    .from('winners')
    .insert([
      {
        wallet,
        amount,
        signature
      }
    ])
    .select();

  if (error) {
    console.error('Error saving winner:', error);
    throw error;
  }

  return data[0];
}

async function getRecentWinners(limit = 20) {
  const { data, error } = await supabase
    .from('winners')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching winners:', error);
    throw error;
  }

  return data;
}

async function claimFees() {
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
  return response.json();
}

async function getRandomHolder(mint) {
  // Use Solana RPC getProgramAccounts to get token holders
  const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'get-token-accounts',
      method: 'getProgramAccounts',
      params: [
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // SPL Token Program ID
        {
          encoding: 'jsonParsed',
          filters: [
            {
              dataSize: 165 // Token account data size
            },
            {
              memcmp: {
                offset: 0,
                bytes: mint // Filter by mint address
              }
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch token accounts: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`RPC error: ${data.error.message}`);
  }

  const accounts = data.result || [];
  
  if (accounts.length === 0) {
    throw new Error("No token accounts found");
  }

  // Filter accounts with positive balance and exclude dev wallet
  let validAccounts = accounts
    .filter(account => {
      const tokenAmount = account?.account?.data?.parsed?.info?.tokenAmount;
      const balance = parseFloat(tokenAmount?.amount || '0');
      const owner = account?.account?.data?.parsed?.info?.owner;
      
      // Exclude accounts with zero balance or dev wallet
      return balance > 0 && owner !== DEV_WALLET;
    })
    .map(account => ({
      owner: account?.account?.data?.parsed?.info?.owner,
      balance: parseFloat(account?.account?.data?.parsed?.info?.tokenAmount?.amount || '0')
    }))
    .sort((a, b) => b.balance - a.balance); // Sort descending by balance

  if (validAccounts.length === 0) {
    throw new Error("No token holders with positive balance found (excluding dev wallet)");
  }

  // Remove the top holder (liquidity pool)
  validAccounts = validAccounts.slice(1);
  
  if (validAccounts.length === 0) {
    throw new Error("No eligible holders found (only liquidity pool and/or dev wallet detected)");
  }

  // Calculate total supply among eligible holders
  const totalSupply = validAccounts.reduce((sum, account) => sum + account.balance, 0);
  
  // Create weighted selection based on token holdings
  const weightedHolders = validAccounts.map(account => ({
    owner: account.owner,
    balance: account.balance,
    weight: account.balance / totalSupply,
    cumulativeWeight: 0
  }));

  // Calculate cumulative weights for selection
  let cumulativeWeight = 0;
  for (let i = 0; i < weightedHolders.length; i++) {
    cumulativeWeight += weightedHolders[i].weight;
    weightedHolders[i].cumulativeWeight = cumulativeWeight;
  }

  // Generate random number between 0 and 1
  const random = Math.random();
  
  // Find the holder based on weighted random selection
  const selectedHolder = weightedHolders.find(holder => random <= holder.cumulativeWeight);
  
  if (!selectedHolder || !selectedHolder.owner) {
    throw new Error("Failed to select weighted random holder");
  }

  console.log(`Selected holder with ${selectedHolder.balance} tokens (${(selectedHolder.weight * 100).toFixed(2)}% of supply)`);

  return new PublicKey(selectedHolder.owner);
}

async function sendSol(recipient, lamports) {
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: WALLET.publicKey,
      toPubkey: recipient,
      lamports,
    })
  );

  const sig = await sendAndConfirmTransaction(connection, tx, [WALLET]);
  return sig;
}

export async function GET() {
  try {
    // Check if TOKEN_MINT is empty
    if (!TOKEN_MINT || TOKEN_MINT.trim() === "") {
      return NextResponse.json({
        success: false,
        error: "TOKEN_MINT not configured",
        tokenMintEmpty: true,
        winners: [],
        ...getServerTimeInfo()
      });
    }

    const claimResult = await claimFees();
    await new Promise((r) => setTimeout(r, 10_000));

    const recipient = await getRandomHolder(TOKEN_MINT);
    const balance = await connection.getBalance(WALLET.publicKey);
    const sendAmount = balance - 1_000_000; // Keep 0.001 SOL for fees

    let sig = null;
    if (sendAmount > 0) {
      sig = await sendSol(recipient, sendAmount);
    }

    // Save winner to database
    const winner = await saveWinner(
      recipient.toBase58(),
      sendAmount / 1e9, // in SOL
      sig
    );

    // Get recent winners for response
    const winners = await getRecentWinners(20);

    return NextResponse.json({
      success: true,
      claimResult,
      recipient: recipient.toBase58(),
      forwardedLamports: sendAmount,
      txSignature: sig,
      winner,
      winners,
      ...getServerTimeInfo() // Include server time info
    });
  } catch (e) {
    console.error("Error in GET handler:", e);
    return NextResponse.json(
      { success: false, error: e.message, ...getServerTimeInfo() },
      { status: 500 }
    );
  }
}

// Get winners from database + server time info
export async function POST() {
  try {
    // Check if TOKEN_MINT is empty
    if (!TOKEN_MINT || TOKEN_MINT.trim() === "") {
      return NextResponse.json({
        success: false,
        error: "TOKEN_MINT not configured",
        tokenMintEmpty: true,
        winners: [],
        ...getServerTimeInfo()
      });
    }

    const winners = await getRecentWinners(20);
    return NextResponse.json({ 
      winners,
      ...getServerTimeInfo()
    });
  } catch (e) {
    console.error("Error fetching winners:", e);
    return NextResponse.json(
      { success: false, error: e.message, ...getServerTimeInfo() },
      { status: 500 }
    );
  }
}