// components/CountdownTimer.js
"use client";

import { useEffect, useState } from "react";

const CountdownTimer = ({ serverTimeOffset, isTimeSynced, onSyncNeeded }) => {
  const [countdown, setCountdown] = useState(180); // 3 minutes in seconds

  // Get server-synchronized time
  const getServerTime = () => {
    const localTime = new Date();
    return new Date(localTime.getTime() + serverTimeOffset);
  };

  // Calculate seconds until next 3-minute interval using server time
  const getSecondsUntilNext3Minutes = () => {
    const serverTime = getServerTime();
    const minutes = serverTime.getMinutes();
    const seconds = serverTime.getSeconds();
    const milliseconds = serverTime.getMilliseconds();
    
    // 3-minute intervals: 0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57
    const validMinutes = Array.from({ length: 20 }, (_, i) => i * 3);
    
    // Find the next valid minute
    let nextValidMinute = validMinutes.find(validMinute => validMinute > minutes);
    
    // If no valid minute found this hour, next is 0 (next hour)
    if (!nextValidMinute) {
      nextValidMinute = 60; // Will be handled as next hour at 00 minutes
    }
    
    // Calculate total elapsed time since the last valid minute mark
    const lastValidMinute = validMinutes.filter(validMinute => validMinute <= minutes).pop() || 0;
    const minutesElapsed = minutes - lastValidMinute;
    const totalElapsedMs = (minutesElapsed * 60 * 1000) + (seconds * 1000) + milliseconds;
    
    // Calculate milliseconds until the next 3-minute mark
    const minutesUntilNext = nextValidMinute - minutes;
    const millisecondsUntilNext = (minutesUntilNext * 60 * 1000) - (seconds * 1000) - milliseconds;
    
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
      const secondsLeft = getSecondsUntilNext3Minutes();
      setCountdown(secondsLeft);
      
      // Trigger sync when we're close to the next distribution (within 1 second of a 3-minute mark)
      if (secondsLeft <= 1) {
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
        <p className="text-base font-semibold text-white">Next buy in</p>
        {!isTimeSynced && (
          <span className="text-xs text-yellow-400 bg-yellow-400/20 px-2 py-1 rounded">
            Syncing...
          </span>
        )}
      </div>
      <div className="bg-yellow-600 rounded-2xl p-4">
        <h2 className="text-5xl sm:text-6xl font-bold">{formatCountdown(countdown)}</h2>
      </div>
      <div className="mt-3">
        <p className="text-xs text-white/60 mx-[10%]">
          *Buyback takes about ~40sec. to land on-chain
        </p>
      </div>
    </div>
  );
};

export default CountdownTimer;