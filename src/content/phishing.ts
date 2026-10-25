import { siteConfig } from "@/config/site";

/**
 * Phishing Spotter scenarios. Links are never real links in the game: players only
 * see where they *would* go. Clue targets are "from", "replyTo", "link-<n>" (n counts
 * the email's links in order, from 0) and "attachment-<n>".
 */

export type MailSegment = string | { link: string; href: string };

export interface PhishingEmail {
  id: string;
  from: { name: string; address: string };
  replyTo?: string;
  subject: string;
  time: string;
  body: MailSegment[][];
  attachments?: { name: string; size: string }[];
  phish: boolean;
  clues: { target: string; why: string }[];
  /** shown after answering: the other giveaways, or why it's genuine */
  notes: string[];
}

const site = siteConfig.url.replace(/\/$/, "");

export const phishingEmails: PhishingEmail[] = [
  {
    id: "exam-results",
    from: { name: "NIE Examination Cell", address: "examcell@nie-results.in" },
    subject: "URGENT: Your semester result is WITHHELD",
    time: "8:02 AM",
    body: [
      ["Dear Student,"],
      [
        "Your result for the current semester has been withheld due to a pending fee verification. Verify your payment within 24 hours or your result will be cancelled.",
      ],
      [{ link: "View my result", href: "http://nie-results.in/verify?sid=4NI23CS" }],
      ["Examination Cell"],
    ],
    phish: true,
    clues: [
      { target: "from", why: "The college's domain is nie.ac.in. “nie-results.in” is a lookalike anyone can register." },
      { target: "link-0", why: "The button leads to the lookalike site over plain http, not to an nie.ac.in page." },
    ],
    notes: [
      "Panic and a 24-hour deadline are designed to stop you from thinking.",
      "Results and fees are handled on the official portal: go there yourself instead of clicking.",
    ],
  },
  {
    id: "drive-share",
    from: { name: "Haripriya (via Google Drive)", address: "drive-shares-dm-noreply@google.com" },
    subject: "Haripriya shared “ISSA Event Plan” with you",
    time: "10:15 AM",
    body: [
      ["Haripriya shared a spreadsheet with you."],
      ["“Can you add your pod's tasks by Friday? Thanks!”"],
      [{ link: "Open in Sheets", href: "https://docs.google.com/spreadsheets/d/1qX9ISSAeventPLAN/edit" }],
    ],
    phish: false,
    clues: [],
    notes: [
      "Sent from google.com, and the link goes to docs.google.com.",
      "It's from someone you work with, about something you'd expect. When in doubt, open Drive yourself and check “Shared with me”.",
    ],
  },
  {
    id: "m365-password",
    from: { name: "Microsoft 365", address: "no-reply@micros0ft-support.com" },
    subject: "Your password expires today",
    time: "11:48 AM",
    body: [
      ["Your Microsoft 365 password expires in 2 hours. To keep using your current password, confirm it below."],
      [{ link: "Keep current password", href: "https://micros0ft-support.com/owa/login.php" }],
      ["If you do not act, your mailbox will be suspended."],
    ],
    phish: true,
    clues: [
      { target: "from", why: "“micros0ft” has a zero instead of the letter o. Real mail comes from microsoft.com." },
      { target: "link-0", why: "The login page is on the fake domain, so any password typed there is stolen." },
    ],
    notes: [
      "Nobody can “keep” your password by asking you to type it on a web page.",
      "A threat (“your mailbox will be suspended”) plus a tight deadline is a classic phishing combo.",
    ],
  },
  {
    id: "bank-kyc",
    from: { name: "SBI Alerts", address: "alerts@sbi-kyc-update.co" },
    subject: "Account blocked: update your KYC now",
    time: "1:20 PM",
    body: [
      ["Dear Customer, your account has been temporarily blocked because your KYC is incomplete."],
      ["Complete your KYC immediately to avoid permanent suspension:"],
      [{ link: "Update KYC", href: "http://sbi-kyc-update.co/kyc/login" }],
    ],
    phish: true,
    clues: [
      { target: "from", why: "Not the bank's real domain: “sbi-kyc-update.co” was made up to look official." },
      { target: "link-0", why: "Takes you to a fake bank login page over http." },
    ],
    notes: [
      "Banks never ask you to update KYC through an email link. Visit the branch or type the bank's address yourself.",
      "“Blocked”, “immediately”, “permanent suspension”: urgency is the hook.",
    ],
  },
  {
    id: "issa-hack-night",
    from: { name: "ISSA NIE", address: siteConfig.email },
    subject: "Hack Night this Friday: Web Exploitation 101",
    time: "3:05 PM",
    body: [
      ["Hey there!"],
      [
        "Our next Hack Night is this Friday, 5–8 PM. Bring a laptop; we'll break (and fix) a deliberately vulnerable web app together.",
      ],
      ["Seats are limited, so grab yours here:", { link: "Register on the ISSA website", href: `${site}/register` }],
    ],
    attachments: [{ name: "HackNight_Poster.png", size: "412 KB" }],
    phish: false,
    clues: [],
    notes: [
      `Comes from the club's real address (${siteConfig.email}) and links to the club's own website.`,
      "No passwords, no payments, no threats. The image attachment is a normal poster, not a program.",
    ],
  },
  {
    id: "internship-offer",
    from: { name: "NIE Placement Cell", address: "placements.nie@gmail.com" },
    replyTo: "hr@quickjobs-offer.xyz",
    subject: "Congratulations! Selected for paid internship (₹25,000/month)",
    time: "4:32 PM",
    body: [
      ["Congratulations! Based on your profile you have been shortlisted for a remote internship with a leading MNC."],
      ["To confirm your seat, pay the refundable registration fee of ₹499 and fill in the attached offer letter."],
    ],
    attachments: [{ name: "Offer_Letter.pdf.exe", size: "1.2 MB" }],
    phish: true,
    clues: [
      { target: "from", why: "An official college cell wouldn't write from a free Gmail address." },
      { target: "replyTo", why: "Replies quietly go to a completely different domain, quickjobs-offer.xyz." },
      { target: "attachment-0", why: "“.pdf.exe” is a program pretending to be a PDF. Opening it would run malware." },
    ],
    notes: [
      "Real internships don't charge you to accept an offer.",
      "You never applied, yet you were “selected”: too good to be true.",
    ],
  },
  {
    id: "github-ssh",
    from: { name: "GitHub", address: "noreply@github.com" },
    subject: "[GitHub] A new SSH authentication key was added to your account",
    time: "6:47 PM",
    body: [
      ["The following SSH key was added to your account: “laptop-lab3” (ED25519)."],
      ["If you believe this key was added in error, review your keys:"],
      [{ link: "Review SSH keys", href: "https://github.com/settings/keys" }],
    ],
    phish: false,
    clues: [],
    notes: [
      "Sent from github.com and the link points to github.com/settings, not a lookalike.",
      "It doesn't ask for your password; it just tells you something changed. Security alerts like this are worth reading, but you can also open GitHub yourself to check.",
    ],
  },
  {
    id: "gift-card-prize",
    from: { name: "Amazon Pay Rewards", address: "rewards@amazon-pay-gift.in" },
    subject: "You've won a ₹5,000 gift card!",
    time: "8:10 PM",
    body: [
      ["You were randomly selected as today's lucky winner!"],
      ["Claim your ₹5,000 gift card in the next 30 minutes before it goes to someone else:"],
      [{ link: "Claim my reward", href: "https://bit.ly/claim-5000-now" }],
    ],
    phish: true,
    clues: [
      { target: "from", why: "Amazon doesn't use “amazon-pay-gift.in”; it's a lookalike domain." },
      { target: "link-0", why: "A shortened bit.ly link hides where it really goes. Never trust one in a prize email." },
    ],
    notes: ["You can't win a contest you never entered.", "The 30-minute countdown is pressure, not a real deadline."],
  },
  {
    id: "president-favour",
    from: { name: "President, ISSA", address: "president.issa.nie@outlook.com" },
    subject: "Quick favour?",
    time: "9:26 PM",
    body: [
      ["Hi, are you free? I'm stuck in a meeting and need a quick favour for tomorrow's event."],
      [
        "Please buy 4 Google Play gift cards of ₹1,000 each and send me the codes on this email asap. I'll reimburse you tomorrow. Don't tell anyone yet, it's a surprise.",
      ],
      ["Sent from my phone"],
    ],
    phish: true,
    clues: [{ target: "from", why: "A personal Outlook address, not the club's account, pretending to be a club leader." }],
    notes: [
      "Gift-card requests are almost always scams: the codes are as good as cash and can't be traced.",
      "Secrecy (“don't tell anyone”) is there to stop you from double-checking. Call or message the person directly.",
    ],
  },
  {
    id: "library-due",
    from: { name: "NIE Central Library", address: "library@nie.ac.in" },
    subject: "Reminder: 2 books due on Friday",
    time: "Yesterday",
    body: [
      ["This is a reminder that the following books are due on Friday: “Computer Networks” and “Applied Cryptography”."],
      ["You can renew them online or at the circulation desk."],
      [{ link: "Renew online", href: "https://library.nie.ac.in/renew" }],
    ],
    phish: false,
    clues: [],
    notes: [
      "Comes from the college's own domain and links to a page on nie.ac.in.",
      "Specific, expected and calm: no threats, no payment, no password request.",
    ],
  },
];

/** 100 for the right verdict, +25 per red flag spotted. */
export const VERDICT_POINTS = 100;
export const CLUE_POINTS = 25;
/** Flagging something harmless costs a little, so clicking everything doesn't pay. */
export const FALSE_FLAG_PENALTY = 10;

export const maxScore = (emails: PhishingEmail[]) =>
  emails.reduce((sum, e) => sum + VERDICT_POINTS + e.clues.length * CLUE_POINTS, 0);
