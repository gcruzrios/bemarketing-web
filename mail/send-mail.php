<?php
/**
 * Endpoint del formulario de contacto de BeMarketing.
 * Recibe POST (form-data), valida los campos y envía el correo por
 * SMTP autenticado (mail.bemarketingcr.com) usando PHPMailer.
 *
 * Destinatarios:
 *   - Siempre: info@bemarketingcr.com
 *   - Copia a social@bemarketingcr.com si form_origin = "social-media"
 */

declare(strict_types=1);

date_default_timezone_set('America/Costa_Rica');

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailerException;

require_once __DIR__ . '/vendor/PHPMailer/src/Exception.php';
require_once __DIR__ . '/vendor/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/vendor/PHPMailer/src/SMTP.php';

$config = require __DIR__ . '/mail-config.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function respond(bool $ok, string $message, int $status = 200): void
{
    http_response_code($status);
    echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function logMailAttempt(string $status, string $to, string $email, string $detail = ''): void
{
    $line = sprintf("[%s] %s | to=%s email=%s%s\n", date('Y-m-d H:i:s'), $status, $to, $email, $detail !== '' ? " | {$detail}" : '');
    // Se guarda como .php con un exit al inicio: aunque alguien abra la URL, no ve nada.
    $logFile = __DIR__ . '/mail-log.php';
    if (!file_exists($logFile)) {
        @file_put_contents($logFile, "<?php http_response_code(404); exit; ?>\n", LOCK_EX);
    }
    @file_put_contents($logFile, $line, FILE_APPEND | LOCK_EX);
}

// --- Método y origen -----------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'Método no permitido.', 405);
}

// Los navegadores envían Origin en los POST; si viene de otro sitio, se rechaza.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && !in_array($origin, $config['allowed_origins'], true)) {
    respond(false, 'Origen no permitido.', 403);
}

$input = $_POST;

// --- Honeypot anti-spam --------------------------------------------------
// Campo oculto "website": si un bot lo rellena, se finge éxito y no se envía nada.
if (!empty($input['website'])) {
    respond(true, 'Gracias. Recibimos su solicitud.');
}

// --- Límite de frecuencia por sesión -------------------------------------
session_start();
$now = time();
if (!empty($_SESSION['last_submit']) && ($now - (int) $_SESSION['last_submit']) < 30) {
    respond(false, 'Ya recibimos su mensaje. Espere unos segundos antes de volver a enviarlo.', 429);
}

// --- Validar y sanear ----------------------------------------------------
$field = static fn (string $key): string => trim((string) ($input[$key] ?? ''));

$name     = $field('name');
$business = $field('business');
$email    = $field('email');
$phone    = $field('phone');
$sector   = $field('sector');
$message  = $field('message');
$formOrigin = strtolower($field('form_origin'));
$fromSocial = $formOrigin === 'social-media';

$errors = [];
if ($name === '' || mb_strlen($name) > 150)             { $errors[] = 'name'; }
if ($business === '' || mb_strlen($business) > 150)     { $errors[] = 'business'; }
if ($email === '' || strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) { $errors[] = 'email'; }
if ($phone === '' || mb_strlen($phone) > 40)            { $errors[] = 'phone'; }
if ($sector === '' || mb_strlen($sector) > 100)         { $errors[] = 'sector'; }
if (mb_strlen($message) > 5000)                         { $errors[] = 'message'; }

if ($errors) {
    respond(false, 'Por favor complete correctamente todos los campos requeridos.', 422);
}

// Nunca permitir saltos de línea en valores que terminan en cabeceras.
$oneLine = static fn (string $s): string => str_replace(["\r", "\n"], ' ', $s);
$name     = $oneLine($name);
$business = $oneLine($business);
$email    = $oneLine($email);

// --- Contenido del correo ------------------------------------------------
// Página desde la que llegó la persona (?origen=… en /contacto)
$origins = [
    'social-media' => ['Página de Social Media', '[Social Media] '],
    'hoteles'      => ['Página de Marketing para Hoteles', '[Hoteles] '],
    'restaurantes' => ['Página de Marketing para Restaurantes', '[Restaurantes] '],
    'cafeterias'   => ['Página de Marketing para Cafeterías', '[Cafeterías] '],
];
[$originLabel, $subjectTag] = $origins[$formOrigin] ?? ['Formulario de contacto', ''];
$subject = $subjectTag . "Nueva solicitud: {$business} ({$sector})";

$e = static fn (string $s): string => htmlspecialchars($s !== '' ? $s : '—', ENT_QUOTES, 'UTF-8');
$waNumber = preg_replace('/\D+/', '', $phone);
$waLink   = $waNumber !== '' ? 'https://wa.me/' . $waNumber : '';

$rows = [
    'Nombre'   => $e($name),
    'Negocio'  => $e($business),
    'Correo'   => '<a href="mailto:' . $e($email) . '" style="color:#E016AE;">' . $e($email) . '</a>',
    'WhatsApp' => $waLink !== '' ? '<a href="' . $e($waLink) . '" style="color:#E016AE;">' . $e($phone) . '</a>' : $e($phone),
    'Sector'   => $e($sector),
    'Origen'   => $e($originLabel),
];
$rowsHtml = '';
foreach ($rows as $label => $value) {
    $rowsHtml .= '<tr><td style="padding:8px 12px 8px 26px;color:#6b6780;font-size:13px;white-space:nowrap;vertical-align:top;">' . $label
        . '</td><td style="padding:8px 26px 8px 12px;font-size:15px;color:#111;">' . $value . '</td></tr>';
}
$safeMessage = nl2br($e($message));
$sentAt = date('d/m/Y H:i');

$htmlBody = <<<HTML
<div style="background:#f4f1fa;padding:24px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e4e0ee;">
    <div style="background:#07070B;padding:22px 26px;">
      <span style="font-family:Georgia,serif;font-size:22px;color:#F4F1FA;">Be<span style="color:#FF3EC8;">Marketing</span></span>
      <div style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#FFDD3C;margin-top:6px;">Nueva solicitud · {$e($originLabel)}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin:14px 0;">{$rowsHtml}</table>
    <div style="padding:0 26px 22px;">
      <div style="color:#6b6780;font-size:13px;margin-bottom:6px;">¿Qué le gustaría lograr?</div>
      <div style="background:#f7f5fb;border-left:3px solid #FF3EC8;padding:12px 14px;font-size:15px;color:#111;line-height:1.5;">{$safeMessage}</div>
      <p style="font-size:12px;color:#9a96ad;margin-top:18px;">Recibido el {$sentAt}. Responda a este correo para contestarle directamente a {$e($name)}.</p>
    </div>
  </div>
</div>
HTML;

$textBody = "Nueva solicitud — {$originLabel}\n\n"
    . "Nombre: {$name}\nNegocio: {$business}\nCorreo: {$email}\nWhatsApp: {$phone}\nSector: {$sector}\n\n"
    . "¿Qué le gustaría lograr?\n" . ($message !== '' ? $message : '—') . "\n\nRecibido el {$sentAt}";

// --- Envío por SMTP ------------------------------------------------------
$smtp = $config['smtp'];
$mail = new PHPMailer(true);
try {
    $mail->isSMTP();
    $mail->Host       = $smtp['host'];
    $mail->Port       = (int) $smtp['port'];
    $mail->SMTPAuth   = true;
    $mail->Username   = $smtp['username'];
    $mail->Password   = $smtp['password'];
    $mail->SMTPSecure = strtolower($smtp['secure']) === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Timeout    = 15;
    $mail->CharSet    = PHPMailer::CHARSET_UTF8;

    $mail->setFrom($config['from_email'], $config['from_name']);
    $mail->addAddress($config['to_email'], $config['to_name']);
    if ($fromSocial) {
        $mail->addCC($config['social_cc_email'], $config['social_cc_name']);
    }
    $mail->addReplyTo($email, $name);

    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body    = $htmlBody;
    $mail->AltBody = $textBody;

    $mail->send();

    $_SESSION['last_submit'] = $now;
    logMailAttempt('SENT OK', $config['to_email'] . ($fromSocial ? ' cc=' . $config['social_cc_email'] : ''), $email);
    respond(true, "¡Gracias, {$name}! Recibimos su solicitud y le escribiremos en menos de 24 horas.");
} catch (MailerException $ex) {
    logMailAttempt('FAILED', $config['to_email'], $email, $mail->ErrorInfo);
    error_log('BeMarketing contact form mail error: ' . $mail->ErrorInfo);
    respond(false, 'No pudimos enviar su mensaje en este momento. Escríbanos por WhatsApp al +506 8315-3405 o intente de nuevo más tarde.', 500);
}
