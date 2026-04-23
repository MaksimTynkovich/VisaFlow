<?php

namespace App\Support;

class IcaoDoc9303Transliterator
{
    /**
     * Транслитерация кириллицы по правилам ICAO Doc 9303.
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

        $map = [
            'А' => 'A', 'Б' => 'B', 'В' => 'V', 'Г' => 'G', 'Д' => 'D', 'Е' => 'E', 'Ё' => 'E',
            'Ж' => 'ZH', 'З' => 'Z', 'И' => 'I', 'Й' => 'I', 'К' => 'K', 'Л' => 'L', 'М' => 'M',
            'Н' => 'N', 'О' => 'O', 'П' => 'P', 'Р' => 'R', 'С' => 'S', 'Т' => 'T', 'У' => 'U',
            'Ф' => 'F', 'Х' => 'KH', 'Ц' => 'TS', 'Ч' => 'CH', 'Ш' => 'SH', 'Щ' => 'SHCH',
            'Ъ' => 'IE', 'Ы' => 'Y', 'Ь' => '', 'Э' => 'E', 'Ю' => 'IU', 'Я' => 'IA',
        ];

        $upper = mb_strtoupper($value);

        return strtr($upper, $map);
    }
}
