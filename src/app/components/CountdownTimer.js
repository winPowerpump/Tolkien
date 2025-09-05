// components/CountdownTimer.js
"use client";

import { useEffect, useState } from "react";

const CountdownTimer = ({ serverTimeOffset, isTimeSynced, onSyncNeeded }) => {
  const [countdown, setCountdown] = useState(60);

  // Get server-synchronized time
  const getServerTime = () => {
    const localTime = new Date();
    return new Date(localTime.getTime() + serverTimeOffset);
  };

  // Calculate seconds until next minute using server time
  const getSecondsUntilNextMinute = () => {
    const serverTime = getServerTime();
    const secondsElapsed = serverTime.getSeconds();
    const millisecondsElapsed = serverTime.getMilliseconds();
    
    const totalElapsedMs = (secondsElapsed * 1000) + millisecondsElapsed;
    const millisecondsUntilNext = 60000 - totalElapsedMs;
    return Math.ceil(millisecondsUntilNext / 1000);
  };

  // Update countdown every second
  useEffect(() => {
    if (!isTimeSynced) return;

    const interval = setInterval(() => {
      const secondsLeft = getSecondsUntilNextMinute();
      setCountdown(secondsLeft);
      
      if (secondsLeft >= 59) {
        setTimeout(() => {
          onSyncNeeded();
        }, 2000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimeSynced, serverTimeOffset, onSyncNeeded]);

  return (
    <div className="bg-black/40 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-6 sm:p-8 text-center mb-8 min-w-[280px]">
      <div className="flex items-center justify-center gap-2 mb-3">
        <p className="text-base font-semibold text-white">Next pump in</p>
        {!isTimeSynced && (
          <span className="text-xs text-yellow-400 bg-yellow-400/20 px-2 py-1 rounded">
            Syncing...
          </span>
        )}
      </div>
      <div className="bg-[#67D682] rounded-2xl p-4">
        <h2 className="text-5xl sm:text-6xl font-bold">{countdown}s</h2>
      </div>
      <div className="mt-3">
        <p className="text-xs text-white/60 mx-[10%]">
          *Pump reward takes about ~40sec. to get to winner
        </p>
      </div>
    </div>
  );
};

export default CountdownTimer;