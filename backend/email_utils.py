import os
import httpx
from dotenv import load_dotenv

load_dotenv()

def is_configured():
    return bool(os.getenv("RESEND_API_KEY"))

def send_email(to_email: str, subject: str, html_content: str):
    resend_key = os.getenv("RESEND_API_KEY")
    if not resend_key:
        print(f"[Email Mock] To {to_email}: {subject}")
        return

    data = {
        "from": "Society Tracker <onboarding@resend.dev>",
        "to": [to_email],
        "subject": subject,
        "html": html_content
    }

    try:
        with httpx.Client() as client:
            response = client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {resend_key}"},
                json=data
            )
            response.raise_for_status()
            print(f"Email sent successfully to {to_email} via Resend", flush=True)
    except Exception as e:
        print(f"Failed to send email via Resend: {e}\nResponse: {getattr(e, 'response', None) and e.response.text}", flush=True)
        raise

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
