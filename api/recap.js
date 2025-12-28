export default async function handler(req, res) {
    console.log('API called for:', req.query.username);
    
    // Set CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Only GET allowed
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { username } = req.query;
    
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }
    
    // Get token
    const BEARER_TOKEN = process.env.X_BEARER_TOKEN;
    
    console.log('Token exists:', !!BEARER_TOKEN);
    console.log('Token starts with:', BEARER_TOKEN ? BEARER_TOKEN.substring(0, 10) + '...' : 'No token');
    
    // If no token, return mock data
    if (!BEARER_TOKEN) {
        console.log('NO TOKEN - returning mock data');
        return res.json({
            totalTweets: 150,
            totalEngagement: 7500,
            avgLikes: 50,
            bestMonth: "March",
            longestStreak: 7,
            topTweets: [],
            message: "Using mock data - no X_BEARER_TOKEN set"
        });
    }
    
    try {
        console.log('Trying to fetch from X API...');
        
        // SIMPLE TEST: Just get user info first
        const testResponse = await fetch(
            `https://api.twitter.com/2/users/by/username/${username}`,
            {
                headers: {
                    'Authorization': `Bearer ${BEARER_TOKEN}`,
                    'User-Agent': 'Test-App'
                },
                timeout: 10000
            }
        );
        
        console.log('X API Response Status:', testResponse.status);
        
        if (!testResponse.ok) {
            let errorText = 'Unknown error';
            try {
                const errorData = await testResponse.json();
                errorText = JSON.stringify(errorData);
                console.log('X API Error Data:', errorData);
            } catch (e) {
                errorText = await testResponse.text();
                console.log('X API Error Text:', errorText);
            }
            
            // Return specific error messages
            if (testResponse.status === 401) {
                return res.status(401).json({ 
                    error: 'INVALID_API_TOKEN - Your X API token is invalid or expired. Get a new one from developer.twitter.com'
                });
            }
            
            if (testResponse.status === 403) {
                return res.status(403).json({ 
                    error: 'FORBIDDEN - Your app lacks permissions. Set app to "Read only" and "Web App" type.'
                });
            }
            
            if (testResponse.status === 404) {
                return res.status(404).json({ 
                    error: `USER_NOT_FOUND - @${username} doesn't exist on X`
                });
            }
            
            return res.status(testResponse.status).json({ 
                error: `X_API_ERROR_${testResponse.status}: ${errorText.substring(0, 100)}`
            });
        }
        
        const userData = await testResponse.json();
        console.log('User data received:', userData);
        
        // Return success with minimal data
        return res.json({
            success: true,
            user: {
                id: userData.data.id,
                name: userData.data.name,
                username: userData.data.username
            },
            message: "X API is working!",
            totalTweets: 100,
            totalEngagement: 5000,
            avgLikes: 50,
            bestMonth: "Test Month",
            longestStreak: 5,
            topTweets: []
        });
        
    } catch (error) {
        console.error('NETWORK ERROR:', error.message);
        
        return res.status(500).json({ 
            error: `NETWORK_ERROR: ${error.message}. Check your X API token and app settings.`
        });
    }
}