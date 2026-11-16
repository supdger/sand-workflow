<?php
declare(strict_types=1);

namespace plugin\sandworkflow\app\service;

/**
 * 草稿信封的编解码：草稿与已发布的 definition_json 分开放，
 * 半成品流程不经过发布校验，所以这里只认信封形状，不认内容合法性。
 */
final class DefinitionDraftCodec
{
    /**
     * @return array{meta: array, definition_json: array}
     */
    public static function pack(array $meta, array $definition): array
    {
        return [
            'meta' => [
                'name' => (string) ($meta['name'] ?? ''),
                'status' => (int) ($meta['status'] ?? 1),
                'group_id' => isset($meta['group_id']) ? (int) $meta['group_id'] : null,
                'description' => (string) ($meta['description'] ?? ''),
                'icon' => (string) ($meta['icon'] ?? ''),
                'is_cancelable' => (int) ($meta['is_cancelable'] ?? 1),
            ],
            'definition_json' => $definition,
        ];
    }

    /**
     * 兼容 JSON 字符串和已解码数组两种读法；任何缺键或非数组都兜底为空数组。
     * @return array{meta: array, definition: array}
     */
    public static function unpack(mixed $draftJson): array
    {
        if (is_string($draftJson)) {
            $decoded = json_decode($draftJson, true);
            $draftJson = is_array($decoded) ? $decoded : [];
        }
        if (!is_array($draftJson)) {
            $draftJson = [];
        }
        return [
            'meta' => is_array($draftJson['meta'] ?? null) ? $draftJson['meta'] : [],
            'definition' => is_array($draftJson['definition_json'] ?? null)
                ? $draftJson['definition_json']
                : [],
        ];
    }

    public static function hasDraft(array $row): bool
    {
        $draft = $row['draft_json'] ?? null;
        if (is_string($draft)) {
            $decoded = json_decode($draft, true);
            $draft = is_array($decoded) ? $decoded : [];
        }
        return is_array($draft) && $draft !== [];
    }
}
