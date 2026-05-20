<?php

namespace App\Support;

class IcaoDoc9303Transliterator
{
    /**
     * Многосимвольные замены (порядок: от длинных к коротким).
     *
     * @var array<string, string>
     */
    private const MULTI_CHAR_MAP = [
        'Щ' => 'SHCH',
        'Ш' => 'SH',
        'Ч' => 'CH',
        'Ж' => 'ZH',
        'Х' => 'KH',
        'Ц' => 'TS',
        'ТЯ' => 'TYA',
        'Ю' => 'IU',
        'Я' => 'YA',
        'Ё' => 'E',
        'Ъ' => 'IE',
    ];

    /**
     * @var array<string, string>
     */
    private const SINGLE_CHAR_MAP = [
        'А' => 'A',
        'Б' => 'B',
        'В' => 'V',
        'Г' => 'G',
        'Д' => 'D',
        'Е' => 'E',
        'З' => 'Z',
        'И' => 'I',
        'Й' => 'I',
        'К' => 'K',
        'Л' => 'L',
        'М' => 'M',
        'Н' => 'N',
        'О' => 'O',
        'П' => 'P',
        'Р' => 'R',
        'С' => 'S',
        'Т' => 'T',
        'У' => 'U',
        'Ф' => 'F',
        'Ы' => 'Y',
        'Ь' => '',
        'Э' => 'E',
    ];

    /**
     * Транслитерация кириллицы по правилам ICAO Doc 9303 (с уточнениями для паспортных адресов РФ/РБ).
     */
    public static function transliterate(?string $value): string
    {
        if ($value === null) {
            return '';
        }

        $value = trim($value);
        if ($value === '') {
            return '';
        }

        $upper = mb_strtoupper($value);

        foreach (self::replacementMap() as $from => $to) {
            $upper = str_replace($from, $to, $upper);
        }

        return $upper;
    }

    /**
     * @return array<string, string>
     */
    private static function replacementMap(): array
    {
        static $sorted = null;
        if ($sorted !== null) {
            return $sorted;
        }

        $map = array_merge(self::MULTI_CHAR_MAP, self::SINGLE_CHAR_MAP);
        uksort($map, static fn (string $a, string $b): int => mb_strlen($b) <=> mb_strlen($a));
        $sorted = $map;

        return $sorted;
    }
}
