-- Dylan Shaffer
-- COSC 565
-- Final Project Queries

-- SELECT with WHERE and ORDER BY
-- Selects all cars made after 2016 and orders them by make in ascending order
SELECT * FROM Car
WHERE year > 2016
ORDER BY make ASC;

-- INNER JOIN
-- Selects the first name, last name, and description of work for each mechanic and their performed work
SELECT Mechanic.first_name, Mechanic.last_name, Work_Performed.desc_of_work
FROM Job_Mapping
INNER JOIN Mechanic ON Job_Mapping.emp_id = Mechanic.emp_id
INNER JOIN Work_Performed ON Job_Mapping.job_id = Work_Performed.job_id;

-- LEFT JOIN
-- Showing all cars and their corresponding work orders for a specific customer
-- NOTE: This should return NULL, there are no jobs for cust_id 6
SELECT Car.make, Car.model, Job_Mapping.work_order_id
FROM Car
LEFT JOIN Job_Mapping ON Car.vin = Job_Mapping.vin
WHERE Car.cust_id = 6;

-- At least three joined tables
-- Customer, their car, and work performed on it
SELECT Customer.first_name, Customer.last_name, Car.make, Car.model, Work_Performed.desc_of_work
FROM Customer
INNER JOIN Car ON Customer.cust_id = Car.cust_id
INNER JOIN Job_Mapping ON Car.vin = Job_Mapping.vin
INNER JOIN Work_Performed ON Job_Mapping.job_id = Work_Performed.job_id;

-- Aggregate function
-- Average cost of work performed
SELECT AVG(cost_of_work) AS avg_cost
FROM Work_Performed;

-- GROUP BY
-- Total cost of work performed by each mechanic
SELECT Mechanic.first_name, Mechanic.last_name, SUM(Work_Performed.cost_of_work) AS total_cost
FROM Job_Mapping
INNER JOIN Mechanic ON Job_Mapping.emp_id = Mechanic.emp_id
INNER JOIN Work_Performed ON Job_Mapping.job_id = Work_Performed.job_id
GROUP BY Mechanic.emp_id, Mechanic.first_name, Mechanic.last_name;

-- GROUP BY with HAVING
-- Previous GROUP BY query modified to show mechanics who've performed work totaling more than $200
SELECT Mechanic.first_name, Mechanic.last_name, SUM(Work_Performed.cost_of_work) AS total_cost
FROM Job_Mapping
INNER JOIN Mechanic ON Job_Mapping.emp_id = Mechanic.emp_id
INNER JOIN Work_Performed ON Job_Mapping.job_id = Work_Performed.job_id
GROUP BY Mechanic.emp_id, Mechanic.first_name, Mechanic.last_name
HAVING SUM(Work_Performed.cost_of_work) > 200;

-- Query with subquery
-- Selects customers who have had work performed that costs more than the average cost of work performed
SELECT DISTINCT Customer.first_name, Customer.last_name
FROM Customer
INNER JOIN Car ON Customer.cust_id = Car.cust_id
INNER JOIN Job_Mapping ON Car.vin = Job_Mapping.vin
INNER JOIN Work_Performed ON Job_Mapping.job_id = Work_Performed.job_id
WHERE Work_Performed.cost_of_work > (
    SELECT AVG(cost_of_work) FROM Work_Performed
);

-- Query with set operation (UNION, INTERSECT, or EXCEPT)
-- Selects all unique phone numbers from both the Mechanic and Customer tables
SELECT phone_num FROM Mechanic
UNION
SELECT phone_num FROM Customer;

-- Query using view
-- Creates a view that summarizes job information, including mechanic name, car make and model, and cost of work
-- Then, query pulling jobs over $100 from it, most expensive first
DROP VIEW IF EXISTS Job_Summary;
CREATE VIEW Job_Summary AS
SELECT Job_Mapping.work_order_id, Mechanic.first_name AS mechanic_first,
       Mechanic.last_name AS mechanic_last, Car.make, Car.model,
       Work_Performed.cost_of_work
FROM Job_Mapping
INNER JOIN Mechanic ON Job_Mapping.emp_id = Mechanic.emp_id
INNER JOIN Car ON Job_Mapping.vin = Car.vin
INNER JOIN Work_Performed ON Job_Mapping.job_id = Work_Performed.job_id;

SELECT * FROM Job_Summary
WHERE cost_of_work > 100
ORDER BY cost_of_work DESC;

-- Short transaction example using BEGIN, COMMIT, and/or ROLLBACK
-- Inserts a new work performed record and maps it to a mechanic, car, and location
BEGIN;

INSERT INTO Work_Performed (job_id, date_of_work, cost_of_work, desc_of_work)
VALUES (8, '2024-06-10 11:00:00', 199.99, 'Alternator replacement');

INSERT INTO Job_Mapping (work_order_id, emp_id, job_id, vin, location_id)
VALUES (8, 2, 8, '1HGCM82633A004352', 2);

COMMIT;