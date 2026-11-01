<?php
declare(strict_types=1);

/* TODO: replace with the real enquiry address. This placeholder is not a valid
   email address, so nothing will be delivered until it is changed. */
const ENQUIRY_EMAIL = 'mikzid@info';
const VILLA_PHONE = '+94 77 7 327 993';

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
        echo json_encode([
            'success' => $success,
            'message' => $message,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $query = http_build_query([
        'status' => $success ? 'success' : 'error',
        'message' => $message,
    ]);
    header('Location: index.html?' . $query . '#enquire');
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
    $dir = sys_get_temp_dir() . '/mikzid_contact';
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

/** True only for a real calendar date in YYYY-MM-DD form. */
function is_valid_date(string $value): bool
{
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);

    return $date !== false && $date->format('Y-m-d') === $value;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    if (is_ajax_request()) {
        respond(false, 'Invalid request method.', 405);
    }
    header('Location: index.html#enquire');
    exit;
}

/* Honeypot: a field hidden from people but not from most bots. Anything that
   fills it gets a success response — telling a bot it failed just teaches it
   to try again differently. */
if (trim($_POST['website'] ?? '') !== '') {
    respond(true, 'Thank you! Your enquiry has been sent.');
}

if (!within_rate_limit($_SERVER['REMOTE_ADDR'] ?? 'unknown')) {
    respond(false, 'Too many enquiries from this connection. Please try again later, or call us on ' . VILLA_PHONE . '.', 429);
}

$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$checkin = trim($_POST['checkin'] ?? '');
$checkout = trim($_POST['checkout'] ?? '');
$guests = trim($_POST['guests'] ?? '');
$stayType = trim($_POST['stayType'] ?? '');
$message = trim($_POST['message'] ?? '');

$errors = [];

if ($name === '') {
    $errors[] = 'Your name is required.';
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'A valid email address is required.';
}

if (!is_valid_date($checkin) || !is_valid_date($checkout)) {
    $errors[] = 'Please choose your check-in and check-out dates.';
} elseif ($checkout <= $checkin) {
    $errors[] = 'Check-out must be after check-in.';
}

if (filter_var($guests, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 15]]) === false) {
    $errors[] = 'Please enter between 1 and 15 guests.';
}

/* The form offers exactly three values — anything else was not typed by a
   person using the page. */
if (!in_array($stayType, ['stay', 'celebration', 'other'], true)) {
    $errors[] = 'Please choose a stay type.';
}

/* Length caps, so a single POST can't drop a novel into the inbox. */
if (mb_strlen($name) > 100 || mb_strlen($email) > 254 || mb_strlen($phone) > 40 || mb_strlen($message) > 5000) {
    $errors[] = 'One of your entries is too long — please shorten it.';
}

if (!empty($errors)) {
    respond(false, implode(' ', $errors), 422);
}

/* Modern PHP already collapses CRLF in the subject, but don't rely on the
   host's PHP version for that — strip it here too. */
$subject = 'New villa enquiry from ' . header_safe($name);

$body = "Name: $name\n";
$body .= "Email: $email\n";
if ($phone !== '') {
    $body .= "Phone: $phone\n";
}
$body .= "Check-in: $checkin\n";
$body .= "Check-out: $checkout\n";
$body .= "Guests: $guests\n";
$body .= "Stay type: $stayType\n";
if ($message !== '') {
    $body .= "\nMessage:\n$message\n";
}

$domain = preg_replace('/^www\./', '', (string) ($_SERVER['SERVER_NAME'] ?? 'localhost'));

$headers = [];
$headers[] = 'From: no-reply@' . header_safe((string) $domain);
$headers[] = 'Reply-To: ' . header_safe($email);
$headers[] = 'Content-Type: text/plain; charset=UTF-8';

$sent = @mail(ENQUIRY_EMAIL, $subject, $body, implode("\r\n", $headers));

if ($sent) {
    respond(true, 'Thank you! Your enquiry has been sent. We will get back to you soon.');
}

respond(
    false,
    'Your enquiry could not be sent right now. Please try again later or call us on ' . VILLA_PHONE . '.',
    500
);
