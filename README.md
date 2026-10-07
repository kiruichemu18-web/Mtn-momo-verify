# MTN Training Demo + Telegram Review

Safe training simulation:
- Demo code `123456` is checked locally in the browser.
- The code is never transmitted to Telegram or the server.
- The server creates a random `DEMO-xxxxxx` request ID.
- Telegram receives only that request ID and Approve/Reject buttons.
- Approval/rejection updates the browser.

## Render settings
Build Command: `npm install`
Start Command: `npm start`

## Render environment variables
Set these in Render (do not put them in GitHub):
- `TELEGRAM_BOT_TOKEN` = your Telegram bot token
- `TELEGRAM_CHAT_ID` = the chat ID where the bot should send training requests

If either variable is missing, the website still works as a local demo, but Telegram review will not be active.
