<?php
/**
 * Next.js Headless Theme
 * Version: 2.0.0 - with iframe support
 *
 * Redirects all frontend requests to the Next.js application.
 * Allows admin, login, REST API, and other WordPress internals.
 */

// Redirect frontend requests to Next.js with deep path matching
add_action('template_redirect', function () {
    // 1. Core Internal Safety Bypasses
    if (is_admin()) return;
    if (defined('DOING_AJAX') && DOING_AJAX) return;
    if (defined('DOING_CRON') && DOING_CRON) return;

    // 2. URI-based Safety Checks
    $uri = $_SERVER['REQUEST_URI'] ?? '';

    if (
        strpos($uri, 'wp-login') !== false ||
        strpos($uri, 'wp-signup') !== false ||
        strpos($uri, 'wp-activate') !== false ||
        strpos($uri, 'wp-json') !== false ||
        strpos($uri, 'wp-cron') !== false ||
        strpos($uri, 'xmlrpc.php') !== false ||
        strpos($uri, rest_get_url_prefix()) !== false ||
        strpos($uri, 'my-account') !== false ||
        strpos($uri, 'wc-api') !== false ||
        strpos($uri, 'wc-ajax') !== false
    ) {
        return;
    }

    // 3. Fallback check for REST API requests inside WordPress 7.0 environment
    if (defined('REST_REQUEST') && REST_REQUEST) {
        return;
    }

    // 4. Resolve the Next.js Target URL Path safely
    // Fallback order: PHP Environment -> WordPress settings database option
    // Try environment variable first, then WordPress plugin settings
    $env_url = getenv('NEXTJS_URL');
    if (!empty($env_url)) {
        $nextjs_base_url = rtrim($env_url, '/');
    } else {
        $revalidate_settings = get_option('next_revalidate_settings', []);
        $nextjs_base_url = rtrim($revalidate_settings['nextjs_url'] ?? '', '/');
    }

    // Only redirect if a valid Next.js URL has actually been configured
    if (!empty($nextjs_base_url)) {
        $destination_url = $nextjs_base_url . $_SERVER['REQUEST_URI'];
        
        wp_redirect($destination_url, 301);
        exit;
    }
});

// ═══════════════════════════════════════════════════════════
// IFrame Embedding Support for WooCommerce My Account
// ═══════════════════════════════════════════════════════════
// Fix 1: Remove WordPress core action that sends X-Frame-Options
add_action('template_redirect', function () {
    if (
        strpos($_SERVER['REQUEST_URI'] ?? '', 'my-account') !== false ||
        strpos($_SERVER['REQUEST_URI'] ?? '', '/account/') !== false
    ) {
        remove_action('send_headers', 'send_frame_options_header', 10);
    }
});

// Fix 2: Override headers AFTER core sets them (remove X-Frame-Options + CSP)
add_action('send_headers', function () {
    if (
        strpos($_SERVER['REQUEST_URI'] ?? '', 'my-account') !== false ||
        strpos($_SERVER['REQUEST_URI'] ?? '', '/account/') !== false
    ) {
        // Remove restrictive headers
        header_remove('X-Frame-Options');
        // Override CSP to allow embedding
        header('Content-Security-Policy: frame-ancestors \'self\' http://localhost:3000 https://next-woo.com;', true);
    }
}, 9999);

// Fix 3: Filter the final wp_headers array (catches WooCommerce-added headers)
add_filter('wp_headers', function ($headers) {
    if (strpos($_SERVER['REQUEST_URI'] ?? '', 'my-account') !== false) {
        unset($headers['X-Frame-Options']);
        $headers['Content-Security-Policy'] = "frame-ancestors 'self' http://localhost:3000 https://next-woo.com";
    }
    return $headers;
}, 9999);
// ═══════════════════════════════════════════════════════════

// Remove unnecessary frontend features for headless optimization
add_action('after_setup_theme', function () {
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('wp_print_styles', 'print_emoji_styles');
    remove_action('wp_head', 'feed_links', 2);
    remove_action('wp_head', 'feed_links_extra', 3);
    remove_action('wp_head', 'rsd_link');
    remove_action('wp_head', 'wlwmanifest_link');
    remove_action('wp_head', 'wp_generator');
});