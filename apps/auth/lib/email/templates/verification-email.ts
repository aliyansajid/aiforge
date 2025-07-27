export const verificationEmailTemplate = (otp: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Validate your email - AIForge</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff;">
    <div style="background-color: #ffffff;">
        <div style="display: none; font-size: 1px; color: #ffffff; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
        </div>
        <div style="background-color: #ffffff;">    
            <div style="background: #ffffff; background-color: #ffffff; margin: 0px auto; max-width: 600px;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background: #ffffff; background-color: #ffffff; width: 100%;">
                    <tbody>
                        <tr>
                            <td style="direction: ltr; font-size: 0px; padding: 20px 0; text-align: center; vertical-align: top;">
                                <div class="mj-column-per-100" style="font-size: 13px; text-align: left; direction: ltr; display: inline-block; vertical-align: top; width: 100%;">
                                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align: top;" width="100%">
                                        <tbody>
                                            <tr>
                                                <td align="left" style="font-size: 0px; padding: 10px 25px; word-break: break-word;">
                                                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse; border-spacing: 0px;">
                                                        <tbody>
                                                            <tr>
                                                                <td style="width: 24px;">
                                                                    <img alt="AIForge logo" height="auto" src="https://your-domain.com/logo.png" style="border: 0; display: block; outline: none; text-decoration: none; height: auto; width: 100%;" width="24">
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td align="left" style="font-size: 0px; padding: 10px 25px; padding-top: 24px; padding-bottom: 24px; word-break: break-word;">
                                                    <div style="font-family: -apple-system, system-ui, BlinkMacSystemFont; font-size: 15px; font-weight: 300; line-height: 24px; text-align: left; color: #333333;">
                                                        <h1>Validate your email</h1>
                                                        <p>Hi,</p>
                                                        <p>Thank you for creating an AIForge account. Please use the code below to validate your email address.</p>
                                                        <table width="100%">
                                                            <tbody>
                                                                <tr>
                                                                    <td style="height: 15px;"></td>
                                                                </tr>
                                                                <tr>
                                                                    <td style="text-align: center; background: #fafafa; padding: 30px 20px; font-size: 26px; font-weight: bold;">${otp}</td>
                                                                </tr>
                                                                <tr>
                                                                    <td style="height: 15px;"></td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                        <p>If you did not create a new account, please ignore this email.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td align="left" style="font-size: 0px; padding: 10px 25px; word-break: break-word;">
                                                    <div style="font-family: -apple-system, system-ui, BlinkMacSystemFont; font-size: 15px; font-weight: 300; line-height: 24px; text-align: left; color: #333333;">
                                                        So long, and thanks for all the fish,<br>
                                                        <strong>The AIForge Team</strong>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="font-size: 0px; padding: 10px 25px; word-break: break-word;">
                                                    <p style="border-top: solid 1px #e8e8e8; font-size: 1; margin: 0px auto; width: 100%;"></p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td align="left" style="font-size: 0px; padding: 10px 25px; word-break: break-word;">
                                                    <div style="font-family: -apple-system, system-ui, BlinkMacSystemFont; font-size: 12px; font-weight: 300; line-height: 24px; text-align: left; color: #888888;">
                                                        © 2025 <a href="https://aiforge.host" target="_blank">AIForge</a>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td align="left" style="font-size: 0px; padding: 10px 25px; word-break: break-word;">
                                                    <div style="font-family: -apple-system, system-ui, BlinkMacSystemFont; font-size: 12px; font-weight: 300; line-height: 24px; text-align: left; color: #888888;">
                                                        For questions contact <a href="mailto:support@aiforge.host" style="color: #888888;">support@aiforge.host</a>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</body>
</html>
`;
