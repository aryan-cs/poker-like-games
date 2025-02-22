'use client'
import Image from "next/image";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Card from "../components/card";
import Stats from "../components/stats";

export default function Home() {
  const [dissapear, setDissapear] = useState(null);
  const [dashboardVisible, setDashboardVisible] = useState(false);
  const [cardNumber, setCardNumber] = useState(1); // State for card number

  useEffect(() => {
    setDissapear(document.querySelector("main"));
  }, []);

  function blurOut() {
    const id = setInterval(progress, 1);
    let i = 0.1;
    function progress() {
      dissapear.style.filter = `blur(${i}px)`;
      dissapear.style.opacity = (100 - i) / 100;
      i *= 1.1;
      if (i > 100) {
        clearInterval(id);
        dissapear.style.display = "none";
        document.getElementsByTagName("footer")[0].style.display = "none";
        setDashboardVisible(true);
      }
    }
  }

  return (
    <div className="overflow-hidden grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-center">
        <ol className="list-inside list-decimal text-5xl text-center sm:text-center mb-10 font-[family-name:var(--font-geist-mono)]">
          Welcome to Simple Poker.
        </ol>
        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full cursor-pointer border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:w-48"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              blurOut();
            }}
          >
            Start Game
          </a>
        </div>
      </main>

      <div 
        id="playerDashboard" 
        className={`bg-red-500 absolute bottom-0 self-end p-4 flex gap-4 items-center flex-col sm:flex-row transition-all duration-500 ${dashboardVisible ? 'animate-slideUp' : 'translate-y-full'}`}
        style={{ width: 'min(75vh, 80vw)', height: 'min(35vh, 55vw)' }}
      >
        <Card key={1} cardNumber={cardNumber} />
        {/* <Stats key={1000} moneyValue={2}/> */}
      </div>

      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://www.overleaf.com/project/6795734abf411eb999d5b520"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Read Paper
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://github.com/aryan-cs/poker-like-games"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          GitHub
        </a>
      </footer>
    </div>
  );
}
