Sprint 1

Name: Nicholas Vitellaro
GitHub ID: nvitellaro
Email(s) used for commits: nvitellaro@cfl.rr.com
Group Name: NASA-DATA-Viewer
Branch: main

What you planned to do

Establish initial project architecture (backend, database, frontend)

Integrate NASA NeoWs API into a data pipeline

Create ETL process to store asteroid data in Postgres

Build FastAPI endpoint to expose stored data

Develop initial React dashboard to display asteroid data

Implement basic filtering and sorting capabilities

What you did not do

Full cloud deployment (deferred to future sprint)

Integration of additional data sources (space weather, launches, etc.)

Advanced analytics or predictive features

Issues completed

Created ETL pipeline to ingest NeoWs data into Postgres

Designed and implemented neo_events database schema

Built FastAPI endpoint /api/neows/upcoming

Connected frontend to backend API

Implemented data table with live asteroid data

Added filtering (hazardous toggle) and sorting functionality

Implemented KPI metrics (object count, hazardous count, closest, fastest)

Added chart visualizations (daily counts and hazard split)

Built asteroid detail panel with extended data fields

Implemented auto-refresh functionality for live data updates

Resolved environment and startup issues within containerized setup

Created start/stop scripts for streamlined development workflow

Files you worked on

/backend/api.py

/backend/NeoWs/NEO.py

/frontend/src/App.jsx

/frontend/src/App.css

/frontend/src/index.css

/frontend/package.json

/vite.config.js

/scripts/start-dev.sh

/scripts/stop-dev.sh

3rd Party / External Code & Libraries:

NASA NeoWs API (data source)

Recharts (React charting library)

FastAPI (backend framework)

Uvicorn (ASGI server)

React + Vite (frontend framework and build tool)

Postgres (database)

Use of AI and/or 3rd party software

AI was used to assist with:

Rrefining frontend React components and layouts

Debugging integration issues between frontend, backend, and database

Creating development scripts for environment management

3rd party tools and software used:

NASA NeoWs API for asteroid data

Recharts for data visualization

Docker for containerized development environment

FastAPI and Uvicorn for backend services

React and Vite for frontend development

AI was used as a productivity and ideation tool, but all implementations were reviewed, tested, and integrated manually.

What you accomplished

During Sprint 1, I successfully transitioned the project from an initial concept into a fully functional end-to-end application. I established a complete data pipeline that retrieves asteroid data from the NASA NeoWs API, processes it through a Python-based ETL workflow, and stores it in a structured Postgres database. This data is then exposed through a FastAPI backend and consumed by a React-based frontend dashboard.

On the frontend, I developed a mission-control-style dashboard that presents the data in a structured and intuitive format. This includes a sortable and filterable data table, KPI summary metrics, and visualizations such as daily approach counts and hazard distribution charts. I also implemented an interactive detail panel that allows users to inspect individual asteroids more closely, including velocity, miss distance, and estimated size.

In addition to feature development, I addressed several environment and integration challenges related to running services within a containerized setup. I created startup and shutdown scripts to streamline the development workflow, reducing friction when launching the API and frontend together. I also implemented auto-refresh functionality to ensure the dashboard remains up-to-date without manual intervention.

Overall, Sprint 1 established a strong technical foundation for the project, delivering a working full-stack system with real-time data capabilities and a scalable architecture that can support additional data sources and features in future sprints.