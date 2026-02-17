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
    | Таймаут запросов к Bitrix API (секунды)
    |--------------------------------------------------------------------------
    */
    'timeout' => (int) env('BITRIX_API_TIMEOUT', 10),

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

];
