# Production Deployment

## Local build

Run only on the development computer:

```bash
npm run build
```

This creates:

- Frontend upload files: `frontend/dist`
- Self-contained backend upload files: `backend/production-package`

The backend package embeds Express, MySQL, JWT, Multer and every other runtime dependency. The server does not need `node_modules` or `npm install`.

## Frontend upload

Upload all contents inside `frontend/dist` to the `/ara-garage/` public web directory. Include the hidden `.htaccess` file.

## Backend upload

Upload all contents inside `backend/production-package` to:

```text
/home/appsdemo/ara-garage-backend
```

The uploaded folder must contain:

```text
.env.production
package.json
dist/server.js
dist/start-production.js
dist/migrate-production.js
dist/database/schema.sql
uploads/
```

No server-side install or build command is required.

## Webuzo application

```text
Application Path:         /home/appsdemo/ara-garage-backend
Application Type:         Node.js 22
Port:                     30010
Application startup file: dist/server.js
Start Command:            npm start
Deployment Environment:   Production
```

After upload, use Stop and Start (or Restart) in Webuzo.

## URLs

- Frontend: `https://appsdemo.arasoftwares.in/ara-garage/`
- Backend health: `https://appsdemo.arasoftwares.in/ara-garage-backend/api/v1/health`

## Before go-live

- Keep the Webuzo port and `.env.production` `PORT` value identical.
- Replace placeholder JWT secrets with independent strong values.
- Restrict `.env.production` permissions to the application account.
- Confirm the production database exists and the configured user has access.
- Confirm the `uploads` directory is writable.
