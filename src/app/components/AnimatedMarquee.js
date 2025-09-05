const AnimatedMarquee = () => {
  return (
    <div className="absolute top-0 index-0 w-screen text-sm py-[2px] text-white overflow-hidden">
      <div className="marquee-container">
        <div className="marquee-content">
          Powerpump is a fully automated lottery protocol built on&nbsp;
          <a className="text-blue-500 underline" href="https://pump.fun">pump.fun</a>. 
          Users who hold the $POWER token are automatically eligible for the pump jackpot. 
          Users have a weight assigned to them based on how much they hold relative to others. 
          Fully transparent, equitable, and fair. Happy pumping!&nbsp;
        </div>
        <div className="marquee-content" aria-hidden="true">
          Powerpump is a fully automated lottery protocol built on&nbsp;
          <a className="text-blue-500 underline" href="https://pump.fun">pump.fun</a>. 
          Users who hold the $POWER token are automatically eligible for the pump jackpot. 
          Users have a weight assigned to them based on how much they hold relative to others. 
          Fully transparent, equitable, and fair. Happy pumping!&nbsp;
        </div>
      </div>
      
      <style jsx>{`
        .marquee-container {
          display: flex;
          width: max-content;
          animation: scroll-left 30s linear infinite;
        }
        
        .marquee-content {
          flex-shrink: 0;
          white-space: nowrap;
          padding-right: 2rem;
        }
        
        @keyframes scroll-left {
          0% {
            transform: translateX(100vw);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        /* Pause animation on hover */
        .marquee-container:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

export default AnimatedMarquee;