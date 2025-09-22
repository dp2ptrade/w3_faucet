import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check if user is admin (for now, we'll use a simple check)
    // In a real app, you'd check against a database or admin list
    const adminAddresses = process.env.ADMIN_ADDRESSES?.split(',') || [];
    const isAdmin = adminAddresses.includes(decoded.address.toLowerCase());

    return NextResponse.json({
      address: decoded.address,
      isAdmin,
      iat: decoded.iat,
      exp: decoded.exp
    });

  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}