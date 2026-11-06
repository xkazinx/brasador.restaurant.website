<?php
// GET: the menu as JSON (what menu.html renders). POST (admin): replace it; the previous file is kept in data/backups.
declare(strict_types=1);
require_once __DIR__ . '/common.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $raw = @file_get_contents(BRASADOR_DATA_FILE);
    if ($raw === false) brasador_json(500, ['ok' => false, 'error' => 'no_menu']);
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store');
    echo $raw;
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: GET, POST');
    brasador_json(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

brasador_require_admin();

$raw = file_get_contents('php://input');
if (strlen($raw) > 4 * 1024 * 1024) brasador_json(413, ['ok' => false, 'error' => 'too_big']);
$in = json_decode($raw, true);
if (!is_array($in) || !isset($in['categories']) || !is_array($in['categories'])) brasador_json(400, ['ok' => false, 'error' => 'invalid_menu']);

// ---- validation: only the fields the menu knows, with sane sizes
function text(array $o, string $key, int $max = 400): array
{
    $v = $o[$key] ?? [];
    if (is_string($v)) $v = ['es' => $v];
    if (!is_array($v)) $v = [];
    $out = [];
    foreach (['es', 'en'] as $l) $out[$l] = mb_substr(trim((string)($v[$l] ?? '')), 0, $max);
    return $out;
}
function money($v): ?float
{
    if ($v === null || $v === '') return null;
    if (!is_numeric($v)) return null;
    $n = round((float)$v, 2);
    return ($n >= 0 && $n < 100000) ? $n : null;
}
function path_ok(string $p): string
{
    // a photo is a file under img/ (the repository's or an upload), never a URL or a path outside it
    $p = trim($p);
    return preg_match('#^img/(menu|uploads)/[A-Za-z0-9._-]+\.(jpe?g|png|webp)$#', $p) ? $p : '';
}
function item(array $o, array $allergenIds): ?array
{
    $name = text($o, 'name', 120);
    if ($name['es'] === '' && $name['en'] === '') return null;
    $formats = [];
    foreach ((array)($o['formats'] ?? []) as $f) {
        if (!is_array($f)) continue;
        $fn = text($f, 'name', 120); $fp = money($f['price'] ?? null);
        if (($fn['es'] !== '' || $fn['en'] !== '') && $fp !== null) $formats[] = ['name' => $fn, 'price' => $fp];
        if (count($formats) >= 20) break;
    }
    $al = array_values(array_unique(array_map('intval', array_filter((array)($o['allergens'] ?? []), 'is_numeric'))));
    $al = array_values(array_intersect($al, $allergenIds));
    return [
        'id' => (int)($o['id'] ?? 0),
        'available' => !isset($o['available']) || (bool)$o['available'],
        'name' => $name,
        'description' => text($o, 'description', 600),
        'price' => $formats ? null : money($o['price'] ?? null),
        'formats' => $formats,
        'allergens' => $al,
        'image' => path_ok((string)($o['image'] ?? '')),
    ];
}
function category(array $o, array $allergenIds, bool $allowSub): ?array
{
    $name = text($o, 'name', 120);
    if ($name['es'] === '' && $name['en'] === '') return null;
    $items = [];
    foreach ((array)($o['items'] ?? []) as $i) { if (is_array($i) && ($it = item($i, $allergenIds))) $items[] = $it; if (count($items) >= 300) break; }
    $subs = [];
    if ($allowSub) foreach ((array)($o['categories'] ?? []) as $s) { if (is_array($s) && ($c = category($s, $allergenIds, false))) $subs[] = $c; if (count($subs) >= 30) break; }
    return ['id' => (int)($o['id'] ?? 0), 'name' => $name, 'description' => text($o, 'description', 400), 'image' => path_ok((string)($o['image'] ?? '')), 'items' => $items, 'categories' => $subs];
}

$current = json_decode((string)@file_get_contents(BRASADOR_DATA_FILE), true) ?: [];
$allergens = $current['allergens'] ?? [];           // the allergen list is fixed (the legal 14 plus the two the menu had)
$allergenIds = array_map(fn($a) => (int)$a['id'], $allergens);

$categories = [];
foreach ($in['categories'] as $c) { if (is_array($c) && ($cat = category($c, $allergenIds, true))) $categories[] = $cat; if (count($categories) >= 60) break; }

// ids: keep the given ones, give fresh ones to new entries (0), never two the same
$seen = []; $next = 1;
$walk = function (array &$list) use (&$walk, &$seen, &$next) {
    foreach ($list as &$e) {
        if ($e['id'] <= 0 || isset($seen[$e['id']])) { while (isset($seen[$next])) $next++; $e['id'] = $next; }
        $seen[$e['id']] = true;
        if (isset($e['items'])) $walk($e['items']);
        if (isset($e['categories'])) $walk($e['categories']);
    }
};
$walk($categories);
$order = 0;
$number = function (array &$list) use (&$number, &$order) { foreach ($list as &$e) { $e['order'] = $order++; if (isset($e['items'])) $number($e['items']); if (isset($e['categories'])) $number($e['categories']); } };
$number($categories);

$menu = [
    'version' => (int)($current['version'] ?? 1) + 1,
    'updated' => date('Y-m-d'),
    'restaurant' => ['name' => "Brasad'Or", 'currency' => '€', 'languages' => ['es', 'en']],
    'allergens' => $allergens,
    'categories' => $categories,
    'notes' => text($in, 'notes', 400),
];

// ---- write: a backup of what was there, then an atomic replace
if (!is_dir(BRASADOR_BACKUP_DIR)) @mkdir(BRASADOR_BACKUP_DIR, 0775, true);
if (is_file(BRASADOR_DATA_FILE)) {
    @copy(BRASADOR_DATA_FILE, BRASADOR_BACKUP_DIR . '/menu-' . date('Ymd-His') . '.json');
    $backups = glob(BRASADOR_BACKUP_DIR . '/menu-*.json') ?: [];
    sort($backups);
    foreach (array_slice($backups, 0, max(0, count($backups) - 30)) as $old) @unlink($old);
}
$json = json_encode($menu, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
$tmp = BRASADOR_DATA_FILE . '.tmp';
if (file_put_contents($tmp, $json, LOCK_EX) === false || !rename($tmp, BRASADOR_DATA_FILE)) {
    @unlink($tmp);
    brasador_json(500, ['ok' => false, 'error' => 'cannot_write']);
}
brasador_json(200, ['ok' => true, 'version' => $menu['version'], 'updated' => $menu['updated']]);
