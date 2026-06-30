"use server";

import { NextRequest, NextResponse } from "next/server";
import { verifyToken, hashPassword } from "@/lib/auth";

// In-memory user store for demo (replace with database in production)
interface User {
  userId: string;
  email: string;
  passwordHash: string;
  name?: string;
}

const users: Map<string, User> = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user by email
    const email = body.email.toLowerCase();
    let user = users.get(email);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Verify password (replace with bcrypt.compare in production)
    const isValidPassword = hashPassword(body.password) === user.passwordHash;
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.userId,
      email: user.email,
      role: user.name ? "user" : "admin",
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.userId,
        email: user.email,
        name: user.name || "",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function generateToken(payload: any): string {
  // Simple token generation for demo (replace with proper JWT in production)
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payloadStr = Buffer.from(
    JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 604800 })
  ).toString("base64url");

  return `${header}.${payloadStr}.signature`;
}