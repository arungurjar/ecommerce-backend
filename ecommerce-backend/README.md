# E-commerce Mini Backend

A REST API backend for a simple e-commerce system, built with **Spring Boot 3**, **Spring Security (JWT)**,
and **Spring Data JPA**. Runs out of the box on an in-memory H2 database — no external DB setup needed to try it.

## Features

- **Auth** — register/login with JWT-based stateless authentication, passwords hashed with BCrypt
- **Roles** — `USER` and `ADMIN`, enforced via Spring Security
- **Products** — public browsing, search by name, filter by category, pagination
- **Cart** — add/update/remove items, per-user
- **Orders** — place an order from the cart (stock is validated and decremented), view order history
- **Admin** — manage products (CRUD), view all orders, update order status
- **Global exception handling** — consistent JSON error responses with field-level validation messages
- **Swagger / OpenAPI** — interactive API docs at `/swagger-ui.html`
- **Unit tests** — JUnit 5 + Mockito for the service layer

## Tech Stack

Java 17 · Spring Boot 3.3 · Spring Security · Spring Data JPA · Hibernate · H2 (dev) / MySQL (prod-ready) ·
JWT (jjwt) · Maven · Lombok · springdoc-openapi

## Getting Started

### Prerequisites
- Java 17+
- Maven 3.8+ (or use the included wrapper if you add one)

### Run it

```bash
mvn spring-boot:run
```

The app starts on `http://localhost:8080` with an in-memory H2 database that resets every restart,
pre-loaded with 5 sample products and one admin account:

```
username: admin
password: admin123
```

- Swagger UI: `http://localhost:8080/swagger-ui.html`
- H2 console: `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:ecommercedb`, user: `sa`, no password)

### Switching to MySQL

Open `src/main/resources/application.yml`, comment out the H2 block, and uncomment the MySQL block —
update the username/password to match your local setup. That's it; the same JPA entities work against
either database.

## API Overview

| Method | Endpoint                          | Access        | Description                     |
|--------|------------------------------------|---------------|----------------------------------|
| POST   | `/api/auth/register`               | Public        | Create a new account             |
| POST   | `/api/auth/login`                  | Public        | Log in, get a JWT                |
| GET    | `/api/products`                    | Public        | List products (paginated)        |
| GET    | `/api/products/{id}`               | Public        | Get one product                  |
| GET    | `/api/products/category/{cat}`     | Public        | Filter by category               |
| GET    | `/api/products/search?name=...`    | Public        | Search by name                   |
| GET    | `/api/cart`                        | User          | View your cart                   |
| POST   | `/api/cart/items`                  | User          | Add item to cart                 |
| PUT    | `/api/cart/items/{id}?quantity=`   | User          | Update item quantity             |
| DELETE | `/api/cart/items/{id}`             | User          | Remove item                      |
| DELETE | `/api/cart`                        | User          | Clear cart                       |
| POST   | `/api/orders`                      | User          | Place order from current cart    |
| GET    | `/api/orders`                      | User          | Your order history                |
| GET    | `/api/orders/{id}`                 | User          | One of your orders                |
| POST   | `/api/admin/products`              | Admin         | Create product                   |
| PUT    | `/api/admin/products/{id}`         | Admin         | Update product                   |
| DELETE | `/api/admin/products/{id}`         | Admin         | Delete product                   |
| GET    | `/api/admin/orders`                | Admin         | View all orders                  |
| PUT    | `/api/admin/orders/{id}/status`    | Admin         | Update order status              |

All non-public routes require an `Authorization: Bearer <token>` header, where `<token>` comes
from the login/register response.

### Example flow

```bash
# 1. Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"jane","email":"jane@example.com","password":"secret123"}'

# 2. Log in (or reuse token from step 1)
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"jane","password":"secret123"}'

# 3. Browse products
curl http://localhost:8080/api/products

# 4. Add to cart (replace TOKEN)
curl -X POST http://localhost:8080/api/cart/items \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"productId":1,"quantity":2}'

# 5. Place order
curl -X POST http://localhost:8080/api/orders -H "Authorization: Bearer TOKEN"
```

## Project Structure

```
src/main/java/com/irisdemo/ecommerce/
├── controller/    REST endpoints
├── service/       business logic
├── repository/    Spring Data JPA interfaces
├── entity/        JPA entities
├── dto/           request/response payloads with validation
├── security/       JWT filter, JWT util, UserDetailsService
├── config/        Security config, OpenAPI config, dev data seeder
└── exception/     custom exceptions + global handler
```

## What to Say About This Project in an Interview

- **Stateless JWT auth**: no server-side sessions; the filter validates the token on every request
  and populates the Spring Security context manually (`JwtAuthFilter`).
- **Role-based access control**: `SecurityConfig` restricts `/api/admin/**` to `ROLE_ADMIN` declaratively.
- **Transactional integrity on checkout**: `OrderService.placeOrder` validates stock for *every* cart
  item before committing anything, so a partial/inconsistent order can't be created.
- **Layered architecture**: controllers stay thin, business rules live in services, and a
  `@RestControllerAdvice` centralizes error formatting instead of scattering try/catch everywhere.
- **DTOs + Bean Validation**: request payloads are validated declaratively (`@NotBlank`, `@Positive`, etc.)
  and never expose entities directly.

## Possible Extensions (good "what would you add next" answers)

- Refresh tokens / token blacklist on logout
- Redis caching for the product listing endpoint
- Payment gateway integration (mocked)
- Coupon/discount codes
- Dockerfile + docker-compose (app + MySQL)
- Rate limiting on auth endpoints
