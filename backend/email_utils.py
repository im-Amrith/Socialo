import os
import httpx

def is_configured():
    return bool(os.getenv("BREVO_API_KEY"))

def send_email(to_email: str, subject: str, html_content: str):
    api_key = os.getenv("BREVO_API_KEY")
    if not api_key:
        print(f"[Email Mock] To {to_email}: {subject}")
        return

    data = {
        "sender": {
            "name": "Society Tracker",
            "email": os.getenv("BREVO_SENDER_EMAIL", "iamangel2305@gmail.com")
        },
        "to": [
            {
                "email": to_email
            }
        ],
        "subject": subject,
        "htmlContent": html_content
    }

    try:
        with httpx.Client() as client:
            response = client.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "api-key": api_key,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                json=data
            )
            response.raise_for_status()
            print(f"Email sent successfully to {to_email} via Brevo", flush=True)
    except Exception as e:
        print(f"Failed to send email via Brevo: {e}\nResponse: {getattr(e, 'response', None) and e.response.text}", flush=True)
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
