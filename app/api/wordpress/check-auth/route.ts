import { NextRequest, NextResponse } from "next/server";

const WORDPRESS_URL = process.env.WORDPRESS_URL || "https://woo-dev.local";

export async function GET(request: NextRequest) {
  try {
    // Forward the request cookies to WordPress to check if the user has an active session
    const cookieHeader = request.headers.get("cookie") || "";

    const response = await fetch(`${WORDPRESS_URL}/my-account/`, {
      method: "GET",
      headers: {
        "User-Agent": "Next.js WordPress Auth Check",
        // Forward cookies so WordPress can check the session
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      // Don't follow redirects - if WordPress redirects to wp-login, user is not authenticated
      redirect: "manual",
      // @ts-ignore - Node 18+ supports this
      signal: AbortSignal.timeout(10000),
    });

    // If the response is a redirect (302/301) to wp-login, user is not authenticated
    const isRedirectToLogin =
      (response.status === 302 || response.status === 301) &&
      response.headers.get("location")?.includes("wp-login");

    // If status is 200 and not redirected to login, user has an active session
    const authenticated = response.status === 200 && !isRedirectToLogin;

    return NextResponse.json({
      authenticated,
      status: response.status,
    });
  } catch (error) {
    console.error("[WordPress Auth Check] Error:", error);
    return NextResponse.json(
      {
        authenticated: false,
        error: "Failed to check WordPress authentication status",
      },
      { status: 502 }
    );
  }
}