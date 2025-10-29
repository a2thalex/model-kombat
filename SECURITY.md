# Security Guidelines for ModelKombat

## ⚠️ Important Security Considerations

### API Key Management

**CRITICAL: This application stores OpenRouter API keys client-side with basic obfuscation.**

#### Current Implementation
- API keys are stored in Firestore and localStorage
- Keys are "obfuscated" using Base64 encoding + string reversal
- **This is NOT secure encryption** - keys can be easily decoded

#### Security Implications
1. Anyone with browser DevTools access can extract API keys
2. Keys stored in Firestore can be viewed by authenticated users
3. No server-side protection exists

#### Recommendations

**For Personal/Development Use:**
- ✅ Use your own OpenRouter API key
- ✅ Set spending limits on your OpenRouter account
- ✅ Never share your deployed instance with untrusted users
- ✅ Regularly rotate your API keys
- ✅ Monitor your OpenRouter usage and billing

**For Production/Multi-User Deployment:**
1. **Implement a Backend Proxy** (RECOMMENDED)
   ```
   User → Your Backend → OpenRouter API
   ```
   - Store API keys server-side only
   - Implement rate limiting and quotas per user
   - Add request logging and monitoring

2. **Use Environment-Based Keys**
   - Separate keys for dev/staging/production
   - Use Firebase Functions or similar serverless backend
   - Implement proper access controls

3. **Alternative: User-Provided Keys**
   - Require each user to provide their own OpenRouter key
   - Add clear warnings about key security
   - Provide instructions for key rotation

### Firebase Configuration

#### Public Credentials
The Firebase API key in `.env` is **intended to be public** - it's not a secret. However:

✅ **Do This:**
- Restrict API key in Firebase Console to your domain only
- Enable Firebase App Check for additional security
- Review Firestore security rules regularly

❌ **Don't Do This:**
- Don't rely on API key secrecy for security
- Don't skip Firestore security rules thinking the API key protects you

#### Firestore Security Rules
Current rules are good but could be improved:

**Current:** Users can read/write their own documents
**Consider Adding:**
- Rate limiting on writes
- Field-level validation
- Size limits on documents
- Batch operation limits

### OAuth and Authentication

#### Current Implementation
- Google OAuth with COOP policy handling
- Fallback to redirect method for popup issues

#### Recommendations
1. **Add CSRF Protection**
   ```typescript
   // Generate state parameter
   const state = generateRandomString()
   sessionStorage.setItem('oauth_state', state)

   // Verify on callback
   if (receivedState !== sessionStorage.getItem('oauth_state')) {
     throw new Error('CSRF detected')
   }
   ```

2. **Implement Session Management**
   - Set proper session timeouts
   - Implement "remember me" securely
   - Add logout from all devices feature

### Source Code Protection

✅ **Fixed:** Source maps are now disabled in production builds
- Development: Source maps enabled for debugging
- Production: No source maps to prevent code exposure

### Environment Variables

#### Secure Practices
✅ `.env` is in `.gitignore`
✅ `.env.example` provided for reference
✅ No sensitive keys committed to Git

#### Checklist
- [ ] Never commit `.env` to Git
- [ ] Use different credentials for dev/staging/prod
- [ ] Rotate credentials if accidentally exposed
- [ ] Use Firebase App Check in production
- [ ] Set up monitoring and alerts

## Security Best Practices for Deployment

### 1. Enable Firebase App Check
```bash
# Install Firebase App Check
npm install firebase/app-check

# Configure in your Firebase project
# https://firebase.google.com/docs/app-check
```

### 2. Implement Rate Limiting
Current implementation has client-side rate limiting, but add server-side:
```typescript
// Firebase Functions example
export const proxyOpenRouter = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')

  // Check rate limit from Firestore
  const rateLimit = await checkUserRateLimit(uid)
  if (!rateLimit.allowed) {
    throw new functions.https.HttpsError('resource-exhausted', 'Rate limit exceeded')
  }

  // Proxy to OpenRouter with server-side API key
  return await callOpenRouter(data)
})
```

### 3. Monitor and Alert
Set up monitoring for:
- Unusual API usage patterns
- High error rates
- Authentication failures
- Firestore read/write spikes
- OpenRouter spending alerts

### 4. Regular Security Audits
- [ ] Review Firestore security rules monthly
- [ ] Audit user permissions and roles
- [ ] Check for dependency vulnerabilities: `npm audit`
- [ ] Review Firebase Console activity logs
- [ ] Monitor OpenRouter API usage

### 5. Data Privacy
- Implement data deletion workflows
- Provide data export functionality
- Add privacy policy and terms of service
- Comply with GDPR/CCPA if applicable

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. Email security concerns to: [your-email@example.com]
3. Include detailed steps to reproduce
4. Allow 90 days for fix before public disclosure

## Security Checklist for Production

Before deploying to production:

- [ ] Implement backend proxy for OpenRouter API
- [ ] Enable Firebase App Check
- [ ] Configure Firebase API key domain restrictions
- [ ] Review and test Firestore security rules
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Configure rate limiting server-side
- [ ] Add CSRF protection to OAuth flow
- [ ] Set up uptime monitoring
- [ ] Configure backup strategy for Firestore
- [ ] Document incident response procedures
- [ ] Set up usage alerts and quotas
- [ ] Test authentication edge cases
- [ ] Verify source maps disabled in production build
- [ ] Run security audit: `npm audit`
- [ ] Review all environment variables
- [ ] Set up logging and monitoring

## Additional Resources

- [Firebase Security Rules Documentation](https://firebase.google.com/docs/rules)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OpenRouter Security Best Practices](https://openrouter.ai/docs)

---

**Remember:** Security is an ongoing process, not a one-time task. Regular reviews and updates are essential.
