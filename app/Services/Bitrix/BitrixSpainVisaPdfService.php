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
        $birthCountry = $this->toIcao($this->firstNonEmpty($contact, ['UF_CRM_BIRTH_COUNTRY', 'ADDRESS_COUNTRY']));
        $nationality = $this->toIcao($this->firstNonEmpty($contact, ['UF_CRM_NATIONALITY', 'ADDRESS_COUNTRY']));

        $passportNo = $this->toUpper($this->firstNonEmpty($contact, ['UF_CRM_PASSPORT_NO']));
        $passportIssueDate = $this->toDate($this->firstNonEmpty($contact, ['UF_CRM_PASSPORT_ISSUE_DATE']));
        $passportExpiryDate = $this->toDate($this->firstNonEmpty($contact, ['UF_CRM_PASSPORT_EXPIRY_DATE']));
        $passportIssuedByCountry = $this->toIcao($this->firstNonEmpty($contact, ['UF_CRM_PASSPORT_ISSUED_BY_COUNTRY', 'ADDRESS_COUNTRY']));

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

        return [
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

}
