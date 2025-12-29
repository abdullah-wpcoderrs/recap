// DOM Elements
const connectXBtn = document.getElementById('connectX');
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

// Check for OAuth results on page load
function checkForOAuthResults() {
    const urlParams = new URLSearchParams(window.location.search);
    const results = urlParams.get('results');
    const error = urlParams.get('error');
    
    if (error) {
        showError(decodeURIComponent(error));
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }
    
    if (results) {
        try {
            // Decode base64url manually since Buffer isn't available in browsers
            const data = JSON.parse(atob(results.replace(/-/g, '+').replace(/_/g, '/')));
            displayOAuthResults(data);
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
            console.error('Failed to parse OAuth results:', err);
            showError('Failed to process authentication results');
        }
    }
}

// Display OAuth results
function displayOAuthResults(data) {
    // Update UI with data
    resultsUsername.textContent = data.username;
    totalTweetsEl.textContent = formatNumber(data.totalTweets);
    totalEngagementEl.textContent = formatNumber(data.totalEngagement);
    avgLikesEl.textContent = Math.round(data.avgLikes).toLocaleString();
    bestMonthEl.textContent = data.bestMonth;
    longestStreakEl.textContent = `${data.longestStreak} days`;
    
    // Generate and set summary sentence
    const summarySentence = generateSummarySentence(data, data.username);
    summarySentenceEl.textContent = summarySentence;
    
    // Render top tweets
    renderTopTweets(data.topTweets);
    
    // Store data for copying
    copyRecapBtn.dataset.recapData = JSON.stringify(data);
    copyRecapBtn.dataset.username = data.username;
    
    showResults();
}

// Handle OAuth login
function handleOAuthLogin() {
    showLoading();
    window.location.href = '/api/auth/login';
}

// Event Listeners
// OAuth login button
if (connectXBtn) {
    connectXBtn.addEventListener('click', handleOAuthLogin);
}

tryAgainBtn.addEventListener('click', () => {
    errorDiv.classList.add('hidden');
});

copyRecapBtn.addEventListener('click', async () => {
    const recapData = JSON.parse(copyRecapBtn.dataset.recapData || '{}');
    const username = copyRecapBtn.dataset.username || '';
    
    if (username && recapData.totalTweets !== undefined) {
        await copyRecapToClipboard(recapData, username);
    }
});

// Initialize
checkForOAuthResults();