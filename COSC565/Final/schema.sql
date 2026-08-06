-- Dylan Shaffer
-- COSC 565
-- Final Project Schema

-- SQL Schema
DROP TABLE IF EXISTS Job_Mapping;
DROP TABLE IF EXISTS Location;
DROP TABLE IF EXISTS Work_Performed;
DROP TABLE IF EXISTS Car;
DROP TABLE IF EXISTS Customer;
DROP TABLE IF EXISTS Mechanic;

CREATE TABLE IF NOT EXISTS Mechanic (
    emp_id INT PRIMARY KEY NOT NULL,
    first_name VARCHAR(20) NOT NULL,
    last_name VARCHAR(20) NOT NULL,
    phone_num VARCHAR(10) NOT NULL,
    hire_date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS Customer (
    cust_id INT PRIMARY KEY NOT NULL,
    first_name VARCHAR(20) NOT NULL,
    last_name VARCHAR(20) NOT NULL,
    phone_num VARCHAR(10) NOT NULL
);

CREATE TABLE IF NOT EXISTS Car (
    vin VARCHAR(17) PRIMARY KEY NOT NULL,
    make VARCHAR(20) NOT NULL,
    model VARCHAR(20) NOT NULL,
    year YEAR NOT NULL,
    cust_id INT NOT NULL,
    FOREIGN KEY (cust_id) REFERENCES Customer(cust_id)
);

CREATE TABLE IF NOT EXISTS Work_Performed (
    job_id INT PRIMARY KEY NOT NULL,
    date_of_work DATETIME NOT NULL,
    cost_of_work DECIMAL(5, 2) NOT NULL CHECK (cost_of_work > 0),   -- Non-key constraint, CHECK
    desc_of_work VARCHAR(500) NOT NULL
);

CREATE TABLE IF NOT EXISTS Location (
    location_id INT PRIMARY KEY NOT NULL,
    address VARCHAR(50) UNIQUE NOT NULL     -- Non-key constraint, UNQIUE
);

CREATE TABLE IF NOT EXISTS Job_Mapping (
    work_order_id INT PRIMARY KEY NOT NULL,
    emp_id INT NOT NULL,
    job_id INT NOT NULL,
    vin VARCHAR(17) NOT NULL,
    location_id INT NOT NULL,
    FOREIGN KEY (emp_id) REFERENCES Mechanic(emp_id),
    FOREIGN KEY (job_id) REFERENCES Work_Performed(job_id),
    FOREIGN KEY (vin) REFERENCES Car(vin),
    FOREIGN KEY (location_id) REFERENCES Location(location_id)
);
