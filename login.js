document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const togglePassword = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');
    const rememberMe = document.getElementById('remember-me');
    const loginStatus = document.getElementById('login-status');
  
    // Toggle password visibility
    togglePassword.addEventListener('click', function() {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    });
  
    // Handle form submission
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const studentId = document.getElementById('student-id').value.trim();
      const password = passwordInput.value.trim();
      
      // Simple validation
      if (!studentId || !password) {
        showStatus('Please fill in all fields', 'error');
        return;
      }
      
      // Show loading status
      loginStatus.textContent = 'Logging in...';
      loginStatus.className = 'login-status';
      loginStatus.style.display = 'block';
      
      try {
        const response = await fetch('https://department-mangement-system-97wj.onrender.com/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: studentId,
            password: password
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Login failed');
        }

        if (data.message === 'Login successful' && data.token && data.user) {
          // Save authentication data
          localStorage.setItem('token', data.token);
          localStorage.setItem('studentData', JSON.stringify(data.user));
          localStorage.setItem('isStudentLoggedIn', 'true');
          
          // Handle remember me
          if (rememberMe.checked) {
            localStorage.setItem('rememberedStudentId', studentId);
          } else {
            localStorage.removeItem('rememberedStudentId');
          }
          
          // Show success message before redirect
          showStatus('Login successful! Redirecting...', 'success');
          
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            window.location.href = 'student_dashboard.html';
          }, 500);
        } else {
          showStatus('Invalid credentials', 'error');
        }
      } catch (error) {
        console.error('Login error:', error);
        showStatus(error.message || 'An error occurred during login. Please try again.', 'error');
      }
    });
  
    // Check for remembered student ID
    const rememberedStudentId = localStorage.getItem('rememberedStudentId');
    if (rememberedStudentId) {
      document.getElementById('student-id').value = rememberedStudentId;
      rememberMe.checked = true;
    }
  
    // Helper function to show status messages
    function showStatus(message, type) {
      loginStatus.textContent = message;
      loginStatus.className = `login-status ${type}`;
      loginStatus.style.display = 'block';
      
      if (type === 'error') {
        loginForm.querySelector('button[type="submit"]').disabled = false;
      }
    }
  });