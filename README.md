# Todo API – SIT753 DevOps Pipeline

A simple Todo REST API built with Node.js + Express, used to demonstrate a full 7-stage Jenkins CI/CD pipeline.

---

## Pipeline Stages

| # | Stage | Tool | Purpose |
|---|-------|------|---------|
| 1 | Build | npm | Install dependencies, create versioned `.tar.gz` artifact |
| 2 | Test | Jest + Supertest | Unit & integration tests with coverage |
| 3 | Code Quality | ESLint (+ optional SonarQube) | Code style, structure, maintainability |
| 4 | Security | npm audit | CVE scan of all dependencies |
| 5 | Deploy | PM2 | Deploy to staging (port 3001) |
| 6 | Release | PM2 + Git tag | Promote to production (port 3002), tag release |
| 7 | Monitoring | Node.js script + Prometheus | Health checks, metrics, alerting |

---

## Prerequisites – Install These First

### 1. Node.js (v18+ recommended)
```bash
# Check if installed
node --version
npm --version
```
Download from: https://nodejs.org

### 2. PM2 (Process Manager – used for Deploy & Release stages)
```bash
npm install -g pm2
pm2 --version
```

### 3. Git
```bash
git --version
```

### 4. Jenkins (already running at localhost:8080)
Required Jenkins plugins (Manage Jenkins → Plugins → Available):
- **Pipeline** (usually pre-installed)
- **Git plugin**
- **Workspace Cleanup** (`ws-cleanup`)
- **Timestamper**

Optional (for SonarQube stage):
- **SonarQube Scanner**

---

## Step-by-Step Setup

### Step 1: Clone / Set Up the Repository

```bash
# Create your project folder
git init todo-api
cd todo-api

# Copy all project files here, then:
git add .
git commit -m "Initial commit – Todo API"

# Push to GitHub (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/todo-api.git
git push -u origin main
```

### Step 2: Create the Jenkins Pipeline

1. Open Jenkins at **http://localhost:8080**
2. Click **New Item**
3. Name it `todo-api-pipeline`, select **Pipeline**, click OK
4. Under **Pipeline**:
   - Definition: **Pipeline script from SCM**
   - SCM: **Git**
   - Repository URL: your GitHub repo URL
   - Branch: `*/main`
   - Script Path: `Jenkinsfile`
5. Click **Save**

### Step 3: Run the Pipeline

1. Click **Build Now**
2. Watch the stages progress in **Stage View**
3. Click any stage to view its console output

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check (used by monitoring) |
| GET | /metrics | Prometheus metrics |
| GET | /todos | List all todos |
| GET | /todos/:id | Get a single todo |
| POST | /todos | Create a todo `{ "title": "..." }` |
| PUT | /todos/:id | Update a todo |
| DELETE | /todos/:id | Delete a todo |

---

## Running Locally (without Jenkins)

```bash
npm install

# Run tests
npm test

# Lint
npm run lint

# Start on default port 3000
npm start

# Or on custom port
PORT=3001 npm start
```

---

## Optional: Enable SonarQube (Code Quality)

1. Download SonarQube Community: https://www.sonarsource.com/products/sonarqube/downloads/
2. Extract and run:
   ```bash
   # macOS/Linux
   ./bin/macosx-universal-64/sonar.sh start   # or linux-x86-64
   # Windows
   bin\windows-x86-64\StartSonar.bat
   ```
3. Open http://localhost:9000 (default login: admin/admin)
4. Generate a token: My Account → Security → Generate Token
5. Download sonar-scanner CLI: https://docs.sonarsource.com/sonarqube/latest/analyzing-source-code/scanners/sonarscanner/
6. In Jenkins: Manage Jenkins → Configure System → SonarQube servers
   - Name: `SonarQube`
   - URL: `http://localhost:9000`
   - Token: (add as Secret Text credential)
7. Uncomment the SonarQube block in `Jenkinsfile` Stage 3

---

## PM2 Useful Commands

```bash
pm2 list                    # Show all running processes
pm2 logs todo-api-staging   # View staging logs
pm2 logs todo-api-production # View production logs
pm2 monit                   # Live monitoring dashboard
pm2 delete todo-api-staging  # Stop staging
pm2 delete todo-api-production # Stop production
```

---

## Technologies

- **Runtime**: Node.js 18+
- **Framework**: Express 4.18
- **Testing**: Jest 29 + Supertest
- **Linting**: ESLint 8
- **Metrics**: prom-client (Prometheus)
- **Process Manager**: PM2
- **CI/CD**: Jenkins
- **Security Scan**: npm audit
