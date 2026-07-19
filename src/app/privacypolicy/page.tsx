import type { Metadata } from "next";
import type { ReactNode } from "react";

import LegalPageContent from "@/components/legal/LegalPageContent";
import JsonLd from "@/components/JsonLd";
import { marketingLegalH2, marketingLegalLink, marketingLegalP } from "@/lib/marketing-ui";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy",
  description: "Privacy policy for Unit311 Central website, platform, and communications.",
  path: "/privacypolicy",
});

const PRIVACY_POLICY_URL = "https://unit311central.com/privacypolicy";
const CONTACT_EMAIL = "info@unit311central.com";

const listClass = "mt-2 list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-white/72";

function LegalParagraph({ children }: { children: ReactNode }) {
  return <p className={marketingLegalP}>{children}</p>;
}

function LegalList({ items }: { items: readonly string[] }) {
  return (
    <ul className={listClass}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function LegalSubheading({ children }: { children: ReactNode }) {
  return <h3 className="mt-4 text-base font-semibold text-white/90">{children}</h3>;
}

function EmailLink({ email }: { email: string }) {
  return (
    <a href={`mailto:${email}`} className={marketingLegalLink}>
      {email}
    </a>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Privacy Policy", path: "/privacypolicy" },
        ])}
      />
      <LegalPageContent
        title="Privacy Policy"
        intro="Version 1.1 · Effective date: 13 July 2026. This Privacy Policy explains how Unit311 Central collects, uses, stores and protects personal information."
      >
        <section>
          <h2 className={marketingLegalH2}>1. Introduction</h2>
          <LegalParagraph>
            This Privacy Policy explains how Unit311 Central (&quot;Unit311 Central&quot;, &quot;we&quot;,
            &quot;our&quot; or &quot;us&quot;) collects, uses, stores and protects personal information when you
            use our website, application and related services (&quot;Services&quot;).
          </LegalParagraph>
          <LegalParagraph>
            We are committed to protecting your privacy and handling your personal information
            responsibly. This Privacy Policy explains what information we collect, why we collect it,
            how we use it and the choices available to you.
          </LegalParagraph>
          <LegalParagraph>
            By using our Services, you agree to the practices described in this Privacy Policy.
          </LegalParagraph>
        </section>

        <section>
          <h2 className={marketingLegalH2}>2. Who We Are</h2>
          <LegalParagraph>Unit311 Central is operated by:</LegalParagraph>
          <p className={`${marketingLegalP} whitespace-pre-line`}>
            {`NAKAMA TECHNOLOGY HOLDINGS LIMITED
Company Registration Number: 78747890
No. 5, 17/F Strand 50
50 Bonham Strand
Sheung Wan
Hong Kong`}
          </p>
          <LegalParagraph>
            Email: <EmailLink email={CONTACT_EMAIL} />
          </LegalParagraph>
        </section>

        <section>
          <h2 className={marketingLegalH2}>3. Scope of this Policy</h2>
          <LegalParagraph>This Privacy Policy applies to:</LegalParagraph>
          <LegalList
            items={[
              "the Unit311 Central website",
              "your Unit311 Central account",
              "all Services provided through Unit311 Central",
              "customer support interactions",
              "communications with us",
            ]}
          />
          <LegalParagraph>
            It does not apply to third-party websites or services that may be linked from our Services.
          </LegalParagraph>
        </section>

        <section>
          <h2 className={marketingLegalH2}>4. Information We Collect</h2>
          <LegalParagraph>
            Depending on how you use Unit311 Central, we may collect the following information.
          </LegalParagraph>

          <LegalSubheading>Account Information</LegalSubheading>
          <LegalParagraph>When you create an account we may collect:</LegalParagraph>
          <LegalList
            items={[
              "Name",
              "Business name",
              "Email address",
              "Telephone number",
              "Job title",
              "Account login details",
            ]}
          />

          <LegalSubheading>Subscription Information</LegalSubheading>
          <LegalParagraph>When you subscribe to our Services we may collect:</LegalParagraph>
          <LegalList
            items={[
              "Billing information",
              "Subscription details",
              "Invoice history",
              "Payment status",
            ]}
          />
          <LegalParagraph>
            Payment card details are processed by our payment provider and are not stored by Unit311
            Central.
          </LegalParagraph>

          <LegalSubheading>Information You Upload</LegalSubheading>
          <LegalParagraph>
            You may choose to upload or create information within your workspace including:
          </LegalParagraph>
          <LegalList
            items={[
              "Customer records",
              "Contacts",
              "Notes",
              "Documents",
              "Files",
              "Tasks",
              "Calendar information",
              "Business information",
            ]}
          />
          <LegalParagraph>You remain the owner of this information.</LegalParagraph>

          <LegalSubheading>Technical Information</LegalSubheading>
          <LegalParagraph>We automatically collect certain technical information including:</LegalParagraph>
          <LegalList
            items={[
              "IP address",
              "Browser type",
              "Device type",
              "Operating system",
              "Login history",
              "Date and time of access",
              "Pages viewed",
              "General usage information",
            ]}
          />
          <LegalParagraph>
            This information helps us operate, secure and improve the Services.
          </LegalParagraph>
        </section>

        <section>
          <h2 className={marketingLegalH2}>5. How We Use Your Information</h2>
          <LegalParagraph>We use personal information to:</LegalParagraph>
          <LegalList
            items={[
              "provide our Services",
              "create and manage user accounts",
              "process subscriptions",
              "issue invoices",
              "provide customer support",
              "respond to enquiries",
              "improve the Services",
              "maintain platform security",
              "investigate technical issues",
              "comply with legal obligations",
              "communicate product updates where appropriate",
            ]}
          />
          <LegalParagraph>
            We do not use your information for automated decision-making that produces legal or
            similarly significant effects.
          </LegalParagraph>
        </section>

        <section>
          <h2 className={marketingLegalH2}>6. Cookies</h2>
          <LegalParagraph>Our website and Services may use cookies and similar technologies.</LegalParagraph>
          <LegalParagraph>Cookies help us:</LegalParagraph>
          <LegalList
            items={[
              "keep you signed in",
              "remember your preferences",
              "improve website performance",
              "understand how the Services are used",
            ]}
          />
          <LegalParagraph>
            Most web browsers allow you to control or disable cookies. Some features may not function
            correctly if cookies are disabled.
          </LegalParagraph>
        </section>

        <section>
          <h2 className={marketingLegalH2}>7. Data Storage</h2>
          <LegalParagraph>
            Your information may be stored and processed using infrastructure located within:
          </LegalParagraph>
          <LegalList items={["United States", "European Union"]} />
          <LegalParagraph>
            We use commercially reasonable safeguards to protect information stored within our systems.
          </LegalParagraph>
        </section>

        <section>
          <h2 className={marketingLegalH2}>8. Sharing Information</h2>
          <LegalParagraph>We do not sell your personal information.</LegalParagraph>
          <LegalParagraph>
            We may share information with trusted service providers that help us operate our business,
            including providers of:
          </LegalParagraph>
          <LegalList
            items={[
              "cloud hosting",
              "payment processing",
              "email delivery",
              "customer support",
              "security services",
            ]}
          />
          <LegalParagraph>
            We may also disclose information where required by law or to protect our legal rights.
          </LegalParagraph>
        </section>

        <section>
          <h2 className={marketingLegalH2}>9. Security</h2>
          <LegalParagraph>Protecting your information is important to us.</LegalParagraph>
          <LegalParagraph>
            We maintain reasonable technical and organisational measures designed to protect personal
            information from:
          </LegalParagraph>
          <LegalList
            items={["unauthorised access", "loss", "misuse", "alteration", "disclosure"]}
          />
          <LegalParagraph>
            Although we take reasonable precautions, no online service can guarantee absolute security.
          </LegalParagraph>
        </section>

        <section>
          <h2 className={marketingLegalH2}>10. Data Retention</h2>
          <LegalParagraph>
            We retain personal information only for as long as reasonably necessary to:
          </LegalParagraph>
          <LegalList
            items={[
              "provide the Services",
              "manage customer accounts",
              "comply with legal obligations",
              "resolve disputes",
              "enforce our agreements",
            ]}
          />
          <LegalParagraph>
            When information is no longer required, it will be securely deleted or anonymised where
            appropriate.
          </LegalParagraph>
        </section>

        <section>
          <h2 className={marketingLegalH2}>11. Your Rights</h2>
          <LegalParagraph>
            Depending on where you are located, you may have the right to:
          </LegalParagraph>
          <LegalList
            items={[
              "access your personal information",
              "correct inaccurate information",
              "request deletion of your information",
              "request a copy of your information",
              "object to certain processing activities",
              "withdraw consent where processing is based on consent",
            ]}
          />
          <LegalParagraph>
            To exercise these rights, please contact us using the details below.
          </LegalParagraph>
        </section>

        <section>
          <h2 className={marketingLegalH2}>12. Children&apos;s Privacy</h2>
          <LegalParagraph>Unit311 Central is designed for businesses and organisations.</LegalParagraph>
          <LegalParagraph>
            Our Services are not intended for children under 18 years of age, and we do not knowingly
            collect personal information from children.
          </LegalParagraph>
        </section>

        <section>
          <h2 className={marketingLegalH2}>13. Third-Party Websites</h2>
          <LegalParagraph>
            Our website or Services may contain links to third-party websites.
          </LegalParagraph>
          <LegalParagraph>
            We are not responsible for the privacy practices or content of those websites. We encourage
            you to review their privacy policies before providing personal information.
          </LegalParagraph>
        </section>

        <section>
          <h2 className={marketingLegalH2}>14. Changes to this Privacy Policy</h2>
          <LegalParagraph>We may update this Privacy Policy from time to time.</LegalParagraph>
          <LegalParagraph>
            If we make material changes, we will publish the updated Privacy Policy on our website and,
            where appropriate, notify customers by email or through the Services.
          </LegalParagraph>
          <LegalParagraph>The latest version will always be available at:</LegalParagraph>
          <LegalParagraph>
            <a href={PRIVACY_POLICY_URL} className={marketingLegalLink}>
              {PRIVACY_POLICY_URL}
            </a>
          </LegalParagraph>
        </section>

        <section>
          <h2 className={marketingLegalH2}>15. Contact Us</h2>
          <LegalParagraph>
            If you have any questions about this Privacy Policy or wish to exercise your privacy rights,
            please contact us:
          </LegalParagraph>
          <p className={`${marketingLegalP} whitespace-pre-line`}>
            {`NAKAMA TECHNOLOGY HOLDINGS LIMITED
No. 5, 17/F Strand 50
50 Bonham Strand
Sheung Wan
Hong Kong`}
          </p>
          <LegalParagraph>
            Email: <EmailLink email={CONTACT_EMAIL} />
          </LegalParagraph>
        </section>
      </LegalPageContent>
    </>
  );
}
