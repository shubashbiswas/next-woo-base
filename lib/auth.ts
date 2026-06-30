// Authentication utility functions
// This module provides JWT-based authentication helpers

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here-change-in-production";
const JWT_EXPIRY = "7d"; // 7 days expiry for demo purposes

interface AuthPayload {
  userId: string;
  email: string;
  role?: string;
}

// Generate a token for testing/demo (in production use proper crypto)
export function generateToken(payload: AuthPayload): string {
  return jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY, algorithm: "HS256" }
  );
}

// Verify and decode a token
export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

// Extract token from Authorization header
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0] === "Bearer") {
    return parts[1];
  }
  return null;
}

// Simple hash for password verification (in production use bcrypt)
export function hashPassword(password: string): string {
  // Simple hashing - replace with bcrypt in production
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

// Verify hashed password (in production use bcrypt.compare)
export function verifyPassword(password: string, hash: string): boolean {
  const computedHash = hashPassword(password);
  // Simple comparison - replace with bcrypt.compare in production
  return computedHash === hash;
}