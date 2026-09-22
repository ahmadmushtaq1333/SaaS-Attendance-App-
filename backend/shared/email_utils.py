def get_otp_html_template(code: str, purpose: str = "verify") -> str:
    if purpose == "verify":
        title = "Activate Your Account"
        instructions = "Thank you for joining Quorum! Please use the 6-digit verification code below to verify your email address and activate your account."
    else:
        title = "Reset Your Password"
        instructions = "We received a request to reset your password. Use the 6-digit security code below to complete the verification step."

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quorum Security Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); overflow: hidden;">
          <!-- Header Accent Banner -->
          <tr>
            <td align="center" style="padding: 30px 20px; background: linear-gradient(135deg, #4f46e5, #0d9488);">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 1px;">Quorum</h1>
              <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.85); font-size: 13px; font-weight: 500;">Attendance Management System</p>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 40px 35px; background-color: #ffffff;">
              <h2 style="margin-top: 0; margin-bottom: 15px; color: #111827; font-size: 20px; font-weight: 700; text-align: center;">
                {title}
              </h2>
              <p style="color: #4b5563; font-size: 14px; line-height: 1.6; text-align: center; margin-bottom: 30px;">
                {instructions}
              </p>
              
              <!-- Monospaced Code Box -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 25px;">
                <tr>
                  <td align="center">
                    <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 28px; display: inline-block; font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; color: #4f46e5; letter-spacing: 5px; text-shadow: 1px 1px 0px #ffffff;">
                      {code}
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="color: #dc2626; font-size: 12px; font-weight: 600; text-align: center; margin-top: 0; margin-bottom: 30px; display: flex; align-items: center; justify-content: center; gap: 4px;">
                ⏱️ This code is valid for 15 minutes.
              </p>
              
              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; text-align: center; margin: 0;">
                If you did not initiate this action, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Bottom Footer -->
          <tr>
            <td style="padding: 20px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                &copy; 2026 Quorum. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
