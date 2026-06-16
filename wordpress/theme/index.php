<?php
/**
 * Fallback template
 *
 * This should rarely be seen - the redirect in functions.php
 * should catch all frontend requests.
 */

$nextjs_url = getenv('NEXTJS_URL') 
    ? getenv('NEXTJS_URL') 
    : (get_option('next_revalidate_settings')['nextjs_url'] ?? '');
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Headless WordPress Engine</title>
    <style>
        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: #f8fafc;
        }
        .container {
            text-align: center;
            padding: 3rem 2rem;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
            max-width: 400px;
            width: 100%;
        }
        h1 { color: #0f172a; font-size: 1.5rem; margin-bottom: 0.5rem; }
        p { color: #64748b; font-size: 0.95rem; margin-bottom: 1.5rem; }
        .btn {
            display: block;
            padding: 0.75rem 1rem;
            margin-bottom: 0.75rem;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 500;
            font-size: 0.9rem;
            transition: background 0.15s ease;
        }
        .btn-primary { background: #0070f3; color: #ffffff; }
        .btn-primary:hover { background: #005ecf; }
        .btn-secondary { background: #f1f5f9; color: #334155; }
        .btn-secondary:hover { background: #e2e8f0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Headless Core Engine</h1>
        <p>This WordPress setup is configured to operate purely as an API content source.</p>
        
        <?php if (!empty($nextjs_url)): ?>
            <a href="<?php echo esc_url($nextjs_url); ?>" class="btn btn-primary" target="_blank" rel="noopener">Visit Live Site</a>
        <?php else: ?>
            <p style="color: #dc2626; font-size: 0.85rem; margin-bottom: 1.5rem;">⚠️ No frontend URL configured in environment or settings.</p>
        <?php endif; ?>
        
        <a href="<?php echo esc_url(admin_url()); ?>" class="btn btn-secondary">Open Dashboard</a>
    </div>
</body>
</html>