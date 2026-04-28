<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Bitrix24 Webhook URL
    |--------------------------------------------------------------------------
    |
    | Базовый URL вебхука Bitrix24 для REST API.
    | Пример: https://your-portal.bitrix24.by/rest/480/xxxxxxxxxx/
    | Создаётся в Настройки -> Разработчикам -> Входящий вебхук
    |
    */
    'webhook_url' => env('BITRIX_WEBHOOK_URL', ''),

    /*
    | Суффикс метода (.json) — некоторые порталы Bitrix требуют crm.deal.get.json
    */
    'method_suffix' => env('BITRIX_METHOD_SUFFIX', ''), // '' или '.json'

    /*
    |--------------------------------------------------------------------------
    | ID пользователя для created_by (Bitrix-созданные заявки)
    |--------------------------------------------------------------------------
    |
    | ID пользователя VisaVisa, от имени которого создаются заявки из Bitrix.
    | Должен быть admin. Если не задан — берётся первый admin.
    |
    */
    'created_by_user_id' => env('BITRIX_CREATED_BY_USER_ID'),

    /*
    |--------------------------------------------------------------------------
    | Дефолтный form_template_id
    |--------------------------------------------------------------------------
    |
    | visa_type берётся из шаблона формы. Используется, если не сработало правило.
    |
    */
    'default_form_template_id' => env('BITRIX_DEFAULT_FORM_TEMPLATE_ID'),

    /*
    |--------------------------------------------------------------------------
    | Правила выбора шаблона по свойству товара
    |--------------------------------------------------------------------------
    |
    | При создании формы из сделки: если у товара property=X и value=Y,
    | использовать указанный form_template_id. Первое совпадение побеждает.
    | Пример: property1262=1598 -> шаблон 1, иначе default_form_template_id.
    |
    */
    'property_template_rules' => [
        ['property' => 'property1262', 'value' => '1598', 'form_template_id' => (int) env('BITRIX_RULE_TEMPLATE_PROPERTY1262_1598', 1)],
    ],

    /*
    |--------------------------------------------------------------------------
    | Маппинг полей Bitrix24 Contact -> поля формы VisaVisa
    |--------------------------------------------------------------------------
    |
    | Ключ — ID поля в нашей форме (field.name / field.id в schema).
    | Значение — путь к полю в ответе crm.contact.get.
    |
    | Специальные значения:
    | - "NAME" — имя
    | - "LAST_NAME" — фамилия
    | - "SECOND_NAME" — отчество
    | - "PHONE" — первый телефон из массива (VALUE)
    | - "EMAIL" — первый email из массива (VALUE)
    | - "ADDRESS" / "ADDRESS_CITY" и т.д.
    |
    | Приоритет: schema.bitrix_field > глобальный маппинг > автоподбор по имени поля
    |
    */
    'field_mapping' => [
        'first_name' => 'NAME',
        'last_name' => 'LAST_NAME',
        'middle_name' => 'SECOND_NAME',
        'second_name' => 'SECOND_NAME',
        'name' => 'NAME',
        'surname' => 'LAST_NAME',
        'phone' => 'PHONE',
        'telephone' => 'PHONE',
        'email' => 'EMAIL',
        'address' => 'ADDRESS',
        'address_city' => 'ADDRESS_CITY',
        'address_postal_code' => 'ADDRESS_POSTAL_CODE',
        'address_region' => 'ADDRESS_REGION',
        'address_country' => 'ADDRESS_COUNTRY',
        'birthdate' => 'BIRTHDATE',
        'birth_date' => 'BIRTHDATE',
        'post' => 'POST',
        'comments' => 'COMMENTS',
    ],

    /*
    |--------------------------------------------------------------------------
    | Маппинг полей Bitrix24 Deal -> поля формы VisaVisa
    |--------------------------------------------------------------------------
    |
    | Ключ — ID поля в нашей форме (field.name / field.id в schema).
    | Значение — код поля в ответе crm.deal.get / crm.deal.update.
    |
    | Приоритет: schema.bitrix_deal_field > глобальный маппинг > автоподбор по имени поля
    |
    */
    'deal_field_mapping' => [
        'deal_title' => 'TITLE',
        'title' => 'TITLE',
        'opportunity' => 'OPPORTUNITY',
        'amount' => 'OPPORTUNITY',
        'deal_comments' => 'COMMENTS',
    ],

    /*
    |--------------------------------------------------------------------------
    | Формат значения для UF_ с множественным выбором при отправке в Bitrix
    |--------------------------------------------------------------------------
    |
    | 'array'       — массив ["1","2"] (или [1,2] при multiple_list_value_as_integer=true).
    |                 Рекомендуется для мультиселекта: оба значения должны записаться.
    | 'string'      — строка "1,2". Если в Bitrix устанавливается только первое значение — переключите на array.
    |
    */
    'multiple_list_value_as_string' => env('BITRIX_MULTIPLE_LIST_AS_STRING', false),

    /*
    | При true значения мультиселекта в Bitrix отправляются как массив целых чисел [1, 2].
    | Используйте, если массив строк ["1","2"] не записывает второе значение.
    */
    'multiple_list_value_as_integer' => env('BITRIX_MULTIPLE_LIST_AS_INTEGER', false),

    /*
    |--------------------------------------------------------------------------
    | Таймаут запросов к Bitrix API (секунды)
    |--------------------------------------------------------------------------
    */
    'timeout' => (int) env('BITRIX_API_TIMEOUT', 10),

    /*
    |--------------------------------------------------------------------------
    | Кэш списка полей контакта (секунды)
    |--------------------------------------------------------------------------
    | Список полей для маппинга запрашивается из Bitrix и кэшируется.
    | После добавления/удаления полей в Bitrix обновится по истечении TTL или после сброса кэша (php artisan cache:clear).
    */
    'contact_fields_cache_ttl' => (int) env('BITRIX_CONTACT_FIELDS_CACHE_TTL', 3600),

    /*
    |--------------------------------------------------------------------------
    | Базовый URL для ссылки на форму (React frontend)
    |--------------------------------------------------------------------------
    |
    | Если форма отдаётся с того же домена — оставить null (используется APP_URL).
    | Если React на отдельном домене — указать, например: https://app.example.com
    |
    */
    'form_base_url' => env('BITRIX_FORM_BASE_URL'),

    /*
    |--------------------------------------------------------------------------
    | Шаблон PDF-анкеты Испании
    |--------------------------------------------------------------------------
    |
    | Абсолютный путь к PDF с AcroForm-полями.
    | Файл используется при вызове /api/bitrix/create-spain-visa-pdf.
    |
    */
    'spain_visa_template_path' => env('BITRIX_SPAIN_VISA_TEMPLATE_PATH', '/spain-visa-template.pdf'),

    /*
    |--------------------------------------------------------------------------
    | Python бинарник для заполнения PDF
    |--------------------------------------------------------------------------
    |
    | По умолчанию используется системный python3.
    | Для venv укажите полный путь, например: /opt/visavisa/.venv/bin/python
    |
    */
    'python_bin' => env('BITRIX_PYTHON_BIN', 'python3'),

    /*
    |--------------------------------------------------------------------------
    | Список стран для поля «Страна организации» (iblock_element)
    |--------------------------------------------------------------------------
    |
    | UF_CRM_69036B3BEEE67 хранит ID элемента; EN_NAME берётся через lists.element.get.
    |
    */
    'employer_country_list_iblock_id' => (int) env('BITRIX_EMPLOYER_COUNTRY_LIST_IBLOCK_ID', 292),
    'employer_country_list_iblock_type_id' => env('BITRIX_EMPLOYER_COUNTRY_LIST_IBLOCK_TYPE_ID', 'lists'),

    /*
    |--------------------------------------------------------------------------
    | Поле PDF для пункта 11 (национальный документ, если применимо)
    |--------------------------------------------------------------------------
    |
    | Имя поля (/T) в PDF. По умолчанию Text24 для текущего шаблона.
    |
    */
    'spain_visa_national_identity_field' => env('BITRIX_SPAIN_VISA_NATIONAL_IDENTITY_FIELD', 'Text24'),

    /*
    |--------------------------------------------------------------------------
    | Checkbox "No" для пункта о проживании в другой стране
    |--------------------------------------------------------------------------
    |
    | Секция "Residente en un pais distinto del pais de nacionalidad actual".
    | Значение должно совпадать с именем поля /T в PDF.
    |
    */
    'spain_visa_residence_other_country_no_checkbox_field' => env('BITRIX_SPAIN_VISA_RESIDENCE_OTHER_COUNTRY_NO_FIELD', 'Check Box50'),

    /*
    |--------------------------------------------------------------------------
    | Checkbox "Многократная" в секции "Количество въездов"
    |--------------------------------------------------------------------------
    |
    | Значение должно совпадать с именем поля /T в PDF.
    |
    */
    'spain_visa_multiple_entries_checkbox_field' => env('BITRIX_SPAIN_VISA_MULTIPLE_ENTRIES_FIELD', 'Check Box74'),

    /*
    |--------------------------------------------------------------------------
    | Checkbox "Отпечатки пальцев не ставились ранее"
    |--------------------------------------------------------------------------
    |
    | Значение должно совпадать с именем поля /T в PDF.
    |
    */
    'spain_visa_fingerprints_not_taken_checkbox_field' => env('BITRIX_SPAIN_VISA_FINGERPRINTS_NOT_TAKEN_FIELD', 'Check Box77'),

    /*
    |--------------------------------------------------------------------------
    | Имена checkbox-полей пола в PDF-анкете Испании
    |--------------------------------------------------------------------------
    |
    | Значения должны совпадать с /T в PDF-полях.
    | По умолчанию используются поля из текущего шаблона.
    |
    */
    'spain_visa_gender_checkbox_fields' => [
        'male' => env('BITRIX_SPAIN_VISA_GENDER_MALE_FIELD', 'Check Box13'),
        'female' => env('BITRIX_SPAIN_VISA_GENDER_FEMALE_FIELD', 'Check Box14'),
        'other' => env('BITRIX_SPAIN_VISA_GENDER_OTHER_FIELD', 'Check Box15'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Имена checkbox-полей семейного положения в PDF-анкете Испании
    |--------------------------------------------------------------------------
    |
    | Значения должны совпадать с /T в PDF-полях.
    | При необходимости подстройте под конкретный шаблон через .env.
    |
    */
    'spain_visa_marital_status_checkbox_fields' => [
        'single' => env('BITRIX_SPAIN_VISA_MARITAL_SINGLE_FIELD', 'Check Box16'),
        'married' => env('BITRIX_SPAIN_VISA_MARITAL_MARRIED_FIELD', 'Check Box17'),
        'divorced' => env('BITRIX_SPAIN_VISA_MARITAL_DIVORCED_FIELD', 'Check Box20'),
        'widowed' => env('BITRIX_SPAIN_VISA_MARITAL_WIDOWED_FIELD', 'Check Box21'),
    ],

];
