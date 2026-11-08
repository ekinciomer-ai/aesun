FROM php:8.3-apache
RUN a2enmod rewrite headers expires deflate remoteip >/dev/null \
 && printf 'RemoteIPHeader X-Forwarded-For\nRemoteIPInternalProxy 172.16.0.0/12\n' > /etc/apache2/conf-enabled/remoteip.conf \
 && rm -f /etc/apache2/sites-enabled/000-default.conf \
 && mkdir -p /ev/p/site /ev/p/portal && chown -R www-data /ev
COPY apache.conf /etc/apache2/sites-enabled/aesun-web.conf
COPY php.ini /usr/local/etc/php/conf.d/aesun.ini
