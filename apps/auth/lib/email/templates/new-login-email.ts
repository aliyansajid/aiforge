interface NewLoginEmailData {
  firstName: string;
  loginTime: string;
  ipAddress: string;
  location: string;
  browser: string;
}

export const newLoginEmailTemplate = (data: NewLoginEmailData) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>New Login Alert - AIForge</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #ffffff">
    <div style="background-color: #ffffff">
      <div
        style="
          display: none;
          font-size: 1px;
          color: #ffffff;
          line-height: 1px;
          max-height: 0px;
          max-width: 0px;
          opacity: 0;
          overflow: hidden;
        "
      >
        Your AIForge account has been accessed from a new IP address
      </div>
      <div style="background-color: #ffffff">
        <div
          style="
            background: #ffffff;
            background-color: #ffffff;
            margin: 0px auto;
            max-width: 600px;
          "
        >
          <table
            align="center"
            border="0"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="background: #ffffff; background-color: #ffffff; width: 100%"
          >
            <tbody>
              <tr>
                <td
                  style="
                    direction: ltr;
                    font-size: 0px;
                    padding: 20px 0;
                    text-align: center;
                    vertical-align: top;
                  "
                >
                  <div
                    style="
                      font-size: 13px;
                      text-align: left;
                      direction: ltr;
                      display: inline-block;
                      vertical-align: top;
                      width: 100%;
                    "
                  >
                    <table
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation"
                      style="vertical-align: top"
                      width="100%"
                    >
                      <tbody>
                        <tr>
                          <td
                            align="left"
                            style="
                              font-size: 0px;
                              padding: 10px 25px;
                              word-break: break-word;
                            "
                          >
                            <table
                              border="0"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                              style="
                                border-collapse: collapse;
                                border-spacing: 0px;
                              "
                            >
                              <tbody>
                                <tr>
                                  <td style="width: 24px">
                                    <img
                                      alt="AIForge logo"
                                      height="auto"
                                      src="https://aiforge.host/logo.png"
                                      style="
                                        border: 0;
                                        display: block;
                                        outline: none;
                                        text-decoration: none;
                                        height: auto;
                                        width: 100%;
                                      "
                                      width="24"
                                    />
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td
                            align="left"
                            style="
                              font-size: 0px;
                              padding: 10px 25px;
                              padding-top: 24px;
                              padding-bottom: 24px;
                              word-break: break-word;
                            "
                          >
                            <div
                              style="
                                font-family: -apple-system, system-ui,
                                  BlinkMacSystemFont;
                                font-size: 15px;
                                font-weight: 300;
                                line-height: 24px;
                                text-align: left;
                                color: #333333;
                              "
                            >
                              <h1>We've noticed a new login</h1>
                              <p>Hi ${data.firstName},</p>
                              <p>
                                This is a routine security alert. Someone logged
                                into your AIForge account from a new IP address:
                              </p>
                              <p>
                                <strong>Time:</strong> ${data.loginTime}<br />
                                <strong>IP address:</strong> ${data.ipAddress}<br />
                                <strong>Location:</strong> ${data.location}<br />
                                <strong>Browser:</strong> ${data.browser}
                              </p>
                              <p>
                                If this was you, you can ignore this alert. If
                                you noticed any suspicious activity on your
                                account, please
                                <a
                                  href="https://aiforge.host/change-password"
                                  target="_blank"
                                  >change your password</a
                                >
                                and
                                <a
                                  href="https://aiforge.host/settings"
                                  target="_blank"
                                  >enable two-factor authentication</a
                                >
                                on your
                                <a
                                  href="https://aiforge.host/"
                                  target="_blank"
                                  >account page</a
                                >.
                              </p>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td
                            align="left"
                            style="
                              font-size: 0px;
                              padding: 10px 25px;
                              word-break: break-word;
                            "
                          >
                            <div
                              style="
                                font-family: -apple-system, system-ui,
                                  BlinkMacSystemFont;
                                font-size: 15px;
                                font-weight: 300;
                                line-height: 24px;
                                text-align: left;
                                color: #333333;
                              "
                            >
                              So long, and thanks for all the fish,<br />
                              <strong style="font-weight: 500"
                                >The AIForge Team</strong
                              >
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td
                            style="
                              font-size: 0px;
                              padding: 10px 25px;
                              word-break: break-word;
                            "
                          >
                            <p
                              style="
                                border-top: solid 1px #e8e8e8;
                                font-size: 1;
                                margin: 0px auto;
                                width: 100%;
                              "
                            ></p>
                          </td>
                        </tr>
                        <tr>
                          <td
                            align="left"
                            style="
                              font-size: 0px;
                              padding: 10px 25px;
                              word-break: break-word;
                            "
                          >
                            <div
                              style="
                                font-family: -apple-system, system-ui,
                                  BlinkMacSystemFont;
                                font-size: 12px;
                                font-weight: 300;
                                line-height: 24px;
                                text-align: left;
                                color: #888888;
                              "
                            >
                              © 2025
                              <a href="https://aiforge.host" target="_blank"
                                >AIForge</a
                              >
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td
                            align="left"
                            style="
                              font-size: 0px;
                              padding: 10px 25px;
                              word-break: break-word;
                            "
                          >
                            <div
                              style="
                                font-family: -apple-system, system-ui,
                                  BlinkMacSystemFont;
                                font-size: 12px;
                                font-weight: 300;
                                line-height: 24px;
                                text-align: left;
                                color: #888888;
                              "
                            >
                              For questions contact
                              <a
                                href="mailto:support@aiforge.host"
                                style="color: #888888"
                                >support@aiforge.host</a
                              >
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
