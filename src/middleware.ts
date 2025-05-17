import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isInternalRequest = (request: NextRequest): boolean => {
  const internalHeader = request.headers.get('x-internal-request')
  
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  
  const host = request.headers.get('host')
  
  const isSameOrigin = origin ? new URL(origin).host === host : false
  const isInternalReferer = referer ? new URL(referer).host === host : false
  
  // Apply only for production workload
  if (process.env.NODE_ENV === 'production') {
    return (
      internalHeader === 'true' ||
      isSameOrigin ||
      isInternalReferer ||
      request.nextUrl.pathname.startsWith('/_next')
    )
  }
  return true
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api')) {
    if (!isInternalRequest(request)) {
      return new NextResponse(
        JSON.stringify({
          message: 'FORBIDDEN',
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
} 