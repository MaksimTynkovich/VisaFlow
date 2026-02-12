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
