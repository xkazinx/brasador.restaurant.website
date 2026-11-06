<?php
// Shared by the menu API and the admin page: paths, the private config, the admin session check.
declare(strict_types=1);

const BRASADOR_DATA_FILE = __DIR__ . '/../data/menu.json';        // web/data -> /opt/brasador-web/data (install.sh)
const BRASADOR_BACKUP_DIR = __DIR__ . '/../data/backups';
const BRASADOR_UPLOAD_DIR = __DIR__ . '/../img/uploads';           // web/img/uploads -> /opt/brasador-web/uploads
const BRASADOR_UPLOAD_URL = 'img/uploads';

function brasador_config(): array
{
    // Outside the served tree: /opt/brasador-web/private/config.php; locally, private/config.php beside the site
    foreach ([__DIR__ . '/../../private/config.php', __DIR__ . '/../private/config.php'] as $file) {
        if (is_file($file)) {
            $cfg = require $file;
            return is_array($cfg) ? $cfg : [];
        }
    }
    return [];
}

function brasador_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Lax']);
    session_name('brasador_admin');
    session_start();
}

function brasador_is_admin(): bool
{
    brasador_session();
    return !empty($_SESSION['admin']);
}

function brasador_json(int $code, array $payload): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Writes need the admin session and the CSRF token the admin page handed out
function brasador_require_admin(): void
{
    if (!brasador_is_admin()) brasador_json(401, ['ok' => false, 'error' => 'not_signed_in']);
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!$token || !hash_equals($_SESSION['csrf'] ?? '', $token)) brasador_json(403, ['ok' => false, 'error' => 'bad_token']);
}
