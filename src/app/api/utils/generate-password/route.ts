import { NextResponse } from 'next/server';

export async function GET() {
  // Generate a simple alphanumeric password that should work with Hetzner
  const length = 16; // Similar to the curl example that worked
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; // Avoid confusing characters
  
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return NextResponse.json({ password });
}