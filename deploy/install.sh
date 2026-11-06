#!/bin/bash
# Runs on the box as root (deploy.ps1 uploads /tmp/brasador-web.tgz and the Caddy snippet, then calls this).
# The site goes to /opt/brasador-web/web; the editable menu and the uploaded photos live beside it and
# survive every deploy: /opt/brasador-web/data (menu.json, backups) and /opt/brasador-web/uploads.
set -euo pipefail
ROOT=/opt/brasador-web
WEB=$ROOT/web
ETC=/etc/brasador-web

mkdir -p $ROOT $ROOT/data/backups $ROOT/uploads $ROOT/private $ETC

# the site files, replaced whole
rm -rf $WEB.new && mkdir -p $WEB.new
tar -xzf /tmp/brasador-web.tgz -C $WEB.new
# the first install seeds the live menu from the repository's copy; later deploys never touch it
[ -f $ROOT/data/menu.json ] || cp $WEB.new/data/menu.json $ROOT/data/menu.json
rm -rf $WEB.new/data && ln -s ../data $WEB.new/data
mkdir -p $WEB.new/img && ln -s ../../uploads $WEB.new/img/uploads
chown -R root:root $WEB.new && chmod -R a+rX $WEB.new
rm -rf $WEB.old; [ -d $WEB ] && mv $WEB $WEB.old; mv $WEB.new $WEB; rm -rf $WEB.old
chown -R www-data:www-data $ROOT/data $ROOT/uploads
chmod 775 $ROOT/data $ROOT/data/backups $ROOT/uploads

# the administrator password: made once, shown once, kept only in $ETC/admin.txt (root) as a hash in private/config.php
if [ ! -f $ROOT/private/config.php ]; then
	PASS=$(openssl rand -base64 15 | tr -d '/+=' | cut -c1-16)
	HASH=$(php -r 'echo password_hash($argv[1], PASSWORD_DEFAULT);' "$PASS")
	cat > $ROOT/private/config.php <<EOF
<?php
// Brasad'Or menu administration (admin/). Made by deploy/install.sh; change the password with:
//   php -r 'echo password_hash("new password", PASSWORD_DEFAULT);'
return ['admin_password_hash' => '$HASH'];
EOF
	printf 'admin password: %s\n' "$PASS" > $ETC/admin.txt
	chmod 600 $ETC/admin.txt
	echo "admin: new password written to $ETC/admin.txt"
fi
chown root:www-data $ROOT/private $ROOT/private/config.php
chmod 750 $ROOT/private && chmod 640 $ROOT/private/config.php

# Caddy: the site's snippet under kazin.dev
install -m 644 /tmp/brasador-web.caddy /etc/caddy/sites/kazin.dev.d/brasador-web.caddy
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
systemctl restart caddy   # the Caddyfile has admin off, so reload cannot work
sleep 2; systemctl is-active --quiet caddy || { journalctl -u caddy -n 20 --no-pager; exit 1; }
rm -f /tmp/brasador-web.tgz /tmp/brasador-web.caddy
echo "installed: $(find $WEB -type f | wc -l) files; menu $(php -r 'echo json_decode(file_get_contents($argv[1]))->version;' $ROOT/data/menu.json 2>/dev/null || echo '?')"
