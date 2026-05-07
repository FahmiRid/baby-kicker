import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Change this once you verify a domain on Resend
const FROM_EMAIL = "Baby Kicker <onboarding@resend.dev>";

// This route is called by Vercel Cron every minute.
// It checks the reminders table for users whose reminder_time matches now (UTC)
// and sends them an email via Resend.
export async function GET(request) {
  // Protect the cron endpoint — Vercel sets this header automatically
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ?test=true bypasses time/day matching and sends to all enabled reminders immediately
  const { searchParams } = new URL(request.url);
  const isTest = searchParams.get("test") === "true";

  try {
    const now = new Date();
    const currentTime = `${now.getUTCHours().toString().padStart(2, "0")}:${now.getUTCMinutes().toString().padStart(2, "0")}`;
    const currentDay = now.getUTCDay(); // 0=Sun … 6=Sat

    console.log(`[cron] Running at UTC ${currentTime}, day ${currentDay}${isTest ? " (TEST MODE — skipping time/day filter)" : ""}`);

    // In test mode, fetch all enabled reminders regardless of time
    let query = supabase.from("reminders").select("id, repeat_days").eq("enabled", true);
    if (!isTest) query = query.eq("reminder_time", currentTime);

    const { data: reminders, error } = await query;
    if (error) throw error;

    if (!reminders || reminders.length === 0) {
      console.log("[cron] No enabled reminders found.");
      return NextResponse.json({ sent: 0, message: "No enabled reminders found" });
    }

    // In normal mode filter by day; in test mode send to all
    const due = isTest
      ? reminders
      : reminders.filter((r) => Array.isArray(r.repeat_days) && r.repeat_days.includes(currentDay));

    console.log(`[cron] ${due.length} reminder(s) due.`);

    if (due.length === 0) {
      return NextResponse.json({ sent: 0, message: `No reminders due at UTC ${currentTime} on day ${currentDay}` });
    }
    const results = await Promise.allSettled(
      due.map(async (reminder) => {
        // In dev, override recipient to your Resend account email (onboarding@resend.dev restriction)
        // In prod (no RESEND_TEST_EMAIL set), sends to the actual user's login email
        const toEmail = process.env.RESEND_TEST_EMAIL || reminder.id;

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: toEmail,
            subject: "Time to count your baby's kicks! 👶💛",
            html: buildEmailHtml("Mama", process.env.NEXTAUTH_URL),
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(`Resend error for ${toEmail}: ${JSON.stringify(data)}`);

        console.log(`[cron] Email sent → ${toEmail}`);
        return toEmail;
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results
      .filter((r) => r.status === "rejected")
      .map((r) => r.reason?.message);

    if (failed.length > 0) console.error("[cron] Failed:", failed);

    return NextResponse.json({ sent, failed: failed.length, total: due.length });
  } catch (err) {
    console.error("[cron] Unexpected error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function buildEmailHtml(name, appUrl) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; background: #FFF5F5; border-radius: 24px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #FFB7B2, #FF818D); padding: 40px 32px; text-align: center;">
        <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 32px;">
          👶
        </div>
        <h1 style="color: white; font-size: 24px; font-weight: 800; margin: 0 0 8px;">Baby Kick Reminder</h1>
        <p style="color: rgba(255,255,255,0.85); font-size: 15px; margin: 0;">It's time to count those little kicks!</p>
      </div>
      <div style="padding: 32px; background: white;">
        <p style="color: #4A4A4A; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
          Hi ${name}! 💛 Your daily reminder to track your baby's movements is here.
          Regular kick counting helps you stay connected with your little one and notice any changes.
        </p>
        <a href="${appUrl}/dashboard"
           style="display: block; background: #FF818D; color: white; text-align: center; padding: 16px 32px; border-radius: 100px; font-weight: 700; font-size: 16px; text-decoration: none; margin-bottom: 24px;">
          Start Counting Kicks 💗
        </a>
        <p style="color: #B0B0B0; font-size: 12px; text-align: center; margin: 0; line-height: 1.6;">
          This app is for tracking purposes only and does not replace medical advice.<br/>
          If you have concerns about your baby's movements, contact your healthcare provider.
        </p>
      </div>
    </div>
  `;
}
