-- Dylan Shaffer
-- COSC 565
-- Final Project Data Insertion

-- Sample Data
INSERT INTO Mechanic (emp_id, first_name, last_name, phone_num, hire_date) VALUES
(1, 'Tom', 'Reyes', '4235551001', '2018-03-15'),
(2, 'Angela', 'Brooks', '4235551002', '2020-07-01'),
(3, 'Marcus', 'Lee', '4235551003', '2015-11-20'),
(4, 'Sara', 'Nguyen', '4235551004', '2022-01-10'),
(5, 'Devon', 'White', '4235551005', '2019-06-05');

INSERT INTO Customer (cust_id, first_name, last_name, phone_num) VALUES
(1, 'John', 'Miller', '4235550001'),
(2, 'Priya', 'Patel', '4235550002'),
(3, 'Chris', 'Johnson', '4235550003'),
(4, 'Laura', 'Kim', '4235550004'),
(5, 'Ben', 'Turner', '4235550005'),
(6, 'Dylan', 'Shaffer', '4235550006');

INSERT INTO Car (vin, make, model, year, cust_id) VALUES
('1HGCM82633A004352', 'Honda', 'Accord', 2015, 1),
('2T1BURHE0JC014567', 'Toyota', 'Corolla', 2018, 2),
('3FA6P0H79HR123456', 'Ford', 'Fusion', 2020, 3),
('1G1ZD5ST0LF098765', 'Chevrolet', 'Malibu', 2017, 4),
('WBA3A5C50DF456789', 'BMW', '3 Series', 2022, 5),
('JF1VA1A61B9800123', 'Subaru', 'WRX', 2011, 6),
('2G1FT1EW3G9123456', 'Chevrolet', 'Camaro', 2016, 6);

INSERT INTO Work_Performed (job_id, date_of_work, cost_of_work, desc_of_work) VALUES
(1, '2024-01-10 09:30:00', 89.99, 'Oil change and filter replacement'),
(2, '2024-02-14 13:00:00', 450.00, 'Front brake pad and rotor replacement'),
(3, '2024-03-05 10:15:00', 120.50, 'Battery replacement'),
(4, '2024-04-22 15:45:00', 610.75, 'Transmission fluid flush and repair'),
(5, '2024-05-30 08:00:00', 75.00, 'Tire rotation and alignment check'),
(6, '2024-06-12 11:30:00', 250.00, 'AC system recharge and leak repair'),
(7, '2024-07-18 14:20:00', 300.00, 'Suspension inspection and strut replacement');

INSERT INTO Location (location_id, address) VALUES
(1, '100 Main St, Bristol, TN'),
(2, '250 Elm St, Kingsport, TN'),
(3, '75 Oak Ave, Johnson City, TN'),
(4, '12 Maple Dr, Bristol, VA'),
(5, '300 Pine Rd, Abingdon, VA');

INSERT INTO Job_Mapping (work_order_id, emp_id, job_id, vin, location_id) VALUES
(1, 1, 1, '1HGCM82633A004352', 1),
(2, 2, 2, '2T1BURHE0JC014567', 2),
(3, 3, 3, '3FA6P0H79HR123456', 1),
(4, 4, 4, '1G1ZD5ST0LF098765', 3),
(5, 5, 5, 'WBA3A5C50DF456789', 4),
(6, 1, 6, '2T1BURHE0JC014567', 5),
(7, 5, 7, '1G1ZD5ST0LF098765', 2);
