# Security Guide

## Authentication System

Your tournament control system now uses server-side authentication for improved security.

## How It Works

### Password Storage
- Passwords are stored on the **server only** (not in client code)
- Default passwords are defined in `server/index.js`
- Can be overridden with environment variables

### Authentication Flow
1. User enters password on login page
2. Password is sent to server via POST `/api/auth/login`
3. Server validates password
4. Server returns a session token if valid
5. Client stores token in localStorage
6. Token is validated on each page load

### Session Management
- Sessions last 48 hours
- Sessions are validated on every page load
- Logout clears session from localStorage
- Expired sessions automatically redirect to login

## Changing Passwords

### Method 1: Environment Variables (Recommended for Production)

Create a `.env` file in the root directory:

```bash
# Copy the example file
cp .env.example .env

# Edit the file
nano .env
```

Set your passwords:
```
JUDGES_PASSWORD=your_secure_judge_password
STAFF_PASSWORD=your_secure_staff_password
```

**Important:** Never commit `.env` file to Git! It's already in `.gitignore`.

### Method 2: Direct Code Change (Development Only)

Edit `server/index.js` and change the default values:

```javascript
const JUDGES_PASSWORD = process.env.JUDGES_PASSWORD || 'your_new_password';
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || 'your_new_password';
```

## Security Best Practices

### For Production Deployment

1. **Change Default Passwords**
   ```bash
   # Set strong passwords via environment variables
   export JUDGES_PASSWORD="strong_random_password_123"
   export STAFF_PASSWORD="another_strong_password_456"
   ```

2. **Use HTTPS**
   - Always use HTTPS in production
   - Most hosting platforms (Railway, Render, etc.) provide this automatically

3. **Strong Passwords**
   - Use at least 12 characters
   - Mix uppercase, lowercase, numbers, and symbols
   - Don't use common words or patterns

4. **Regular Updates**
   - Change passwords periodically
   - Update passwords if you suspect they've been compromised

5. **Access Control**
   - Only share passwords with authorized personnel
   - Use different passwords for judges and staff
   - Consider changing passwords after each tournament

### Password Strength Examples

❌ **Weak:** `password`, `123456`, `ata`
✅ **Strong:** `T0urn@m3nt!2024`, `J#dg3$Acc3ss!`, `St@ff!Ctrl#2024`

## Current Security Level

**Current Implementation:**
- ✅ Passwords not in client code
- ✅ Server-side validation
- ✅ Session tokens
- ✅ Session expiration
- ✅ Environment variable support

**Not Implemented (Advanced):**
- ❌ Password hashing (bcrypt)
- ❌ JWT tokens
- ❌ Rate limiting
- ❌ Multi-factor authentication
- ❌ User management database

## Upgrading Security

For higher security needs, consider:

1. **Password Hashing**
   - Use bcrypt to hash passwords
   - Never store plain text passwords

2. **JWT Tokens**
   - Use JSON Web Tokens for sessions
   - Include expiration and signature verification

3. **Rate Limiting**
   - Prevent brute force attacks
   - Limit login attempts

4. **User Database**
   - Store user accounts in database
   - Support multiple users per role
   - Track login history

## Troubleshooting

### Can't Login After Changing Password

1. Check environment variables are set correctly
2. Restart the server after changing `.env`
3. Clear browser localStorage and try again

### Session Expires Too Quickly

Edit `client/src/hooks/useAuth.js`:
```javascript
const SESSION_DURATION = 72 * 60 * 60 * 1000 // Change to 72 hours
```

### Forgot Password

1. Check `.env` file for current passwords
2. Or check `server/index.js` for default values
3. Restart server after any changes

## Support

For security concerns or questions, refer to the main README.md or HOSTING.md files.
