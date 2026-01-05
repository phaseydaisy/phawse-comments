const STORAGE_KEY = 'phawse_comments';
const LAST_POST_KEY = 'phawse_last_post';
const COOLDOWN_MS = 30000;

let cooldownInterval = null;
function loadComments() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

function saveComments(comments) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
}

function formatTime(timestamp) {
    const now = new Date();
    const commentDate = new Date(timestamp);
    const diffMs = now - commentDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return commentDate.toLocaleDateString();
}

function createCommentElement(comment) {
    const div = document.createElement('div');
    div.className = 'comment';
    div.dataset.id = comment.id;
    
    div.innerHTML = `
        <div class="comment-header">
            <span class="comment-author">${escapeHtml(comment.author)}</span>
            <span class="comment-time">${formatTime(comment.timestamp)}</span>
        </div>
        <div class="comment-text">${escapeHtml(comment.text)}</div>
    `;
    
    return div;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderComments(sortOrder = 'newest') {
    const container = document.getElementById('commentsContainer');
    const noComments = document.getElementById('noComments');
    const commentCount = document.getElementById('commentCount');
    
    let comments = loadComments();
    if (sortOrder === 'newest') {
        comments.sort((a, b) => b.timestamp - a.timestamp);
    } else {
        comments.sort((a, b) => a.timestamp - b.timestamp);
    }
    commentCount.textContent = `(${comments.length})`;
    container.innerHTML = '';
    if (comments.length === 0) {
        noComments.style.display = 'block';
        container.style.display = 'none';
    } else {
        noComments.style.display = 'none';
        container.style.display = 'flex';
        comments.forEach(comment => {
            container.appendChild(createCommentElement(comment));
        });
    }
}

function addComment(author, text) {
    const comments = loadComments();
    const now = Date.now();
    
    const newComment = {
        id: now.toString(),
        author: author || 'Anonymous',
        text: text,
        timestamp: now
    };
    
    comments.push(newComment);
    saveComments(comments);
    localStorage.setItem(LAST_POST_KEY, now.toString());
    renderComments(getCurrentSort());
    
    return { success: true };
}

function getRemainingCooldown() {
    const lastPostTime = localStorage.getItem(LAST_POST_KEY);
    if (!lastPostTime) return 0;
    
    const timeSinceLastPost = Date.now() - parseInt(lastPostTime);
    const remaining = COOLDOWN_MS - timeSinceLastPost;
    
    return remaining > 0 ? remaining : 0;
}

function updateButtonState(submitBtn) {
    const remaining = getRemainingCooldown();
    
    if (remaining > 0) {
        const seconds = Math.ceil(remaining / 1000);
        submitBtn.disabled = true;
        submitBtn.textContent = `Wait ${seconds}s`;
        submitBtn.style.background = '#ff4757';
        submitBtn.style.cursor = 'not-allowed';
        submitBtn.style.opacity = '0.7';
    } else {
        if (cooldownInterval) {
            clearInterval(cooldownInterval);
            cooldownInterval = null;
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Post Comment';
        submitBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        submitBtn.style.cursor = 'pointer';
        submitBtn.style.opacity = '1';
    }
}

function startCooldownTimer(submitBtn) {
    if (cooldownInterval) {
        clearInterval(cooldownInterval);
    }
    
    updateButtonState(submitBtn);
    
    cooldownInterval = setInterval(() => {
        updateButtonState(submitBtn);
    }, 100);
}

function getCurrentSort() {
    const activeBtn = document.querySelector('.sort-btn.active');
    return activeBtn ? activeBtn.dataset.sort : 'newest';
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('commentForm');
    const usernameInput = document.getElementById('username');
    const commentTextArea = document.getElementById('commentText');
    const charCount = document.getElementById('charCount');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    if (getRemainingCooldown() > 0) {
        startCooldownTimer(submitBtn);
    }
    
    commentTextArea.addEventListener('input', function() {
        const length = this.value.length;
        charCount.textContent = `${length}/500`;
        
        if (length > 450) {
            charCount.style.color = '#ff4757';
        } else {
            charCount.style.color = 'rgba(255, 255, 255, 0.5)';
        }
    });
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (getRemainingCooldown() > 0) {
            return;
        }
        
        const author = usernameInput.value.trim();
        const text = commentTextArea.value.trim();
        
        if (text) {
            const result = addComment(author, text);
            
            if (result.success) {
                usernameInput.value = '';
                commentTextArea.value = '';
                charCount.textContent = '0/500';
                charCount.style.color = 'rgba(255, 255, 255, 0.5)';
                
                submitBtn.textContent = '✓ Posted!';
                submitBtn.style.background = '#10b981';
                submitBtn.style.opacity = '1';
                
                setTimeout(() => {
                    startCooldownTimer(submitBtn);
                }, 1000);
            }
        }
    });
    
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderComments(this.dataset.sort);
        });
    });

    renderComments();
    
    setInterval(() => {
        renderComments(getCurrentSort());
    }, 60000);
});
