# Sprint 1 
- Aaron Coffman
- github ID: RiverDancingToad
- github email: aaronmcoffman@gmail.com 
- GROUP: NASA Commit Branch: dev-env-AC

## What you planned to do
- Continue Main Page Mobile Frontend to include skins
- Include Notable Solar Events
- Include enhancements to the 3d viewer

## What you did not do
- Main Page did not have any data and is just a shell

## Issues completed
- Create CME postgres table
- Create CME interface
  
## Files you worked on
- /backend/CME/ETL/CME_LOAD.py
- /backend/CME/ETL/cme_pipeline.py
- /backend/CME/ETL/CME_TRANSFORM.py
- main.py
- docker-compose.yml
- dockerfile
- /frontend/*
- scripts/dev_ctl.sh

## Use of AI and/or 3rd party software
- AI ChatGPT was used to help with most of the software components including docker scripts, devcontainer control scripts, and assisted in both the backend and frontend development.  
- Docker to have development containers and control our development environments. 
- NPM react to create frontend API.  It mostly will create the boiler plate code needed for the UI development.
- Postgres is what we are using to store our data pulled from the NASA API.
- openglobus is being used to visualize the data in a fun way with a 3D viewer. https://github.com/openglobus/openglobus
    

## What you accomplished 
During the first sprint of the project, I successfully integrated with the NASA DONKI API to retrieve Coronal Mass Ejection (CME) data.  I was also able to developed an ETL workflow to transform and load that data into a PostgreSQL database table. In addition, I created a startup script that automates the development environment setup, including container builds, database initialization, and service startup, making the system reproducible for other developers. On the frontend, I implemented an initial main page for the mobile application that includes a working 3D viewer, which provides a foundation for future visualization of space weather data.