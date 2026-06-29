<?php
/**
 * Plugin Name: Next.js Revalidation (Headless Async Mode)
 * Plugin URI: https://github.com/9d8dev/next-wp
 * Description: Asynchronously revalidates specific Next.js paths (posts/pages) via background tasks on creation or update. Compatible with WordPress REST API and DataViews.
 * Version: 2.1.0
 * Author: 9d8
 * Author URI: https://9d8.dev
 * License: MIT
 */

if (!defined('ABSPATH')) {
    exit;
}

class NextRevalidate {
    private $option_name = 'next_revalidate_settings';
    private $log_option = 'next_revalidate_log';
    private $last_option = 'next_revalidate_last';
    private $cron_hook = 'next_revalidate_async_trigger';

    public function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);

        // Admin scripts
        add_action('admin_enqueue_scripts', [$this, 'admin_enqueue_scripts']);

        // AJAX handler for test connection
        add_action('wp_ajax_next_revalidate_test_connection', [$this, 'ajax_test_connection']);

        // Core Hooks for published/updated content (Handles REST API / DataViews bulk actions too)
        add_action('save_post', [$this, 'on_post_change'], 10, 3);
        add_action('delete_post', [$this, 'on_post_delete']);
        add_action('transition_post_status', [$this, 'on_status_change'], 10, 3);

        // Taxonomy links (only when attached to published content)
        add_action('set_object_terms', [$this, 'on_taxonomy_change'], 10, 6);

        // WooCommerce product webhooks — triggers cache invalidation on product changes.
        // Only registers if WooCommerce is active; gracefully degrades otherwise.
        if (class_exists('WooCommerce')) {
            add_action('woocommerce_created_product', [$this, 'on_woocommerce_product_change'], 10, 2);
            add_action('woocommerce_update_product', [$this, 'on_woocommerce_product_change'], 10, 2);
            add_action('woocommerce_delete_product', [$this, 'on_woocommerce_product_deleted'], 10, 1);
            add_action('woocommerce_product_set_stock', [$this, 'on_woocommerce_stock_change'], 10, 2);

            // Product visibility changes (visible/hidden via admin or REST API)
            add_action('woocommerce_product_set_visibility', [$this, 'on_woocommerce_visibility_change'], 10, 3);

            // Product featured/unfeatured status
            add_action('woocommerce_product_set_featured', [$this, 'on_woocommerce_featured_change'], 10, 2);

            // Product category assignment changes
            add_action('woocommerce_product_set_categories', [$this, 'on_woocommerce_category_assignment'], 10, 3);

            // Product variation hooks (created/updated/deleted)
            add_action('woocommerce_variation_created', [$this, 'on_woocommerce_variation_change'], 10, 2);
            add_action('woocommerce_variation_updated', [$this, 'on_woocommerce_variation_change'], 10, 2);
            add_action('woocommerce_variation_deleted', [$this, 'on_woocommerce_variation_deleted'], 10, 1);

            // Order status change hooks (for order-related cache updates)
            add_action('woocommerce_order_status_completed', [$this, 'on_woocommerce_order_completed'], 10, 1);
            add_action('woocommerce_order_status_processing', [$this, 'on_woocommerce_order_processing'], 10, 1);
        }

        // Background Cron execution hook
        add_action($this->cron_hook, [$this, 'execute_async_revalidation'], 10, 2);

        // Periodic cron fallback — revalidate products that haven't been touched recently
        if (!wp_next_scheduled('next_revalidate_periodic')) {
            wp_schedule_event(time(), 'hourly', 'next_revalidate_periodic');
        }
        add_action('next_revalidate_periodic', [$this, 'execute_periodic_revalidation']);
    }

    public function add_admin_menu() {
        add_options_page(
            'Next.js Revalidation',
            'Next.js Revalidation',
            'manage_options',
            'next-revalidate',
            [$this, 'settings_page']
        );
    }

    public function register_settings() {
        register_setting($this->option_name, $this->option_name, [
            'sanitize_callback' => [$this, 'sanitize_settings']
        ]);

        add_settings_section('next_revalidate_main', 'Configuration', null, 'next-revalidate');

        add_settings_field('nextjs_url', 'Next.js Site URL', [$this, 'field_nextjs_url'], 'next-revalidate', 'next_revalidate_main');
        add_settings_field('webhook_secret', 'Webhook Secret', [$this, 'field_webhook_secret'], 'next-revalidate', 'next_revalidate_main');

        // WooCommerce hooks status indicator (shown only when WooCommerce is active)
        if (class_exists('WooCommerce')) {
            add_settings_field('woocommerce_note', 'WooCommerce Hooks Status', [$this, 'field_woocommerce_note'], 'next-revalidate', 'next_revalidate_main');
        }

        add_settings_field('delay_seconds', 'Background Delay (seconds)', [$this, 'field_delay_seconds'], 'next-revalidate', 'next_revalidate_main');
        add_settings_field('max_retries', 'Max Retries', [$this, 'field_max_retries'], 'next-revalidate', 'next_revalidate_main');
        add_settings_field('debug_mode', 'Debug Mode', [$this, 'field_debug_mode'], 'next-revalidate', 'next_revalidate_main');
    }

    public function field_woocommerce_note() {
        $options = get_option($this->option_name);
        if (class_exists('WooCommerce')) {
            echo '<p style="color: green;"><strong>✓</strong> WooCommerce is active. Product/stock/category/variation/order hooks are registered and will trigger cache invalidation.</p>';
        } else {
            echo '<p style="color: orange;"><strong>⚠</strong> WooCommerce is not detected. Product-related cache invalidation will not work until it is activated.</p>';
        }
    }

    public function sanitize_settings($input) {
        $sanitized = [];
        $sanitized['nextjs_url'] = esc_url_raw(rtrim($input['nextjs_url'] ?? '', '/'));
        $sanitized['webhook_secret'] = sanitize_text_field($input['webhook_secret'] ?? '');
        $sanitized['delay_seconds'] = max(1, absint($input['delay_seconds'] ?? 5));
        $sanitized['max_retries'] = min(10, max(0, absint($input['max_retries'] ?? 3)));
        $sanitized['debug_mode'] = !empty($input['debug_mode']);
        return $sanitized;
    }

    public function field_nextjs_url() {
        $options = get_option($this->option_name);
        $value = $options['nextjs_url'] ?? '';
        echo '<input type="url" name="' . $this->option_name . '[nextjs_url]" value="' . esc_attr($value) . '" class="regular-text" placeholder="https://your-nextjs-site.com" />';
    }

    public function field_webhook_secret() {
        $options = get_option($this->option_name);
        $value = $options['webhook_secret'] ?? '';
        echo '<input type="text" name="' . $this->option_name . '[webhook_secret]" value="' . esc_attr($value) . '" class="regular-text" />';
    }

    public function field_delay_seconds() {
        $options = get_option($this->option_name);
        $value = $options['delay_seconds'] ?? 5;
        echo '<input type="number" name="' . $this->option_name . '[delay_seconds]" value="' . esc_attr($value) . '" min="1" max="300" class="small-text" /> seconds';
        echo '<p class="description">How long WordPress waits before triggering the Next.js background request.</p>';
    }

    public function field_max_retries() {
        $options = get_option($this->option_name);
        $value = $options['max_retries'] ?? 3;
        echo '<input type="number" name="' . $this->option_name . '[max_retries]" value="' . esc_attr($value) . '" min="0" max="10" class="small-text" />';
    }

    public function field_debug_mode() {
        $options = get_option($this->option_name);
        $checked = !empty($options['debug_mode']) ? 'checked' : '';
        echo '<label><input type="checkbox" name="' . $this->option_name . '[debug_mode]" value="1" ' . $checked . ' /> Enable debug logging</label>';
    }

    public function admin_enqueue_scripts($hook) {
        if ($hook !== 'settings_page_next-revalidate') return;
        ?>
        <script>
        document.addEventListener('DOMContentLoaded', function() {
            var btn = document.getElementById('next-revalidate-test-btn');
            if (!btn) return;
            btn.addEventListener('click', function() {
                var resultEl = document.getElementById('next-revalidate-test-result');
                btn.disabled = true;
                btn.textContent = 'Testing...';
                resultEl.innerHTML = '';
                var data = new FormData();
                data.append('action', 'next_revalidate_test_connection');
                data.append('_ajax_nonce', nextRevalidateAdmin.nonce);
                fetch(ajaxurl, { method: 'POST', body: data })
                    .then(function(r) { return r.json(); })
                    .then(function(res) {
                        btn.disabled = false;
                        btn.textContent = 'Test Connection';
                        if (res.success) {
                            resultEl.innerHTML = '<div class="notice notice-success inline" style="display:inline-block;"><p>' + res.data.message + ' (HTTP ' + res.data.http_code + ')</p></div>';
                        } else {
                            resultEl.innerHTML = '<div class="notice notice-error inline" style="display:inline-block;"><p>' + (res.data && res.data.message ? res.data.message : 'Unknown error') + '</p></div>';
                        }
                    })
                    .catch(function(err) {
                        btn.disabled = false;
                        btn.textContent = 'Test Connection';
                        resultEl.innerHTML = '<div class="notice notice-error inline" style="display:inline-block;"><p>Request failed: ' + err.message + '</p></div>';
                    });
            });
        });
        </script>
        <?php
    }

    public function ajax_test_connection() {
        check_ajax_referer('next_revalidate_test_connection', '_ajax_nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Permission denied.']);
        }

        $options = get_option($this->option_name);
        $nextjs_url = $options['nextjs_url'] ?? '';
        $webhook_secret = $options['webhook_secret'] ?? '';

        if (empty($nextjs_url)) {
            wp_send_json_error(['message' => 'Next.js Site URL is not configured. Please save your settings first.']);
        }

        $url = rtrim($nextjs_url, '/') . '/api/revalidate';

        $payload = [
            'target' => [
                'type' => 'page',
                'slug' => 'test-connection',
                'id'   => 0
            ],
            'event' => 'test',
            'timestamp' => time()
        ];

        $response = wp_remote_post($url, [
            'timeout' => 15,
            'headers' => [
                'Content-Type' => 'application/json',
                'x-webhook-secret' => $webhook_secret
            ],
            'body' => json_encode($payload)
        ]);

        if (is_wp_error($response)) {
            wp_send_json_error(['message' => 'Connection failed: ' . $response->get_error_message()]);
        }

        $http_code = wp_remote_retrieve_response_code($response);

        if ($http_code === 200) {
            wp_send_json_success([
                'message' => 'Connection successful! Next.js responded correctly.',
                'http_code' => $http_code
            ]);
        } else {
            $body = wp_remote_retrieve_body($response);
            wp_send_json_error(['message' => 'Next.js returned HTTP ' . $http_code . '. Response: ' . substr($body, 0, 200)]);
        }
    }

    public function settings_page() {
        if (!current_user_can('manage_options')) return;
        $last = get_option($this->last_option);
        $log = get_option($this->log_option, []);

        // Warning when webhook secret is empty but debug mode is enabled
        $options = get_option($this->option_name);
        if (!empty($options['debug_mode']) && empty($options['webhook_secret'])) {
            echo '<div class="notice notice-warning inline"><p><strong>Warning:</strong> Webhook secret is not set. Cache invalidation requests will fail authentication.</p></div>';
        }

        ?>
        <div class="wrap">
            <h1>Next.js Targeted Revalidation Settings</h1>
            <?php if ($last): ?>
            <div class="notice notice-<?php echo $last['success'] ? 'success' : 'error'; ?>">
                <p><strong>Last Background Process:</strong> <?php echo esc_html(date('Y-m-d H:i:s', $last['time'])); ?> — Path Type: <?php echo esc_html($last['type']); ?> — Status: <?php echo $last['success'] ? '✓ Success' : '✗ Failed'; ?></p>
            </div>
            <?php endif; ?>

            <form method="post" action="options.php">
                <?php settings_fields($this->option_name); do_settings_sections('next-revalidate'); submit_button(); ?>
            </form>

            <p>
                <button type="button" class="button button-secondary" id="next-revalidate-test-btn">Test Connection</button>
                <span id="next-revalidate-test-result" style="margin-left:10px;"></span>
            </p>
            <script>
            var nextRevalidateAdmin = { nonce: '<?php echo wp_create_nonce('next_revalidate_test_connection'); ?>' };
            </script>

            <hr>
            <h2>Recent Targeted Logs (Max 50)</h2>
            <table class="widefat striped">
                <thead>
                    <tr><th>Time</th><th>Type</th><th>Target Path/Slug</th><th>Action</th><th>Status</th><th>HTTP</th></tr>
                </thead>
                <tbody>
                    <?php if (!empty($log)): foreach ($log as $entry): ?>
                    <tr>
                        <td><?php echo esc_html(date('Y-m-d H:i:s', $entry['time'])); ?></td>
                        <td><?php echo esc_html($entry['type']); ?></td>
                        <td><code>/<?php echo esc_html(($entry['data']['type'] ?? '') . '/' . ($entry['data']['slug'] ?? '')); ?></code></td>
                        <td><?php echo esc_html($entry['data']['action'] ?? '-'); ?></td>
                        <td><?php echo $entry['success'] ? '<span style="color:green;">✓</span>' : '<span style="color:red;">✗</span>'; ?></td>
                        <td><?php echo esc_html($entry['http_code'] ?? '-'); ?></td>
                    </tr>
                    <?php endforeach; else: ?><tr><td colspan="6">No recent items.</td></tr><?php endif; ?>
                </tbody>
            </table>
        </div>
        <?php
    }

    public function on_post_change($post_id, $post, $update) {
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
        if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) return;
        if ($post->post_status !== 'publish') return;
        if (!in_array($post->post_type, ['post', 'page'])) return;

        $this->schedule_revalidation('post', [
            'id' => $post_id,
            'slug' => $post->post_name,
            'type' => $post->post_type,
            'action' => $update ? 'update' : 'create'
        ]);
    }

    public function on_post_delete($post_id) {
        $post = get_post($post_id);
        if (!$post || $post->post_status !== 'publish' || !in_array($post->post_type, ['post', 'page'])) return;

        $this->schedule_revalidation('post', [
            'id' => $post_id,
            'slug' => $post->post_name,
            'type' => $post->post_type,
            'action' => 'delete'
        ]);
    }

    public function on_status_change($new_status, $old_status, $post) {
        if ($new_status === $old_status || !in_array($post->post_type, ['post', 'page'])) return;

        if ($old_status === 'publish' || $new_status === 'publish') {
            $this->schedule_revalidation('post', [
                'id' => $post->ID,
                'slug' => $post->post_name,
                'type' => $post->post_type,
                'action' => 'status_change'
            ]);
        }
    }

    public function on_taxonomy_change($object_id, $terms, $tt_ids, $taxonomy, $append, $old_tt_ids) {
        if (!in_array($taxonomy, ['category', 'post_tag'])) return;
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;

        $post = get_post($object_id);
        if (!$post || $post->post_status !== 'publish' || !in_array($post->post_type, ['post', 'page'])) return;

        $this->schedule_revalidation('taxonomy', [
            'id' => $object_id,
            'slug' => $post->post_name,
            'type' => $post->post_type,
            'taxonomy' => $taxonomy,
            'action' => 'update'
        ]);
    }

    /**
     * Handle WooCommerce product changes (create/update).
     * Triggers cache invalidation for the affected product and shop pages.
     */
    public function on_woocommerce_product_change($product_id, $product) {
        if (!class_exists('WooCommerce')) return;

        $slug = is_object($product) && method_exists($product, 'get_slug') ? $product->get_slug() : '';
        if (empty($slug)) {
            $slug = get_post_field('post_name', $product_id);
        }

        $this->schedule_revalidation('product', [
            'id' => $product_id,
            'slug' => $slug,
            'type' => 'product',
            'action' => 'update'
        ]);
    }

    /**
     * Handle WooCommerce product deletion.
     * Triggers cache invalidation for the deleted product's slug (preserved from post_name).
     */
    public function on_woocommerce_product_deleted($product_id) {
        if (!class_exists('WooCommerce')) return;

        $slug = get_post_field('post_name', $product_id);

        $this->schedule_revalidation('product', [
            'id' => $product_id,
            'slug' => $slug,
            'type' => 'product',
            'action' => 'delete'
        ]);
    }

    /**
     * Handle WooCommerce stock changes.
     * Triggers targeted cache invalidation for the specific product only (not full shop page).
     */
    public function on_woocommerce_stock_change($product_id, $quantity) {
        if (!class_exists('WooCommerce')) return;

        $slug = get_post_field('post_name', $product_id);

        $this->schedule_revalidation('product_stock', [
            'id' => $product_id,
            'slug' => $slug,
            'type' => 'product_stock',
            'action' => 'stock_change'
        ]);
    }

    /**
     * Handle WooCommerce product visibility changes (visible/hidden).
     */
    public function on_woocommerce_visibility_change($product_id, $visible) {
        if (!class_exists('WooCommerce')) return;

        $slug = get_post_field('post_name', $product_id);

        $this->schedule_revalidation('product', [
            'id' => $product_id,
            'slug' => $slug,
            'type' => 'product',
            'action' => 'visibility_change',
            'visible' => (bool)$visible
        ]);
    }

    /**
     * Handle WooCommerce product featured/unfeatured status changes.
     */
    public function on_woocommerce_featured_change($product_id, $is_featured) {
        if (!class_exists('WooCommerce')) return;

        $slug = get_post_field('post_name', $product_id);

        $this->schedule_revalidation('product', [
            'id' => $product_id,
            'slug' => $slug,
            'type' => 'product',
            'action' => 'featured_change',
            'is_featured' => (bool)$is_featured
        ]);
    }

    /**
     * Handle WooCommerce product category assignment changes.
     */
    public function on_woocommerce_category_assignment($product_id, $categories, $tt_ids) {
        if (!class_exists('WooCommerce')) return;

        $slug = get_post_field('post_name', $product_id);

        // Revalidate the product itself
        $this->schedule_revalidation('product', [
            'id' => $product_id,
            'slug' => $slug,
            'type' => 'product',
            'action' => 'category_assignment'
        ]);

        // Also revalidate affected category pages
        foreach ($categories as $category) {
            if (is_object($category)) {
                $this->schedule_revalidation('woocommerce_category', [
                    'id' => $category->term_id,
                    'slug' => $category->slug,
                    'type' => 'product',
                    'action' => 'category_assignment'
                ]);
            }
        }
    }

    /**
     * Handle WooCommerce product variation changes (created/updated/deleted).
     */
    public function on_woocommerce_variation_change($variation_id, $variation) {
        if (!class_exists('WooCommerce')) return;

        $product = wc_get_product(wc_get_product_id($variation_id));
        if (!$product) return;

        $slug = get_post_field('post_name', $product->get_id());

        $this->schedule_revalidation('product_variation', [
            'id' => $variation_id,
            'slug' => $slug,
            'type' => 'product',
            'action' => 'variation_change'
        ]);
    }

    /**
     * Handle WooCommerce product variation deletion.
     */
    public function on_woocommerce_variation_deleted($variation_id) {
        if (!class_exists('WooCommerce')) return;

        $product = wc_get_product(wc_get_product_id($variation_id));
        if (!$product) return;

        $slug = get_post_field('post_name', $product->get_id());

        $this->schedule_revalidation('product_variation', [
            'id' => $variation_id,
            'slug' => $slug,
            'type' => 'product',
            'action' => 'variation_deleted'
        ]);
    }

    /**
     * Handle WooCommerce order status changes (completed/processing).
     */
    public function on_woocommerce_order_completed($order_id) {
        if (!class_exists('WooCommerce')) return;

        $this->schedule_revalidation('order', [
            'id' => $order_id,
            'slug' => '',
            'type' => 'order',
            'action' => 'completed'
        ]);
    }

    /**
     * Handle WooCommerce order status change to processing.
     */
    public function on_woocommerce_order_processing($order_id) {
        if (!class_exists('WooCommerce')) return;

        $this->schedule_revalidation('order', [
            'id' => $order_id,
            'slug' => '',
            'type' => 'order',
            'action' => 'processing'
        ]);
    }

    /**
     * Periodic cron fallback — revalidate products that haven't been touched recently.
     */
    public function execute_periodic_revalidation() {
        $last_run = get_option($this->last_option);
        if ($last_run && time() - $last_run['time'] < 3600) return; // Skip if ran within last hour

        try {
            $products = wc_get_products(['limit' => 5, 'status' => 'publish']);
        } catch (\Exception $e) {
            // Fallback: use get_posts as a safety net when WooCommerce functions aren't available
            $products = get_posts([
                'post_type' => ['product'],
                'posts_per_page' => 5,
                'post_status' => 'publish',
            ]);
        }

        foreach ($products as $product) {
            if (is_object($product)) {
                $this->schedule_revalidation('product', [
                    'id' => $product->ID,
                    'slug' => $product->post_name,
                    'type' => 'product',
                    'action' => 'periodic_check'
                ]);
            }
        }
    }

    private function schedule_revalidation($type, $data) {
        $options = get_option($this->option_name);
        if (empty($options['nextjs_url'])) return;

        $delay = $options['delay_seconds'] ?? 5;
        $args = [$type, $data];
        
        if (!wp_next_scheduled($this->cron_hook, $args)) {
            wp_schedule_single_event(time() + $delay, $this->cron_hook, $args);
            $this->debug_log("Scheduled async revalidation for: " . ($data['slug'] ?? ''), $data);
        }
    }

    public function execute_async_revalidation($type, $data) {
        $options = get_option($this->option_name);
        $max_retries = $options['max_retries'] ?? 3;

        $result = $this->send_with_retry($type, $data, $max_retries);

        update_option($this->last_option, [
            'time' => time(),
            'type' => $type,
            'success' => $result['success'],
            'http_code' => $result['http_code'],
            'error' => $result['error']
        ]);

        $log = get_option($this->log_option, []);
        array_unshift($log, [
            'time' => time(),
            'type' => $type,
            'data' => $data,
            'success' => $result['success'],
            'http_code' => $result['http_code'],
            'error' => $result['error']
        ]);
        update_option($this->log_option, array_slice($log, 0, 50));
    }

    private function send_with_retry($type, $data, $max_retries, $attempt = 0) {
        $result = $this->send_request($type, $data);

        if (!$result['success'] && $attempt < $max_retries) {
            sleep(pow(2, $attempt)); 
            return $this->send_with_retry($type, $data, $max_retries, $attempt + 1);
        }
        return $result;
    }

    private function send_request($type, $data) {
        $options = get_option($this->option_name);
        $url = $options['nextjs_url'] . '/api/revalidate';
        
        $payload = [
            'target' => [
                'type' => $data['type'] ?? 'post', 
                'slug' => $data['slug'] ?? '',     
                'id'   => $data['id'] ?? null       
            ],
            'event' => $data['action'] ?? 'update',
            'timestamp' => time()
        ];

        try {
            $response = wp_remote_post($url, [
                'timeout' => 15,
                'headers' => [
                    'Content-Type' => 'application/json',
                    'x-webhook-secret' => $options['webhook_secret'] ?? ''
                ],
                'body' => json_encode($payload)
            ]);

            if (is_wp_error($response)) {
                return ['success' => false, 'http_code' => null, 'error' => $response->get_error_message()];
            }

            $http_code = wp_remote_retrieve_response_code($response);
            
            // Better error detection: distinguish network errors vs HTTP client/server errors
            if ($http_code >= 500) {
                return ['success' => false, 'http_code' => $http_code, 'error' => "Server error (HTTP {$http_code})"];
            } elseif ($http_code === 200) {
                return ['success' => true, 'http_code' => $http_code, 'error' => null];
            } else {
                return ['success' => false, 'http_code' => $http_code, 'error' => "Client error (HTTP {$http_code})"];
            }
        } catch (\Exception $e) {
            // Network-level errors (DNS failure, connection refused, timeout)
            return ['success' => false, 'http_code' => null, 'error' => $e->getMessage()];
        }
    }

    private function debug_log($message, $data = null) {
        $options = get_option($this->option_name);
        if (empty($options['debug_mode'])) return;
        error_log('[Next.js Revalidation] ' . $message . ($data ? ' - ' . json_encode($data) : ''));
    }
}

add_action('init', function() {
    new NextRevalidate();
});