// Check if user is already authenticated
function checkAuth() {
    const token = localStorage.getItem('token');
    const isLoggedIn = localStorage.getItem('isStudentLoggedIn');
    const studentData = localStorage.getItem('studentData');

    // If user is already logged in, redirect to dashboard
    if (token && isLoggedIn === 'true' && studentData) {
        // Check if we're on the login page
        if (window.location.pathname.includes('login.html')) {
            window.location.href = 'student_dashboard.html';
        }
    } else {
        // If user is not logged in and trying to access dashboard, redirect to login
        if (window.location.pathname.includes('student_dashboard.html')) {
            window.location.href = 'login.html';
        }
    }
}

// Function to validate JWT token expiration
function isTokenExpired(token) {
    if (!token) return true;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 < Date.now();
    } catch (e) {
        return true;
    }
}

// Add event listener to check auth status when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
});
