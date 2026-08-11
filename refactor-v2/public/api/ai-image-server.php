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

$action = (string)($_GET['action'] ?? '');
if ($provider === 'aihorde' && $action === 'generate') {
    $requestedWidth = is_numeric($_POST['width'] ?? null) ? (int)$_POST['width'] : 768;
    $requestedHeight = is_numeric($_POST['height'] ?? null) ? (int)$_POST['height'] : 1024;
    [$safeWidth, $safeHeight] = cmAiHordeZeroKudosDimensions($requestedWidth, $requestedHeight);
    $_POST['width'] = (string)$safeWidth;
    $_POST['height'] = (string)$safeHeight;
}

require __DIR__ . '/ai-image.php';
