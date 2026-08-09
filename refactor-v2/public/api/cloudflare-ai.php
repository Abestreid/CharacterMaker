<?php
declare(strict_types=1);

const CLOUDFLARE_ACCOUNT_ID = 'b42a877844f90e5af0c85866814e1ab4';
const CLOUDFLARE_IMAGE_MODEL = '@cf/black-forest-labs/flux-2-klein-4b';
const MAX_REFERENCE_BYTES = 8 * 1024 * 1024;
const MAX_REFERENCES = 4;
const REQUEST_TIMEOUT_SECONDS = 90;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function fail(string $message, int $status = 400, array $details = []): never {
    http_response_code($status);
    echo json_encode([
        'error' => $message,
        'details' => $details,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function tokenFromRequest(): string {
    $token = trim((string)($_SERVER['HTTP_X_CLOUDFLARE_TOKEN'] ?? ''));
    if ($token === '') fail('Cloudflare API Token не передан.', 401);
    if (!str_starts_with($token, 'cfut_')) fail('Некорректный формат Cloudflare API Token.', 401);
    if (strlen($token) < 20 || strlen($token) > 256) fail('Некорректная длина Cloudflare API Token.', 401);
    return $token;
}

function curlAvailable(): void {
    if (!function_exists('curl_init') || !class_exists('CURLFile')) {
        fail('На сервере недоступно PHP-расширение cURL, необходимое для Workers AI.', 500);
    }
}

function cloudflareRequest(string $url, string $token, string $method = 'GET', array $postFields = []): array {
    curlAvailable();
    $curl = curl_init($url);
    if ($curl === false) fail('Не удалось инициализировать соединение с Cloudflare.', 500);

    $headers = [
        'Authorization: Bearer ' . $token,
        'Accept: application/json',
    ];

    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => REQUEST_TIMEOUT_SECONDS,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_USERAGENT => 'CharacterMaker-V2/Cloudflare-AI',
    ]);

    if ($method === 'POST') {
        curl_setopt($curl, CURLOPT_POST, true);
        curl_setopt($curl, CURLOPT_POSTFIELDS, $postFields);
    }

    $body = curl_exec($curl);
    $httpCode = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $curlError = curl_error($curl);
    curl_close($curl);

    if ($body === false) {
        fail('Не удалось связаться с Cloudflare API.', 502, ['transport' => $curlError]);
    }

    $payload = json_decode((string)$body, true);
    if (!is_array($payload)) {
        fail('Cloudflare вернул ответ в неожиданном формате.', 502, [
            'httpCode' => $httpCode,
            'response' => substr((string)$body, 0, 500),
        ]);
    }

    if ($httpCode < 200 || $httpCode >= 300 || ($payload['success'] ?? true) === false) {
        $message = 'Cloudflare API отклонил запрос.';
        $errors = $payload['errors'] ?? [];
        if (is_array($errors) && isset($errors[0]['message']) && is_string($errors[0]['message'])) {
            $message = $errors[0]['message'];
        }
        fail($message, $httpCode >= 400 && $httpCode < 600 ? $httpCode : 502, [
            'cloudflare' => $errors,
        ]);
    }

    return $payload;
}

function verifyToken(): never {
    $token = tokenFromRequest();
    $payload = cloudflareRequest('https://api.cloudflare.com/client/v4/user/tokens/verify', $token);
    $result = is_array($payload['result'] ?? null) ? $payload['result'] : [];
    $status = (string)($result['status'] ?? 'unknown');

    echo json_encode([
        'active' => $status === 'active',
        'status' => $status,
        'tokenId' => isset($result['id']) ? (string)$result['id'] : null,
        'message' => isset($payload['messages'][0]['message']) ? (string)$payload['messages'][0]['message'] : null,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function intField(string $name, int $default, int $min, int $max): int {
    $raw = $_POST[$name] ?? null;
    if ($raw === null || $raw === '') return $default;
    if (!is_numeric($raw)) fail("Поле {$name} должно быть числом.");
    $value = (int)$raw;
    if ($value < $min || $value > $max) fail("Поле {$name} должно быть от {$min} до {$max}.");
    return $value;
}

function floatField(string $name, ?float $default, float $min, float $max): ?float {
    $raw = $_POST[$name] ?? null;
    if ($raw === null || $raw === '') return $default;
    if (!is_numeric($raw)) fail("Поле {$name} должно быть числом.");
    $value = (float)$raw;
    if ($value < $min || $value > $max) fail("Поле {$name} должно быть от {$min} до {$max}.");
    return $value;
}

function referenceFile(string $field): ?CURLFile {
    if (!isset($_FILES[$field]) || !is_array($_FILES[$field])) return null;
    $file = $_FILES[$field];
    $error = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($error === UPLOAD_ERR_NO_FILE) return null;
    if ($error !== UPLOAD_ERR_OK) fail("Ошибка загрузки {$field}.");

    $size = (int)($file['size'] ?? 0);
    if ($size <= 0 || $size > MAX_REFERENCE_BYTES) fail("{$field}: размер должен быть до 8 MB.");
    $tmp = (string)($file['tmp_name'] ?? '');
    if ($tmp === '' || !is_uploaded_file($tmp)) fail("{$field}: некорректный временный файл.");

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string)$finfo->file($tmp);
    if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
        fail("{$field}: разрешены JPEG, PNG и WebP.");
    }

    $imageInfo = @getimagesize($tmp);
    if ($imageInfo === false) fail("{$field}: файл не является корректным изображением.");
    $width = (int)($imageInfo[0] ?? 0);
    $height = (int)($imageInfo[1] ?? 0);
    if ($width < 1 || $height < 1) fail("{$field}: некорректные размеры изображения.");
    if ($width >= 512 || $height >= 512) {
        fail("{$field}: FLUX.2 Klein требует референс меньше 512x512. Интерфейс должен уменьшить его автоматически.");
    }

    $name = basename((string)($file['name'] ?? $field . '.jpg'));
    return new CURLFile($tmp, $mime, $name);
}

function detectImageMime(string $binary): string {
    if (str_starts_with($binary, "\x89PNG\r\n\x1a\n")) return 'image/png';
    if (str_starts_with($binary, "\xFF\xD8\xFF")) return 'image/jpeg';
    if (strlen($binary) >= 12 && substr($binary, 0, 4) === 'RIFF' && substr($binary, 8, 4) === 'WEBP') return 'image/webp';
    return 'image/png';
}

function generateImage(): never {
    curlAvailable();
    $token = tokenFromRequest();
    $prompt = trim((string)($_POST['prompt'] ?? ''));
    if ($prompt === '') fail('Введите prompt для генерации.');
    if (strlen($prompt) > 20000) fail('Prompt слишком длинный.');

    $width = intField('width', 1024, 256, 1920);
    $height = intField('height', 1024, 256, 1920);
    $guidance = floatField('guidance', null, 0.0, 20.0);
    $seed = isset($_POST['seed']) && $_POST['seed'] !== '' ? intField('seed', 0, 0, 2147483647) : null;

    $fields = [
        'prompt' => $prompt,
        'width' => (string)$width,
        'height' => (string)$height,
    ];
    if ($guidance !== null) $fields['guidance'] = (string)$guidance;
    if ($seed !== null) $fields['seed'] = (string)$seed;

    for ($index = 0; $index < MAX_REFERENCES; $index++) {
        $field = 'input_image_' . $index;
        $reference = referenceFile($field);
        if ($reference !== null) $fields[$field] = $reference;
    }

    $url = 'https://api.cloudflare.com/client/v4/accounts/' . CLOUDFLARE_ACCOUNT_ID . '/ai/run/' . CLOUDFLARE_IMAGE_MODEL;
    $payload = cloudflareRequest($url, $token, 'POST', $fields);
    $imageBase64 = $payload['result']['image'] ?? null;
    if (!is_string($imageBase64) || $imageBase64 === '') {
        fail('Cloudflare не вернул изображение.', 502);
    }

    $binary = base64_decode($imageBase64, true);
    if ($binary === false || $binary === '') fail('Не удалось декодировать изображение Cloudflare.', 502);
    $mime = detectImageMime($binary);

    echo json_encode([
        'imageBase64' => $imageBase64,
        'mimeType' => $mime,
        'model' => CLOUDFLARE_IMAGE_MODEL,
        'width' => $width,
        'height' => $height,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Разрешен только POST.', 405);
$action = (string)($_GET['action'] ?? '');
if ($action === 'verify') verifyToken();
if ($action === 'generate') generateImage();
fail('Неизвестное действие.', 404);
