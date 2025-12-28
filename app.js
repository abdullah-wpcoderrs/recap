// DOM Elements
const usernameInput = document.getElementById('username');
const getRecapBtn = document.getElementById('getRecap');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const errorMessage = document.getElementById('error-message');
const tryAgainBtn = document.getElementById('try-again');
const resultsDiv = document.getElementById('results');
const copyRecapBtn = document.getElementById('copy-recap');
const toast = document.getElementById('toast');

// Results elements
const resultsUsername = document.getElementById('results-username');
const totalTweetsEl = document.getElementById('total-tweets');
const totalEngagementEl = document.getElementById('total-engagement');
const avgLikesEl = document.getElementById('avg-likes');
const bestMonthEl = document.getElementById('best-month');
const longestStreakEl = document.getElementById('longest-streak');
const summarySentenceEl = document.getElementById('summary-sentence');
const topTweetsContainer = document.getElementById('top-tweets');

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Validate username (letters, numbers, underscore only)
function validateUsername(username) {
    return /^[a-zA-Z0-9_]{1,15}$/.test(username);
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    loadingDiv.classList.add('hidden');
    errorDiv.classList.remove('hidden');
    resultsDiv.classList.add('hidden');
}

// Show loading state
function showLoading() {
    errorDiv.classList.add('hidden');
    resultsDiv.classList.add('hidden');
    loadingDiv.classList.remove('hidden');
}

// Show results
function showResults() {
    loadingDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
    resultsDiv.classList.remove('hidden');
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    });
}

// Get month name from month number (0-11)
function getMonthName(monthIndex) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIndex];
}

// Calculate longest streak from array of dates
function calculateLongestStreak(dates) {
    if (dates.length === 0) return 0;
    
    // Sort dates and convert to YYYY-MM-DD strings
    const sortedDates = [...new Set(dates)]
        .map(date => new Date(date).toISOString().split('T')[0])
        .sort();
    
    if (sortedDates.length === 1) return 1;
    
    let longestStreak = 1;
    let currentStreak = 1;
    
    for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1]);
        const currentDate = new Date(sortedDates[i]);
        
        // Calculate difference in days
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

// Render top tweets
function renderTopTweets(tweets) {
    topTweetsContainer.innerHTML = '';
    
    tweets.forEach((tweet, index) => {
        const engagement = tweet.public_metrics.like_count + 
                          tweet.public_metrics.retweet_count + 
                          tweet.public_metrics.reply_count + 
                          tweet.public_metrics.quote_count;
        
        const tweetEl = document.createElement('div');
        tweetEl.className = 'tweet-card';
        
        tweetEl.innerHTML = `
            <div class="tweet-header">
                <div class="tweet-rank">${index + 1}</div>
                <div class="tweet-date">${formatDate(tweet.created_at)}</div>
            </div>
            <div class="tweet-text">${escapeHtml(tweet.text.substring(0, 200))}${tweet.text.length > 200 ? '...' : ''}</div>
            <div class="tweet-metrics">
                <div class="metric">
                    <i class="fas fa-heart"></i>
                    <span>${formatNumber(tweet.public_metrics.like_count)}</span>
                </div>
                <div class="metric">
                    <i class="fas fa-retweet"></i>
                    <span>${formatNumber(tweet.public_metrics.retweet_count)}</span>
                </div>
                <div class="metric">
                    <i class="fas fa-reply"></i>
                    <span>${formatNumber(tweet.public_metrics.reply_count)}</span>
                </div>
                <div class="metric">
                    <i class="fas fa-quote-right"></i>
                    <span>${formatNumber(tweet.public_metrics.quote_count)}</span>
                </div>
                <div class="metric">
                    <i class="fas fa-chart-line"></i>
                    <span><strong>${formatNumber(engagement)} total</strong></span>
                </div>
            </div>
            <a href="https://twitter.com/i/status/${tweet.id}" target="_blank" class="tweet-link">
                <i class="fas fa-external-link-alt"></i> View on X
            </a>
        `;
        
        topTweetsContainer.appendChild(tweetEl);
    });
}

// Simple HTML escaping for tweet text
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Generate shareable summary sentence
function generateSummarySentence(recapData, username) {
    const { totalTweets, totalEngagement, avgLikes, bestMonth, longestStreak } = recapData;
    
    const summaries = [
        `In 2025, @${username} posted ${totalTweets} times, generating ${formatNumber(totalEngagement)} total engagements with an average of ${Math.round(avgLikes)} likes per tweet.`,
        `During 2025, @${username} shared ${totalTweets} tweets that received ${formatNumber(totalEngagement)} engagements, peaking in ${bestMonth}.`,
        `2025 was active for @${username} with ${totalTweets} tweets, ${formatNumber(totalEngagement)} engagements, and a ${longestStreak}-day posting streak.`,
        `@${username}'s 2025 on X: ${totalTweets} tweets, ${formatNumber(totalEngagement)} total engagements, ${Math.round(avgLikes)} avg likes, best month was ${bestMonth}.`
    ];
    
    return summaries[Math.floor(Math.random() * summaries.length)];
}

// Copy recap to clipboard
async function copyRecapToClipboard(recapData, username) {
    const summary = generateSummarySentence(recapData, username);
    
    const recapText = `My X 2025 Recap (@${username}):

📊 Total Tweets: ${recapData.totalTweets}
❤️ Total Engagement: ${formatNumber(recapData.totalEngagement)}
📈 Average Likes/Tweet: ${Math.round(recapData.avgLikes)}
🏆 Best Month: ${recapData.bestMonth}
🔥 Longest Streak: ${recapData.longestStreak} days

${summary}

Generated via X 2025 Recap Tool`;

    try {
        await navigator.clipboard.writeText(recapText);
        
        // Show toast notification
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    } catch (err) {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard. Please manually select and copy the text.');
    }
}

// Main function to fetch recap data
async function fetchRecapData(username) {
    showLoading();
    
    try {
        const response = await fetch(`/api/recap?username=${encodeURIComponent(username)}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('User not found. Please check the username and try again.');
            } else if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please try again in a few minutes.');
            } else if (response.status >= 500) {
                throw new Error('X API is currently unavailable. Please try again later.');
            } else {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Update UI with data
        resultsUsername.textContent = username;
        totalTweetsEl.textContent = formatNumber(data.totalTweets);
        totalEngagementEl.textContent = formatNumber(data.totalEngagement);
        avgLikesEl.textContent = Math.round(data.avgLikes).toLocaleString();
        bestMonthEl.textContent = data.bestMonth;
        longestStreakEl.textContent = `${data.longestStreak} days`;
        
        // Generate and set summary sentence
        const summarySentence = generateSummarySentence(data, username);
        summarySentenceEl.textContent = summarySentence;
        
        // Render top tweets
        renderTopTweets(data.topTweets);
        
        // Store data for copying
        copyRecapBtn.dataset.recapData = JSON.stringify(data);
        copyRecapBtn.dataset.username = username;
        
        showResults();
    } catch (error) {
        console.error('Error fetching recap:', error);
        showError(error.message || 'Failed to fetch recap data. Please try again.');
    }
}

// Event Listeners
getRecapBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    
    if (!username) {
        showError('Please enter a username');
        return;
    }
    
    if (!validateUsername(username)) {
        showError('Username can only contain letters, numbers, and underscores (max 15 characters)');
        return;
    }
    
    await fetchRecapData(username);
});

usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        getRecapBtn.click();
    }
});

tryAgainBtn.addEventListener('click', () => {
    errorDiv.classList.add('hidden');
    usernameInput.focus();
});

copyRecapBtn.addEventListener('click', async () => {
    const recapData = JSON.parse(copyRecapBtn.dataset.recapData || '{}');
    const username = copyRecapBtn.dataset.username || '';
    
    if (username && recapData.totalTweets !== undefined) {
        await copyRecapToClipboard(recapData, username);
    }
});

// Initialize
usernameInput.focus();