On the box this folder is /opt/brasador-web/private (made by deploy/install.sh) and holds config.php with the
administrator password hash. Locally, put a config.php here to try admin/ with PHP's built-in server:

    php -r 'echo password_hash("test", PASSWORD_DEFAULT);'   # then  return ['admin_password_hash' => '<hash>'];
    php -S localhost:8080                                     # http://localhost:8080/admin/
