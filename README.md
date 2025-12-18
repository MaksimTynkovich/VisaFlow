# Разделение проекта на Frontend (React) и Backend (Laravel)

## Разработка и запуск

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
---
- Нет больше рендера билда реакта через Laravel!
- Разработка — это два отдельных процесса и два разных порта. 
- В production frontend и backend могут жить отдельно или быть совмещены nginx/caddy (reverse proxy) — это настраивается под хостинг.
