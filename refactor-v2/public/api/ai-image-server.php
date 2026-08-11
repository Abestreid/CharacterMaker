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

require __DIR__ . '/ai-image.php';
