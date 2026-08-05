# AstroMetrics

## 📌 Project Name
AstroMetrics

---

## 👥 Project Members
- Dylan Shaffer — GitHub: DylanShaffer412
- Nicholas Vitellaro — GitHub: nvitellaro
- Tanner Wood — GitHub: RangerRico
- Lane Durst — GitHub: LaneDurst
- Aaron Coffman — GitHub: RiverDancingToad

---

## 🖼️ Product Graphic / Logo
![AstroMetrics Logo](./docs/logo.png)

---

## 📖 Description
AstroMetrics is a containerized full-stack application that:
- Loads NASA and Navy space-weather data into PostgreSQL
- Serves backend API endpoints using FastAPI
- Provides an interactive frontend using React/Vite
- Includes pgAdmin for database inspection and management

The application enables visualization of space weather events such as:
- Coronal Mass Ejections (CME)
- Solar Flares
- Near Earth Objects (NEO)
- Geomagnetic Storms

---

## 📚 Table of Contents (Optional)
1. Installation
2. Setup
3. Running the Application
4. Usage
5. License

---

## ⚙️ Installation & Setup

### 1. Install Prerequisites

#### Docker Desktop
- Windows: https://docs.docker.com/desktop/setup/install/windows-install/
- macOS: https://docs.docker.com/desktop/setup/install/mac-install/
- Linux: https://docs.docker.com/desktop/setup/install/linux/

#### NASA API Key
- https://api.nasa.gov/

---

### 2. Clone the Repository
```
git clone https://github.com/DylanShaffer412/NASA-Data-Viewer.git
cd NASA-Data-Viewer
```

---

### 3. Create `.env` File
```
NASA_API_KEY=your_key_here
POSTGRES_CONNECTION=postgresql://spaceweather:spaceweather@postgres:5432/spaceweather

DB_HOST=postgres
DB_PORT=5432
DB_NAME=spaceweather
DB_USER=spaceweather
DB_PASSWORD=spaceweather

PGADMIN_DEFAULT_EMAIL=admin@admin.com
PGADMIN_DEFAULT_PASSWORD=admin
```

---

### 4. Start Containers
Linux/macOS:
```
./scripts/linux_dev_ctl.sh start
```

Windows:
```
./scripts/win_dev_ctl.sh start
```

---

### 5. Install Frontend
```
cd frontend
npm install
cd ..
```

---

## ▶️ Running the Application

```
python main.py
```

---

## 🌐 Access the Application

- Frontend: http://localhost:5173  
- Backend API: http://localhost:8000  
- pgAdmin: http://localhost:5050  

pgAdmin Login:
```
admin@admin.com
admin
```

---

## 🧭 How to Use the Product

- Launch the application and open the frontend in your browser
- Navigate between pages such as:
  - Main Dashboard
  - Daily / Weekly Reports
  - Solar Flares, CME, NEO, and Storms
- Use interactive panels to:
  - View recent and notable events
  - Trigger graphical visualizations (CME, flare, NEO)
- Explore the database using pgAdmin if needed

---

## ⛔ Stopping the Application

Linux/macOS:
```
./scripts/linux_dev_ctl.sh stop
```

Windows:
```
./scripts/win_dev_ctl.sh stop
```

---

## 📄 License

This project is licensed under the MIT License.  
See the [LICENSE.txt](./LICENSE.txt) file for details.
