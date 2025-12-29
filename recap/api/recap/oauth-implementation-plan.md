# OAuth Implementation Plan

## Architecture Overview

```
User clicks "Connect X Account" 
→ Redirect to X OAuth 
→ User authorizes 
→ Callback with auth code 
→ Exchange for access token 
→ Fetch & analyze tweets 
→ Return analysis results
```

## Required Changes

### 1. Environment Variables
```
X_CLIENT_ID=your_client_id
X_CLIENT_SECRET=your_client_secret  
X_REDIRECT_URI=https://yourapp.com/api/auth/callback
```

### 2. New API Endpoints
- `/api/auth/login` - Initiate OAuth flow
- `/api/auth/callback` - Handle OAuth callback
- `/api/auth/status` - Check auth status

### 3. Frontend Updates
- Replace username input with OAuth button
- Handle OAuth redirect flow
- Display results after successful auth

### 4. Data Processing
- Batch tweet fetching during callback
- Real-time analysis processing
- Temporary result storage

## Benefits
- ✅ Higher rate limits
- ✅ Access to user's full data
- ✅ Better user experience
- ✅ No username guessing
- ✅ More accurate analytics