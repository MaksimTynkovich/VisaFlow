<?php

namespace App\Services\Bitrix;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BitrixApiService
{
    public function __construct(
        private readonly string $webhookUrl,
        private readonly int $timeout = 10,
        private readonly string $methodSuffix = ''
    ) {
    }

    /**
     * Вызов метода Bitrix24 REST API.
     *
     * @param string $method Например: crm.deal.get
     * @param array<string, mixed> $params
     * @return array<string, mixed>|null
     */
    public function call(string $method, array $params = []): ?array
    {
        $suffix = $this->methodSuffix ?: '';
        $url = rtrim($this->webhookUrl, '/') . '/' . $method . $suffix;

        try {
            $response = Http::timeout($this->timeout)
                ->asJson()
                ->post($url, $params);

            if (!$response->successful()) {
                Log::warning('Bitrix API error', [
                    'method' => $method,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return null;
            }

            $data = $response->json();

            if (isset($data['error']) && !empty($data['error'])) {
                Log::warning('Bitrix API returned error', [
                    'method' => $method,
                    'error' => $data['error'] ?? $data,
                ]);
                return null;
            }

            return $data['result'] ?? null;
        } catch (\Throwable $e) {
            Log::error('Bitrix API exception', [
                'method' => $method,
                'message' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Получить сделку по ID.
     *
     * @return array<string, mixed>|null
     */
    public function getDeal(int $dealId): ?array
    {
        $result = $this->call('crm.deal.get', ['id' => $dealId]);
        return is_array($result) ? $result : null;
    }

    /**
     * Получить контакт по ID.
     *
     * @return array<string, mixed>|null
     */
    public function getContact(int $contactId): ?array
    {
        $result = $this->call('crm.contact.get', ['id' => $contactId]);
        return is_array($result) ? $result : null;
    }

    /**
     * Получить ID контактов, связанных со сделкой.
     *
     * @return int[]
     */
    public function getDealContactIds(int $dealId): array
    {
        $result = $this->call('crm.deal.contact.items.get', ['id' => $dealId]);

        if (!is_array($result)) {
            return [];
        }

        $ids = [];
        foreach ($result as $item) {
            $id = $item['CONTACT_ID'] ?? $item['ID'] ?? null;
            if ($id !== null) {
                $ids[] = (int) $id;
            }
        }

        return array_values(array_unique($ids));
    }

    /**
     * Получить товары сделки с их свойствами.
     *
     * @return array<int, array{id: int, product_id: int, name: string, quantity: float, price: float, price_account: string, measure_name: string, properties: array<string, mixed>}>
     */
    public function getDealProducts(int $dealId): array
    {
        $result = $this->call('crm.deal.productrows.get', ['id' => $dealId]);

        if (!is_array($result)) {
            return [];
        }

        $products = [];
        foreach ($result as $row) {
            $productId = (int) ($row['PRODUCT_ID'] ?? 0);
            $properties = $productId > 0 ? $this->getProductProperties($productId) : [];

            $products[] = [
                'id' => (int) ($row['ID'] ?? 0),
                'product_id' => $productId,
                'name' => (string) ($row['PRODUCT_NAME'] ?? $row['ORIGINAL_PRODUCT_NAME'] ?? ''),
                'quantity' => (float) ($row['QUANTITY'] ?? 0),
                'price' => (float) ($row['PRICE'] ?? 0),
                'price_account' => (string) ($row['PRICE_ACCOUNT'] ?? ''),
                'measure_name' => (string) ($row['MEASURE_NAME'] ?? ''),
                'properties' => $properties,
            ];
        }

        return $products;
    }

    /**
     * Получить свойства товара из каталога (catalog.product.get).
     * Свойства возвращаются как property_ID в ответе.
     *
     * @return array<string, mixed> название или код свойства => значение
     */
    public function getProductProperties(int $productId): array
    {
        $result = $this->call('catalog.product.get', ['id' => $productId]);

        if (!is_array($result)) {
            return [];
        }

        $product = $result['product'] ?? $result;
        if (!is_array($product)) {
            return [];
        }

        $properties = [];
        foreach ($product as $key => $value) {
            if (str_starts_with($key, 'property')) {
                $propValue = $this->extractPropertyValue($value);
                if ($propValue !== null && $propValue !== '') {
                    $properties[$key] = $propValue;
                }
            }
        }

        return $properties;
    }

    /**
     * Извлечь значение из поля свойства (может быть объект или массив).
     */
    private function extractPropertyValue(mixed $value): mixed
    {
        if (is_scalar($value)) {
            return $value;
        }
        if (is_array($value)) {
            if (isset($value['value'])) {
                return $value['value'];
            }
            $values = [];
            foreach ($value as $item) {
                if (is_array($item) && isset($item['value'])) {
                    $values[] = $item['value'];
                } elseif (is_scalar($item)) {
                    $values[] = $item;
                }
            }
            return $values ? implode(', ', $values) : null;
        }
        return null;
    }

    /**
     * Добавить комментарий в таймлайн сделки.
     *
     * @param int $dealId ID сделки в Bitrix
     * @param string $comment Текст комментария
     * @return int|null ID добавленного комментария или null при ошибке
     */
    public function addDealTimelineComment(int $dealId, string $comment): ?int
    {
        $result = $this->call('crm.timeline.comment.add', [
            'fields' => [
                'ENTITY_ID' => $dealId,
                'ENTITY_TYPE' => 'deal',
                'COMMENT' => $comment,
            ],
        ]);

        return is_numeric($result) ? (int) $result : null;
    }

    /**
     * Обновить контакт в Bitrix24.
     *
     * @param int $contactId ID контакта в Bitrix
     * @param array<string, mixed> $fields Поля для обновления (NAME, LAST_NAME, PHONE, EMAIL и т.д.)
     * @return bool Успешность обновления
     */
    public function updateContact(int $contactId, array $fields): bool
    {
        $result = $this->call('crm.contact.update', [
            'id' => $contactId,
            'fields' => $fields,
        ]);

        return $result === true;
    }

    /**
     * Список полей контакта Bitrix24 для маппинга (код + название).
     * Кэшируется на 1 час. При добавлении/удалении полей в Bitrix — обновится после истечения кэша или сброса кэша.
     *
     * @param bool $refresh При true — сбросить кэш и запросить свежий список из Bitrix
     * @return array<int, array{code: string, title: string}>
     */
    public function getContactFields(bool $refresh = false): array
    {
        if (empty($this->webhookUrl)) {
            return [];
        }

        $cacheKey = 'bitrix.contact_fields';
        $ttl = (int) config('bitrix.contact_fields_cache_ttl', 3600);

        if ($refresh) {
            Cache::forget($cacheKey);
        }

        return Cache::remember($cacheKey, $ttl, function () {
            $list = [];

            $standard = $this->call('crm.contact.fields');
            if (is_array($standard)) {
                foreach ($standard as $code => $meta) {
                    if (!is_string($code) || str_starts_with($code, '=')) {
                        continue;
                    }
                    $titleRaw = is_array($meta) ? ($meta['title'] ?? $meta['listLabel'] ?? $meta['listColumnLabel'] ?? null) : null;
                    $list[] = ['code' => $code, 'title' => $this->extractUserFieldTitle($titleRaw, $code)];
                }
            }

            $userFields = $this->call('crm.contact.userfield.list');
            if (is_array($userFields)) {
                foreach ($userFields as $key => $uf) {
                    $code = null;
                    $titleRaw = null;
                    if (is_array($uf)) {
                        $code = $uf['FIELD_NAME'] ?? $uf['fieldName'] ?? $uf['FIELD_ID'] ?? (is_string($key) && str_starts_with((string) $key, 'UF_') ? $key : null);
                        $titleRaw = $uf['LIST_COLUMN_LABEL'] ?? $uf['EDIT_FORM_LABEL'] ?? $uf['LIST_FILTER_LABEL']
                            ?? $uf['listColumnLabel'] ?? $uf['editFormLabel'] ?? $uf['listFilterLabel']
                            ?? $uf['TITLE'] ?? $uf['title'] ?? $uf['label'] ?? $uf['LABEL'] ?? null;
                    }
                    if ($code === null || $code === '') {
                        if (is_string($key) && str_starts_with($key, 'UF_')) {
                            $code = $key;
                        } else {
                            continue;
                        }
                    }
                    $title = $this->extractUserFieldTitle($titleRaw, (string) $code);
                    $list[] = ['code' => (string) $code, 'title' => $title];
                }
            }

            usort($list, fn ($a, $b) => strcasecmp($a['title'], $b['title']));
            return array_values($list);
        });
    }

    /**
     * Варианты выбора для поля контакта Bitrix (для полей типа список/enumeration).
     * Используется в редакторе шаблона при выборе типа «Выбор» и привязке к полю Bitrix.
     *
     * @return array<int, array{value: string, label: string}>
     */
    public function getContactFieldOptions(string $fieldCode): array
    {
        if (empty($this->webhookUrl) || $fieldCode === '') {
            return [];
        }

        $cacheKey = 'bitrix.contact_field_options.' . $fieldCode;
        $ttl = (int) config('bitrix.contact_fields_cache_ttl', 3600);

        return Cache::remember($cacheKey, $ttl, function () use ($fieldCode) {
            $options = $this->fetchStandardFieldItems($fieldCode);
            if ($options !== []) {
                return $options;
            }
            return $this->fetchUserFieldListValues($fieldCode);
        });
    }

    /**
     * Варианты из стандартного поля контакта (crm.contact.fields), если у поля есть items.
     *
     * @return array<int, array{value: string, label: string}>
     */
    private function fetchStandardFieldItems(string $fieldCode): array
    {
        $standard = $this->call('crm.contact.fields');
        if (!is_array($standard) || !isset($standard[$fieldCode]) || !is_array($standard[$fieldCode])) {
            return [];
        }
        $meta = $standard[$fieldCode];
        $items = $meta['items'] ?? null;
        if (!is_array($items)) {
            return [];
        }
        return $this->normalizeItemsToOptions($items);
    }

    /**
     * Варианты из пользовательского поля типа список (enumeration).
     *
     * @return array<int, array{value: string, label: string}>
     */
    private function fetchUserFieldListValues(string $fieldCode): array
    {
        $userFields = $this->call('crm.contact.userfield.list');
        if (!is_array($userFields)) {
            return [];
        }
        $userField = null;
        foreach ($userFields as $uf) {
            if (!is_array($uf)) {
                continue;
            }
            $code = $uf['FIELD_NAME'] ?? $uf['fieldName'] ?? $uf['FIELD_ID'] ?? null;
            if ($code === $fieldCode) {
                $userField = $uf;
                break;
            }
        }
        if ($userField === null) {
            return [];
        }
        $type = $userField['USER_TYPE_ID'] ?? $userField['userTypeId'] ?? '';
        if ($type !== 'enumeration' && $type !== 'list') {
            return [];
        }
        $list = $userField['LIST'] ?? $userField['list'] ?? null;
        if (is_array($list)) {
            return $this->normalizeItemsToOptions($list);
        }
        $id = $userField['ID'] ?? $userField['id'] ?? null;
        if ($id !== null) {
            $enumList = $this->call('crm.userfield.enumeration.list', [
                'filter' => ['USER_FIELD_ID' => $id],
            ]);
            if (is_array($enumList)) {
                return $this->normalizeEnumListToOptions($enumList);
            }
        }
        return [];
    }

    /**
     * @param array<int, array<string, mixed>> $items Элементы вида [['ID' => x, 'VALUE' => y] или ['value' => x, 'label' => y]]
     * @return array<int, array{value: string, label: string}>
     */
    private function normalizeItemsToOptions(array $items): array
    {
        $options = [];
        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }
            $value = $item['ID'] ?? $item['value'] ?? $item['VALUE'] ?? null;
            $label = $item['VALUE'] ?? $item['label'] ?? $item['title'] ?? null;
            if ($value === null && $label !== null) {
                $value = $label;
            }
            if ($value !== null && $value !== '') {
                $options[] = [
                    'value' => (string) $value,
                    'label' => $this->extractUserFieldTitle($label, (string) $value),
                ];
            }
        }
        return $options;
    }

    /**
     * @param array<int, array<string, mixed>> $enumList Ответ crm.userfield.enumeration.list
     * @return array<int, array{value: string, label: string}>
     */
    private function normalizeEnumListToOptions(array $enumList): array
    {
        $options = [];
        foreach ($enumList as $item) {
            if (!is_array($item)) {
                continue;
            }
            $value = $item['ID'] ?? $item['value'] ?? $item['VALUE'] ?? null;
            $label = $item['VALUE'] ?? $item['label'] ?? $item['title'] ?? null;
            if ($value === null && $label !== null) {
                $value = $label;
            }
            if ($value !== null && $value !== '') {
                $options[] = [
                    'value' => (string) $value,
                    'label' => $this->extractUserFieldTitle($label, (string) $value),
                ];
            }
        }
        return $options;
    }

    /**
     * Извлечь человекочитаемое название из поля пользовательского поля Bitrix.
     * Может быть строкой или массивом по языкам (например ['ru' => 'Имя', 'en' => 'Name']).
     */
    private function extractUserFieldTitle(mixed $titleRaw, string $code): string
    {
        if (is_string($titleRaw) && $titleRaw !== '') {
            return $titleRaw;
        }
        if (is_array($titleRaw)) {
            $v = $titleRaw['ru'] ?? $titleRaw['en'] ?? reset($titleRaw);
            if (is_string($v) && $v !== '') {
                return $v;
            }
        }
        return $code;
    }
}
