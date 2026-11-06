# Publishes the site to the local server (ssh alias kazin-music) at https://kazin.dev/projects/brasador/
# Usage: powershell -ExecutionPolicy Bypass -File deploy.ps1
# The live menu (data/menu.json edited in admin/) and the uploaded photos stay on the server across deploys.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$tar = Join-Path $env:TEMP 'brasador-web.tgz'

# Only what the page serves
tar -czf $tar -C $root index.html menu.html css fonts font-awesome-4.7.0 img js lib data api admin
if ($LASTEXITCODE) { throw 'tar failed' }
scp -q $tar kazin-music:/tmp/brasador-web.tgz
scp -q (Join-Path $root 'deploy\brasador-web.caddy') kazin-music:/tmp/brasador-web.caddy
scp -q (Join-Path $root 'deploy\install.sh') kazin-music:/tmp/brasador-install.sh
ssh kazin-music 'sudo -n bash /tmp/brasador-install.sh && rm -f /tmp/brasador-install.sh'
if ($LASTEXITCODE) { throw 'install failed' }
Remove-Item $tar

$code = (Invoke-WebRequest -UseBasicParsing https://kazin.dev/projects/brasador/).StatusCode
"https://kazin.dev/projects/brasador/ -> $code"
