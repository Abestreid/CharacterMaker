<?php
declare(strict_types=1);

require_once __DIR__ . '/ai-secret-store.php';

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

function fail(string $message, int $status = 400, string $code = 'request_failed'): never {
    respond(['error' => $message, 'code' => $code], $status);
}

function sameOriginWrite(): void {
    $origin = trim((string)($_SERVER['HTTP_ORIGIN'] ?? ''));
    $host = trim((string)($_SERVER['HTTP_HOST'] ?? ''));
    if ($origin === '' || $host === '') return;
    $originHost = (string)(parse_url($origin, PHP_URL_HOST) ?? '');
    $requestHost = preg_replace('/:\d+$/', '', $host) ?? $host;
    if ($originHost !== '' && strcasecmp($originHost, $requestHost) !== 0) {
        fail('Cross-origin изменение AI settings запрещено.', 403, 'origin_forbidden');
    }
}

function requestJson(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') fail('Пустой JSON payload.');
    $payload = json_decode($raw, true);
    if (!is_array($payload)) fail('Некорректный JSON payload.');
    return $payload;
}

$action = (string)($_GET['action'] ?? 'get');

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'get') {
    respond(['settings' => cmAiPublicSettings(cmAiLoadSettings())]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'save') {
    sameOriginWrite();
    $existing = cmAiLoadSettings();
    $settings = cmAiNormalizeSettings(requestJson(), $existing);
    if (!cmAiWriteSettings($settings)) {
        fail('Не удалось сохранить AI settings вне каталога DEV. Проверьте права InfinityFree.', 500, 'storage_write_failed');
    }
    respond(['ok' => true, 'settings' => cmAiPublicSettings($settings)]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'reset') {
    sameOriginWrite();
    $settings = cmAiDefaultSettings();
    if (!cmAiWriteSettings($settings)) {
        fail('Не удалось сбросить AI settings.', 500, 'storage_write_failed');
    }
    respond(['ok' => true, 'settings' => cmAiPublicSettings($settings)]);
}

fail('Неизвестное действие.', 404, 'action_not_found');
