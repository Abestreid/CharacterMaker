<?php
declare(strict_types=1);

const MAX_REFERENCE_BYTES = 10 * 1024 * 1024;
const MAX_REFERENCES = 4;
const REQUEST_TIMEOUT_SECONDS = 110;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function respond(array $payload, int $status = 200): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $message, int $status = 400, string $code = 'request_failed', array $details = []): never {
    respond(['error' => $message, 'code' => $code, 'details' => $details], $status);
}

function curlAvailable(): void {
    if (!function_exists('curl_init')) fail('На сервере недоступно PHP cURL.', 500, 'curl_unavailable');
}

function providerField(): string {
    $provider = trim((string)($_POST['provider'] ?? ''));
    if (!in_array($provider, ['cloudflare', 'aihorde', 'pollinations'], true)) {
        fail('Неизвестный AI provider.', 400, 'provider_invalid');
    }
    return $provider;
}

function apiKeyField(): string {
    $key = trim((string)($_POST['api_key'] ?? ''));
    if ($key === '') fail('API key не передан.', 401, 'credential_missing');
    if (strlen($key) > 512) fail('API key слишком длинный.', 400, 'credential_invalid');
    return $key;
}

function accountIdField(): string {
    $accountId = trim((string)($_POST['account_id'] ?? ''));
    if (!preg_match('/^[a-f0-9]{32}$/i', $accountId)) {
        fail('Некорректный Cloudflare Account ID.', 400, 'account_id_invalid');
    }
    return $accountId;
}

function textField(string $name, string $default = '', int $maxLength = 32000): string {
    $value = trim((string)($_POST[$name] ?? $default));
    if (strlen($value) > $maxLength) fail("Поле {$name} слишком длинное.");
    return $value;
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

function requestRaw(string $url, string $method, array $headers = [], mixed $body = null): array {
    curlAvailable();
    $curl = curl_init($url);
    if ($curl === false) fail('Не удалось инициализировать HTTP соединение.', 500, 'transport_init_failed');

    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => REQUEST_TIMEOUT_SECONDS,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_USERAGENT => 'CharacterMaker-V2/AI-Provider-Layer',
    ]);

    if ($method === 'POST') {
        curl_setopt($curl, CURLOPT_POST, true);
        if ($body !== null) curl_setopt($curl, CURLOPT_POSTFIELDS, $body);
    }

    $responseBody = curl_exec($curl);
    $status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $error = curl_error($curl);
    curl_close($curl);

    if ($responseBody === false) fail('Не удалось связаться с AI provider.', 502, 'transport_failed', ['transport' => $error]);
    return [$status, (string)$responseBody];
}

function jsonRequest(string $url, string $method, array $headers = [], ?array $payload = null): array {
    if ($payload !== null) {
        $headers[] = 'Content-Type: application/json';
        $body = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($body === false) fail('Не удалось сериализовать запрос.', 500, 'json_encode_failed');
    } else {
        $body = null;
    }
    [$status, $raw] = requestRaw($url, $method, $headers, $body);
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        fail('AI provider вернул неожиданный ответ.', 502, 'provider_response_invalid', ['httpCode' => $status, 'response' => substr($raw, 0, 600)]);
    }
    return [$status, $decoded];
}

function uploadedReference(int $index): ?array {
    $field = 'input_image_' . $index;
    if (!isset($_FILES[$field]) || !is_array($_FILES[$field])) return null;
    $file = $_FILES[$field];
    $error = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($error === UPLOAD_ERR_NO_FILE) return null;
    if ($error !== UPLOAD_ERR_OK) fail("Ошибка загрузки {$field}.", 400, 'reference_upload_failed');

    $size = (int)($file['size'] ?? 0);
    $tmp = (string)($file['tmp_name'] ?? '');
    if ($size <= 0 || $size > MAX_REFERENCE_BYTES) fail("{$field}: размер должен быть до 10 MB.", 400, 'reference_too_large');
    if ($tmp === '' || !is_uploaded_file($tmp)) fail("{$field}: некорректный временный файл.", 400, 'reference_invalid');

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string)$finfo->file($tmp);
    if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
        fail("{$field}: разрешены JPEG, PNG и WebP.", 400, 'reference_type_invalid');
    }
    return ['tmp' => $tmp, 'mime' => $mime, 'name' => basename((string)($file['name'] ?? $field . '.jpg'))];
}

function references(): array {
    $result = [];
    for ($index = 0; $index < MAX_REFERENCES; $index++) {
        $reference = uploadedReference($index);
        if ($reference !== null) $result[] = $reference;
    }
    return $result;
}

function referenceDataUri(array $reference): string {
    $binary = file_get_contents($reference['tmp']);
    if ($binary === false) fail('Не удалось прочитать reference image.', 500, 'reference_read_failed');
    return 'data:' . $reference['mime'] . ';base64,' . base64_encode($binary);
}

function imageBinaryFromUrl(string $url, array $headers = []): string {
    if (!preg_match('#^https://#i', $url)) fail('Provider вернул небезопасный URL изображения.', 502, 'image_url_invalid');
    [$status, $binary] = requestRaw($url, 'GET', $headers);
    if ($status < 200 || $status >= 300 || $binary === '') fail('Не удалось загрузить изображение provider.', 502, 'image_download_failed', ['httpCode' => $status]);
    return $binary;
}

function detectImageMime(string $binary): string {
    if (str_starts_with($binary, "\x89PNG\r\n\x1a\n")) return 'image/png';
    if (str_starts_with($binary, "\xFF\xD8\xFF")) return 'image/jpeg';
    if (strlen($binary) >= 12 && substr($binary, 0, 4) === 'RIFF' && substr($binary, 8, 4) === 'WEBP') return 'image/webp';
    return 'image/png';
}

function normalizeBase64Image(string $base64): array {
    if (str_starts_with($base64, 'data:')) {
        $parts = explode(',', $base64, 2);
        $base64 = $parts[1] ?? '';
    }
    $binary = base64_decode($base64, true);
    if ($binary === false || $binary === '') fail('Provider вернул поврежденное изображение.', 502, 'image_decode_failed');
    return [base64_encode($binary), detectImageMime($binary)];
}

function cloudflareError(int $status, array $payload): never {
    $errors = is_array($payload['errors'] ?? null) ? $payload['errors'] : [];
    $first = is_array($errors[0] ?? null) ? $errors[0] : [];
    $providerCode = (string)($first['code'] ?? '');
    $message = (string)($first['message'] ?? 'Cloudflare API отклонил запрос.');
    $code = match ($providerCode) {
        '3036' => 'quota_exhausted',
        '5035' => 'model_requires_paid',
        '3042' => 'model_not_found',
        default => ($status === 401 || $status === 403) ? 'credential_invalid' : ($status === 429 ? 'rate_limited' : 'provider_error'),
    };
    fail($message, $status >= 400 && $status < 600 ? $status : 502, $code, ['providerCode' => $providerCode, 'cloudflare' => $errors]);
}

function verifyCloudflare(string $key): never {
    $accountId = accountIdField();
    [$status, $payload] = jsonRequest(
        'https://api.cloudflare.com/client/v4/accounts/' . $accountId . '/ai/models/search?per_page=1',
        'GET',
        ['Authorization: Bearer ' . $key, 'Accept: application/json']
    );
    if ($status < 200 || $status >= 300 || ($payload['success'] ?? true) === false) cloudflareError($status, $payload);
    respond(['ok' => true, 'provider' => 'cloudflare', 'message' => 'Cloudflare Account ID + Token имеют доступ к Workers AI.']);
}

function generateCloudflare(string $key): never {
    $accountId = accountIdField();
    $model = textField('model', '@cf/black-forest-labs/flux-2-klein-9b', 200);
    if (!str_starts_with($model, '@cf/')) fail('Cloudflare model ID должен начинаться с @cf/.', 400, 'model_invalid');
    $prompt = textField('prompt');
    if ($prompt === '') fail('Введите prompt.', 400, 'prompt_missing');
    $width = intField('width', 1024, 256, 1920);
    $height = intField('height', 1024, 256, 1920);
    $guidance = floatField('guidance', null, 0.0, 20.0);
    $seed = isset($_POST['seed']) && $_POST['seed'] !== '' ? intField('seed', 0, 0, 2147483647) : null;

    $fields = ['prompt' => $prompt, 'width' => (string)$width, 'height' => (string)$height];
    if ($guidance !== null) $fields['guidance'] = (string)$guidance;
    if ($seed !== null) $fields['seed'] = (string)$seed;
    foreach (references() as $index => $reference) {
        $fields['input_image_' . $index] = new CURLFile($reference['tmp'], $reference['mime'], $reference['name']);
    }

    [$status, $raw] = requestRaw(
        'https://api.cloudflare.com/client/v4/accounts/' . $accountId . '/ai/run/' . $model,
        'POST',
        ['Authorization: Bearer ' . $key, 'Accept: application/json'],
        $fields
    );
    $payload = json_decode($raw, true);
    if (!is_array($payload)) fail('Cloudflare вернул неожиданный ответ.', 502, 'provider_response_invalid', ['response' => substr($raw, 0, 600)]);
    if ($status < 200 || $status >= 300 || ($payload['success'] ?? true) === false) cloudflareError($status, $payload);
    $image = $payload['result']['image'] ?? null;
    if (!is_string($image) || $image === '') fail('Cloudflare не вернул изображение.', 502, 'image_missing');
    [$base64, $mime] = normalizeBase64Image($image);
    respond(['imageBase64' => $base64, 'mimeType' => $mime, 'provider' => 'cloudflare', 'model' => $model, 'width' => $width, 'height' => $height]);
}

function verifyPollinations(string $key): never {
    [$status, $payload] = jsonRequest('https://gen.pollinations.ai/account/balance', 'GET', ['Authorization: Bearer ' . $key, 'Accept: application/json']);
    if ($status < 200 || $status >= 300) fail('Pollinations API key отклонен.', $status, $status === 401 || $status === 403 ? 'credential_invalid' : 'provider_error', ['pollinations' => $payload]);
    $balance = $payload['balance'] ?? null;
    respond(['ok' => true, 'provider' => 'pollinations', 'message' => 'Pollinations API key активен.', 'details' => ['balance' => $balance]]);
}

function generatePollinations(string $key): never {
    $model = textField('model', 'klein', 160);
    $prompt = textField('prompt');
    if ($prompt === '') fail('Введите prompt.', 400, 'prompt_missing');
    $width = intField('width', 1024, 256, 2048);
    $height = intField('height', 1024, 256, 2048);
    $seed = isset($_POST['seed']) && $_POST['seed'] !== '' ? intField('seed', 0, -1, 2147483647) : null;

    $payload = [
        'prompt' => $prompt,
        'model' => $model,
        'n' => 1,
        'size' => $width . 'x' . $height,
        'response_format' => 'b64_json',
    ];
    if ($seed !== null) $payload['seed'] = $seed;
    $refs = references();
    if ($refs) $payload['image'] = array_map('referenceDataUri', $refs);

    [$status, $response] = jsonRequest('https://gen.pollinations.ai/v1/images/generations', 'POST', ['Authorization: Bearer ' . $key, 'Accept: application/json'], $payload);
    if ($status < 200 || $status >= 300) {
        $message = (string)($response['error']['message'] ?? $response['error'] ?? 'Pollinations отклонил запрос.');
        $code = ($status === 401 || $status === 403) ? 'credential_invalid' : ($status === 402 ? 'quota_exhausted' : ($status === 429 ? 'rate_limited' : 'provider_error'));
        fail($message, $status, $code, ['pollinations' => $response]);
    }

    $item = is_array($response['data'][0] ?? null) ? $response['data'][0] : [];
    $base64 = is_string($item['b64_json'] ?? null) ? $item['b64_json'] : '';
    if ($base64 !== '') {
        [$normalized, $mime] = normalizeBase64Image($base64);
        respond(['imageBase64' => $normalized, 'mimeType' => $mime, 'provider' => 'pollinations', 'model' => $model, 'width' => $width, 'height' => $height]);
    }
    $url = is_string($item['url'] ?? null) ? $item['url'] : '';
    if ($url === '') fail('Pollinations не вернул изображение.', 502, 'image_missing');
    $binary = imageBinaryFromUrl($url, ['Authorization: Bearer ' . $key]);
    respond(['imageBase64' => base64_encode($binary), 'mimeType' => detectImageMime($binary), 'provider' => 'pollinations', 'model' => $model, 'width' => $width, 'height' => $height]);
}

function verifyAiHorde(string $key): never {
    [$status, $payload] = jsonRequest('https://stablehorde.net/api/v2/find_user', 'GET', ['apikey: ' . $key, 'Accept: application/json']);
    if ($status < 200 || $status >= 300) fail('AI Horde API key отклонен.', $status, $status === 401 || $status === 403 ? 'credential_invalid' : 'provider_error', ['aihorde' => $payload]);
    respond(['ok' => true, 'provider' => 'aihorde', 'message' => 'AI Horde API key активен.', 'details' => ['username' => $payload['username'] ?? null, 'kudos' => $payload['kudos'] ?? null]]);
}

function generateAiHorde(string $key): never {
    $model = textField('model', '', 240);
    $prompt = textField('prompt');
    if ($prompt === '') fail('Введите prompt.', 400, 'prompt_missing');
    $width = intField('width', 768, 256, 1536);
    $height = intField('height', 1024, 256, 1536);
    $seed = isset($_POST['seed']) && $_POST['seed'] !== '' ? intField('seed', 0, 0, 2147483647) : null;
    $guidance = floatField('guidance', 7.0, 1.0, 20.0) ?? 7.0;

    $params = [
        'n' => 1,
        'width' => $width,
        'height' => $height,
        'steps' => 28,
        'cfg_scale' => $guidance,
        'sampler_name' => 'k_euler_a',
    ];
    if ($seed !== null) $params['seed'] = (string)$seed;

    $payload = [
        'prompt' => $prompt,
        'params' => $params,
        'nsfw' => false,
        'censor_nsfw' => true,
        'trusted_workers' => false,
        'slow_workers' => true,
        'r2' => true,
    ];
    if ($model !== '') $payload['models'] = [$model];

    $refs = references();
    if ($refs) {
        $binary = file_get_contents($refs[0]['tmp']);
        if ($binary === false) fail('Не удалось прочитать AI Horde reference image.', 500, 'reference_read_failed');
        $payload['source_image'] = base64_encode($binary);
        $payload['source_processing'] = 'img2img';
        $payload['params']['denoising_strength'] = 0.42;
    }

    [$status, $response] = jsonRequest(
        'https://stablehorde.net/api/v2/generate/async',
        'POST',
        ['apikey: ' . $key, 'Client-Agent: CharacterMaker:0.5.0:https://github.com/Abestreid/CharacterMaker', 'Accept: application/json'],
        $payload
    );
    if ($status < 200 || $status >= 300) {
        $message = (string)($response['message'] ?? $response['error'] ?? 'AI Horde отклонил запрос.');
        fail($message, $status, $status === 401 || $status === 403 ? 'credential_invalid' : ($status === 429 ? 'rate_limited' : 'provider_error'), ['aihorde' => $response]);
    }
    $jobId = (string)($response['id'] ?? '');
    if ($jobId === '') fail('AI Horde не вернул job id.', 502, 'job_id_missing', ['aihorde' => $response]);
    respond(['async' => true, 'jobId' => $jobId, 'provider' => 'aihorde', 'model' => $model, 'width' => $width, 'height' => $height]);
}

function aiHordeStatus(string $key): never {
    $jobId = textField('job_id', '', 80);
    if (!preg_match('/^[a-f0-9-]{20,80}$/i', $jobId)) fail('Некорректный AI Horde job id.', 400, 'job_id_invalid');
    [$status, $payload] = jsonRequest('https://stablehorde.net/api/v2/generate/status/' . rawurlencode($jobId), 'GET', ['apikey: ' . $key, 'Accept: application/json']);
    if ($status < 200 || $status >= 300) fail('Не удалось получить статус AI Horde.', $status, 'provider_error', ['aihorde' => $payload]);
    if (($payload['faulted'] ?? false) === true) fail('AI Horde сообщил об ошибке генерации.', 502, 'generation_faulted', ['aihorde' => $payload]);
    if (($payload['done'] ?? false) !== true) {
        respond(['done' => false, 'provider' => 'aihorde', 'waiting' => $payload['wait_time'] ?? null, 'queuePosition' => $payload['queue_position'] ?? null]);
    }

    $generation = is_array($payload['generations'][0] ?? null) ? $payload['generations'][0] : [];
    $image = is_string($generation['img'] ?? null) ? $generation['img'] : '';
    if ($image === '') fail('AI Horde завершил задачу без изображения.', 502, 'image_missing', ['aihorde' => $payload]);
    if (str_starts_with($image, 'http://') || str_starts_with($image, 'https://')) {
        $binary = imageBinaryFromUrl($image);
        $base64 = base64_encode($binary);
        $mime = detectImageMime($binary);
    } else {
        [$base64, $mime] = normalizeBase64Image($image);
    }
    respond(['done' => true, 'imageBase64' => $base64, 'mimeType' => $mime, 'provider' => 'aihorde', 'model' => (string)($generation['model'] ?? '')]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Разрешен только POST.', 405, 'method_not_allowed');
$action = (string)($_GET['action'] ?? '');
$provider = providerField();
$key = apiKeyField();

if ($action === 'verify') {
    if ($provider === 'cloudflare') verifyCloudflare($key);
    if ($provider === 'pollinations') verifyPollinations($key);
    verifyAiHorde($key);
}

if ($action === 'generate') {
    if ($provider === 'cloudflare') generateCloudflare($key);
    if ($provider === 'pollinations') generatePollinations($key);
    generateAiHorde($key);
}

if ($action === 'status' && $provider === 'aihorde') aiHordeStatus($key);
fail('Неизвестное действие.', 404, 'action_not_found');
