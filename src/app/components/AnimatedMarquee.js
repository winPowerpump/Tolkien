import { memo } from 'react';
import Marquee from "react-fast-marquee";

const AnimatedMarquee = () => {
  return (
    <div className="absolute top-0 index-0 w-screen text-sm py-[2px] text-white">
      <Marquee speed={100}>
        Powerpump is a fully automated lottery protocol built on&nbsp;
        <a className="text-blue-500 underline" href="https://pump.fun">pump.fun</a>. 
        Users who hold the $POWER token are automatically eligible for the pump jackpot. 
        Users have a weight assigned to them based on how much they hold relative to others. 
        Fully transparent, equitable, and fair. Happy pumping!&nbsp;
        Powerpump is a fully automated lottery protocol built on&nbsp;
        <a className="text-blue-500 underline" href="https://pump.fun">pump.fun</a>. 
        Users who hold the $POWER token are automatically eligible for the pump jackpot. 
        Users have a weight assigned to them based on how much they hold relative to others. 
        Fully transparent, equitable, and fair. Happy pumping!&nbsp;
      </Marquee>
    </div>
  );
};

// Wrap with React.memo to prevent re-renders
export default memo(AnimatedMarquee);