### Backend (Laravel)
1. Перейдите в папку с Laravel:
   ```bash
   cd /Users/admin/Desktop/visavisa
   php artisan serve
   # API теперь доступен на http://localhost:8000
   ```

### Frontend (React)
2. Отдельно запускайте дев-сервер реакта:
   ```bash
   cd /Users/admin/Desktop/visavisa/react-src
   npm install # (один раз, если не стояли зависимости)
   npm start
   # Приложение доступно на http://localhost:3000
   ```

### Взаимодействие
- **Всё работает из коробки!** Используйте утилиту `apiUrl()` из `src/utils/api.js` для всех API запросов.
- В разработке: запросы на `/api/...` автоматически проксируются на Laravel через настройку `proxy` в `package.json`.
- В продакшене: используются относительные пути (React и Laravel на одном домене).
- Если нужно явно указать адрес API в dev, создайте файл `react-src/.env`:
  ```
  REACT_APP_API_URL=http://localhost:8000
  ```

## Подготовка к production
- Production build React создаёте командой
  ```bash
  npm run build
  ```
- Собранный билд можно выложить **на отдельный сервер/домен** или скопировать в любую нужную папку для отдачи — но в процессе разработки этого не требуется.

---

## Интеграция Bitrix24

Интеграция позволяет создавать форму VisaVisa из сделки Bitrix24: по нажатию кнопки забираются данные контакта и предзаполняются форма.

### Настройка

1. Создайте входящий вебхук в Bitrix24: **Настройки → Разработчикам → Входящий вебхук**
2. Добавьте в `.env`:
   ```
   BITRIX_WEBHOOK_URL=https://your-portal.bitrix24.by/rest/480/your-webhook-code/
   BITRIX_DEFAULT_FORM_TEMPLATE_ID=2   # Шаблон по умолчанию
   BITRIX_RULE_TEMPLATE_PROPERTY1262_1598=1   # Если property1262=1598 — этот шаблон
   BITRIX_FORM_BASE_URL=http://localhost:3000
   BITRIX_CREATED_BY_USER_ID=1
   ```
   Правила выбора шаблона: если у товара сделки property1262=1598 — шаблон 1, иначе — BITRIX_DEFAULT_FORM_TEMPLATE_ID.
3. Убедитесь, что в шаблоне формы поля имеют `name`/`id`, соответствующие маппингу (см. `config/bitrix.php`), или задайте `bitrix_field` в schema поля.

### API

**Создать форму из сделки**

```
POST /api/bitrix/create-form-from-deal
GET  /api/bitrix/create-form-from-deal?deal_id=123
```

Тело POST (JSON):
```json
{
  "deal_id": 123,
  "form_template_id": 1
}
```

Ответ:
```json
{
  "data": {
    "travel_case_id": 1,
    "token": "...",
    "form_url": "http://localhost:3000/form/...",
    "bitrix_deal_id": "123"
  }
}
```

Продукт из сделки сохраняется в заявке (`bitrix_product_snapshot`) и доступен в API заявок (GET `/api/admin/travel-cases/{id}`) и в админке.

**Скачать PDF-анкету Испании из сделки**

```
POST /api/bitrix/create-spain-visa-pdf
GET  /api/bitrix/create-spain-visa-pdf?deal_id=123
```

Тело POST (JSON):
```json
{
  "deal_id": 123
}
```

Ответ: бинарный PDF-файл, поля остаются редактируемыми.

Для чекбоксов пола в PDF можно переопределить имена полей через `.env`:

```env
BITRIX_SPAIN_VISA_GENDER_MALE_FIELD="Check Box13"
BITRIX_SPAIN_VISA_GENDER_FEMALE_FIELD="Check Box14"
BITRIX_SPAIN_VISA_GENDER_OTHER_FIELD="Check Box15"
BITRIX_SPAIN_VISA_MARITAL_SINGLE_FIELD="Check Box16"
BITRIX_SPAIN_VISA_MARITAL_MARRIED_FIELD="Check Box17"
BITRIX_SPAIN_VISA_MARITAL_DIVORCED_FIELD="Check Box20"
BITRIX_SPAIN_VISA_MARITAL_WIDOWED_FIELD="Check Box21"
BITRIX_SPAIN_VISA_NATIONAL_IDENTITY_FIELD="Text24"
```

### Маппинг полей Bitrix → форма

| Поле формы (name/id) | Bitrix Contact |
|----------------------|----------------|
| first_name, name     | NAME           |
| last_name, surname   | LAST_NAME      |
| middle_name          | SECOND_NAME    |
| phone                | PHONE (первый) |
| email                | EMAIL (первый) |
| address_city         | ADDRESS_CITY   |
| birthdate            | BIRTHDATE      |

Можно переопределить в schema: `"bitrix_field": "NAME"`.

### Кнопка в Bitrix24

В карточке сделки добавьте кнопку/обработчик, который вызывает:

```
https://your-visavisa-domain.com/api/bitrix/create-form-from-deal?deal_id={ID}
```

или открывает форму по `form_url` из ответа.

---

## Итоговая структура
```
pos-project/
├── app/               # Laravel backend
├── public/
├── react-src/         # React frontend (src, public, build)
│   ├── src/
│   ├── public/
│   └── build/
├── routes/
│   ├── api.php        # API only
│   └── web.php        # Только для Laravel страниц, не для React!
|
├── ...
```
