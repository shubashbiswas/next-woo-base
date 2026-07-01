"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, ExternalLink, AlertCircle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WordPressAccountIframeProps {
  wordpressUrl: string;
  returnUrl?: string;
}

type ConnectionStatus = "checking" | "connected" | "disconnected" | "error";

export function WordPressAccountIframe({
  wordpressUrl,
  returnUrl,
}: WordPressAccountIframeProps) {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("checking");
  const [iframeHeight, setIframeHeight] = useState(800);
  const [iframeError, setIframeError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const retryCount = useRef(0);
  const maxRetries = 3;

  const myAccountUrl = `${wordpressUrl.replace(/\/+$/, "")}/my-account/`;
  const loginRedirectUrl = returnUrl
    ? `${wordpressUrl.replace(/\/+$/, "")}/wp-login.php?redirect_to=${encodeURIComponent(returnUrl)}`
    : `${wordpressUrl.replace(/\/+$/, "")}/wp-login.php?redirect_to=${encodeURIComponent(
        typeof window !== "undefined" ? window.location.href : "/"
      )}`;

  // Check if the user has an active WordPress session by attempting to fetch my-account
  const checkWordPressSession = useCallback(async () => {
    setConnectionStatus("checking");
    try {
      // Try to fetch the my-account page - if it redirects to wp-login, user is not logged in
      const response = await fetch(`/api/wordpress/check-auth`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setConnectionStatus("connected");
        } else {
          setConnectionStatus("disconnected");
        }
      } else {
        setConnectionStatus("disconnected");
      }
    } catch {
      setConnectionStatus("error");
    }
  }, []);

  useEffect(() => {
    checkWordPressSession();
  }, [checkWordPressSession]);

  // Listen for postMessage events from the iframe to handle responsive height
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify the message origin is the WordPress site
      const wpOrigin = new URL(wordpressUrl).origin;
      if (event.origin !== wpOrigin) return;

      // Handle height updates from WordPress
      if (event.data?.type === "wp-iframe-height") {
        setIframeHeight(event.data.height);
      }

      // Handle auth status messages
      if (event.data?.type === "wp-auth-status") {
        setConnectionStatus(
          event.data.authenticated ? "connected" : "disconnected"
        );
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [wordpressUrl]);

  const handleIframeLoad = () => {
    setIframeError(false);
    // After load, try to detect auth status via postMessage
    // The iframe WordPress site should send a postMessage with auth status
    setConnectionStatus("connected");
  };

  const handleIframeError = () => {
    setIframeError(true);
    setConnectionStatus("error");
  };

  const handleRetry = () => {
    if (retryCount.current < maxRetries) {
      retryCount.current += 1;
      setIframeError(false);
      checkWordPressSession();
    }
  };

  const handleLoginRedirect = () => {
    window.location.href = loginRedirectUrl;
  };

  // Loading state
  if (connectionStatus === "checking") {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Checking WordPress connection...</p>
          <p className="text-gray-400 text-sm mt-1">
            Verifying your account status
          </p>
        </div>
      </div>
    );
  }

  // Disconnected state - user needs to log into WordPress
  if (connectionStatus === "disconnected") {
    return (
      <div className="flex items-center justify-center h-64 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg border-2 border-dashed border-primary/30">
        <div className="text-center max-w-md px-6">
          <Globe className="h-12 w-12 text-primary/60 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Connect to WordPress Account
          </h3>
          <p className="text-gray-500 mb-6 text-sm">
            Sign in to your WordPress account to manage your WooCommerce profile,
            orders, subscriptions, and account settings in one place.
          </p>
          <Button onClick={handleLoginRedirect} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Sign in to WordPress
          </Button>
        </div>
      </div>
    );
  }

  // Error state
  if (connectionStatus === "error" && iframeError) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50 rounded-lg border-2 border-dashed border-red-300">
        <div className="text-center max-w-md px-6">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-red-800 mb-2">
            WordPress Unavailable
          </h3>
          <p className="text-red-600 mb-6 text-sm">
            Could not load your WordPress account. This might be a temporary
            issue or the WordPress site might be down.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleRetry}>
              Try Again
            </Button>
            <Button onClick={handleLoginRedirect} variant="secondary">
              Open in WordPress
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Connected state - show the iframe
  return (
    <div className="w-full rounded-lg border border-gray-200 overflow-hidden bg-white">
      {iframeError && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-800 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              Having trouble loading the account page?{" "}
              <button
                onClick={handleRetry}
                className="underline font-medium hover:text-amber-900"
              >
                Retry
              </button>
            </span>
          </div>
          <a
            href={myAccountUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-amber-700 underline hover:text-amber-900 flex items-center gap-1"
          >
            Open directly <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
      <div className="relative" style={{ height: `${iframeHeight}px` }}>
        {!iframeError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-gray-500">Loading your account...</p>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={myAccountUrl}
          className="w-full h-full border-0 relative z-20"
          title="WordPress Account"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          loading="lazy"
        />
      </div>
    </div>
  );
}