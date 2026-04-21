import json
import os
import re
import sys
from datetime import datetime

import requests
from google.oauth2 import service_account
from googleapiclient.discovery import build

FOLDER_ID = "1NhUBAT3YvugXUtKDd9VH3vydnXkR2ny6"
SLACK_CHANNEL = "C060R6GS22X"
GID_PARAM = "?gid=1048416394#gid=1048416394"
FILENAME_PATTERN = re.compile(
    r"^([A-Za-z]+ \d{1,2}, \d{4}) Treasury Customer Cash - Short Term Investing\.xlsx$"
)


def get_drive_service():
    key_json = json.loads(os.environ["GOOGLE_SERVICE_ACCOUNT_KEY"])
    creds = service_account.Credentials.from_service_account_info(
        key_json, scopes=["https://www.googleapis.com/auth/drive.readonly"]
    )
    return build("drive", "v3", credentials=creds)


def find_latest_file(service):
    query = f"'{FOLDER_ID}' in parents and trashed=false"
    best_date = None
    best_file = None
    page_token = None

    while True:
        results = (
            service.files()
            .list(
                q=query,
                fields="nextPageToken, files(id, name)",
                pageSize=200,
                orderBy="createdTime desc",
                pageToken=page_token,
            )
            .execute()
        )

        for f in results.get("files", []):
            m = FILENAME_PATTERN.match(f["name"])
            if not m:
                continue
            file_date = datetime.strptime(m.group(1), "%B %d, %Y")
            if best_date is None or file_date > best_date:
                best_date = file_date
                best_file = f

        page_token = results.get("nextPageToken")
        if not page_token:
            break

    if not best_file:
        print("ERROR: No files matching expected pattern found in the Drive folder.")
        sys.exit(1)

    return best_file


def send_slack_message(file_id, file_name):
    url = f"https://docs.google.com/spreadsheets/d/{file_id}/edit{GID_PARAM}"
    text = f"Here is today's short-term investment report: <{url}|{file_name}>"

    resp = requests.post(
        "https://slack.com/api/chat.postMessage",
        headers={
            "Authorization": f"Bearer {os.environ['SLACK_BOT_TOKEN']}",
            "Content-Type": "application/json",
        },
        json={
            "channel": SLACK_CHANNEL,
            "text": text,
            "unfurl_links": False,
            "unfurl_media": False,
        },
    )
    data = resp.json()
    if not data.get("ok"):
        print(f"Slack API error: {data.get('error', 'unknown')}")
        sys.exit(1)

    permalink = data.get("message", {}).get("permalink", "")
    print(f"Message sent to #treasury-team-only: {permalink}")


def main():
    service = get_drive_service()
    latest = find_latest_file(service)
    print(f"Latest report: {latest['name']} (ID: {latest['id']})")
    send_slack_message(latest["id"], latest["name"])


if __name__ == "__main__":
    main()
