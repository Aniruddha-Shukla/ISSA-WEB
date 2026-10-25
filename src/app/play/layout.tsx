import { PlayNav } from "@/components/play/play-nav";

export default function PlayLayout({ children }: LayoutProps<"/play">) {
  return (
    <>
      <PlayNav />
      {children}
    </>
  );
}
