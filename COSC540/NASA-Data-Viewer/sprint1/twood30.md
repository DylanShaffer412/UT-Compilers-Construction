# Sprint 1
- Tanner Wood
- github ID: TannerWood
- github email: 
- GROUP: NASA  Commit Branch: dev-env-TW

## What you planned to do
- Create GST interface (ETL)
- Create GST postgres table
- Create 3D desktop main page

## What you did not do
- Getting the 3D desktop main page finished — after reflection, this issue is far more work than can be done in one sprint alongside the rest of the planned work. This issue will be pushed to Sprint 2.

## Issues completed
- Create GST interface (ETL)
- Create GST postgres table

## Files you worked on
- [pg-table-template.sql](https://github.com/DylanShaffer412/NASA-Data-Viewer/blob/dev-env-TW/backend/pg-table-template.sql)
- [GST_table.sql](https://github.com/DylanShaffer412/NASA-Data-Viewer/blob/dev-env-TW/backend/GST/GST_table.sql)
- [GST_LOAD.py](https://github.com/DylanShaffer412/NASA-Data-Viewer/blob/dev-env-TW/backend/GST/ETL/GST_LOAD.py)
- [GST_TRANSFORM.py](https://github.com/DylanShaffer412/NASA-Data-Viewer/blob/dev-env-TW/backend/GST/ETL/GST_TRANSFORM.py)
- [utils.py](https://github.com/DylanShaffer412/NASA-Data-Viewer/blob/dev-env-TW/backend/GST/ETL/utils.py)
- [main.py](https://github.com/DylanShaffer412/NASA-Data-Viewer/blob/dev-env-TW/backend/GST/ETL/main.py)
- [docker-compose.yml](https://github.com/DylanShaffer412/NASA-Data-Viewer/blob/dev-env-TW/docker/docker-compose.yml)

## Use of AI and/or 3rd party software
- **Claude.ai** – Used strictly for creating markdown files and troubleshooting Docker. The `.md` files were created so that other team members could set up and use the code I created, especially for pgAdmin. With differences between machines, some troubleshooting was needed.
- **Three.js** – A 3D UI library based in JavaScript used as a scaffold. Our frontend is based in React but needed a baseline to work from. Copyright 2010-2025 Three.js Authors. SPDX-License-Identifier: MIT.

## What you accomplished
During Sprint 1, my primary contributions focused on establishing the data infrastructure and backend foundation for the team's project.

- **ETL Structure:** Designed and implemented the team's ETL (Extract, Transform, Load) pipeline structure, providing a consistent and reusable pattern for the rest of the team to follow when ingesting data.
- **`utils.py`:** Developed a shared utility module (`utils.py`) containing a generic load function for writing data to PostgreSQL, ensuring consistency across all ETL processes and reducing duplicated code.
- **pgAdmin Setup:** Configured pgAdmin via the existing Docker Compose YML file, giving the team a working database interface for development and SQL building.
- **Table Schemas & Creation:** Established the PostgreSQL table schemas and wrote the table creation scripts, defining the data model that the application's backend will rely on going forward.

Sprint 1 had some development bumps along the way, but overall the team made solid progress. Setting up the database infrastructure early in the sprint was important for unlocking frontend work in the following sprints, and I felt good about getting a clean, reusable ETL foundation in place. Some challenges came up around environment configuration and getting the Docker development environment working consistently for both Windows and Linux, but those were worked through. Going into Sprint 2, I feel more confident about the project's backend structure and plan to build on this foundation with the desktop 3D main page.