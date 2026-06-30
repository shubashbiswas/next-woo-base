"use server";

import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";

// In-memory user store for demo (replace with database in production)
interface User {
  userId: string;
  email: string;
  passwordHash: string;
  name?: string;
}

const users = new Map<string, User>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.email || !body.password || !body.name) {
      return NextResponse.json(
        { error: "Name, email and password are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = users.get(body.email.toLowerCase());
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password and create new user
    const userId = `user_${Date.now()}`;
    const newUser: User = {
      userId,
      email: body.email.toLowerCase(),
      passwordHash: hashPassword(body.password),
      name: body.name,
    };

    users.set(newUser.email, newUser);

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      user: {
        id: newUser.userId,
        email: newUser.email,
        name: newUser.name,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}