import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function LegacyRoomRedirect({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  redirect(`/${roomId}`);
}
