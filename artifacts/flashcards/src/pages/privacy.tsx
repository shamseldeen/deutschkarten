import { Layout } from "@/components/layout";
import { ShieldCheck } from "lucide-react";

const EFFECTIVE_DATE = "27 May 2026";
const APP_NAME = "DeutschKarten";
const CONTACT_EMAIL = "support@deutschkarten.app";

export default function PrivacyPage() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-black">Privacy Policy</h1>
            <p className="text-xs text-muted-foreground">Effective: {EFFECTIVE_DATE}</p>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-300">
          <strong>Important:</strong> Do not enter personal, private, or confidential information anywhere in this App — especially in community posts. Any content you post in the community is visible to other users and administrators.
        </div>

        <Section title="1. Who We Are">
          <p>
            {APP_NAME} is a German vocabulary learning application. References to "we", "our", or "the App" in this Policy refer to the App's owner and operator. For inquiries: <a href={`mailto:${CONTACT_EMAIL}`} className="underline text-primary">{CONTACT_EMAIL}</a>
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <h3 className="font-semibold text-foreground mt-2">2a. Information you provide:</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account information (email, display name) via Clerk authentication</li>
            <li>Profile image (if provided via your sign-in provider)</li>
            <li>Community posts and discussion content</li>
          </ul>
          <h3 className="font-semibold text-foreground mt-3">2b. Information collected automatically:</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Flashcard study progress (known/unknown per card)</li>
            <li>XP points, streaks, quiz results, accuracy rates</li>
            <li>Session timestamps and usage patterns</li>
            <li>Device type and browser information (standard server logs)</li>
          </ul>
          <h3 className="font-semibold text-foreground mt-3">2c. Guest users:</h3>
          <p>
            Guest users' progress is stored only in browser localStorage on their device. No personal data is collected from guests until they register.
          </p>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Service delivery:</strong> To show your progress, streaks, rankings, and community content</li>
            <li><strong>App improvement:</strong> Aggregate and anonymized usage data is used to improve the vocabulary database, UI, and learning algorithms</li>
            <li><strong>AI training:</strong> Anonymized usage patterns (not your personal identity) may be used to improve AI-generated flashcard quality</li>
            <li><strong>Moderation:</strong> Community content may be reviewed by administrators to enforce community guidelines</li>
            <li><strong>Communication:</strong> We may contact you at your registered email about account, security, or significant service changes</li>
          </ul>
        </Section>

        <Section title="4. Data Visibility — What Others Can See">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border px-3 py-2 text-left">Data</th>
                  <th className="border px-3 py-2 text-left">All Users</th>
                  <th className="border px-3 py-2 text-left">Admins</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Display name + avatar", "✅ (leaderboard/community)", "✅"],
                  ["XP points & rank", "✅ (if public leaderboard on)", "✅"],
                  ["Study streak", "✅ (leaderboard)", "✅"],
                  ["Community posts", "✅", "✅"],
                  ["Individual card progress", "❌", "✅ (moderation only)"],
                  ["Email address", "❌", "✅"],
                  ["Quiz results", "❌", "✅ (aggregate only)"],
                ].map(([item, users, admins]) => (
                  <tr key={item} className="hover:bg-muted/50">
                    <td className="border px-3 py-1.5">{item}</td>
                    <td className="border px-3 py-1.5">{users}</td>
                    <td className="border px-3 py-1.5">{admins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="5. Data Sharing">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>We do not sell your personal data.</strong></li>
            <li><strong>Clerk</strong> (clerk.com) handles authentication and stores your email and OAuth credentials under their own privacy policy.</li>
            <li><strong>Google Gemini API</strong> processes text prompts for flashcard generation. Prompts do not include your personal identity.</li>
            <li>We may disclose data if required by law, court order, or to protect the safety of users.</li>
          </ul>
        </Section>

        <Section title="6. Data Retention">
          <ul className="list-disc pl-5 space-y-1">
            <li>Account data is retained while your account is active.</li>
            <li>Upon account deletion request, personal data is deleted within 30 days, except where retention is required by law.</li>
            <li>Anonymized aggregate statistics (total cards studied by level, etc.) may be retained indefinitely.</li>
            <li>Community posts may remain visible after account deletion in anonymized form unless specifically requested otherwise.</li>
          </ul>
        </Section>

        <Section title="7. Your Rights">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Access:</strong> Request a copy of your data at any time</li>
            <li><strong>Correction:</strong> Update incorrect information in your profile</li>
            <li><strong>Deletion:</strong> Request deletion of your account and personal data</li>
            <li><strong>Opt-out:</strong> Disable public leaderboard visibility in your settings</li>
            <li><strong>Portability:</strong> Request your progress data in machine-readable format</li>
          </ul>
          <p className="mt-2">
            To exercise these rights, contact: <a href={`mailto:${CONTACT_EMAIL}`} className="underline text-primary">{CONTACT_EMAIL}</a>
          </p>
        </Section>

        <Section title="8. Security">
          <p>
            We use industry-standard measures including HTTPS encryption, hashed credentials (via Clerk), and access controls. However, no system is completely secure. Do not share sensitive personal information in community posts.
          </p>
        </Section>

        <Section title="9. Children's Privacy">
          <p>
            The Service is not directed at children under 13. We do not knowingly collect personal data from children under 13. If you believe a child has provided personal data, contact us immediately.
          </p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>
            We may update this Policy. Registered users will be notified of material changes via the App. Continued use after notification constitutes acceptance of the updated Policy.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            Privacy questions or requests: <a href={`mailto:${CONTACT_EMAIL}`} className="underline text-primary">{CONTACT_EMAIL}</a>
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
