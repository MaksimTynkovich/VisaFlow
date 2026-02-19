<?php

namespace App\Services\Bitrix;

use App\Models\FormTemplate;
use App\Models\TravelCase;
use App\Models\User;
use App\Services\Admin\TravelCaseService;
use App\Services\Public\FormDraftService;
use Illuminate\Support\Facades\DB;

class BitrixFormFromDealService
{
    public function __construct(
        private readonly BitrixApiService $bitrixApi,
        private readonly TravelCaseService $travelCaseService,
        private readonly FormDraftService $formDraftService
    ) {
    }

    /**
     * Результат диагностики (для отладки при APP_DEBUG).
     */
    private ?string $lastError = null;

    /**
     * Создать форму из сделки Bitrix24.
     *
     * @param int $dealId ID сделки в Bitrix
     * @param int|null $formTemplateId ID шаблона формы (visa_type берётся из шаблона)
     * @return array{travel_case: TravelCase, form_url: string, token: string}|null
     */
    public function createFormFromDeal(int $dealId, ?int $formTemplateId = null): ?array
    {
        $this->lastError = null;

        $webhookUrl = config('bitrix.webhook_url');
        if (empty($webhookUrl)) {
            $this->lastError = 'BITRIX_WEBHOOK_URL не задан в .env';

            return null;
        }

        $deal = $this->bitrixApi->getDeal($dealId);
        if (!$deal) {
            $this->lastError = "Не удалось загрузить сделку {$dealId} из Bitrix. См. storage/logs/laravel.log";

            return null;
        }

        $products = $this->bitrixApi->getDealProducts($dealId);
        $firstProduct = $products[0] ?? null;

        if ($formTemplateId === null) {
            $formTemplateId = $this->resolveFormTemplateByProductRules($products);
        }
        $formTemplateId = $formTemplateId ?? config('bitrix.default_form_template_id');

        if (!$formTemplateId) {
            $this->lastError = 'Не задан form_template_id. Настройте property_template_rules или BITRIX_DEFAULT_FORM_TEMPLATE_ID.';

            return null;
        }

        $formTemplate = FormTemplate::find($formTemplateId);
        if (!$formTemplate) {
            $this->lastError = "FormTemplate с id={$formTemplateId} не найден";

            return null;
        }

        $visaTypeId = $formTemplate->visa_type_id;

        $contactId = $this->resolveContactId($deal, $dealId);
        if (!$contactId) {
            $this->lastError = "У сделки {$dealId} нет связанного контакта. Привяжите контакт к сделке в Bitrix24.";

            return null;
        }

        $contact = $this->bitrixApi->getContact($contactId);
        if (!$contact) {
            $this->lastError = "Не удалось загрузить контакт {$contactId} из Bitrix. См. storage/logs/laravel.log";

            return null;
        }

        $prefilledData = $this->mapContactToFormSchema($contact, $formTemplate->schema);
        $createdBy = $this->resolveCreatedByUserId();
        $productSnapshot = $firstProduct ? [
            'id' => $firstProduct['id'],
            'product_id' => $firstProduct['product_id'],
            'name' => $firstProduct['name'],
            'quantity' => $firstProduct['quantity'],
            'price' => $firstProduct['price'],
            'properties' => $firstProduct['properties'] ?? [],
        ] : null;

        $result = DB::transaction(function () use (
            $dealId,
            $visaTypeId,
            $formTemplateId,
            $prefilledData,
            $productSnapshot,
            $createdBy
        ) {
            $travelCase = $this->travelCaseService->create([
                'visa_type_id' => $visaTypeId,
                'form_template_id' => $formTemplateId,
                'user_id' => null,
                'created_by' => $createdBy,
                'status' => 'new',
                'bitrix_deal_id' => (string) $dealId,
                'bitrix_product_snapshot' => $productSnapshot,
            ]);

            if (!empty($prefilledData)) {
                $this->formDraftService->saveDraft($travelCase->public_token, $prefilledData);
            }

            $baseUrl = config('bitrix.form_base_url') ?: config('app.url');
            $formUrl = rtrim($baseUrl, '/') . '/form/' . $travelCase->public_token;

            return [
                'travel_case' => $travelCase,
                'form_url' => $formUrl,
                'token' => $travelCase->public_token,
            ];
        });

        if ($result !== null) {
            $comment = "Форма создана\n\nСсылка на форму: " . $result['form_url'];
            $this->bitrixApi->addDealTimelineComment($dealId, $comment);
        }

        return $result;
    }

    /**
     * Определить form_template_id по правилам: если у товара property=X и value=Y — шаблон из правила.
     */
    private function resolveFormTemplateByProductRules(array $products): ?int
    {
        $rules = config('bitrix.property_template_rules', []);

        foreach ($products as $product) {
            $properties = $product['properties'] ?? [];
            foreach ($rules as $rule) {
                $prop = $rule['property'] ?? null;
                $expectedValue = (string) ($rule['value'] ?? '');
                $templateId = isset($rule['form_template_id']) ? (int) $rule['form_template_id'] : null;

                if (!$prop || $templateId <= 0) {
                    continue;
                }

                $actualValue = $properties[$prop] ?? null;
                if ($actualValue !== null && (string) $actualValue === $expectedValue) {
                    return $templateId;
                }
            }
        }

        return null;
    }

    /**
     * Определить ID контакта из сделки.
     */
    private function resolveContactId(array $deal, int $dealId): ?int
    {
        $contactIds = $this->bitrixApi->getDealContactIds($dealId);

        if (!empty($contactIds)) {
            return $contactIds[0];
        }

        $contactId = $deal['CONTACT_ID'] ?? $deal['CONTACT_IDS'][0] ?? null;
        return $contactId !== null && $contactId !== '' ? (int) $contactId : null;
    }

    /**
     * Маппинг данных контакта Bitrix в поля формы по schema.
     *
     * @param array<string, mixed> $contact
     * @param array<string, mixed>|null $schema
     * @return array<string, mixed>
     */
    private function mapContactToFormSchema(array $contact, ?array $schema): array
    {
        $result = [];
        $fields = $schema['fields'] ?? [];

        if (!is_array($fields)) {
            return $result;
        }

        $mapping = config('bitrix.field_mapping', []);

        foreach ($fields as $field) {
            $fieldId = $field['name'] ?? $field['id'] ?? null;
            if (!$fieldId || ($field['type'] ?? '') === 'file') {
                continue;
            }

            $bitrixField = $field['bitrix_field'] ?? $mapping[$fieldId] ?? $this->guessBitrixField($fieldId);

            if (!$bitrixField) {
                continue;
            }

            $value = $this->extractContactValue($contact, $bitrixField);
            if ($value !== null && $value !== '') {
                $result[$fieldId] = $value;
            }
        }

        return $result;
    }

    /**
     * Извлечь значение из контакта Bitrix по имени поля.
     */
    private function extractContactValue(array $contact, string $bitrixField): mixed
    {
        $value = $contact[$bitrixField] ?? null;

        if ($value === null) {
            return null;
        }

        if ($bitrixField === 'PHONE' && is_array($value)) {
            $first = $value[0] ?? null;
            return is_array($first) ? ($first['VALUE'] ?? null) : null;
        }

        if ($bitrixField === 'EMAIL' && is_array($value)) {
            $first = $value[0] ?? null;
            return is_array($first) ? ($first['VALUE'] ?? null) : null;
        }

        return is_scalar($value) ? (string) $value : null;
    }

    /**
     * Угадать Bitrix-поле по имени поля формы (snake_case -> UPPER).
     */
    private function guessBitrixField(string $fieldId): ?string
    {
        $normalized = strtolower(str_replace(['-', ' ', '_'], '_', $fieldId));

        $map = [
            'first_name' => 'NAME',
            'last_name' => 'LAST_NAME',
            'middle_name' => 'SECOND_NAME',
            'second_name' => 'SECOND_NAME',
            'phone' => 'PHONE',
            'email' => 'EMAIL',
            'address' => 'ADDRESS',
            'address_city' => 'ADDRESS_CITY',
            'address_postal_code' => 'ADDRESS_POSTAL_CODE',
            'address_region' => 'ADDRESS_REGION',
            'address_country' => 'ADDRESS_COUNTRY',
            'birthdate' => 'BIRTHDATE',
            'birth_date' => 'BIRTHDATE',
        ];

        return $map[$normalized] ?? null;
    }

    private function resolveCreatedByUserId(): int
    {
        $configId = config('bitrix.created_by_user_id');
        if ($configId) {
            $user = User::find($configId);
            if ($user) {
                return (int) $user->id;
            }
        }

        $admin = User::where('role', 'admin')->first();
        return $admin ? (int) $admin->id : 1;
    }

    public function getLastError(): ?string
    {
        return $this->lastError;
    }
}
