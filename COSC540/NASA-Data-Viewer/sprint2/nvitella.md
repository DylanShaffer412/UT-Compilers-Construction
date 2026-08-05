**Sprint 2 Report**

**Name:** Nicholas Vitellaro
**GitHub ID:** nvitella
**Email(s) used for commits:** nvitellaro@cfl.rr.com
**Group Name:** NASA
**Branch:** dev-env-NV

---

### What you planned to do

* Complete ETL pipelines for NASA APIs (NeoWs, GST, CME)
* Build backend API endpoints for each dataset
* Connect frontend pages to backend data
* Improve UI styling for forecast pages
* Begin structuring dashboard layout

---

### What you did not do

* Fully resolve NEO data completeness (velocity, miss distance, diameter)
* Implement charts/visualizations (Recharts)
* Combine all data into a single unified dashboard page
* Replace hardcoded API URLs with proxy-based routing

---

### Issues completed

* Implemented working ETL pipelines for NeoWs, GST, and CME
* Created Postgres tables for all datasets
* Built FastAPI endpoints:

  * `/api/neows/forecast`
  * `/api/gst/forecast`
  * `/api/cme/forecast`
* Connected frontend pages to backend APIs
* Implemented loading and error handling states
* Designed and deployed enhanced UI for GST and CME pages
* Refactored NEO page to present core data cleanly despite incomplete fields

---

### Files you worked on

* `/backend/etl/neows_loader.py`
* `/backend/etl/gst_loader.py`
* `/backend/etl/cme_loader.py`
* `/backend/api/main.py`
* `/backend/db/schema.sql`
* `/frontend/src/pages/forecast/NeowsForecast.jsx`
* `/frontend/src/pages/forecast/GstForecast.jsx`
* `/frontend/src/pages/forecast/CmeForecast.jsx`
* `/frontend/src/App.jsx`

**3rd party tools/libraries:**

* FastAPI
* PostgreSQL (Docker)
* React (Vite)
* Recharts (planned, not yet implemented)

---

### Use of AI and/or 3rd party software

AI was used to assist with:

* Generating and refining frontend React components
* Designing UI/UX improvements for dashboard pages
* Debugging API integration and data mapping issues
* Structuring ETL logic and backend endpoints

3rd party software and tools used:

* Docker Desktop (containerized Postgres and dev environment)
* VS Code (development environment)
* GitHub (version control and project tracking)
* NASA APIs (NeoWs and DONKI datasets)

---

### What you accomplished

During Sprint 2, the project progressed from a basic data pipeline into a fully functional full-stack application. All major data sources—Near-Earth Objects (NeoWs), Geomagnetic Storms (GST), and Coronal Mass Ejections (CME)—were successfully integrated into the system. Data is now pulled from NASA APIs, processed through ETL pipelines, stored in a Postgres database, and exposed through FastAPI endpoints.

On the frontend, separate forecast pages were implemented for each dataset and connected to the backend. These pages handle loading states, error conditions, and dynamic data rendering. Significant improvements were made to the UI, particularly for the GST and CME pages, which now feature a polished dark-theme “mission control” design with KPI cards, improved table layouts, and enhanced readability.

While the NEO dataset revealed gaps in data completeness due to nested API structures, the page was adapted to present available information in a clean and intentional format. This allowed continued progress without blocking the sprint.

Overall, Sprint 2 established a strong foundation for the application, delivering a working end-to-end system with improved visual presentation. The next sprint will focus on enhancing data completeness, introducing visualizations, and consolidating the application into a unified dashboard experience.
