document.addEventListener('DOMContentLoaded', function() {
  console.log('=== DASHBOARD PAGE LOADED ===');
  
  // Check if running as PWA
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                window.navigator.standalone || 
                document.referrer.includes('android-app://');
  
  console.log('PWA Status:', isPWA ? 'Running as PWA' : 'Running in browser');
  
  if (isPWA) {
    // Add PWA-specific styling
    document.body.classList.add('pwa-mode');
    console.log('✅ App is running in standalone mode (full-screen)');
  } else {
    console.log('ℹ️  App is running in browser mode');
  }
  
  // Check if user is authenticated
  const token = localStorage.getItem('token');
  const studentData = JSON.parse(localStorage.getItem('studentData'));
  
  console.log('Authentication check - Token:', token ? 'Found' : 'Missing');
  console.log('Authentication check - Student data:', studentData ? 'Found' : 'Missing');
  
  if (!token || !studentData) {
    console.log('Authentication failed, redirecting to login');
    window.location.href = 'login.html';
    return;
  }
  
  console.log('Authentication successful, proceeding with dashboard setup');
  
  // Mobile PWA debug info
  if (/Mobi|Android/i.test(navigator.userAgent)) {
    console.log('📱 Mobile device detected');
    console.log('🔧 PWA Support:', 'serviceWorker' in navigator);
    console.log('📋 Manifest support:', 'onbeforeinstallprompt' in window);
    
    // Show mobile debug info
    setTimeout(() => {
      alert(`Mobile PWA Debug:
📱 Mobile: ${/Mobi|Android/i.test(navigator.userAgent)}
🔧 SW Support: ${'serviceWorker' in navigator}
📋 Install Support: ${'onbeforeinstallprompt' in window}
🖥️ Display Mode: ${window.matchMedia('(display-mode: standalone)').matches ? 'PWA' : 'Browser'}`);
    }, 2000);
  }
  
  // ==================== GLOBAL VARIABLES ====================
  // Store assignments globally for modal access
  let lastLoadedAssignments = [];
  
  // Track notifications marked as read locally (for syncing later)
  const localReadNotifications = JSON.parse(localStorage.getItem('localReadNotifications') || '[]');
  
  const state = {
    student: studentData,
    availableCourses: [],
    notifications: [],
    courses: {
      'web-dev': {
        materials: [
          {
            id: 'vid1',
            title: "Lecture 1: HTML & CSS Fundamentals",
            type: "video",
            date: "2024-11-05",
            duration: "45:22",
            size: "120MB",
            url: "#"
          },
          // More materials would be loaded from server
        ]
      }
    },
    quizzes: {
      upcoming: [
        {
          id: 1,
          title: "Web Development Quiz 2",
          date: "2024-12-05",
          duration: "30 minutes",
          topics: "JavaScript, DOM, AJAX",
          status: "upcoming"
        }
      ],
      completed: [
        {
          id: 1,
          title: "AI Quiz 1",
          dateTaken: "2024-11-10",
          score: "85% (B+)",
          average: "72%",
          feedback: "Good understanding of basic concepts. Need more practice with neural network architectures."
        }
      ]
    }
  };

  // ==================== DOM ELEMENTS ====================
  const elements = {
    // Navigation
    hamburgerMenu: document.getElementById('hamburger-menu'),
    mainNav: document.getElementById('main-nav'),
    navLinks: document.querySelectorAll('#main-nav a:not(#logout-btn)'),
    sections: document.querySelectorAll('main > section'),
    logoutBtn: document.getElementById('logout-btn'),
    
    // Modals
    uploadModal: document.getElementById('upload-modal'),
    feedbackModal: document.getElementById('feedback-modal'),
    closeButtons: document.querySelectorAll('.close-modal'),
    
    // Assignments
    submitBtns: document.querySelectorAll('.submit-assignment-btn'),
    feedbackBtns: document.querySelectorAll('.view-feedback-btn'),
    uploadForm: document.getElementById('assignment-upload-form'),
    
    // Course Registration
    registerForm: document.getElementById('register-course-form'),
    courseSelect: document.getElementById('course-select'),
    filterLevel: document.getElementById('filter-level'),
    filterSemester: document.getElementById('filter-semester'),
    registeredCourses: document.getElementById('registered-courses'),
    
    // Notifications
    markAllReadBtn: document.getElementById('mark-all-read'),
    clearNotificationsBtn: document.getElementById('clear-notifications'),
    notificationTypeFilter: document.getElementById('notification-type-filter'),
    notificationList: document.querySelector('.notification-list'),
    
    // Profile
    editProfileBtn: document.querySelector('.edit-profile-btn'),
    changePasswordBtn: document.getElementById('changePasswordBtn')
  };

  // ==================== INITIALIZATION ====================
  function init() {
    console.log('INIT FUNCTION CALLED');
    
    // Initialize PWA features
    initializePWA();
    
    setupNavigation();
    setupModals();
    setupLogout();
    console.log('About to call setupAssignments...');
    setupAssignments();
    console.log('setupAssignments called');
    setupCourseRegistration();
    setupQuizzes();
    setupNotifications();
    setupProfile();
    
    // Load initial data
    loadRegisteredCourses();
    loadNotifications();
    updateUnreadCount();
    
    // Show first section by default
    if (elements.navLinks.length > 0) {
      elements.navLinks[0].click();
    }
  }

  // ==================== CORE FUNCTIONALITY ====================
  function setupNavigation() {
    // Mobile menu toggle
    elements.hamburgerMenu.addEventListener('click', function() {
      this.classList.toggle('active');
      elements.mainNav.classList.toggle('active');
    });

    // Section navigation
    elements.navLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetSection = this.getAttribute('data-section');
        
        // Update active section
        elements.sections.forEach(section => section.classList.remove('active'));
        document.getElementById(targetSection).classList.add('active');
        
        // Update active nav link
        elements.navLinks.forEach(lnk => lnk.classList.remove('active'));
        this.classList.add('active');
        
        // Load specific section data
        if (targetSection === 'notifications') {
          loadNotifications();
        } else if (targetSection === 'assignments') {
          loadAssignmentsFromAPI();
        } else if (targetSection === 'profile') {
          loadProfileFromAPI().then(() => {
            // Re-setup event listeners after profile is loaded
            setupProfileEventListeners();
          });
        }
        
        // Close mobile menu if open
        elements.hamburgerMenu.classList.remove('active');
        elements.mainNav.classList.remove('active');
      });
    });

 
  
  }

  function setupLogout() {
    if (elements.logoutBtn) {
      elements.logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Show confirmation dialog
        if (confirm('Are you sure you want to logout?')) {
          logout();
        }
      });
    }
  }

  function logout() {
    try {
      // Clear all authentication data
      localStorage.removeItem('token');
      localStorage.removeItem('studentData');
      localStorage.removeItem('userData');
      localStorage.removeItem('authToken');
      localStorage.removeItem('rememberedStudentId');
      localStorage.removeItem('isStudentLoggedIn');
      
      // Clear session storage
      sessionStorage.clear();
      
      // Show logout message
      showNotification('Logging out...', 'info');
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1000);
      
    } catch (error) {
      console.error('Error during logout:', error);
      // Still redirect even if there's an error
      window.location.href = 'login.html';
    }
  }

  function setupModals() {
    // Assignment submission modal
    elements.submitBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.uploadModal.style.display = 'block';
      });
    });
    
    // Feedback modal
    elements.feedbackBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.feedbackModal.style.display = 'block';
      });
    });
    
    // Close modals
    elements.closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.uploadModal.style.display = 'none';
        elements.feedbackModal.style.display = 'none';
      });
    });
    
    // Close when clicking outside
    window.addEventListener('click', (event) => {
      if (event.target === elements.uploadModal) elements.uploadModal.style.display = 'none';
      if (event.target === elements.feedbackModal) elements.feedbackModal.style.display = 'none';
    });
  }

  // ==================== ASSIGNMENTS ====================
  function setupAssignments() {
    console.log('=== SETUP ASSIGNMENTS FUNCTION CALLED ===');
    
    // Make the function globally accessible for debugging
    window.testAssignmentsAPI = loadAssignmentsFromAPI;
    
    console.log('About to call loadAssignmentsFromAPI...');
    // Load assignments from API when the dashboard loads
    loadAssignmentsFromAPI();
    console.log('loadAssignmentsFromAPI called');
    
    if (elements.uploadForm) {
      elements.uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const fileInput = document.getElementById('assignment-file');
        const comments = document.getElementById('assignment-comments').value;
        
        if (fileInput.files.length > 0) {
          const assignmentId = elements.uploadModal.dataset.assignmentId;
          if (!assignmentId) {
            showNotification('Assignment ID not found', 'error');
            return;
          }
          
          submitAssignmentToAPI(assignmentId, fileInput.files[0], comments);
        } else {
          showNotification('Please select a file to upload', 'error');
        }
      });
    }
  }

  async function submitAssignmentToAPI(assignmentId, file, comments) {
    try {
      console.log('Submitting assignment:', assignmentId);
      const token = localStorage.getItem('token');
      
      if (!token) {
        showNotification('Authentication required', 'error');
        return;
      }

      // Show loading state
      const submitButton = elements.uploadForm.querySelector('button[type="submit"]');
      const originalText = submitButton.innerHTML;
      submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
      submitButton.disabled = true;

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      if (comments) {
        formData.append('comments', comments);
      }

      console.log('Making submission API call...');
      const response = await fetch(`https://department-mangement-system-97wj.onrender.com/api/student/assignments/${assignmentId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type for FormData, let browser set it with boundary
        },
        body: formData
      });

      console.log('Submission response status:', response.status);

      if (response.status === 401) {
        localStorage.clear();
        window.location.href = 'login.html';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Submission failed' }));
        throw new Error(errorData.message || `Submission failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Submission successful:', result);

      // Show success message
      showNotification(`Assignment submitted successfully!`, 'success');
      
      // Close modal
      elements.uploadModal.style.display = 'none';
      
      // Reset form
      elements.uploadForm.reset();
      
      // Update the assignment card UI
      updateAssignmentCardAfterSubmission(assignmentId);
      
      // Reload assignments to get updated status
      loadAssignmentsFromAPI();

    } catch (error) {
      console.error('Assignment submission error:', error);
      showNotification(error.message || 'Failed to submit assignment', 'error');
    } finally {
      // Reset button state
      const submitButton = elements.uploadForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
      }
    }
  }

  function updateAssignmentCardAfterSubmission(assignmentId) {
    // Find the assignment card and update its status
    const assignmentCard = document.querySelector(`[data-assignment-id="${assignmentId}"]`)?.closest('.assignment-card');
    
    if (assignmentCard) {
      // Update status badge
      const statusBadge = assignmentCard.querySelector('.status');
      if (statusBadge) {
        statusBadge.textContent = 'Submitted';
        statusBadge.className = 'status submitted';
      }
      
      // Update submit button to view submission button
      const submitBtn = assignmentCard.querySelector('.submit-assignment-btn');
      if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-eye"></i> View Submission';
        submitBtn.classList.remove('submit-assignment-btn');
        submitBtn.classList.add('view-submission-btn');
        submitBtn.dataset.assignmentId = assignmentId;
      }
    }
  }

  async function loadAssignmentsFromAPI() {
    console.log('=== LOAD ASSIGNMENTS FROM API FUNCTION CALLED ===');
    try {
      console.log('Inside try block - Loading assignments from API...');
      const token = localStorage.getItem('token');
      console.log('Token found:', token ? 'Yes' : 'No');
      console.log('Full token:', token);
      
      if (!token) {
        console.log('No token found, skipping assignments load');
        return;
      }

      console.log('Making assignments API request...');
      const response = await fetch('https://department-mangement-system-97wj.onrender.com/api/student/assignments', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Assignments API response status:', response.status);
      console.log('Response headers:', response.headers);

      if (response.status === 401) {
        console.log('Unauthorized - clearing token and redirecting to login');
        localStorage.clear();
        window.location.href = 'login.html';
        return;
      }

      if (!response.ok) {
        console.error('API request failed:', response.status, response.statusText);
        throw new Error(`Failed to fetch assignments: ${response.status}`);
      }

      const assignmentsData = await response.json();
      console.log('Assignments API response:', assignmentsData);

      // Handle the expected response format with assignments array
      let assignments = [];
      if (assignmentsData && Array.isArray(assignmentsData.assignments)) {
        assignments = assignmentsData.assignments;
      } else if (Array.isArray(assignmentsData)) {
        assignments = assignmentsData;
      } else if (assignmentsData && Array.isArray(assignmentsData.data)) {
        assignments = assignmentsData.data;
      }

      console.log('Found', assignments.length, 'assignments');
      
      if (assignments.length > 0) {
        populateAssignments(assignments);
      } else {
        // Show empty state
        const assignmentsContainer = document.querySelector('.assignments-grid');
        if (assignmentsContainer) {
          assignmentsContainer.innerHTML = `
            <div class="no-assignments-message">
              <p>No assignments available at this time.</p>
            </div>
          `;
        }
      }

    } catch (error) {
      console.error('Error loading assignments:', error);
      showNotification('Failed to load assignments', 'error');
    }
  }

  function populateAssignments(assignments) {
    console.log('Populating assignments in UI...');
    
    // Store assignments globally for modal access
    lastLoadedAssignments = assignments;
    
    // Find the assignments container in the DOM
    const assignmentsContainer = document.querySelector('.assignments-grid');
    const filterTabs = document.querySelectorAll('.filter-tab');

    if (!assignmentsContainer) {
      console.error('Assignments container not found in DOM');
      return;
    }

    // Clear existing assignments
    assignmentsContainer.innerHTML = '';

    if (!assignments || assignments.length === 0) {
      assignmentsContainer.innerHTML = `
        <div class="no-assignments-message">
          <p>No assignments available at this time.</p>
        </div>
      `;
      return;
    }

    // Make sure filter tabs are visible
    const filtersContainer = document.querySelector('.assignment-filters');
    if (filtersContainer) {
      filtersContainer.style.display = 'flex';
    }

    console.log('Found assignments container:', assignmentsContainer);
    // Clear existing assignments
    assignmentsContainer.innerHTML = '';

    if (!assignments || assignments.length === 0) {
      assignmentsContainer.innerHTML = `
        <div class="no-assignments-message">
          <p>No assignments available at this time.</p>
        </div>
      `;
      return;
    }

    // Setup filter functionality
    setupAssignmentFilters();

    assignments.forEach((assignment, index) => {
      console.log(`Processing assignment ${index + 1}:`, assignment);
      
      const assignmentCard = document.createElement('div');
      assignmentCard.className = 'assignment-card card';
      
      // Extract assignment data based on the actual response structure
      const title = assignment.title || 'Untitled Assignment';
      const description = assignment.description || 'No description available';
      const dueDate = assignment.due_date;
      const course = assignment.course_id || {};
      const courseName = course.title || 'Unknown Course';
      const courseCode = course.code || 'N/A';
      const creditHours = course.credit_hours || 3;
      const submissionStatus = assignment.submissionStatus || 'not_submitted';
      const lecturer = assignment.created_by || assignment.assignment?.lecturer || {};
      const lecturerName = lecturer.name || 'Unknown Lecturer';
      const assignmentLevel = assignment.assignment?.level || 'N/A';
      const semester = assignment.assignment?.semester || 'N/A';
      const submission = assignment.submission || {};
      const grade = submission.grade;
      
      // Format due date
      let dueDateFormatted = 'No due date';
      let isOverdue = false;
      if (dueDate) {
        try {
          const date = new Date(dueDate);
          const now = new Date();
          isOverdue = date < now && submissionStatus === 'not_submitted';
          dueDateFormatted = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch (e) {
          dueDateFormatted = dueDate;
        }
      }

      // Determine status display
      let statusClass = submissionStatus;
      let statusText = submissionStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      if (isOverdue) {
        statusClass = 'overdue';
        statusText = 'Overdue';
      }

      // Check if assignment has a file using helper function
      const hasAssignmentFile = getAssignmentFileUrl(assignment);

      assignmentCard.innerHTML = `
        <div class="assignment-header">
          <span class="status ${statusClass}">${statusText}</span>
        </div>
        <div class="assignment-details">
          <p class="course-info">
            <strong>${courseCode}</strong> - ${courseName}
          </p>
          <div class="assignment-meta">
            <div class="meta-row">
              <span class="due-date ${isOverdue ? 'overdue' : ''}">
                <i class="fas fa-calendar"></i> Due: ${dueDateFormatted}
              </span>
            </div>
            ${grade !== undefined ? `
            <div class="meta-row">
              <span class="grade" style="
                padding: 4px 12px;
                border-radius: 12px;
                background-color: ${grade >= 70 ? '#d4edda' : grade >= 50 ? '#fff3cd' : '#f8d7da'};
                color: ${grade >= 70 ? '#155724' : grade >= 50 ? '#856404' : '#721c24'};
                font-weight: bold;
              ">
                <i class="fas fa-star"></i> Grade: ${grade}%
              </span>
            </div>
            ` : ''}
            ${hasAssignmentFile ? `
            <div class="meta-row">
              <span class="file-indicator" style="color: #2196f3; font-weight: bold;">
                <i class="fas fa-paperclip"></i> Assignment file attached
              </span>
            </div>
            ` : ''}
          </div>
        </div>
        <div class="assignment-actions">
          ${submissionStatus === 'not_submitted' ? 
            `<button class="submit-assignment-btn" data-assignment-id="${assignment._id}">
              <i class="fas fa-upload"></i> Submit Assignment
            </button>` :
            `<button class="view-submission-btn" data-assignment-id="${assignment._id}">
              <i class="fas fa-eye"></i> View Submission
            </button>`
          }
          <button class="view-details-btn" data-assignment-id="${assignment._id}">
            <i class="fas fa-info-circle"></i> View Details
          </button>
        </div>
      `;

      assignmentsContainer.appendChild(assignmentCard);
    });

    console.log(`Successfully populated ${assignments.length} assignments`);
    
    // Re-attach event listeners for new buttons
    setupAssignmentButtons();
  }

  function setupAssignmentButtons() {
    // Setup submit assignment buttons
    document.querySelectorAll('.submit-assignment-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const assignmentId = e.target.closest('.submit-assignment-btn').dataset.assignmentId;
        openSubmissionModal(assignmentId);
      });
    });

    // Setup view submission buttons
    document.querySelectorAll('.view-submission-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const assignmentId = e.target.closest('.view-submission-btn').dataset.assignmentId;
        viewSubmission(assignmentId);
      });
    });

    // Setup view details buttons
    document.querySelectorAll('.view-details-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const assignmentId = e.target.closest('.view-details-btn').dataset.assignmentId;
        showAssignmentDetails(assignmentId);
      });
    });
  }

  function openSubmissionModal(assignmentId) {
    console.log('Opening submission modal for assignment:', assignmentId);
    const modal = elements.uploadModal;
    if (modal) {
      modal.style.display = 'block';
      modal.dataset.assignmentId = assignmentId;
    }
  }

  function viewSubmission(assignmentId) {
    console.log('Viewing submission for assignment:', assignmentId);
    
    // Find assignment from last loaded assignments
    const assignment = lastLoadedAssignments?.find(a => a._id === assignmentId);
    if (!assignment || !assignment.submission) {
      showNotification('No submission found for this assignment.', 'error');
      return;
    }

    const submissionData = assignment.submission;
    
    // Create modal
    let modal = document.getElementById('submission-view-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'submission-view-modal';
      modal.className = 'modal';
      modal.style.cssText = `
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.4);
      `;
      document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
      <div class="modal-content" style="
        background-color: #fefefe;
        margin: 5% auto;
        padding: 20px;
        border: none;
        border-radius: 10px;
        width: 80%;
        max-width: 600px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      ">
        <span class="close-modal" style="
          color: #aaa;
          float: right;
          font-size: 28px;
          font-weight: bold;
          cursor: pointer;
          line-height: 1;
        ">&times;</span>
        
        <div class="submission-content">
          <h2 style="color: #2c3e50; margin-bottom: 20px; border-bottom: 2px solid #27ae60; padding-bottom: 10px;">
            <i class="fas fa-check-circle" style="color: #27ae60;"></i> 
            Submission for ${assignment.title}
          </h2>
          
          <div class="submission-details" style="display: grid; gap: 15px;">
            ${submissionData.fileUrl ? `
              <div class="detail-item" style="
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #3498db;
              ">
                <strong style="color: #34495e; display: block; margin-bottom: 8px;">
                  <i class="fas fa-file-alt"></i> Submitted File:
                </strong>
                <a href="${submissionData.fileUrl}" download style="
                  background-color: #3498db;
                  color: white;
                  text-decoration: none;
                  padding: 10px 15px;
                  border-radius: 5px;
                  display: inline-block;
                  transition: background-color 0.3s;
                " onmouseover="this.style.backgroundColor='#2980b9'" onmouseout="this.style.backgroundColor='#3498db'">
                  <i class="fas fa-download"></i> Download Submitted File
                </a>
              </div>
            ` : ''}
            
            ${submissionData.comments ? `
              <div class="detail-item" style="
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #9b59b6;
              ">
                <strong style="color: #34495e; display: block; margin-bottom: 8px;">
                  <i class="fas fa-comment"></i> Your Comments:
                </strong>
                <p style="
                  margin: 0;
                  line-height: 1.6;
                  font-style: italic;
                  color: #555;
                  background-color: white;
                  padding: 10px;
                  border-radius: 4px;
                ">"${submissionData.comments}"</p>
              </div>
            ` : `
              <div class="detail-item">
                <strong style="color: #34495e;">Comments:</strong> 
                <span style="color: #7f8c8d;">No comments provided</span>
              </div>
            `}
            
            <div class="detail-item" style="
              background-color: ${submissionData.grade !== undefined ? (submissionData.grade >= 70 ? '#d4edda' : submissionData.grade >= 50 ? '#fff3cd' : '#f8d7da') : '#e2e3e5'};
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid ${submissionData.grade !== undefined ? (submissionData.grade >= 70 ? '#28a745' : submissionData.grade >= 50 ? '#ffc107' : '#dc3545') : '#6c757d'};
            ">
              <strong style="color: #34495e; display: block; margin-bottom: 8px;">
                <i class="fas fa-star"></i> Grade:
              </strong>
              ${submissionData.grade !== undefined ? `
                <span style="
                  font-size: 24px;
                  font-weight: bold;
                  color: ${submissionData.grade >= 70 ? '#155724' : submissionData.grade >= 50 ? '#856404' : '#721c24'};
                ">
                  ${submissionData.grade}%
                </span>
                <div style="margin-top: 5px; font-size: 14px; color: #6c757d;">
                  ${submissionData.grade >= 70 ? 'Excellent work!' : submissionData.grade >= 50 ? 'Good effort!' : 'Keep improving!'}
                </div>
              ` : `
                <span style="color: #6c757d; font-style: italic;">
                  <i class="fas fa-clock"></i> Not graded yet - Please check back later
                </span>
              `}
            </div>
            
            ${submissionData.submittedAt ? `
              <div class="detail-item">
                <strong style="color: #34495e;">
                  <i class="fas fa-calendar-check"></i> Submitted On:
                </strong> 
                <span style="color: #27ae60;">${new Date(submissionData.submittedAt).toLocaleString()}</span>
              </div>
            ` : ''}
            
            ${submissionData.feedback ? `
              <div class="detail-item" style="
                background-color: #fff3cd;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #ffc107;
              ">
                <strong style="color: #34495e; display: block; margin-bottom: 8px;">
                  <i class="fas fa-comments"></i> Instructor Feedback:
                </strong>
                <p style="
                  margin: 0;
                  line-height: 1.6;
                  color: #856404;
                  background-color: white;
                  padding: 10px;
                  border-radius: 4px;
                ">${submissionData.feedback}</p>
              </div>
            ` : ''}
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <button onclick="document.getElementById('submission-view-modal').style.display='none'" style="
              background-color: #6c757d;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
              font-size: 16px;
            ">
              Close
            </button>
          </div>
        </div>
      </div>
    `;
    
    modal.style.display = 'block';

    // Close modal functionality
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.onclick = () => {
      modal.style.display = 'none';
    };
    
    // Close when clicking outside
    modal.onclick = (event) => {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    };
    
    // Handle download link clicks
    const downloadLinks = modal.querySelectorAll('a[download]');
    downloadLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        showNotification('Starting download...', 'success');
      });
    });
  }

  async function downloadAssignmentFile(assignmentId, fileName) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('Authentication required to download file', 'error');
        return;
      }

      // Show loading state
      showNotification('Downloading file...', 'info');

      const response = await fetch(`https://department-mangement-system-97wj.onrender.com/api/files/download/${assignmentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          showNotification('Session expired. Please login again.', 'error');
          localStorage.removeItem('token');
          window.location.href = 'login.html';
          return;
        } else if (response.status === 404) {
          showNotification('Assignment file not found', 'error');
          return;
        }
        throw new Error(`Download failed: ${response.status}`);
      }

      // Get the file blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'assignment-file';
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showNotification('File downloaded successfully', 'success');
      
    } catch (error) {
      console.error('Error downloading assignment file:', error);
      showNotification('Failed to download file', 'error');
    }
  }

  function getAssignmentFileInfo(assignment) {
    if (assignment.fileInfo) {
      return {
        hasFile: true,
        fileName: assignment.fileInfo.originalName || 'Assignment File',
        fileSize: assignment.fileInfo.size ? (assignment.fileInfo.size / 1024 / 1024).toFixed(2) + ' MB' : null,
        uploadDate: assignment.fileInfo.uploadDate ? new Date(assignment.fileInfo.uploadDate).toLocaleDateString() : null,
        downloadUrl: getAssignmentFileUrl(assignment)
      };
    }
    
    return {
      hasFile: !!getAssignmentFileUrl(assignment),
      fileName: 'Assignment File',
      fileSize: null,
      uploadDate: null,
      downloadUrl: getAssignmentFileUrl(assignment)
    };
  }

  function setupAssignmentFilters() {
    const filterTabs = document.querySelectorAll('.filter-tab');
    const assignmentsContainer = document.querySelector('.assignments-grid');
    
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Update active tab
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Get filter and apply it
        const filter = tab.dataset.filter;
        filterAssignments(filter, lastLoadedAssignments);
      });
    });
  }

  function filterAssignments(filter, assignments) {
    console.log('Filtering assignments by:', filter);
    const assignmentsContainer = document.querySelector('.assignments-grid');
    
    if (!assignmentsContainer || !assignments) {
      console.error('Container or assignments not found');
      return;
    }

    // Clear existing assignments
    assignmentsContainer.innerHTML = '';

    // Filter assignments based on the selected tab
    const filteredAssignments = assignments.filter(assignment => {
      const dueDate = new Date(assignment.due_date);
      const now = new Date();
      const isOverdue = dueDate < now && !assignment.submission;
      const isSubmitted = !!assignment.submission;
      const isGraded = isSubmitted && assignment.submission.grade !== undefined;

      switch(filter) {
        case 'all':
          return true;
        case 'overdue':
          return isOverdue;
        case 'not-submitted':
          return !isSubmitted && !isOverdue;
        case 'graded':
          return isGraded;
        default:
          return true;
      }
    });

    console.log('Filtered assignments:', filteredAssignments.length);

    if (filteredAssignments.length === 0) {
      // Show no assignments message
      assignmentsContainer.innerHTML = `
        <div class="no-assignments-message">
          <div style="text-align: center; padding: 20px; color: #666;">
            <i class="fas fa-search" style="font-size: 24px; margin-bottom: 10px;"></i>
            <p>No ${filter === 'all' ? '' : filter + ' '}assignments found.</p>
          </div>
        </div>
      `;
      return;
    }

    // Repopulate with filtered assignments
    populateAssignments(filteredAssignments);
  }

  function getAssignmentFileUrl(assignment) {
    // Priority 1: Check the specific API structure with fileInfo
    if (assignment.fileInfo && assignment.fileInfo.downloadUrl) {
      // Build full URL for the download endpoint
      const baseUrl = 'https://department-mangement-system-97wj.onrender.com';
      return baseUrl + assignment.fileInfo.downloadUrl;
    }
    
    // Priority 2: Check if fileInfo has other URL properties
    if (assignment.fileInfo) {
      if (assignment.fileInfo.url) return assignment.fileInfo.url;
      if (assignment.fileInfo.fileUrl) return assignment.fileInfo.fileUrl;
    }
    
    // Priority 3: Check other possible file field names (fallback)
    const fileFields = [
      'fileUrl', 'attachmentUrl', 'file', 'attachment', 'assignment_file',
      'attachments', 'files', 'document', 'documentUrl', 'resource', 'resourceUrl'
    ];
    
    for (const field of fileFields) {
      if (assignment[field]) {
        // If it's an array, take the first item
        if (Array.isArray(assignment[field]) && assignment[field].length > 0) {
          return assignment[field][0].url || assignment[field][0];
        }
        // If it's an object with url property
        if (typeof assignment[field] === 'object' && assignment[field].url) {
          return assignment[field].url;
        }
        // If it's a string
        if (typeof assignment[field] === 'string') {
          return assignment[field];
        }
      }
    }
    
    // Priority 4: Check nested assignment object
    if (assignment.assignment) {
      return getAssignmentFileUrl(assignment.assignment);
    }
    
    return null;
  }

  function showAssignmentDetails(assignmentId) {
    console.log('Showing details for assignment:', assignmentId);
    
    // Find assignment from last loaded assignments
    const assignment = lastLoadedAssignments?.find(a => a._id === assignmentId);
    if (!assignment) {
      showNotification('Assignment details not found.', 'error');
      return;
    }

    // Debug: Log all possible file fields
    console.log('Assignment file fields:');
    console.log('- fileInfo:', assignment.fileInfo);
    console.log('- fileUrl:', assignment.fileUrl);
    console.log('- attachmentUrl:', assignment.attachmentUrl);
    console.log('- file:', assignment.file);
    console.log('- attachment:', assignment.attachment);
    console.log('- assignment_file:', assignment.assignment_file);
    console.log('- attachments:', assignment.attachments);
    console.log('- files:', assignment.files);
    console.log('- Full assignment data:', assignment);
    
    // Get the file URL and info using helper functions
    const assignmentFileUrl = getAssignmentFileUrl(assignment);
    const fileInfo = getAssignmentFileInfo(assignment);
    console.log('- Detected file URL:', assignmentFileUrl);
    console.log('- File info:', fileInfo);

    // Create modal
    let modal = document.getElementById('assignment-details-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'assignment-details-modal';
      modal.className = 'modal';
      modal.style.cssText = `
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.4);
      `;
      document.body.appendChild(modal);
    }

    const course = assignment.course_id || {};
    const lecturer = assignment.created_by || assignment.assignment?.lecturer || {};
    const submissionData = assignment.submission;
    
    modal.innerHTML = `
      <div class="modal-content" style="
        background-color: #fefefe;
        margin: 5% auto;
        padding: 20px;
        border: none;
        border-radius: 10px;
        width: 80%;
        max-width: 600px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        max-height: 80vh;
        overflow-y: auto;
      ">
        <span class="close-modal" style="
          color: #aaa;
          float: right;
          font-size: 28px;
          font-weight: bold;
          cursor: pointer;
          line-height: 1;
        ">&times;</span>
        
        <div class="assignment-details-content">
          <h2 style="color: #2c3e50; margin-bottom: 20px; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            ${assignment.title}
          </h2>
          
          <div class="details-grid" style="display: grid; gap: 15px;">
            <div class="detail-item">
              <strong style="color: #34495e;">Course:</strong> 
              <span>${course.code} - ${course.title}</span>
            </div>
            
            <div class="detail-item">
              <strong style="color: #34495e;">Description:</strong> 
              <p style="margin: 5px 0; line-height: 1.6;">${assignment.description}</p>
            </div>
            
            <div class="detail-item">
              <strong style="color: #34495e;">Due Date:</strong> 
              <span style="color: ${new Date(assignment.due_date) < new Date() ? '#e74c3c' : '#27ae60'};">
                ${new Date(assignment.due_date).toLocaleString()}
              </span>
            </div>
            
            <div class="detail-item">
              <strong style="color: #34495e;">Lecturer:</strong> 
              <span>${lecturer.name || 'N/A'}</span>
            </div>
            
            <div class="detail-item">
              <strong style="color: #34495e;">Level:</strong> 
              <span>Level ${assignment.assignment?.level || 'N/A'}</span>
            </div>
            
            <div class="detail-item">
              <strong style="color: #34495e;">Semester:</strong> 
              <span>${assignment.assignment?.semester || 'N/A'}</span>
            </div>
            
            <div class="detail-item">
              <strong style="color: #34495e;">Credits:</strong> 
              <span>${course.credit_hours || 3} Credits</span>
            </div>
            
            ${fileInfo.hasFile ? `
              <div class="detail-item" style="
                background-color: #e8f4fd;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #2196f3;
              ">
                <strong style="color: #34495e; display: block; margin-bottom: 8px;">
                  <i class="fas fa-paperclip"></i> Assignment File (from Lecturer):
                </strong>
                <div style="margin-bottom: 10px;">
                  <div style="font-size: 14px; color: #555; margin-bottom: 4px;">
                    <strong>File:</strong> ${fileInfo.fileName}
                  </div>
                  ${fileInfo.fileSize ? `
                  <div style="font-size: 14px; color: #555; margin-bottom: 4px;">
                    <strong>Size:</strong> ${fileInfo.fileSize}
                  </div>
                  ` : ''}
                  ${fileInfo.uploadDate ? `
                  <div style="font-size: 14px; color: #555; margin-bottom: 4px;">
                    <strong>Uploaded:</strong> ${fileInfo.uploadDate}
                  </div>
                  ` : ''}
                </div>
                <button onclick="downloadAssignmentFile('${assignment._id}', '${fileInfo.fileName}')" style="
                  background-color: #2196f3;
                  color: white;
                  border: none;
                  padding: 8px 12px;
                  border-radius: 5px;
                  cursor: pointer;
                  transition: background-color 0.3s;
                  font-size: 14px;
                " onmouseover="this.style.backgroundColor='#1976d2'" onmouseout="this.style.backgroundColor='#2196f3'">
                  <i class="fas fa-download"></i> Download ${fileInfo.fileName}
                </button>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">
                  Download this file to view the complete assignment instructions and requirements.
                </p>
              </div>
            ` : ''}
            
            <div class="detail-item">
              <strong style="color: #34495e;">Status:</strong> 
              <span class="status-badge" style="
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                background-color: ${assignment.submissionStatus === 'submitted' ? '#d4edda' : '#f8d7da'};
                color: ${assignment.submissionStatus === 'submitted' ? '#155724' : '#721c24'};
              ">
                ${assignment.submissionStatus?.replace('_', ' ').toUpperCase() || 'NOT SUBMITTED'}
              </span>
            </div>
            
            ${submissionData ? `
              <div class="submission-details" style="
                border-top: 1px solid #ddd;
                padding-top: 15px;
                margin-top: 15px;
              ">
                <h3 style="color: #2c3e50; margin-bottom: 10px;">Submission Details</h3>
                
                ${submissionData.fileUrl ? `
                  <div class="detail-item">
                    <strong style="color: #34495e;">Submitted File:</strong> 
                    <a href="${submissionData.fileUrl}" download style="
                      color: #3498db;
                      text-decoration: none;
                      padding: 5px 10px;
                      border: 1px solid #3498db;
                      border-radius: 4px;
                      display: inline-block;
                      margin-left: 10px;
                    ">
                      <i class="fas fa-download"></i> Download File
                    </a>
                  </div>
                ` : ''}
                
                ${submissionData.comments ? `
                  <div class="detail-item">
                    <strong style="color: #34495e;">Comments:</strong> 
                    <p style="margin: 5px 0; line-height: 1.6; font-style: italic;">${submissionData.comments}</p>
                  </div>
                ` : ''}
                
                ${submissionData.grade !== undefined ? `
                  <div class="detail-item">
                    <strong style="color: #34495e;">Grade:</strong> 
                    <span style="
                      font-size: 18px;
                      font-weight: bold;
                      color: ${submissionData.grade >= 70 ? '#27ae60' : submissionData.grade >= 50 ? '#f39c12' : '#e74c3c'};
                    ">
                      ${submissionData.grade}%
                    </span>
                  </div>
                ` : `
                  <div class="detail-item">
                    <strong style="color: #34495e;">Grade:</strong> 
                    <span style="color: #7f8c8d;">Not graded yet</span>
                  </div>
                `}
                
                ${submissionData.submittedAt ? `
                  <div class="detail-item">
                    <strong style="color: #34495e;">Submitted On:</strong> 
                    <span>${new Date(submissionData.submittedAt).toLocaleString()}</span>
                  </div>
                ` : ''}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
    
    modal.style.display = 'block';

    // Close modal functionality
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.onclick = () => {
      modal.style.display = 'none';
    };
    
    // Close when clicking outside
    modal.onclick = (event) => {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    };
    
    // Handle download link clicks
    const downloadLinks = modal.querySelectorAll('a[download]');
    downloadLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        showNotification('Starting download...', 'success');
      });
    });
  }

  // ==================== COURSE REGISTRATION ====================
  function setupCourseRegistration() {
    if (!elements.registerForm || !elements.courseSelect) return;

    // Display student's current level
    const studentLevelElement = document.getElementById('student-current-level');
    if (studentLevelElement && state.student) {
      studentLevelElement.textContent = `Level ${state.student.level}`;
    }

    // Remove level and semester selectors since we use student's data
    const levelSelect = document.getElementById('level');
    const semesterSelect = document.getElementById('semester');
    
    if (levelSelect && semesterSelect) {
      // Remove required attributes to prevent validation errors
      levelSelect.removeAttribute('required');
      semesterSelect.removeAttribute('required');
      
      // Hide the form row with level and semester selectors
      const formRow = levelSelect.closest('.form-row');
      if (formRow) {
        formRow.style.display = 'none';
      }
    }

    // Load available courses from API using student's current level
    loadAvailableCourses();

    // Load available courses from API
    async function loadAvailableCourses() {
      const loadingElement = document.getElementById('loading-courses');
      
      try {
        if (loadingElement) loadingElement.style.display = 'block';
        
        const token = localStorage.getItem('token');
        if (!token) {
          showNotification('Authentication token not found. Please login again.', 'error');
          return;
        }

        const response = await fetch('https://department-mangement-system-97wj.onrender.com/api/student/courses/available', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Token expired or invalid
            localStorage.clear();
            window.location.href = 'login.html';
            return;
          }
          throw new Error(`Failed to fetch courses: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Available courses:', data);
        
        // Store courses data in state
        state.availableCourses = data;
        
        // Populate courses directly based on student's level and current semester
        populateAvailableCourses(data);
        
        // Enable form interactions
        setupCourseSelectionHandlers();
        
      } catch (error) {
        console.error('Error loading available courses:', error);
        showNotification('Failed to load available courses. Please try again.', 'error');
      } finally {
        if (loadingElement) loadingElement.style.display = 'none';
      }
    }

    function populateAvailableCourses(coursesData) {
      if (!state.student) {
        console.error('Student data not available');
        elements.courseSelect.innerHTML = '<option disabled>Student data not available</option>';
        return;
      }

      const studentLevel = state.student.level;
      
      elements.courseSelect.innerHTML = '';

      // Handle the specific API response format
      let courses = [];
      
      if (coursesData && Array.isArray(coursesData.courses)) {
        courses = coursesData.courses;
      } else if (Array.isArray(coursesData)) {
        courses = coursesData;
      } else if (coursesData && Array.isArray(coursesData.data)) {
        courses = coursesData.data;
      }

      console.log('Processed courses data:', courses);
      console.log('Student level:', studentLevel);

      if (!Array.isArray(courses) || courses.length === 0) {
        const option = document.createElement('option');
        if (courses && courses.length === 0) {
          option.textContent = `No courses available for Level ${studentLevel}. Please contact your academic advisor.`;
        } else {
          option.textContent = 'No courses available';
        }
        option.disabled = true;
        elements.courseSelect.appendChild(option);
        
        // Show a more detailed message to the user
        if (courses && courses.length === 0) {
          showNotification(`No courses found for Level ${studentLevel}. This might be because courses haven't been added for your level yet.`, 'info');
        }
        
        console.log('Empty courses array for level:', studentLevel, 'API response:', coursesData);
        return;
      }

      // Filter courses by student's level (comparing with assignment.level)
      const availableCourses = courses.filter(course => {
        const courseLevel = course.assignment?.level || course.level || course.Level;
        return courseLevel && courseLevel.toString() === studentLevel.toString();
      });

      console.log('Filtered courses for level', studentLevel, ':', availableCourses);

      if (availableCourses.length === 0) {
        const option = document.createElement('option');
        option.textContent = `No courses available for Level ${studentLevel}. Please contact your academic advisor.`;
        option.disabled = true;
        elements.courseSelect.appendChild(option);
        
        // Show informative message
        showNotification(`No courses are currently available for Level ${studentLevel}. This could mean:
        • Courses for your level haven't been published yet
        • Registration period may not have started
        • All courses for your level may be full
        Please contact your academic advisor for assistance.`, 'info');
        
        console.log('No courses match student level:', studentLevel, 'Available courses:', courses);
        return;
      }

      // Group courses by semester and type
      const firstSemesterCourses = availableCourses.filter(course => {
        const semester = course.assignment?.semester || course.semester;
        return semester && (semester.toString().toLowerCase() === 'first' || semester.toString() === '1');
      });
      
      const secondSemesterCourses = availableCourses.filter(course => {
        const semester = course.assignment?.semester || course.semester;
        return semester && (semester.toString().toLowerCase() === 'second' || semester.toString() === '2');
      });

      // Add courses grouped by semester
      if (firstSemesterCourses.length > 0) {
        addCourseGroup('First Semester Courses', firstSemesterCourses);
      }
      if (secondSemesterCourses.length > 0) {
        addCourseGroup('Second Semester Courses', secondSemesterCourses);
      }

      // If no clear semester grouping, show all courses
      if (firstSemesterCourses.length === 0 && secondSemesterCourses.length === 0) {
        addCourseGroup('Available Courses', availableCourses);
      }
    }

    function addCourseGroup(label, courses) {
      const group = document.createElement('optgroup');
      group.label = label;
      
      courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course._id;
        
        const courseCode = course.code || course.courseCode || 'N/A';
        const courseName = course.title || course.name || course.courseName || 'Unknown Course';
        
        option.textContent = `${courseCode} - ${courseName}`;
        option.setAttribute('data-credits', course.credit_hours || course.credits || 3);
        option.setAttribute('data-code', courseCode);
        option.setAttribute('data-name', courseName);
        option.setAttribute('data-semester', course.assignment?.semester || course.semester || '1');
        option.setAttribute('data-lecturer', course.assignment?.lecturer?.name || 'TBA');
        option.setAttribute('data-registered', course.isRegistered || false);
        
        // Disable if already registered
        if (course.isRegistered) {
          option.disabled = true;
          option.textContent += ' (Already Registered)';
        }
        
        group.appendChild(option);
      });
      
      elements.courseSelect.appendChild(group);
    }

    function addCourseOption(course) {
      const option = document.createElement('option');
      option.value = course._id;
      
      const courseCode = course.code || course.courseCode || 'N/A';
      const courseName = course.title || course.name || course.courseName || 'Unknown Course';
      
      option.textContent = `${courseCode} - ${courseName}`;
      option.setAttribute('data-credits', course.credit_hours || course.credits || 3);
      option.setAttribute('data-code', courseCode);
      option.setAttribute('data-name', courseName);
      option.setAttribute('data-semester', course.assignment?.semester || course.semester || '1');
      option.setAttribute('data-lecturer', course.assignment?.lecturer?.name || 'TBA');
      option.setAttribute('data-registered', course.isRegistered || false);
      
      // Disable if already registered
      if (course.isRegistered) {
        option.disabled = true;
        option.textContent += ' (Already Registered)';
      }
      
      elements.courseSelect.appendChild(option);
    }

    function setupCourseSelectionHandlers() {
      // Select All button
      const selectAllBtn = document.querySelector('.select-all-btn');
      const clearSelectionBtn = document.querySelector('.clear-selection-btn');
      const submitBtn = document.querySelector('#register-course-form .submit-btn');
      const courseInfoDisplay = document.querySelector('.course-info-display');
      
      if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function() {
          const options = elements.courseSelect.querySelectorAll('option:not([disabled])');
          options.forEach(option => option.selected = true);
          updateCourseSelection();
        });
      }
      
      if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', function() {
          elements.courseSelect.selectedIndex = -1;
          updateCourseSelection();
        });
      }
      
      // Course selection change handler
      if (elements.courseSelect) {
        elements.courseSelect.addEventListener('change', updateCourseSelection);
      }
      
      function updateCourseSelection() {
        const selectedOptions = Array.from(elements.courseSelect.selectedOptions);
        const selectedCount = selectedOptions.length;
        let totalCredits = 0;
        
        selectedOptions.forEach(option => {
          const credits = parseInt(option.getAttribute('data-credits')) || 3;
          totalCredits += credits;
        });
        
        // Update display
        if (courseInfoDisplay) {
          const countSpan = courseInfoDisplay.querySelector('.selected-count span');
          const creditsSpan = courseInfoDisplay.querySelector('.total-credits span');
          
          if (countSpan) countSpan.textContent = selectedCount;
          if (creditsSpan) creditsSpan.textContent = totalCredits;
          
          courseInfoDisplay.style.display = selectedCount > 0 ? 'block' : 'none';
        }
        
        // Enable/disable submit button
        if (submitBtn) {
          submitBtn.disabled = selectedCount === 0;
        }
      }
    }

    function updateAvailableCourses() {
      const level = document.getElementById('level').value;
      const semester = document.getElementById('semester').value;
      
      if (!level || !semester || !state.availableCourses) {
        elements.courseSelect.innerHTML = '<option value="" disabled>Please select level and semester first</option>';
        return;
      }

      elements.courseSelect.innerHTML = '';

      // Filter courses by selected level and semester
      const filteredCourses = state.availableCourses.filter(course => 
        course.level === level && course.semester === semester
      );

      if (filteredCourses.length === 0) {
        const option = document.createElement('option');
        option.textContent = 'No courses available for this selection';
        option.disabled = true;
        elements.courseSelect.appendChild(option);
        return;
      }

      // Group courses by type (core/elective)
      const coreGroup = document.createElement('optgroup');
      coreGroup.label = 'Core Courses';
      
      const electiveGroup = document.createElement('optgroup');
      electiveGroup.label = 'Elective Courses';

      let hasCorecourses = false;
      let hasElectiveCourses = false;

      filteredCourses.forEach(course => {
        const option = document.createElement('option');
        option.value = course._id || course.id;
        option.textContent = `${course.courseCode} - ${course.courseName}`;
        option.setAttribute('data-credits', course.credits || 3);
        option.setAttribute('data-code', course.courseCode);
        option.setAttribute('data-name', course.courseName);
        
        // Determine if core or elective (adjust based on API response)
        if (course.type === 'core' || course.isCore || course.courseType === 'Core') {
          coreGroup.appendChild(option);
          hasCoreServices = true;
        } else {
          electiveGroup.appendChild(option);
          hasElectiveCourses = true;
        }
      });

      // Add groups to select element
      if (hasCoreServices) {
        elements.courseSelect.appendChild(coreGroup);
      }
      if (hasElectiveCourses) {
        elements.courseSelect.appendChild(electiveGroup);
      }
      
      // If no clear distinction, add all as ungrouped
      if (!hasCoreServices && !hasElectiveCourses) {
        filteredCourses.forEach(course => {
          const option = document.createElement('option');
          option.value = course._id || course.id;
          option.textContent = `${course.courseCode} - ${course.courseName}`;
          option.setAttribute('data-credits', course.credits || 3);
          option.setAttribute('data-code', course.courseCode);
          option.setAttribute('data-name', course.courseName);
          elements.courseSelect.appendChild(option);
        });
      }
    }

    // Form submission
    elements.registerForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const selectedOptions = Array.from(elements.courseSelect.selectedOptions);
      
      if (selectedOptions.length === 0) {
        showNotification('Please select at least one course', 'error');
        return;
      }

      const submitBtn = this.querySelector('.submit-btn');
      const originalText = submitBtn.innerHTML;
      
      try {
        // Disable submit button and show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
        
        const token = localStorage.getItem('token');
        if (!token) {
          showNotification('Authentication token not found. Please login again.', 'error');
          return;
        }

        // Register each selected course
        const registrationPromises = selectedOptions.map(async (option) => {
          const courseId = option.value;
          const courseCode = option.getAttribute('data-code');
          const courseName = option.getAttribute('data-name');
          
          console.log('Attempting to register course:', {
            courseId,
            courseCode,
            courseName,
            studentLevel: state.student.level,
            studentDepartment: state.student.department
          });
          
          const response = await fetch('https://department-mangement-system-97wj.onrender.com/api/student/courses/register', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              course_id: courseId
            })
          });

          if (!response.ok) {
            if (response.status === 401) {
              localStorage.clear();
              window.location.href = 'login.html';
              return null;
            }
            const errorData = await response.json();
            
            // Log detailed error information
            console.error('Registration failed for course:', {
              courseId,
              courseCode,
              courseName,
              status: response.status,
              error: errorData
            });
            
            // Provide more specific error messages
            let errorMessage = errorData.message || `Failed to register for ${courseCode} - ${courseName}`;
            
            if (errorMessage.includes('Course assignment not found') || 
                errorMessage.includes('not available for your department/level')) {
              errorMessage = `${courseCode} - ${courseName}: This course is not available for your current level (${state.student.level}) or department (${state.student.department?.name || state.student.department?.code || 'Unknown'}). Please contact your academic advisor.`;
            }
            
            throw new Error(errorMessage);
          }

          const result = await response.json();
          console.log('Successfully registered for course:', {
            courseId,
            courseCode,
            courseName,
            result
          });
          
          return result;
        });

        // Wait for all registrations to complete
        const results = await Promise.all(registrationPromises);
        
        // Filter out null results (authentication failures)
        const successfulRegistrations = results.filter(result => result !== null);
        
        if (successfulRegistrations.length > 0) {
          // Remove "no courses" message if present
          const noCoursesMsg = document.getElementById('no-courses-message');
          if (noCoursesMsg) noCoursesMsg.remove();
          
          // Add successfully registered courses to the UI
          selectedOptions.forEach((option, index) => {
            if (results[index] !== null) {
              const courseId = option.value;
              const courseCode = option.getAttribute('data-code');
              const courseName = option.getAttribute('data-name');
              const semester = option.getAttribute('data-semester');
              const courseGroup = option.parentElement.label;
              const credits = option.getAttribute('data-credits') || 3;
              
              // Check if course is already registered to avoid duplicates
              const existingCourse = document.querySelector(`[data-course-id="${courseId}"]`);
              if (!existingCourse) {
                const newCourse = document.createElement('li');
                newCourse.className = 'course-item';
                newCourse.setAttribute('data-level', state.student.level);
                newCourse.setAttribute('data-semester', semester);
                newCourse.setAttribute('data-course-id', courseId);
                newCourse.innerHTML = `
                  <div class="course-info">
                    <span class="course-code">${courseCode}</span>
                    <span class="course-name">${courseName}</span>
                    <span class="course-type">${courseGroup || 'Course'}</span>
                  </div>
                  <div class="course-meta">
                    <span class="level-badge">Level ${state.student.level}</span>
                  </div>
                  <span class="credits-tag">${credits} Credits</span>
                  <button class="drop-course-btn" title="Drop Course">
                    <i class="fas fa-times"></i>
                  </button>
                `;
                
                newCourse.querySelector('.drop-course-btn').addEventListener('click', () => {
                  dropCourse(newCourse, courseId);
                });
                
                elements.registeredCourses.appendChild(newCourse);
              }
            }
          });
          
          // Clear selection and update UI
          elements.courseSelect.selectedIndex = -1;
          updateCourseCount();
          filterRegisteredCourses();
          
          // Update course selection display
          const courseInfoDisplay = document.querySelector('.course-info-display');
          if (courseInfoDisplay) {
            courseInfoDisplay.style.display = 'none';
          }
          
          showNotification(`Successfully registered for ${successfulRegistrations.length} course(s)!`, 'success');
        }
        
      } catch (error) {
        console.error('Registration error:', error);
        
        // Check if it's a specific course assignment error
        if (error.message.includes('Course assignment not found') || 
            error.message.includes('not available for your department/level')) {
          showNotification(`Registration failed: ${error.message}`, 'error');
          
          // Suggest refreshing the course list
          const refreshBtn = document.createElement('button');
          refreshBtn.textContent = 'Refresh Available Courses';
          refreshBtn.className = 'refresh-courses-btn';
          refreshBtn.onclick = () => {
            loadAvailableCourses();
            refreshBtn.remove();
          };
          
          // Add refresh button after the course select
          const courseSelectContainer = elements.courseSelect.parentElement;
          if (courseSelectContainer && !courseSelectContainer.querySelector('.refresh-courses-btn')) {
            courseSelectContainer.appendChild(refreshBtn);
          }
        } else {
          showNotification(error.message || 'An error occurred during registration. Please try again.', 'error');
        }
      } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });

    // Filter registered courses
    function filterRegisteredCourses() {
      const levelValue = elements.filterLevel.value;
      let totalCredits = 0;
      let hasVisibleCourses = false;
      
      document.querySelectorAll('.course-item').forEach(item => {
        const itemLevel = item.getAttribute('data-level');
        const levelMatch = levelValue === 'all' || itemLevel === levelValue;
        
        if (levelMatch) {
          item.style.display = 'flex';
          // Get credits from the credits tag
          const creditsTag = item.querySelector('.credits-tag');
          if (creditsTag) {
            const creditsText = creditsTag.textContent;
            const credits = parseInt(creditsText.match(/\d+/)?.[0]) || 3;
            totalCredits += credits;
          }
          hasVisibleCourses = true;
        } else {
          item.style.display = 'none';
        }
      });
      
      document.getElementById('total-credits').textContent = totalCredits;
      
      // Show empty state if no courses
      const noCoursesMsg = document.getElementById('no-courses-message');
      if (!hasVisibleCourses && !noCoursesMsg) {
        const msg = document.createElement('p');
        msg.id = 'no-courses-message';
        msg.textContent = 'No courses found matching your filters';
        msg.style.textAlign = 'center';
        msg.style.padding = '20px';
        msg.style.color = '#666';
        elements.registeredCourses.appendChild(msg);
      } else if (hasVisibleCourses && noCoursesMsg) {
        noCoursesMsg.remove();
      }
    }

    // Initialize filters
    if (elements.filterLevel) {
      elements.filterLevel.addEventListener('change', filterRegisteredCourses);
      // Hide semester filter since we're not using it anymore
      const semesterFilter = elements.filterSemester;
      if (semesterFilter && semesterFilter.parentElement) {
        semesterFilter.parentElement.style.display = 'none';
      }
    }
  }

  // ==================== NOTIFICATIONS ====================
  function setupNotifications() {
    if (!elements.markAllReadBtn) return;

    // Mark all as read
    elements.markAllReadBtn.addEventListener('click', async function() {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          showNotification('Authentication required', 'error');
          return;
        }

        const response = await fetch('https://department-mangement-system-97wj.onrender.com/api/student/mark-all-read', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            showNotification('Session expired. Please login again.', 'error');
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Update local state
        state.notifications.forEach(notification => {
          notification.isRead = true;
        });

        // Update UI
        document.querySelectorAll('.notification-list li.unread').forEach(item => {
          item.classList.remove('unread');
        });
        updateUnreadCount();
        showNotification('All notifications marked as read', 'success');
        
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
        showNotification('Failed to mark all notifications as read', 'error');
      }
    });

    // Clear all notifications
    elements.clearNotificationsBtn.addEventListener('click', function() {
      if (confirm('Are you sure you want to clear all notifications?')) {
        document.querySelectorAll('.notification-list li').forEach(item => {
          item.remove();
        });
        updateUnreadCount();
        showNotification('All notifications cleared', 'success');
      }
    });

    // Filter notifications
    elements.notificationTypeFilter.addEventListener('change', function() {
      const filterValue = this.value;
      document.querySelectorAll('.notification-list li').forEach(item => {
        const category = item.querySelector('.notification-icon').className.includes('assignment') ? 'assignment' :
                        item.querySelector('.notification-icon').className.includes('quiz') ? 'quiz' : 'other';
        
        if (filterValue === 'all' || category === filterValue) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    });

    // Attach mark as read event listeners
    attachMarkAsReadListeners();
  }

  function displayNotifications() {
    const notificationList = elements.notificationList;
    if (!notificationList) return;

    // Clear existing notifications
    notificationList.innerHTML = '';

    if (!state.notifications || state.notifications.length === 0) {
      notificationList.innerHTML = `
        <li class="no-notifications">
          <div class="notification-content">
            <i class="fas fa-bell-slash"></i>
            <p>No notifications yet</p>
          </div>
        </li>
      `;
      return;
    }

    // Sort notifications by date (newest first)
    const sortedNotifications = [...state.notifications].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    sortedNotifications.forEach(notification => {
      const li = document.createElement('li');
      li.className = notification.isRead ? '' : 'unread';
      li.setAttribute('data-notification-id', notification.id);
      
      const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      };

      li.innerHTML = `
        <div class="notification-content">
          <div class="notification-header">
            <h4>${notification.title}</h4>
            <span class="notification-time">${formatDate(notification.createdAt)}</span>
          </div>
          <p>${notification.message}</p>
          ${!notification.isRead ? '<button class="mark-read-btn">Mark as Read</button>' : ''}
        </div>
      `;

      notificationList.appendChild(li);
    });

    // Re-attach event listeners for mark as read buttons
    attachMarkAsReadListeners();
  }

  function attachMarkAsReadListeners() {
    // Mark as read buttons
    document.querySelectorAll('.mark-read-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const notificationItem = this.closest('li');
        const notificationId = notificationItem.dataset.notificationId;
        
        if (!notificationId) {
          console.error('Notification ID not found');
          return;
        }

        try {
          const token = localStorage.getItem('token');
          if (!token) {
            showNotification('Authentication required', 'error');
            return;
          }

          // Try to mark as read on server first
          try {
            const response = await fetch(`https://department-mangement-system-97wj.onrender.com/api/student/notifications/${notificationId}/read`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            if (!response.ok) {
              if (response.status === 401) {
                showNotification('Session expired. Please login again.', 'error');
                localStorage.removeItem('token');
                window.location.href = 'login.html';
                return;
              }
              // If 404 or other error, fall back to local marking
              console.warn(`Server endpoint not available (${response.status}). Marking as read locally.`);
              throw new Error('Server endpoint not available');
            }
          } catch (serverError) {
            // Server API not available, mark locally and store for later sync
            console.warn('Marking notification as read locally:', serverError.message);
            
            // Add to local read notifications for future sync
            if (!localReadNotifications.includes(notificationId)) {
              localReadNotifications.push(notificationId);
              localStorage.setItem('localReadNotifications', JSON.stringify(localReadNotifications));
            }
          }

          // Update local state (always do this regardless of server response)
          const notification = state.notifications.find(n => n.id === notificationId);
          if (notification) {
            notification.isRead = true;
          }

          // Update UI (always do this)
          notificationItem.classList.remove('unread');
          this.remove(); // Remove the "Mark as Read" button
          updateUnreadCount();
          showNotification('Notification marked as read', 'success');
          
        } catch (error) {
          console.error('Error marking notification as read:', error);
          showNotification('Failed to mark notification as read', 'error');
        }
      });
    });
  }

  async function loadNotifications() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('Authentication required', 'error');
        return;
      }

      const response = await fetch('https://department-mangement-system-97wj.onrender.com/api/student/notifications', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          showNotification('Session expired. Please login again.', 'error');
          localStorage.removeItem('token');
          window.location.href = 'login.html';
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Clear existing notifications
      state.notifications = [];
      
      // Process notifications from API
      if (data.notifications && Array.isArray(data.notifications)) {
        state.notifications = data.notifications.map(notification => {
          const notificationId = notification._id || notification.id;
          // Check if this notification was marked as read locally
          const isLocallyRead = localReadNotifications.includes(notificationId);
          
          return {
            id: notificationId,
            title: notification.title || 'No Title',
            message: notification.message || notification.content || 'No message',
            type: notification.type || 'info',
            isRead: notification.isRead || notification.read || isLocallyRead || false,
            createdAt: notification.createdAt || notification.timestamp || new Date().toISOString()
          };
        });
      }

      // Update the notification display
      displayNotifications();
      updateUnreadCount();
      
    } catch (error) {
      console.error('Error loading notifications:', error);
      showNotification('Failed to load notifications', 'error');
    }
  }

  function updateUnreadCount() {
    const unreadCount = document.querySelectorAll('.notification-list li.unread').length;
    document.querySelector('.notification-stats .stat-item:nth-child(1) span').innerHTML = 
      `<strong>Unread:</strong> ${unreadCount}`;
  }

  // ==================== PROFILE ====================
  async function setupProfile() {
    console.log('setupProfile called');
    await loadProfileFromAPI();
    console.log('About to call setupProfileEventListeners');
    setupProfileEventListeners();
    
    // Also set up event delegation for the change password button
    document.addEventListener('click', function(e) {
      if (e.target && e.target.id === 'changePasswordBtn') {
        console.log('Change password button clicked via event delegation!');
        e.preventDefault();
        showChangePasswordModal();
      }
    });
  }

  async function loadProfileFromAPI() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('Authentication required', 'error');
        return;
      }

      const response = await fetch('https://department-mangement-system-97wj.onrender.com/api/auth/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          showNotification('Session expired. Please login again.', 'error');
          localStorage.removeItem('token');
          window.location.href = 'login.html';
          return;
        }
        throw new Error(`Failed to load profile: ${response.status}`);
      }

      const profileData = await response.json();
      console.log('Profile data from API:', profileData);

      // Update global state - handle the specific API structure
      state.student = profileData.user || profileData;

      // Update UI
      updateProfileDisplay();

    } catch (error) {
      console.error('Error loading profile:', error);
      showNotification('Failed to load profile data', 'error');
    }
  }

  function updateProfileDisplay() {
    if (!state.student) return;

    // Update profile header information
    const profileInfo = document.querySelector('.profile-info');
    if (profileInfo) {
      profileInfo.innerHTML = `
        <h3>${state.student.name || 'Student'}</h3>
        <p class="program">${state.student.department_id?.name || 'Department'}</p>
        <p class="university">Student ID: ${state.student.studentId || 'N/A'}</p>
        <div class="profile-status">
          <span class="status-badge active">Active</span>
          <span class="id-number">${state.student.studentId || 'N/A'}</span>
        </div>
      `;
    }

    // Update academic information
    const academicInfo = document.querySelector('.detail-section:first-of-type ul');
    if (academicInfo) {
      academicInfo.innerHTML = `
        <li>
          <span class="detail-label">Department:</span>
          <span class="detail-value">${state.student.department_id?.name || 'N/A'} ${state.student.department_id?.code ? '(' + state.student.department_id.code + ')' : ''}</span>
        </li>
        <li>
          <span class="detail-label">Level:</span>
          <span class="detail-value">${state.student.level || 'N/A'}</span>
        </li>
        <li>
          <span class="detail-label">Student ID:</span>
          <span class="detail-value">${state.student.studentId || 'N/A'}</span>
        </li>
        <li>
          <span class="detail-label">Last Login:</span>
          <span class="detail-value">${state.student.lastLogin ? new Date(state.student.lastLogin).toLocaleString() : 'N/A'}</span>
        </li>
        <li>
          <span class="detail-label">Account Created:</span>
          <span class="detail-value">${state.student.createdAt ? new Date(state.student.createdAt).toLocaleDateString() : 'N/A'}</span>
        </li>
      `;
    }

    // Update personal information
    const personalInfo = document.querySelector('.detail-section:last-of-type ul');
    if (personalInfo) {
      personalInfo.innerHTML = `
        <li>
          <span class="detail-label">Full Name:</span>
          <span class="detail-value">${state.student.name || 'N/A'}</span>
        </li>
        <li>
          <span class="detail-label">Email:</span>
          <span class="detail-value">${state.student.email || 'N/A'}</span>
        </li>
        <li>
          <span class="detail-label">Role:</span>
          <span class="detail-value">${state.student.role || 'Student'}</span>
        </li>
        <li>
          <span class="detail-label">User ID:</span>
          <span class="detail-value">${state.student._id || 'N/A'}</span>
        </li>
        <li>
          <span class="detail-label">Profile Updated:</span>
          <span class="detail-value">${state.student.updatedAt ? new Date(state.student.updatedAt).toLocaleDateString() : 'N/A'}</span>
        </li>
      `;
    }
  }

  function setupProfileEventListeners() {
    console.log('Setting up profile event listeners...');
    
    // Try to find the button again if it wasn't found initially
    if (!elements.changePasswordBtn) {
      elements.changePasswordBtn = document.getElementById('changePasswordBtn');
    }
    
    console.log('changePasswordBtn element:', elements.changePasswordBtn);
    
    // Edit profile button
    if (elements.editProfileBtn) {
      elements.editProfileBtn.addEventListener('click', function() {
        showNotification('Edit profile functionality coming soon', 'info');
      });
    }

    // Change password button
    if (elements.changePasswordBtn) {
      console.log('Adding click listener to change password button');
      // Remove any existing listeners to avoid duplicates
      const newButton = elements.changePasswordBtn.cloneNode(true);
      elements.changePasswordBtn.parentNode.replaceChild(newButton, elements.changePasswordBtn);
      elements.changePasswordBtn = newButton;
      
      elements.changePasswordBtn.addEventListener('click', function() {
        console.log('Change password button clicked!');
        showChangePasswordModal();
      });
    } else {
      console.error('Change password button not found! Element is:', elements.changePasswordBtn);
      // Try to find it with different selectors
      const altButton = document.querySelector('#changePasswordBtn') || 
                       document.querySelector('.change-password-btn') ||
                       document.querySelector('button[id*="password"]');
      console.log('Alternative button search result:', altButton);
    }
  }

  function showChangePasswordModal() {
    // Create modal
    let modal = document.getElementById('change-password-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'change-password-modal';
      modal.className = 'modal';
      modal.style.cssText = `
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.4);
      `;
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-content" style="
        background-color: #fefefe;
        margin: 10% auto;
        padding: 20px;
        border: none;
        border-radius: 10px;
        width: 80%;
        max-width: 500px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      ">
        <span class="close-modal" style="
          color: #aaa;
          float: right;
          font-size: 28px;
          font-weight: bold;
          cursor: pointer;
          line-height: 1;
        ">&times;</span>
        
        <h2 style="color: #2c3e50; margin-bottom: 20px;">Change Password</h2>
        
        <form id="change-password-form">
          <div class="form-group" style="margin-bottom: 15px;">
            <label for="current-password" style="display: block; margin-bottom: 5px; font-weight: bold;">Current Password:</label>
            <input type="password" id="current-password" required style="
              width: 100%;
              padding: 10px;
              border: 1px solid #ddd;
              border-radius: 5px;
              font-size: 14px;
            ">
          </div>
          
          <div class="form-group" style="margin-bottom: 15px;">
            <label for="new-password" style="display: block; margin-bottom: 5px; font-weight: bold;">New Password:</label>
            <input type="password" id="new-password" required style="
              width: 100%;
              padding: 10px;
              border: 1px solid #ddd;
              border-radius: 5px;
              font-size: 14px;
            ">
          </div>
          
          <div class="form-group" style="margin-bottom: 20px;">
            <label for="confirm-password" style="display: block; margin-bottom: 5px; font-weight: bold;">Confirm New Password:</label>
            <input type="password" id="confirm-password" required style="
              width: 100%;
              padding: 10px;
              border: 1px solid #ddd;
              border-radius: 5px;
              font-size: 14px;
            ">
          </div>
          
          <div style="text-align: right;">
            <button type="button" class="cancel-btn" style="
              background-color: #6c757d;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
              margin-right: 10px;
            ">Cancel</button>
            <button type="submit" class="submit-btn" style="
              background-color: #007bff;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
            ">Change Password</button>
          </div>
        </form>
      </div>
    `;

    // Show modal
    modal.style.display = 'block';

    // Add event listeners
    modal.querySelector('.close-modal').addEventListener('click', function() {
      modal.style.display = 'none';
    });

    modal.querySelector('.cancel-btn').addEventListener('click', function() {
      modal.style.display = 'none';
    });

    modal.querySelector('#change-password-form').addEventListener('submit', handlePasswordChange);

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    });
  }

  async function handlePasswordChange(event) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Validate passwords
    if (newPassword !== confirmPassword) {
      showNotification('New passwords do not match', 'error');
      return;
    }
    
    if (newPassword.length < 6) {
      showNotification('New password must be at least 6 characters long', 'error');
      return;
    }
    
    const submitBtn = event.target.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Changing...';
    submitBtn.disabled = true;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('Authentication required', 'error');
        return;
      }

      const response = await fetch('https://department-mangement-system-97wj.onrender.com/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: currentPassword,
          newPassword: newPassword
        })
      });

      console.log('Password change response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.log('Password change error response:', errorData);
        
        if (response.status === 401) {
          showNotification('Current password is incorrect', 'error');
          return;
        } else if (response.status === 403) {
          showNotification('Session expired. Please login again.', 'error');
          localStorage.removeItem('token');
          window.location.href = 'login.html';
          return;
        }
        throw new Error(errorData.message || `Password change failed: ${response.status}`);
      }

      const result = await response.json();
      showNotification('Password changed successfully', 'success');
      
      // Close modal
      document.getElementById('change-password-modal').style.display = 'none';
      
      // Clear form
      document.getElementById('change-password-form').reset();
      
    } catch (error) {
      console.error('Error changing password:', error);
      showNotification('Failed to change password', 'error');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  // ==================== HELPER FUNCTIONS ====================
  function loadRegisteredCourses() {
    // Load registered courses from API
    loadRegisteredCoursesFromAPI();
  }

  async function loadRegisteredCoursesFromAPI() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping registered courses load');
        return;
      }

      const response = await fetch('https://department-mangement-system-97wj.onrender.com/api/student/courses/registered', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.clear();
          window.location.href = 'login.html';
          return;
        }
        throw new Error('Failed to fetch registered courses');
      }

      const registeredCourses = await response.json();
      console.log('Registered courses API response:', registeredCourses);

      // Clear existing courses
      elements.registeredCourses.innerHTML = '';

      // Handle different response formats
      let courses = [];
      if (Array.isArray(registeredCourses)) {
        courses = registeredCourses;
      } else if (registeredCourses && Array.isArray(registeredCourses.courses)) {
        courses = registeredCourses.courses;
      } else if (registeredCourses && Array.isArray(registeredCourses.data)) {
        courses = registeredCourses.data;
      }

      if (Array.isArray(courses) && courses.length > 0) {
        courses.forEach(registration => {
          const courseEl = document.createElement('li');
          courseEl.className = 'course-item';
          
          // Handle different data structures - course might be nested or direct
          const course = registration.course || registration;
          const assignment = course.assignment || {};
          
          const courseId = course._id || registration._id || registration.courseId;
          const courseCode = course.code || course.courseCode || 'N/A';
          const courseName = course.title || course.name || course.courseName || 'Unknown Course';
          const level = assignment.level || course.level || state.student?.level || 'N/A';
          const credits = course.credit_hours || course.credits || 3;
          const lecturer = assignment.lecturer?.name || 'TBA';
          
          courseEl.setAttribute('data-level', level);
          courseEl.setAttribute('data-course-id', courseId);
          
          courseEl.innerHTML = `
            <div class="course-info">
              <span class="course-code">${courseCode}</span>
              <span class="course-name">${courseName}</span>
              <span class="course-type">Registered Course</span>
              <small class="lecturer-info">Lecturer: ${lecturer}</small>
            </div>
            <div class="course-meta">
              <span class="level-badge">Level ${level}</span>
            </div>
            <span class="credits-tag">${credits} Credits</span>
            <button class="drop-course-btn" title="Drop Course">
              <i class="fas fa-times"></i>
            </button>
          `;
          
          courseEl.querySelector('.drop-course-btn').addEventListener('click', () => {
            dropCourse(courseEl, courseId);
          });
          
          elements.registeredCourses.appendChild(courseEl);
        });
      } else {
        // Show empty state message
        const emptyMessage = document.createElement('p');
        emptyMessage.id = 'no-courses-message';
        emptyMessage.textContent = 'No courses registered yet';
        emptyMessage.style.textAlign = 'center';
        emptyMessage.style.padding = '20px';
        emptyMessage.style.color = '#666';
        elements.registeredCourses.appendChild(emptyMessage);
      }
      
      updateCourseCount();
      
    } catch (error) {
      console.error('Error loading registered courses:', error);
      // Don't show error notification for this as it's background loading
    }
  }

  function dropCourse(courseItem, courseId) {
    const courseName = courseItem.querySelector('.course-name').textContent;
    const modal = document.createElement('div');
    modal.className = 'confirmation-modal';
    modal.innerHTML = `
      <div class="confirmation-modal-content">
        <h3>Drop ${courseName}</h3>
        <p>Are you sure you want to drop ${courseName}? This action cannot be undone.</p>
        <div class="modal-actions">
          <button class="cancel-btn">Cancel</button>
          <button class="confirm-btn danger-btn">Yes, Drop Course</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.cancel-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.querySelector('.confirm-btn').addEventListener('click', async () => {
      const confirmBtn = modal.querySelector('.confirm-btn');
      const originalText = confirmBtn.textContent;
      
      try {
        // Show loading state
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Dropping...';
        
        // If courseId is provided, make API call to drop the course
        if (courseId) {
          const token = localStorage.getItem('token');
          if (!token) {
            showNotification('Authentication token not found. Please login again.', 'error');
            return;
          }

          const response = await fetch(`https://department-mangement-system-97wj.onrender.com/api/student/courses/drop`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              course_id: courseId
            })
          });

          if (!response.ok) {
            if (response.status === 401) {
              localStorage.clear();
              window.location.href = 'login.html';
              return;
            }
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to drop course');
          }

          const result = await response.json();
          console.log('Course dropped successfully:', result);
        }
        
        // Remove from UI
        courseItem.remove();
        updateCourseCount();
        filterRegisteredCourses();
        showNotification(`${courseName} has been dropped successfully`, 'success');
        document.body.removeChild(modal);
        
      } catch (error) {
        console.error('Error dropping course:', error);
        showNotification(error.message || 'Failed to drop course. Please try again.', 'error');
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
      }
    });
  }

  function updateCourseCount() {
    const count = document.querySelectorAll('.course-item').length;
    const badge = document.querySelector('.badge');
    if (badge) badge.textContent = count;
  }

  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
  }

  // ==================== PWA FUNCTIONALITY ====================
  function initializePWA() {
    console.log('Initializing PWA features...');
    
    // Check for PWA support
    if ('serviceWorker' in navigator) {
      console.log('Service Worker supported');
      
      // Service worker will be registered from HTML to avoid duplicate registration
      
      // Listen for service worker messages
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      }
      
      // Handle service worker updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker controller changed');
        // Optionally reload the page or show update notification
      });
    }
    
    // Add network status detection
    addNetworkStatusDetection();
    
    // Add mobile-specific enhancements
    addMobileEnhancements();
    
    console.log('PWA initialization complete');
  }
  
  function handleServiceWorkerMessage(event) {
    const { type, payload } = event.data;
    
    switch (type) {
      case 'CACHE_UPDATED':
        console.log('App cache updated');
        break;
      case 'OFFLINE_MODE':
        showOfflineNotification();
        break;
      case 'SYNC_DATA':
        // Handle background sync
        break;
    }
  }
  
  function addNetworkStatusDetection() {
    // Network status indicator
    const createNetworkIndicator = () => {
      const indicator = document.createElement('div');
      indicator.id = 'network-indicator';
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        padding: 8px 15px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
        z-index: 1001;
        transition: all 0.3s ease;
        display: none;
      `;
      document.body.appendChild(indicator);
      return indicator;
    };
    
    const indicator = createNetworkIndicator();
    
    const updateNetworkStatus = () => {
      if (navigator.onLine) {
        indicator.style.background = '#4CAF50';
        indicator.style.color = 'white';
        indicator.textContent = '🌐 Online';
        indicator.style.display = 'block';
        setTimeout(() => {
          indicator.style.display = 'none';
        }, 2000);
      } else {
        indicator.style.background = '#f44336';
        indicator.style.color = 'white';
        indicator.textContent = '📴 Offline';
        indicator.style.display = 'block';
      }
    };
    
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
  }
  
  function addMobileEnhancements() {
    // Prevent zoom on input focus (iOS)
    const addNoZoomViewport = () => {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea');
        inputs.forEach(input => {
          input.addEventListener('focus', () => {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0');
          });
          input.addEventListener('blur', () => {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, user-scalable=no');
          });
        });
      }
    };
    
    // Add touch feedback for mobile
    const addTouchFeedback = () => {
      const addTouchClass = (e) => e.target.classList.add('touching');
      const removeTouchClass = (e) => e.target.classList.remove('touching');
      
      document.addEventListener('touchstart', addTouchClass);
      document.addEventListener('touchend', removeTouchClass);
      document.addEventListener('touchcancel', removeTouchClass);
    };
    
    // Improve scrolling on iOS
    const improveScrolling = () => {
      document.body.style.webkitOverflowScrolling = 'touch';
    };
    
    addNoZoomViewport();
    addTouchFeedback();
    improveScrolling();
  }
  
  function showOfflineNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff9800;
      color: white;
      padding: 15px;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 1000;
      max-width: 300px;
    `;
    notification.innerHTML = `
      <strong>📴 You're offline</strong><br>
      Some features may be limited. Content will sync when you're back online.
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  function generateCourseCode(courseId, level) {
    const prefixes = {
      'introduction-to-programming': 'CS101',
      'computer-fundamentals': 'CS102',
      // ... other course codes
    };
    return prefixes[courseId] || `CS${level}XX`;
  }

  // Initialize the application
  init();
});
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
      toast.classList.add('show');
  }, 100);
  
  setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
          toast.remove();
      }, 300);
  }, 3000);
}

function logoutUser() {
  // Clear storage
  localStorage.removeItem('token');
  localStorage.removeItem('studentData');
  localStorage.removeItem('rememberedStudentId');
  localStorage.removeItem('isStudentLoggedIn');
  sessionStorage.clear();
  
  // Show logout message
  showToast('Logging out...', 'info');
  
  // Redirect after short delay
  setTimeout(() => {
      window.location.href = 'login.html';
  }, 1000);
}