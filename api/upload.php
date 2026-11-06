<?php
// POST (admin) a photo for a dish: checked as an image, re-encoded to a JPEG of at most 1200 px, saved under img/uploads.
declare(strict_types=1);
require_once __DIR__ . '/common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { header('Allow: POST'); brasador_json(405, ['ok' => false, 'error' => 'method_not_allowed']); }
brasador_require_admin();

$f = $_FILES['photo'] ?? null;
if (!$f || ($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) brasador_json(400, ['ok' => false, 'error' => 'no_file']);
if ($f['size'] > 10 * 1024 * 1024) brasador_json(413, ['ok' => false, 'error' => 'too_big']);
$info = @getimagesize($f['tmp_name']);
if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) brasador_json(400, ['ok' => false, 'error' => 'not_an_image']);

if (!is_dir(BRASADOR_UPLOAD_DIR)) @mkdir(BRASADOR_UPLOAD_DIR, 0775, true);
$name = date('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.jpg';
$dest = BRASADOR_UPLOAD_DIR . '/' . $name;

if (function_exists('imagecreatefromstring')) {
    $src = @imagecreatefromstring((string)file_get_contents($f['tmp_name']));
    if (!$src) brasador_json(400, ['ok' => false, 'error' => 'not_an_image']);
    $w = imagesx($src); $h = imagesy($src); $max = 1200;
    $scale = min(1, $max / max($w, $h));
    $nw = (int)round($w * $scale); $nh = (int)round($h * $scale);
    $dst = imagecreatetruecolor($nw, $nh);
    $white = imagecolorallocate($dst, 255, 255, 255); imagefill($dst, 0, 0, $white);   // PNG transparency on white
    imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
    if (!imagejpeg($dst, $dest, 84)) brasador_json(500, ['ok' => false, 'error' => 'cannot_write']);
    imagedestroy($src); imagedestroy($dst);
} else {
    if ($info[2] !== IMAGETYPE_JPEG) brasador_json(400, ['ok' => false, 'error' => 'jpeg_only']);
    if (!move_uploaded_file($f['tmp_name'], $dest)) brasador_json(500, ['ok' => false, 'error' => 'cannot_write']);
}
@chmod($dest, 0644);
brasador_json(200, ['ok' => true, 'path' => BRASADOR_UPLOAD_URL . '/' . $name]);
