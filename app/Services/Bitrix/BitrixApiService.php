<?php

namespace App\Services\Bitrix;

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
}
