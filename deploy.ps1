# Publishes the site to the local server (ssh alias kazin-music) at https://kazin.dev/brasador-web/
# Usage: powershell -ExecutionPolicy Bypass -File deploy.ps1
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$tar = Join-Path $env:TEMP 'brasador-web.tgz'

# Only what the page serves
tar -czf $tar -C $root index.html css fonts font-awesome-4.7.0 img js lib
scp -q $tar kazin-music:/tmp/brasador-web.tgz
scp -q (Join-Path $root 'deploy\brasador-web.caddy') kazin-music:/tmp/brasador-web.caddy

ssh kazin-music @'
set -e
sudo rm -rf /opt/brasador-web/web.new
sudo mkdir -p /opt/brasador-web/web.new
sudo tar -xzf /tmp/brasador-web.tgz -C /opt/brasador-web/web.new
sudo chmod -R a+rX /opt/brasador-web/web.new
sudo rm -rf /opt/brasador-web/web.old
[ -d /opt/brasador-web/web ] && sudo mv /opt/brasador-web/web /opt/brasador-web/web.old
sudo mv /opt/brasador-web/web.new /opt/brasador-web/web
sudo rm -rf /opt/brasador-web/web.old
sudo install -m 644 /tmp/brasador-web.caddy /etc/caddy/sites/kazin.dev.d/brasador-web.caddy
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
sudo systemctl restart caddy   # the Caddyfile has admin off, so reload cannot work
rm -f /tmp/brasador-web.tgz /tmp/brasador-web.caddy
'@
Remove-Item $tar

$code = (Invoke-WebRequest -UseBasicParsing https://kazin.dev/brasador-web/).StatusCode
"https://kazin.dev/brasador-web/ -> $code"
