"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [countdown, setCountdown] = useState(60);
  const [winners, setWinners] = useState([]);
  const [debugData, setDebugData] = useState(null);
  const [loading, setLoading] = useState(false);

  // countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 60));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // fetch winners list
  async function fetchWinners() {
    try {
      const res = await fetch("/api/claim", { method: "POST" });
      const data = await res.json();
      setWinners(data.winners || []);
    } catch (e) {
      console.error(e);
    }
  }

  // poll winners every 10s
  useEffect(() => {
    fetchWinners();
    const interval = setInterval(fetchWinners, 10000);
    return () => clearInterval(interval);
  }, []);

  // manually trigger claim + distribute
  async function handleManualClaim() {
    setLoading(true);
    try {
      const res = await fetch("/api/claim"); // GET triggers claim + distribute
      const data = await res.json();
      setDebugData(data);
      fetchWinners();
    } catch (e) {
      setDebugData({ error: e.message });
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-900 via-black to-purple-950 text-white flex flex-col items-center p-8">
      <h1 className="text-4xl font-bold mb-6">💸 Pump.fun Fee Distributor</h1>

      {/* Countdown */}
      <div className="bg-purple-800 rounded-2xl shadow-lg p-6 text-center mb-6">
        <p className="text-lg">⏳ Next distribution in:</p>
        <h2 className="text-5xl font-extrabold mt-2">{countdown}s</h2>
      </div>

      {/* Manual Trigger */}
      <button
        onClick={handleManualClaim}
        disabled={loading}
        className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-black font-bold py-3 px-6 rounded-xl mb-8 shadow-lg transition"
      >
        {loading ? "Claiming..." : "⚡ Trigger Claim + Distribute"}
      </button>

      {/* Winners List */}
      <h2 className="text-2xl font-semibold mb-4">🏆 Past Winners</h2>
      <div className="w-full max-w-2xl space-y-3 mb-8">
        {winners.length === 0 ? (
          <p className="text-gray-400 text-center">No winners yet...</p>
        ) : (
          winners.map((w, i) => (
            <div
              key={i}
              className="bg-purple-700 rounded-xl shadow p-4 flex justify-between items-center"
            >
              <div>
                <p className="font-mono text-sm">
                  {w.wallet.slice(0, 6)}...{w.wallet.slice(-6)}
                </p>
                <p className="text-xs text-gray-300">
                  {new Date(w.time).toLocaleTimeString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{w.amount.toFixed(4)} SOL</p>
                <a
                  href={`https://solscan.io/tx/${w.sig}`}
                  target="_blank"
                  className="text-xs text-blue-300 hover:underline"
                >
                  View Tx
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Debug Info */}
      <details className="w-full max-w-2xl bg-gray-900 rounded-xl p-4 text-sm">
        <summary className="cursor-pointer font-bold text-yellow-400">
          🛠 Debug Info
        </summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-gray-300">
          {debugData ? JSON.stringify(debugData, null, 2) : "No debug data yet"}
        </pre>
      </details>
    </main>
  );
}