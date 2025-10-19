import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  pixelBasedPreset,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

export interface TeamInvitationEmailProps {
  username?: string;
  userImage?: string;
  invitedByUsername?: string;
  invitedByEmail?: string;
  teamName?: string;
  teamImage?: string;
  role?: string;
  inviteLink?: string;
  inviteFromIp?: string;
  inviteFromLocation?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function TeamInvitationEmail({
  username = "there",
  userImage,
  invitedByUsername = "Someone",
  invitedByEmail = "inviter@example.com",
  teamName = "Team",
  teamImage,
  role = "Member",
  inviteLink = `${baseUrl}/invite/token`,
  inviteFromIp = "0.0.0.0",
  inviteFromLocation = "Unknown",
}: TeamInvitationEmailProps) {
  const previewText = `Join ${invitedByUsername} on AIForge`;

  return (
    <Html>
      <Head />
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
        }}
      >
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Preview>{previewText}</Preview>
          <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-[#eaeaea] border-solid p-[20px]">
            {/* Logo Section */}
            <Section className="mt-[32px]">
              <Img
                src={`${baseUrl}/logo.png`}
                width="40"
                height="40"
                alt="AIForge Logo"
                className="mx-auto my-0"
              />
            </Section>

            {/* Heading */}
            <Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-black">
              Join <strong>{teamName}</strong> on <strong>AIForge</strong>
            </Heading>

            {/* Greeting */}
            <Text className="text-[14px] text-black leading-[24px]">
              Hello {username},
            </Text>

            {/* Invitation Message */}
            <Text className="text-[14px] text-black leading-[24px]">
              <strong>{invitedByUsername}</strong> (
              <Link
                href={`mailto:${invitedByEmail}`}
                className="text-blue-600 no-underline"
              >
                {invitedByEmail}
              </Link>
              ) has invited you to the <strong>{teamName}</strong> team on{" "}
              <strong>AIForge</strong> as a <strong>{role}</strong>.
            </Text>

            {/* User/Team Visual Row */}
            <Section>
              <Row>
                <Column align="right">
                  <Img
                    className="rounded-full"
                    src={userImage || "https://github.com/shadcn.png"}
                    width="64"
                    height="64"
                    alt={`${username}'s profile picture`}
                  />
                </Column>
                <Column align="center">
                  <Img
                    src={`${baseUrl}/arrow.png`}
                    width="12"
                    height="9"
                    alt="Arrow indicating invitation"
                  />
                </Column>
                <Column align="left">
                  <Img
                    className="rounded-full"
                    src={
                      teamImage ||
                      "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWF0b20taWNvbiBsdWNpZGUtYXRvbSI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMSIvPjxwYXRoIGQ9Ik0yMC4yIDIwLjJjMi4wNC0yLjAzLjAyLTcuMzYtNC41LTExLjktNC41NC00LjUyLTkuODctNi41NC0xMS45LTQuNS0yLjA0IDIuMDMtLjAyIDcuMzYgNC41IDExLjkgNC41NCA0LjUyIDkuODcgNi41NCAxMS45IDQuNVoiLz48cGF0aCBkPSJNMTUuNyAxNS43YzQuNTItNC41NCA2LjU0LTkuODcgNC41LTExLjktMi4wMy0yLjA0LTcuMzYtLjAyLTExLjkgNC41LTQuNTIgNC41NC02LjU0IDkuODctNC41IDExLjkgMi4wMyAyLjA0IDcuMzYuMDIgMTEuOS00LjVaIi8+PC9zdmc+"
                    }
                    width="64"
                    height="64"
                    alt={`${teamName} team logo`}
                  />
                </Column>
              </Row>
            </Section>

            {/* CTA Button */}
            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded bg-[#000000] px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
                href={inviteLink}
              >
                Join the team
              </Button>
            </Section>

            {/* Fallback Link */}
            <Text className="text-[14px] text-black leading-[24px]">
              or copy and paste this URL into your browser:{" "}
              <Link href={inviteLink} className="text-blue-600 no-underline">
                {inviteLink}
              </Link>
            </Text>

            {/* Divider */}
            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

            {/* Footer */}
            <Text className="text-[#666666] text-[12px] leading-[24px]">
              This invitation was intended for{" "}
              <span className="text-black">{username}</span>. This invite was
              sent from <span className="text-black">{inviteFromIp}</span>{" "}
              located in{" "}
              <span className="text-black">{inviteFromLocation}</span>. If you
              were not expecting this invitation, you can ignore this email. If
              you are concerned about your account's safety, please reply to
              this email to get in touch with us.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

// Preview Props for development
TeamInvitationEmail.PreviewProps = {
  username: "alanturing",
  userImage: `https://github.com/shadcn.png`,
  invitedByUsername: "Alan",
  invitedByEmail: "alan.turing@example.com",
  teamName: "Enigma",
  teamImage: ``,
  role: "Admin",
  inviteLink: "https://aiforge.host/invite/abc123",
  inviteFromIp: "204.13.186.218",
  inviteFromLocation: "São Paulo, Brazil",
} as TeamInvitationEmailProps;
