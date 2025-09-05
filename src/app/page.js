"use client";

import { useEffect, useState } from "react";
import AddressDisplay from "./components/copy";
import Link from "next/link";

export default function Home() {
  const [countdown, setCountdown] = useState(60);
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(false);

  const contractAddress = "XXXpump"

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 60));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  async function fetchWinners() {
    try {
      const res = await fetch("/api/claim", { method: "POST" });
      const data = await res.json();
      setWinners(data.winners || []);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    fetchWinners();
    const interval = setInterval(fetchWinners, 10000);
    return () => clearInterval(interval);
  }, []);

  async function handleManualClaim() {
    setLoading(true);
    try {
      const res = await fetch("/api/claim");
      await res.json();
      fetchWinners();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#15161B] text-white overflow-hidden relative">

      <div className="absolute inset-0 bg-black/20 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]"></div>
      </div>

      <div className="fixed top-3 right-3 z-50 flex items-center">
        <Link
          href="https://x.com/powerpumpfun"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white font-semibold text-base hover:text-gray-300 transition-colors pointer-events-auto bg-black/20 backdrop-blur-sm rounded-lg px-2 py-1"
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

        <div className="bg-black/40 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-6 sm:p-8 text-center mb-8 min-w-[280px]">
          <div className="flex items-center justify-center gap-2 mb-3">
            <p className="text-base font-semibold text-white">Next pump in</p>
          </div>
          <div className="bg-[#67D682] rounded-2xl p-4">
            <h2 className="text-5xl sm:text-6xl font-bold">{countdown}s</h2>
          </div>
        </div>

        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-center gap-3 mb-6">
            <h2 className="text-2xl sm:text-3xl font-semibold">
              Recent Winners
            </h2>
          </div>
          
          <div className="space-y-4">
            {winners.length === 0 ? (
              <div className="bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center">
                <p className="text-white/60 text-lg font-semibold">
                  No winners yet...
                </p>
              </div>
            ) : (
              winners.map((w, i) => (
                <div
                  key={i}
                  className="bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-4 sm:p-6 hover:bg-black/50 transition-all duration-200"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-mono text-sm sm:text-base font-bold text-white">
                        {w.wallet.slice(0, 6)}...{w.wallet.slice(-6)}
                      </p>
                      <p className="text-xs text-white/60 mt-1">
                        {w.created_at ? new Date(w.created_at).toLocaleString() : 'Invalid Date'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl sm:text-2xl text-white">
                        {w.amount.toFixed(4)} SOL
                      </p>
                      {w.signature && (
                        <a
                          href={`https://solscan.io/tx/${w.signature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 underline font-semibold"
                        >
                          View on Solscan →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}