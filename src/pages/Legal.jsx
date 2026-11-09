/**
 * pages/Legal.jsx — public Privacy Policy and Terms of Service (/privacy, /terms).
 * Draft wording: have a lawyer review before relying on it.
 */
import './Legal.css';
import LogoGlyph from '../components/shared/Logo';

const COMPANY = 'KuiHua Technologies';
const EMAIL = 'contact@kuihua.org';
const UPDATED = '9 November 2026';

const PRIVACY = {
  title: 'Privacy Policy',
  intro: 'Invmatics collects only the data needed to run your inventory and operations account, never sells it, and lets you export or delete it on request.',
  sections: [
    { h: '1. Who we are', p: [`Invmatics is operated by ${COMPANY} ("we", "us"). For privacy questions, contact ${EMAIL}.`] },
    { h: '2. Data we collect', ul: [
      'Account data: first name, last name, email address (no public username is used), sign-in identifiers and role (admin, manager, sales, warehouse or finance), handled through our sign-in provider.',
      'Business data you enter: company name, logo, address, tax and bank details shown on documents, products, stock levels, suppliers, customers, sales orders, purchase orders, invoices, quotations, receipts and delivery orders.',
      'Delivery proof: photos, recipient names and notes that your staff upload when confirming a delivery.',
      'Support messages: what you send through the Help & Support page.',
      'Settings: your timezone, default currency and display preferences.',
      'Technical data: IP address, browser type and basic logs needed to keep the service secure and working.',
    ], p2: ['Customer and supplier details you enter may include personal data of third parties. You are responsible for having a lawful basis to enter it.'] },
    { h: '3. How we use it', ul: [
      'Provide and operate the service, including generating PDF documents.',
      'Convert amounts between currencies using public exchange rates.',
      'Respond to support requests and send service notices.',
      'Protect against fraud and abuse, and fix bugs.',
      'Comply with legal obligations.',
    ], p2: ['We do not sell personal data or use your business data for advertising.'] },
    { h: '4. Service providers we share data with', table: [
      ['Clerk', 'Sign-in and user management'],
      ['Supabase', 'Database hosting'],
      ['Vercel', 'Application hosting'],
      ['Render', 'PDF generation'],
      ['Open Exchange Rates (open.er-api.com)', 'Currency rates; receives no personal data'],
      ['Stripe', 'Payments; card details go to Stripe, not to us'],
    ], p2: ['We may also disclose data when required by law. If we are involved in a merger or sale, data may transfer to the successor under this policy.'] },
    { h: '5. Cookies and local storage', p: ['We use cookies and browser storage for sign-in sessions and to remember preferences such as dark mode. We do not use advertising cookies.'] },
    { h: '6. Retention', p: ['We keep your data while your account is active. After cancellation or deletion we remove business data within 30 days, except where we must keep records by law, and backups expire within 90 days.'] },
    { h: '7. Security', p: ["Data is encrypted in transit, each organisation's data is isolated by access rules, and access is limited by role. No system is perfectly secure; tell us promptly at " + EMAIL + ' if you suspect a breach.'] },
    { h: '8. Your rights', p: [`Depending on where you live (including Thailand's Personal Data Protection Act, and the GDPR where it applies), you may ask to access, correct, export or delete your personal data, object to or restrict processing, and withdraw consent. Email ${EMAIL}; we will respond within 30 days. You may also complain to your local data protection authority.`] },
    { h: '9. International transfers', p: ['Our providers may process data outside your country. We rely on appropriate safeguards, such as contractual protections, where required.'] },
    { h: '10. Children', p: ['Invmatics is a business tool not directed at anyone under 18, and we do not knowingly collect their data.'] },
    { h: '11. Changes', p: ['We will post updates here and, for material changes, notify account admins by email before they take effect.'] },
    { h: '12. Contact', p: [`${COMPANY} · ${EMAIL}`] },
  ],
};

const TERMS = {
  title: 'Terms of Service',
  intro: 'These terms govern your use of Invmatics. You keep ownership of your data, and you are responsible for the accuracy of the documents you issue.',
  sections: [
    { h: '1. Acceptance', p: [`By creating an account or using Invmatics you agree to these terms on behalf of yourself and your business. If you do not agree, do not use the service. The service is provided by ${COMPANY} ("we").`] },
    { h: '2. Accounts and roles', ul: [
      'You must provide accurate information and keep sign-in credentials secure.',
      "The account admin controls who joins the organisation and assigns roles; you are responsible for activity under your organisation's accounts.",
      'You must be at least 18 and authorised to bind your business.',
    ] },
    { h: '3. Plans, trial and payment', ul: [
      'New organisations get a 14-day free trial with no card required. After the trial, an organisation must choose a paid plan to keep editing; until then its data stays viewable and exportable.',
      'Paid plans are Starter ($15/month), Growth ($39/month) and Business ($99/month). Annual billing is charged at 10 months for 12. Prices exclude taxes.',
      'Payments are processed by Stripe. Subscriptions renew automatically until cancelled; you can cancel any time and keep access until the period ends.',
      'Fees already paid are non-refundable except where required by law.',
      'We may change prices with at least 30 days\' notice before your next renewal.',
      'Plan limits (staff, products, features) apply as described on our pricing page.',
    ] },
    { h: '4. Your data', p: ['You own the data you put into Invmatics. You grant us a limited licence to host, process and display it solely to provide the service. You can export your data at any time and request deletion as described in our Privacy Policy. You are responsible for having the right to enter any personal data of your customers and suppliers.'] },
    { h: '5. Documents and accuracy', p: ['Invmatics generates invoices, quotations, receipts, purchase orders and delivery documents from information you provide. You are solely responsible for their content, tax treatment, numbering, legal compliance and currency amounts. Exchange rates come from a third-party source and are indicative; we do not guarantee their accuracy. Invmatics is not accounting, tax or legal advice.'] },
    { h: '6. Acceptable use', p: ['You agree not to: break the law; upload malicious code; attempt unauthorised access or probe the service; resell or share accounts outside your organisation; overload the service; or use it to store unlawful content. We may suspend accounts that breach this section.'] },
    { h: '7. Availability and support', p: ['We aim for reliable service but do not guarantee uninterrupted or error-free operation. We may perform maintenance and will try to give notice of planned downtime. Support is available through the Help & Support page; response times depend on your plan.'] },
    { h: '8. Our intellectual property', p: ['The Invmatics software, brand and design belong to us. These terms give you a non-exclusive, non-transferable right to use the service during your subscription. Feedback you send may be used by us without obligation.'] },
    { h: '9. Termination', p: ['You may cancel at any time. We may suspend or terminate access for non-payment, breach of these terms or legal requirement, with notice where practical. After termination you may export your data for 30 days, after which it is deleted as described in the Privacy Policy.'] },
    { h: '10. Disclaimers', p: ['The service is provided "as is" and "as available". To the maximum extent permitted by law we disclaim all warranties, including merchantability, fitness for a particular purpose and non-infringement.'] },
    { h: '11. Limitation of liability', p: ['To the maximum extent permitted by law, we are not liable for indirect, incidental or consequential losses, lost profits or lost data. Our total liability for any claim is limited to the fees you paid in the 12 months before the claim. Nothing here limits liability that cannot be limited by law.'] },
    { h: '12. Indemnity', p: ['You will indemnify us against claims arising from your data, your documents or your breach of these terms.'] },
    { h: '13. Governing law', p: ['These terms are governed by the laws of Thailand, and disputes go to the courts of Thailand, unless mandatory consumer law says otherwise.'] },
    { h: '14. Changes', p: ['We may update these terms. For material changes we will notify account admins at least 30 days ahead; continued use after that means acceptance.'] },
    { h: '15. Contact', p: [`${COMPANY} · ${EMAIL}`] },
  ],
};

export default function Legal({ kind }) {
  const doc = kind === 'privacy' ? PRIVACY : TERMS;
  return (
    <div className="legal">
      <header className="legal-top">
        <a className="legal-brand" href="/" aria-label="Invmatics home">
          <span className="legal-logo"><LogoGlyph size={20} /></span>
          <span>Invmatics</span>
        </a>
        <nav>
          <a href="/privacy" className={kind === 'privacy' ? 'on' : ''}>Privacy</a>
          <a href="/terms" className={kind === 'terms' ? 'on' : ''}>Terms</a>
        </nav>
      </header>
      <main className="legal-body">
        <h1>{doc.title}</h1>
        <p className="legal-meta">Last updated {UPDATED}</p>
        <p className="legal-lead">{doc.intro}</p>
        {doc.sections.map(s => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            {s.p?.map((t, i) => <p key={i}>{t}</p>)}
            {s.ul && <ul>{s.ul.map((t, i) => <li key={i}>{t}</li>)}</ul>}
            {s.table && (
              <table>
                <thead><tr><th>Provider</th><th>Purpose</th></tr></thead>
                <tbody>{s.table.map(([a, b]) => <tr key={a}><td>{a}</td><td>{b}</td></tr>)}</tbody>
              </table>
            )}
            {s.p2?.map((t, i) => <p key={`b${i}`}>{t}</p>)}
          </section>
        ))}
      </main>
      <footer className="legal-foot">
        <a href="/">← Back to Invmatics</a>
        <span>© 2026 Invmatics · A product of {COMPANY}</span>
      </footer>
    </div>
  );
}
