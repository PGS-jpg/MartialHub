# Deploy Checklist - selestialhub

## 1. Pre-deploy validation

1. Install dependencies:
   - `npm install`
   - `pip install -r backend/requirements.txt`
2. Frontend checks:
   - `npm run lint`
   - `npm run build`
3. Backend health check (after restart):
   - `GET /api/health`

## 2. Environment variables

Copy values from `.env.example` and configure on hosting providers:

- `NEXT_PUBLIC_API_URL`
- `BACKEND_HOST`
- `BACKEND_PORT`
- `BACKEND_DEBUG`
- `FRONTEND_BASE_URL`
- `ALLOWED_ORIGINS`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `BACKEND_BASE_URL`

## 3. Backend runtime

1. Ensure backend runs with updated code (restart process after deploy).
2. Confirm CORS is restricted to production domains via `ALLOWED_ORIGINS`.
3. Verify rate-limited routes return `429` when abused:
   - `POST /api/login`
   - `POST /api/register`
   - `POST /api/academies`
   - `DELETE /api/academies/:id`
   - `POST /api/chat`

## 4. Database safeguards

1. Use a single canonical production database file/path.
2. Backup DB before each deploy.
3. Run smoke checks:
   - Create academy with location only.
   - Delete academy only as creator.
   - Verify old ownerless academies are not present.

## 5. Frontend smoke checks

1. Login/Register flow.
2. Academias page:
   - Load list
   - Create academy
   - Delete own academy only
3. Loja page:
   - Filters and sorting
   - Add/remove from cart
   - Cart persists after refresh

## 6. Go-live checks

1. Set `BACKEND_DEBUG=false`.
2. Confirm HTTPS in production.
3. Confirm frontend points to production API URL.
4. Monitor app logs and error rates during first 24h.
