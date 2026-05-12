function showTab(tab) {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginTab = document.getElementById('tab-login');
  const registerTab = document.getElementById('tab-register');

  if (tab === 'login') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    loginTab.style.borderBottom = '2px solid var(--gloss-blue)';
    loginTab.style.color = 'var(--gloss-blue)';
    registerTab.style.borderBottom = 'none';
    registerTab.style.color = 'var(--text-muted)';
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    registerTab.style.borderBottom = '2px solid var(--gloss-blue)';
    registerTab.style.color = 'var(--gloss-blue)';
    loginTab.style.borderBottom = 'none';
    loginTab.style.color = 'var(--text-muted)';
  }
}

function showError(message) {
  const errorEl = document.getElementById('auth-error');
  errorEl.textContent = message;
  errorEl.style.display = 'block';
  document.getElementById('auth-success').style.display = 'none';
}

function showSuccess(message) {
  const successEl = document.getElementById('auth-success');
  successEl.textContent = message;
  successEl.style.display = 'block';
  document.getElementById('auth-error').style.display = 'none';
}

async function login(event) {
  event.preventDefault();

  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  try {
    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('bgg_user', JSON.stringify(data.user));
      currentUser = data.user;
      updateNav();
      showSuccess('Login successful! Redirecting...');
      setTimeout(() => window.location.href = '/', 1000);
    } else {
      showError(data.error);
    }
  } catch (err) {
    showError('Login failed. Please try again.');
  }
}

async function register(event) {
  event.preventDefault();

  const username = document.getElementById('register-username').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;

  try {
    const response = await fetch(`${API_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await response.json();

    if (response.ok) {
      showSuccess('Registration successful! You can now login.');
      setTimeout(() => showTab('login'), 1500);
    } else {
      showError(data.error);
    }
  } catch (err) {
    showError('Registration failed. Please try again.');
  }
}
