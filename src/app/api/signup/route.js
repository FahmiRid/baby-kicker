import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();

    if (!supabase) {
      console.error("Supabase client is not initialized. Check environment variables.");
      return NextResponse.json({ error: "Database connection error. Please check your environment variables." }, { status: 503 });
    }

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const { data, error } = await supabase
      .from("users")
      .insert([
        { name, email, password: hashedPassword }
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ message: "User created successfully", user: { id: data.id, email: data.email, name: data.name } }, { status: 201 });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
