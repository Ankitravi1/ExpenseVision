# ExpenseVision

A modern, full-stack personal finance application built with React, Node.js, and SQLite.

![ExpenseVision Dashboard](https://via.placeholder.com/800x400?text=ExpenseVision+Dashboard)

## 🚀 Features

- **Dashboard**: Real-time financial overview with charts and insights.
- **Transactions**: Advanced filtering, search, and CSV export.
- **Accounts**: Track balances across multiple accounts (Checking, Savings, Credit Cards).
- **Categories**: Manage income and expense categories with custom icons.
- **Budgets**: Set monthly budgets and track progress.
- **Profile & Settings**: Customization options including Dark Mode and Currency preferences.

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Recharts, Lucide React.
- **Backend**: Node.js, Express, Prisma, SQLite.
- **Design**: Glassmorphism UI, Responsive Layout, Dark Mode support.

## 🏁 Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/expensevision.git
    cd expensevision
    ```

2.  **Install Frontend Dependencies**
    ```bash
    npm install
    ```

3.  **Install Backend Dependencies**
    ```bash
    cd backend
    npm install
    ```

4.  **Setup Database**
    ```bash
    # In backend directory
    npm run db:push  # Create database tables
    npm run db:seed  # Seed initial data
    ```

### Running the App

1.  **Start Backend Server**
    ```bash
    cd backend
    npm run dev
    ```
    Server will start on `http://localhost:5000`.

2.  **Start Frontend Server** (in a new terminal)
    ```bash
    cd ..
    npm run dev
    ```
    App will run on `http://localhost:3000`.

## 📝 Documentation

- **Task List**: See `task.md.resolved` in the project documentation.
- **Implementation Plan**: See `implementation_plan.md.resolved` in the project documentation.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
