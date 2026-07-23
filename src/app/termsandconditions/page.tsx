import type { Metadata } from "next";

import LegalPageContent from "@/components/legal/LegalPageContent";
import JsonLd from "@/components/JsonLd";
import { marketingLegalH2, marketingLegalLink, marketingLegalP } from "@/lib/marketing-ui";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: "Terms of Service",
  description:
    "Review the Unit311 Central Terms of Service that govern account access, subscriptions, acceptable use, and your rights when using the platform.",
  path: "/termsandconditions",
});

const TERMS_SECTIONS = [
  {
    title: "1. About These Terms",
    body: "These Terms of Service ('Terms') govern your access to and use of the Unit311 Central services ('Services'). By creating an account, purchasing a subscription or using the Services, you agree to be bound by these Terms.",
  },
  {
    title: "2. The Company",
    body: "Unit311 Central is operated by NAKAMA TECHNOLOGY HOLDINGS LIMITED (Company Registration No. 78747890), No. 5, 17/F Strand 50, 50 Bonham Strand, Sheung Wan, Hong Kong. Contact: info@unit311central.com.",
    email: "info@unit311central.com",
  },
  {
    title: "3. Business Customers",
    body: "The Services are intended for businesses and organisations. If you register on behalf of a business, you confirm that you have authority to accept these Terms on its behalf.",
  },
  {
    title: "4. Our Services",
    body: "Unit311 Central is a cloud-based business operations application that helps organisations manage customers, sales, communications, projects, documents, reporting and operational workflows through a single web-based service. We may improve, update or modify the Services from time to time.",
  },
  {
    title: "5. Accounts",
    body: "You are responsible for keeping your account credentials secure, managing authorised users and ensuring that information in your account remains accurate.",
  },
  {
    title: "6. Subscription",
    body: "Your subscription allows you to access and use the Services while your subscription remains active. Subscription pricing, billing frequency and payment terms are set out in your invoice, proposal or other written agreement.",
  },
  {
    title: "7. Fees",
    body: "Subscription fees are payable in accordance with your agreed payment terms. If payment is not received, we may suspend or terminate access after giving reasonable notice.",
  },
  {
    title: "8. Customer Data",
    body: "You retain ownership of the data, documents and information you upload or create within the Services. We use your data only as reasonably necessary to provide, maintain, secure, support and improve the Services.",
  },
  {
    title: "9. Privacy",
    body: "We process personal information in accordance with our Privacy Policy. Our hosting infrastructure may be located in the United States and the European Union to support delivery of the Services.",
  },
  {
    title: "10. Security",
    body: "We maintain commercially reasonable technical and organisational measures designed to protect your information. Although we take reasonable precautions, no internet-based service can guarantee complete security.",
  },
  {
    title: "11. Acceptable Use",
    body: "You must not use the Services for unlawful purposes, send spam, distribute malicious software, attempt unauthorised access, interfere with the operation of the Services or infringe the rights of others.",
  },
  {
    title: "12. Confidentiality",
    body: "Each party agrees to protect the other's confidential business information and use it only for purposes connected with the Services.",
  },
  {
    title: "13. Ownership",
    body: "Unit311 Central, including its software, branding, website, documentation, design and underlying technology, remains the property of NAKAMA TECHNOLOGY HOLDINGS LIMITED. Your subscription gives you the right to use the Services; it does not transfer ownership of them.",
  },
  {
    title: "14. Availability",
    body: "We aim to provide a reliable service but cannot guarantee uninterrupted availability. Planned maintenance, upgrades and unexpected technical issues may occasionally affect the Services.",
  },
  {
    title: "15. Termination",
    body: "Either party may end the subscription in accordance with the agreed subscription terms. After termination, access to the Services will end. Where reasonably practicable, you will be given an opportunity to export your data before it is removed from active systems.",
  },
  {
    title: "16. Disclaimer",
    body: "The Services are provided on an 'as available' basis. Except where required by law, we do not guarantee that the Services will be uninterrupted, error-free or suitable for every business purpose.",
  },
  {
    title: "17. Limitation of Liability",
    body: "To the maximum extent permitted by law, our total liability will not exceed the subscription fees paid by you during the twelve months preceding the event giving rise to the claim. Neither party is liable for indirect or consequential losses, including lost profits, revenue or business opportunities.",
  },
  {
    title: "18. Changes",
    body: "We may update these Terms from time to time. If we make material changes, we will notify customers through the Services or by email where reasonably practicable.",
  },
  {
    title: "19. Governing Law",
    body: "These Terms are governed by the laws of the Hong Kong Special Administrative Region. The courts of Hong Kong have exclusive jurisdiction over disputes arising under these Terms.",
  },
  {
    title: "20. Contact",
    body: "For questions about these Terms, please contact info@unit311central.com.",
    email: "info@unit311central.com",
  },
] as const;

function TermsParagraph({ body, email }: { body: string; email?: string }) {
  if (!email || !body.includes(email)) {
    return <p className={marketingLegalP}>{body}</p>;
  }

  const [before, after] = body.split(email);

  return (
    <p className={marketingLegalP}>
      {before}
      <a href={`mailto:${email}`} className={marketingLegalLink}>
        {email}
      </a>
      {after}
    </p>
  );
}

export default function TermsAndConditionsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Terms of Service", path: "/termsandconditions" },
        ])}
      />
      <LegalPageContent
        title="Terms of Service"
        intro="Version 1.1 · Effective date: 13 July 2026. These Terms govern access to Unit311 Central and related services operated by NAKAMA TECHNOLOGY HOLDINGS LIMITED."
      >
        {TERMS_SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className={marketingLegalH2}>{section.title}</h2>
            <TermsParagraph body={section.body} email={"email" in section ? section.email : undefined} />
          </section>
        ))}
      </LegalPageContent>
    </>
  );
}
