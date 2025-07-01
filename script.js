const form = document.getElementById("job-form");
const tableBody = document.querySelector("#job-table tbody");
let jobs = JSON.parse(localStorage.getItem("jobs")) || [];
let statusChart = null;

// Motivational Quotes Feature
const motivationalQuotes = [
  "Success is not final, failure is not fatal: It is the courage to continue that counts.",
  "Opportunities don't happen, you create them.",
  "The future depends on what you do today.",
  "Don't watch the clock; do what it does. Keep going.",
  "Believe you can and you're halfway there.",
  "Dream big and dare to fail.",
  "Your limitation—it's only your imagination.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Success doesn't just find you. You have to go out and get it."
];

function showRandomQuote() {
  const quote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
  document.getElementById('motivational-quote').textContent = quote;
}

document.addEventListener('DOMContentLoaded', showRandomQuote);

function getStatusCounts() {
  const counts = { Applied: 0, Interviewing: 0, Offer: 0, Rejected: 0 };
  jobs.forEach(job => {
    if (counts[job.status] !== undefined) counts[job.status]++;
  });
  return counts;
}

function renderStatusChart() {
  const ctx = document.getElementById('statusChart').getContext('2d');
  const counts = getStatusCounts();
  const data = {
    labels: Object.keys(counts),
    datasets: [{
      data: Object.values(counts),
      backgroundColor: [
        '#6c63ff',
        '#48c6ef',
        '#43e97b',
        '#ff6b6b'
      ],
      borderWidth: 1
    }]
  };
  if (statusChart) {
    statusChart.data = data;
    statusChart.update();
  } else {
    statusChart = new Chart(ctx, {
      type: 'pie',
      data,
      options: {
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
}

const filterStatus = document.getElementById('filter-status');
const filterSearch = document.getElementById('filter-search');

function getFilteredJobs() {
  const status = filterStatus.value;
  const search = filterSearch.value.trim().toLowerCase();
  return jobs.filter(job => {
    const matchesStatus = !status || job.status === status;
    const matchesSearch = !search || job.role.toLowerCase().includes(search) || job.company.toLowerCase().includes(search);
    return matchesStatus && matchesSearch;
  });
}

function renderJobs() {
  tableBody.innerHTML = "";
  const filteredJobs = getFilteredJobs();
  filteredJobs.forEach((job, index) => {
    const row = `
      <tr>
        <td>${job.role}</td>
        <td>${job.company}</td>
        <td>${job.status}</td>
        <td>${job.notes || ''}</td>
        <td>
          <button onclick="editJob(${jobs.indexOf(job)})">Edit</button>
          <button onclick="deleteJob(${jobs.indexOf(job)})">Delete</button>
        </td>
      </tr>`;
    tableBody.innerHTML += row;
  });
  renderStatusChart();
}

let editIndex = null;

function editJob(index) {
  const job = jobs[index];
  document.getElementById("role").value = job.role;
  document.getElementById("company").value = job.company;
  document.getElementById("status").value = job.status;
  document.getElementById("notes").value = job.notes || '';
  editIndex = index;
  form.querySelector('button[type="submit"]').textContent = "Update Job";
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const role = document.getElementById("role").value;
  const company = document.getElementById("company").value;
  const status = document.getElementById("status").value;
  const notes = document.getElementById("notes").value;
  if (editIndex !== null) {
    jobs[editIndex] = { role, company, status, notes };
    editIndex = null;
    form.querySelector('button[type="submit"]').textContent = "Add Job";
  } else {
    jobs.push({ role, company, status, notes });
  }
  localStorage.setItem("jobs", JSON.stringify(jobs));
  renderJobs();
  form.reset();
});

function deleteJob(index) {
  jobs.splice(index, 1);
  localStorage.setItem("jobs", JSON.stringify(jobs));
  renderJobs();
}

filterStatus.addEventListener('change', renderJobs);
filterSearch.addEventListener('input', renderJobs);

async function sendMessage() {
  const userInput = document.getElementById("user-input").value;
  if (!userInput) return;

  const chatWindow = document.getElementById("chat-window");
  chatWindow.innerHTML += `<p><strong>You:</strong> ${userInput}</p>`;
  document.getElementById("user-input").value = "";

  try {
    const response = await fetch("http://localhost:5000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userInput })
    });

    const data = await response.json();
    const botReply = data?.choices?.[0]?.message?.content || "Sorry, I couldn't get a response.";

    chatWindow.innerHTML += `<p><strong>Bot:</strong> ${botReply}</p>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (err) {
    console.error("Chatbot fetch error:", err);
    chatWindow.innerHTML += `<p><strong>Bot:</strong> Error contacting backend</p>`;
  }
}

// Redirect to auth.html if not logged in
if (!localStorage.getItem('token')) {
  window.location.href = 'auth.html';
}

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('token');
  window.location.href = 'auth.html';
});