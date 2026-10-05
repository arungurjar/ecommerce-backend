-- Runs automatically on startup against the H2 in-memory DB.
-- The admin user is seeded separately in code (see config/DataSeeder.java)
-- so its password gets hashed by the real PasswordEncoder bean.

INSERT INTO products (name, description, price, category, stock_quantity) VALUES
('Wireless Mouse', 'Ergonomic 2.4GHz wireless mouse', 799.00, 'Electronics', 50),
('Mechanical Keyboard', 'RGB backlit mechanical keyboard, blue switches', 2499.00, 'Electronics', 30),
('Cotton T-Shirt', 'Plain 100% cotton crew neck t-shirt', 399.00, 'Apparel', 100),
('Running Shoes', 'Lightweight breathable running shoes', 2999.00, 'Footwear', 40),
('Java Programming Book', 'Beginner to advanced Java guide', 649.00, 'Books', 25);
