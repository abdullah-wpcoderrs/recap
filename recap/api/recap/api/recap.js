export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  // Validate username format
  if (!/^[a-zA-Z0-9_]{1,15}$/.test(username)) {
    return res.status(400).json({ error: 'Invalid username format' });
  }

  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) {
    return res.status(500).json({ error: 'X API token not configured' });
  }

  try {
    // Get user ID first
    const userResponse = await fetch(
      `https://api.twitter.com/2/users/by/username/${username}`,
      {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!userResponse.ok) {
      if (userResponse.status === 404) {
        return res.status(404).json({ error: 'User not found' });
      }
      if (userResponse.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }
      throw new Error(`User lookup failed: ${userResponse.status}`);
    }

    const userData = await userResponse.json();
    const userId = userData.data.id;

    // Get tweets from 2025
    const tweetsResponse = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?` +
      new URLSearchParams({
        'tweet.fields': 'created_at,public_metrics,text',
        'start_time': '2025-01-01T00:00:00Z',
        'end_time': '2025-12-31T23:59:59Z',
        'max_results': '100',
        'exclude': 'retweets,replies'
      }),
      {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!tweetsResponse.ok) {
      if (tweetsResponse.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }
      throw new Error(`Tweets fetch failed: ${tweetsResponse.status}`);
    }

    const tweetsData = await tweetsResponse.json();
    const tweets = tweetsData.data || [];

    if (tweets.length === 0) {
      return res.json({
        totalTweets: 0,
        totalEngagement: 0,
        avgLikes: 0,
        bestMonth: 'No activity',
        longestStreak: 0,
        topTweets: []
      });
    }

    // Calculate metrics
    const metrics = calculateMetrics(tweets);
    
    return res.json(metrics);

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch data from X API' 
    });
  }
}

function calculateMetrics(tweets) {
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