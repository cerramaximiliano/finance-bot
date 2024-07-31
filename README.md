
# Finance Data Fetcher

Finance Data Fetcher is a Node.js application designed to fetch and process financial data from various sources, such as stock prices, economic calendars, and earnings calendars. This project aims to provide a robust and scalable solution for retrieving and managing financial data efficiently.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Cron Jobs](#cron-jobs)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Features

- Fetch stock prices from multiple sources
- Retrieve economic and earnings calendars
- Save and update financial data in MongoDB
- Schedule data fetching using cron jobs
- Rate limiting to handle API request limits
- Error handling and logging

## Installation

To install and run the project locally, follow these steps:

1. **Clone the repository:**
    ```bash
    git clone https://github.com/cerramaximiliano/finance-data-fetcher.git
    cd finance-data-fetcher
    ```

2. **Install dependencies:**
    ```bash
    npm install
    ```

3. **Set up environment variables:**
    Create a `.env` file in the root directory and add the necessary environment variables:
    ```env
    MONGO_URI=your_mongodb_uri
    TELEGRAM_BOT_TOKEN=your_telegram_bot_token
    CHAT_ID=your_telegram_chat_id
    TOPIC_INFORMES=your_telegram_topic_id
    ```

## Configuration

Ensure you have the following environment variables configured in your `.env` file:

- `MONGO_URI`: MongoDB connection string
- `TELEGRAM_BOT_TOKEN`: Token for your Telegram bot
- `CHAT_ID`: Default chat ID for sending messages
- `TOPIC_INFORMES`: Default topic ID for sending messages

## Usage

To start the application, use the following command:

```bash
npm start
```

This will initiate the bot and schedule the cron jobs for fetching data.

### Running with PM2

To run the application with PM2, use the following command:

```bash
pm2 start ecosystem.config.js
```

## API Endpoints

The application provides several endpoints for fetching financial data. Below are some examples:

- **Fetch Economic Calendar:**
    ```http
    GET /api/economic-calendar
    ```

- **Fetch Earnings Calendar:**
    ```http
    GET /api/earnings-calendar
    ```

## Cron Jobs

The application uses `node-cron` to schedule data fetching jobs. The following cron jobs are configured:

- **Open Market Data:**
    - Schedule: Monday to Friday at 9:30 AM
    - Task: Fetch and save open market data

- **Close Market Data:**
    - Schedule: Monday to Friday at 4:30 PM
    - Task: Fetch and save close market data

## Testing

To run tests, use the following command:

```bash
npm test
```

Ensure you have configured the necessary environment variables for testing.

## Contributing

Contributions are welcome! Please follow these steps to contribute:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature-name`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature-name`)
5. Create a Pull Request

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
