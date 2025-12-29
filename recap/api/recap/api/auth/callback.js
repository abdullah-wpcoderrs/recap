import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`/?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return res.redirect('/?error=missing_parameters');
  }

  try {
    // Decode state to get code_verifier
    const stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    const { codeVerifier } = stateData;

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.X_REDIRECT_URI || `${req.headers.origin}/api/auth/callback`,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Token exchange failed');
    }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    // Get user info
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const userData = await userResponse.json();
    const user = userData.data;

    // Fetch and analyze tweets
    const analysisResult = await analyzeUserTweets(access_token, user.id);

    // Create a session token (in production, use proper session management)
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Store results temporarily (in production, use Redis/database)
    // For now, we'll redirect with the data
    const resultData = {
      username: user.username,
      ...analysisResult,
      sessionToken
    };

    const encodedResult = Buffer.from(JSON.stringify(resultData)).toString('base64url');
    
    // Redirect back to main page with results
    res.redirect(`/?results=${encodedResult}`);

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`/?error=${encodeURIComponent('Authentication failed')}`);
  }
}

async function analyzeUserTweets(accessToken, userId) {
  try {
    let allTweets = [];
    let nextToken = null;
    let requestCount = 0;
    const maxRequests = 10; // Limit to prevent infinite loops

    // Fetch tweets in batches
    do {
      const url = new URL(`https://api.twitter.com/2/users/${userId}/tweets`);
      url.searchParams.set('tweet.fields', 'created_at,public_metrics,text');
      url.searchParams.set('start_time', '2025-01-01T00:00:00Z');
      url.searchParams.set('end_time', '2025-12-31T23:59:59Z');
      url.searchParams.set('max_results', '100');
      url.searchParams.set('exclude', 'retweets,replies');
      
      if (nextToken) {
        url.searchParams.set('pagination_token', nextToken);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited, break and analyze what we have
          break;
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        allTweets = allTweets.concat(data.data);
      }

      nextToken = data.meta?.next_token;
      requestCount++;

    } while (nextToken && requestCount < maxRequests);

    // Analyze the collected tweets
    return calculateMetrics(allTweets);

  } catch (error) {
    console.error('Tweet analysis error:', error);
    // Return basic metrics even if analysis fails
    return {
      totalTweets: 0,
      totalEngagement: 0,
      avgLikes: 0,
      bestMonth: 'Analysis failed',
      longestStreak: 0,
      topTweets: []
    };
  }
}

function calculateMetrics(tweets) {
  if (!tweets || tweets.length === 0) {
    return {
      totalTweets: 0,
      totalEngagement: 0,
      avgLikes: 0,
      bestMonth: 'No activity',
      longestStreak: 0,
      topTweets: []
    };
  }

  const totalTweets = tweets.length;
  let totalEngagement = 0;
  let totalLikes = 0;
  const monthlyTweets = {};
  const tweetDates = [];

  // Process each tweet
  tweets.forEach(tweet => {
    const metrics = tweet.public_metrics;
    const engagement = metrics.like_count + metrics.retweet_count + 
                     metrics.reply_count + metrics.quote_count;
    
    totalEngagement += engagement;
    totalLikes += metrics.like_count;
    
    // Track monthly activity
    const date = new Date(tweet.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyTweets[monthKey] = (monthlyTweets[monthKey] || 0) + 1;
    
    // Track dates for streak calculation
    tweetDates.push(tweet.created_at);
  });

  // Find best month
  let bestMonth = 'No activity';
  let maxTweets = 0;
  for (const [month, count] of Object.entries(monthlyTweets)) {
    if (count > maxTweets) {
      maxTweets = count;
      const [year, monthNum] = month.split('-');
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      bestMonth = monthNames[parseInt(monthNum) - 1];
    }
  }

  // Calculate longest streak
  const longestStreak = calculateLongestStreak(tweetDates);

  // Get top 5 tweets by engagement
  const topTweets = tweets
    .map(tweet => ({
      ...tweet,
      totalEngagement: tweet.public_metrics.like_count + 
                      tweet.public_metrics.retweet_count + 
                      tweet.public_metrics.reply_count + 
                      tweet.public_metrics.quote_count
    }))
    .sort((a, b) => b.totalEngagement - a.totalEngagement)
    .slice(0, 5);

  return {
    totalTweets,
    totalEngagement,
    avgLikes: totalTweets > 0 ? totalLikes / totalTweets : 0,
    bestMonth,
    longestStreak,
    topTweets
  };
}

function calculateLongestStreak(dates) {
  if (dates.length === 0) return 0;
  
  // Convert to unique dates and sort
  const uniqueDates = [...new Set(dates)]
    .map(date => new Date(date).toISOString().split('T')[0])
    .sort();
  
  if (uniqueDates.length === 1) return 1;
  
  let longestStreak = 1;
  let currentStreak = 1;
  
  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i - 1]);
    const currentDate = new Date(uniqueDates[i]);
    
    const diffTime = currentDate - prevDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    if (diffDays === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else if (diffDays > 1) {
      currentStreak = 1;
    }
  }
  
  return longestStreak;
}