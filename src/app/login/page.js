"use client";

import React, { useState } from "react";
import { Heart, Mail, Lock, User } from "lucide-react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // 'login' or 'signup'

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/" });
  };


  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-[#FFF5F5]">
      {/* Header Section */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FFE6E9] mb-6">
          <Heart className="w-8 h-8 text-[#FF818D] fill-[#FF818D]" />
        </div>
        <h1 className="text-4xl font-bold text-[#4A4A4A] mb-2">Welcome, Mama</h1>
        <p className="text-[#8E8E8E] text-lg">Let's count those little kicks together.</p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(255,129,141,0.1)] mb-8">
        {/* Social Login */}
        <button 
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 py-4 border border-[#F0F0F0] rounded-full text-[#4A4A4A] font-medium hover:bg-gray-50 transition-colors mb-8"
        >

          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        {/* Separator */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-[1px] bg-[#F0F0F0]"></div>
          <span className="text-[#B0B0B0] text-xs font-bold uppercase tracking-wider">OR</span>
          <div className="flex-1 h-[1px] bg-[#F0F0F0]"></div>
        </div>

        {/* Auth Toggle */}
        <div className="flex p-1 bg-[#F7ECEC] rounded-full mb-8">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 py-3 px-6 rounded-full font-semibold transition-all ${
              mode === "login"
                ? "bg-white text-[#FF818D] shadow-sm border border-[#F0F0F0]"
                : "text-[#8E8E8E] font-medium"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 py-3 px-6 rounded-full font-semibold transition-all ${
              mode === "signup"
                ? "bg-white text-[#FF818D] shadow-sm border border-[#FF818D]"
                : "text-[#8E8E8E] font-medium"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form className="space-y-6">
          {mode === "signup" && (
            <div className="space-y-2">
              <label className="text-[#4A4A4A] font-bold text-sm ml-1">Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#B0B0B0]" />
                <input
                  type="text"
                  placeholder="Mama"
                  className="w-full py-4 pl-12 pr-4 bg-[#FDF1F1] rounded-2xl border-none focus:ring-2 focus:ring-[#FF818D] transition-all text-[#4A4A4A] placeholder:text-[#B0B0B0]"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[#4A4A4A] font-bold text-sm ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#B0B0B0]" />
              <input
                type="email"
                placeholder="mama@example.com"
                className="w-full py-4 pl-12 pr-4 bg-[#FDF1F1] rounded-2xl border-none focus:ring-2 focus:ring-[#FF818D] transition-all text-[#4A4A4A] placeholder:text-[#B0B0B0]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[#4A4A4A] font-bold text-sm ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#B0B0B0]" />
              <input
                type="password"
                placeholder={mode === "login" ? "........" : "At least 6 characters"}
                className="w-full py-4 pl-12 pr-4 bg-[#FDF1F1] rounded-2xl border-none focus:ring-2 focus:ring-[#FF818D] transition-all text-[#4A4A4A] placeholder:text-[#B0B0B0]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-5 bg-[#FF818D] text-white font-bold rounded-full shadow-[0_10px_25px_rgba(255,129,141,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all mt-4"
          >
            {mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>

      {/* Footer Medical Disclaimer */}
      <p className="text-[#B0B0B0] text-sm text-center max-w-xs leading-relaxed">
        This app is for tracking purposes only and does not replace medical advice.
      </p>
    </div>
  );
}
