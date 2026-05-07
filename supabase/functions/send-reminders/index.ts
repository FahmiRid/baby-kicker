// Supabase Edge Function: send-reminders
// Deploy with: supabase functions deploy send-reminders
// Schedule with cron: every minute -> "* * * * *"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = "Baby Kicker <reminders@yourdomain.com>"; // Change to your verified Resend domain

Deno.serve(async () => {
  try {
    // Get current UTC time — adjust offset per your users' timezone if needed
    const now = new Date();
    const currentHour = now.getUTCHours().toString().padStart(2, "0");
    const currentMinute = now.getUTCMinutes().toString().padStart(2, "0");
    const currentTime = `${currentHour}:${currentMinute}`;
    const currentDay = now.getUTCDay(); // 0=Sun, 1=Mon ... 6=Sat

    console.log(`Checking reminders for time: ${currentTime}, day: ${currentDay}`);

    // Fetch all enabled reminders matching current time
    const { data: reminders, error } = await supabase
      .from("reminders")
      .select("id, reminder_time, repeat_days")
      .eq("enabled", true)
      .eq("reminder_time", currentTime);

    if (error) throw error;
    if (!reminders || reminders.length === 0) {
      return new Response("No reminders due.", { status: 200 });
    }

    // Filter by day of week
    const due = reminders.filter((r) =>
      Array.isArray(r.repeat_days) && r.repeat_days.includes(currentDay)
    );

    console.log(`${due.length} reminder(s) due.`);

    // Send emails
    const results = await Promise.allSettled(
      due.map(async (reminder) => {
        const userEmail = reminder.id; // id is the user's email

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: userEmail,
            subject: "Time to count your baby's kicks! 👶💛",
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; background: #FFF5F5; border-radius: 24px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #FFB7B2, #FF818D); padding: 40px 32px; text-align: center;">
                  <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                    <span style="font-size: 32px;">👶</span>
                  </div>
                  <h1 style="color: white; font-size: 24px; font-weight: 800; margin: 0 0 8px;">Baby Kick Reminder</h1>
                  <p style="color: rgba(255,255,255,0.85); font-size: 15px; margin: 0;">It's time to count those little kicks!</p>
                </div>
                <div style="padding: 32px; background: white;">
                  <p style="color: #4A4A4A; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                    Hi Mama! 💛 Your daily reminder to track your baby's movements is here.
                    Regular kick counting helps you stay connected with your little one and notice any changes.
                  </p>
                  <a href="https://baby-kicker-blwv.vercel.app/dashboard" 
                     style="display: block; background: #FF818D; color: white; text-align: center; padding: 16px 32px; border-radius: 100px; font-weight: 700; font-size: 16px; text-decoration: none; margin-bottom: 24px;">
                    Start Counting Kicks 💗
                  </a>
                  <p style="color: #B0B0B0; font-size: 12px; text-align: center; margin: 0; line-height: 1.6;">
                    This app is for tracking purposes only and does not replace medical advice.<br/>
                    If you have concerns about your baby's movements, contact your healthcare provider.
                  </p>
                </div>
              </div>
            `,
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Resend error for ${userEmail}: ${err}`);
        }

        console.log(`Email sent to ${userEmail}`);
        return userEmail;
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({ sent, failed, total: due.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-reminders error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
