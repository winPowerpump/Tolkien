// Create a separate file: components/IsolatedMarquee.jsx
"use client";

import { memo } from "react";
import Marquee from "react-fast-marquee";

const IsolatedMarquee = memo(() => {
  return (
    <div className="absolute top-0 left-0 w-screen text-sm py-[2px] z-0">
      <Marquee speed={100} gradient={false}>
        Powerpump is a fully automated lottery protocol built on&nbsp;
        <a className="text-blue-500 underline" href="https://pump.fun">pump.fun</a>
        . Users who hold the $POWER token are automatically eligible for the pump jackpot. Users have a weight assigned to them based on how much they hold relative to others. Fully transparent, equitable, and fair. Happy pumping!&nbsp;
        Powerpump is a fully automated lottery protocol built on&nbsp;
        <a className="text-blue-500 underline" href="https://pump.fun">pump.fun</a>
        . Users who hold the $POWER token are automatically eligible for the pump jackpot. Users have a weight assigned to them based on how much they hold relative to others. Fully transparent, equitable, and fair. Happy pumping!&nbsp;
      </Marquee>
    </div>
  );
});

IsolatedMarquee.displayName = 'IsolatedMarquee';

export default IsolatedMarquee;