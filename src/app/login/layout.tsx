export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex min-h-dvh flex-col overflow-hidden overscroll-none bg-[#020617] supports-[height:100dvh]:min-h-dvh safe-area-pt">
      {children}
    </div>
  );
}
