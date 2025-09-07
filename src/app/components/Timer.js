// components/CountdownTimer.js
"use client";

import { useEffect, useState } from "react";

const CountdownTimer = ({ serverTimeOffset, isTimeSynced, onSyncNeeded }) => {
  const [countdown, setCountdown] = useState(10800); // Changed to 10800 (180 minutes = 3 hours)

  // Get server-synchronized time
  const getServerTime = () => {
    const localTime = new Date();
    return new Date(localTime.getTime() + serverTimeOffset);
  };

  // Calculate seconds until next 3-hour interval using server time
  const getSecondsUntilNext3Hours = () => {
    const serverTime = getServerTime();
    const hours = serverTime.getHours();
    const minutes = serverTime.getMinutes();
    const seconds = serverTime.getSeconds();
    const milliseconds = serverTime.getMilliseconds();
    
    // Calculate hours elapsed in the current 3-hour cycle
    const hoursInCycle = hours % 3;
    
    // Calculate total elapsed time in the current 3-hour cycle
    const totalElapsedMs = (hoursInCycle * 60 * 60 * 1000) + (minutes * 60 * 1000) + (seconds * 1000) + milliseconds;
    
    // Calculate milliseconds until the next 3-hour mark
    const millisecondsUntilNext = (3 * 60 * 60 * 1000) - totalElapsedMs;
    
    return Math.ceil(millisecondsUntilNext / 1000);
  };

  // Format countdown display (hh:mm:ss)
  const formatCountdown = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Update countdown every second
  useEffect(() => {
    if (!isTimeSynced) return;

    const interval = setInterval(() => {
      const secondsLeft = getSecondsUntilNext3Hours();
      setCountdown(secondsLeft);
      
      // Trigger sync when we're close to the next distribution (10799+ seconds means we just passed a 3-hour mark)
      if (secondsLeft >= 10799) {
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