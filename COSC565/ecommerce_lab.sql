-- Dylan Shaffer
-- COSC 565

-- Part 1: Creating the Database Tables
-- Problem 1: Create the Database Tables
CREATE TABLE IF NOT EXISTS Customers (
    CustomerID INT PRIMARY KEY NOT NULL,
    CustomerName VARCHAR(255) NOT NULL,
    Country VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS Orders (
    OrderID INT PRIMARY KEY NOT NULL,
    CustomerID INT NOT NULL,
    OrderDate DATE NOT NULL,
    TotalAmount DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID)
);

-- Problem 2: Insert Data into the Tables
INSERT INTO Customers (CustomerID, CustomerName, Country) VALUES
(1, 'Alice', 'USA'),
(2, 'Bob', 'UK'),
(3, 'Charlie', 'USA'),
(4, 'Diana', 'Canada'),
(5, 'Eve', 'Australia');

INSERT INTO Orders (OrderID, CustomerID, OrderDate, TotalAmount) VALUES
(101, 1, '2024-01-15', 120.50),
(102, 1, '2024-02-10', 80.00),
(103, 2, '2024-01-20', 200.00),
(104, 3, '2024-03-12', 150.00),
(105, 4, '2024-02-05', 60.00),
(106, 5, '2024-03-30', 90.00);

-- Part 2: Writing SQL Queries
-- Problem 1: Customer Orders with Conditional Logic
SELECT c.CustomerName, c.Country, ROUND(o.TotalAmount),
    CASE
        WHEN o.TotalAmount > 150 THEN 'High'
        WHEN o.TotalAmount BETWEEN 100 AND 150 THEN 'Medium'
        ELSE 'Low'
    END AS OrderCategory
FROM Orders o
JOIN Customers c ON o.CustomerID = c.CustomerID;

-- Problem 2: Grouping and Aggregating by Country
SELECT c.Country, COUNT(o.OrderID) AS NumberOrders
FROM Orders o
JOIN Customers c ON o.CustomerID = c.CustomerID
GROUP BY c.Country
HAVING COUNT(o.OrderID) > 1;

-- Problem 3: Combining Tables with Joins
SELECT c.CustomerName, o.OrderID, ROUND(o.TotalAmount)
FROM Customers c
LEFT JOIN Orders o ON c.CustomerID = o.CustomerID;

-- Problem 4: Subqueries
SELECT c.CustomerName, ROUND(o.TotalAmount)
FROM Customers c
INNER JOIN Orders o ON c.CustomerID = o.CustomerID
WHERE o.TotalAmount > (SELECT AVG(TotalAmount) FROM Orders);

-- Problem 5: Using a CTE for Average Order Amount
WITH CustomerAvg AS (
    SELECT CustomerID, ROUND(AVG(TotalAmount)) AS CustomerAverage
    FROM Orders
    GROUP BY CustomerID
),
CountryAvg AS (
    SELECT c.Country, ROUND(AVG(o.TotalAmount)) AS CountryAverage
    FROM Customers c
    JOIN Orders o ON c.CustomerID = o.CustomerID
    GROUP BY c.Country
)
SELECT c.CustomerName, ca.CustomerAverage, coa.CountryAverage
FROM Customers c
JOIN CustomerAvg ca ON c.CustomerID = ca.CustomerID
JOIN CountryAvg coa ON c.Country = coa.Country
WHERE ca.CustomerAverage > coa.CountryAverage;
