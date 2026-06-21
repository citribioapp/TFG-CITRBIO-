# Railway Environment Variables

This document lists all required environment variables for deploying the Citribio backend to Railway.

## Required Environment Variables

### Database

Railway MySQL plugin provides individual variables automatically. The entrypoint script builds `DATABASE_URL` from them. You do **not** need to set `DATABASE_URL` manually if you use the Railway MySQL plugin.

**Variables provided automatically by Railway MySQL plugin:**
```
MYSQLHOST=containers-us-west-xxx.railway.app
MYSQLPORT=6xxx
MYSQLUSER=root
MYSQLPASSWORD=your_generated_password
MYSQLDATABASE=railway
```

**Resulting DATABASE_URL constructed at startup:**
```
mysql://root:PASSWORD@mysql.railway.internal:3306/railway?serverVersion=mariadb-10.6.0&charset=utf8mb4
```

**Alternative:** If you prefer to set it manually, add this single variable:
```
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DATABASE?serverVersion=mariadb-10.6.0&charset=utf8mb4
```

> ⚠️ **Critical:** Use `serverVersion=mariadb-10.6.0` (not `serverVersion=8.0`). Railway's MySQL plugin runs **MariaDB 10.6**, not MySQL 8. Using the wrong version causes Doctrine to misidentify the server and fail with 500 errors on all DB queries.
>
> ⚠️ The host MUST be a TCP hostname (e.g. `mysql.railway.internal` for private networking, or the public TCP proxy host). Never use `localhost` or `127.0.0.1`.

### Application
```
APP_ENV=prod
APP_SECRET=your_secure_random_secret_here
```

### JWT Authentication
```
JWT_PASSPHRASE=your_secure_jwt_passphrase_here
```

### CORS Configuration
```
CORS_ALLOW_ORIGINS=https://citribio-frontend.vercel.app,http://localhost:4200,http://127.0.0.1:4200
CORS_ALLOW_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS
CORS_ALLOW_HEADERS=Content-Type,Authorization
```

**Note:** Include localhost origins for local development testing. Remove them in production if not needed.

### Email Service - Resend (Contact Form)
```
RESEND_API_KEY=re_your_actual_resend_api_key_here
CONTACT_TO_EMAIL=administracion@citribio.com
CONTACT_FROM_EMAIL=Citribio <no-reply@citribio.com>
```

**IMPORTANT:** 
- Get your Resend API key from: https://resend.com/api-keys
- The `CONTACT_FROM_EMAIL` domain must be verified in your Resend account
- Never commit the actual API key to version control

### Email Service - Brevo (Order Notifications)
```
BREVO_API_KEY=your_brevo_api_key_here
BREVO_SENDER_EMAIL=verified_sender@yourdomain.com
BREVO_SENDER_NAME=Citribio
ORDER_NOTIFICATION_EMAIL=pedidos@citribio.com
MAILER_FROM=verified_sender@yourdomain.com
```

### Messenger
```
MESSENGER_TRANSPORT_DSN=doctrine://default?auto_setup=0
```

### Lock
```
LOCK_DSN=flock
```

## Security Notes

1. **Never expose API keys in frontend code** - All email API keys (Resend, Brevo) must only exist in backend environment variables
2. **Use strong secrets** - Generate secure random strings for `APP_SECRET` and `JWT_PASSPHRASE`
3. **Verify domains** - Ensure sender email domains are verified in Resend/Brevo before deploying
4. **CORS configuration** - Only allow your production frontend domain in `CORS_ALLOW_ORIGINS`

## Deployment Checklist

- [ ] All environment variables set in Railway dashboard
- [ ] Database connection tested
- [ ] Resend API key is valid and domain is verified
- [ ] CORS origins match your frontend URL
- [ ] JWT keys generated and uploaded
- [ ] Test contact form after deployment
