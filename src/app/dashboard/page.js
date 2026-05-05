"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { 
  Heart, Home, History as HistoryIcon, BarChart2, Settings as SettingsIcon, Pause, Square, Play, 
  CheckCircle, Calendar, Clock, Sparkles, User, Bell, HelpCircle, LogOut, Lightbulb, ChevronLeft, ChevronRight, X, Share
} from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("home"); 
  const [historyFilter, setHistoryFilter] = useState("day"); 
  const [kicks, setKicks] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pregnancy state (sync with DB)
  const [profile, setProfile] = useState({
    name: "",
    weeks: 25,
    days: 4,
    edd: "2026-08-16",
    dailyGoal: 10
  });

  // Tips Slider State
  const tips = [
    "Try to count at the same time each day when your baby is usually active. ❤️",
    "Lie on your left side for the best results and maximum comfort. ✨",
    "Drink a cold glass of water or juice if baby is being a bit sleepy. 🍎",
    "Gentle massage on your belly can sometimes encourage baby to move! 👐"
  ];
  const [activeTip, setActiveTip] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTip((prev) => (prev + 1) % tips.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [tips.length]);

  // Custom Date Picker State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewDate, setViewDate] = useState(new Date(profile.edd || new Date()));

  // Tooltip state for chart
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, data: null });
  const chartRef = useRef(null);

  // Fetch history and profile from Supabase
  useEffect(() => {
    if (session?.user?.email) {
      fetchHistory();
      fetchProfile();
    }
  }, [session, activeTab]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.email)
      .single();

    if (data && !error) {
      setProfile({
        name: data.name || session?.user?.name || "",
        weeks: data.weeks_pregnant,
        days: data.days_pregnant,
        edd: data.due_date,
        dailyGoal: data.daily_goal
      });
      setViewDate(new Date(data.due_date));
    } else if (!data) {
      setProfile(prev => ({ ...prev, name: session?.user?.name || "" }));
    }
  };

  // Toast state
  const [toast, setToast] = useState({ show: false, message: "" });

  const triggerToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newProfile = {
      name: formData.get("name"),
      weeks: parseInt(formData.get("weeks")),
      days: parseInt(formData.get("days")),
      edd: profile.edd,
      dailyGoal: parseInt(formData.get("goal"))
    };

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: session.user.email,
        name: newProfile.name,
        weeks_pregnant: newProfile.weeks,
        days_pregnant: newProfile.days,
        due_date: newProfile.edd,
        daily_goal: newProfile.dailyGoal,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error("Error saving profile:", error);
      triggerToast("Oops! Something went wrong. 🥺");
    } else {
      setProfile(newProfile);
      triggerToast("Profile updated beautifully! 💛✨");
    }
  };

  const handleShare = async () => {
    if (!summaryData) return;
    const shareText = `I just felt ${summaryData.kicks} kicks from my little one in ${summaryData.duration}! 👶💛 Tracked with Baby Kicker.`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Baby Kicks Tracked!',
          text: shareText,
          url: window.location.origin,
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(shareText);
      triggerToast("Result copied to clipboard! 📋✨");
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('history')
      .select('*')
      .eq('user_email', session.user.email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching history:", error);
    } else {
      setHistory(data.map(item => ({
        id: item.id,
        date: new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        rawDate: new Date(item.created_at).toISOString().split('T')[0],
        time: item.session_time,
        kicks: item.kicks,
        duration: item.duration,
        duration_seconds: item.duration_seconds,
        status: item.status,
      })));
    }
    setLoading(false);
  };

  // Timer logic
  useEffect(() => {
    let interval = null;
    if (isActive) {
      if (!startTime) setStartTime(new Date());
      interval = setInterval(() => {
        setSeconds((seconds) => seconds + 1);
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds, startTime]);

  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleKick = () => {
    if (!isActive) {
      setIsActive(true);
      setStartTime(new Date());
    }
    if (kicks < profile.dailyGoal * 2) {
      setKicks(kicks + 1);
    }
  };

  const handleEndSession = async () => {
    if (!startTime) return;
    const durationSeconds = seconds;
    const finalKicks = kicks;
    const formattedDuration = formatTime(durationSeconds);
    const formattedTimeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (session?.user?.email) {
      const { error } = await supabase
        .from('history')
        .insert([{
          user_email: session.user.email,
          kicks: finalKicks,
          duration: formattedDuration,
          duration_seconds: durationSeconds,
          session_time: formattedTimeStr,
          status: finalKicks >= profile.dailyGoal ? "good" : "low"
        }]);

      if (error) console.error("Error saving history:", error);
      else fetchHistory();
    }

    setSummaryData({
      date: startTime.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      startTime: formattedTimeStr,
      kicks: finalKicks,
      duration: formattedDuration,
      dateFormatted: startTime.toLocaleDateString(),
    });
    
    setShowSummary(true);
    setIsActive(false);
  };

  const resetSession = () => {
    setKicks(0);
    setSeconds(0);
    setStartTime(null);
    setShowSummary(false);
    setSummaryData(null);
  };

  const togglePause = () => setIsActive(!isActive);

  // Custom Calendar Logic
  const renderCalendar = () => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
    
    const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

    const handleDateSelect = (day) => {
      const y = viewDate.getFullYear();
      const m = String(viewDate.getMonth() + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      const eddString = `${y}-${m}-${d}`;
      setProfile({ ...profile, edd: eddString });
      setShowDatePicker(false);
    };

    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-[#4A4A4A]">{months[viewDate.getMonth()]} {viewDate.getFullYear()}</h3>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-2 hover:bg-[#FFF5F5] rounded-full transition-colors"><ChevronLeft className="w-5 h-5 text-[#FF818D]" /></button>
              <button onClick={nextMonth} className="p-2 hover:bg-[#FFF5F5] rounded-full transition-colors"><ChevronRight className="w-5 h-5 text-[#FF818D]" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} className="text-center text-[10px] font-black text-[#B0B0B0] py-2 uppercase">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {[...Array(firstDayOfMonth)].map((_, i) => <div key={`empty-${i}`} />)}
            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const dateString = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = profile.edd === dateString;
              return (
                <button 
                  key={day} 
                  onClick={() => handleDateSelect(day)}
                  className={`aspect-square rounded-2xl flex items-center justify-center text-sm font-bold transition-all ${isSelected ? 'bg-[#FF818D] text-white shadow-lg scale-110' : 'hover:bg-[#FFF5F5] text-[#4A4A4A]'}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <button onClick={() => setShowDatePicker(false)} className="w-full mt-8 py-4 bg-[#FDF1F1] text-[#FF818D] font-bold rounded-full flex items-center justify-center gap-2 active:scale-95 transition-all"><X className="w-4 h-4" /> Close</button>
        </div>
      </div>
    );
  };

  const renderHome = () => {
    const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return "Good morning";
      if (hour < 17) return "Good afternoon";
      return "Good evening";
    };

    const trimester = profile.weeks <= 12 ? 1 : profile.weeks <= 26 ? 2 : 3;
    const totalDays = 280;
    const currentDays = (profile.weeks * 7) + profile.days;
    const daysLeft = totalDays - currentDays;
    const progressPercent = (currentDays / totalDays) * 100;

    if (showSummary && summaryData) {
      return (
        <div className="flex flex-col items-center pt-0 pb-32 animate-in fade-in zoom-in-95 slide-in-from-bottom-10 duration-700 ease-out fill-mode-both min-h-screen bg-[#FFF5F5]">
          {/* Summary Header */}
          <header className="w-full px-6 py-6 flex items-center justify-between sticky top-0 bg-[#FFF5F5]/80 backdrop-blur-md z-20">
            <button onClick={resetSession} className="p-2 hover:bg-white/50 rounded-full transition-colors active:scale-90"><ChevronLeft className="w-6 h-6 text-[#4A4A4A]" /></button>
            <h2 className="text-xl font-bold text-[#4A4A4A]">Session Result</h2>
            <button onClick={handleShare} className="p-2 hover:bg-white/50 rounded-full transition-colors active:scale-90"><Share className="w-6 h-6 text-[#4A4A4A]" /></button>
          </header>

          <div className="flex flex-col items-center px-6 w-full max-w-2xl mx-auto">
            <div className="relative mb-8 mt-6 animate-in zoom-in-50 duration-700 delay-300 fill-mode-both">
            <div className="w-24 h-24 rounded-full bg-[#FF818D] flex items-center justify-center shadow-lg relative z-10">
              <div className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center"><CheckCircle className="w-8 h-8 text-white fill-none" /></div>
            </div>
            <Sparkles className="absolute -top-2 -right-2 text-[#FFD700] w-6 h-6 animate-pulse" />
            <Sparkles className="absolute -bottom-2 -left-2 text-[#FFD700] w-6 h-6 animate-pulse delay-75" />
          </div>
          
          <div className="text-center mb-10 animate-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-both">
            <h1 className="text-4xl font-bold text-[#4A4A4A] mb-2 tracking-tight">Great Job, Mama! 💛</h1>
            <p className="text-[#8E8E8E] text-lg mb-2">You felt {summaryData.kicks} kicks in:</p>
            <p className="text-5xl font-black text-[#FF818D] tracking-tight">{summaryData.duration}</p>
          </div>

          <div className="w-full max-w-md bg-[#FFF9E6] border border-[#FFE6A1] rounded-[2rem] p-6 flex items-start gap-4 mb-8 animate-in slide-in-from-bottom-4 duration-700 delay-700 fill-mode-both">
            <div className="w-10 h-10 rounded-full bg-[#FFC107] flex items-center justify-center flex-shrink-0"><CheckCircle className="w-5 h-5 text-white" /></div>
            <div className="space-y-1"><p className="font-bold text-[#4A4A4A] text-sm leading-tight">Keep tracking your baby's kicks.</p><p className="text-[#8E8E8E] text-xs leading-relaxed">Keep tracking your baby's movements every day. <span className="text-[#FF818D]">❤️</span></p></div>
          </div>

          <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-[0_15px_40px_rgba(0,0,0,0.04)] mb-10 animate-in slide-in-from-bottom-6 duration-700 delay-900 fill-mode-both">
            <h2 className="text-xl font-bold text-[#4A4A4A] mb-6">Session Summary</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between"><div className="flex items-center gap-3"><Calendar className="w-5 h-5 text-[#FF818D]" /><span className="text-[#8E8E8E] font-medium">Date</span></div><span className="font-bold text-[#4A4A4A]">{summaryData.dateFormatted}</span></div>
              <div className="flex items-center justify-between"><div className="flex items-center gap-3"><Clock className="w-5 h-5 text-[#FF818D]" /><span className="text-[#8E8E8E] font-medium">Start Time</span></div><span className="font-bold text-[#4A4A4A]">{summaryData.startTime}</span></div>
              <div className="flex items-center justify-between"><div className="flex items-center gap-3"><Heart className="w-5 h-5 text-[#FF818D]" /><span className="text-[#8E8E8E] font-medium">Kicks</span></div><span className="font-bold text-[#4A4A4A]">{summaryData.kicks}</span></div>
              <div className="flex items-center justify-between"><div className="flex items-center gap-3"><Clock className="w-5 h-5 text-[#FF818D]" /><span className="text-[#8E8E8E] font-medium">Duration</span></div><span className="font-bold text-[#4A4A4A]">{summaryData.duration}</span></div>
            </div>
          </div>
          
          <button onClick={resetSession} className="w-full max-w-md py-5 bg-[#FF818D] text-white font-bold rounded-full shadow-[0_10px_25px_rgba(255,129,141,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all animate-in slide-in-from-bottom-2 duration-500 delay-1000 fill-mode-both">Done</button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col font-sans pb-12">
        <div className="px-6 pt-12 pb-6 text-center sm:text-left max-w-2xl mx-auto w-full">
          <p className="text-[#B0B0B0] text-xs font-bold uppercase tracking-widest mb-1">{today}</p>
          <h1 className="text-3xl font-bold text-[#4A4A4A] mb-1">{getGreeting()}, {profile.name.split(" ")[0] || "Mama"}! 💛</h1>
          <p className="text-[#8E8E8E] text-lg">Let's count those little kicks.</p>
        </div>

        <div className="px-6 mb-8 max-w-lg mx-auto w-full">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#FFB7B2] via-[#FF9A5C] to-[#FF818D] rounded-[2rem] p-6 shadow-[0_15px_40px_rgba(255,129,141,0.2)] border border-white/20">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="relative z-10 flex flex-col items-center text-white">
              <div className="flex items-center gap-2 mb-1 bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">
                <Calendar className="w-3.5 h-3.5 text-white" />
                <span className="text-[9px] font-black uppercase tracking-[0.1em]">{new Date().toLocaleDateString("en-US", { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <h2 className="text-2xl font-black mb-1 mt-4 drop-shadow-sm tracking-tight text-center">{profile.weeks} Weeks, {profile.days} Days</h2>
              <div className="flex items-center gap-1.5 mb-6 opacity-90"><Sparkles className="w-3 h-3" /><span className="text-xs font-bold">Trimester {trimester}</span></div>
              <div className="w-full space-y-2">
                <div className="relative w-full h-3 bg-white/20 rounded-full backdrop-blur-sm p-0.5 shadow-inner">
                  <div className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }}></div>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <div className="flex flex-col"><span className="text-[9px] font-black uppercase tracking-widest opacity-70">Remaining</span><span className="text-base font-black">{daysLeft} Days</span></div>
                  <div className="text-right"><span className="text-[9px] font-black uppercase tracking-widest opacity-70">Due Date</span><span className="text-xs font-black">{new Date(profile.edd).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center py-4">
          <div className="relative w-64 h-64 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-[12px] border-[#FFF5F5]"></div>
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="128" cy="128" r="116" fill="transparent" stroke="#FFB7B2" strokeWidth="12" strokeDasharray={728} strokeDashoffset={728 - (728 * kicks) / profile.dailyGoal} strokeLinecap="round" className="transition-all duration-500 ease-out" />
            </svg>
            <div className="relative z-10 flex flex-col items-center -translate-y-4">
              <div className="w-32 h-32 flex items-center justify-center">
                <Image src="/baby-kick.png" alt="Baby" width={120} height={120} className="object-contain mix-blend-multiply" />
              </div>
              <div className="text-center -mt-2">
                <span className="text-7xl font-black text-[#FF818D] leading-none">{kicks}</span>
                <p className="text-[#B0B0B0] text-[10px] font-bold uppercase tracking-widest">/ {profile.dailyGoal} KICKS</p>
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 mb-10 max-w-md mx-auto w-full">
          <div className="bg-white rounded-3xl p-6 shadow-[0_10px_30px_rgba(255,129,141,0.08)] flex items-center border border-[#F0F0F0]">
            <div className="flex-1 text-center"><p className="text-[#B0B0B0] text-[10px] font-bold uppercase tracking-wider mb-1">Time Elapsed</p><p className="text-2xl font-bold text-[#4A4A4A]">{formatTime(seconds)}</p></div>
            <div className="w-[1px] h-10 bg-[#F0F0F0]"></div>
            <div className="flex-1 text-center"><p className="text-[#B0B0B0] text-[10px] font-bold uppercase tracking-wider mb-1">Goal</p><p className="text-2xl font-bold text-[#FF818D]">{profile.dailyGoal} Kicks</p></div>
          </div>
        </div>
        <div className="px-6 mb-8 space-y-4 max-w-md mx-auto w-full">
          <button onClick={handleKick} className="w-full py-6 bg-[#FF818D] text-white font-bold rounded-full shadow-[0_15px_30px_rgba(255,129,141,0.3)] flex items-center justify-center gap-3 active:scale-95 transition-all"><Heart className="w-6 h-6 fill-white" /><span className="text-xl">I Felt a Kick!</span></button>
          {startTime && (
            <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <button onClick={togglePause} className="flex-1 py-4 bg-[#FDF1F1] text-[#4A4A4A] font-bold rounded-full flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all">
                {isActive ? <><Pause className="w-5 h-5 text-[#4A4A4A] fill-[#4A4A4A]" /><span>Pause</span></> : <><Play className="w-5 h-5 text-[#4A4A4A] fill-[#4A4A4A]" /><span>Resume</span></>}
              </button>
              <button onClick={handleEndSession} className="flex-1 py-4 bg-[#FDF1F1] text-[#4A4A4A] font-bold rounded-full flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all">
                <Square className="w-5 h-5 text-[#4A4A4A] fill-[#4A4A4A]" /><span>End Session</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;
  const totalPages = Math.ceil(history.length / recordsPerPage);
  const paginatedHistory = history.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

  const renderHistory = () => (
    <div className="flex flex-col font-sans pb-12">
      <div className="px-6 pt-12 pb-6 flex items-center justify-between max-w-2xl mx-auto w-full"><h1 className="text-4xl font-bold text-[#4A4A4A]">History</h1><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-[#FF818D]"><Calendar className="w-6 h-6" /></div></div>
      <div className="px-6 mb-8 max-w-2xl mx-auto w-full">
        <div className="bg-[#F7ECEC] rounded-full p-1 flex relative">
          <div 
            className="absolute top-1 bottom-1 bg-[#FF818D] rounded-full shadow-md transition-all duration-300 ease-out"
            style={{ 
              width: 'calc(33.33% - 2px)', 
              left: historyFilter === "day" ? "4px" : historyFilter === "week" ? "33.33%" : "calc(66.66% - 2px)" 
            }}
          />
          <button onClick={() => { setHistoryFilter("day"); setCurrentPage(1); }} className={`flex-1 py-3 px-6 rounded-full font-bold transition-all relative z-10 ${historyFilter === "day" ? "text-white" : "text-[#8E8E8E] font-medium"}`}>Day</button>
          <button onClick={() => { setHistoryFilter("week"); setCurrentPage(1); }} className={`flex-1 py-3 px-6 rounded-full font-bold transition-all relative z-10 ${historyFilter === "week" ? "text-white" : "text-[#8E8E8E] font-medium"}`}>Week</button>
          <button onClick={() => { setHistoryFilter("month"); setCurrentPage(1); }} className={`flex-1 py-3 px-6 rounded-full font-bold transition-all relative z-10 ${historyFilter === "month" ? "text-white" : "text-[#8E8E8E] font-medium"}`}>Month</button>
        </div>
      </div>
      <div className="px-6 mb-4 max-w-2xl mx-auto w-full"><h2 className="text-[#4A4A4A] font-bold">Recent History</h2></div>
      <div key={`${historyFilter}-${currentPage}`} className="px-6 space-y-4 max-w-2xl mx-auto w-full flex-1 animate-in fade-in slide-in-from-right-4 duration-300">
        {loading ? (<div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF818D]"></div></div>) : 
         history.length === 0 ? (<div className="text-center py-10 text-[#8E8E8E]">No history recorded yet.</div>) : 
         historyFilter === "day" ? paginatedHistory.map((item) => (
          <div key={item.id} className="bg-white rounded-[1.5rem] p-5 flex items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.02)] border border-white">
            <div><h3 className="font-bold text-[#4A4A4A]">{item.date}</h3><p className="text-[#8E8E8E] text-xs font-medium">{item.time}</p></div>
            <div className="flex items-center gap-4"><div className="text-right"><p className="font-bold text-[#FF818D]">{item.kicks} Kicks</p><p className="text-[#8E8E8E] text-[10px]">{item.duration}</p></div><div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${item.status === 'good' ? 'bg-[#E6F4EA]' : 'bg-[#FFE6E9]'}`}>{item.status === 'good' ? '😊' : '🥺'}</div></div>
          </div>
        )) : (
          <div className="bg-white rounded-[1.5rem] p-5 flex items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.02)] border border-white">
            <div><h3 className="font-bold text-[#4A4A4A]">{historyFilter === "week" ? "This Week" : "This Month"}</h3><p className="text-[#8E8E8E] text-xs font-medium">{history.length} sessions</p></div>
            <div className="text-right"><p className="font-bold text-[#FF818D]">{history.reduce((sum, item) => sum + item.kicks, 0)} Kicks</p><p className="text-[#8E8E8E] text-[10px]">Total Activity</p></div>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && historyFilter === "day" && (
        <div className="flex items-center justify-center gap-2 mt-8 px-6 max-w-2xl mx-auto w-full">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className={`p-3 rounded-2xl transition-all ${currentPage === 1 ? 'opacity-20 pointer-events-none' : 'bg-white text-[#FF818D] shadow-sm active:scale-90'}`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex gap-1">
            {[...Array(totalPages)].map((_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-xl font-bold transition-all ${currentPage === page ? 'bg-[#FF818D] text-white shadow-md scale-110' : 'bg-white text-[#8E8E8E] hover:bg-[#FFF5F5]'}`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className={`p-3 rounded-2xl transition-all ${currentPage === totalPages ? 'opacity-20 pointer-events-none' : 'bg-white text-[#FF818D] shadow-sm active:scale-90'}`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );

  const renderInsights = () => {
    const last7Days = [...Array(6)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (5 - i)); return d.toISOString().split('T')[0]; });
    const chartData = last7Days.map(date => { const daySessions = history.filter(h => h.rawDate === date); return daySessions.reduce((sum, s) => sum + s.kicks, 0); });
    const maxKicks = Math.max(...chartData, 10);
    const avgKicks = history.length ? Math.round(history.reduce((sum, i) => sum + i.kicks, 0) / history.length) : 0;
    const avgDurationSecs = history.length ? Math.round(history.reduce((sum, i) => sum + i.duration_seconds, 0) / history.length) : 0;
    const avgDuration = formatTime(avgDurationSecs).substring(3);

    const handleHover = (e) => {
      if (!chartRef.current) return;
      const rect = chartRef.current.getBoundingClientRect();
      const index = Math.round(((e.clientX - rect.left) / rect.width) * (last7Days.length - 1));
      const safeIndex = Math.max(0, Math.min(last7Days.length - 1, index));
      const dateLabel = new Date(last7Days[safeIndex]).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      setTooltip({ show: true, x: (safeIndex / (last7Days.length - 1)) * 100, y: 100 - (chartData[safeIndex] / maxKicks) * 80 - 10, data: { date: dateLabel, kicks: chartData[safeIndex] } });
    };

    return (
      <div className="flex flex-col font-sans pb-12">
        <div className="px-6 pt-12 pb-6 max-w-2xl mx-auto w-full"><h1 className="text-4xl font-bold text-[#4A4A4A]">Insights</h1></div>
        <div className="px-6 mb-8 max-w-2xl mx-auto w-full"><div className="bg-[#F7ECEC] rounded-full p-1 flex">
          <button className="flex-1 py-3 px-6 rounded-full bg-[#FF818D] text-white font-bold shadow-md transition-all">Overview</button>
          <button className="flex-1 py-3 px-6 rounded-full text-[#8E8E8E] font-medium transition-all">Trends</button>
        </div></div>
        <div className="px-6 mb-4 max-w-2xl mx-auto w-full"><h2 className="text-[#4A4A4A] font-bold">This Week Overview</h2></div>
        <div className="px-6 grid grid-cols-2 gap-4 mb-8 max-w-2xl mx-auto w-full">
          <div className="bg-[#FFE6EA] rounded-[2rem] p-6 flex flex-col gap-2 border border-white">
            <p className="text-[#8E8E8E] text-xs font-medium">Average Kicks</p>
            <p className="text-5xl font-black text-[#4A4A4A]">{avgKicks}</p>
            <p className="text-[#8E8E8E] text-[10px] font-bold">kicks / session</p>
          </div>
          <div className="bg-[#FFF9E6] rounded-[2rem] p-6 flex flex-col gap-2 border border-white">
            <p className="text-[#8E8E8E] text-xs font-medium">Average Duration</p>
            <p className="text-4xl font-black text-[#4A4A4A]">{avgDuration}</p>
            <p className="text-[#8E8E8E] text-[10px] font-bold">mm:ss</p>
          </div>
        </div>
        <div className="px-6 mb-8 max-w-2xl mx-auto w-full">
          <style>{`
            @keyframes draw {
              from { stroke-dashoffset: 1000; }
              to { stroke-dashoffset: 0; }
            }
          `}</style>
          <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_15px_40px_rgba(0,0,0,0.03)] border border-white">
            <h3 className="text-xl font-bold text-[#4A4A4A] mb-8">Kicks per Day</h3>
            <div ref={chartRef} className="relative h-48 w-full mt-4 cursor-crosshair" onMouseMove={handleHover} onMouseLeave={() => setTooltip({ ...tooltip, show: false })}>
              {[0, 1, 2, 3, 4].map((i) => (<div key={i} className="absolute w-full h-[1px] bg-gray-100 border-t border-dashed" style={{ bottom: `${i * 25}%` }}></div>))}
              <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                <defs><linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF818D" stopOpacity="0.4" /><stop offset="100%" stopColor="#FF818D" stopOpacity="0" /></linearGradient></defs>
                <path 
                  className="animate-in fade-in duration-1000 delay-500 fill-mode-both"
                  d={`M 0 100 ${chartData.map((v, i) => `L ${(i / (chartData.length - 1)) * 300} ${100 - (v / maxKicks) * 80}`).join(' ')} L 300 100 Z`} 
                  fill="url(#chartGradient)" 
                />
                <path 
                  d={chartData.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (chartData.length - 1)) * 300} ${100 - (v / maxKicks) * 80}`).join(' ')} 
                  fill="none" 
                  stroke="#FF818D" 
                  strokeWidth="4" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeDasharray="1000"
                  strokeDashoffset="1000"
                  style={{ animation: 'draw 2s ease-out forwards' }}
                />
                {chartData.map((v, i) => (
                  <circle 
                    key={i} 
                    cx={(i / (chartData.length - 1)) * 300} 
                    cy={100 - (v / maxKicks) * 80} 
                    r="4" 
                    fill="#FF818D" 
                    stroke="white" 
                    strokeWidth="2" 
                    className="animate-in zoom-in duration-300 fill-mode-both"
                    style={{ animationDelay: `${(i / chartData.length) * 2}s` }}
                  />
                ))}
              </svg>
              {tooltip.show && (
                <div className="absolute z-50 bg-white p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-[#F5F5F5] pointer-events-none transition-all duration-200" style={{ left: `${tooltip.x}%`, top: `${tooltip.y}%`, transform: 'translate(-50%, -120%)' }}>
                  <p className="text-[#4A4A4A] font-bold text-sm mb-1">{tooltip.data.date}</p><p className="text-[#FF818D] text-xs font-bold">kicks : {tooltip.data.kicks}</p>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-r border-b border-[#F5F5F5]"></div>
                </div>
              )}
              <div className="absolute -bottom-8 w-full flex justify-between px-2">
                {last7Days.map((d) => (<span key={d} className="text-[10px] text-[#B0B0B0] font-medium">{new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>))}
              </div>
            </div>
          </div>
        </div>
        {/* Tip Slider Card */}
        <div className="px-6 mb-8 max-w-2xl mx-auto w-full">
          <div 
            onClick={() => setActiveTip((prev) => (prev + 1) % tips.length)}
            className="bg-[#FFF5EB] rounded-[2.5rem] p-6 flex items-center gap-6 border border-[#FFE8D1] shadow-sm relative overflow-hidden min-h-[160px] cursor-pointer group active:scale-[0.98] transition-all"
          >
            <div className="w-24 h-full flex-shrink-0 flex items-end justify-center pointer-events-none">
              <div className="relative w-20 h-24 bg-gradient-to-t from-[#FFD1C1] to-transparent rounded-t-full flex items-end justify-center overflow-hidden">
                <User className="w-16 h-16 text-[#FF818D] translate-y-2 opacity-80 group-hover:scale-110 transition-transform duration-500" />
              </div>
            </div>
            <div className="flex-1 py-2">
              <h3 className="font-black text-[#4A4A4A] text-lg mb-2">Tip for Mama</h3>
              <div className="relative overflow-hidden h-20 pointer-events-none">
                <p key={activeTip} className="text-[#6D6D6D] text-sm leading-relaxed animate-in fade-in slide-in-from-right-4 duration-700">
                  {tips[activeTip]}
                </p>
              </div>
              <div className="flex gap-1.5 mt-2">
                {tips.map((_, i) => (
                  <button 
                    key={i} 
                    onClick={(e) => { e.stopPropagation(); setActiveTip(i); }}
                    className={`h-1.5 rounded-full transition-all duration-500 ${activeTip === i ? 'w-4 bg-[#FF818D]' : 'w-1.5 bg-[#FFD1C1]'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="flex flex-col font-sans pb-12">
      <div className="px-6 pt-12 pb-6 max-w-2xl mx-auto w-full"><h1 className="text-4xl font-bold text-[#4A4A4A]">Settings</h1></div>
      
      <div className="px-6 mb-8 max-w-2xl mx-auto w-full">
        <div className="bg-white rounded-[2.5rem] p-6 flex items-center gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-white">
          <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-[#FFF5F5]"><Image src={session?.user?.image || "/baby-avatar.png"} alt="Profile" width={64} height={64} className="object-cover" /></div>
          <div><h2 className="text-xl font-bold text-[#4A4A4A] flex items-center gap-2">{profile.name || "Mama"} 💛</h2><p className="text-[#8E8E8E] text-sm font-medium">{profile.weeks} Weeks Pregnant • Due {profile.edd}</p></div>
        </div>
      </div>

      <div className="px-6 mb-8 max-w-2xl mx-auto w-full">
        <form onSubmit={handleSaveProfile} className="bg-white rounded-[2.5rem] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-white">
          <div className="flex items-center gap-2 mb-6"><User className="w-5 h-5 text-[#FF818D]" /><h3 className="font-bold text-[#4A4A4A]">Pregnancy Info</h3></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2 md:col-span-2"><label className="text-[#8E8E8E] text-xs font-bold uppercase ml-1">Name</label><input type="text" name="name" defaultValue={profile.name} className="w-full py-4 px-6 bg-[#FDF1F1] rounded-2xl border-none text-[#4A4A4A] font-medium" /></div>
            <div className="space-y-2"><label className="text-[#8E8E8E] text-xs font-bold uppercase ml-1">Weeks Pregnant</label><input type="number" name="weeks" defaultValue={profile.weeks} className="w-full py-4 px-6 bg-[#FDF1F1] rounded-2xl border-none text-[#4A4A4A] font-medium" /></div>
            <div className="space-y-2"><label className="text-[#8E8E8E] text-xs font-bold uppercase ml-1">Days</label><input type="number" name="days" defaultValue={profile.days} className="w-full py-4 px-6 bg-[#FDF1F1] rounded-2xl border-none text-[#4A4A4A] font-medium" /></div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[#8E8E8E] text-xs font-bold uppercase ml-1">Due Date</label>
              <div onClick={() => setShowDatePicker(true)} className="w-full py-4 px-6 bg-[#FDF1F1] rounded-2xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all">
                <span className="text-[#4A4A4A] font-medium">{new Date(profile.edd).toLocaleDateString("en-US", { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                <Calendar className="w-5 h-5 text-[#4A4A4A]" />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2"><label className="text-[#8E8E8E] text-xs font-bold uppercase ml-1">Daily Goal (kicks)</label><input type="number" name="goal" defaultValue={profile.dailyGoal} className="w-full py-4 px-6 bg-[#FDF1F1] rounded-2xl border-none text-[#4A4A4A] font-medium" /></div>
          </div>
          <button type="submit" className="w-full py-4 bg-[#FF818D] text-white font-bold rounded-full shadow-md active:scale-95 transition-all">Save Profile</button>
        </form>
      </div>

      <div className="px-6 mb-8 max-w-2xl mx-auto w-full">
        <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#FFE6E9] flex items-center justify-center"><Bell className="w-5 h-5 text-[#FF818D]" /></div><div><h3 className="font-bold text-[#4A4A4A]">Daily Reminder</h3><p className="text-[#8E8E8E] text-xs">We'll remind you to count.</p></div></div>
            <div className="w-12 h-6 bg-[#FF818D] rounded-full relative cursor-pointer"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2"><label className="text-[#8E8E8E] text-xs font-bold uppercase ml-1">Reminder Time</label><div className="relative"><input type="text" defaultValue="08:30 PM" className="w-full py-4 px-6 bg-[#FDF1F1] rounded-2xl border-none text-[#4A4A4A] font-medium" /><Clock className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4A4A4A]" /></div></div>
            <div className="space-y-2"><label className="text-[#8E8E8E] text-xs font-bold uppercase ml-1">Repeat</label><div className="flex justify-between gap-1 overflow-x-auto pb-2">{['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, idx) => (<div key={day} className={`min-w-[40px] h-10 rounded-full flex items-center justify-center text-[8px] font-black tracking-tighter ${idx < 5 ? 'bg-[#FF818D] text-white shadow-lg' : 'bg-[#FDF1F1] text-[#8E8E8E]'}`}>{day}</div>))}</div></div>
          </div>
        </div>
      </div>

      <div className="px-6 mb-8 max-w-2xl mx-auto w-full"><div className="bg-[#F7ECEC] rounded-[2.5rem] p-6 space-y-4"><button className="w-full flex items-center gap-4 text-[#4A4A4A] font-bold"><HelpCircle className="w-5 h-5 text-[#FF818D]" /> Help & FAQ</button><div className="h-[1px] bg-[#FFE6E9]"></div><button className="w-full flex items-center gap-4 text-[#4A4A4A] font-bold"><HelpCircle className="w-5 h-5 text-[#FF818D]" /> About Baby Kick Counter</button></div></div>
      <div className="px-6 mb-8 max-w-2xl mx-auto w-full"><div className="bg-[#FFE6E9] rounded-[2.5rem] p-8 space-y-2"><h3 className="font-bold text-[#FF818D] text-lg">Disclaimer</h3><p className="text-[#8E8E8E] text-xs leading-relaxed">This app is for tracking purposes only and does not replace medical advice. If you have concerns about your baby's movements, please contact your healthcare provider.</p></div></div>
      <div className="px-6 mb-8 max-w-2xl mx-auto w-full"><button onClick={() => signOut({ callbackUrl: "/login" })} className="w-full bg-[#FF818D] py-5 px-8 rounded-full flex items-center justify-center gap-3 text-white font-bold shadow-[0_10px_25px_rgba(255,129,141,0.4)] active:scale-95 transition-all"><LogOut className="w-5 h-5" /> Log Out</button></div>
      {showDatePicker && renderCalendar()}
    </div>
  );

  const renderActiveTab = () => {
    return (
      <main className="min-h-screen bg-[#FFF5F5] pb-24 overflow-y-auto">
        {activeTab === "home" && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">{renderHome()}</div>}
        {activeTab === "history" && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">{renderHistory()}</div>}
        {activeTab === "insights" && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">{renderInsights()}</div>}
        {activeTab === "settings" && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">{renderSettings()}</div>}
      </main>
    );
  };

  return (
    <>
      {renderActiveTab()}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F5F5F5] py-4 z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
        <div className="max-w-md mx-auto grid grid-cols-4 px-4">
          <button onClick={() => setActiveTab("home")} className="flex flex-col items-center gap-1">
            <div className={`p-2 rounded-xl transition-all ${activeTab === "home" ? "bg-[#FFF5F5] text-[#FF818D]" : "text-[#4A4A4A] opacity-40"}`}><Home className="w-6 h-6" /></div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${activeTab === "home" ? "text-[#FF818D]" : "text-[#4A4A4A] opacity-40"}`}>Home</span>
          </button>
          <button onClick={() => setActiveTab("history")} className="flex flex-col items-center gap-1">
            <div className={`p-2 rounded-xl transition-all ${activeTab === "history" ? "bg-[#FFF5F5] text-[#FF818D]" : "text-[#4A4A4A] opacity-40"}`}><HistoryIcon className="w-6 h-6" /></div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${activeTab === "history" ? "text-[#FF818D]" : "text-[#4A4A4A] opacity-40"}`}>History</span>
          </button>
          <button onClick={() => setActiveTab("insights")} className="flex flex-col items-center gap-1">
            <div className={`p-2 rounded-xl transition-all ${activeTab === "insights" ? "bg-[#FFF5F5] text-[#FF818D]" : "text-[#4A4A4A] opacity-40"}`}><BarChart2 className="w-6 h-6" /></div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${activeTab === "insights" ? "text-[#FF818D]" : "text-[#4A4A4A] opacity-40"}`}>Insights</span>
          </button>
          <button onClick={() => setActiveTab("settings")} className="flex flex-col items-center gap-1">
            <div className={`p-2 rounded-xl transition-all ${activeTab === "settings" ? "bg-[#FFF5F5] text-[#FF818D]" : "text-[#4A4A4A] opacity-40"}`}><SettingsIcon className="w-6 h-6" /></div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${activeTab === "settings" ? "text-[#FF818D]" : "text-[#4A4A4A] opacity-40"}`}>Settings</span>
          </button>
        </div>
      </nav>
      
      {/* Beauty Toaster Notification */}
      {toast.show && (
        <div className="fixed top-8 left-0 right-0 z-[200] flex justify-center px-6 pointer-events-none animate-in slide-in-from-top-full duration-500 ease-out">
          <div className="bg-gradient-to-r from-[#FF818D] to-[#FF9A5C] px-6 py-4 rounded-3xl shadow-[0_15px_40px_rgba(255,129,141,0.3)] flex items-center gap-3 border border-white/20">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <Heart className="w-4 h-4 text-white fill-white animate-pulse" />
            </div>
            <span className="text-white font-bold text-sm tracking-tight">{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
}
