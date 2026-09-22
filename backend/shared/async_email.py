from django.core.mail import send_mail

def send_in_background(subject, message, from_addr, recipient_list, html_message=None):
    try:
        send_mail(
            subject,
            message,
            from_addr,
            recipient_list,
            fail_silently=False,
            html_message=html_message
        )
        print(f"[ASYNC EMAIL SENT] To: {recipient_list}")
    except Exception as e:
        print(f"[ASYNC EMAIL FAILED]: {e}")
