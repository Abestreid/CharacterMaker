<?php
declare(strict_types=1);

require_once __DIR__ . '/ai-secret-store.php';

$provider = trim((string)($_POST['provider'] ?? ''));
$directKey = trim((string)($_POST['api_key'] ?? ''));
$credentialId = trim((string)($_POST['credential_id'] ?? ''));

if ($directKey === '' && $credentialId !== '') {
    if (!in_array($provider, CM_AI_ALLOWED_PROVIDERS, true)) {
        $_POST['api_key'] = '';
    } else {
        $credential = cmAiFindCredential($credentialId, $provider);
        if (is_array($credential)) {
            $_POST['api_key'] = (string)($credential['apiKey'] ?? '');
            $accountId = trim((string)($credential['accountId'] ?? ''));
            if ($accountId !== '') $_POST['account_id'] = $accountId;
        }
    }
}

$action = (string)($_GET['action'] ?? '');

// Pollinations retired the old balance check as a reliable credential probe.
// Verify against the current OpenAI-compatible model endpoint instead.
if ($provider === 'pollinations' && $action === 'verify') {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    $key = trim((string)($_POST['api_key'] ?? ''));
    if ($key === '' || !function_exists('curl_init')) {
        http_response_code(401);
        echo json_encode(['error' => 'Pollinations API key не найден.', 'code' => 'credential_missing'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
    $curl = curl_init('https://gen.pollinations.ai/v1/models');
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $key, 'Accept: application/json'],
        CURLOPT_USERAGENT => 'CharacterMaker-V2/AI-Provider-Layer',
    ]);
    $body = curl_exec($curl);
    $status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    if ($status < 200 || $status >= 300 || !is_string($body)) {
        http_response_code($status >= 400 && $status < 600 ? $status : 502);
        echo json_encode(['error' => 'Pollinations API key отклонен.', 'code' => ($status === 401 || $status === 403) ? 'credential_invalid' : 'provider_error'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
    echo json_encode(['ok' => true, 'provider' => 'pollinations', 'message' => 'Pollinations API key активен.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * AI Horde allows zero-kudos image requests only inside its free request envelope.
 * CharacterMaker canonical frames are commonly 768x1024, so scale them to the
 * closest 64px-aligned dimensions not exceeding 576x576 while preserving aspect
 * ratio as closely as possible. The provider response reports the actual size.
 */
function cmAiHordeZeroKudosDimensions(int $requestedWidth, int $requestedHeight): array {
    $requestedWidth = max(256, $requestedWidth);
    $requestedHeight = max(256, $requestedHeight);
    if ($requestedWidth <= 576 && $requestedHeight <= 576) {
        return [$requestedWidth, $requestedHeight];
    }

    $targetRatio = $requestedWidth / $requestedHeight;
    $candidates = [256, 320, 384, 448, 512, 576];
    $bestWidth = 512;
    $bestHeight = 512;
    $bestRatioError = PHP_FLOAT_MAX;
    $bestArea = 0;

    foreach ($candidates as $width) {
        foreach ($candidates as $height) {
            $ratioError = abs(($width / $height) - $targetRatio);
            $area = $width * $height;
            if ($ratioError < $bestRatioError - 0.000001 || (abs($ratioError - $bestRatioError) < 0.000001 && $area > $bestArea)) {
                $bestRatioError = $ratioError;
                $bestArea = $area;
                $bestWidth = $width;
                $bestHeight = $height;
            }
        }
    }

    return [$bestWidth, $bestHeight];
}

if ($provider === 'aihorde' && $action === 'generate') {
    $requestedWidth = is_numeric($_POST['width'] ?? null) ? (int)$_POST['width'] : 768;
    $requestedHeight = is_numeric($_POST['height'] ?? null) ? (int)$_POST['height'] : 1024;
    [$safeWidth, $safeHeight] = cmAiHordeZeroKudosDimensions($requestedWidth, $requestedHeight);
    $_POST['width'] = (string)$safeWidth;
    $_POST['height'] = (string)$safeHeight;
}

require __DIR__ . '/ai-image.php';
