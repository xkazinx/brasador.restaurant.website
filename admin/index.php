<?php
// The menu editor. Sign in with the administrator password (private/config.php on the box), then edit
// categories and dishes, upload photos and save: menu.html shows the change at once.
declare(strict_types=1);
require_once __DIR__ . '/../api/common.php';
brasador_session();

$cfg = brasador_config();
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])) {
    $hash = (string)($cfg['admin_password_hash'] ?? '');
    $tries = $_SESSION['tries'] ?? 0;
    if ($tries >= 8 && time() - ($_SESSION['tries_at'] ?? 0) < 900) {
        $error = 'Demasiados intentos. Espera 15 minutos.';
    } elseif ($hash !== '' && password_verify((string)$_POST['password'], $hash)) {
        session_regenerate_id(true);
        $_SESSION['admin'] = true;
        $_SESSION['csrf'] = bin2hex(random_bytes(24));
        unset($_SESSION['tries'], $_SESSION['tries_at']);
        header('Location: ' . strtok($_SERVER['REQUEST_URI'], '?'));
        exit;
    } else {
        $_SESSION['tries'] = ($tries >= 8 && time() - ($_SESSION['tries_at'] ?? 0) >= 900) ? 1 : $tries + 1;
        $_SESSION['tries_at'] = time();
        $error = $hash === '' ? 'El panel no tiene contraseña configurada (private/config.php).' : 'Contraseña incorrecta.';
    }
}
if (isset($_GET['logout'])) {
    $_SESSION = [];
    session_destroy();
    header('Location: ' . strtok($_SERVER['REQUEST_URI'], '?'));
    exit;
}
$admin = !empty($_SESSION['admin']);
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Carta - Administración - Brasad'Or</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <?php if ($admin): ?><meta name="csrf" content="<?= htmlspecialchars($_SESSION['csrf'] ?? '', ENT_QUOTES) ?>"><?php endif; ?>
    <link rel="icon" href="../img/logo_new.png">
    <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" rel="stylesheet">
    <link href="admin.css" rel="stylesheet">
</head>
<body>
<?php if (!$admin): ?>
    <main class="login">
        <form method="post" class="login-box">
            <img src="../img/logo_new.png" alt="Brasad'Or">
            <h1>Administración de la carta</h1>
            <label>Contraseña <input type="password" name="password" autofocus autocomplete="current-password"></label>
            <?php if ($error): ?><p class="error"><?= htmlspecialchars($error) ?></p><?php endif; ?>
            <button type="submit">Entrar</button>
            <a class="back" href="../menu.html">Ver la carta</a>
        </form>
    </main>
<?php else: ?>
    <header class="bar">
        <img src="../img/logo_new.png" alt="">
        <strong>Carta</strong>
        <span class="status" id="status"></span>
        <span class="grow"></span>
        <a class="btn ghost" href="../menu.html" target="_blank"><i class="fa fa-eye"></i> Ver la carta</a>
        <button class="btn primary" id="save"><i class="fa fa-floppy-disk"></i> Guardar</button>
        <a class="btn ghost" href="?logout"><i class="fa fa-right-from-bracket"></i> Salir</a>
    </header>
    <main class="editor">
        <aside class="side">
            <h2>Categorías</h2>
            <ol id="catList" class="cat-list"></ol>
            <button class="btn ghost small" id="addCat"><i class="fa fa-plus"></i> Nueva categoría</button>
            <h2>Notas al pie</h2>
            <label>Español <textarea id="notesEs" rows="2"></textarea></label>
            <label>English <textarea id="notesEn" rows="2"></textarea></label>
            <p class="hint">Los cambios se publican al pulsar <b>Guardar</b>. Se guarda una copia de la carta anterior en cada guardado.</p>
        </aside>
        <section class="work" id="work">
            <p class="hint">Elige una categoría a la izquierda.</p>
        </section>
    </main>
    <template id="tplItem">
        <article class="item">
            <div class="item-photo">
                <img alt="">
                <label class="btn ghost small upload"><i class="fa fa-camera"></i> Foto <input type="file" accept="image/*" hidden></label>
                <button class="btn ghost small no-photo" type="button"><i class="fa fa-xmark"></i> Quitar</button>
            </div>
            <div class="item-fields">
                <div class="row2">
                    <label>Nombre (ES) <input data-f="name.es"></label>
                    <label>Name (EN) <input data-f="name.en"></label>
                </div>
                <div class="row2">
                    <label>Descripción (ES) <textarea data-f="description.es" rows="2"></textarea></label>
                    <label>Description (EN) <textarea data-f="description.en" rows="2"></textarea></label>
                </div>
                <div class="row3">
                    <label>Precio (€) <input data-f="price" type="number" step="0.05" min="0"></label>
                    <label class="check"><input data-f="available" type="checkbox"> Disponible</label>
                    <div class="actions">
                        <button class="icon" data-act="up" title="Subir" type="button"><i class="fa fa-arrow-up"></i></button>
                        <button class="icon" data-act="down" title="Bajar" type="button"><i class="fa fa-arrow-down"></i></button>
                        <button class="icon danger" data-act="del" title="Eliminar" type="button"><i class="fa fa-trash"></i></button>
                    </div>
                </div>
                <details class="formats">
                    <summary>Varios precios (caña / pinta, 40 cl / 60 cl...)</summary>
                    <ol class="format-list"></ol>
                    <button class="btn ghost small" data-act="addFormat" type="button"><i class="fa fa-plus"></i> Añadir formato</button>
                </details>
                <div class="allergens"></div>
            </div>
        </article>
    </template>
    <script src="admin.js"></script>
<?php endif; ?>
</body>
</html>
