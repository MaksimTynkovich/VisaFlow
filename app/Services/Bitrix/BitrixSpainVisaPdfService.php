<?php

namespace App\Services\Bitrix;

use App\Support\IcaoDoc9303Transliterator;
use Carbon\Carbon;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Symfony\Component\Process\Process;

class BitrixSpainVisaPdfService
{
    /**
     * Значения enum из Bitrix поля "Паспорт. Гражданство сейчас" (UF_CRM_1476883419).
     *
     * @var array<string, string>
     */
    private const CURRENT_NATIONALITY_ENUM = [
        '292' => 'BELARUS',
        '294' => 'RUSSIA',
        '296' => 'UKRAINE',
        '520' => 'LITHUANIA',
        '526' => 'KAZAKHSTAN',
        '528' => 'UZBEKISTAN',
        '580' => 'GEORGIA',
        '582' => 'AZERBAIJAN',
        '584' => 'ARMENIA',
        '586' => 'USSR',
        '588' => 'CHINA',
        '590' => 'MOLDOVA',
        '592' => 'TAJIKISTAN',
        '594' => 'TURKMENISTAN',
        '596' => 'OTHER',
    ];

    /**
     * Значения enum из Bitrix поля "Паспорт. Страна рождения" (UF_CRM_1476265403).
     *
     * @var array<string, string>
     */
    private const BIRTH_COUNTRY_ENUM = [
        '268' => 'BELARUS',
        '270' => 'RUSSIA',
        '272' => 'UKRAINE',
        '472' => 'LITHUANIA',
        '478' => 'KAZAKHSTAN',
        '480' => 'UZBEKISTAN',
        '548' => 'GEORGIA',
        '550' => 'AZERBAIJAN',
        '552' => 'ARMENIA',
        '554' => 'USSR',
        '556' => 'CHINA',
        '558' => 'MOLDOVA',
        '560' => 'TAJIKISTAN',
        '562' => 'TURKMENISTAN',
        '534' => 'OTHER',
    ];

    public function __construct(
        private readonly BitrixApiService $bitrixApi
    ) {
    }

    /**
     * @return array{output_path: string, filename: string}
     */
    public function generateFromDeal(int $dealId): array
    {
        $templatePath = (string) config('bitrix.spain_visa_template_path', '');
        if ($templatePath === '' || !is_file($templatePath)) {
            throw new RuntimeException("PDF template not found: {$templatePath}");
        }

        $deal = $this->bitrixApi->getDeal($dealId);
        if (!$deal) {
            throw new RuntimeException("Deal {$dealId} was not found in Bitrix.");
        }

        $contactId = $this->resolveContactId($deal, $dealId);
        if ($contactId === null) {
            throw new RuntimeException("Deal {$dealId} has no linked contact.");
        }

        $contact = $this->bitrixApi->getContact($contactId);
        if (!$contact) {
            throw new RuntimeException("Contact {$contactId} was not found in Bitrix.");
        }

        $fields = $this->buildPdfFieldMap($deal, $contact);

        $tmpDir = storage_path('app/tmp');
        if (!is_dir($tmpDir)) {
            mkdir($tmpDir, 0775, true);
        }

        $stamp = now()->format('Ymd_His');
        $filename = "spain_visa_deal_{$dealId}_{$stamp}.pdf";
        $outputPath = $tmpDir . DIRECTORY_SEPARATOR . $filename;
        $fieldsPath = $tmpDir . DIRECTORY_SEPARATOR . "spain_visa_{$dealId}_{$stamp}.json";
        file_put_contents($fieldsPath, json_encode($fields, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        $process = new Process([
            'python3',
            base_path('scripts/fill_pdf_fields.py'),
            $templatePath,
            $outputPath,
            $fieldsPath,
        ]);
        $process->run();

        @unlink($fieldsPath);

        if (!$process->isSuccessful() || !is_file($outputPath)) {
            Log::error('Failed to generate Spain visa PDF', [
                'deal_id' => $dealId,
                'stderr' => $process->getErrorOutput(),
                'stdout' => $process->getOutput(),
            ]);

            throw new RuntimeException('PDF generation failed.');
        }

        return [
            'output_path' => $outputPath,
            'filename' => $filename,
        ];
    }

    /**
     * @param array<string, mixed> $deal
     * @param array<string, mixed> $contact
     * @return array<string, string>
     */
    private function buildPdfFieldMap(array $deal, array $contact): array
    {
        $lastName = $this->toIcao($this->firstNonEmpty($contact, ['LAST_NAME', 'UF_CRM_LAST_NAME_LAT']));
        $firstName = $this->toIcao($this->firstNonEmpty($contact, ['NAME', 'UF_CRM_NAME_LAT']));
        $birthDate = $this->toDate($this->firstNonEmpty($contact, ['BIRTHDATE']));
        $birthPlace = $this->toIcao($this->firstNonEmpty($contact, ['UF_CRM_BIRTH_PLACE', 'ADDRESS_CITY']));
        $birthCountry = $this->resolveBirthCountry($contact);
        $nationality = $this->resolveCurrentNationality($contact);

        $passportNo = $this->toUpper($this->firstNonEmpty($contact, [
            'UF_CRM_PASSPORT_NO',
            'UF_CRM_1470546337',
        ]));
        $nationalIdentityNo = $this->toUpper($this->firstNonEmpty($contact, ['UF_CRM_1470546300']));
        $nationalIdentityField = trim((string) config('bitrix.spain_visa_national_identity_field', 'Text24'));
        $passportIssueDate = $this->toDate($this->firstNonEmpty($contact, [
            'UF_CRM_PASSPORT_ISSUE_DATE',
            'UF_CRM_1470563459',
        ]));
        $passportExpiryDate = $this->toDate($this->firstNonEmpty($contact, [
            'UF_CRM_PASSPORT_EXPIRY_DATE',
            'UF_CRM_1470563486',
        ]));
        $passportIssuedByCountry = $this->resolvePassportIssuedByCountry($contact);

        $phone = $this->extractMultiValue($contact, 'PHONE');
        $email = $this->extractMultiValue($contact, 'EMAIL');
        $homeAddress = $this->toIcao($this->compactAddress([
            $this->firstNonEmpty($contact, ['ADDRESS_COUNTRY']),
            $this->firstNonEmpty($contact, ['ADDRESS_POSTAL_CODE']),
            $this->firstNonEmpty($contact, ['ADDRESS_CITY']),
            $this->firstNonEmpty($contact, ['ADDRESS']),
            $email,
        ]));

        $occupation = $this->toIcao($this->firstNonEmpty($contact, ['POST', 'UF_CRM_OCCUPATION']));
        $employer = $this->toIcao($this->compactAddress([
            $this->firstNonEmpty($contact, ['UF_CRM_EMPLOYER_NAME']),
            $this->firstNonEmpty($contact, ['UF_CRM_EMPLOYER_COUNTRY']),
            $this->firstNonEmpty($contact, ['UF_CRM_EMPLOYER_POSTAL_CODE']),
            $this->firstNonEmpty($contact, ['UF_CRM_EMPLOYER_CITY']),
            $this->firstNonEmpty($contact, ['UF_CRM_EMPLOYER_ADDRESS']),
            $this->firstNonEmpty($contact, ['UF_CRM_EMPLOYER_PHONE']),
        ]));

        $entryDate = $this->toDate($this->firstNonEmpty($deal, ['UF_CRM_VISA_ENTRY_DATE', 'BEGINDATE']));
        $exitDate = $this->toDate($this->firstNonEmpty($deal, ['UF_CRM_VISA_EXIT_DATE', 'CLOSEDATE']));
        $genderRaw = $this->firstNonEmpty($contact, ['UF_CRM_GENDER', 'UF_CRM_SEX', 'UF_CRM_1470563687', 'GENDER', 'SEX']);
        $genderCheckboxes = $this->resolveGenderCheckboxValues($genderRaw);
        $maritalStatusRaw = $this->firstNonEmpty($contact, ['UF_CRM_1470544847', 'UF_CRM_MARITAL_STATUS', 'MARITAL_STATUS']);
        $maritalStatusCheckboxes = $this->resolveMaritalStatusCheckboxValues($maritalStatusRaw);
        $residenceNoCheckboxField = trim((string) config('bitrix.spain_visa_residence_other_country_no_checkbox_field', 'Check Box50'));
        $multipleEntriesCheckboxField = trim((string) config('bitrix.spain_visa_multiple_entries_checkbox_field', 'Check Box74'));
        $fingerprintsNotTakenCheckboxField = trim((string) config('bitrix.spain_visa_fingerprints_not_taken_checkbox_field', 'Check Box77'));
        $residenceOtherCheckboxFields = array_values(array_filter(array_map(
            static fn (mixed $value): string => trim((string) $value),
            (array) config('bitrix.spain_visa_residence_other_country_checkbox_fields', ['Check Box72'])
        )));

        $baseFields = [
            'Text2' => $lastName,
            'Text3' => $lastName,
            'Text4' => $firstName,
            'Text5' => $birthDate,
            'Text6' => $birthPlace,
            'Text7' => $birthCountry,
            'Text8' => $nationality,
            'Text9' => $nationality,
            'Text32' => $passportNo,
            'Text33' => $passportIssueDate,
            'Text34' => $passportExpiryDate,
            'Text35' => $passportIssuedByCountry,
            'Text48' => $homeAddress,
            'Text49' => $phone,
            'Text55' => $occupation,
            'Text56' => $employer,
            'Text69' => 'SPAIN',
            'Text75' => $entryDate,
            'Text76' => $exitDate,
        ];

        if ($residenceNoCheckboxField !== '') {
            // Section "Residente en un pais distinto..." should always be "No".
            $baseFields[$residenceNoCheckboxField] = '/0';
        }
        if ($multipleEntriesCheckboxField !== '') {
            // Section "Numero de entradas solicitadas": force multiple entries.
            $baseFields[$multipleEntriesCheckboxField] = '/0';
        }
        if ($fingerprintsNotTakenCheckboxField !== '') {
            // Section "Huellas dactilares tomadas previamente": select "No".
            $baseFields[$fingerprintsNotTakenCheckboxField] = '/0';
        }
        foreach ($residenceOtherCheckboxFields as $fieldName) {
            if (
                $fieldName !== ''
                && $fieldName !== $residenceNoCheckboxField
                && $fieldName !== $multipleEntriesCheckboxField
                && $fieldName !== $fingerprintsNotTakenCheckboxField
            ) {
                $baseFields[$fieldName] = '/Off';
            }
        }

        if ($nationalIdentityField !== '') {
            $baseFields[$nationalIdentityField] = $nationalIdentityNo;
        }

        return array_merge($baseFields, $genderCheckboxes, $maritalStatusCheckboxes);
    }

    /**
     * @param array<string, mixed> $deal
     */
    private function resolveContactId(array $deal, int $dealId): ?int
    {
        $contactIds = $this->bitrixApi->getDealContactIds($dealId);
        if (!empty($contactIds)) {
            return $contactIds[0];
        }

        $contactId = $deal['CONTACT_ID'] ?? Arr::get($deal, 'CONTACT_IDS.0');
        if ($contactId === null || $contactId === '') {
            return null;
        }

        return (int) $contactId;
    }

    /**
     * @param array<string, mixed> $entity
     * @param string[] $keys
     */
    private function firstNonEmpty(array $entity, array $keys): string
    {
        foreach ($keys as $key) {
            $value = Arr::get($entity, $key);
            if (is_scalar($value) && trim((string) $value) !== '') {
                return trim((string) $value);
            }
        }

        return '';
    }

    /**
     * @param array<string, mixed> $entity
     */
    private function extractMultiValue(array $entity, string $key): string
    {
        $value = $entity[$key] ?? null;

        if (!is_array($value)) {
            return is_scalar($value) ? (string) $value : '';
        }

        $first = $value[0] ?? null;
        if (is_array($first)) {
            $raw = $first['VALUE'] ?? '';
            return is_scalar($raw) ? (string) $raw : '';
        }

        return '';
    }

    private function toIcao(string $value): string
    {
        return IcaoDoc9303Transliterator::transliterate($value);
    }

    private function toDate(string $value): string
    {
        if ($value === '') {
            return '';
        }

        try {
            return Carbon::parse($value)->format('d-m-Y');
        } catch (\Throwable) {
            return $value;
        }
    }

    private function toUpper(string $value): string
    {
        return mb_strtoupper(trim($value));
    }

    /**
     * @param string[] $parts
     */
    private function compactAddress(array $parts): string
    {
        $clean = [];
        foreach ($parts as $part) {
            $part = trim($part);
            if ($part !== '') {
                $clean[] = $part;
            }
        }

        return implode(', ', $clean);
    }

    /**
     * @return array<string, string>
     */
    private function resolveGenderCheckboxValues(string $rawValue): array
    {
        /** @var array{male?: string, female?: string, other?: string} $fieldMap */
        $fieldMap = (array) config('bitrix.spain_visa_gender_checkbox_fields', []);

        $maleField = trim((string) ($fieldMap['male'] ?? ''));
        $femaleField = trim((string) ($fieldMap['female'] ?? ''));
        $otherField = trim((string) ($fieldMap['other'] ?? ''));

        $result = [];
        foreach ([$maleField, $femaleField, $otherField] as $fieldName) {
            if ($fieldName !== '') {
                $result[$fieldName] = '/Off';
            }
        }

        $normalized = $this->normalizeGenderValue($rawValue);
        if ($normalized === null) {
            return $result;
        }

        $selectedField = match ($normalized) {
            'male' => $maleField,
            'female' => $femaleField,
            default => $otherField,
        };

        if ($selectedField !== '') {
            $result[$selectedField] = '/0';
        }

        return $result;
    }

    private function normalizeGenderValue(string $value): ?string
    {
        $value = mb_strtolower(trim($value));
        if ($value === '') {
            return null;
        }

        return match ($value) {
            'm', 'male', 'man', '1', '158', 'male sex', 'м', 'муж', 'мужской', 'мужчина' => 'male',
            'f', 'female', 'woman', '2', '160', 'female sex', 'ж', 'жен', 'женский', 'женщина' => 'female',
            'other', 'x', '3', 'иной', 'другое', 'не указан', 'не указано' => 'other',
            default => null,
        };
    }

    /**
     * @return array<string, string>
     */
    private function resolveMaritalStatusCheckboxValues(string $rawValue): array
    {
        /** @var array{single?: string, married?: string, divorced?: string, widowed?: string} $fieldMap */
        $fieldMap = (array) config('bitrix.spain_visa_marital_status_checkbox_fields', []);

        $singleField = trim((string) ($fieldMap['single'] ?? ''));
        $marriedField = trim((string) ($fieldMap['married'] ?? ''));
        $divorcedField = trim((string) ($fieldMap['divorced'] ?? ''));
        $widowedField = trim((string) ($fieldMap['widowed'] ?? ''));

        $result = [];
        foreach ([$singleField, $marriedField, $divorcedField, $widowedField] as $fieldName) {
            if ($fieldName !== '') {
                $result[$fieldName] = '/Off';
            }
        }

        $normalized = $this->normalizeMaritalStatusValue($rawValue);
        if ($normalized === null) {
            return $result;
        }

        $selectedField = match ($normalized) {
            'single' => $singleField,
            'married' => $marriedField,
            'divorced' => $divorcedField,
            default => $widowedField,
        };

        if ($selectedField !== '') {
            $result[$selectedField] = '/0';
        }

        return $result;
    }

    private function normalizeMaritalStatusValue(string $value): ?string
    {
        $value = mb_strtolower(trim($value));
        if ($value === '') {
            return null;
        }

        return match ($value) {
            '86', 'single', 'single/unmarried', 'single_not_married', 'холост', 'не замужем', 'холост/не замужем' => 'single',
            '88', 'married', 'женат', 'замужем', 'женат/замужем' => 'married',
            '92', 'divorced', 'разведен', 'разведена', 'разведен/-а' => 'divorced',
            '94', 'widow', 'widowed', 'вдовец', 'вдова', 'вдовец/вдова' => 'widowed',
            default => null,
        };
    }

    /**
     * @param array<string, mixed> $contact
     */
    private function resolveCurrentNationality(array $contact): string
    {
        $raw = $this->firstNonEmpty($contact, ['UF_CRM_1476883419', 'UF_CRM_NATIONALITY', 'ADDRESS_COUNTRY']);
        if ($raw === '') {
            return '';
        }

        $mapped = self::CURRENT_NATIONALITY_ENUM[$raw] ?? $raw;

        return $this->toIcao($mapped);
    }

    /**
     * @param array<string, mixed> $contact
     */
    private function resolveBirthCountry(array $contact): string
    {
        $raw = $this->firstNonEmpty($contact, ['UF_CRM_1476265403', 'UF_CRM_BIRTH_COUNTRY', 'ADDRESS_COUNTRY']);
        if ($raw === '') {
            return '';
        }

        $mapped = self::BIRTH_COUNTRY_ENUM[$raw] ?? $raw;

        return $this->toIcao($mapped);
    }

    /**
     * @param array<string, mixed> $contact
     */
    private function resolvePassportIssuedByCountry(array $contact): string
    {
        $raw = $this->firstNonEmpty($contact, [
            'UF_CRM_PASSPORT_ISSUED_BY_COUNTRY',
            'UF_CRM_1476883419',
            'ADDRESS_COUNTRY',
        ]);
        if ($raw === '') {
            return '';
        }

        $mapped = self::CURRENT_NATIONALITY_ENUM[$raw] ?? $raw;

        return $this->toIcao($mapped);
    }

}
