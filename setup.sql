-- Create Users Table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Profiles Table (using email as ID for simplicity as seen in the code)
CREATE TABLE profiles (
  id TEXT PRIMARY KEY, -- This is the user email as used in Dashboard.js
  name TEXT,
  weeks_pregnant INTEGER DEFAULT 25,
  days_pregnant INTEGER DEFAULT 4,
  due_date DATE,
  last_period DATE,
  daily_goal INTEGER DEFAULT 10,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create History Table
CREATE TABLE history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  kicks INTEGER NOT NULL,
  duration TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  session_time TEXT NOT NULL,
  status TEXT NOT NULL, -- 'good' or 'low'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Reminders Table
CREATE TABLE reminders (
  id TEXT PRIMARY KEY, -- user email
  enabled BOOLEAN DEFAULT true,
  reminder_time TEXT DEFAULT '20:30', -- 24h format HH:MM
  repeat_days INTEGER[] DEFAULT '{1,2,3,4,5}', -- 0=Sun, 1=Mon ... 6=Sat
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Optional but recommended)
-- For now, keep it simple so the user can test locally.
