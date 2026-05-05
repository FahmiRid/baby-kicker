"use client";

import LoginPage from "./login/page";
import Dashboard from "./dashboard/page";
import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF5F5]">
        <div className="animate-pulse text-[#FF818D] font-bold text-xl">Loading...</div>
      </div>
    );
  }

  if (session) {
    return <Dashboard />;
  }

  return <LoginPage />;
}


