import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

def is_configured():
    return bool(SMTP_EMAIL and SMTP_PASSWORD)

def send_email(to_email: str, subject: str, html_content: str):
    if not is_configured():
        print(f"[Email Mock] To {to_email}: {subject}")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Society Tracker <{SMTP_EMAIL}>"
    msg["To"] = to_email

    part = MIMEText(html_content, "html")
    msg.attach(part)

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
            print(f"Email sent successfully to {to_email}")
    except Exception as e:
        print(f"Failed to send email: {e}")

def send_status_update_email(to_email: str, complaint_title: str, new_status: str, note: str = None):
    html_content = f"<h2>Update on your complaint: {complaint_title}</h2><p>The status of your complaint has been updated to: <strong>{new_status}</strong></p>"
    if note:
        html_content += f"<p>Admin Note: {note}</p>"
        
    send_email(to_email, f"Complaint Update: {complaint_title}", html_content)

def send_notice_email(emails: list[str], title: str, content: str, category: str, is_important: bool):
    prefix = "[IMPORTANT] " if is_important else ""
    html_content = f"<h2>{prefix}{title}</h2><p><strong>Category:</strong> {category}</p><p>{content}</p>"
    for email in emails:
        send_email(email, f"New Community Notice: {title}", html_content)
