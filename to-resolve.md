# To resolve

## Dynamic menu (2026-11-06)

- [ ] **Admin password:** on the box in `/etc/brasador-web/admin.txt` (root only); the panel is https://kazin.dev/projects/brasador/admin/. Give it to the restaurant; to change it, replace the hash in `/opt/brasador-web/private/config.php` (`php -r 'echo password_hash("...", PASSWORD_DEFAULT);'`).
- [ ] **Check the menu against the restaurant's:** the content was imported from the Agora smart menu (smartmenu.agorapos.com, id qrqw7jt8) on 2026-11-06: 11 categories, 164 items, 111 photos, Spanish and English, allergens. The English texts are Agora's own machine translations (a few are odd, e.g. "Eagle Painting" for Pinta Aguila); the owner can fix them in the panel.
- [ ] **Order of the categories:** food first, then drinks (Agora listed drinks first). Reorder in the panel if the restaurant prefers otherwise.
