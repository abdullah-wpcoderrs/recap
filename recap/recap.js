export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    // Set caching headers (1 hour)
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate');
    
    // Check for GET method
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Get username from query
    const { username } = req.query;
    
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }
    
    // Validate username format
    if (!/^[a-zA-Z0-9_]{1,15}$/.test(username)) {
        return res.status(400).json({ error: 'Invalid username format' });
    }
    
    const BEARER_TOKEN = process.env.X_BEARER_TOKEN;
    
    if (!BEARER_TOKEN) {
        console.error('X_BEARER_TOKEN environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
    }
    
    try {
        // Step 1: Get user ID from username
        const userResponse = await fetch(
            `https://api.twitter.com/2/users/by/username/${username}`,
            {
                headers: {
                    'Authorization': `Bearer ${BEARER_TOKEN}`,
                    'User-Agent': 'X-2025-Recap/1.0'
                }
            }
        );
        
        if (!userResponse.ok) {
            if (userResponse.status === 404) {
                return res.status(404).json({ error: 'User not found' });
            } else if (userResponse.status === 429) {
                return res.status(429).json({ error: 'Rate limit exceeded' });
            }
            
            const errorText = await userResponse.text();
            console.error('Error fetching user:', userResponse.status, errorText);
            return res.status(userResponse.status).json({ 
                error: `X API error: ${userResponse.statusText}` 
            });
        }
        
        const userData = await userResponse.json();
        const userId = userData.data?.id;
        
        if (!userId) {
            return res.status(404).json({ error: 'User ID not found' });
        }
        
        // Step 2: Fetch tweets for 2025 with pagination
        let allTweets = [];
        let nextToken = null;
        const startTime = '2025-01-01T00:00:00Z';
        const endTime = '2026-01-01T00:00:00Z';
        const maxResults = 100;
        const maxTweets = 2000;
        
        do {
            const params = new URLSearchParams({
                start_time: startTime,
                end_time: endTime,
                max_results: maxResults.toString(),
                'tweet.fields': 'created_at,public_metrics,text,id'
            });
            
            if (nextToken) {
                params.append('pagination_token', nextToken);
            }
            
            const tweetsResponse = await fetch(
                `https://api.twitter.com/2/users/${userId}/tweets?${params}`,
                {
                    headers: {
                        'Authorization': `Bearer ${BEARER_TOKEN}`,
                        'User-Agent': 'X-2025-Recap/1.0'
                    }
                }
            );
            
            if (!tweetsResponse.ok) {
                const errorText = await tweetsResponse.text();
                console.error('Error fetching tweets:', tweetsResponse.status, errorText);
                
                // If we have some tweets, continue with what we have
                if (allTweets.length > 0) {
                    console.log('Continuing with', allTweets.length, 'tweets despite error');
                    break;
                }
                
                return res.status(tweetsResponse.status).json({ 
                    error: `Failed to fetch tweets: ${tweetsResponse.statusText}` 
                });
            }
            
            const tweetsData = await tweetsResponse.json();
            
            if (tweetsData.data) {
                allTweets.push(...tweetsData.data);
            }
            
            nextToken = tweetsData.meta?.next_token || null;
            
            // Stop if we've reached the maximum number of tweets
            if (allTweets.length >= maxTweets) {
                console.log(`Reached maximum of ${maxTweets} tweets`);
                break;
            }
            
            // Add a small delay to avoid rate limiting
            if (nextToken) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
        } while (nextToken && allTweets.length < maxTweets);
        
        console.log(`Fetched ${allTweets.length} tweets for user ${username}`);
        
        // If no tweets found
        if (allTweets.length === 0) {
            return res.json({
                totalTweets: 0,
                totalEngagement: 0,
                avgLikes: 0,
                bestMonth: 'No tweets in 2025',
                longestStreak: 0,
                topTweets: [],
                monthlyEngagement: {}
            });
        }
        
        // Step 3: Calculate metrics
        
        // Total tweets
        const totalTweets = allTweets.length;
        
        // Engagement metrics
        let totalLikes = 0;
        let totalRetweets = 0;
        let totalReplies = 0;
        let totalQuotes = 0;
        let totalEngagement = 0;
        
        // For monthly engagement tracking
        const monthlyEngagement = {};
        const tweetDates = []; // For streak calculation
        
        // Calculate per-tweet metrics and aggregate
        allTweets.forEach(tweet => {
            const metrics = tweet.public_metrics;
            
            totalLikes += metrics.like_count;
            totalRetweets += metrics.retweet_count;
            totalReplies += metrics.reply_count;
            totalQuotes += metrics.quote_count;
            
            const tweetEngagement = metrics.like_count + 
                                   metrics.retweet_count + 
                                   metrics.reply_count + 
                                   metrics.quote_count;
            
            totalEngagement += tweetEngagement;
            
            // Add engagement score to tweet object for sorting
            tweet.engagementScore = tweetEngagement;
            
            // Track month for "best month" calculation
            const tweetDate = new Date(tweet.created_at);
            const yearMonth = `${tweetDate.getUTCFullYear()}-${String(tweetDate.getUTCMonth() + 1).padStart(2, '0')}`;
            const monthName = tweetDate.toLocaleDateString('en-US', { month: 'long' });
            
            if (!monthlyEngagement[monthName]) {
                monthlyEngagement[monthName] = {
                    count: 0,
                    engagement: 0,
                    monthIndex: tweetDate.getUTCMonth()
                };
            }
            
            monthlyEngagement[monthName].count++;
            monthlyEngagement[month]