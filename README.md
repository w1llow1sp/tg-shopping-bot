
![LICENSE](https://img.shields.io/badge/License-MIT-blue.svg)

Telegram bot for your online shop.

## Preconditions

- A domain name or a tunneling tool like **ngrok** or **tuna** to expose your local server to the internet.
- Node.js 20.14 or higher
- PostgreSQL 17 or higher (lower versions may work but are not supported officially)
- Telegram API token obtained via [BotFather](https://core.telegram.org/bots#botfather).

---

## **Features**
- Process orders via Telegram.
- Integration with PostgreSQL database.
- Easy setup with Docker or local environment.
- Webhook-based real-time updates.

---

## **Installation and Setup**

### **1. Environment Variables**
Before running the bot, make sure you have the following environment variables set in a `.env` file:
```dotenv
NODE_ENV=production
POSTGRESQL_DSN=postgres://postgres:postgres@postgres:5432/postgres
WEBHOOK_URL=https://example.com/webhook
BOT_TOKEN=your_telegram_bot_token
```

---

### **2. Local Setup**
To run the bot locally, follow these steps:

1. Install dependencies:
```shell
make setup
```
2. Start the database:
```shell
make db/up
```
3. Apply database migrations:
```shell
make db/migrations/up
```
4. Start the bot:
```shell
make local/up
```

---

### **3. Docker Setup**
To run the bot in Docker containers, follow these steps:

1. Build the Docker image:
```shell
make docker/build
```
2. Start the database:
```shell
make db/up
```
3. Apply database migrations:
```shell
make db/migrations/up
```
4. Start the bot container:
```shell
make docker/up
```


---

## **Makefile Commands**
The project includes a `Makefile` for easier management. Below are the available commands:

| Command                  | Description                              |
|--------------------------|------------------------------------------|
| `make setup`             | Install dependencies                    |
| `make local/up`          | Run the bot locally                     |
| `make docker/build`      | Build the Docker image                  |
| `make docker/up`         | Start the bot container                 |
| `make docker/down`       | Stop all containers                     |
| `make db/up`             | Start the PostgreSQL database           |
| `make db/down`           | Stop the PostgreSQL database            |
| `make db/migrations/up`  | Apply database migrations               |
| `make db/migrations/down`| Rollback database migrations            |
| `make lint`              | Run ESLint                              |

---

## **License**
This project is licensed under the MIT License.


---

## **Notes**
- For webhook functionality, you must have either a domain name or use tunneling tools like **ngrok** or **tuna**.
- Ensure your environment variables are correctly set before starting the bot.
- Tou may create Makefile.override to create your own make aliases

Now you're ready to launch Telegram Shop Bot and manage your online shop directly through Telegram!
