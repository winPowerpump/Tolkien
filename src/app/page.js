"use client";

import { useEffect, useState, useCallback } from "react";
import AddressDisplay from "./components/copy";
import CountdownTimer from "./components/Timer";
import Link from "next/link";

export default function Home() {
  const [buybacks, setBuybacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastClaimTime, setLastClaimTime] = useState(null);
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [isTimeSynced, setIsTimeSynced] = useState(false);
  const [noHolders, setNoHolders] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [tokenMintEmpty, setTokenMintEmpty] = useState(false);

  const contractAddress = "123pump";

  // Use useCallback to prevent unnecessary re-renders
  const syncServerTime = useCallback(async () => {
    try {
      const requestStart = Date.now();
      const res = await fetch("/api/claim", { method: "POST" });
      const requestEnd = Date.now();
      const data = await res.json();
      
      // Handle TOKEN_MINT not configured
      if (!data.success && data.tokenMintEmpty) {
        setTokenMintEmpty(true);
        return;
      } else {
        setTokenMintEmpty(false);
      }
      
      // Handle no token holders (keeping original logic if still needed)
      if (!data.success && data.error && data.error.includes("No token holders")) {
        setNoHolders(true);
        return;
      } else {
        setNoHolders(false);
      }
      
      if (data.serverTime) {
        const serverTime = new Date(data.serverTime).getTime();
        const networkLatency = (requestEnd - requestStart) / 2;
        const adjustedServerTime = serverTime + networkLatency;
        const localTime = requestEnd;
        
        const offset = adjustedServerTime - localTime;
        setServerTimeOffset(offset);
        setIsTimeSynced(true);
        setBuybacks(data.buybacks || []);
        setStats(data.stats || null);
        
        console.log(`Time synced. Offset: ${offset}ms`);
        console.log(`Loaded ${data.buybacks?.length || 0} buybacks`);
      }
    } catch (e) {
      console.error("Failed to sync server time:", e);
      setIsTimeSynced(false);
    }
  }, []);

  // Manual refresh function
  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await syncServerTime();
    } catch (e) {
      console.error("Manual refresh failed:", e);
    }
    setIsRefreshing(false);
  }, [syncServerTime]);

  // Initial sync on component mount
  useEffect(() => {
    syncServerTime();
  }, [syncServerTime]);

  // Periodic buyback fetching and re-sync - adjusted interval for 3-minute distributions
  useEffect(() => {
    if (noHolders || tokenMintEmpty) return;
    
    // Keep 1 minute interval for frequent updates
    const interval = setInterval(() => {
      syncServerTime();
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [noHolders, tokenMintEmpty, syncServerTime]);

  const handleManualClaim = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/claim");
      await res.json();
      syncServerTime();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [syncServerTime]);

  // Format the last claim time for display
  const formatLastClaimTime = (time) => {
    if (!time) return "Unknown";
    return time.toLocaleTimeString();
  };

  // Format SOL amount for display
  const formatSolAmount = (amount) => {
    if (amount === 0) return "0.0000";
    return parseFloat(amount).toFixed(4);
  };

  // Format tokens received for display
  const formatTokens = (tokens) => {
    if (!tokens || tokens === 0) return "0";
    return Math.floor(tokens).toLocaleString();
  };

  return (
    <main className="min-h-screen bg-[#15161B] text-white overflow-hidden relative">
      <div className="fixed inset-0 bg-black/20 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]"></div>
      </div>

      <div className="fixed top-1 right-3 z-50 flex items-center">
        <Link
          href="https://x.com/projecttolkien"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white font-semibold text-base hover:text-gray-300 transition-colors pointer-events-auto px-2 py-1"
        >
          𝕏
        </Link>
        <div className="pointer-events-auto">
          <AddressDisplay contractAddress={contractAddress} />
        </div>
      </div>
      
      <div className="relative z-10 flex flex-col items-center p-4 sm:p-8">
        <div className="text-center my-8">
          <img 
            src="/power.png" 
            alt="Power" 
            className="h-16 sm:h-24 mx-auto mb-4"
          />
        </div>

        {tokenMintEmpty ? (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[60vh]">
            <div className="animate-spin">
              <img 
                src="/pump.png" 
                alt="Pump" 
                className="h-32 sm:h-48 mx-auto"
              />
            </div>
            <p className="text-white/60 text-lg mt-8 text-center max-w-md">
              Token mint not configured. Please set TOKEN_MINT environment variable.
            </p>
          </div>
        ) : noHolders ? (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[60vh]">
            <div className="animate-spin">
              <img 
                src="/pump.png" 
                alt="Pump" 
                className="h-32 sm:h-48 mx-auto"
              />
            </div>
            <p className="text-white/60 text-lg mt-8 text-center max-w-md">
              No token holders found. Waiting for participants...
            </p>
          </div>
        ) : (
          <>
            <CountdownTimer 
              serverTimeOffset={serverTimeOffset}
              isTimeSynced={isTimeSynced}
              onSyncNeeded={syncServerTime}
            />

            {/* Stats Display */}
            {stats && (
              <div className="w-full max-w-2xl mb-6">
                <div className="bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-white/60 text-sm">Total Buybacks</p>
                      <p className="text-xl font-bold text-white">{stats.total_buybacks || 0}</p>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Total SOL</p>
                      <p className="text-xl font-bold text-white">{formatSolAmount(stats.total_sol_spent || 0)}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-white/60 text-sm">Total Tokens</p>
                      <p className="text-xl font-bold text-white">{formatTokens(stats.total_tokens_received || 0)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="w-full max-w-2xl">
              <div className="flex items-center justify-center gap-3 mb-6">
                <h2 className="text-2xl sm:text-3xl font-semibold">
                  Recent Buybacks
                </h2>
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh buybacks"
                >
                  <svg
                    className={`w-5 h-5 text-white ${isRefreshing ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
                <div className="">
                  <a href="https://solscan.io/account/9F81pz8egr38BERVdJLzQWchvWKmeDpH6bGkaLtwW9Rh" className="text-blue-500 underline">solscan</a>
                </div>
              </div>
              
              <div className="space-y-4">
                {buybacks.length === 0 ? (
                  <div className="bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center">
                    <p className="text-white/60 text-lg font-semibold">
                      No buybacks yet...
                    </p>
                  </div>
                ) : (
                  buybacks.map((buyback, i) => (
                    <div
                      key={buyback.id || i}
                      className="bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-4 sm:p-6 hover:bg-black/50 transition-all duration-200"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-mono text-lg font-bold text-green-400">
                              BUYBACK
                            </p>
                            <span className="text-xs bg-white/10 px-2 py-1 rounded">
                              Cycle #{buyback.cycle_id}
                            </span>
                          </div>
                          <p className="text-xs text-white/60 mb-1">
                            {buyback.executed_at ? new Date(buyback.executed_at).toLocaleString() : 'Invalid Date'}
                          </p>
                          {buyback.tokens_received > 0 && (
                            <p className="text-sm text-blue-300">
                              {formatTokens(buyback.tokens_received)} tokens received
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xl sm:text-2xl text-white font-bold">
                            {formatSolAmount(buyback.sol_amount)} SOL
                          </p>
                          {buyback.signature && (
                            <a
                              href={`https://solscan.io/tx/${buyback.signature}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 underline font-semibold"
                            >
                              View on Solscan →
                            </a>
                          )}
                          {!buyback.signature && buyback.sol_amount === 0 && (
                            <p className="text-xs text-yellow-400">
                              No fees to buy back
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}