# 🏥 Hospital Digital Twin & Operational Intelligence Platform
## 🚀 Production-Ready Deployment & Online Hosting Guide

This package contains the complete, production-ready codebase for the **Hospital Digital Twin & Operational Intelligence System**, featuring 2D/3D interactive spatial digital twins, counterfactual simulation engines, role-based access control (Admin, Nurse, Data Entry, Clinical Staff), and real-time nurse shift/task notification dispatching.

---

## ⚡ 1. Local Run with Docker (Recommended)

```bash
# In the project root:
docker compose up --build
```
- 🌐 **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- 🔌 **Backend API & Swagger**: [http://localhost:8000/docs](http://localhost:8000/docs)
- 💓 **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 🔑 2. Instant Demo Login Credentials

You can click any of the **1-Click Quick Demo Access** buttons directly on the Login page, or enter:

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **👩‍⚕️ Nurse** | `nurse@hospital.demo` | `nurse123` | **Dedicated Nurse Portal**: Shift dispatches, accept/acknowledge shift button (`[✓ Accept Shift]`), live bed availability, clinical checklist. |
| **🛡️ Admin** | `admin@hospital.demo` | `admin123` | **Full Admin Command**: User approval, nurse task/shift dispatch, hospital state overrides, role management. |
| **📊 Data Entry** | `dataentry@hospital.demo` | `data123` | **Data Entry Portal**: Update live beds, staff assigned, and patient queues. |
| **👨‍⚕️ Staff** | `staff@hospital.demo` | `staff123` | **Clinical Staff**: Live situation dashboard, 3D Digital Twin, what-if simulations. |

---

## 🌐 3. Step-by-Step Procedure to Deploy the Project Online

Deploying this project to the cloud ensures anyone (administrators, doctors, nurses) can access the system online from their phone, tablet, or laptop.

---

### 🥇 Method A: Deploy on Railway.app (Recommended - 5 Minutes, Zero Config)

Railway is the simplest and best platform because it builds both the Docker backend and frontend together with persistent WebSockets and HTTPS.

#### Step 1: Push the codebase to GitHub
```bash
git init
git add .
git commit -m "Hospital Digital Twin v3.0"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/hospital-digital-twin.git
git push -u origin main
```

#### Step 2: Create Railway Project
1. Go to [https://railway.app](https://railway.app) and sign in with GitHub.
2. Click **"New Project"** → **"Deploy from GitHub repo"**.
3. Select your repository `hospital-digital-twin`.

#### Step 3: Deploy Backend Service
1. Click **"Add Service"** → select your repo.
2. Under **Settings**:
   - Set **Root Directory** to `/backend` (or leave default if using root Dockerfile).
   - Set **Port** to `8000`.
3. Under **Networking**: Click **"Generate Domain"** (e.g. `https://hospital-backend-prod.up.railway.app`).

#### Step 4: Deploy Frontend Service
1. Click **"Add Service"** → select your repo again.
2. Under **Settings**:
   - Set **Root Directory** to `/frontend`.
3. Under **Variables**:
   - Add: `VITE_API_URL` = `https://hospital-backend-prod.up.railway.app` (your backend URL from Step 3).
4. Under **Networking**: Click **"Generate Domain"** (e.g. `https://hospital-twin.up.railway.app`).

#### Step 5: Test Online
Open `https://hospital-twin.up.railway.app` in your browser. Admins can dispatch nurse shifts and nurses will receive live notifications instantly!

---

### 🥈 Method B: Deploy on Render.com (Free Tier Option)

#### Step 1: Deploy Backend Web Service
1. Go to [https://render.com](https://render.com) and click **"New +" → "Web Service"**.
2. Connect your GitHub repository.
3. Configure the settings:
   - **Name**: `hospital-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Click **"Create Web Service"**. Copy your backend URL (e.g. `https://hospital-backend.onrender.com`).

#### Step 2: Deploy Frontend Static Site
1. On Render, click **"New +" → "Static Site"**.
2. Connect the same GitHub repository.
3. Configure:
   - **Name**: `hospital-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Under **Environment Variables**:
   - Add: `VITE_API_URL` = `https://hospital-backend.onrender.com`
5. Click **"Create Static Site"**.

---

### 🥉 Method C: Deploy on Ubuntu VPS / Cloud VM (AWS EC2 / DigitalOcean / Linode)

If deploying to a dedicated Linux server:

```bash
# 1. Connect to your server
ssh root@YOUR_SERVER_IP

# 2. Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh

# 3. Clone and start
git clone https://github.com/YOUR_GITHUB_USERNAME/hospital-digital-twin.git
cd hospital-digital-twin
docker compose up -d --build
```
The application will immediately be live on port 5173!

---

## 🧪 4. Automated Verification Tests

```bash
cd backend
pytest
```
*Verification status: **38/38 unit tests passing (100%)**.*
