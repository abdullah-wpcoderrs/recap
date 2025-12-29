# X 2025 Recap Website

A secure OAuth-based website to analyze your complete X (Twitter) activity for 2025.

## 🚀 Quick Deploy

### OAuth Setup (Required)

1. **Create X App for OAuth:**
   - Go to https://developer.twitter.com/
   - Create Project → Create App
   - In App Settings → User authentication settings:
     - Enable OAuth 2.0
     - Type: Web App
     - Callback URL: `https://your-domain.com/api/auth/callback`
     - Website URL: `https://your-domain.com`
   - Copy Client ID and Client Secret

2. **Deploy to Vercel:**
   - Go to https://vercel.com/new
   - Import this project
   - Add Environment Variables:
     - `X_CLIENT_ID`: Your OAuth Client ID
     - `X_CLIENT_SECRET`: Your OAuth Client Secret
     - `X_REDIRECT_URI`: `https://your-project.vercel.app/api/auth/callback`

3. **Test Your Deployment:**
   - Visit your Vercel URL
   - Click "Connect X Account"
   - Authorize the app
   - View your 2025 recap!

## 🔧 Features

- ✅ Secure OAuth 2.0 authentication with PKCE
- ✅ Access to complete tweet history (no 100-tweet limit)
- ✅ Higher API rate limits
- ✅ Comprehensive 2025 analytics
- ✅ Real-time tweet analysis during authentication
- ✅ Shareable recap summaries
- ✅ No data stored permanently

## 📁 Project Structure
- `index.html` - OAuth-focused main page
- `style.css` - Modern UI styling
- `app.js` - OAuth flow handling
- `api/auth/login.js` - OAuth initiation endpoint
- `api/auth/callback.js` - OAuth callback with tweet analysis
- `vercel.json` - Vercel configuration for OAuth endpoints

## 🔒 Security & Privacy
- OAuth 2.0 with PKCE for maximum security
- No user credentials stored
- Temporary analysis only - no permanent data storage
- Users control access permissions
- All API tokens secured in environment variables

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Deploy to Vercel
npm run deploy
```