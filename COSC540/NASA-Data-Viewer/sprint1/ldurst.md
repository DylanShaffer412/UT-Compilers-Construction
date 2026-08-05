#Sprint 1
Lane Durst
github ID: LaneDurst
github email: ltdurst03@gmail.com
GROUP: NASA
Commit Branch: dev-env-LD

##What you planned to do 
- Create Postgres AAI Lunar Table
- Create AAI interface
- Create Mobile UI Daily Events Page

##What you did not do 
- Create Mobile UI Daily Events Page (partially completed)

##Issues completed
- Create Postgres AAI Lunar Table
- Create AAI interface

##Files you worked on
- /backend/AAI/AAI_extract.py
- /backend/AAI/api.py
- /docker/docker-compose.yml
- /docker/dockerfile
- /frontend/*

##Use of AI and/or 3rd party software
AI (particularly Claude) was used to help find tools/libraries needed for the issues. It was also used for proofreading code for obvious bugs.
All of the code in the above files was written by me with the exception of api.py. This file was partially created by other group members (on their branches) and Claude was used to adapt it to create api endpoints for my data

##What you accomplished
I successfully retrieved data from the AAI api, namely the Lunar Phases and Eclipses for the current year. This data was then stored in the group's Postgres database. Further, I created some local api endpoints to allow the frontend to get the data required for rendering
I also began work on the Mobile UI for the Daily events page, however due to lack of access to other data (other group members worked on those) and excessive scope of the feature (likely should be broken into 2-3 smaller issues) I was unable to fully complete it.
Nonetheless, I did successfully create a basic UI including a dynamically rendered label for the current lunar phase (this data WAS available to me) and I also created a functional Navbar which would be used by all group members.