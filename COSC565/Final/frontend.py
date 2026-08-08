# Dylan Shaffer
# COSC 565
# Final Project

import sqlite3
import tkinter as tk
from tkinter import messagebox
from tkinter import ttk

connection = sqlite3.connect('project.db')

# Table column definitions used for record management
TABLE_COLUMNS = {
    "Customer": ["cust_id", "first_name", "last_name", "phone_num"],
    "Car": ["vin", "make", "model", "year", "cust_id"],
    "Mechanic": ["emp_id", "first_name", "last_name", "phone_num", "hire_date"],
}

# Function to run the creator.py script to create the required project files
def project_maker():
    # Run schema and data insertion scripts
    with open('schema.sql') as schema_sql:
        connection.executescript(schema_sql.read())
    with open('insert_data.sql') as insert_data_sql:
        connection.executescript(insert_data_sql.read())
    
    # Commit and close connection
    connection.commit()
    messagebox.showinfo("Success", "Database created.")

# Function to create or refresh the Job_Summary view
def create_job_summary_view():
    connection.execute("DROP VIEW IF EXISTS Job_Summary")
    connection.execute("""CREATE VIEW Job_Summary AS
        SELECT Job_Mapping.work_order_id, Mechanic.first_name AS mechanic_first,
               Mechanic.last_name AS mechanic_last, Car.make, Car.model,
               Work_Performed.cost_of_work
        FROM Job_Mapping
        INNER JOIN Mechanic ON Job_Mapping.emp_id = Mechanic.emp_id
        INNER JOIN Car ON Job_Mapping.vin = Car.vin
        INNER JOIN Work_Performed ON Job_Mapping.job_id = Work_Performed.job_id""")

# Function to run the required queries and display results
def required_queries():
    results_window = tk.Toplevel(root)
    results_window.title("Required Queries")
    
    notebook = ttk.Notebook(results_window)
    notebook.pack(fill="both", expand=True, padx=10, pady=10)
    
    create_job_summary_view()
    
    queries = [
        ("WHERE / ORDER BY", "SELECT * FROM Car WHERE year > 2016 ORDER BY make ASC"),
        ("INNER JOIN", "SELECT Mechanic.first_name, Mechanic.last_name, Work_Performed.desc_of_work FROM Job_Mapping INNER JOIN Mechanic ON Job_Mapping.emp_id = Mechanic.emp_id INNER JOIN Work_Performed ON Job_Mapping.job_id = Work_Performed.job_id"),
        ("LEFT JOIN", "SELECT Car.make, Car.model, Job_Mapping.work_order_id FROM Car LEFT JOIN Job_Mapping ON Car.vin = Job_Mapping.vin WHERE Car.cust_id = 6"),
        ("3+ Table Join", "SELECT Customer.first_name, Customer.last_name, Car.make, Car.model, Work_Performed.desc_of_work FROM Customer INNER JOIN Car ON Customer.cust_id = Car.cust_id INNER JOIN Job_Mapping ON Car.vin = Job_Mapping.vin INNER JOIN Work_Performed ON Job_Mapping.job_id = Work_Performed.job_id"),
        ("Aggregate", "SELECT AVG(cost_of_work) AS avg_cost FROM Work_Performed"),
        ("GROUP BY", "SELECT Mechanic.first_name, Mechanic.last_name, SUM(Work_Performed.cost_of_work) AS total_cost FROM Job_Mapping INNER JOIN Mechanic ON Job_Mapping.emp_id = Mechanic.emp_id INNER JOIN Work_Performed ON Job_Mapping.job_id = Work_Performed.job_id GROUP BY Mechanic.emp_id, Mechanic.first_name, Mechanic.last_name"),
        ("GROUP BY / HAVING", "SELECT Mechanic.first_name, Mechanic.last_name, SUM(Work_Performed.cost_of_work) AS total_cost FROM Job_Mapping INNER JOIN Mechanic ON Job_Mapping.emp_id = Mechanic.emp_id INNER JOIN Work_Performed ON Job_Mapping.job_id = Work_Performed.job_id GROUP BY Mechanic.emp_id, Mechanic.first_name, Mechanic.last_name HAVING SUM(Work_Performed.cost_of_work) > 200"),
        ("Subquery", "SELECT DISTINCT Customer.first_name, Customer.last_name FROM Customer INNER JOIN Car ON Customer.cust_id = Car.cust_id INNER JOIN Job_Mapping ON Car.vin = Job_Mapping.vin INNER JOIN Work_Performed ON Job_Mapping.job_id = Work_Performed.job_id WHERE Work_Performed.cost_of_work > (SELECT AVG(cost_of_work) FROM Work_Performed)"),
        ("Set Operation", "SELECT phone_num FROM Mechanic UNION SELECT phone_num FROM Customer"),
        ("View", "SELECT * FROM Job_Summary WHERE cost_of_work > 100 ORDER BY cost_of_work DESC"),
    ]
    
    for label, query in queries:
        cursor = connection.execute(query)
        columns = [description[0] for description in cursor.description]
        rows = cursor.fetchall()
        
        tab = tk.Frame(notebook)
        notebook.add(tab, text=label)
        
        tree = ttk.Treeview(tab, columns=columns, show="headings")
        for col in columns:
            tree.heading(col, text=col)
        tree.pack(fill="both", expand=True, padx=5, pady=5)
        
        for row in rows:
            tree.insert("", "end", values=row)
    
    # Transaction example, skipped if the job_id/work_order_id already exist
    try:
        connection.execute("BEGIN")
        connection.execute("INSERT INTO Work_Performed (job_id, date_of_work, cost_of_work, desc_of_work) VALUES (8, '2024-06-10 11:00:00', 199.99, 'Alternator replacement')")
        connection.execute("INSERT INTO Job_Mapping (work_order_id, emp_id, job_id, vin, location_id) VALUES (8, 2, 8, '1HGCM82633A004352', 2)")
        connection.commit()
    except sqlite3.IntegrityError:
        connection.rollback()
    
    messagebox.showinfo("Success", "Required queries executed.")

# Function to close the database connection and exit the application
def on_close():
    connection.close()
    root.destroy()

# GUI Section
root = tk.Tk()
root.title("Shop Manager")
root.geometry("700x400")
root.protocol("WM_DELETE_WINDOW", on_close)

# Function to open a new window for displaying records
def open_display_page():
    display_window = tk.Toplevel(root)
    display_window.title("Display Records")
    display_window.geometry("400x300")
    
    tk.Label(display_window, text="Select a table to view:", font=("Arial", 14)).pack(pady=20)
    
    cars_button = tk.Button(display_window, text="Cars", command=lambda: show_table("Car", display_window))
    cars_button.pack(pady=5)
    
    jobs_button = tk.Button(display_window, text="Jobs", command=lambda: show_table("Work_Performed", display_window))
    jobs_button.pack(pady=5)
    
    customers_button = tk.Button(display_window, text="Customers", command=lambda: show_table("Customer", display_window))
    customers_button.pack(pady=5)

# Function to display the selected table in a new window
def show_table(table_name, parent_window):
    results_window = tk.Toplevel(parent_window)
    results_window.title(table_name)
    results_window.update_idletasks()
    results_window.geometry("")
    
    cursor = connection.execute(f"SELECT * FROM {table_name}")
    columns = [description[0] for description in cursor.description]
    rows = cursor.fetchall()
    
    tree = ttk.Treeview(results_window, columns=columns, show="headings")
    
    for i, col in enumerate(columns):
        tree.heading(col, text=col)
        # Find the widest value in this column (including the header itself)
        max_width = max(
            [len(str(col))] + [len(str(row[i])) for row in rows]
        )
        tree.column(col, width=max_width * 8)
    
    tree.pack(fill="both", expand=True, padx=10, pady=10)
    
    for row in rows:
        tree.insert("", "end", values=row)

# Function to open a new window for choosing a table to manage
def open_manage_page():
    manage_window = tk.Toplevel(root)
    manage_window.title("Manage Records")
    manage_window.geometry("400x300")
    
    tk.Label(manage_window, text="Select a table to manage:", font=("Arial", 14)).pack(pady=20)
    
    for table_name in TABLE_COLUMNS:
        btn = tk.Button(manage_window, text=table_name, command=lambda t=table_name: manage_table(t, manage_window))
        btn.pack(pady=5)

# Function to add, update, or delete records in the selected table
def manage_table(table_name, parent_window):
    manage_win = tk.Toplevel(parent_window)
    manage_win.title(f"Manage {table_name}")
    
    columns = TABLE_COLUMNS[table_name]
    entries = {}
    
    form_frame = tk.Frame(manage_win)
    form_frame.pack(pady=10)
    
    for i, col in enumerate(columns):
        tk.Label(form_frame, text=col).grid(row=i, column=0, padx=5, pady=2)
        entry = tk.Entry(form_frame)
        entry.grid(row=i, column=1, padx=5, pady=2)
        entries[col] = entry
    
    # Treeview to display and select existing records
    tree = ttk.Treeview(manage_win, columns=columns, show="headings")
    for col in columns:
        tree.heading(col, text=col)
    tree.pack(fill="both", expand=True, padx=10, pady=10)
    
    # Function to reload the treeview from the database
    def refresh_records():
        for row in tree.get_children():
            tree.delete(row)
        cursor = connection.execute(f"SELECT {', '.join(columns)} FROM {table_name}")
        for row in cursor.fetchall():
            tree.insert("", "end", values=row)
    
    # Function to load a selected row into the form fields
    def select_record(event):
        selected = tree.focus()
        if not selected:
            return
        values = tree.item(selected, "values")
        for col, value in zip(columns, values):
            entries[col].delete(0, tk.END)
            entries[col].insert(0, value)
    
    tree.bind("<<TreeviewSelect>>", select_record)
    
    # Function to insert a new record from the form fields
    def add_record():
        values = [entries[col].get() for col in columns]
        placeholders = ", ".join(["?"] * len(columns))
        try:
            connection.execute(f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders})", values)
            connection.commit()
            refresh_records()
            messagebox.showinfo("Success", "Record added.")
        except sqlite3.Error as e:
            messagebox.showerror("Error", str(e))
    
    # Function to update the selected record using the primary key
    def update_record():
        values = [entries[col].get() for col in columns]
        pk = columns[0]
        set_clause = ", ".join([f"{col} = ?" for col in columns[1:]])
        try:
            connection.execute(f"UPDATE {table_name} SET {set_clause} WHERE {pk} = ?", values[1:] + [values[0]])
            connection.commit()
            refresh_records()
            messagebox.showinfo("Success", "Record updated.")
        except sqlite3.Error as e:
            messagebox.showerror("Error", str(e))
    
    # Function to delete a record by primary key
    def delete_record():
        pk = columns[0]
        pk_value = entries[pk].get()
        cursor = connection.execute(f"DELETE FROM {table_name} WHERE {pk} = ?", (pk_value,))
        connection.commit()
        if cursor.rowcount == 0:
            messagebox.showinfo("Not Found", "No matching record found.")
        else:
            refresh_records()
            messagebox.showinfo("Success", "Record deleted.")
    
    button_frame = tk.Frame(manage_win)
    button_frame.pack(pady=10)
    
    tk.Button(button_frame, text="Add", command=add_record).pack(side="left", padx=5)
    tk.Button(button_frame, text="Update", command=update_record).pack(side="left", padx=5)
    tk.Button(button_frame, text="Delete", command=delete_record).pack(side="left", padx=5)
    
    refresh_records()

# Function to display a summary report using the Job_Summary view
def show_summary():
    summary_window = tk.Toplevel(root)
    summary_window.title("Job Summary")
    
    create_job_summary_view()
    cursor = connection.execute("SELECT * FROM Job_Summary WHERE cost_of_work > 100 ORDER BY cost_of_work DESC")
    columns = [description[0] for description in cursor.description]
    rows = cursor.fetchall()
    
    tree = ttk.Treeview(summary_window, columns=columns, show="headings")
    for col in columns:
        tree.heading(col, text=col)
    tree.pack(fill="both", expand=True, padx=10, pady=10)
    
    for row in rows:
        tree.insert("", "end", values=row)
    
    summary_window.update_idletasks()
    summary_window.geometry("")

# Welcome message
welcome_label = tk.Label(
    root,
    text="Welcome to the Shop Manager System!\nPlease select an option below.",
    font=("Arial", 16)
)
welcome_label.pack(pady=40)

# Frame to hold the bottom buttons side by side
button_frame = tk.Frame(root)
button_frame.pack(side="bottom", pady=10)

# Button to create project database
create_button = tk.Button(button_frame, text="Create Project", command=project_maker)
create_button.pack(side="left", padx=10)

# Button to run required queries
queries_button = tk.Button(button_frame, text="Run Required Queries", command=required_queries)
queries_button.pack(side="left", padx=10)

# Button to open page for display options
display_button = tk.Button(button_frame, text="Display", command=open_display_page)
display_button.pack(side="left", padx=10)

# Button to open page for managing records
manage_button = tk.Button(button_frame, text="Manage Records", command=open_manage_page)
manage_button.pack(side="left", padx=10)

# Button to show the summary report
summary_button = tk.Button(button_frame, text="Summary", command=show_summary)
summary_button.pack(side="left", padx=10)

root.mainloop()