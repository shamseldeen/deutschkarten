import { Layout } from "@/components/layout";
import { ScrollText } from "lucide-react";

const EFFECTIVE_DATE = "27 May 2026";
const APP_NAME = "DeutschKarten";
const CONTACT_EMAIL = "support@deutschkarten.app";

export default function TermsPage() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center gap-3">
          <ScrollText className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-black">Terms of Service</h1>
            <p className="text-xs text-muted-foreground">Effective: {EFFECTIVE_DATE}</p>
          </div>
        </div>

        <Section title="1. Acceptance of Terms">
          <p>
            By accessing or using {APP_NAME} ("the App", "the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to all of these Terms, do not use the Service. Your continued use of the Service constitutes your acceptance of any updates to these Terms.
          </p>
        </Section>

        <Section title="2. Description of Service">
          <p>
            {APP_NAME} is a German-language vocabulary learning platform that allows users to study flashcards, track progress, earn achievement points, and participate in a learning community. The core vocabulary database is open and accessible to all users, including guests. Progress tracking, leaderboards, and community features require account registration.
          </p>
        </Section>

        <Section title="3. User Accounts">
          <ul className="list-disc pl-5 space-y-1">
            <li>You must provide accurate information when creating an account.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You may not use another person's account without permission.</li>
            <li>Accounts found to be fraudulent or abusive may be suspended or terminated without notice.</li>
            <li>You may delete your account at any time by contacting us at {CONTACT_EMAIL}.</li>
          </ul>
        </Section>

        <Section title="4. Community Guidelines">
          <p className="mb-2">
            The App includes a community area where users may share messages, experiences, and educational content. By posting in the community, you agree that:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your posts are visible to all registered users and potentially the public.</li>
            <li><strong>Do not share personal, private, sensitive, or confidential information</strong> — including your full name, address, phone number, financial details, passwords, or any other information you would not want publicly visible.</li>
            <li>You will not post content that is illegal, harassing, hateful, defamatory, or violates third-party rights.</li>
            <li>We reserve the right to remove any content that violates these guidelines without prior notice.</li>
            <li>You grant the App a non-exclusive, royalty-free license to display and use community content within the Service.</li>
          </ul>
        </Section>

        <Section title="5. Data Collection and Usage">
          <p className="mb-2">By using the Service, you acknowledge and consent to the following data practices:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Usage data</strong> (cards studied, progress, XP, streaks, quiz results) is collected to provide the core learning experience.</li>
            <li><strong>Community content</strong> you post may be reviewed by administrators and is visible to other users.</li>
            <li><strong>Aggregate and anonymized data</strong> may be used to improve the App, train or fine-tune AI models, and generate new vocabulary content.</li>
            <li>Your <strong>individual progress data</strong> may be accessed by the App's administrators for support and moderation purposes.</li>
            <li>We do not sell your personal data to third parties.</li>
          </ul>
          <p className="mt-2 text-sm text-muted-foreground">
            For full details see our <a href="/privacy" className="underline text-primary">Privacy Policy</a>.
          </p>
        </Section>

        <Section title="6. AI-Generated Content">
          <p>
            The App uses artificial intelligence (Google Gemini) to generate vocabulary flashcards. AI-generated content may contain errors. Users should not rely on it as a substitute for professional language instruction. The App makes no warranty regarding the accuracy, completeness, or fitness of AI-generated content for any particular purpose.
          </p>
        </Section>

        <Section title="7. Intellectual Property">
          <p>
            The vocabulary database, application code, design, and branding are the intellectual property of the App's owner. The core vocabulary content is made available as an open educational resource. You may not copy, reproduce, or distribute the App's code or design without prior written permission.
          </p>
        </Section>

        <Section title="8. Disclaimer of Warranties">
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT ANY WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. THE APP DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
          </p>
        </Section>

        <Section title="9. Limitation of Liability">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE APP OWNER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA, PROFITS, OR GOODWILL ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE. IN NO EVENT SHALL THE OWNER'S TOTAL LIABILITY EXCEED THE AMOUNT PAID BY YOU (IF ANY) FOR ACCESS TO THE SERVICE IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
          </p>
        </Section>

        <Section title="10. User-Generated Content Responsibility">
          <p>
            You are solely responsible for any content you post in the community. The App owner is not liable for any content posted by users. If you believe content violates these Terms or applicable law, use the report function within the App.
          </p>
        </Section>

        <Section title="11. Governing Law">
          <p>
            These Terms shall be governed by and construed in accordance with applicable law. Any disputes shall first be attempted to be resolved through good-faith negotiation. If unresolved, disputes shall be subject to the jurisdiction of the courts competent for the App owner's place of business.
          </p>
        </Section>

        <Section title="12. Changes to Terms">
          <p>
            We reserve the right to update these Terms at any time. Material changes will be notified to registered users via the App. Continued use after notification constitutes acceptance of the revised Terms.
          </p>
        </Section>

        <Section title="13. Contact">
          <p>
            For questions about these Terms, contact us at: <a href={`mailto:${CONTACT_EMAIL}`} className="underline text-primary">{CONTACT_EMAIL}</a>
          </p>
        </Section>
      </div>
    </Layout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-bold text-foreground border-b pb-1">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  );
}
