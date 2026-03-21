import os
import sys
import json

# Use pymysql directly to avoid SQLAlchemy async loops
import pymysql

def get_tokens():
    try:
        connection = pymysql.connect(
            host='mysql',
            user='xentraldesk',
            password='xentraldesk_dev',
            database='xentraldesk',
            cursorclass=pymysql.cursors.DictCursor
        )
        with connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT config FROM channels WHERE type='discord' AND is_active=1")
                rows = cursor.fetchall()
                with open("TOKENS.txt", "w") as f:
                    for row in rows:
                        config = json.loads(row['config'])
                        token = config.get("token") or config.get("bot_token")
                        f.write(f"{token}\n")
                print("TOKENS_SAVED_TO_FILE")
    except Exception as e:
        print(f"FATAL: {e}")

if __name__ == "__main__":
    get_tokens()
