const AnimatedMarquee = () => {
  return (
    <div className="absolute top-0 index-0 w-screen text-sm py-[2px] text-white overflow-hidden">
      <div className="flex w-max animate-marquee hover:pause">
        <div className="flex-shrink-0 whitespace-nowrap pr-8">
          Powerpump is a fully automated lottery protocol built on&nbsp;
          <a className="text-blue-500 underline" href="https://pump.fun">pump.fun</a>. 
          Users who hold the $POWER token are automatically eligible for the pump jackpot. 
          Users have a weight assigned to them based on how much they hold relative to others. 
          Fully transparent, equitable, and fair. Happy pumping!&nbsp;
        </div>
        <div className="flex-shrink-0 whitespace-nowrap pr-8" aria-hidden="true">
          Powerpump is a fully automated lottery protocol built on&nbsp;
          <a className="text-blue-500 underline" href="https://pump.fun">pump.fun</a>. 
          Users who hold the $POWER token are automatically eligible for the pump jackpot. 
          Users have a weight assigned to them based on how much they hold relative to others. 
          Fully transparent, equitable, and fair. Happy pumping!&nbsp;
        </div>
      </div>
    </div>
  );
};

export default AnimatedMarquee;