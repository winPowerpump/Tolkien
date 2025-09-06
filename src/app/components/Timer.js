// components/CountdownTimer.js
"use client";

import { useEffect, useState } from "react";

const CountdownTimer = ({ serverTimeOffset, isTimeSynced, onSyncNeeded }) => {
  const [countdown, setCountdown] = useState(300); // Changed from 60 to 300 (5 minutes)

  // Get server-synchronized time
  const getServerTime = () => {
    const localTime = new Date();
    return new Date(localTime.getTime() + serverTimeOffset);
  };

  // Calculate seconds until next 5-minute interval using server time
  const getSecondsUntilNext5Minutes = () => {
    const serverTime = getServerTime();
    const minutes = serverTime.getMinutes();
    const seconds = serverTime.getSeconds();
    const milliseconds = serverTime.getMilliseconds();
    
    // Calculate minutes elapsed in the current 5-minute cycle
    const minutesInCycle = minutes % 5;
    
    // Calculate total elapsed time in the current 5-minute cycle
    const totalElapsedMs = (minutesInCycle * 60 * 1000) + (seconds * 1000) + milliseconds;
    
    // Calculate milliseconds until the next 5-minute mark
    const millisecondsUntilNext = (5 * 60 * 1000) - totalElapsedMs;
    
    return Math.ceil(millisecondsUntilNext / 1000);
  };

  // Format countdown display (mm:ss)
  const formatCountdown = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Update countdown every second
  useEffect(() => {
    if (!isTimeSynced) return;

    const interval = setInterval(() => {
      const secondsLeft = getSecondsUntilNext5Minutes();
      setCountdown(secondsLeft);
      
      // Trigger sync when we're close to the next distribution (299+ seconds means we just passed a 5-minute mark)
      if (secondsLeft >= 299) {
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
        <h2 className="text-5xl sm:text-6xl font-bold">{formatCountdown(countdown)}</h2>
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