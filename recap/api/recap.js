export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
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
            if (userResponse.status === 401) {
                return res.status(401).json({ error: 'Invalid API token' });
            } else if (userResponse.status === 403) {
                return res.status(403).json({ error: 'API permission denied' });
            } else if (userResponse.status === 404) {
                return res.status(404).json({ error: `User @${username} not found` });
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
                topTweets: []
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
            const monthName = tweetDate.toLocaleDateString('en-US', { month: 'long' });
            
            if (!monthlyEngagement[monthName]) {
                monthlyEngagement[monthName] = {
                    count: 0,
                    engagement: 0,
                    monthIndex: tweetDate.getUTCMonth()
                };
            }
            
            monthlyEngagement[monthName].count++;
            monthlyEngagement[monthName].engagement += tweetEngagement;
            
            // Add date for streak calculation (UTC date only)
            const utcDate = tweet.created_at.split('T')[0];
            tweetDates.push(utcDate);
        });
        
        // Calculate average likes per tweet
        const avgLikes = totalTweets > 0 ? totalLikes / totalTweets : 0;
        
        // Find best month by engagement
        let bestMonth = 'No tweets';
        let maxEngagement = 0;
        
        for (const [monthName, data] of Object.entries(monthlyEngagement)) {
            if (data.engagement > maxEngagement) {
                maxEngagement = data.engagement;
                bestMonth = monthName;
            }
        }
        
        // Calculate longest streak
        const uniqueDates = [...new Set(tweetDates)].sort();
        let longestStreak = 0;
        
        if (uniqueDates.length > 0) {
            let currentStreak = 1;
            longestStreak = 1;
            
            for (let i = 1; i < uniqueDates.length; i++) {
                const prevDate = new Date(uniqueDates[i - 1]);
                const currDate = new Date(uniqueDates[i]);
                
                // Calculate difference in days
                const diffTime = currDate - prevDate;
                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                
                if (diffDays === 1) {
                    currentStreak++;
                    longestStreak = Math.max(longestStreak, currentStreak);
                } else if (diffDays > 1) {
                    currentStreak = 1;
                }
            }
        }
        
        // Get top 5 tweets by engagement
        const topTweets = [...allTweets]
            .sort((a, b) => b.engagementScore - a.engagementScore)
            .slice(0, 5)
            .map(tweet => ({
                id: tweet.id,
                text: tweet.text,
                created_at: tweet.created_at,
                public_metrics: tweet.public_metrics,
                engagementScore: tweet.engagementScore
            }));
        
        // Return the recap data
        return res.json({
            totalTweets,
            totalEngagement,
            avgLikes: parseFloat(avgLikes.toFixed(1)),
            bestMonth,
            longestStreak,
            topTweets,
            monthlyEngagement
        });
        
    } catch (error) {
        console.error('Unexpected error:', error);
        return res.status(500).json({ 
            error: `Internal server error: ${error.message}` 
        });
    }
}