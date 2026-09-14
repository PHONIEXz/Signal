export default function SupportContact() {
  const email = process.env.SUPPORT_EMAIL?.trim();

  if (!email) {
    return <>the contact information published in Signal&apos;s developer profile</>;
  }

  return <a href={`mailto:${email}`} className="font-medium text-navy hover:underline">{email}</a>;
}
