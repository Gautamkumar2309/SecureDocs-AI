import smtplib
from email.message import EmailMessage
from urllib.parse import urlencode

from app.core.config import settings


def send_verification_email(
    to_email: str,
    verification_token: str,
) -> None:
    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        raise RuntimeError("SMTP credentials are not configured")

    query_string = urlencode({"token": verification_token})
    verification_link = (
        f"{settings.FRONTEND_URL.rstrip('/')}/VerifyEmail?{query_string}"
    )

    message = EmailMessage()
    message["Subject"] = "Verify your SecureDocs AI account"
    message["From"] = settings.SMTP_USERNAME
    message["To"] = to_email

    message.set_content(
        "Welcome to SecureDocs AI!\n\n"
        "Please open the link below to verify your email address:\n\n"
        f"{verification_link}\n\n"
        "This link expires after 24 hours. If you did not create this "
        "account, you can ignore this email."
    )

    with smtplib.SMTP(
        settings.SMTP_HOST,
        settings.SMTP_PORT,
        timeout=20,
    ) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(message)

def send_password_reset_email(
    to_email: str,
    reset_token: str,
) -> None:
    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        raise RuntimeError("SMTP credentials are not configured")

    query_string = urlencode({"token": reset_token})
    reset_link = (
        f"{settings.FRONTEND_URL.rstrip('/')}/ResetPassword?{query_string}"
    )

    message = EmailMessage()
    message["Subject"] = "Reset your SecureDocs AI password"
    message["From"] = settings.SMTP_USERNAME
    message["To"] = to_email

    message.set_content(
        "We received a request to reset your SecureDocs AI password.\n\n"
        "Open the link below to choose a new password:\n\n"
        f"{reset_link}\n\n"
        "This link expires after 30 minutes. If you did not request "
        "a password reset, you can ignore this email."
    )

    with smtplib.SMTP(
        settings.SMTP_HOST,
        settings.SMTP_PORT,
        timeout=20,
    ) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(message)        