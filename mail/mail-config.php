<?php
// Configuración del formulario de contacto de BeMarketing.
// NO exponer este archivo públicamente: mail/.htaccess bloquea su acceso web.

return [
    // SMTP autenticado del propio hosting cPanel (SSL/TLS implícito en 465)
    'smtp' => [
        'host'     => 'mail.bemarketingcr.com',
        'port'     => 465,
        'secure'   => 'ssl',
        'username' => 'formulario@bemarketingcr.com',
        'password' => 'CAMBIAR_POR_LA_CONTRASEÑA', // ← poner la contraseña directamente en el servidor
    ],

    // Remitente: debe ser la misma cuenta autenticada para que SPF/DKIM alineen
    'from_email' => 'formulario@bemarketingcr.com',
    'from_name'  => 'BeMarketing — Formulario web',

    // Destino principal: recibe todos los mensajes
    'to_email' => 'info@bemarketingcr.com',
    'to_name'  => 'BeMarketing',

    // Copia solo cuando la persona viene de la página de Social Media
    'social_cc_email' => 'social@bemarketingcr.com',
    'social_cc_name'  => 'BeMarketing Social Media',

    // Dominios desde los que se acepta el formulario
    'allowed_origins' => [
        'https://bemarketingcr.com',
        'https://www.bemarketingcr.com',
    ],
];
