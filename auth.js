const form = document.getElementById('auth-form');
const toggle = document.getElementById('auth-toggle');
const title = document.getElementById('auth-title');
const errorDiv = document.getElementById('auth-error');
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');

let isLogin = true;

function setMode(login) {
  isLogin = login;
  title.textContent = login ? 'Login' : 'Sign Up';
  form.querySelector('button[type="submit"]').textContent = login ? 'Login' : 'Sign Up';
  toggle.textContent = login ? "Don't have an account? Sign Up" : "Already have an account? Login";
  errorDiv.textContent = '';
}

toggle.addEventListener('click', () => setMode(!isLogin));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorDiv.textContent = '';
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    errorDiv.textContent = 'Email and password required.';
    return;
  }
  try {
    const endpoint = isLogin ? '/login' : '/signup';
    const res = await fetch(`http://localhost:5000${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      errorDiv.textContent = data.error || 'Something went wrong.';
      return;
    }
    if (isLogin) {
      localStorage.setItem('token', data.token);
      window.location.href = 'index.html';
    } else {
      setMode(true);
      errorDiv.textContent = 'Account created! Please log in.';
      form.reset();
    }
  } catch (err) {
    errorDiv.textContent = 'Network error.';
  }
}); 