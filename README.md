# mass_api

## Description

`mass_api` is a backend API project built using [NestJS](https://nestjs.com/), featuring WebSocket support, JWT authentication, Prisma ORM integration for database interactions, and modern development practices.

## Installation

1. Clone the repository:

    ```bash
    git clone <repository-url>
    cd mass_api
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Set up the environment variables by copying the example file:

    ```bash
    cp .env.example .env
    ```

4. Run Prisma migrations to sync the database:

    ```bash
    npx prisma migrate dev
    ```

## Scripts

The project supports the following commands:

- **Build the project**:

    ```bash
    npm run build
    ```

- **Run the project**:
  
    In development mode:
    ```bash
    npm run start:dev
    ```

    In production mode:
    ```bash
    npm run start:prod
    ```

- **Testing**:
  
    Run all tests:
    ```bash
    npm run test
    ```

    Run tests in watch mode:
    ```bash
    npm run test:watch
    ```

    Run test coverage:
    ```bash
    npm run test:cov
    ```

- **Linting and formatting**:
  
    Lint the project and fix issues:
    ```bash
    npm run lint
    ```

    Format the code:
    ```bash
    npm run format
    ```

## Technologies

- **NestJS** - A modular framework for building server-side applications.
- **Prisma** - An ORM for database management.
- **JWT** - For user authentication.
- **WebSocket** - For real-time communication.
- **TypeScript** - The primary programming language.
- **Jest** - For testing.

## License

This project is private and licensed as `UNLICENSED`.

## Author

X7uned
