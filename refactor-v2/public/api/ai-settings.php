<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

const ALLOWED_PROVIDERS = ['cloudflare', 'aihorde', 'pollinations'];
const ALLOWED_MODES = ['fast', 'quality', 'experimental'];
const ALLOWED_MODELS = [
    'cloudflare-flux-2-klein-4b',
    'cloudflare-flux-2-klein-9b',
    'cloudflare-flux-2-dev',
    'pollinations-klein',
    'pollinations-nanobanana-2',
    'pollinations-gptimage',
    'aihorde-auto',
];

function respond(array $payload, int $status = 200): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $message, int $status = 400, string $code = 'request_failed'): never {
    respond(['error' => $message, 'code' => $code], $status);
}

function defaultSettings(): array {
    return [
        'version' => 1,
        'credentials' => [
            [
                'id' => 'cloudflare-b42a8778',
                'provider' => 'cloudflare',
                'label' => 'Cloudflare · b42a8778',
                'enabled' => true,
                'apiKey' => '',
                'accountId' => 'b42a877844f90e5af0c85866814e1ab4',
            ],
            [
                'id' => 'cloudflare-79f534a4',
                'provider' => 'cloudflare',
                'label' => 'Cloudflare · 79f534a4',
                'enabled' => true,
                'apiKey' => '',
                'accountId' => '79f534a406abae1726f967391a50659c',
            ],
            [
                'id' => 'cloudflare-23060c37',
                'provider' => 'cloudflare',
                'label' => 'Cloudflare · 23060c37',
                'enabled' => true,
                'apiKey' => '',
                'accountId' => '23060c376812d11f27918f6c433c990c',
            ],
            [
                'id' => 'aihorde-main',
                'provider' => 'aihorde',
                'label' => 'AI Horde · основной',
                'enabled' => true,
                'apiKey' => '',
                'accountId' => '',
            ],
            [
                'id' => 'pollinations-main',
                'provider' => 'pollinations',
                'label' => 'Pollinations AI · основной',
                'enabled' => true,
                'apiKey' => '',
                'accountId' => '',
            ],
        ],
        'modeModels' => [
            'fast' => 'cloudflare-flux-2-klein-4b',
            'quality' => 'cloudflare-flux-2-klein-9b',
            'experimental' => 'cloudflare-flux-2-dev',
        ],
        'enabledModels' => array_fill_keys(ALLOWED_MODELS, true),
        'modelOverrides' => [],
    ];
}

function privateDirectory(): string {
    $root = dirname(__DIR__);
    $dir = $root . DIRECTORY_SEPARATOR . '.private';
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
        fail('Не удалось создать серверное хранилище AI settings.', 500, 'storage_create_failed');
    }
    $denyFile = $dir . DIRECTORY_SEPARATOR . '.htaccess';
    if (!is_file($denyFile)) {
        @file_put_contents($denyFile, "Options -Indexes\n<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n", LOCK_EX);
    }
    return $dir;
}

function settingsPath(): string {
    return privateDirectory() . DIRECTORY_SEPARATOR . 'ai-settings.php';
}

function loadSettings(): array {
    $path = settingsPath();
    if (!is_file($path)) return defaultSettings();
    $loaded = require $path;
    return is_array($loaded) ? normalizeSettings($loaded, defaultSettings()) : defaultSettings();
}

function writeSettings(array $settings): void {
    $path = settingsPath();
    $tmp = $path . '.tmp-' . bin2hex(random_bytes(4));
    $php = "<?php\ndeclare(strict_types=1);\nreturn " . var_export($settings, true) . ";\n";
    if (file_put_contents($tmp, $php, LOCK_EX) === false) {
        fail('Не удалось записать AI settings на сервер.', 500, 'storage_write_failed');
    }
    @chmod($tmp, 0600);
    if (!rename($tmp, $path)) {
        @unlink($tmp);
        fail('Не удалось активировать AI settings на сервере.', 500, 'storage_commit_failed');
    }
    @chmod($path, 0600);
}

function publicSettings(array $settings): array {
    $settings['credentials'] = array_map(static function (array $credential): array {
        $hasApiKey = trim((string)($credential['apiKey'] ?? '')) !== '';
        return [
            'id' => (string)($credential['id'] ?? ''),
            'provider' => (string)($credential['provider'] ?? ''),
            'label' => (string)($credential['label'] ?? ''),
            'enabled' => ($credential['enabled'] ?? true) !== false,
            'apiKey' => '',
            'hasApiKey' => $hasApiKey,
            'accountId' => (string)($credential['accountId'] ?? ''),
        ];
    }, is_array($settings['credentials'] ?? null) ? $settings['credentials'] : []);
    return $settings;
}

function sameOriginWrite(): void {
    $origin = trim((string)($_SERVER['HTTP_ORIGIN'] ?? ''));
    $host = trim((string)($_SERVER['HTTP_HOST'] ?? ''));
    if ($origin === '' || $host === '') return;
    $originHost = (string)(parse_url($origin, PHP_URL_HOST) ?? '');
    if ($originHost !== '' && strcasecmp($originHost, preg_replace('/:\d+$/', '', $host) ?? $host) !== 0) {
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

function normalizeSettings(array $input, array $existing): array {
    $defaults = defaultSettings();
    $existingById = [];
    foreach (($existing['credentials'] ?? []) as $credential) {
        if (is_array($credential) && isset($credential['id'])) $existingById[(string)$credential['id']] = $credential;
    }

    $credentials = [];
    $rows = is_array($input['credentials'] ?? null) ? $input['credentials'] : $defaults['credentials'];
    foreach ($rows as $index => $row) {
        if (!is_array($row)) continue;
        $provider = trim((string)($row['provider'] ?? ''));
        if (!in_array($provider, ALLOWED_PROVIDERS, true)) continue;
        $id = trim((string)($row['id'] ?? ''));
        if ($id === '') $id = $provider . '-' . substr(hash('sha256', $provider . '-' . $index . '-' . microtime(true)), 0, 12);
        $previous = is_array($existingById[$id] ?? null) ? $existingById[$id] : [];
        $incomingKey = trim((string)($row['apiKey'] ?? ''));
        $apiKey = $incomingKey !== '' ? $incomingKey : trim((string)($previous['apiKey'] ?? ''));
        if (strlen($apiKey) > 512) fail('API key слишком длинный.', 400, 'credential_invalid');
        $accountId = trim((string)($row['accountId'] ?? $previous['accountId'] ?? ''));
        if ($provider === 'cloudflare' && $accountId !== '' && !preg_match('/^[a-f0-9]{32}$/i', $accountId)) {
            fail('Некорректный Cloudflare Account ID.', 400, 'account_id_invalid');
        }
        $credentials[] = [
            'id' => $id,
            'provider' => $provider,
            'label' => trim((string)($row['label'] ?? '')) ?: ucfirst($provider),
            'enabled' => ($row['enabled'] ?? true) !== false,
            'apiKey' => $apiKey,
            'accountId' => $accountId,
        ];
    }

    $modeModels = $defaults['modeModels'];
    foreach (ALLOWED_MODES as $mode) {
        $candidate = trim((string)($input['modeModels'][$mode] ?? ''));
        if (in_array($candidate, ALLOWED_MODELS, true)) $modeModels[$mode] = $candidate;
    }

    $enabledModels = $defaults['enabledModels'];
    foreach (ALLOWED_MODELS as $model) {
        if (isset($input['enabledModels'][$model]) && is_bool($input['enabledModels'][$model])) {
            $enabledModels[$model] = $input['enabledModels'][$model];
        }
    }

    $modelOverrides = [];
    foreach (ALLOWED_MODELS as $model) {
        $value = trim((string)($input['modelOverrides'][$model] ?? ''));
        if ($value !== '') $modelOverrides[$model] = $value;
    }

    return [
        'version' => 1,
        'credentials' => $credentials,
        'modeModels' => $modeModels,
        'enabledModels' => $enabledModels,
        'modelOverrides' => $modelOverrides,
    ];
}

$action = (string)($_GET['action'] ?? 'get');

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'get') {
    respond(['settings' => publicSettings(loadSettings())]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'save') {
    sameOriginWrite();
    $existing = loadSettings();
    $settings = normalizeSettings(requestJson(), $existing);
    writeSettings($settings);
    respond(['ok' => true, 'settings' => publicSettings($settings)]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'reset') {
    sameOriginWrite();
    $settings = defaultSettings();
    writeSettings($settings);
    respond(['ok' => true, 'settings' => publicSettings($settings)]);
}

fail('Неизвестное действие.', 404, 'action_not_found');
