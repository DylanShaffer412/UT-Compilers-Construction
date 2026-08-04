--Dylan Shaffer
--COSC 565

--Part 1
--1. Table Creation
CREATE TABLE IF NOT EXISTS Books (
    BookID INT PRIMARY KEY NOT NULL,
    Title VARCHAR(255) NOT NULL,
    Author VARCHAR(255) NOT NULL,
    Genre VARCHAR(100) NOT NULL,
    PublishedYear INT NOT NULL,
    Price DECIMAL(10, 2) NOT NULL,
    ISBN INT UNIQUE
);

--2. Inserting data into table
 INSERT INTO Books (BookID, Title, Author, Genre, PublishedYear, Price, ISBN) VALUES
 (1, 'To Kill a Mockingbird', 'Harper Lee', 'Fiction', 1960, 10.99, NULL),
 (2, '1984', 'George Orwell', 'Dystopian', 1949, 8.99, 9780451524935),
 (3, 'The Great Gatsby', 'F. Scott Fitzgerald', 'Classic', 1925, 12.50, 9780743273565),
 (4, 'The Catcher in the Rye', 'J.D. Salinger', 'Classic', 1951, 7.99, NULL),
 (5, 'Pride and Prejudice', 'Jane Austen', 'Romance', 1813, 9.99, 9780141439518);


--Part 2
--1. Retrieve all records
SELECT * FROM Books;

--2. List distinct genres
SELECT DISTINCT Genre FROM Books;

--3. Filter by price
SELECT * FROM Books WHERE Price < 10.00;

--4. Order by year
SELECT * FROM Books ORDER BY PublishedYear DESC;

--5. Filter with multiple conditions
SELECT * FROM Books WHERE PublishedYear >= 1950 AND (Genre = 'Classic' OR Price BETWEEN 8.00 AND 12.00);

--6. Find null ISBNs
SELECT * FROM Books WHERE ISBN IS NULL;

--7. Use of IN clause
SELECT * FROM Books WHERE Author IN ('Harper Lee', 'George Orwell');

--8. Apply an alias
SELECT Title, Price AS Cost FROM Books;

--9. Insert a new book
INSERT INTO Books VALUES
(6, 'Six Easy Pieces', 'Richard Feynman', 'Science', 1994, 15.25, 9780465025275);