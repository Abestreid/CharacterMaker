<?php
declare(strict_types=1);

const ADMIN_TOKEN_SHA256 = '34ee4689078c6585f010835e0fecc0958f74adc7c4aed65cbae2cc49a3a77c35';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const PUBLIC_MEDIA_BASE = 'https://charmaker.free.nf/media';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function fail(string $message, int $status = 400): never {
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function adminToken(): string {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        fail('Требуется служебный ключ редактирования.', 401);
    }
    $token = trim($matches[1]);
    if ($token === '' || !hash_equals(ADMIN_TOKEN_SHA256, hash('sha256', $token))) {
        fail('Неверный служебный ключ редактирования.', 403);
    }
    return $token;
}

function documentRoot(): string {
    $root = rtrim((string)($_SERVER['DOCUMENT_ROOT'] ?? ''), '/\\');
    if ($root === '' || !is_dir($root)) fail('Не удалось определить корень сайта.', 500);
    return $root;
}

function mediaRoot(): string {
    $root = documentRoot() . DIRECTORY_SEPARATOR . 'media';
    if (!is_dir($root) && !mkdir($root, 0755, true) && !is_dir($root)) {
        fail('Не удалось создать каталог media.', 500);
    }
    return $root;
}

function cleanSegment(string $value, string $name): string {
    $value = trim($value);
    if ($value === '' || !preg_match('/^[a-zA-Z0-9_-]+$/', $value)) {
        fail("Некорректное значение {$name}.");
    }
    return $value;
}

function upload(): never {
    $scope = cleanSegment((string)($_POST['scope'] ?? ''), 'scope');
    if (!in_array($scope, ['characters', 'outfits', 'scenes', 'generations'], true)) {
        fail('Недопустимая категория файла.');
    }
    $entityId = cleanSegment((string)($_POST['entity_id'] ?? ''), 'entity_id');
    $role = cleanSegment((string)($_POST['role'] ?? 'image'), 'role');

    if (!isset($_FILES['file']) || !is_array($_FILES['file'])) fail('Файл не передан.');
    $file = $_FILES['file'];
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) fail('Ошибка загрузки файла.');
    $size = (int)($file['size'] ?? 0);
    if ($size <= 0 || $size > MAX_IMAGE_BYTES) fail('Размер изображения должен быть от 1 байта до 8 MB.');

    $tmp = (string)($file['tmp_name'] ?? '');
    if ($tmp === '' || !is_uploaded_file($tmp)) fail('Некорректный временный файл.');

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string)$finfo->file($tmp);
    $extensions = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];
    if (!isset($extensions[$mime])) fail('Разрешены только JPEG, PNG и WebP изображения.');

    $relativeDir = $scope . '/' . $entityId;
    $absoluteDir = mediaRoot() . DIRECTORY_SEPARATOR . $scope . DIRECTORY_SEPARATOR . $entityId;
    if (!is_dir($absoluteDir) && !mkdir($absoluteDir, 0755, true) && !is_dir($absoluteDir)) {
        fail('Не удалось создать каталог пресета.', 500);
    }

    $fileName = $role . '-' . bin2hex(random_bytes(12)) . '.' . $extensions[$mime];
    $absolutePath = $absoluteDir . DIRECTORY_SEPARATOR . $fileName;
    if (!move_uploaded_file($tmp, $absolutePath)) fail('Не удалось сохранить изображение.', 500);
    @chmod($absolutePath, 0644);

    $objectPath = '/media/' . $relativeDir . '/' . $fileName;
    $publicUrl = PUBLIC_MEDIA_BASE . '/' . $relativeDir . '/' . $fileName;

    echo json_encode([
        'objectPath' => $objectPath,
        'publicUrl' => $publicUrl,
        'fileName' => $fileName,
        'mimeType' => $mime,
        'sizeBytes' => filesize($absolutePath) ?: $size,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function deleteMedia(): never {
    $raw = file_get_contents('php://input');
    $payload = json_decode($raw ?: '{}', true);
    if (!is_array($payload)) fail('Некорректный JSON.');
    $objectPath = (string)($payload['objectPath'] ?? '');
    if (!preg_match('#^/media/(characters|outfits|scenes|generations)/[a-zA-Z0-9_-]+/[a-zA-Z0-9_.-]+$#', $objectPath)) {
        fail('Удаление разрешено только внутри каталога /media.');
    }

    $target = documentRoot() . str_replace('/', DIRECTORY_SEPARATOR, $objectPath);
    $realRoot = realpath(mediaRoot());
    $realTarget = realpath($target);
    if ($realRoot === false) fail('Каталог media недоступен.', 500);
    if ($realTarget === false) {
        echo json_encode(['deleted' => true], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!str_starts_with($realTarget, $realRoot . DIRECTORY_SEPARATOR)) fail('Недопустимый путь удаления.', 403);
    if (!is_file($realTarget)) fail('Указанный путь не является файлом.');
    if (!unlink($realTarget)) fail('Не удалось удалить изображение.', 500);

    echo json_encode(['deleted' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

adminToken();
$action = $_GET['action'] ?? '';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Разрешен только POST.', 405);
if ($action === 'upload') upload();
if ($action === 'delete') deleteMedia();
fail('Неизвестное действие.', 404);
