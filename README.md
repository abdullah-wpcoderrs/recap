# X 2025 Recap Website

A simple website to show your X activity summary for 2025.

## 🚀 Quick Deploy

1. **Get X API Token:**
   - Go to https://developer.twitter.com/
   - Create Project → Create App
   - Copy "Bearer Token"

2. **Deploy to Vercel:**
   - Go to https://vercel.com/new
   - Import this project
   - Add Environment Variable:
     - Name: `X_BEARER_TOKEN`
     - Value: [Your token here]

3. **Open your site:**
   - Visit `https://your-project.vercel.app`
   - Enter a username
   - See the 2025 recap!

## 📁 Files
- `index.html` - Main page
- `style.css` - Styling
- `app.js` - Frontend logic
- `api/recap.js` - Serverless API
- `vercel.json` - Vercel config

## 🔒 Security
- API token stored in Vercel environment variables
- Never exposed to browser
- Input validation for safety