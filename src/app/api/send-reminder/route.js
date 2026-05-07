import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "Baby Kicker <onboarding@resend.dev>";

// Resend's test domain (onboarding@resend.dev) can ONLY deliver to your Resend account email.
// Set RESEND_TEST_EMAIL in .env.local to the email you registered on resend.com
const TEST_EMAIL_OVERRIDE = process.env.RESEND_TEST_EMAIL || null;

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;
    const userName = session.user.name || "Mama";
    const toEmail = TEST_EMAIL_OVERRIDE || userEmail;

    console.log(`[send-reminder] Sending to: ${toEmail} (user: ${userEmail})`);
    console.log(`[send-reminder] API key present: ${!!RESEND_API_KEY}`);

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
        html: `
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
                Hi ${userName}! 💛 Your daily reminder to track your baby's movements is here.
                Regular kick counting helps you stay connected with your little one and notice any changes.
              </p>
              <a href="${process.env.NEXTAUTH_URL}/dashboard"
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

    const data = await res.json();

    if (!res.ok) {
      console.error("[send-reminder] Resend error:", JSON.stringify(data, null, 2));
      return NextResponse.json(
        { error: data.message || "Failed to send email", details: data },
        { status: 500 }
      );
    }

    console.log(`[send-reminder] Success! Email ID: ${data.id}`);
    return NextResponse.json({ success: true, id: data.id, sentTo: toEmail });
  } catch (err) {
    console.error("[send-reminder] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
