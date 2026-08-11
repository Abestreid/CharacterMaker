<?php
declare(strict_types=1);

const CM_AI_ALLOWED_PROVIDERS = ['cloudflare', 'aihorde', 'pollinations'];
const CM_AI_ALLOWED_MODES = ['fast', 'quality', 'experimental'];
const CM_AI_ALLOWED_MODELS = [
    'cloudflare-flux-2-klein-4b',
    'cloudflare-flux-2-klein-9b',
    'cloudflare-flux-2-dev',
    'pollinations-klein',
    'pollinations-nanobanana-2',
    'pollinations-gptimage',
    'aihorde-auto',
];

function cmAiDefaultSettings(): array {
    return [
        'version' => 1,
        'credentials' => [
            ['id' => 'cloudflare-b42a8778', 'provider' => 'cloudflare', 'label' => 'Cloudflare · b42a8778', 'enabled' => true, 'apiKey' => '', 'accountId' => 'b42a877844f90e5af0c85866814e1ab4'],
            ['id' => 'cloudflare-79f534a4', 'provider' => 'cloudflare', 'label' => 'Cloudflare · 79f534a4', 'enabled' => true, 'apiKey' => '', 'accountId' => '79f534a406abae1726f967391a50659c'],
            ['id' => 'cloudflare-23060c37', 'provider' => 'cloudflare', 'label' => 'Cloudflare · 23060c37', 'enabled' => true, 'apiKey' => '', 'accountId' => '23060c376812d11f27918f6c433c990c'],
            ['id' => 'aihorde-main', 'provider' => 'aihorde', 'label' => 'AI Horde · основной', 'enabled' => true, 'apiKey' => '', 'accountId' => ''],
            ['id' => 'pollinations-main', 'provider' => 'pollinations', 'label' => 'Pollinations AI · основной', 'enabled' => true, 'apiKey' => '', 'accountId' => ''],
        ],
        'modeModels' => [
            'fast' => 'cloudflare-flux-2-klein-4b',
            'quality' => 'cloudflare-flux-2-klein-9b',
            'experimental' => 'cloudflare-flux-2-dev',
        ],
        'enabledModels' => array_fill_keys(CM_AI_ALLOWED_MODELS, true),
        'modelOverrides' => [],
    ];
}

function cmAiSettingsPath(): string {
    $deployRoot = dirname(__DIR__); // /htdocs/dev in DEV, /htdocs in PROD
    if (basename($deployRoot) === 'dev') {
        return dirname($deployRoot) . DIRECTORY_SEPARATOR . '.charmaker-ai-settings-dev.php';
    }
    return $deployRoot . DIRECTORY_SEPARATOR . '.charmaker-ai-settings-prod.php';
}

function cmAiLoadSettings(): array {
    $path = cmAiSettingsPath();
    if (!is_file($path)) return cmAiDefaultSettings();
    $loaded = require $path;
    return is_array($loaded) ? cmAiNormalizeSettings($loaded, cmAiDefaultSettings()) : cmAiDefaultSettings();
}

function cmAiWriteSettings(array $settings): bool {
    $path = cmAiSettingsPath();
    $dir = dirname($path);
    if (!is_dir($dir) || !is_writable($dir)) return false;
    $tmp = $path . '.tmp-' . bin2hex(random_bytes(4));
    $php = "<?php\ndeclare(strict_types=1);\nreturn " . var_export($settings, true) . ";\n";
    if (file_put_contents($tmp, $php, LOCK_EX) === false) return false;
    @chmod($tmp, 0600);
    if (!rename($tmp, $path)) {
        @unlink($tmp);
        return false;
    }
    @chmod($path, 0600);
    return true;
}

function cmAiPublicSettings(array $settings): array {
    $settings['credentials'] = array_map(static function (array $credential): array {
        return [
            'id' => (string)($credential['id'] ?? ''),
            'provider' => (string)($credential['provider'] ?? ''),
            'label' => (string)($credential['label'] ?? ''),
            'enabled' => ($credential['enabled'] ?? true) !== false,
            'apiKey' => '',
            'hasApiKey' => trim((string)($credential['apiKey'] ?? '')) !== '',
            'accountId' => (string)($credential['accountId'] ?? ''),
        ];
    }, is_array($settings['credentials'] ?? null) ? $settings['credentials'] : []);
    return $settings;
}

function cmAiFindCredential(string $id, string $provider): ?array {
    foreach (cmAiLoadSettings()['credentials'] ?? [] as $credential) {
        if (!is_array($credential)) continue;
        if ((string)($credential['id'] ?? '') !== $id) continue;
        if ((string)($credential['provider'] ?? '') !== $provider) continue;
        if (($credential['enabled'] ?? true) === false) return null;
        if (trim((string)($credential['apiKey'] ?? '')) === '') return null;
        return $credential;
    }
    return null;
}

function cmAiNormalizeSettings(array $input, array $existing): array {
    $defaults = cmAiDefaultSettings();
    $existingById = [];
    foreach (($existing['credentials'] ?? []) as $credential) {
        if (is_array($credential) && isset($credential['id'])) $existingById[(string)$credential['id']] = $credential;
    }

    $credentials = [];
    $rows = is_array($input['credentials'] ?? null) ? $input['credentials'] : $defaults['credentials'];
    foreach ($rows as $index => $row) {
        if (!is_array($row)) continue;
        $provider = trim((string)($row['provider'] ?? ''));
        if (!in_array($provider, CM_AI_ALLOWED_PROVIDERS, true)) continue;
        $id = trim((string)($row['id'] ?? ''));
        if ($id === '') $id = $provider . '-' . substr(hash('sha256', $provider . '-' . $index . '-' . microtime(true)), 0, 12);
        $previous = is_array($existingById[$id] ?? null) ? $existingById[$id] : [];
        $incomingKey = trim((string)($row['apiKey'] ?? ''));
        $apiKey = $incomingKey !== '' ? $incomingKey : trim((string)($previous['apiKey'] ?? ''));
        if (strlen($apiKey) > 512) $apiKey = '';
        $accountId = trim((string)($row['accountId'] ?? $previous['accountId'] ?? ''));
        if ($provider === 'cloudflare' && $accountId !== '' && !preg_match('/^[a-f0-9]{32}$/i', $accountId)) $accountId = '';
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
    foreach (CM_AI_ALLOWED_MODES as $mode) {
        $candidate = trim((string)($input['modeModels'][$mode] ?? ''));
        if (in_array($candidate, CM_AI_ALLOWED_MODELS, true)) $modeModels[$mode] = $candidate;
    }

    $enabledModels = $defaults['enabledModels'];
    foreach (CM_AI_ALLOWED_MODELS as $model) {
        if (isset($input['enabledModels'][$model]) && is_bool($input['enabledModels'][$model])) {
            $enabledModels[$model] = $input['enabledModels'][$model];
        }
    }

    $modelOverrides = [];
    foreach (CM_AI_ALLOWED_MODELS as $model) {
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
