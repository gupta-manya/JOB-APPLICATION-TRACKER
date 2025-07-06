const cors = require("cors");
require("dotenv").config();
console.log("Loaded API Key:", process.env.OPENROUTER_API_KEY);
console.log("Loaded MONGODB_URI:", process.env.MONGODB_URI);
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


const fetch = require("node-fetch");


const app = express();


app.use(cors({
  origin: "https://effervescent-valkyrie-36ffc5.netlify.app", 
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));



app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("Connected to MongoDB Atlas"))
.catch((err) => console.error("MongoDB connection error:", err));

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model("User", userSchema);

// Job model
const jobSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: String,
  company: String,
  status: String,
  notes: String
});
const Job = mongoose.model('Job', jobSchema);

app.post("/chat", async (req, res) => {
  const { userInput } = req.body;
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:5000", // Optional but recommended
        "X-Title": "job-application-tracker"     // Your project name
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1-0528:free",
        messages: [
          { role: "system", content: "You are a helpful assistant that guides users on job applications." },
          { role: "user", content: userInput }
        ]
      })
    });
    
    const data = await response.json();
    console.log(" OpenAI Response:", JSON.stringify(data, null, 2));

    res.json(data);
  } catch (error) {
    console.error("OpenAI API Error:", error);
    res.status(500).json({ error: "Something went wrong with OpenAI." });
  }
});

// Signup endpoint
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: "Email already registered" });
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashed });
    await user.save();
    res.status(201).json({ message: "User created" });
  } catch (err) {
    res.status(500).json({ error: "Signup failed" });
  }
});

// Login endpoint
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// JWT auth middleware
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Get all jobs for logged-in user
app.get('/jobs', auth, async (req, res) => {
  const jobs = await Job.find({ user: req.user.userId });
  res.json(jobs);
});

// Add a new job
app.post('/jobs', auth, async (req, res) => {
  const { role, company, status, notes } = req.body;
  const job = new Job({ user: req.user.userId, role, company, status, notes });
  await job.save();
  res.status(201).json(job);
});

// Update a job
app.put('/jobs/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { role, company, status, notes } = req.body;
  const job = await Job.findOneAndUpdate(
    { _id: id, user: req.user.userId },
    { role, company, status, notes },
    { new: true }
  );
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// Delete a job
app.delete('/jobs/:id', auth, async (req, res) => {
  const { id } = req.params;
  const job = await Job.findOneAndDelete({ _id: id, user: req.user.userId });
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ message: 'Job deleted' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
