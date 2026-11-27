<?php
declare(strict_types=1);

/* Villa enquiry handler for the enquiry form on the home page.
   AJAX requests get JSON; plain form posts are redirected back to
   ./?status=…&message=… so the page can show the result. */

/* ——— Settings: fill these in before launch ———————————————————————————
   MAIL_TO   the inbox that receives enquiries (the villa owner's address).
   MAIL_FROM an address on the site's own domain, so the host's mail server
             will send it and spam filters accept it. */
const MAIL_TO = '';                              // e.g. 'bookings@your-domain.lk'
const MAIL_FROM = 'no-reply@your-domain.lk';
const PHONE = '+94 77 7 327 993';
const MAX_GUESTS = 15;
const MAX_NIGHTS = 60;
const TIMEZONE = 'Asia/Colombo';
const STAY_TYPES = ['Overnight stay', 'Birthday or celebration', 'Family gathering', 'Day visit', 'Other'];

function is_ajax_request(): bool
{
    $xhr = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';

    return strcasecmp($xhr, 'XMLHttpRequest') === 0
        || str_contains($accept, 'application/json');
}

function respond(bool $success, string $message, int $code = 200): void
{
    if (is_ajax_request()) {
        http_response_code($code);
        header('Content-Type: application/json; charset=UTF-8');
        header('Cache-Control: no-store');
        echo json_encode(['success' => $success, 'message' => $message], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $query = http_build_query([
        'status' => $success ? 'success' : 'error',
        'message' => $message,
    ]);
    header('Location: ./?' . $query . '#enquiry', true, 303);
    exit;
}

/**
 * Per-IP submission cap, kept in a small JSON file per address.
 *
 * Deliberately fails OPEN: if the temp directory isn't writable we let the
 * enquiry through rather than blocking a real guest. The point is to stop
 * bulk automated posting, not to be an access control.
 */
function within_rate_limit(string $ip, int $max = 5, int $window = 3600): bool
{
    $dir = sys_get_temp_dir() . '/mikzid_enquiry';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return true;
    }

    $handle = @fopen($dir . '/' . hash('sha256', $ip) . '.json', 'c+');
    if ($handle === false) {
        return true;
    }

    @flock($handle, LOCK_EX);
    $now = time();
    $decoded = json_decode((string) stream_get_contents($handle), true);
    $hits = is_array($decoded)
        ? array_values(array_filter($decoded, static fn($t) => is_int($t) && $t > $now - $window))
        : [];

    $allowed = count($hits) < $max;
    if ($allowed) {
        $hits[] = $now;
    }

    rewind($handle);
    ftruncate($handle, 0);
    fwrite($handle, (string) json_encode($hits));
    @flock($handle, LOCK_UN);
    fclose($handle);

    return $allowed;
}

/** Collapse anything that could break out of a mail header. */
function header_safe(string $value): string
{
    return trim(preg_replace('/[\r\n\t]+/', ' ', $value) ?? '');
}

function field(string $name): string
{
    $value = $_POST[$name] ?? '';
    return is_string($value) ? trim($value) : '';
}

/** A strict YYYY-MM-DD date at midnight in the villa's time zone, or null. */
function parse_date(string $value, DateTimeZone $tz): ?DateTimeImmutable
{
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value, $tz);
    return ($date && $date->format('Y-m-d') === $value) ? $date : null;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    if (is_ajax_request()) {
        respond(false, 'Invalid request method.', 405);
    }
    header('Location: ./');
    exit;
}

/* Honeypot: a field hidden from people but not from most bots. Anything that
   fills it gets a success response — telling a bot it failed just teaches it
   to try again differently. */
if (field('website') !== '') {
    respond(true, 'Thank you! Your enquiry has been sent.');
}

/* Not configured yet: say so plainly and point to WhatsApp, rather than
   pretending the enquiry went somewhere. */
if (MAIL_TO === '') {
    respond(false, 'Online enquiries are not switched on yet. Please call or WhatsApp us on ' . PHONE . '.', 503);
}

if (!within_rate_limit($_SERVER['REMOTE_ADDR'] ?? 'unknown')) {
    respond(false, 'Too many enquiries from this connection. Please try again later, or call us on ' . PHONE . '.', 429);
}

$data = [
    'fullName' => field('fullName'),
    'email' => field('email'),
    'phone' => field('phone'),
    'stayType' => field('stayType'),
    'checkIn' => field('checkIn'),
    'checkOut' => field('checkOut'),
    'guests' => field('guests'),
    'message' => field('message'),
];

/* Only the message may span lines; flatten line breaks everywhere else. */
foreach ($data as $name => $value) {
    if ($name !== 'message') {
        $data[$name] = header_safe($value);
    }
}

/* Length caps, so a single POST can't drop a novel into the inbox. */
$limits = ['fullName' => 120, 'email' => 254, 'phone' => 40, 'stayType' => 40, 'checkIn' => 10, 'checkOut' => 10, 'guests' => 3, 'message' => 3000];

$errors = [];

if ($data['fullName'] === '') {
    $errors[] = 'Please enter your full name.';
}
if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Please enter a valid email address.';
}

$tz = new DateTimeZone(TIMEZONE);
$today = new DateTimeImmutable('today', $tz);
$checkIn = parse_date($data['checkIn'], $tz);
$checkOut = parse_date($data['checkOut'], $tz);
$nights = 0;

if (!$checkIn) {
    $errors[] = 'Please choose a check-in date.';
} elseif ($checkIn < $today) {
    $errors[] = 'Your check-in date is in the past.';
} elseif ($checkIn > $today->modify('+2 years')) {
    $errors[] = 'We take enquiries up to two years ahead.';
}
if (!$checkOut) {
    $errors[] = 'Please choose a check-out date.';
} elseif ($checkIn && $checkOut <= $checkIn) {
    $errors[] = 'Please choose a check-out date after your check-in date.';
} elseif ($checkIn) {
    $nights = (int) $checkIn->diff($checkOut)->days;
    if ($nights > MAX_NIGHTS) {
        $errors[] = 'For stays longer than ' . MAX_NIGHTS . ' nights, please call us on ' . PHONE . '.';
    }
}

$guests = filter_var($data['guests'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => MAX_GUESTS]]);
if ($guests === false) {
    $errors[] = 'Please enter between 1 and ' . MAX_GUESTS . ' guests.';
}

if (!in_array($data['stayType'], STAY_TYPES, true)) {
    $data['stayType'] = 'Other';
}

foreach ($limits as $name => $max) {
    if (mb_strlen($data[$name]) > $max) {
        $errors[] = 'One of your entries is too long — please shorten it.';
        break;
    }
}

if ($errors) {
    respond(false, implode(' ', $errors), 422);
}

$data['checkIn'] = $checkIn->format('D j M Y');
$data['checkOut'] = $checkOut->format('D j M Y') . ' (' . $nights . ($nights === 1 ? ' night)' : ' nights)');
$data['guests'] = (string) $guests;

$labels = [
    'fullName' => 'Full name',
    'email' => 'Email',
    'phone' => 'Phone / WhatsApp',
    'stayType' => 'Type of stay',
    'checkIn' => 'Check-in',
    'checkOut' => 'Check-out',
    'guests' => 'Guests',
    'message' => 'Message',
];

$body = "New villa enquiry from the Mik Zid Villa website\n";
$body .= str_repeat('-', 48) . "\n\n";
foreach ($labels as $name => $label) {
    if ($data[$name] === '') {
        continue;
    }
    $value = $data[$name];
    $body .= str_contains($value, "\n")
        ? "\n$label:\n$value\n\n"
        : "$label: $value\n";
}
$body .= "\nSubmitted: " . (new DateTimeImmutable('now', $tz))->format('Y-m-d H:i') . " (Sri Lanka time)\n";
$body .= "Reply to this email to answer the guest directly.\n";

/* Modern PHP already collapses CRLF in the subject, but don't rely on the
   host's PHP version for that — strip it here too. */
$subject = 'Villa enquiry: ' . header_safe($data['fullName'])
    . ', ' . $checkIn->format('j M') . ' – ' . $checkOut->format('j M Y')
    . ' (' . $guests . ($guests === 1 ? ' guest)' : ' guests)');
$subject = '=?UTF-8?B?' . base64_encode(mb_substr($subject, 0, 150)) . '?=';

$headers = [
    'From: Mik Zid Villa Website <' . MAIL_FROM . '>',
    'Reply-To: ' . header_safe($data['email']),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
];

$sent = @mail(MAIL_TO, $subject, $body, implode("\r\n", $headers), '-f' . MAIL_FROM);

if ($sent) {
    respond(true, 'Thank you! Your enquiry has been sent. We will reply soon to confirm availability.');
}

respond(
    false,
    'Your enquiry could not be sent right now. Please try again later, or call or WhatsApp us on ' . PHONE . '.',
    500
);
